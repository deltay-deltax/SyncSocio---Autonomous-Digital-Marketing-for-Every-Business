import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// Removed "Home" (logo handles that) — 6 links feel airy in the pill
const NAV_LINKS = [
  { label: "How it Works", href: "#how-it-works" },
  { label: "Creatives", href: "#creatives" },
  { label: "Features", href: "#features" },
  { label: "Auto DM", href: "#auto-dm" },
  { label: "Channels", href: "#channels" },
  { label: "Pricing", href: "#pricing" },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("");

  /* ── Auth state ─────────────────────────────────────────────── */
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

  /* ── Scroll-shrink + active section tracker ─────────────────── */
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(`#${entry.target.id}`);
          }
        });
      },
      {
        rootMargin: "-20% 0px -70% 0px", // triggers when section is in top 20-30% of screen
        threshold: 0,
      }
    );

    NAV_LINKS.forEach((link) => {
      const el = document.querySelector(link.href);
      if (el) observer.observe(el);
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      observer.disconnect();
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("syncsocio_profile");
    localStorage.removeItem("syncsocio_setup_done");
    window.location.href = "/login";
  };

  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith("/")) {
      return;
    }
    e.preventDefault();
    setMobileOpen(false);
    setActiveSection(href);
    if (href === "#") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <motion.nav
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className={`fixed left-0 right-0 z-50 flex justify-center px-4 transition-all duration-300 ${scrolled ? "top-2" : "top-4"}`}
    >
      <div
        className={`
          w-full max-w-4xl flex items-center justify-between
          rounded-full border px-5 transition-all duration-300
          ${scrolled
            ? "py-2 bg-white/98 backdrop-blur-lg border-gray-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.10)]"
            : "py-3 bg-white/95 backdrop-blur-md border-white/60 shadow-lg"
          }
        `}
      >
        {/* ── Brand ─────────────────────────────────────────────── */}
        <Link
          to="/"
          className="flex items-center gap-2.5 shrink-0 group"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <img
            src="/SyncSocioLogo.png"
            alt="SyncSocio"
            className="w-7 h-7 object-contain shrink-0 transition-transform duration-200 group-hover:scale-110"
          />
          <span className="font-display text-[1.05rem] font-bold tracking-tight text-gray-900">
            SyncSocio
          </span>
        </Link>

        {/* ── Desktop links ─────────────────────────────────────── */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const isActive = activeSection === link.href;
            return (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => handleScroll(e, link.href)}
                className={`
                  relative px-3 py-1.5 rounded-full text-[0.78rem] font-semibold
                  transition-all duration-150
                  ${isActive
                    ? "text-[#0046C7] bg-blue-50"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-100/70"
                  }
                `}
              >
                {isActive && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-full bg-blue-50"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative z-10">{link.label}</span>
              </a>
            );
          })}
        </div>

        {/* ── Action buttons ────────────────────────────────────── */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          {isLoggedIn ? (
            <div className="flex items-center gap-3">
              <Link to="/dashboard">
                <button className="relative group">
                  <Avatar className="h-8 w-8 ring-2 ring-primary/30 ring-offset-2 ring-offset-background cursor-pointer transition-all hover:ring-primary/60">
                    <AvatarFallback className="gradient-bg text-primary-foreground text-xs font-bold">
                      <User size={14} />
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
                </button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-xs text-gray-400 hover:text-red-500 font-semibold hover:bg-transparent px-2"
              >
                Logout
              </Button>
            </div>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-[0.78rem] font-semibold text-gray-600 hover:text-gray-900 rounded-full px-4 hover:bg-gray-100/70"
                asChild
              >
                <Link to="/login">Login</Link>
              </Button>
              <Button
                className="rounded-full px-5 py-2 bg-primary text-primary-foreground text-[0.78rem] font-bold hover:opacity-90"
                asChild
              >
                <Link to="/signup">Sign up</Link>
              </Button>
            </>
          )}
        </div>

        {/* ── Mobile toggle ─────────────────────────────────────── */}
        <button
          className="md:hidden text-gray-700 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        {/* ── Mobile dropdown ───────────────────────────────────── */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 right-0 mt-3 md:hidden border border-gray-200/80 bg-white/97 backdrop-blur-lg rounded-2xl p-4 shadow-xl flex flex-col gap-3 z-50"
            >
              <div className="flex flex-col gap-1">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={(e) => handleScroll(e, link.href)}
                    className={`text-sm font-semibold py-2.5 px-3 rounded-xl transition-all
                      ${activeSection === link.href
                        ? "text-[#0046C7] bg-blue-50"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                      }`}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
              <div className="border-t border-gray-100 pt-3 flex flex-col gap-2">
                {isLoggedIn ? (
                  <>
                    <Button
                      variant="outline"
                      className="w-full rounded-full border-gray-200 text-gray-700 font-semibold"
                      asChild
                      onClick={() => setMobileOpen(false)}
                    >
                      <Link to="/dashboard">Dashboard</Link>
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full rounded-full text-red-500 hover:text-red-600 hover:bg-red-50 font-semibold"
                      onClick={handleLogout}
                    >
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      className="w-full rounded-full font-semibold text-gray-600 hover:bg-gray-50"
                      asChild
                      onClick={() => setMobileOpen(false)}
                    >
                      <Link to="/login">Login</Link>
                    </Button>
                    <Button
                      className="w-full rounded-full bg-primary text-primary-foreground font-bold hover:opacity-90"
                      asChild
                      onClick={() => setMobileOpen(false)}
                    >
                      <Link to="/signup">Sign up</Link>
                    </Button>
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