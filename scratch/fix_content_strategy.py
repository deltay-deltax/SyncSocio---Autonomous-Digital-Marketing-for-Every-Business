import re

filepath = r'd:\Major_Project\frontend\src\pages\dashboard\ContentStrategy.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: Replace the broken handleAnalyzeMix call (references undefined `post` and `imageBase64`)
old_block = """      const AGENT_API_URL = import.meta.env.VITE_AGENT_API_URL || 'http://localhost:8000';
      const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';

      const res = await fetch(`${AGENT_API_URL}/generate-visuals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: post.visualPrompt,
          format: post.type === 'Static' ? 'Static Image' : post.type,
          slides: post.carouselSlides,
          image: imageBase64,
          slide_prompts: post.slidesMetadata?.map(m => m.visual_prompt),
          headline: post.title,
          userId: profile?._id || profile?.id
        })
      });"""

new_block = """      const AGENT_API_URL = import.meta.env.VITE_AGENT_API_URL || 'http://localhost:8000';

      const res = await fetch(`${AGENT_API_URL}/analyze-mix?userId=${profile?._id || profile?.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });"""

# Normalize line endings for matching
old_normalized = old_block.replace('\r\n', '\n').replace('\r', '\n')
content_normalized = content.replace('\r\n', '\n')

count = content_normalized.count(old_normalized)
print(f"Found {count} occurrence(s) of old block")

if count == 1:
    content_normalized = content_normalized.replace(old_normalized, new_block.replace('\r\n', '\n').replace('\r', '\n'))
    # Restore original line endings (CRLF)
    content_final = content_normalized.replace('\n', '\r\n')
    
    with open(filepath, 'w', encoding='utf-8', newline='') as f:
        f.write(content_final)
    print("SUCCESS: Fixed handleAnalyzeMix")
else:
    # Try a more targeted approach - find by unique lines
    if 'image: imageBase64,\n          slide_prompts: post.slidesMetadata' in content_normalized:
        print("Found via substring, but full block didn't match. Checking whitespace...")
        # Show the actual content around line 95
        lines = content_normalized.split('\n')
        for i in range(88, 108):
            print(f"  Line {i+1}: {repr(lines[i])}")
    else:
        print("Block not found even with normalized endings. Checking file content...")
        # Search for unique identifier
        idx = content_normalized.find('generate-visuals')
        if idx >= 0:
            print(f"Found 'generate-visuals' at char {idx}")
            snippet = content_normalized[max(0,idx-200):idx+200]
            print(f"Context: {repr(snippet)}")
