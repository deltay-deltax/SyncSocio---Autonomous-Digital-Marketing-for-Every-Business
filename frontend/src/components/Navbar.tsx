import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, User, Globe, Target, Palette, BarChart3, MapPin, Megaphone, Users, Layers, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface ProfileData {
  brandName: string;
  socialHandle: string;
  businessCategory: string;
  otherCategory: string;
  mainGoal: string;
  website: string;
  location: { country: string; city: string };
  usp: string;
  competitors: string[];
  targetAudience: string;
  ageRange: string;
  genderFocus: string;
  painPoint: string;
  brandTone: string;
  visualVibe: string;
  brandKeywords: string;
  contentTypes: string[];
  postingFrequency: string;
  socialPlatforms: string[];
  analytics: { followers: string; reach: string; engagement: string };
  contentMix: { education: number; promotion: number };
  primaryCTA: string;
}

// 1. We define an interface so TypeScript knows 'isRoute' is allowed but optional (?)
interface NavLink {
  label: string;
  href: string;
  isRoute?: boolean;
}

// 2. We move links here and give them the NavLink type
const NAV_LINKS: NavLink[] = [
  { label: "The Magic", href: "#features" },
  { label: "The Plan", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
];

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground mt-0.5 break-words">{value || "—"}</p>
    </div>
  </div>
);

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5050/api/profile/me";
        const res = await fetch(BASE_URL, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
          localStorage.setItem("velocity_profile", JSON.stringify(data));
        }
      } catch (err) {
        console.error("Failed to fetch profile:", err);
        const stored = localStorage.getItem("velocity_profile");
        if (stored) setProfile(JSON.parse(stored));
      }
    };

    fetchProfile();

    const handler = () => {
      const d = localStorage.getItem("velocity_profile");
      if (d) try { setProfile(JSON.parse(d)); } catch { /* */ }
    };
    window.addEventListener("storage", handler);
    window.addEventListener("focus", fetchProfile);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("focus", fetchProfile);
    };
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("velocity_profile");
    if (stored && !profile) {
      try { setProfile(JSON.parse(stored)); } catch { /* */ }
    }
  }, [profile]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("velocity_profile");
    window.location.href = "/login";
  };

  const initials = profile?.brandName
    ? profile.brandName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 glass-card"
    >
      <div className="container mx-auto flex items-center justify-between px-6 py-4">
        <a href="#" className="font-display text-xl font-bold tracking-tight">
          <span className="gradient-text">Velocity</span>
        </a>

        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) =>
            link.isRoute ? (
              <Link key={link.label} to={link.href} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                {link.label}
              </Link>
            ) : (
              <a key={link.label} href={link.href} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                {link.label}
              </a>
            )
          )}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {profile ? (
            <Sheet>
              <SheetTrigger asChild>
                <button className="relative group">
                  <Avatar className="h-9 w-9 ring-2 ring-primary/30 ring-offset-2 ring-offset-background cursor-pointer transition-all hover:ring-primary/60">
                    <AvatarFallback className="gradient-bg text-primary-foreground text-xs font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background" />
                </button>
              </SheetTrigger>
              <SheetContent className="w-[380px] sm:w-[420px] overflow-y-auto border-border/50 bg-background/95 backdrop-blur-xl">
                <SheetHeader className="pb-4 border-b border-border/50">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-14 w-14 ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
                      <AvatarFallback className="gradient-bg text-primary-foreground text-lg font-bold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <SheetTitle className="text-xl font-bold">{profile.brandName || "Your Brand"}</SheetTitle>
                      <p className="text-sm text-muted-foreground">{profile.socialHandle ? `@${profile.socialHandle}` : "No handle set"}</p>
                    </div>
                  </div>
                </SheetHeader>

                <div className="mt-6 space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-3">Brand Identity</p>
                  <InfoRow icon={<Layers size={14} className="text-primary" />} label="Category" value={profile.businessCategory === "Other" ? profile.otherCategory : profile.businessCategory} />
                  <InfoRow icon={<Target size={14} className="text-primary" />} label="Main Goal" value={profile.mainGoal} />
                  <InfoRow icon={<Globe size={14} className="text-primary" />} label="Website" value={profile.website} />
                  <InfoRow icon={<MapPin size={14} className="text-primary" />} label="Location" value={[profile.location?.city, profile.location?.country].filter(Boolean).join(", ")} />
                  <InfoRow icon={<Megaphone size={14} className="text-primary" />} label="USP" value={profile.usp} />
                </div>

                <div className="mt-6 space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-3">Audience & Market</p>
                  <InfoRow icon={<Users size={14} className="text-primary" />} label="Target Audience" value={profile.targetAudience} />
                  <InfoRow icon={<User size={14} className="text-primary" />} label="Age Range" value={profile.ageRange} />
                  <InfoRow icon={<User size={14} className="text-primary" />} label="Gender Focus" value={profile.genderFocus} />
                  <InfoRow icon={<Target size={14} className="text-primary" />} label="Pain Point" value={profile.painPoint} />
                  {profile.competitors?.length > 0 && (
                    <InfoRow icon={<BarChart3 size={14} className="text-primary" />} label="Competitors" value={profile.competitors.join(", ")} />
                  )}
                </div>

                <div className="mt-6 space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-3">Brand Style</p>
                  <InfoRow icon={<Palette size={14} className="text-primary" />} label="Brand Tone" value={profile.brandTone} />
                  <InfoRow icon={<Palette size={14} className="text-primary" />} label="Visual Vibe" value={profile.visualVibe} />
                  <InfoRow icon={<Megaphone size={14} className="text-primary" />} label="Keywords" value={profile.brandKeywords} />
                </div>

                <div className="mt-6 space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-3">Content Strategy</p>
                  {profile.contentTypes?.length > 0 && (
                    <InfoRow icon={<Layers size={14} className="text-primary" />} label="Content Types" value={profile.contentTypes.join(", ")} />
                  )}
                  <InfoRow icon={<Clock size={14} className="text-primary" />} label="Posting Frequency" value={profile.postingFrequency} />
                  {profile.socialPlatforms?.length > 0 && (
                    <InfoRow icon={<Globe size={14} className="text-primary" />} label="Platforms" value={profile.socialPlatforms.join(", ")} />
                  )}
                  <InfoRow icon={<Target size={14} className="text-primary" />} label="Primary CTA" value={profile.primaryCTA} />
                </div>

                <div className="mt-6 space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-3">Analytics</p>
                  <InfoRow icon={<Users size={14} className="text-primary" />} label="Followers" value={profile.analytics?.followers} />
                  <InfoRow icon={<BarChart3 size={14} className="text-primary" />} label="Avg. Reach" value={profile.analytics?.reach} />
                  <InfoRow icon={<BarChart3 size={14} className="text-primary" />} label="Engagement" value={profile.analytics?.engagement} />
                </div>

                <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Content Mix</p>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full gradient-bg rounded-full" style={{ width: `${profile.contentMix?.education ?? 50}%` }} />
                    </div>
                    <span className="text-xs font-bold text-foreground">{profile.contentMix?.education ?? 50}% edu</span>
                    <span className="text-xs text-muted-foreground">/</span>
                    <span className="text-xs font-bold text-foreground">{profile.contentMix?.promotion ?? 50}% promo</span>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-border/50">
                  <Button
                    variant="outline"
                    className="w-full border-red-500/20 text-red-500 hover:bg-red-500/10 hover:text-red-600 transition-all font-bold tracking-widest uppercase text-[10px]"
                    onClick={handleLogout}
                  >
                    Terminate Session & Logout
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Login</Link>
              </Button>
              <Button size="sm" className="gradient-bg text-primary-foreground border-0" asChild>
                <Link to="/signup">Sign Up</Link>
              </Button>
            </>

          )}
        </div>

        <button className="md:hidden text-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden border-t border-border bg-card"
          >
            <div className="flex flex-col gap-4 px-6 py-6">
              {NAV_LINKS.map((link) =>
                link.isRoute ? (
                  <Link key={link.label} to={link.href} className="text-sm font-medium text-muted-foreground" onClick={() => setMobileOpen(false)}>
                    {link.label}
                  </Link>
                ) : (
                  <a key={link.label} href={link.href} className="text-sm font-medium text-muted-foreground" onClick={() => setMobileOpen(false)}>
                    {link.label}
                  </a>
                )
              )}
              <div className="flex gap-3 pt-2">
                {profile ? (
                  <Sheet>
                    <SheetTrigger asChild>
                      <button className="flex items-center gap-2 w-full">
                        <Avatar className="h-8 w-8 ring-2 ring-primary/30">
                          <AvatarFallback className="gradient-bg text-primary-foreground text-xs font-bold">{initials}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-semibold text-foreground">{profile.brandName}</span>
                      </button>
                    </SheetTrigger>
                    <SheetContent className="w-full overflow-y-auto border-border/50 bg-background/95 backdrop-blur-xl">
                      <SheetHeader>
                        <SheetTitle>{profile.brandName}</SheetTitle>
                      </SheetHeader>
                      <p className="text-sm text-muted-foreground mt-4">Open on desktop for the full profile view.</p>
                    </SheetContent>
                  </Sheet>
                ) : (
                  <>
                    <Button variant="ghost" size="sm" className="flex-1" asChild><Link to="/login">Login</Link></Button>
                    <Button size="sm" className="flex-1 gradient-bg text-primary-foreground border-0" asChild><Link to="/signup">Sign Up</Link></Button>
                  </>

                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;
