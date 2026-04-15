import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useNavigate, useParams } from "react-router-dom";
import { checkPasswordStrength } from "./Signup";

const ResetPassword = () => {
  const { resetToken } = useParams();
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const strength = checkPasswordStrength(password);

  const handleReset = async (e: React.FormEvent) => {
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
    setLoading(true);
    
    try {
      const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5050/api";
      const res = await fetch(`${BASE_URL}/auth/resetpassword/${resetToken}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Invalid or expired token");
      
      setSuccess("Password updated securely!");
      localStorage.setItem("token", data.token);
      setTimeout(() => navigate("/onboarding"), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--gradient-hero)" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-card/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/10 p-8"
      >
        <h1 className="text-3xl font-bold mb-2">Create New Password</h1>
        <p className="text-muted-foreground mb-8">
          Ensure your account stays secure by creating a strong new password below.
        </p>

        {error && (
          <div className="p-3 mb-6 text-sm text-red-500 bg-red-100/10 border border-red-500/20 rounded-md flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}
        
        {success && (
          <div className="p-3 mb-6 text-sm text-green-500 bg-green-100/10 border border-green-500/20 rounded-md flex items-center gap-2">
             <CheckCircle2 size={16} /> {success}
          </div>
        )}

        <form className="space-y-6" onSubmit={handleReset}>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">New Password</label>
            <div className="relative">
              <Input type={showPassword ? "text" : "password"} placeholder="Min 8 characters" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 bg-background border-border focus:ring-2 focus:ring-primary/20 pr-10" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {password && (
              <div className="mt-2 space-y-1.5">
                <div className="flex gap-1 h-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className={`flex-1 rounded-full ${strength >= i ? (strength === 5 ? 'bg-green-500' : strength > 2 ? 'bg-yellow-500' : 'bg-red-500') : 'bg-border/50'}`} />
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
            <Input type="password" placeholder="Repeat new password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-12 bg-background border-border focus:ring-2 focus:ring-primary/20" />
          </div>

          <Button disabled={loading} size="lg" className="w-full h-12 gradient-bg text-primary-foreground border-0 text-base">
            {loading ? "Updating..." : "Reset Password"} <ArrowRight size={18} className="ml-2" />
          </Button>
        </form>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
