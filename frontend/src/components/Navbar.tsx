import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, User, Globe, Target, Palette, BarChart3, MapPin, Megaphone, Users, Layers, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("token"));

    const handler = () => setIsLoggedIn(!!localStorage.getItem("token"));
    window.addEventListener("storage", handler);
    window.addEventListener("focus", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("focus", handler);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("syncsocio_profile");
    localStorage.removeItem("syncsocio_setup_done");
    window.location.href = "/login";
  };

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 glass-card"
    >
      <div className="container mx-auto flex items-center justify-between px-6 py-4">
        <Link to="/" className="font-display text-xl font-bold tracking-tight">
          <span className="gradient-text">SyncSocio</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <a key={link.label} href={link.href} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {isLoggedIn ? (
            <div className="flex items-center gap-4">
              <Link to="/dashboard">
                <button className="relative group">
                  <Avatar className="h-9 w-9 ring-2 ring-primary/30 ring-offset-2 ring-offset-background cursor-pointer transition-all hover:ring-primary/60">
                    <AvatarFallback className="gradient-bg text-primary-foreground text-xs font-bold">
                      <User size={16} />
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background" />
                </button>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-xs text-muted-foreground hover:text-destructive">
                Logout
              </Button>
            </div>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Login</Link>
              </Button>
              <Button size="sm" className="gradient-bg text-primary-foreground border-0" asChild>
                <Link to="/signup">Sign Up</Link>
              </Button>
            </>
          )}
        </div>

        <button className="md:hidden text-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden border-t border-border bg-card"
          >
            <div className="flex flex-col gap-4 px-6 py-6">
              {NAV_LINKS.map((link) => (
                <a key={link.label} href={link.href} className="text-sm font-medium text-muted-foreground" onClick={() => setMobileOpen(false)}>
                  {link.label}
                </a>
              ))}
              <div className="flex gap-3 pt-2">
                {isLoggedIn ? (
                  <div className="flex flex-col w-full gap-3">
                    <Button variant="outline" className="w-full" asChild onClick={() => setMobileOpen(false)}>
                      <Link to="/dashboard">Dashboard</Link>
                    </Button>
                    <Button variant="ghost" className="w-full text-destructive" onClick={handleLogout}>
                      Logout
                    </Button>
                  </div>
                ) : (
                  <>
                    <Button variant="ghost" size="sm" className="flex-1" asChild><Link to="/login">Login</Link></Button>
                    <Button size="sm" className="flex-1 gradient-bg text-primary-foreground border-0" asChild><Link to="/signup">Sign Up</Link></Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;