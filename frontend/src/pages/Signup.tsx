import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, Sparkles, Users, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { GoogleLogin } from '@react-oauth/google';

import { getFriendlyErrorMessage } from '@/lib/errorHandler';

const PLAN_STORAGE_KEY = "syncsocio_selected_plan";

const socialStats = [
  { platform: "Facebook", icon: <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>, color: "bg-[#1877F2] text-white", status: "Connected", detail: "8.2K creatives synced" },
  { platform: "Instagram", icon: <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.332 3.608 1.308.975.975 1.245 2.242 1.308 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.332 2.633-1.308 3.608-.975.975-2.242 1.245-3.608 1.308-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.332-3.608-1.308-.975-.975-1.245-2.242-1.308-3.608-.058-1.266-.07-1.646-.07-4.85s.012-3.584.07-4.85c.062-1.366.332-2.633 1.308-3.608.975-.975-2.242-1.245 3.608-1.308 1.266-.058-1.646-.07 4.85-.07zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>, color: "bg-gradient-to-br from-pink-500 to-orange-400 text-white", status: "Connected", detail: "12.4K assets generated" },
];

export const checkPasswordStrength = (pw: string) => {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
};

const Signup = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("");
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  // Clear fields on mount to prevent stale state/autofill issues
  useEffect(() => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");

    const queryPlan = new URLSearchParams(window.location.search).get("plan")?.trim() || "";
    const storedPlan = localStorage.getItem(PLAN_STORAGE_KEY)?.trim() || "";
    const resolvedPlan = queryPlan || storedPlan;

    if (resolvedPlan) {
      localStorage.setItem(PLAN_STORAGE_KEY, resolvedPlan);
      setSelectedPlan(resolvedPlan);
    }

    const queryDm = new URLSearchParams(window.location.search).get("dm");
    if (queryDm !== null) {
      localStorage.setItem("syncsocio_dm_automation", queryDm);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setActiveIdx((p) => (p + 1) % 2), 2500);
    return () => clearInterval(interval);
  }, []);

  const strength = checkPasswordStrength(password);

  const handlePostAuthSuccess = async (token: string) => {
    localStorage.setItem("token", token);

    // --- META REVIEW BYPASS ---
    if (email.trim().toLowerCase() === 'supportvelocitydm@gmail.com') {
      window.location.href = "/setup";
      return;
    }
    // --- END BYPASS ---

    try {
      const PROFILE_URL = import.meta.env.VITE_API_URL || "http://localhost:5050/api";
      const profRes = await fetch(`${PROFILE_URL}/profile/me`, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (profRes.ok) {
        const profile = await profRes.json();
        if (profile.selectedPlan && profile.selectedPlan !== 'Free') {
          localStorage.setItem("syncsocio_setup_done", "true");
          window.location.href = "/dashboard";
        } else {
          localStorage.setItem("syncsocio_setup_done", "false");
          window.location.href = "/setup";
        }
      } else {
        window.location.href = "/onboarding";
      }
    } catch (err) {
      window.location.href = "/onboarding";
    }
  };
  
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (strength < 5) {
      setError("Please ensure your password meets all strong password requirements.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    setInfoMessage("");
    setLoading(true);
    try {
      const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5050/api";
      const res = await fetch(`${BASE_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${firstName} ${lastName}`.trim(),
          email,
          password
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Something went wrong.");

      if (data.requiresOtp) {
        setVerificationEmail(data.email || email.toLowerCase().trim());
        setIsOtpStep(true);
        setOtp("");
        setInfoMessage(data.message || "We sent a verification code to your email.");
        return;
      }

      if (data.token) {
        await handlePostAuthSuccess(data.token);
        return;
      }

      setInfoMessage(data.message || "Signup submitted. Please verify your email.");
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!verificationEmail) {
      setError("Please complete signup first.");
      return;
    }

    if (!/^\d{6}$/.test(otp.trim())) {
      setError("Please enter a valid 6-digit OTP.");
      return;
    }

    setError("");
    setInfoMessage("");
    setOtpLoading(true);

    try {
      const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5050/api";
      const res = await fetch(`${BASE_URL}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: verificationEmail,
          otp: otp.trim(),
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "OTP verification failed");
      }

      if (!data.token) {
        throw new Error("Verification succeeded but no token was returned.");
      }

      await handlePostAuthSuccess(data.token);
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!verificationEmail) {
      setError("Email not found for OTP resend.");
      return;
    }

    setError("");
    setInfoMessage("");
    setResendLoading(true);

    try {
      const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5050/api";
      const res = await fetch(`${BASE_URL}/auth/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verificationEmail })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Unable to resend OTP.");
      }

      setInfoMessage(data.message || "A new OTP has been sent to your email.");
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: "var(--gradient-hero)" }}>
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center relative overflow-hidden bg-muted/30">
        <div className="absolute top-32 left-20 w-56 h-56 rounded-full opacity-[0.08] blur-3xl bg-primary" />
        <div className="absolute bottom-20 right-16 w-72 h-72 rounded-full opacity-[0.06] blur-3xl bg-primary" />

        <div className="relative z-10 max-w-md px-12">
          <Link to="/" className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight mb-10">
            <img src="/SyncSocioLogo.png" alt="SyncSocio Logo" className="w-8 h-8 object-contain shrink-0" />
            <span className="text-foreground">SyncSocio</span>
          </Link>

          <h2 className="text-3xl font-extrabold leading-tight text-foreground mb-3">
            Start your brand's
            <br />
            intelligence era.
          </h2>
          <p className="text-muted-foreground text-base leading-relaxed mb-10">
            Join thousands of creators who automate their campaigns with AI-powered agents.
          </p>

          <div className="space-y-3 mb-8">
            {socialStats.map((s, i) => (
              <motion.div
                key={s.platform}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.12, duration: 0.4 }}
                className={`flex items-center gap-4 rounded-xl px-5 py-4 transition-all duration-500 ${i === activeIdx
                  ? "bg-card shadow-md border border-primary/15 scale-[1.02]"
                  : "bg-card/60 border border-border"
                  }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold text-primary-foreground ${s.color}`}>
                  {s.icon}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-foreground">{s.platform}</div>
                  <div className="text-xs text-muted-foreground">{s.detail}</div>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-black text-primary uppercase tracking-widest bg-primary/10 border border-primary/20 rounded-full px-3 py-1">
                  <Sparkles size={11} className="animate-pulse" />
                  {s.status}
                </div>
              </motion.div>
            ))}
          </div>

          <div className="bg-card rounded-xl p-5 border border-border shadow-sm mb-8">
            <p className="text-sm italic text-muted-foreground mb-3">"SyncSocio took our digital campaigns from days of manual work to seconds of generation."</p>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles size={13} className="text-primary" />
              </div>
              <div className="text-xs font-semibold text-foreground">Priya S. <span className="text-muted-foreground font-normal">· Founder, GlowCraft</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Link to="/" className="lg:hidden flex items-center gap-2 font-display text-2xl font-bold tracking-tight mb-8">
            <img src="/SyncSocioLogo.png" alt="SyncSocio Logo" className="w-8 h-8 object-contain shrink-0" />
            <span className="text-foreground">SyncSocio</span>
          </Link>

          <h1 className="text-3xl font-bold mb-2">{isOtpStep ? "Verify your email" : "Create account"}</h1>
          <p className="text-muted-foreground mb-8">
            {isOtpStep ? (
              <>
                Enter the 6-digit code sent to{" "}
                <span className="font-semibold text-foreground">{verificationEmail}</span>.
              </>
            ) : (
              <>
                Already have an account?{" "}
                <Link to="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
              </>
            )}
          </p>

          {error && (
            <div className="p-3 mb-4 text-sm text-red-500 bg-red-100/10 border border-red-500/20 rounded-md flex items-center gap-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {infoMessage && (
            <div className="p-3 mb-4 text-sm text-primary bg-primary/10 border border-primary/20 rounded-md">
              {infoMessage}
            </div>
          )}

          {isOtpStep ? (
            <form className="space-y-5" onSubmit={handleVerifyOtp}>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Verification code</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="Enter 6-digit OTP"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="h-12 bg-card border-border focus:ring-2 focus:ring-primary/20 text-center tracking-[0.45em] font-semibold"
                />
                <p className="text-xs text-muted-foreground mt-2">Code expires in 10 minutes.</p>
              </div>

              <Button disabled={otpLoading} size="lg" className="w-full h-12 gradient-bg text-primary-foreground border-0 text-base" type="submit">
                {otpLoading ? "Verifying..." : "Verify Email"} <ArrowRight size={18} className="ml-2" />
              </Button>

              <Button type="button" variant="outline" className="w-full h-12" disabled={resendLoading} onClick={handleResendOtp}>
                {resendLoading ? "Resending OTP..." : "Resend OTP"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setIsOtpStep(false);
                  setOtp("");
                  setInfoMessage("");
                }}
              >
                Edit signup details
              </Button>
            </form>
          ) : (
            <>
              <form className="space-y-5" onSubmit={handleSignup}>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">First name</label>
                    <Input type="text" placeholder="First Name" required value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="off" className="h-12 bg-card border-border focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Last name</label>
                    <Input type="text" placeholder="Last Name" required value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="off" className="h-12 bg-card border-border focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
                  <Input type="email" placeholder="you@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="new-password" className="h-12 bg-card border-border focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Password</label>
                  <div className="relative">
                    <Input type={showPassword ? "text" : "password"} placeholder="Min 8 characters" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" className="h-12 bg-card border-border focus:ring-2 focus:ring-primary/20 pr-10" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {/* Password Strength UI */}
                  {password && (
                    <div className="mt-2 space-y-1.5">
                      <div className="flex gap-1 h-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div key={i} className={`flex-1 rounded-full ${strength >= i ? (strength === 5 ? 'bg-green-500' : strength > 2 ? 'bg-yellow-500' : 'bg-red-500') : 'bg-border'}`} />
                        ))}
                      </div>
                      <p className={`text-xs ${strength === 5 ? 'text-green-500' : 'text-muted-foreground'}`}>
                        Strong passwords contain 8+ chars, upper & lowercase, numbers, and symbols.
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Confirm Password</label>
                  <div className="relative">
                    <Input type={showConfirmPassword ? "text" : "password"} placeholder="Confirm your password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" className="h-12 bg-card border-border focus:ring-2 focus:ring-primary/20 pr-10" />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <Button disabled={loading} size="lg" className="w-full h-12 gradient-bg text-primary-foreground border-0 text-base" type="submit">
                  {loading ? "Creating Account..." : "Create Account"} <ArrowRight size={18} className="ml-2" />
                </Button>
              </form>

              <p className="text-xs text-muted-foreground text-center mt-6">
                By signing up, you agree to our{" "}
                <Link to="/terms" className="text-primary hover:underline">Terms</Link> and{" "}
                <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
              </p>

              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center">
                  <span className="bg-background px-4 text-xs text-muted-foreground uppercase tracking-wider">or continue with</span>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center w-full">
                {import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
                  <div className="w-full flex justify-center">
                    <GoogleLogin
                      onSuccess={async (credentialResponse) => {
                        try {
                          const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5050/api";
                          const res = await fetch(`${BASE_URL}/auth/google`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              idToken: credentialResponse.credential,
                              isSignup: true
                            })
                          });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.message || "Google login failed");
                          
                          if (data.requiresPasswordSetup) {
                            // New user - redirect to password setup
                            localStorage.setItem("tempToken", data.tempToken);
                            window.location.href = "/set-password";
                          } else {
                            // Existing user
                            localStorage.setItem("token", data.token);
                            window.location.href = "/onboarding";
                          }
                        } catch (err: any) {
                          setError(getFriendlyErrorMessage(err));
                        }
                      }}
                      onError={() => setError("Google Login Configuration Missing.")}
                    />
                  </div>
                ) : (
                  <Button variant="outline" className="h-10 w-full" type="button" onClick={() => alert('Add VITE_GOOGLE_CLIENT_ID to .env.local to enable Google Login.')}>
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                    Continue with Google
                  </Button>
                )}
              </div>
            </>
          )}

        </motion.div>
      </div>
    </div>
  );
};

export default Signup;
