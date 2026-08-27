import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Marquee } from "@/registry/magicui/marquee"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"

const optimizeCloudinaryUrl = (url: string, width?: number) => {
  if (url && url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    if (!url.includes('/upload/q_auto')) {
      const transform = width ? `/upload/q_auto,f_auto,w_${width}/` : '/upload/q_auto,f_auto/';
      return url.replace('/upload/', transform);
    }
  }
  return url;
};

export function MarqueeDemo({ images }: { images?: { src: string, alt: string }[] }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedIndex === null) return;
      if (e.key === 'Escape') setSelectedIndex(null);
      if (e.key === 'ArrowLeft') {
        setSelectedIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
      }
      if (e.key === 'ArrowRight') {
        setSelectedIndex((prev) => (prev !== null && images && prev < images.length - 1 ? prev + 1 : prev));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, images]);

  if (!images || images.length === 0) return null;

  const itemsPerRow = Math.ceil(images.length / 3);
  const firstRow = images.slice(0, itemsPerRow);
  const secondRow = images.slice(itemsPerRow, itemsPerRow * 2);
  const thirdRow = images.slice(itemsPerRow * 2);

  const getGlobalIndex = (rowName: string, localIndex: number) => {
    if (rowName === 'row1') return localIndex;
    if (rowName === 'row2') return itemsPerRow + localIndex;
    if (rowName === 'row3') return itemsPerRow * 2 + localIndex;
    return 0;
  }

  const ImageCard = ({ src, alt, index }: { src: string; alt: string; index: number }) => {
    return (
      <figure
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedIndex(index); } }}
        onClick={() => setSelectedIndex(index)}
        className={cn(
          "relative h-48 w-48 sm:h-64 sm:w-64 cursor-pointer overflow-hidden rounded-xl",
          "transition-all hover:opacity-90 hover:scale-[1.02]"
        )}
      >
        <img 
          src={optimizeCloudinaryUrl(src, 400)} 
          alt={alt} 
          loading="lazy"
          className="w-full h-full object-cover bg-gray-100 dark:bg-gray-800"
        />
      </figure>
    )
  }

  return (
    <>
      <div className="relative flex w-full flex-col items-center justify-center overflow-hidden">
        <Marquee pauseOnHover className="[--duration:60s]">
          {firstRow.map((img, idx) => (
            <ImageCard key={`row1-${idx}`} src={img.src} alt={img.alt} index={getGlobalIndex('row1', idx)} />
          ))}
        </Marquee>
        {secondRow.length > 0 && (
          <Marquee reverse pauseOnHover className="[--duration:60s] mt-4">
            {secondRow.map((img, idx) => (
              <ImageCard key={`row2-${idx}`} src={img.src} alt={img.alt} index={getGlobalIndex('row2', idx)} />
            ))}
          </Marquee>
        )}
        {thirdRow.length > 0 && (
          <Marquee pauseOnHover className="[--duration:60s] mt-4">
            {thirdRow.map((img, idx) => (
              <ImageCard key={`row3-${idx}`} src={img.src} alt={img.alt} index={getGlobalIndex('row3', idx)} />
            ))}
          </Marquee>
        )}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-background"></div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-background"></div>
      </div>

      <AnimatePresence>
        {selectedIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedIndex(null)}
          >
            <button 
              className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-[110]"
              onClick={() => setSelectedIndex(null)}
            >
              <X size={24} />
            </button>

            <button 
              className={cn(
                "absolute left-4 md:left-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-[110]",
                selectedIndex === 0 && "opacity-50 cursor-not-allowed"
              )}
              onClick={(e) => {
                e.stopPropagation();
                if (selectedIndex > 0) setSelectedIndex(selectedIndex - 1);
              }}
            >
              <ChevronLeft size={32} />
            </button>

            <motion.img
              key={selectedIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              src={optimizeCloudinaryUrl(images[selectedIndex].src)}
              alt={images[selectedIndex].alt}
              className="max-h-[85vh] max-w-[85vw] object-contain rounded-lg shadow-2xl relative z-[105]"
              onClick={(e) => e.stopPropagation()}
            />

            <button 
              className={cn(
                "absolute right-4 md:right-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-[110]",
                selectedIndex === images.length - 1 && "opacity-50 cursor-not-allowed"
              )}
              onClick={(e) => {
                e.stopPropagation();
                if (selectedIndex < images.length - 1) setSelectedIndex(selectedIndex + 1);
              }}
            >
              <ChevronRight size={32} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
