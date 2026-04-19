import os, base64, sys
from dotenv import load_dotenv
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv()
from visual_engine import generate_google_image

def test_i2i():
    # 1. Path to the source image
    image_path = r"d:\Major_Project\ai_agents\scratch\source_mouse.png"
    
    # 2. Convert source image to Base64
    if not os.path.exists(image_path):
        print(f"ERROR: Image not found at {image_path}")
        return

    with open(image_path, "rb") as image_file:
        b64_source = base64.b64encode(image_file.read()).decode('utf-8')

    # 3. Define a prompt for the I2I transformation
    # We'll ask to dress up the mouse scene with high-fashion lighting and silk
    test_prompt = (
        "A high-fidelity cinematic shot of a mouse wearing a tiny designer hat, "
        "sitting on a plush pink silk cushion. Background is premium studio lighting "
        "with soft-focus bokeh. Professional macro photography, 8k render."
    )

    print("TEST: Starting Image-to-Image generation using Gemini 3.1...")
    print(f"Source Image: {image_path}")
    print(f"Prompt: {test_prompt}")

    try:
        # 4. Call the visual engine
        # We pass the b64 source image and the prompt
        result = generate_google_image(test_prompt, image=b64_source)

        if result and "image" in result:
            output_b64 = result["image"]
            output_path = r"d:\Major_Project\ai_agents\scratch\test_output_mouse.png"
            
            # 5. Save the result back to disk for verification
            with open(output_path, "wb") as f:
                f.write(base64.b64decode(output_b64))
            
            print(f"SUCCESS: Test image generated and saved to {output_path}")
        else:
            print(f"FAILURE: Engine returned invalid result: {result}")

    except Exception as e:
        print(f"CRITICAL ERROR in Test: {str(e)}")

if __name__ == "__main__":
    # Ensure environment variables are loaded if necessary (visual_engine reads GOOGLE_API_KEY)
    test_i2i()
