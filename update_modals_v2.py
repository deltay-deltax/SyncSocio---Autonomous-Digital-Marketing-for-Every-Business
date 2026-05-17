#!/usr/bin/env python3
import re

file_path = r"d:\Major_Project\frontend\src\pages\dashboard\DashboardDMs.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find all positions where we have the old content rendering
# We'll manually update both modals
changes_made = 0

for idx, line in enumerate(lines):
    # Find the title line  
    if '<h1 className="text-2xl md:text-3xl font-black leading-tight">{generatedAsset.title}</h1>' in line and idx > 1200:
        # Found first modal
        # Replace lines around this index
        lines[idx] = line.replace('text-2xl md:text-3xl', 'text-3xl md:text-4xl')
        
        # Next line should be the description
        if idx + 1 < len(lines) and 'generatedAsset.description' in lines[idx + 1]:
            # Update description styling and add comments
            indent = '                  '
            lines[idx] = f'{indent}{{/* Title */}}\n{indent}<h1 className="text-3xl md:text-4xl font-black leading-tight">{{generatedAsset.title}}</h1>\n'
            lines[idx + 1] = f'{indent}\n{indent}{{/* Description / Intro */}}\n{indent}<p className="text-base text-slate-300 leading-relaxed whitespace-pre-line">{{generatedAsset.description}}</p>\n'
            
            # Insert mainContent rendering after description
            main_content_block = f'''{indent}
{indent}{{/* Main Content (Rich) */}}
{indent}{{generatedAsset.mainContent && (
{indent}  <div className="border-t border-white/10 pt-6">
{indent}    <div className="prose prose-invert max-w-none text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
{indent}      {{generatedAsset.mainContent}}
{indent}    </div>
{indent}  </div>
{indent})}}
{indent}
{indent}{{/* Sections / Structured Content */}}
{indent}{{generatedAsset.sections && generatedAsset.sections.length > 0 && (
{indent}  <div className="border-t border-white/10 pt-6 space-y-4">
'''
            lines.insert(idx + 2, main_content_block)
            changes_made += 1
            print(f"Updated modal at line {idx}")

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f"✅ Made {changes_made} changes to DashboardDMs.tsx")
