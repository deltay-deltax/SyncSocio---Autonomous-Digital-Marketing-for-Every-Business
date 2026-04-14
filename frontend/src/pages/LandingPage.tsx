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

import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
  const [isWaitlistJoined, setIsWaitlistJoined] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/dashboard");
    }

    const joined = localStorage.getItem("velocity_waitlist_joined") === "true";
    setIsWaitlistJoined(joined);
  }, [navigate]);

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
