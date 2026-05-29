import os
import chromadb
from langchain_chroma import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings

db_dir = "./chroma_db"
print("DB Directory exists:", os.path.exists(db_dir))
if os.path.exists(db_dir):
    print("Files in DB Directory:", os.listdir(db_dir))

# Direct inspect via chromadb client
client = chromadb.PersistentClient(path=db_dir)
print("Collections found:", client.list_collections())

for coll in client.list_collections():
    c = client.get_collection(coll.name)
    print(f"Collection Name: '{coll.name}', Item count: {c.count()}")
    if c.count() > 0:
        print("Sample data:", c.peek(1))

# Load via LangChain Chroma
embedding_model = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
vector_store = Chroma(
    persist_directory=db_dir,
    embedding_function=embedding_model
)

results = vector_store.similarity_search_with_score("Clean Code functions", k=2)
print("LangChain search results count:", len(results))
for doc, score in results:
    print(f"- Score: {score}, Metadata: {doc.metadata}, Content snippet: {doc.page_content[:100]}")
