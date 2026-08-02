import { useState, useRef, useEffect } from 'react';
import { GripVertical } from 'lucide-react';

interface ImageCompareSliderProps {
  imageSrc: string;
  className?: string;
}

export const ImageCompareSlider = ({ imageSrc, className = '' }: ImageCompareSliderProps) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = Math.max(0, Math.min((x / rect.width) * 100, 100));
    setSliderPosition(percent);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) handleMove(e.clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging) handleMove(e.touches[0].clientX);
  };

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`relative w-full aspect-[4/3] rounded-xl overflow-hidden select-none cursor-ew-resize group bg-muted ${className}`}
      onMouseDown={(e) => { setIsDragging(true); handleMove(e.clientX); }}
      onMouseMove={handleMouseMove}
      onTouchStart={(e) => { setIsDragging(true); handleMove(e.touches[0].clientX); }}
      onTouchMove={handleTouchMove}
    >
      {/* HD Image (Background / Right Side) */}
      <div className="absolute inset-0">
        <img src={imageSrc} alt="HD Quality" className="w-full h-full object-cover pointer-events-none" draggable={false} />
        <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded">
          HD QUALITY
        </div>
      </div>

      {/* SD Image (Foreground / Left Side with clip-path) */}
      <div 
        className="absolute inset-0"
        style={{ clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` }}
      >
        <img 
          src={imageSrc} 
          alt="SD Quality" 
          className="w-full h-full object-cover pointer-events-none filter blur-[0.5px] contrast-75 brightness-110" 
          draggable={false} 
        />
        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded">
          SD QUALITY
        </div>
      </div>

      {/* Slider Handle */}
      <div 
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)] z-10"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white text-primary rounded-full flex items-center justify-center shadow-lg cursor-grab active:cursor-grabbing hover:scale-110 transition-transform">
          <GripVertical size={16} />
        </div>
      </div>
    </div>
  );
};
