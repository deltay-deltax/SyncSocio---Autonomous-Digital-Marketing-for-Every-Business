/**
 * Media Cache Utility
 * 
 * Stores File objects in a module-level Map to persist uploaded media
 * across SPA navigation (e.g. going from Plan -> Home -> Plan) without
 * needing a full page reload or complex IndexedDB usage.
 */

interface CachedMedia {
  file: File;
  previewUrl: string;
}

const cache = new Map<string, CachedMedia>();

export const mediaCache = {
  set: (id: string, file: File, previewUrl: string) => {
    cache.set(id, { file, previewUrl });
  },
  get: (id: string) => cache.get(id),
  remove: (id: string) => {
    const item = cache.get(id);
    if (item?.previewUrl) {
      URL.revokeObjectURL(item.previewUrl);
    }
    cache.delete(id);
  },
  clear: () => {
    cache.forEach(item => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
    cache.clear();
  },
  getAll: () => Array.from(cache.entries())
};
