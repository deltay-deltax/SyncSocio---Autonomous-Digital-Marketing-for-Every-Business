import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

def test_google_connection():
    # Point to the downloaded JSON key
    cred_path = os.path.join(os.path.dirname(__file__), "veo_credentials.json")
    if not os.path.exists(cred_path):
        print(f"❌ Error: Credentials file not found at {cred_path}")
        return
        
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = cred_path
    print("🔑 Service Account JSON found. Attempting to connect to Vertex AI...")
    
    try:
        # Connect using Vertex AI mode
        client = genai.Client(
            vertexai=True,
            project="syncsocio-veo",
            location="us-central1"
        )
        
        print("📡 Fetching available models from Vertex AI...")
        # In Vertex AI, listing models can sometimes be restrictive depending on permissions,
        # but we can try to just get the specific Veo model we want to use.
        try:
            model = client.models.get(model='publishers/google/models/veo-3.1-generate-preview')
            print(f"✅ Found Veo Model Access on Vertex AI: {model.name}")
            print("🎉 SUCCESS! Your Enterprise connection is working and you have access to Veo.")
            print("   (No video was generated, so this test cost $0.00)")
        except Exception as e:
            print(f"⚠️ Could not fetch specific model info: {str(e)}")
            print("   Make sure the Vertex AI API is fully enabled in your Google Cloud Console.")
            
    except Exception as e:
        print(f"❌ Connection Error: {str(e)}")

if __name__ == "__main__":
    test_google_connection()
