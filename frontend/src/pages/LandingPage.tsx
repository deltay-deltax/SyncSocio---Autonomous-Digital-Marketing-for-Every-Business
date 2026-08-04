import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";

import Features from "@/components/Features";
import CreativeShowcase from "@/components/CreativeShowcase";
import HowItWorks from "@/components/HowItWorks";
import DMAutomation from "@/components/DMAutomation";
import CampaignChannels from "@/components/CampaignChannels";
import Pricing from "@/components/Pricing";
import FAQ from "@/components/FAQ";
import Footer from "@/components/Footer";
import FreeCreativesSection from "@/components/FreeCreativesSection";
import { MarqueeDemo } from "@/components/ReviewMarquee";
import TestimonialsSection from "@/components/TestimonialsSection";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [domeImages, setDomeImages] = useState<{ src: string, alt: string }[] | undefined>(undefined);

  useEffect(() => {
    const checkUserStatus = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      setIsCheckingStatus(true);
      try {
        const PROFILE_URL = import.meta.env.VITE_API_URL || "http://localhost:5050/api";
        const profRes = await fetch(`${PROFILE_URL}/profile/me`, {
          headers: { "Authorization": `Bearer ${token}` }
        });

        if (profRes.ok) {
          const profile = await profRes.json();
          localStorage.setItem("syncsocio_profile", JSON.stringify(profile));

          if (profile.userPlan && profile.userPlan !== 'Free') {
            localStorage.setItem("syncsocio_setup_done", "true");
            navigate("/dashboard");
          } else if (profile.brandName && profile.brandName.trim() !== '') {
            localStorage.setItem("syncsocio_setup_done", "false");
            navigate("/setup?step=plan");
          } else {
            localStorage.setItem("syncsocio_setup_done", "false");
            navigate("/setup");
          }
        } else {
          // No profile yet, likely needs onboarding
          navigate("/onboarding");
        }
      } catch (err) {
        console.error("Redirection check failed:", err);
        // Fallback or stay on landing
      } finally {
        setIsCheckingStatus(false);
      }
    };

    const fetchSiteSettings = async () => {
      try {
        const SITE_URL = import.meta.env.VITE_API_URL || "http://localhost:5050/api";
        const res = await fetch(`${SITE_URL}/site/settings`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.settings?.domeGalleryImages?.length > 0) {
            const mappedImages = data.settings.domeGalleryImages
              .filter((url: string) => url.trim() !== '')
              .map((url: string) => ({ src: url, alt: 'Creative' }));

            if (mappedImages.length > 0) {
              setDomeImages(mappedImages);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch site settings:", err);
      }
    };

    checkUserStatus();
    fetchSiteSettings();
  }, [navigate]);

  return (
    <div className="min-h-screen relative" style={{ background: "var(--gradient-hero)" }}>
      {isCheckingStatus && (
        <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-md flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-xs font-black text-muted-foreground uppercase tracking-widest animate-pulse">Synchronizing Agent Status...</p>
          </div>
        </div>
      )}
      <Navbar />

      {/* 1. Hero — clear value prop + CTA */}
      <HeroSection onWaitlistClick={() => document.getElementById("free-creatives")?.scrollIntoView({ behavior: "smooth" })} />



      {/* 3. Marquee gallery — more visual proof */}
      <section className="relative w-full overflow-hidden border-y border-border/40 py-10">
        <MarqueeDemo images={domeImages} />
      </section>

      {/* 4. Four steps friction */}
      <HowItWorks />

      {/* 5. Visual proof — show what the AI actually makes */}
      <CreativeShowcase />

      {/* 7. Feature detail */}
      <Features />
      <DMAutomation />
      <CampaignChannels />

      {/* 7. Testimonials */}
      {/* <TestimonialsSection /> */}

      {/* 8. Pricing + FAQ */}
      <Pricing onWaitlistClick={() => navigate("/signup")} />
      <FAQ />
      
      {/* 9. Lead magnet CTA at the end */}
      <FreeCreativesSection />
      
      <Footer />
    </div>
  );
};

export default Index;
