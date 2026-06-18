from langchain_chroma import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate

# 1. Reconnect to your local Vector Database
embedding_model = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
persist_directory = "./chroma_db"
vector_store = Chroma(persist_directory=persist_directory, embedding_function=embedding_model)

# 2. Initialize the Local LLM via Ollama
print("Connecting to local Llama 3 model...")
llm = ChatOllama(model="llama3", temperature=0.3)

# 3. Define the System Prompt
# Crucial: Instruct the AI not to hallucinate info outside your library context!
prompt_template = ChatPromptTemplate.from_messages([
    ("system", (
        "You are an advanced Library AI Assistant. Use ONLY the following retrieved "
        "book contexts to answer the user's question. If you do not know the answer "
        "or if it's not in the context, say 'I cannot find that book in our current catalog.'\n\n"
        "Retrieved Context:\n{context}"
    )),
    ("human", "{question}")
])

# 4. User Question
user_question = "Can you recommend a book that explains replication, sharding, and database internals?"
print(f"\nUser Question: '{user_question}'\n")

# 5. Retrieve the top matching document context
print("Retrieving context from ChromaDB...")
retrieved_docs = vector_store.similarity_search(user_question, k=1)
context_text = retrieved_docs[0].page_content if retrieved_docs else "No matching books found."

# 6. Generate the Response
print("Generating answer with LLM...")
# Chain the inputs to the prompt, then to the LLM
chain = prompt_template | llm
response = chain.invoke({"context": context_text, "question": user_question})

print("\n" + "="*40 + " AI RESPONSE " + "="*40)
print(response.content)
print("="*93)
