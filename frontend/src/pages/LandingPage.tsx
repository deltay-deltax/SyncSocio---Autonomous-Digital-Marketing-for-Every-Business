import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import WhatWeAre from "@/components/WhatWeAre";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import Pricing from "@/components/Pricing";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import WaitlistDialog from "@/components/WaitlistDialog";

const Index = () => {
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
  const [isWaitlistJoined, setIsWaitlistJoined] = useState(false);

  useEffect(() => {
    const joined = localStorage.getItem("velocity_waitlist_joined") === "true";
    setIsWaitlistJoined(joined);
  }, []);

  const handleWaitlistSuccess = () => {
    setIsWaitlistJoined(true);
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection 
        onWaitlistClick={() => setIsWaitlistOpen(true)} 
        isJoined={isWaitlistJoined}
      />
      <WhatWeAre />
      <Features />
      <HowItWorks />
      <Pricing />
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
