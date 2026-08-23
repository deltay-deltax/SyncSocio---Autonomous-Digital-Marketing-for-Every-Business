import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });
};

export function safeSetItem(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch (e: any) {
    console.warn('[Storage] LocalStorage setItem failed:', e);
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      try {
        // Clear all public asset and strategy caches first to free up space
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.startsWith('syncsocio_public_asset_') || k.startsWith('syncsocio_strategy_assets_') || k.startsWith('syncsocio_strategy_assets'))) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
        localStorage.setItem(key, value);
      } catch (retryErr) {
        console.error('[Storage] LocalStorage quota still exceeded after cleanup');
      }
    }
  }
}

export const formatBrandDesignSystemToMarkdown = (sys: any) => {
  if (!sys) return '';
  if (typeof sys === 'string') {
    if (!sys.trim().startsWith('{')) return sys;
    try {
      sys = JSON.parse(sys);
    } catch(e) {
      return sys;
    }
  }

  let md = '';

  if (sys.identity) {
    md += `## BRAND IDENTITY\n\n`;
    md += `Core aesthetic: ${sys.identity.coreAesthetic || ''}\n\n`;
    md += `Brand tension: ${sys.identity.brandTension || ''}\n\n`;
    md += `Personality: ${(sys.identity.personality || []).join(', ')}\n\n`;
    md += `Creative principle: ${sys.identity.creativePrinciple || ''}\n\n`;
  }

  if (sys.typography && sys.typography.length) {
    md += `## TYPOGRAPHY\n\n`;
    sys.typography.forEach((t: any) => {
      md += `**${t.role} — ${t.family}**\n`;
      md += `- Weights: ${(t.weights || []).join(', ')}\n`;
      md += `- Usage: ${t.usage}\n`;
      md += `- Tracking and case: ${t.trackingAndCase}\n`;
      md += `- Fallback: ${t.fallback}\n\n`;
    });
  }

  if (sys.colors && sys.colors.length) {
    md += `## COLOR PALETTE\n\n`;
    sys.colors.forEach((c: any) => {
      md += `**${c.name} (${c.hex})**\n`;
      md += `- Role: ${c.role}\n`;
      md += `- Usage: ${c.usage}\n\n`;
    });
  }

  if (sys.ctaStyles && sys.ctaStyles.length) {
    md += `## BUTTONS & CTAS\n\n`;
    sys.ctaStyles.forEach((c: any) => {
      md += `**${c.name}**\n`;
      md += `- Shape: ${c.shape} (Radius: ${c.radius})\n`;
      md += `- Colors: Fill ${c.fill}, Text ${c.textColor}\n`;
      md += `- Usage: ${c.usage}\n\n`;
    });
  }

  if (sys.motifs && sys.motifs.length) {
    md += `## MOTIFS & PATTERNS\n\n`;
    sys.motifs.forEach((m: any) => {
      md += `**${m.name}**\n`;
      md += `- Description: ${m.description}\n`;
      md += `- Usage: ${m.usage}\n\n`;
    });
  }

  if (sys.iconAndBadgeStyle) {
    md += `## ICONS & BADGES\n\n${sys.iconAndBadgeStyle}\n\n`;
  }

  if (sys.borderAndSurfaceStyle) {
    md += `## BORDERS & SURFACES\n\n${sys.borderAndSurfaceStyle}\n\n`;
  }

  return md.trim();
};
