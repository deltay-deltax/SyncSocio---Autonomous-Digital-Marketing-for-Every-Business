import React from 'react';
import { Sparkles } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export const IdeaBox = ({
  idea, setIdea, placeholder, label,
}: {
  idea: string;
  setIdea: (v: string) => void;
  placeholder?: string;
  label?: string;
}) => (
  <section className="mb-6">
    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
      {label || 'Explain your idea'} <span className="font-normal text-muted-foreground/60 normal-case">(optional)</span>
    </p>
    <div className="relative">
      <Textarea
        value={idea}
        onChange={(e) => setIdea(e.target.value)}
        placeholder={placeholder || 'e.g. Launching a soft pastel summer drop with 6 hero products — dreamy, sun-soaked & a little playful.'}
        className="min-h-[120px] rounded-2xl border-border/60 bg-card resize-none text-sm leading-relaxed pr-12"
      />
      <Sparkles size={14} className="absolute top-3.5 right-4 text-primary/60" />
    </div>
  </section>
);
