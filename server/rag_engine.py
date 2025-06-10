import os
from openai import OpenAI
import numpy as np
import faiss
import glob

openai_key = os.getenv("API-KEY")
api_key = openai_key

client = OpenAI(api_key=api_key)

def embed_query(query):
    response = client.embeddings.create(
        input=query,
        model="text-embedding-ada-002"
    )
    return np.array(response.data[0].embedding, dtype='float32')

def load_all_embeddings(project_id):
    folder = os.path.join("dataembedding", project_id)
    chunks_list = []
    embeddings_list = []
    index_list = []

    for chunk_file in glob.glob(os.path.join(folder, "*_chunks.npy")):
        prefix = chunk_file.replace("_chunks.npy", "")
        emb_file = f"{prefix}_embeddings.npy"
        index_file = f"{prefix}_faiss.index"

        if not (os.path.exists(emb_file) and os.path.exists(index_file)):
            continue

        chunks = np.load(chunk_file, allow_pickle=True)
        index = faiss.read_index(index_file)

        chunks_list.append((chunks, index))

    return chunks_list

def query_rag_system(project_id, user_query, top_k=5):
    query_vec = embed_query(user_query).reshape(1, -1)
    all_chunks = load_all_embeddings(project_id)

    matched = []
    for chunks, index in all_chunks:
        if index.d != query_vec.shape[1]:
            continue  # Skip mismatched dimensionality

        D, I = index.search(query_vec, top_k)
        for dist, idx in zip(D[0], I[0]):
            if 0 <= idx < len(chunks):
                matched.append((dist, chunks[idx]))

    # Sort all results by distance
    matched = sorted(matched, key=lambda x: x[0])[:top_k]
    retrieved_chunks = [chunk for _, chunk in matched]

    context = "\n\n".join(retrieved_chunks)

    prompt = f"""
You are an expert assistant. Use the following context to answer the user's question.

Context:
{context}

Question:
{user_query}

Answer:
"""

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are a helpful research assistant."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.3
    )

    return {
        "answer": response.choices[0].message.content.strip(),
        "context": retrieved_chunks
    }
