import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const CANONICAL_BASE = 'https://syncsocio.com';

/**
 * useCanonical
 *
 * Dynamically updates the <link rel="canonical"> tag in the document <head>
 * to reflect the current route. This ensures Google always sees the correct
 * HTTPS canonical URL for each page, even in a client-side SPA.
 *
 * Usage: call this hook once at the top of App.tsx (inside BrowserRouter context)
 * and it will automatically update on every route change.
 *
 * @param override - Optional static URL to use instead of the current pathname.
 */
export function useCanonical(override?: string) {
  const location = useLocation();

  useEffect(() => {
    const canonicalUrl = override
      ? override
      : `${CANONICAL_BASE}${location.pathname}`;

    // Find existing canonical tag, or create one
    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }

    link.href = canonicalUrl;
  }, [location.pathname, override]);
}
