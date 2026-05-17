import re

file_path = r"d:\Major_Project\frontend\src\pages\dashboard\DashboardDMs.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern 1: Replace title and description section
# Match: <h1 className="text-2xl md:text-3xl ... followed by <p className="text-sm text-slate-400
old_title = r'(<div className="bg-slate-950.*?<div className="inline-flex.*?Preview.*?</div>\n)(\s+)<h1 className="text-2xl md:text-3xl font-black leading-tight">\{generatedAsset\.title\}</h1>\n\s+<p className="text-sm text-slate-400 leading-relaxed whitespace-pre-line">\{generatedAsset\.description\}</p>'

new_title = r'\1\2{/* Title */}\n\2<h1 className="text-3xl md:text-4xl font-black leading-tight">{generatedAsset.title}</h1>\n\2\n\2{/* Description / Intro */}\n\2<p className="text-base text-slate-300 leading-relaxed whitespace-pre-line">{generatedAsset.description}</p>\n\2\n\2{/* Main Content (Rich) */}\n\2{generatedAsset.mainContent && (\n\2  <div className="border-t border-white/10 pt-6">\n\2    <div className="prose prose-invert max-w-none text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">\n\2      {generatedAsset.mainContent}\n\2    </div>\n\2  </div>\n\2)}\n\2\n\2{/* Sections / Structured Content */}\n\2{generatedAsset.sections && generatedAsset.sections.length > 0 && (\n\2  <div className="border-t border-white/10 pt-6 space-y-4">'

content = re.sub(old_title, new_title, content, flags=re.DOTALL)

# Pattern 2: Fix the sections map opening
old_sections_map = r'\{generatedAsset\.sections\.map\(\(sec: any, i: number\) => \(\s+<div key=\{i\} className="mt-6 border-t border-white/10 pt-6">'

new_sections_map = '''{generatedAsset.sections.map((sec: any, i: number) => (
                        <div key={i}>'''

content = re.sub(old_sections_map, new_sections_map, content)

# Pattern 3: Fix the item rendering (removing "Step X:" prefix and flex layout)
old_item = r'(<div key=\{j\} className="bg-white/5 rounded-xl p-4 border border-white/10 flex items-start gap-3">\n\s+<div className="text-2xl shrink-0">\{item\.icon \|\| \'✨\'\}</div>\n\s+)<div>(\n\s+)<p className="text-sm font-bold text-white">Step \{j \+ 1\}: \{item\.title\}</p>\n\s+<p className="text-xs text-slate-400 mt-1">\{item\.description\}</p>(\n\s+)</div>'

new_item = r'\1<div className="flex-1">\2<p className="text-sm font-bold text-white">{item.title}</p>\2<p className="text-xs text-slate-300 mt-2 leading-relaxed">{item.description}</p>\3</div>'

content = re.sub(old_item, new_item, content)

# Pattern 4: Close sections and add key takeaways
old_closing = r'(\s+</div>\n\s+)}\)}\)\n\n(\s+)<div className="pt-4">\n(\s+)<span className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-sm font-bold text-white">\n(\s+)\{generatedAsset\.ctaText\}\n(\s+)</span>\n(\s+)</div>'

new_closing = r'''\1        </div>
                      ))}
                    </div>
                  )}

                  {/* Key Takeaways */}
                  {generatedAsset.keyTakeaways && generatedAsset.keyTakeaways.length > 0 && (
                    <div className="border-t border-white/10 pt-6">
                      <h3 className="text-lg font-bold mb-3 text-white/90">Key Takeaways</h3>
                      <ul className="space-y-2">
                        {generatedAsset.keyTakeaways.map((takeaway: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                            <span className="text-amber-400 font-bold mt-0.5">✓</span>
                            <span>{takeaway}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Visual Suggestions */}
                  {generatedAsset.needsVisuals && generatedAsset.visualSuggestions && (
                    <div className="border-t border-white/10 pt-6 bg-white/5 rounded-xl p-4 border border-white/10">
                      <h4 className="text-sm font-bold text-white/80 mb-2 flex items-center gap-2">
                        🎨 Recommended Visuals
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed">{generatedAsset.visualSuggestions}</p>
                    </div>
                  )}

                  {/* CTA */}
                  <div className="border-t border-white/10 pt-6 flex flex-col gap-2">
                    <span className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-sm font-bold text-white w-full justify-center">
                      {generatedAsset.ctaText}
                    </span>
                    {generatedAsset.ctaDescription && (
                      <p className="text-xs text-slate-400 text-center">{generatedAsset.ctaDescription}</p>
                    )}
                  </div>'''

content = re.sub(old_closing, new_closing, content, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Successfully updated both Asset Preview Modals in DashboardDMs.tsx")
print("✅ Now displays: mainContent, sections, keyTakeaways, visualSuggestions, and ctaDescription")
