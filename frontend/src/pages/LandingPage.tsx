import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import WhatWeAre from "@/components/WhatWeAre";
import Features from "@/components/Features";
import CreativeShowcase from "@/components/CreativeShowcase";
import HowItWorks from "@/components/HowItWorks";
import DMAutomation from "@/components/DMAutomation";
import CampaignChannels from "@/components/CampaignChannels";
import Pricing from "@/components/Pricing";
import FAQ from "@/components/FAQ";
import Footer from "@/components/Footer";
import FreeCreativesSection from "@/components/FreeCreativesSection";
import DomeGallery from "@/components/ui/DomeGallery";
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

          if (profile.selectedPlan && profile.selectedPlan !== 'Free') {
            localStorage.setItem("syncsocio_setup_done", "true");
            navigate("/dashboard");
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
    <div className="min-h-screen relative">
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

      {/* 2. Trust / social proof numbers */}
      <WhatWeAre />

      {/* 3. Visual proof — show what the AI actually makes */}
      <CreativeShowcase />

      {/* 4. Dome gallery — more visual proof */}
      <section className="relative w-full h-[600px] bg-background overflow-hidden border-y border-border/40">
        <DomeGallery grayscale={false} overlayBlurColor="transparent" images={domeImages} />
      </section>

      {/* 5. Lead magnet CTA — strike while visual excitement is high */}
      <FreeCreativesSection />

      {/* 6. Feature detail */}
      <Features />
      <HowItWorks />
      <DMAutomation />
      <CampaignChannels />

      {/* 7. Pricing + FAQ */}
      <Pricing onWaitlistClick={() => navigate("/signup")} />
      <FAQ />
      <Footer />
    </div>
  );
};

export default Index;
