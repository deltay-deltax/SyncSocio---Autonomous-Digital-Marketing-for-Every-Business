from prompt_manager import get_formatted_prompt

brand_test = {
    "brandName": "Velocity AI",
    "businessCategory": "Tech Gadgets",
    "mainGoal": "Brand Awareness",
    "targetAudiences": ["Tech Enthusiasts", "Early Adopters"],
    "brandTone": "Bold",
    "primaryColor": "#00FF00",
    "secondaryColor": "#000000",
    "tagline": "Accelerate your future."
}

fashion_brand_test = {
    "brandName": "Luxe Vogue",
    "businessCategory": "High-End Fashion",
    "mainGoal": "Brand Awareness",
    "targetAudiences": ["Fashionistas", "Luxury Shoppers"],
    "brandTone": "Minimalist",
    "primaryColor": "#FFFFFF",
    "secondaryColor": "#000000",
    "tagline": "Style redefined."
}

jewellery_brand_test = {
    "brandName": "Ethereal Gems",
    "businessCategory": "Fine Jewellery",
    "mainGoal": "Sales",
    "targetAudiences": ["Bridal", "Luxury Collectors"],
    "brandTone": "Elegant",
    "primaryColor": "#1A1A1A",
    "secondaryColor": "#D4AF37",
    "tagline": "Timeless brilliance."
}

food_brand_test = {
    "brandName": "ChocoDelight",
    "businessCategory": "Gourmet Chocolates",
    "mainGoal": "D2C Sales",
    "targetAudiences": ["Dessert Lovers", "Gift Buyers"],
    "brandTone": "Indulgent",
    "primaryColor": "#3D1E12",
    "secondaryColor": "#F5E6D3",
    "tagline": "Pure cocoa bliss."
}

cosmetics_brand_test = {
    "brandName": "Silk Glow",
    "businessCategory": "Premium Skincare",
    "mainGoal": "Brand Awareness",
    "targetAudiences": ["Beauty Enthusiasts", "Skincare Lovers"],
    "brandTone": "Glamorous",
    "primaryColor": "#FFC0CB",
    "secondaryColor": "#FFD700",
    "tagline": "Radiance redefined."
}

startup_brand_test = {
    "brandName": "NeuralShield",
    "businessCategory": "AI Cybersecurity",
    "mainGoal": "Lead Generation",
    "targetAudiences": ["Enterprise CTOs", "Security Engineers"],
    "brandTone": "Futuristic/Minimalist",
    "primaryColor": "#00F0FF",
    "secondaryColor": "#000000",
    "tagline": "The future of autonomous security."
}

# Test Image
print("--- STARTUP (UNIVERSAL) IMAGE PROMPT TEST ---")
img_prompt = get_formatted_prompt("Static Post", "Neural Firewall Hardware", startup_brand_test)
print(img_prompt)

# Test Startup Reel
print("\n--- STARTUP (UNIVERSAL) REEL PROMPT TEST ---")
reel_prompt = get_formatted_prompt("Reel", "AI Threat Detection Reveal", startup_brand_test)
print(reel_prompt)
