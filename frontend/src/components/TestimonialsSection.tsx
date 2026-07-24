import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Aisha Malhotra",
    role: "Founder, Glow Beauty",
    quote:
      "Velocity turned our weekly content calendar from a 6-hour stress-fest into a 20-minute ritual. The AI understands our brand voice better than most freelancers.",
    rating: 5,
    initials: "AM",
    gradient: "from-violet-200 to-indigo-200",
  },
  {
    name: "Rohan Kapoor",
    role: "CMO, Urban Sole",
    quote:
      "We tested the 7-day plan and published 14 reels. Engagement doubled within two weeks. The scheduling + publishing flow is exactly what we needed.",
    rating: 5,
    initials: "RK",
    gradient: "from-emerald-200 to-teal-200",
  },
  {
    name: "Priya Nair",
    role: "Head of Growth, NutriBox",
    quote:
      "The festival studio saved us during Diwali. We generated campaign-ready carousels, WhatsApp creatives, and email headers in one afternoon. Clean, fast, and on-brand.",
    rating: 5,
    initials: "PN",
    gradient: "from-amber-200 to-orange-200",
  },
  {
    name: "Daniel Lee",
    role: "E-commerce Lead, Hometown Goods",
    quote:
      "E-comm listings used to take forever. Now we drop in a product and get marketplace-ready images in minutes. ROI is obvious after the first month.",
    rating: 5,
    initials: "DL",
    gradient: "from-blue-200 to-sky-200",
  },
  {
    name: "Sarah Thompson",
    role: "Content Director, SaaSwift",
    quote:
      "We produce high-quality SaaS explainers at a fraction of the cost. The editor feels like ChatGPT for creatives — intuitive and surprisingly polished.",
    rating: 5,
    initials: "ST",
    gradient: "from-pink-200 to-rose-200",
  },
  {
    name: "Karan Mehta",
    role: "Owner, Chai Co.",
    quote:
      "As a one-person team, Velocity is like hiring a designer, copywriter, and scheduler. The free creatives trial convinced me immediately.",
    rating: 5,
    initials: "KM",
    gradient: "from-lime-200 to-green-200",
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
