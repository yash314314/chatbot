import os
from dotenv import load_dotenv
from huggingface_hub import InferenceClient

load_dotenv()

def generate_answer(question: str, image_base64: str = None, previous_history: list = []) -> str:
    api_key = os.getenv("HUGGINGFACE_API_KEY")
    if not api_key: 
        return "System Error: HUGGINGFACE_API_KEY is missing."

    client = InferenceClient(api_key=api_key)

    if image_base64:
        try:
            print("📷 Image detected, switching to Vision Model...")
       
            if "," in image_base64:
                image_url = image_base64  
            else:
                image_url = f"data:image/jpeg;base64,{image_base64}"

       
            messages = [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text", 
                            "text": f"You are a helpful tutor. Analyze this image and answer the question: {question}"
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": image_url}
                        }
                    ]
                }
            ]

      
            response = client.chat_completion(
                model="meta-llama/Llama-3.2-11B-Vision-Instruct",
                messages=messages,
                max_tokens=1000,
                stream=False
            )
            return response.choices[0].message.content

        except Exception as e:
            print(f"Vision Error: {e}")
            return "⚠️ Image Analysis Failed: The free vision model is currently overloaded. Please try again or ask in text."


    try:

        messages = []
        messages.append({
            "role": "system", 
            "content": "You are a helpful academic tutor. Explain concepts clearly using Markdown ($E=mc^2$)."
        })

        for msg in previous_history:
            role = "user" if msg['is_user'] else "assistant"
            messages.append({"role": role, "content": msg['content']})

        messages.append({"role": "user", "content": question})

        response = client.chat_completion(
            model="meta-llama/Meta-Llama-3-8B-Instruct", 
            messages=messages,
            max_tokens=1500,
            stream=False
        )
        return response.choices[0].message.content

    except Exception as e:
        print(f"HF Error: {e}")
        return fallback_qwen(client, messages)

def fallback_qwen(client, messages):
    try:
        response = client.chat_completion(
            model="Qwen/Qwen2.5-7B-Instruct",
            messages=messages,
            max_tokens=1000
        )
        return response.choices[0].message.content
    except Exception as e:
        return "⚠️ AI Service Busy. Please escalate to a human tutor."