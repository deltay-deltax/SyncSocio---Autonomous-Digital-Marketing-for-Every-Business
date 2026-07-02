import os
import fal_client
from dotenv import load_dotenv

load_dotenv()
os.environ["FAL_KEY"] = os.getenv("FAL_API_KEY", os.getenv("FAL_KEY", ""))

try:
    res = fal_client.subscribe(
        "openai/gpt-image-2/edit",
        arguments={
            "image": "https://fastly.picsum.photos/id/866/200/300.jpg?hmac=rcadCENKh4rD6MAp6V_ma-AyWv641M4iiOpe1RyFHeI",
            "instruction": "Testing"
        }
    )
    print("SUCCESS with image + instruction")
except Exception as e:
    print("FAIL 1", e)

try:
    res = fal_client.subscribe(
        "openai/gpt-image-2/edit",
        arguments={
            "image_url": "https://fastly.picsum.photos/id/866/200/300.jpg?hmac=rcadCENKh4rD6MAp6V_ma-AyWv641M4iiOpe1RyFHeI",
            "prompt": "Testing"
        }
    )
    print("SUCCESS with image_url + prompt")
except Exception as e:
    print("FAIL 2", e)

