import os
import base64
import io
from dotenv import load_dotenv
from PIL import Image
from huggingface_hub import InferenceClient


try:
    from google import genai
    HAS_GOOGLE = True
except ImportError:
    HAS_GOOGLE = False

load_dotenv()

def generate_answer(question: str, image_base64: str = None, previous_history: list = []) -> str:
    """
    HYBRID MODE:
    - If Image -> Use Google Gemini (Vision)
    - If Text  -> Use Hugging Face Llama 3 (Unlimited Text)
    """
    

    if image_base64:
        return ask_gemini_vision(question, image_base64)

  
    return ask_huggingface_text(question, previous_history)


def ask_gemini_vision(question, image_base64):
    print("📷 Image detected! Switching to Google Gemini Vision...")
    
    api_key = os.getenv("GEMINI_API_KEY")
    if not HAS_GOOGLE: return "System Error: 'google-genai' library missing."
    if not api_key: return "System Error: GEMINI_API_KEY missing."

    try:
        client = genai.Client(api_key=api_key)
        
    
        if "," in image_base64:
            image_base64 = image_base64.split(",")[1]
        image_bytes = base64.b64decode(image_base64)
        image = Image.open(io.BytesIO(image_bytes))

     
        response = client.models.generate_content(
            model='gemini-1.5-flash', 
            contents=[image, "\n\n", f"Analyze this image and answer: {question}"]
        )
        return response.text

    except Exception as e:
        print(f"❌ Gemini Error: {e}")
        if "429" in str(e):
            return "⚠️ Image Quota Exceeded: The Google Vision API is currently busy. Please try asking a text-only question."
        return "⚠️ Image Analysis Failed. Please try text input."


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