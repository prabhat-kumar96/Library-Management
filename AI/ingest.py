import os
import shutil
from pymongo import MongoClient
from dotenv import load_dotenv
from langchain_core.documents import Document
from langchain_chroma import Chroma
from langchain_community.embeddings import HuggingFaceInferenceAPIEmbeddings

# 1. Load environment configurations
load_dotenv()  # Load local .env first
load_dotenv("../Backend/config/config.env")  # Fallback to Backend config

# Retrieve the MongoDB URI from your configuration file
# Note: Change "MONGO_URI" to match the exact variable name inside your config.env (e.g., DB_URI)
MONGO_URI = os.getenv("MONGO_URI") or os.getenv("DB_URI") or "mongodb://localhost:27017/library"

print(f"Connecting to primary catalog database...")

# 2. Fetch Live Books from MongoDB
try:
    client = MongoClient(MONGO_URI)
    # Use the database name defined in your Backend application ("Library_Management")
    db = client["Library_Management"]
    
    # Target your books collection (usually 'books')
    books_collection = db["books"]
    
    # Fetch all books from the database
    mongo_books = list(books_collection.find({}))
    print(f"[Info] Successfully fetched {len(mongo_books)} live books from MongoDB catalog!")
    
except Exception as e:
    print(f"[Error] Failed to connect to MongoDB: {e}")
    print("Ensure MongoDB is running and check your variable names in config.env.")
    exit(1)

# 3. Initialize the serverless embedding model
print("Initializing HuggingFace Inference API Embedding Model...")
hf_token = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_API_KEY")
if not hf_token:
    print("⚠️ Warning: HF_TOKEN / HUGGINGFACE_API_KEY not found in environment!")
embedding_model = HuggingFaceInferenceAPIEmbeddings(
    api_key=hf_token,
    model_name="sentence-transformers/all-MiniLM-L6-v2",
    api_url="https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction"
)

# 4. Process Mongo Data into Vector Documents
documents = []
for book in mongo_books:
    # Safely extract fields, mapping MongoDB '_id' object to a clean string
    book_id = str(book.get("_id"))
    title = book.get("title", "Unknown Title")
    author = book.get("author", "Unknown Author")
    
    # Handle the AI-generated descriptions/summaries or fallback safely
    summary = book.get("description") or book.get("summary") or "No description provided."
    
    # Handle categories/genres seamlessly (whether stored as an array or a single string)
    genres_data = book.get("genres") or book.get("category") or ["General"]
    if isinstance(genres_data, list):
        genre_str = ", ".join(genres_data)
        genres_list = genres_data
    else:
        genre_str = str(genres_data)
        genres_list = [genres_data]

    # Context Anchoring: Binds structural properties together for the embedding engine
    page_content = f"Title: {title}\nAuthor: {author}\nGenres: {genre_str}\nSummary: {summary}"
    
    doc = Document(
        page_content=page_content,
        metadata={
            "book_id": book_id, 
            "title": title,
            "genres": genres_list
        }
    )
    documents.append(doc)

# 5. Clear old database cache programmatically using chromadb PersistentClient
persist_directory = "./chroma_db"
try:
    import chromadb
    print("Clearing outdated vector engine indices programmatically...")
    db_client = chromadb.PersistentClient(path=persist_directory)
    # Check collections and delete the default 'langchain' one if it exists
    for collection in db_client.list_collections():
        if collection.name == "langchain":
            db_client.delete_collection("langchain")
            print("Successfully cleared outdated collection: 'langchain'")
except Exception as e:
    print(f"Bypassed database cache clearing: {e}")

# 6. Create and persist the clean Vector Database
if documents:
    print(f"Embedding {len(documents)} books and updating Vector Space...")
    vector_store = Chroma.from_documents(
        documents=documents,
        embedding=embedding_model,
        persist_directory=persist_directory
    )
    print("[Success] Successfully synchronized ChromaDB with your live MongoDB Catalog!")
else:
    print("[Warning] No books found in the database collection to embed.")