import os
from openai import OpenAI
import faiss
import numpy as np
from pathlib import Path
from dotenv import load_dotenv
from tqdm import tqdm
import tiktoken

# Load OpenAI API key from .env file
load_dotenv()
openai_key = os.getenv("API-KEY")
api_key = openai_key

client = OpenAI(api_key=api_key)
 

# Define input and output directories
TEXT_DIRECTORY = Path("datatxt")
EMBEDDINGS_FOLDER = Path("dataembedding")

# Ensure the embedding folder exists
EMBEDDINGS_FOLDER.mkdir(parents=True, exist_ok=True)

# Initialize tokenizer for token counting
encoding = tiktoken.encoding_for_model("text-embedding-ada-002")
MAX_TOKENS = 8192

def split_into_chunks(text, max_tokens=MAX_TOKENS):
    tokens = encoding.encode(text)
    chunks = [tokens[i:i + max_tokens] for i in range(0, len(tokens), max_tokens)]
    return [encoding.decode(chunk) for chunk in chunks]

def create_embedding(text):
    try:
        response = client.embeddings.create(
            input=text,
            model="text-embedding-ada-002"
        )
        return response.data[0].embedding
    except Exception as e:
        print(f"Embedding error: {e}")
        return None

def generate_embeddings_from_text(text, prefix="doc"):
    chunks = split_into_chunks(text)
    all_embeddings = []
    chunk_names = []
    chunk_texts = []

    for i, chunk in enumerate(chunks):
        embedding = create_embedding(chunk)
        if embedding:
            all_embeddings.append(embedding)
            chunk_names.append(f"{prefix}_chunk_{i+1}")
            chunk_texts.append(chunk)

    print(all_embeddings)
    print("-----------------------")
    print(chunk_names)
    print("-----------------------")
    print(chunk_texts)
    return all_embeddings, chunk_names, chunk_texts

