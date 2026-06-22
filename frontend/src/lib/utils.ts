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
          if (k && (k.startsWith('velocity_public_asset_') || k.startsWith('velocity_strategy_assets_') || k.startsWith('velocity_strategy_assets'))) {
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

