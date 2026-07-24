import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import React, { useEffect, useState } from "react";

export const Terminal = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "z-0 h-full w-full max-w-lg rounded-xl border border-border/40 bg-background/80 shadow-lg glass-card backdrop-blur-xl",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border/40 p-4">
        <div className="h-3 w-3 rounded-full bg-red-500" />
        <div className="h-3 w-3 rounded-full bg-yellow-500" />
        <div className="h-3 w-3 rounded-full bg-green-500" />
      </div>
      <div className="p-4 font-mono text-sm overflow-y-auto flex flex-col gap-2 min-h-[300px]">
        {children}
      </div>
    </div>
  );
};

export const AnimatedSpan = ({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (!show) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn("text-sm block", className)}
    >
      {children}
    </motion.div>
  );
};

export const TypingAnimation = ({
  children,
  delay = 0,
  className,
}: {
  children: string;
  delay?: number;
  className?: string;
}) => {
  const [text, setText] = useState("");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    let i = 0;
    const interval = setInterval(() => {
      setText(children.slice(0, i + 1));
      i++;
      if (i >= children.length) clearInterval(interval);
    }, 40);
    return () => clearInterval(interval);
  }, [children, started]);

  if (!started && text === "") return null;

  return (
    <div className={cn("text-sm block", className)}>
      {text}
      {started && text.length < children.length && (
        <span className="animate-pulse inline-block w-1.5 h-4 ml-1 bg-current align-middle"></span>
      )}
    </div>
  );
};
