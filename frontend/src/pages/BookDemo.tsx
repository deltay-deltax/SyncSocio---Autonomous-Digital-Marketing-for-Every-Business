import React, { useState, useEffect } from 'react';
import { useForm, ValidationError } from '@formspree/react';
import { ArrowRight, Bot, CheckCircle2, Clock, CalendarDays, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const industries = [
  'Baby & Kids', 'Food & Beverage', 'Home & Living', 'Education & Training',
  'Real Estate & Property', 'Travel & Hospitality', 'Mobile Apps', 'IT & Technical Tools',
  'Gaming & Entertainment', 'Fashion & Apparel', 'Jewellery', 'Beauty & Personal Care',
  'Health & Wellness', 'Coaching & Consulting', 'Architecture', 'Financial Services',
  'Newsletters', 'Online Marketplaces', 'Digital Products', 'E-Commerce',
  'Services', 'SaaS & Digital', 'Other'
];

export default function BookDemo() {
  const [state, handleSubmit] = useForm('mvkpbord');
  
  // Set canonical tag or basic SEO
  useEffect(() => {
    document.title = "Book a Demo | SyncSocio";
  }, []);

  if (state.succeeded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-[120px]" />
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="max-w-md w-full relative z-10"
        >
          <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-xl text-center">
            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Meeting Requested!</h2>
            <p className="text-slate-600 mb-8 leading-relaxed">
              Thanks for reaching out! Our team has received your demo request and will be in touch shortly via email or phone to lock in your calendar invite.
            </p>
            <a 
              href="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
            >
              Back to Home
            </a>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 relative overflow-hidden flex flex-col md:flex-row">
      {/* Background blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-600/10 rounded-full blur-[120px]" />
      </div>

      {/* Left side: Value Prop */}
      <div className="w-full md:w-5/12 lg:w-1/2 p-8 md:p-16 flex flex-col justify-center relative z-10 border-b md:border-b-0 md:border-r border-slate-200 bg-white/40 backdrop-blur-sm">
        <div className="max-w-xl mx-auto md:mx-0">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-sm font-semibold mb-6 shadow-sm">
            <Sparkles className="w-4 h-4" />
            <span>SyncSocio AI Demo</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight">
            Put your growth on <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">autopilot.</span>
          </h1>
          
          <p className="text-lg text-slate-600 mb-10 leading-relaxed">
            See how SyncSocio uses AI to generate content, launch ads, and automatically close sales in your DMs. Book a personalized walkthrough with our product experts.
          </p>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center shrink-0">
                <Bot className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-slate-900 font-bold mb-1">Meet Nexa AI</h3>
                <p className="text-slate-600 text-sm">See our AI sales agent seamlessly handle complex objections and book meetings automatically.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center shrink-0">
                <CalendarDays className="w-6 h-6 text-cyan-500" />
              </div>
              <div>
                <h3 className="text-slate-900 font-bold mb-1">Tailored Strategy</h3>
                <p className="text-slate-600 text-sm">We'll show you exactly how to structure your content mix and ad campaigns for your specific niche.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Form */}
      <div className="w-full md:w-7/12 lg:w-1/2 p-8 md:p-16 flex items-center justify-center relative z-10">
        <div className="max-w-lg w-full bg-white border border-slate-200 p-8 rounded-3xl shadow-xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Request a Demo</h2>
          <p className="text-slate-500 mb-8 text-sm">Fill out the details below and we'll get you scheduled.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-bold text-slate-700">Full Name</label>
                <input
                  id="name"
                  type="text" 
                  name="name"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                  placeholder="John Doe"
                />
                <ValidationError prefix="Name" field="name" errors={state.errors} className="text-red-500 text-xs mt-1" />
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-bold text-slate-700">Work Email</label>
                <input
                  id="email"
                  type="email" 
                  name="email"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                  placeholder="john@company.com"
                />
                <ValidationError prefix="Email" field="email" errors={state.errors} className="text-red-500 text-xs mt-1" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-bold text-slate-700">Phone Number</label>
                <input
                  id="phone"
                  type="tel" 
                  name="phone"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                  placeholder="+1 (555) 000-0000"
                />
                <ValidationError prefix="Phone" field="phone" errors={state.errors} className="text-red-500 text-xs mt-1" />
              </div>

              <div className="space-y-2">
                <label htmlFor="industry" className="text-sm font-bold text-slate-700">Industry</label>
                <select
                  id="industry"
                  name="industry"
                  required
                  defaultValue=""
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                >
                  <option value="" disabled>Select industry</option>
                  {industries.map(ind => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
                <ValidationError prefix="Industry" field="industry" errors={state.errors} className="text-red-500 text-xs mt-1" />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="company" className="text-sm font-bold text-slate-700">Company / Brand Name</label>
              <input
                id="company"
                type="text" 
                name="company"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                placeholder="Your awesome brand"
              />
              <ValidationError prefix="Company" field="company" errors={state.errors} className="text-red-500 text-xs mt-1" />
            </div>

            <div className="space-y-2">
              <label htmlFor="message" className="text-sm font-bold text-slate-700">Preferred Time / Anything else?</label>
              <textarea
                id="message"
                name="message"
                rows={3}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all resize-none"
                placeholder="I'd love to chat next Tuesday around 11am EST. We are particularly interested in..."
              />
              <ValidationError prefix="Message" field="message" errors={state.errors} className="text-red-500 text-xs mt-1" />
            </div>

            <button
              type="submit"
              disabled={state.submitting}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {state.submitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Request Demo</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
            <div className="flex items-center justify-center gap-1.5 mt-4 text-slate-500 text-xs font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>Typically responds within 2 hours</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
