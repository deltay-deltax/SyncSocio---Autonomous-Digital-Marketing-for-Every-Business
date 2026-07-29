import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, Check, ArrowRight, X } from "lucide-react";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { trackMetaEvent } from "@/utils/metaPixel";

type Intent = "creatives" | "demo";

export default function FreeCreativesSection() {
  const [intent, setIntent] = useState<Intent | null>(null);

  return (
    <section id="free-creatives" className="relative py-16 md:py-24 overflow-hidden border-t border-border/40">
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
          <h2 className="mt-5 text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
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
              Claim 3 Free Creatives
             
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
  const [formError, setFormError] = useState("");
  const [phone, setPhone] = useState<string | undefined>("");
  const [country, setCountry] = useState<any>("IN");
  const isDemo = intent === "demo";

  useEffect(() => {
    // Using XMLHttpRequest to bypass the GlobalErrorContext fetch interceptor.
    // This prevents ad-blockers (which block ipapi.co) from triggering the global "System Interruption" modal.
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://ipapi.co/json/');
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (data.country_code) {
          setCountry(data.country_code);
        }
      } catch (e) {
        // Silently fallback to 'IN'
      }
    };
    // Silently ignore network/CORS errors
    xhr.onerror = () => {};
    xhr.send();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-2xl sm:rounded-3xl border border-border/60 bg-card p-5 sm:p-8 shadow-2xl"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 w-8 h-8 rounded-full border border-border/60 flex items-center justify-center hover:bg-muted transition-colors bg-background"
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
                const eventId = crypto.randomUUID();
                const data = {
                  name: formData.get("name") as string,
                  email: formData.get("email") as string,
                  phone: phone || "",
                  businessName: formData.get("businessName") as string,
                  website: formData.get("website") as string,
                  businessCategory: formData.get("businessCategory") as string,
                  intent: intent,
                  eventId: eventId,
                  _gotcha: formData.get("_gotcha") as string,
                };

                setFormError("");

                // Email validation
                if (data.email) {
                  const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
                  if (!emailRegex.test(data.email.trim())) {
                    setFormError("Please enter a valid email address.");
                    return;
                  }

                  // Catch common email typos
                  const lowerEmail = data.email.trim().toLowerCase();
                  const domainPart = lowerEmail.split('@')[1];
                  
                  if (domainPart && domainPart.startsWith('gmail.') && domainPart !== 'gmail.com') {
                    setFormError("It looks like there is a typo in your email (e.g. @gmail.com).");
                    return;
                  }
                  if (domainPart && domainPart.startsWith('gamil.')) {
                    setFormError("It looks like there is a typo in your email (did you mean @gmail.com?).");
                    return;
                  }
                  if (domainPart && domainPart.startsWith('yahoo.') && domainPart !== 'yahoo.com' && domainPart !== 'yahoo.in' && domainPart !== 'yahoo.co.uk') {
                    setFormError("It looks like there is a typo in your email (e.g. @yahoo.com).");
                    return;
                  }
                }

                // Name validation
                if (data.name) {
                  const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ\s\'\-]{2,50}$/;
                  if (!nameRegex.test(data.name.trim())) {
                    setFormError("Please enter a valid name (no numbers or special symbols).");
                    return;
                  }
                  
                  // Block keyboard smashes
                  const lowerName = data.name.trim().toLowerCase();
                  if (/asdf|qwer|zxcv|asds|test|fake|dummy/.test(lowerName)) {
                    setFormError("Please enter a valid professional name.");
                    return;
                  }
                }

                // Phone validation (Strict country-specific validation)
                if (!data.phone || !isValidPhoneNumber(data.phone)) {
                  setFormError("Please enter a valid phone number for your country.");
                  return;
                }

                try {
                  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5050/api";
                  const res = await fetch(`${API_URL}/leads`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data),
                  });
                  if (res.ok) {
                    setSubmitted(true);
                    trackMetaEvent('Lead', {
                      content_name: isDemo ? 'Demo Call' : 'Free Creatives'
                    }, false, eventId);
                  } else {
                    const result = await res.json();
                    setFormError(result.message || "Failed to submit. Please try again.");
                  }
                } catch (error) {
                  console.error("Failed to submit", error);
                  setFormError("Network error. Please try again later.");
                }
              }}
              className="mt-6 space-y-4"
            >
              {/* Honeypot field (hidden from real users, bots will fill it) */}
              <input type="text" name="_gotcha" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
              
              <Field label="Name" name="name" type="text" placeholder="John Doe" />
              <Field label="Work email" name="email" type="email" placeholder="you@business.com" />
              
              <div className="text-left">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Phone number
                </label>
                <div className="mt-1.5 w-full h-11 px-3 rounded-xl border border-border/60 bg-background flex items-center focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                  <PhoneInput
                    international
                    defaultCountry={country}
                    value={phone}
                    onChange={setPhone}
                    className="w-full bg-transparent text-sm outline-none"
                    style={{ "--PhoneInput-color--focus": "transparent" } as React.CSSProperties}
                  />
                </div>
              </div>

              <Field label="Business name" name="businessName" type="text" placeholder="Acme Corp" required />
              <Field label="Website link (optional)" name="website" type="url" placeholder="https://www.example.com" />
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
              {formError && (
                <div className="text-red-500 text-sm font-medium text-center bg-red-500/10 py-2 rounded-lg">
                  {formError}
                </div>
              )}
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
