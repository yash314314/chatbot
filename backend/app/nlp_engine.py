import os
from dotenv import load_dotenv
from huggingface_hub import InferenceClient

load_dotenv()

def generate_answer(question: str, image_base64: str = None, previous_history: list = []) -> str:
    """
    Uses Hugging Face (Meta Llama 3) via the Chat API.
    """
    api_key = os.getenv("HUGGINGFACE_API_KEY")
    if not api_key: 
        return "Error: HUGGINGFACE_API_KEY is missing in .env file."

    if image_base64:
        return "⚠️ I am currently running in 'Backup Mode' (Hugging Face Llama 3). I cannot analyze images right now, but I can answer your text questions!"

    try:
        client = InferenceClient(api_key=api_key)

        messages = []
        
        messages.append({
            "role": "system", 
            "content": "You are a helpful academic tutor. Explain concepts clearly using Markdown (bold, lists). Do not use complex LaTeX."
        })

        for msg in previous_history:
            role = "user" if msg['is_user'] else "assistant"
            messages.append({"role": role, "content": msg['content']})

        messages.append({"role": "user", "content": question})

        response = client.chat_completion(
            model="meta-llama/Meta-Llama-3-8B-Instruct", 
            messages=messages,
            max_tokens=2000,
            stream=False
        )

        return response.choices[0].message.content

    except Exception as e:
        print(f"HF Error: {e}")
        if "410" in str(e) or "404" in str(e):
            return fallback_qwen(client, messages)
            
        return "AI Service Unavailable. Please check your API Key."

def fallback_qwen(client, messages):
    try:
        response = client.chat_completion(
            model="Qwen/Qwen2.5-7B-Instruct",
            messages=messages,
            max_tokens=2000
        )
        return response.choices[0].message.content
    except:
        return "All AI models are currently busy. Please try again later."