"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";

export function AnimatedThemeToggler() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none"
      aria-label="Toggle theme"
    >
      <div className="relative w-5 h-5 overflow-hidden flex items-center justify-center">
        <motion.div
          initial={false}
          animate={{
            y: theme === "dark" ? -30 : 0,
            opacity: theme === "dark" ? 0 : 1,
            rotate: theme === "dark" ? 90 : 0,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <Sun size={20} className="text-gray-600 dark:text-gray-400" />
        </motion.div>
        
        <motion.div
          initial={false}
          animate={{
            y: theme === "dark" ? 0 : 30,
            opacity: theme === "dark" ? 1 : 0,
            rotate: theme === "dark" ? 0 : -90,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <Moon size={18} className="text-gray-600 dark:text-gray-400" />
        </motion.div>
      </div>
    </button>
  );
}
