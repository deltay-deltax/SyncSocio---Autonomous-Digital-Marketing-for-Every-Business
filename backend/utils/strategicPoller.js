import BrandProfile from '../models/BrandProfile.js';
import { performStrategicAudit } from './auditAgentService.js';

/**
 * The Strategic Poller runs in the background and ensures all brands
 * receive a fresh neural audit every 24 hours without user intervention.
 */
export async function startStrategicPoller() {
  console.log('[POLLER] 🧠 Strategic Audit Agent initialized (24h cycle)');
  
  // Run once on startup (slightly delayed to ensure DB is ready)
  setTimeout(() => {
    processScheduledAudits();
  }, 5000);

  // Then check every hour
  setInterval(() => {
    processScheduledAudits();
  }, 60 * 60 * 1000); 
}

async function processScheduledAudits() {
  try {
    const brands = await BrandProfile.find({ instagramIsConnected: true });

    for (const brand of brands) {
      if (!brand || !brand.user) continue; // Safety: Skip malformed records

      const lastAudit = brand.lastStrategicAudit || new Date(0);
      const hoursSince = (Date.now() - new Date(lastAudit).getTime()) / (1000 * 60 * 60);

      if (hoursSince >= 24) {
        console.log(`[POLLER] 🎯 Target Found: Audit due for ${brand.brandName || 'Unnamed Brand'}`);
        
        try {
          // userId is required for performStrategicAudit
          await performStrategicAudit(brand.user);
        } catch (err) {
          console.error(`[POLLER] ❌ Strategic Audit failed for ${brand.brandName || 'Unknown'}:`, err.message);
        }
      }
    }
  } catch (error) {
    console.error('[POLLER] ❌ Strategic Poller Error:', error.message);
  }
}
