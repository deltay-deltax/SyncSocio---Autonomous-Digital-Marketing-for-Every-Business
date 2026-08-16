from fal_visual_engine import generate_fal_image_gpt2

print("Testing quality='medium'...")
try:
    generate_fal_image_gpt2("A dog", image_size="square_hd", quality="medium")
    print("Medium succeeded")
except Exception as e:
    print(f"Medium failed: {e}")

print("Testing quality='low'...")
try:
    generate_fal_image_gpt2("A dog", image_size="square_hd", quality="low")
    print("Low succeeded")
except Exception as e:
    print(f"Low failed: {e}")

