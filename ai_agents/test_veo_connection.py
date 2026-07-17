import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

def test_google_connection():
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("❌ Error: GOOGLE_API_KEY is not set in the environment.")
        return

    print("🔑 GOOGLE_API_KEY found. Attempting to connect to Google GenAI...")
    try:
        client = genai.Client(api_key=api_key)
        
        # Test 1: Fetch all models and see if Veo is in the list
        print("📡 Fetching available models...")
        models = client.models.list()
        
        veo_found = False
        for model in models:
            # Check if any model name contains 'veo'
            if 'veo' in model.name.lower():
                print(f"✅ Found Veo Model Access: {model.name}")
                print(f"   - Display Name: {model.display_name}")
                print(f"   - Supported Actions: {model.supported_generation_methods}")
                veo_found = True
                
        if not veo_found:
            print("⚠️ Connected successfully, but could not find a 'veo' model in your available models list.")
            print("   Make sure your API key has access to the Veo Preview waitlist/tier.")
        else:
            print("🎉 SUCCESS! Your connection is working and you have access to the Veo API.")
            print("   (No video was generated, so this test cost $0.00)")
            
    except Exception as e:
        print(f"❌ Connection Error: {str(e)}")

if __name__ == "__main__":
    test_google_connection()
