import os
from functools import lru_cache
from google import genai
from google.genai import types
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

@lru_cache(maxsize=1)
def _get_client():
    """Create the Gemini client only when an embedding is requested."""
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise RuntimeError("GOOGLE_API_KEY is required to generate embeddings")
    return genai.Client(api_key=api_key)

async def get_embedding(text: str):
    """Generates a 768-dimension embedding for the given text using Gemini."""
    try:
        response = _get_client().models.embed_content(
            model="models/gemini-embedding-001", 
            contents=text,
            config=types.EmbedContentConfig(output_dimensionality=768)
        )
        return response.embeddings[0].values
    except Exception as e:
        print(f"Embedding Error: {str(e)}")
        return None

async def find_similar_posts(query_text: str, user_id: str, limit: int = 5):
    """
    Performs a Vector Search in MongoDB Atlas to find the 'Winner's Circle' posts.
    Note: Requires a Search Index named 'vector_index' on the post_analyses collection.
    """
    query_vector = await get_embedding(query_text)
    if not query_vector:
        return []

    # Connection to the same DB as main.py
    mongo_client = AsyncIOMotorClient(os.getenv("MONGO_URI"))
    db = mongo_client.get_database("test")
    collection = db["post_analyses"]

    pipeline = [
        {
            "$vectorSearch": {
                "index": "vector_index",
                "path": "embedding",
                "queryVector": query_vector,
                "numCandidates": limit * 10,
                "limit": limit,
                "filter": {
                    "userId": user_id,
                    "growthFactor": {"$gte": 1.5} # Only learn from successful posts
                }
            }
        },
        {
            "$project": {
                "description": 1,
                "analysis": 1,
                "growthFactor": 1,
                "score": {"$meta": "vectorSearchScore"}
            }
        }
    ]

    try:
        cursor = collection.aggregate(pipeline)
        results = await cursor.to_list(length=limit)
        return results
    except Exception as e:
        print(f"Vector Search Error: {str(e)}")
        return []
