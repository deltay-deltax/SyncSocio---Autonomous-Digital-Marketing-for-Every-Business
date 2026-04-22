/**
 * Media Cache Utility
 * 
 * Stores File objects in a module-level Map to persist uploaded media
 * across SPA navigation (e.g. going from Plan -> Home -> Plan) without
 * needing a full page reload or complex IndexedDB usage.
 */

interface CachedMedia {
  files: File[];
  previewUrls: string[];
}

const cache = new Map<string, CachedMedia>();

export const mediaCache = {
  set: (id: string, files: File[], previewUrls: string[]) => {
    cache.set(id, { files, previewUrls });
  },
  get: (id: string) => cache.get(id),
  remove: (id: string) => {
    const item = cache.get(id);
    if (item?.previewUrls) {
      item.previewUrls.forEach(url => URL.revokeObjectURL(url));
    }
    cache.delete(id);
  },
  clear: () => {
    cache.forEach(item => {
      item.previewUrls?.forEach(url => URL.revokeObjectURL(url));
    });
    cache.clear();
  },
  getAll: () => Array.from(cache.entries())
};
