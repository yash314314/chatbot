import os
import base64
import io
from dotenv import load_dotenv
from PIL import Image
from huggingface_hub import InferenceClient

# Import Google GenAI safely
try:
    from google import genai
    HAS_GOOGLE = True
except ImportError:
    HAS_GOOGLE = False

load_dotenv()

def generate_answer(question: str, image_base64: str = None, previous_history: list = []) -> str:
    """
    HYBRID MODE:
    - Images -> Google Gemini (Specific Experimental Model)
    - Text   -> Hugging Face Llama 3 (Unlimited)
    """
    
    # --- ROUTE 1: IMAGE QUERY ---
    if image_base64:
        return ask_gemini_vision(question, image_base64)

    # --- ROUTE 2: TEXT QUERY ---
    return ask_huggingface_text(question, previous_history)


def ask_gemini_vision(question, image_base64):
    print("📷 Image detected! Switching to Google Gemini (Exp-1206)...")
    
    api_key = os.getenv("GEMINI_API_KEY")
    if not HAS_GOOGLE: return "⚠️ System Error: 'google-genai' library missing."
    if not api_key: return "⚠️ System Error: GEMINI_API_KEY missing."

    try:
        client = genai.Client(api_key=api_key)
        
        # Prepare Image
        if "," in image_base64:
            image_base64 = image_base64.split(",")[1]
        image_bytes = base64.b64decode(image_base64)
        image = Image.open(io.BytesIO(image_bytes))

        # Send to Gemini
        # USING THE SPECIFIC EXPERIMENTAL MODEL FROM YOUR LIST
        response = client.models.generate_content(
            model='gemini-flash-latest', 
            contents=[image, "\n\n", f"Analyze this image and answer: {question}"]
        )
        return response.text

    except Exception as e:
        error_msg = str(e)
        print(f"❌ Gemini Failure: {error_msg}")
        
        if "429" in error_msg:
            return "⚠️ **Image Analysis Unavailable:**\nThe AI Vision server is currently overloaded (Quota Exceeded). Please **type your question** instead!"
        else:
            return f"⚠️ **Image Analysis Failed:**\nI am currently running in Text-Only mode. Error: {error_msg}"


def ask_huggingface_text(question, history):
    api_key = os.getenv("HUGGINGFACE_API_KEY")
    if not api_key: return "System Error: HUGGINGFACE_API_KEY missing."

    try:
        client = InferenceClient(api_key=api_key)
        
        messages = []
        messages.append({"role": "system", "content": "You are a helpful academic tutor. Use Markdown and LaTeX."})
        
        for msg in history:
            role = "user" if msg['is_user'] else "assistant"
            messages.append({"role": role, "content": msg['content']})
            
        messages.append({"role": "user", "content": question})

        # Use Llama 3
        response = client.chat_completion(
            model="meta-llama/Meta-Llama-3-8B-Instruct", 
            messages=messages,
            max_tokens=1500,
            stream=False
        )
        return response.choices[0].message.content

    except Exception as e:
        print(f"HF Error: {e}")
        return "⚠️ AI Service Busy. Please escalate to a human tutor."