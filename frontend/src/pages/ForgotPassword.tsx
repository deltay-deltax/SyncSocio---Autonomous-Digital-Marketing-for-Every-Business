import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    
    try {
      const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5050/api";
      const res = await fetch(`${BASE_URL}/auth/forgotpassword`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      setSuccess("Reset link sent! Please check your inbox securely using the generated link.");
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
        <Link to="/login" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft size={16} className="mr-2" /> Back to login
        </Link>
        
        <h1 className="text-3xl font-bold mb-2">Reset Password</h1>
        <p className="text-muted-foreground mb-8">
          We'll securely process a token to help you regain access to your SyncSocio intelligence agents.
        </p>

        {error && (
          <div className="p-3 mb-6 text-sm text-red-500 bg-red-100/10 border border-red-500/20 rounded-md flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 shrink-0" /> <span className="break-all">{error}</span>
          </div>
        )}
        
        {success && (
          <div className="p-3 mb-6 text-sm text-green-500 bg-green-100/10 border border-green-500/20 rounded-md flex flex-col gap-2">
             <div className="flex items-center gap-2 font-medium"><CheckCircle2 size={16} /> {success}</div>
          </div>
        )}

        <form className="space-y-6" onSubmit={handleForgot}>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Email Address</label>
            <Input type="email" placeholder="you@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 bg-background border-border focus:ring-2 focus:ring-primary/20" />
          </div>
          <Button disabled={loading} size="lg" className="w-full h-12 gradient-bg text-primary-foreground border-0 text-base">
            {loading ? "Processing..." : "Send Reset Link"}
          </Button>
        </form>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
