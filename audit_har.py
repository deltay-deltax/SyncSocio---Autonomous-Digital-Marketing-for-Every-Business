import json
import re

har_files = [
    'd:/Major_Project/makelocalads.com.har',
    'd:/Major_Project/makelocalads.com_2nd.har',
    'd:/Major_Project/makelocalads.com_3rd.har',
    'd:/Major_Project/makelocalads.com_discovermode.har',
    'd:/Major_Project/makelocalads.com_drivepurchase.har',
    'd:/Major_Project/makelocalads.com_Photoshoot mode.har',
    'd:/Major_Project/makelocalads.com_wincomparison.har',
]

output_lines = []

for har_path in har_files:
    try:
        with open(har_path, 'r', encoding='utf-8', errors='replace') as f:
            har_data = json.load(f)
        
        output_lines.append(f'\n==== {har_path.split("/")[-1]} ====')
        
        found_generators = set()
        found_providers = set()
        found_prompts = []
        found_photoshoot_prompts = []
        found_brief_blocks = []
        found_design_req = None

        for entry in har_data['log']['entries']:
            response_content = entry['response'].get('content', {}).get('text', '')
            
            if not response_content:
                continue

            # Image model info
            for m in re.findall(r'"imageGeneratorId":"([^"]+)"', response_content):
                found_generators.add(m)
            for m in re.findall(r'"imageProvider":"([^"]+)"', response_content):
                found_providers.add(m)

            # Full prompt (finalImagePrompt)
            if 'finalImagePrompt' in response_content and not found_prompts:
                # grab first occurrence
                idx = response_content.find('"finalImagePrompt":"')
                if idx > -1:
                    snippet = response_content[idx+20:idx+5000]
                    # find end of the string value
                    end = snippet.find('","')
                    if end == -1:
                        end = 3000
                    found_prompts.append(snippet[:end])

            # Photoshoot prompt (no "Instructions by the director")
            if 'shotTitle' in response_content and not found_photoshoot_prompts:
                idx = response_content.find('"shotTitle"')
                if idx > -1:
                    found_photoshoot_prompts.append(response_content[idx:idx+3000])

            # Brief block
            if '"brief":"' in response_content and not found_brief_blocks:
                idx = response_content.find('"brief":"')
                if idx > -1:
                    snippet = response_content[idx+9:idx+2000]
                    end = snippet.find('","')
                    found_brief_blocks.append(snippet[:end if end > 0 else 2000])

            # Design requirements (static block)
            if 'Design requirements' in response_content and not found_design_req:
                idx = response_content.find('Design requirements')
                found_design_req = response_content[idx:idx+1200]

        output_lines.append(f'  imageGeneratorId: {found_generators}')
        output_lines.append(f'  imageProvider: {found_providers}')

        if found_brief_blocks:
            output_lines.append(f'\n  --- BRIEF (Art Director Brief) ---')
            output_lines.append(found_brief_blocks[0][:1500])

        if found_photoshoot_prompts:
            output_lines.append(f'\n  --- PHOTOSHOOT JSON Prompt ---')
            output_lines.append(found_photoshoot_prompts[0][:2000])

        if found_prompts:
            output_lines.append(f'\n  --- FULL finalImagePrompt ---')
            output_lines.append(found_prompts[0][:3000])

        if found_design_req:
            output_lines.append(f'\n  --- DESIGN REQUIREMENTS BLOCK ---')
            output_lines.append(found_design_req)

    except Exception as e:
        output_lines.append(f'Error in {har_path}: {e}')

with open('d:/Major_Project/har_audit_result.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(output_lines))

print('Done! Written to har_audit_result.txt')
