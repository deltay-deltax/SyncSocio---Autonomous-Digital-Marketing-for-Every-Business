with open('d:/Major_Project/ai_agents/strategy_image_agent.py', 'r', encoding='utf-8', errors='replace') as f:
    lines = f.readlines()
for i, l in enumerate(lines):
    if 'elif layout == "image":' in l:
        print(f'IMAGE START: {i+1}')
    if 'elif layout == "photoshoot":' in l:
        print(f'IMAGE END: {i}')
    if 'elif layout == "carousel":' in l:
        print(f'CAROUSEL START: {i+1}')
    if 'elif layout == "video":' in l:
        print(f'CAROUSEL END: {i}')
