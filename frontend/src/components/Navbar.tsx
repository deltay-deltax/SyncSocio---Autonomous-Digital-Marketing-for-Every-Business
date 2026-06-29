import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const NAV_LINKS = [
  { label: "Home", href: "#" },
  { label: "Features", href: "#features" },
  { label: "Creatives", href: "#creatives" },
  { label: "How it Works", href: "#how-it-works" },
  { label: "Auto DM", href: "#auto-dm" },
  { label: "Channels", href: "#channels" },
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

  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileOpen(false);
    if (href === "#") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4"
    >
      <div className="w-full max-w-5xl bg-white/95 backdrop-blur-md border border-white/60 rounded-full px-6 py-2.5 flex items-center justify-between shadow-lg relative">
        
        {/* Brand Logo & Name */}
        <Link to="/" className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight text-foreground">
          <img
            src="/SyncSocioLogo.png"
            alt="SyncSocio Logo"
            className="w-6 h-6 object-contain shrink-0"
          />
          <span>SyncSocio</span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={(e) => handleScroll(e, link.href)}
              className="text-xs lg:text-sm font-semibold text-gray-600 hover:text-black transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Action Buttons */}
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
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-xs text-gray-500 hover:text-destructive font-semibold hover:bg-transparent"
              >
                Logout
              </Button>
            </div>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild className="font-semibold text-gray-500 hover:text-black hover:bg-transparent">
                <Link to="/login">Login</Link>
              </Button>
              <Link
                to="/signup"
                className="rounded-full px-5 py-2 bg-[#0046C7] hover:bg-[#003B9E] text-white text-xs font-bold transition-all shadow-sm"
              >
                Signup
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden text-gray-800 p-1 rounded-full hover:bg-gray-100 transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Floating Mobile Dropdown Menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 right-0 mt-3 md:hidden overflow-hidden border border-gray-200 bg-white/95 backdrop-blur-md rounded-3xl p-5 shadow-xl flex flex-col gap-4 z-50"
            >
              <div className="flex flex-col gap-3">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={(e) => handleScroll(e, link.href)}
                    className="text-sm font-semibold text-gray-600 hover:text-black py-2 px-3 rounded-xl hover:bg-gray-50 transition-all"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
              <div className="border-t border-gray-100 pt-3 flex flex-col gap-2">
                {isLoggedIn ? (
                  <>
                    <Button variant="outline" className="w-full rounded-full border-gray-200 text-gray-700" asChild onClick={() => setMobileOpen(false)}>
                      <Link to="/dashboard">Dashboard</Link>
                    </Button>
                    <Button variant="ghost" className="w-full rounded-full text-destructive hover:bg-transparent" onClick={handleLogout}>
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" className="w-full rounded-full font-semibold text-gray-600 hover:text-black hover:bg-transparent" asChild onClick={() => setMobileOpen(false)}>
                      <Link to="/login">Login</Link>
                    </Button>
                    <Link
                      to="/signup"
                      onClick={() => setMobileOpen(false)}
                      className="w-full text-center rounded-full py-2.5 bg-[#0046C7] hover:bg-[#003B9E] text-white text-xs font-bold transition-all shadow-sm"
                    >
                      Signup
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
};

export default Navbar;