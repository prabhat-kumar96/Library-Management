import os
import sentry_sdk
import re
import json
import redis
import threading
from contextlib import asynccontextmanager
from typing import List
from pydantic import BaseModel
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environmental variables
load_dotenv()  # Load local .env if it exists
load_dotenv("../Backend/config/config.env")  # Fallback to Backend config

# Initialize Sentry Python SDK
sentry_sdk.init(
    dsn=os.getenv("SENTRY_AI_DSN"),
    traces_sample_rate=1.0,
    profiles_sample_rate=1.0,
    send_default_pii=True,
)

# LangChain and vector store imports
from langchain_chroma import Chroma
from langchain_community.embeddings import HuggingFaceInferenceAPIEmbeddings
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import SystemMessage, HumanMessage

# Initialize Global Context variables
global_context = {}

def redis_subscriber_worker():
    """
    Asynchronous Background Listener: Connects to Redis and block-subscribes
    to 'library_book_sync' channel to execute real-time vector indexing.
    """
    redis_url = os.getenv("REDIS_URL", "redis://127.0.0.1:6379")
    print(f"⚡ [Redis Sub] Worker thread starting. Connecting to {redis_url}...")
    try:
        from langchain_core.documents import Document
        
        # Connect to Redis
        r = redis.from_url(redis_url, decode_responses=True)
        pubsub = r.pubsub()
        pubsub.subscribe("library_book_sync")
        print("⚡ [Redis Sub] Successfully subscribed to 'library_book_sync' channel!")
        
        # Listening loop
        for message in pubsub.listen():
            # Check if main thread stopped
            if global_context.get("stop_event") and global_context["stop_event"].is_set():
                print("⚡ [Redis Sub] Worker thread shutting down.")
                break
                
            if message["type"] == "message":
                try:
                    payload = json.loads(message["data"])
                    title = payload.get("title", "Unknown Title")
                    print(f"📥 [Redis Sub] Event received! Processing vector embedding for: {title}")
                    
                    book_id = payload.get("book_id")
                    author = payload.get("author", "Unknown Author")
                    genres = payload.get("genres", "General")
                    summary = payload.get("summary", "No summary provided.")
                    
                    # Align the request layout with standard RAG constraints
                    genres_list = [genres] if isinstance(genres, str) else list(genres)
                    genre_str = ", ".join(genres_list)
                    
                    # Context Anchoring
                    page_content = f"Title: {title}\nAuthor: {author}\nGenres: {genre_str}\nSummary: {summary}"
                    
                    doc = Document(
                        page_content=page_content,
                        metadata={
                            "book_id": book_id,
                            "title": title,
                            "genres": genres_list
                        }
                    )
                    
                    # Dynamic Ingestion
                    vector_store = global_context.get("vector_store")
                    if vector_store:
                        vector_store.add_documents([doc])
                        print(f"✅ [Redis Sub] Dynamic Vector Sync success! Added '{title}' to ChromaDB active index.")
                    else:
                        print("🚨 [Redis Sub] Bypassed upsert: Vector store not initialized in context.")
                        
                except Exception as parse_err:
                    print(f"🚨 [Redis Sub] Failed to parse payload or perform upsert: {parse_err}")
    except Exception as connection_err:
        print(f"🚨 [Redis Sub] Worker thread connection failed: {connection_err}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Performance Optimization: Load embedding models, Chroma vector store,
    and LLM connections ONCE on application startup.
    """
    print("=== 🚀 STARTING RAG MICROSERVICE ===")
    
    # 1. Initialize HuggingFace embeddings
    print("Loading HuggingFace Inference API Embeddings model ('sentence-transformers/all-MiniLM-L6-v2')...")
    hf_token = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_API_KEY")
    if not hf_token:
        print("⚠️ Warning: HF_TOKEN / HUGGINGFACE_API_KEY not found in environment!")
    embedding_model = HuggingFaceInferenceAPIEmbeddings(
        api_key=hf_token,
        model_name="sentence-transformers/all-MiniLM-L6-v2",
        api_url="https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction"
    )
    global_context["embeddings"] = embedding_model
    
    # 2. Connect to the local persisted Chroma vector database
    persist_directory = "./chroma_db"
    print(f"Connecting to ChromaDB at '{persist_directory}'...")
    if not os.path.exists(persist_directory):
        print("⚠️ Warning: chroma_db folder does not exist. Please run ingest.py first.")
    
    vector_store = Chroma(
        persist_directory=persist_directory,
        embedding_function=embedding_model
    )
    global_context["vector_store"] = vector_store
    
    # 3. Setup LLM Connection with Dual Fallback
    # Default to Ollama (local llama3) and check fallback option
    api_key = os.getenv("GEMINI_API_KEY")
    if api_key:
        print("Found GEMINI_API_KEY in configuration. Dual-fallback enabled.")
    else:
        print("⚠️ Warning: GEMINI_API_KEY not found. Fallback to API LLM disabled.")
        
    # 4. Spin up Real-Time Redis Pub/Sub Subscriber Worker Thread
    stop_event = threading.Event()
    global_context["stop_event"] = stop_event
    sub_thread = threading.Thread(target=redis_subscriber_worker, daemon=True)
    sub_thread.start()
    global_context["sub_thread"] = sub_thread
    
    print("=== ✅ RAG MICROSERVICE INITIALIZED AND READY ===")
    yield
    print("=== 🛑 SHUTTING DOWN RAG MICROSERVICE ===")
    if global_context.get("stop_event"):
        global_context["stop_event"].set()
    global_context.clear()

app = FastAPI(
    title="Library Management RAG Microservice",
    description="Enterprise-grade RAG engine for book Q&A and personalized recommendations.",
    version="1.0.0",
    lifespan=lifespan
)

@app.get("/")
@app.head("/")
async def read_root():
    return {"status": "healthy", "service": "RAG AI Microservice"}

# 3. Configure Robust CORS Management
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],

    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- INPUT VALIDATION SCHEMAS (Pydantic) ---

class QuestionPayload(BaseModel):
    question: str

class RecommendationPayload(BaseModel):
    favorite_genres: List[str]
    already_read: List[str]
    currently_reading: List[str]
    want_to_read: List[str]


# --- HELPER LLM INVOKER ---

def generate_llm_response(system_prompt: str, user_prompt: str) -> str:
    """
    Sends request to Ollama (llama3) at http://localhost:11434.
    If Ollama is offline or unavailable, automatically falls back to Gemini API
    using GEMINI_API_KEY to ensure 100% testability.
    """
    import requests

    # 1. Try local Ollama instance
    try:
        url = "http://localhost:11434/api/generate"
        prompt_context = f"System Guidelines:\n{system_prompt}\n\nUser Input Context:\n{user_prompt}"
        payload = {
            "model": "llama3:latest",  # 👈 Ensure this matches your 'ollama list' output exactly!
            "prompt": prompt_context,
            "stream": False
        }
        print("🤖 Attempting connection to Ollama (llama3:latest) at http://localhost:11434/api/generate...")
        response = requests.post(url, json=payload, timeout=8)
        if response.status_code == 200:
            print("✅ Success: Response returned from local Ollama!")
            return response.json()["response"]
    except Exception as e:
        print(f"⚠️ Ollama connection failed or timed out: {e}")
        print("🔄 Initiating automatic fallback to Gemini API...")

    # 2. Fallback to Gemini API
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=503, 
            detail="AI inference engine offline. Ollama is unavailable and GEMINI_API_KEY is not configured."
        )
    
    try:
        # FIX: Point to the stable production alias 'gemini-2.5-flash'
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
        
        # FIX: Align the request layout with standard text generation constraints
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": f"System Guidelines:\n{system_prompt}\n\nUser Profile Input Context:\n{user_prompt}"}
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.2
            }
        }
        
        response = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=30)
        if response.status_code == 200:
            print("✅ Success: Response returned from Gemini API Fallback!")
            return response.json()["candidates"][0]["content"]["parts"][0]["text"]
        else:
            raise Exception(f"Gemini API error status {response.status_code}: {response.text}")
            
    except Exception as gemini_err:
        print(f"🚨 Gemini API Fallback also failed: {gemini_err}")
        raise HTTPException(
            status_code=500, 
            detail=f"Inference failure: Ollama and Gemini fallback both failed. Error: {str(gemini_err)}"
        )
        
# --- API ROUTE ENDPOINTS ---

@app.post("/api/ai/chat")
async def chat_with_librarian(payload: QuestionPayload):
    """
    Standard Q&A Route using local ChromaDB RAG context and strict guardrails.
    """
    vector_store = global_context.get("vector_store")
    if not vector_store:
        raise HTTPException(status_code=500, detail="Vector database not initialized.")

    question = payload.question
    print(f"\n🔍 Processing Q&A Request: '{question}'")

    # 1. Retrieve related documents from ChromaDB
    try:
        results = vector_store.similarity_search_with_score(question, k=3)
    except Exception as e:
        print(f"ChromaDB retrieval error: {e}")
        raise HTTPException(status_code=500, detail=f"Database retrieval error: {str(e)}")

    context_entries = []
    retrieved_books = []
    
    for doc, score in results:
        # Extract title and book_id
        book_id = doc.metadata.get("book_id", "unknown")
        title = doc.metadata.get("title", "Unknown Book")
        context_entries.append(
            f"Book ID: {book_id}\nTitle: {title}\nContent:\n{doc.page_content}\n---"
        )
        retrieved_books.append({"book_id": book_id, "title": title})

    context_str = "\n".join(context_entries)

    # 2. Strict Guardrail Prompt
    system_prompt = (
        "You are an expert Library AI Assistant. "
        "Strictly answer the user's questions based ONLY on the retrieved catalog context provided below. "
        "If the information is not contained in the context, or if the user asks about a book not in the catalog, "
        "you MUST fallback gracefully and output EXACTLY: 'I cannot find that book in our current catalog.' "
        "Do NOT hallucinate or use pre-trained knowledge to answer about other books. "
        "Keep your tone highly professional, precise, and friendly."
    )

    user_prompt = f"Retrieved Context:\n{context_str}\n\nUser Question:\n{question}"

    # 3. Call LLM
    answer = generate_llm_response(system_prompt, user_prompt)

    return {
        "answer": answer,
        "retrieved_books": retrieved_books
    }


@app.post("/api/ai/recommend")
async def personalized_recommendations(payload: RecommendationPayload):
    """
    Context-Aware Recommendation Engine combining vector database catalog
    with real-time User profile metrics (favorite_genres, read list, shelves).
    """
    vector_store = global_context.get("vector_store")
    if not vector_store:
        raise HTTPException(status_code=500, detail="Vector database not initialized.")

    print(f"\n🧠 Processing Personalized Recommendations Request")
    print(f"Genres: {payload.favorite_genres}")
    print(f"Already read: {payload.already_read}")
    print(f"Currently reading: {payload.currently_reading}")
    print(f"Want to read: {payload.want_to_read}")

    # 1. Retrieve potential books based on favorite genres
    genre_query = ", ".join(payload.favorite_genres) if payload.favorite_genres else "highly recommended books"
    try:
        results = vector_store.similarity_search_with_score(genre_query, k=5)
    except Exception as e:
        print(f"ChromaDB retrieval error: {e}")
        raise HTTPException(status_code=500, detail=f"Database retrieval error: {str(e)}")

    catalog_entries = []
    all_books_map = {}
    for doc, score in results:
        book_id = doc.metadata.get("book_id", "unknown")
        title = doc.metadata.get("title", "Unknown Book")
        catalog_entries.append(
            f"Book ID: {book_id}\nTitle: {title}\nDescription:\n{doc.page_content}\n---"
        )
        all_books_map[title.lower().strip()] = book_id

    catalog_str = "\n".join(catalog_entries)

    # 2. Strict Recommender System Prompt
    system_prompt = (
        "You are an expert Library AI Recommender. Your job is to suggest what books a library member "
        "should read next by evaluating their profile against our retrieved book catalog.\n\n"
        "Guidelines:\n"
        "1. Recommend ONLY books that exist in the retrieved catalog context.\n"
        "2. Do NOT recommend books they have already completed/read.\n"
        "3. Incorporate their favorite genres and what they are currently reading to explain WHY the suggestion fits.\n"
        "4. Output your reasoning in beautiful, clear Markdown formatting.\n"
        "5. Include a section named '### Recommended Books' followed by a simple markdown list of titles."
    )

    user_prompt = (
        f"Retrieved Catalog:\n{catalog_str}\n\n"
        f"User Profile:\n"
        f"- Favorite Genres: {payload.favorite_genres}\n"
        f"- Books Already Read: {payload.already_read}\n"
        f"- Books Currently Reading: {payload.currently_reading}\n"
        f"- Want to Read List: {payload.want_to_read}\n\n"
        f"Question: What should I read next? Analyze my preferences and catalog to suggest a book."
    )

    # 3. Call LLM
    recommendation_text = generate_llm_response(system_prompt, user_prompt)

    # 4. Programmatically intercept which of the retrieved books was recommended
    # We search the recommendation text for titles in our catalog map
    recommended_book_ids = []
    for title, book_id in all_books_map.items():
        # Check if the title is mentioned in the recommendation text
        if re.search(r'\b' + re.escape(title) + r'\b', recommendation_text.lower()):
            recommended_book_ids.append(book_id)

    # If no specific matches were caught, return all retrieved books as candidates
    if not recommended_book_ids:
        recommended_book_ids = list(all_books_map.values())[:2]

    return {
        "recommendation": recommendation_text,
        "recommended_book_ids": recommended_book_ids
    }

if __name__ == "__main__":
    import uvicorn
    # 🔌 Read the port provided by Render, or fallback to 8000 for local dev
    port = int(os.environ.get("PORT", 8000))
    
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
