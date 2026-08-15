import { useEffect } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

export const startOnboardingTour = (forceReplay = false) => {
  if (!forceReplay) {
    const hasSeenTour = localStorage.getItem('syncsocio_tour_completed');
    if (hasSeenTour) return;
  }

  const tourObj = driver({
    showProgress: true,
    animate: true,
    allowClose: true,
    doneBtnText: 'Finish',
    nextBtnText: 'Next →',
    prevBtnText: '← Prev',
    onDestroyStarted: () => {
      localStorage.setItem('syncsocio_tour_completed', 'true');
      tourObj.destroy();
    },
    steps: [
      {
        popover: {
          title: 'Welcome to SyncSocio! 🚀',
          description: 'Let\'s take a quick tour of your new command center to show you how to automate your marketing and sales.',
          align: 'center',
        }
      },
      {
        element: '#tour-nav-settings',
        popover: {
          title: '1. Connect & Configure',
          description: 'First, configure your Brand Profile and connect your Instagram/WhatsApp here so our AI learns your brand tone.',
          side: 'right',
          align: 'start',
        }
      },
      {
        element: '#tour-nav-products',
        popover: {
          title: '2. Add Your Products',
          description: 'Add your products or services here. Our AI will automatically generate beautiful listings and posts for them.',
          side: 'right',
          align: 'start',
        }
      },
      {
        element: '#tour-nav-feed',
        popover: {
          title: '3. Content Calendar Feed',
          description: 'View and manage your upcoming content calendar and scheduled posts across platforms.',
          side: 'right',
          align: 'start',
        }
      },
      {
        element: '#tour-nav-dms',
        popover: {
          title: '4. DM Automation',
          description: 'Set up simple keyword-based auto-replies for your Instagram DMs and comments.',
          side: 'right',
          align: 'start',
        }
      },
      {
        element: '#tour-nav-nexa',
        popover: {
          title: '5. Meet Nexa: Your AI Closer',
          description: 'Configure Nexa, your advanced AI agent that handles complex sales conversations and books demo meetings 24/7.',
          side: 'right',
          align: 'start',
        }
      },
      {
        element: '#tour-nav-strategy',
        popover: {
          title: '6. AI Content Strategy',
          description: 'Let our AI instantly generate viral posts, carousels, and captions tailored to your audience.',
          side: 'right',
          align: 'start',
        }
      },
      {
        element: '#tour-nav-assets',
        popover: {
          title: '7. Asset Library',
          description: 'All your generated creatives live here. Be sure to click the "Heart" icon on your favorite assets to save them permanently!',
          side: 'right',
          align: 'start',
        }
      },
      {
        element: '#tour-nav-ads',
        popover: {
          title: '8. Meta Ads Integration',
          description: 'Launch and track highly targeted Meta ads directly from your dashboard.',
          side: 'right',
          align: 'start',
        }
      },
      {
        element: '#tour-nav-credits',
        popover: {
          title: '9. Scale with Credits',
          description: 'Track your AI credits here. Need more generations? You can top up or upgrade your plan anytime!',
          side: 'bottom',
          align: 'end',
        }
      },
      {
        element: '#tour-nav-profile',
        popover: {
          title: '10. Replay Anytime',
          description: 'Need a refresher? You can replay this tour anytime from your profile menu. Enjoy exploring SyncSocio! 🎉',
          side: 'bottom',
          align: 'end',
        }
      }
    ]
  });

  tourObj.drive();
};

export const useOnboardingTour = () => {
  useEffect(() => {
    // Small delay to ensure all DOM elements are mounted and painted
    const timer = setTimeout(() => {
      startOnboardingTour(false);
    }, 1500); // 1.5s delay to let dashboard animations finish

    return () => clearTimeout(timer);
  }, []);
};
