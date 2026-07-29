import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackMetaEvent } from '@/utils/metaPixel';

export const MetaPixel = () => {
  const location = useLocation();

  useEffect(() => {
    const pixelId = import.meta.env.VITE_META_PIXEL_ID;
    
    if (!pixelId) {
      console.warn('[Meta Pixel] VITE_META_PIXEL_ID is not defined. Pixel will not be loaded.');
      return;
    }

    // Initialize Meta Pixel
    const initPixel = () => {
      // @ts-ignore
      !function(f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      // @ts-ignore
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      // @ts-ignore
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      // @ts-ignore
      n.queue=[];t=b.createElement(e);t.async=!0;
      // @ts-ignore
      t.src=v;s=b.getElementsByTagName(e)[0];
      // @ts-ignore
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');

      window.fbq('init', pixelId);
    };

    initPixel();
  }, []);

  // Track PageView on route change
  useEffect(() => {
    if (import.meta.env.VITE_META_PIXEL_ID) {
      // Small delay to ensure the pixel base code is initialized
      setTimeout(() => {
        trackMetaEvent('PageView');
        console.log("🔥 [TESTING] Firing Meta Pixel Event: PageView (Frontend)");
      }, 100);
    }
  }, [location.pathname]);

  return null;
};
