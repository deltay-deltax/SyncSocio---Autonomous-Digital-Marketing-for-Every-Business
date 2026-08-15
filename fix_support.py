import sys

with open('admin/src/pages/SupportTickets.tsx', 'r') as f:
    content = f.read()

# Header replacements
content = content.replace('<h1 className="text-2xl font-bold text-white flex items-center gap-2">', '<h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">')
content = content.replace('<p className="text-sm text-zinc-400 mt-1">', '<p className="text-sm text-slate-500 mt-1">')

# Main layout elements
content = content.replace('bg-zinc-900 border border-zinc-800 rounded-xl', 'bg-white border border-slate-200 shadow-sm rounded-2xl')
content = content.replace('border-zinc-800', 'border-slate-200')
content = content.replace('bg-zinc-950', 'bg-slate-50')

# Text colors
content = content.replace('text-white', 'text-slate-900')
content = content.replace('text-zinc-500', 'text-slate-400')
content = content.replace('text-zinc-400', 'text-slate-500')

# Active ticket item
content = content.replace('bg-zinc-800 border-zinc-700 border', 'bg-indigo-50 border-indigo-200 border shadow-sm')
content = content.replace('hover:bg-zinc-800/50', 'hover:bg-slate-50')

# Input / Button
content = content.replace('bg-zinc-900 text-white', 'bg-white text-slate-900') # For select options
content = content.replace('focus:border-primary/50', 'focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20')

# Messages bubbles
content = content.replace(
"""                    <div className={`max-w-[80%] rounded-xl p-4 ${
                      msg.sender === 'admin'
                        ? 'bg-primary/20 text-white border border-primary/30 rounded-tr-sm'
                        : msg.sender === 'ai'
                          ? 'bg-blue-500/10 text-white border border-blue-500/20 rounded-tl-sm'
                          : 'bg-zinc-800 text-white rounded-tl-sm'
                    }`}>""",
"""                    <div className={`max-w-[80%] rounded-xl p-4 shadow-sm ${
                      msg.sender === 'admin'
                        ? 'bg-indigo-600 text-white border border-indigo-700 rounded-tr-sm'
                        : msg.sender === 'ai'
                          ? 'bg-blue-50 text-blue-900 border border-blue-200 rounded-tl-sm'
                          : 'bg-slate-100 text-slate-900 border border-slate-200 rounded-tl-sm'
                    }`}>"""
)

# Admin notification in message
content = content.replace(
"""                      <div className="text-[10px] text-zinc-400 mb-2 font-medium flex justify-between items-center gap-4">""",
"""                      <div className={`text-[10px] mb-2 font-medium flex justify-between items-center gap-4 ${msg.sender === 'admin' ? 'text-indigo-200' : 'text-slate-500'}`}>"""
)

# Status Colors
content = content.replace(
"""const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  in_progress: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  resolved: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  closed: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};""",
"""const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-50 text-blue-700 border border-blue-200',
  in_progress: 'bg-amber-50 text-amber-700 border border-amber-200',
  resolved: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  closed: 'bg-slate-100 text-slate-600 border border-slate-200',
};"""
)

# Priority Colors
content = content.replace(
"""const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-zinc-400',
  medium: 'text-blue-400',
  high: 'text-amber-400',
  urgent: 'text-red-400',
};""",
"""const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-slate-500',
  medium: 'text-blue-600',
  high: 'text-amber-600',
  urgent: 'text-red-600',
};"""
)

with open('admin/src/pages/SupportTickets.tsx', 'w') as f:
    f.write(content)
