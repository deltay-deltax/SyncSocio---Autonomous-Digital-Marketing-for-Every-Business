import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Check, ArrowRight, X } from "lucide-react";

type Intent = "creatives" | "demo";

export default function FreeCreativesSection() {
  const [intent, setIntent] = useState<Intent | null>(null);

  return (
    <section id="free-creatives" className="relative py-24 bg-background overflow-hidden border-t border-border/40">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full bg-primary/20 blur-3xl opacity-60" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full bg-accent/20 blur-3xl opacity-40" />
      </div>

      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          className="text-center max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-black uppercase tracking-widest">
            <Sparkles className="w-3 h-3" /> Limited offer
          </div>
          <h2 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
            Get <span className="text-primary">3 free creatives</span><br /> crafted for your brand.
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            Share your brand, pick a vibe, and our AI studio ships 3 scroll-stopping creatives
            to your inbox — free, no card required.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => setIntent("creatives")}
              className="group inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-primary/25"
            >
              Claim my 3 free creatives
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button
              onClick={() => setIntent("demo")}
              className="inline-flex items-center gap-2 h-12 px-6 rounded-xl border border-border/60 bg-card/40 font-bold text-sm hover:bg-card/70 transition-all"
            >
              Book a demo call
            </button>
          </div>
        </motion.div>
      </div>

      {intent && <ClaimModal intent={intent} onClose={() => setIntent(null)} />}
    </section>
  );
}

function ClaimModal({ intent, onClose }: { intent: Intent; onClose: () => void }) {
  const [submitted, setSubmitted] = useState(false);
  const isDemo = intent === "demo";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative w-full max-w-lg rounded-3xl border border-border/60 bg-card p-8 shadow-2xl"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full border border-border/60 flex items-center justify-center hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {submitted ? (
          <div className="text-center py-6">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
              <Check className="w-7 h-7" />
            </div>
            <h3 className="mt-4 font-display text-2xl font-bold">You're on the list.</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {isDemo
                ? "We'll reach out shortly to schedule your demo call."
                : "We'll deliver your 3 free creatives within 24 hours."}
            </p>
            <button
              onClick={onClose}
              className="mt-6 h-11 px-6 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <h3 className="font-display text-2xl font-bold">
              {isDemo ? "Book a demo call" : "Claim your 3 free creatives"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {isDemo
                ? "Tell us about your brand — we'll set up a call at your convenience."
                : "Tell us about your brand — we'll send the pack to your inbox."}
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = {
                  name: formData.get("name"),
                  email: formData.get("email"),
                  phone: formData.get("phone"),
                  businessName: formData.get("businessName"),
                  businessCategory: formData.get("businessCategory"),
                  intent: intent,
                };

                try {
                  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5050/api";
                  const res = await fetch(`${API_URL}/leads`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data),
                  });
                  if (res.ok) {
                    setSubmitted(true);
                  }
                } catch (error) {
                  console.error("Failed to submit", error);
                }
              }}
              className="mt-6 space-y-4"
            >
              <Field label="Name" name="name" type="text" placeholder="John Doe" required />
              <Field label="Work email" name="email" type="email" placeholder="you@business.com" required />
              <Field label="Phone number" name="phone" type="tel" placeholder="+91 XXXXX XXXXX" required />
              <Field label="Business name" name="businessName" type="text" placeholder="Acme Corp" required />
              <SelectField 
                label="Business category" 
                name="businessCategory" 
                options={[
                  "Baby & Kids", "Food & Beverage", "Home & Living", "Education & Training",
                  "Real Estate & Property", "Travel & Hospitality", "Mobile Apps", "IT & Technical Tools",
                  "Gaming & Entertainment", "Fashion & Apparel", "Jewellery", "Beauty & Personal Care",
                  "Health & Wellness", "Coaching & Consulting", "Architecture", "Financial Services",
                  "Newsletters", "Online Marketplaces", "Digital Products", "E-Commerce",
                  "Services", "SaaS & Digital", "Other"
                ]}
                required
              />
              <button
                type="submit"
                className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-all"
              >
                {isDemo ? "Book my demo" : "Send me my creatives"}
              </button>
              <p className="text-[11px] text-center text-muted-foreground">
                No spam. No credit card. Unsubscribe anytime.
              </p>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="text-left">
      <label htmlFor={name} className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        className="mt-1.5 w-full h-11 px-3 rounded-xl border border-border/60 bg-background text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all"
      />
    </div>
  );
}

function SelectField({
  label,
  name,
  options,
  required,
}: {
  label: string;
  name: string;
  options: string[];
  required?: boolean;
}) {
  return (
    <div className="text-left">
      <label htmlFor={name} className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </label>
      <select
        id={name}
        name={name}
        required={required}
        className="mt-1.5 w-full h-11 px-3 rounded-xl border border-border/60 bg-background text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
        defaultValue=""
      >
        <option value="" disabled>Select a category</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
