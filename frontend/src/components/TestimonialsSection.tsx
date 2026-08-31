import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Zubair Aalam",
    role: "Bfour Exim",
    quote:
      "Agencies were charging us ₹15,000 a day for marketing. Now we have SyncSocio helping us create campaign-ready carousels and health tip videos in minutes. It's completely transformed how we market our LifeCore ionizers.",
    rating: 5,
    initials: "ZA",
    gradient: "from-violet-200 to-indigo-200",
  },
  {
    name: "Abhisekh Gupta",
    role: "Abhiyan Educational Consultancy",
    quote:
      "Graphic designers were costing us way too much for our social media updates. SyncSocio lets us quickly create professional banners for our university tie-ups and scholarship announcements. It's a game changer.",
    rating: 5,
    initials: "AG",
    gradient: "from-emerald-200 to-teal-200",
  },
  {
    name: "Rahul Sharma",
    role: "Founder, TechSolutions",
    quote:
      "We were struggling to maintain a consistent social media presence. SyncSocio changed that entirely. It acts like our in-house marketing team, generating high-quality posts effortlessly. It's easily the best investment we've made this year.",
    rating: 5,
    initials: "RS",
    gradient: "from-amber-200 to-orange-200",
  },
];

const stats = [
  { label: "Creatives generated", value: "1.5K+" },
  { label: "Avg. time saved / week", value: "20 hrs" },
  { label: "Customer satisfaction", value: "4.9/5" },
];

export default function TestimonialsSection() {
  return (
    <section id="testimonials" className="relative py-16 md:py-24 bg-gradient-hero overflow-hidden border-t border-border">
      <div className="pointer-events-none absolute inset-0 bg-gradient-mesh opacity-60" />

      <div className="relative mx-auto max-w-6xl px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3.5 py-1.5 shadow-soft">
            <Star size={13} className="text-primary fill-primary" />
            <span className="text-[11px] font-bold tracking-tight text-primary">
              Loved by founders & marketers
            </span>
          </div>
          <h2 className="mt-6 font-display text-4xl md:text-5xl font-black tracking-tight text-foreground leading-[1.05]">
            Brands grow faster with{" "}
            <span className="text-primary">SyncSocio.</span>
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            Real results from teams who replaced messy content workflows with one clean AI studio.
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-border/60 bg-card/50 p-5 text-center backdrop-blur-sm"
            >
              <div className="font-display text-3xl font-black text-foreground">
                {s.value}
              </div>
              <div className="mt-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                {s.label}
              </div>
            </div>
          ))}
        </motion.div>

        {/* Testimonials Grid */}
        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.article
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: 0.15 + (i % 3) * 0.08 }}
              className="group flex flex-col rounded-3xl border border-border/60 bg-card p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-elegant"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${t.gradient} text-sm font-black text-foreground/80 shadow-inner`}
                >
                  {t.initials}
                </div>
                <div className="min-w-0">
                  <h3 className="font-display text-sm font-bold text-foreground">
                    {t.name}
                  </h3>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {t.role}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex gap-0.5">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star
                    key={j}
                    size={14}
                    className="text-amber-400 fill-amber-400"
                  />
                ))}
              </div>

              <div className="relative mt-4 flex-1">
                <Quote
                  size={20}
                  className="absolute -top-1 -left-1 text-primary/10"
                />
                <p className="pl-5 text-sm leading-relaxed text-muted-foreground">
                  {t.quote}
                </p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
