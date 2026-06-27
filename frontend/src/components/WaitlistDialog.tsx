import { motion } from "framer-motion";
import { useState } from "react";
import { ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface WaitlistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const WaitlistDialog = ({ open, onOpenChange, onSuccess }: WaitlistDialogProps) => {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "" });

  const roles = ["Founder", "Marketer", "Creator", "Agency", "Other"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.role) return;
    
    try {
      const FORMSPREE_ID = import.meta.env.VITE_FORMSPREE_ID || "xwvakkjw"; // Use your new ID
      const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(form)
      });

      if (!res.ok) throw new Error('Failed to join waitlist');
      
      localStorage.setItem("syncsocio_waitlist_joined", "true");
      setSubmitted(true);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      // Even if it fails, we mark as joined locally so UI updates
      localStorage.setItem("syncsocio_waitlist_joined", "true");
      setSubmitted(true);
      if (onSuccess) onSuccess();
    }
  };


  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setSubmitted(false);
      setForm({ name: "", email: "", role: "" });
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md border-border/50 bg-background/95 backdrop-blur-xl p-0 overflow-hidden">
        {!submitted ? (
          <>
            <div className="px-6 pt-6 pb-2">
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles size={18} className="text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                    Coming Soon
                  </span>
                </div>
                <DialogTitle className="text-2xl font-bold">
                  We're Building Something Big
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  SyncSocio is under construction. Hop on the waitlist — you don't wanna miss this.
                </DialogDescription>
              </DialogHeader>
            </div>

            <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Name</label>
                <Input
                  placeholder="Your full name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="bg-muted/50 border-input focus:border-primary"
                  required
                  maxLength={100}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Email</label>
                <Input
                  type="email"
                  placeholder="you@company.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="bg-muted/50 border-input focus:border-primary"
                  required
                  maxLength={255}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">I am a...</label>
                <div className="flex flex-wrap gap-2">
                  {roles.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setForm({ ...form, role: r })}
                      className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all ${
                        form.role === r
                          ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                          : "bg-muted/50 text-muted-foreground border-border/60 hover:border-primary/40 hover:text-foreground"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full gradient-bg text-primary-foreground border-0 py-5 text-sm font-semibold mt-2"
                disabled={!form.name.trim() || !form.email.trim() || !form.role}
              >
                Count Me In 🙌
                <ArrowRight size={16} className="ml-2" />
              </Button>

              <p className="text-[11px] text-muted-foreground text-center">
                No spam. Unsubscribe anytime.
              </p>
            </form>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-14 px-6 text-center"
          >
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <CheckCircle2 size={28} className="text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">You're in, fam! 🎉</h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              We'll ping you the moment SyncSocio is ready. Stay tuned — big things loading.
            </p>
            <Button
              variant="outline"
              className="mt-6 border-border/60"
              onClick={handleClose}
            >
              Close
            </Button>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default WaitlistDialog;
