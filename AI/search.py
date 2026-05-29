from langchain_chroma import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings

# Load the exact same embedding model and directory path
embedding_model = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
persist_directory = "./chroma_db"

# Reconnect to the local database
vector_store = Chroma(
    persist_directory=persist_directory, 
    embedding_function=embedding_model
)

# Test Query: Notice we don't use words like "Clean" or "Code"
user_query = "How do I write readable functions and maintainable software architecture?"

print(f"\nUser Search Query: '{user_query}'")
print("-" * 50)

# Retrieve top 2 matches based on mathematical similarity (Distance)
# score is returned as distance; lower distance = closer match
results = vector_store.similarity_search_with_score(user_query, k=2)

for doc, score in results:
    print(f"Match Score (Distance): {score:.4f}")
    print(f"Book ID: {doc.metadata['book_id']}")
    print(f"Document Text:\n{doc.page_content}")
    print("-" * 50)