import { useState } from "react";
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

  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection onWaitlistClick={() => setIsWaitlistOpen(true)} />
      <WhatWeAre />
      <Features />
      <HowItWorks />
      <Pricing />
      <CTASection onWaitlistClick={() => setIsWaitlistOpen(true)} />
      <Footer />
      
      <WaitlistDialog 
        open={isWaitlistOpen} 
        onOpenChange={setIsWaitlistOpen} 
      />
    </div>
  );
};

export default Index;
