import { cn } from "@/lib/utils"
import { Marquee } from "@/registry/magicui/marquee"

export function MarqueeDemo({ images }: { images?: { src: string, alt: string }[] }) {
  if (!images || images.length === 0) return null;

  const itemsPerRow = Math.ceil(images.length / 3);
  const firstRow = images.slice(0, itemsPerRow);
  const secondRow = images.slice(itemsPerRow, itemsPerRow * 2);
  const thirdRow = images.slice(itemsPerRow * 2);

  const ImageCard = ({ src, alt }: { src: string; alt: string }) => {
    return (
      <figure
        className={cn(
          "relative h-48 w-48 sm:h-64 sm:w-64 cursor-pointer overflow-hidden rounded-xl border p-2",
          // light styles
          "border-gray-950/[.1] bg-gray-950/[.01] hover:bg-gray-950/[.05]",
          // dark styles
          "dark:border-gray-50/[.1] dark:bg-gray-50/[.10] dark:hover:bg-gray-50/[.15]"
        )}
      >
        <img 
          src={src} 
          alt={alt} 
          className="w-full h-full object-cover rounded-lg shadow-sm"
        />
      </figure>
    )
  }

  return (
    <div className="relative flex w-full flex-col items-center justify-center overflow-hidden">
      <Marquee pauseOnHover className="[--duration:30s]">
        {firstRow.map((img, idx) => (
          <ImageCard key={`row1-${idx}`} src={img.src} alt={img.alt} />
        ))}
      </Marquee>
      {secondRow.length > 0 && (
        <Marquee reverse pauseOnHover className="[--duration:30s] mt-4">
          {secondRow.map((img, idx) => (
            <ImageCard key={`row2-${idx}`} src={img.src} alt={img.alt} />
          ))}
        </Marquee>
      )}
      {thirdRow.length > 0 && (
        <Marquee pauseOnHover className="[--duration:30s] mt-4">
          {thirdRow.map((img, idx) => (
            <ImageCard key={`row3-${idx}`} src={img.src} alt={img.alt} />
          ))}
        </Marquee>
      )}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-background"></div>
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-background"></div>
    </div>
  )
}
