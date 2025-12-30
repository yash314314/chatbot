from google import genai
import os
from dotenv import load_dotenv


load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("Error: GEMINI_API_KEY not found in .env file")
else:
    print("--- FETCHING MODEL LIST ---")
    try:
        client = genai.Client(api_key=api_key)
        for model in client.models.list():
            print(f"Found: {model.name}")
                
    except Exception as e:
        print(f"Error: {e}")