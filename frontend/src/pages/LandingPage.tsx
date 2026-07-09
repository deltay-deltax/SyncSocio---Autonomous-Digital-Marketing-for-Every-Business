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
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import WaitlistDialog from "@/components/WaitlistDialog";
import DomeGallery from "@/components/ui/DomeGallery";
import LaunchCurtain from "@/components/ui/LaunchCurtain";

import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
  const [isWaitlistJoined, setIsWaitlistJoined] = useState(false);
  const [domeImages, setDomeImages] = useState<{src: string, alt: string}[] | undefined>(undefined);

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

    const joined = localStorage.getItem("syncsocio_waitlist_joined") === "true";
    setIsWaitlistJoined(joined);
  }, [navigate]);

  const handleWaitlistSuccess = () => {
    setIsWaitlistJoined(true);
  };

  return (
    <div className="min-h-screen relative">
      <LaunchCurtain />
      {isCheckingStatus && (
        <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-md flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-xs font-black text-muted-foreground uppercase tracking-widest animate-pulse">Synchronizing Agent Status...</p>
          </div>
        </div>
      )}
      <div className="bg-primary/90 px-4 py-2 text-center text-xs sm:text-sm font-medium text-primary-foreground backdrop-blur-md relative z-50">
        🚀 We are launching soon! Stay tuned for early access.
      </div>
      <Navbar />
      <HeroSection 
        onWaitlistClick={() => setIsWaitlistOpen(true)} 
        isJoined={isWaitlistJoined}
      />
      


      <WhatWeAre />
      <Features />
      <CreativeShowcase />
      
      <section className="relative w-full h-[600px] bg-background overflow-hidden border-y border-border/40">
        <DomeGallery grayscale={false} overlayBlurColor="transparent" images={domeImages} />
      </section>
      <HowItWorks />
      <DMAutomation />
      <CampaignChannels />
      <Pricing onWaitlistClick={() => setIsWaitlistOpen(true)} />
      <FAQ />
      <CTASection 
        onWaitlistClick={() => setIsWaitlistOpen(true)} 
        isJoined={isWaitlistJoined}
      />
      <Footer />
      
      <WaitlistDialog 
        open={isWaitlistOpen} 
        onOpenChange={setIsWaitlistOpen} 
        onSuccess={handleWaitlistSuccess}
      />
    </div>
  );
};

export default Index;
