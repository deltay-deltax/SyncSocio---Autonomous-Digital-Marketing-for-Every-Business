import sys

with open('admin/src/pages/SupportTickets.tsx', 'r') as f:
    content = f.read()

content = content.replace('bg-zinc-500/10 text-slate-500 border border-zinc-500/20', 'bg-slate-100 text-slate-600 border border-slate-200')
content = content.replace('className="bg-zinc-900 text-slate-900"', 'className="bg-white text-slate-900"')
content = content.replace('bg-zinc-800 text-slate-900 rounded-tl-sm', 'bg-slate-100 text-slate-900 border border-slate-200 rounded-tl-sm')
content = content.replace('className="flex-1 bg-zinc-900 border border-slate-200', 'className="flex-1 bg-white border border-slate-200')
content = content.replace('text-white', 'text-slate-900') # any remaining text-white

with open('admin/src/pages/SupportTickets.tsx', 'w') as f:
    f.write(content)
