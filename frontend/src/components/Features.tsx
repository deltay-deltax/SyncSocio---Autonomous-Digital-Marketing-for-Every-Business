import { Dna, LayoutGrid, CalendarDays, CalendarClock, Send, BarChart3 } from "lucide-react";

const features = [
  {
    icon: Dna,
    title: "Brand DNA Engine",
    description: "Your tone, category, USP, colors, and audience get synthesized into every creative — so every post sounds and looks unmistakably you.",
  },
  {
    icon: LayoutGrid,
    title: "Multi-Format Content Studio",
    description: "Generate static images, carousels, AI-UGC reels, product videos, and e-commerce listings — all from a single studio, in one tap.",
  },
  {
    icon: CalendarDays,
    title: "40+ Festival Calendar",
    description: "Auto-timed creatives for Diwali, Holi, Eid, Christmas, and 40+ Indian and global occasions — always ready before the trend peaks.",
  },
  {
    icon: CalendarClock,
    title: "Auto-Schedule & Publish",
    description: "Approve a post and let the agent handle the rest. Content goes live at the optimal time — directly to your Instagram feed.",
  },
  {
    icon: Send,
    title: "Broadcast Engine",
    description: "Upload your customer list and hit send. AI-written WhatsApp blasts and email campaigns ship to thousands of contacts in one click.",
  },
  {
    icon: BarChart3,
    title: "Instagram Analytics",
    description: "Track followers, reach, impressions, and engagement rate — pulled live from the Instagram Graph API. No guesswork, just real data.",
  },
];

const doubledFeatures = [...features, ...features];

const Features = () => {
  return (
    <section id="features" className="py-24 sm:py-32 overflow-hidden relative">
      {/* Background gradient splash */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full opacity-[0.07] blur-[100px] bg-primary" />
        <div className="absolute top-1/4 right-0 w-[300px] h-[300px] rounded-full opacity-[0.05] blur-[80px] bg-primary" />
      </div>

      <div className="container mx-auto px-6 mb-12 relative z-10">
        <div className="text-center">
          <span className="text-sm font-semibold text-primary uppercase tracking-widest mb-4 block">
            What We Offer
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
            The protocol.{" "}
            <span className="gradient-text">Your unfair advantage.</span>
          </h2>
        </div>
      </div>

      {/* Marquee container */}
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

        <div className="flex animate-marquee w-max">
          {doubledFeatures.map((feature, i) => (
            <div
              key={`${feature.title}-${i}`}
              className="glass-card rounded-2xl p-8 mx-3 w-[340px] flex-shrink-0 group hover-lift relative overflow-hidden"
            >
              {/* Card gradient accent */}
              <div className="absolute top-0 left-0 right-0 h-1 gradient-bg" />
              <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                <feature.icon size={22} className="text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
