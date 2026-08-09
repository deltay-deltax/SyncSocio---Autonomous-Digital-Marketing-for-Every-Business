import express from 'express';
import axios from 'axios';
import { protect } from '../middleware/authMiddleware.js';
import BrandProfile from '../models/BrandProfile.js';
import { upsertNexaConversationFromDM, handleIncomingMessage } from '../services/nexaAgent.js';
import { generateRazorpayLink } from '../services/nexaPayment.js';

const router = express.Router();

// ── TEMPLATE SYNC LOGIC ──────────────────────────────────────────────────────
export async function syncDefaultTemplates(profile, accessToken, sampleHandle = null) {
  if (!profile.whatsappWABAId || !accessToken) return;
  
  const appIdForTemplates = process.env.INSTAGRAM_CLIENT_ID || process.env.FB_APP_ID || '1491990322515220';
  let sharedSampleHandle = sampleHandle || null; 

  if (!sharedSampleHandle) {
    try {
      const samplePng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
      const sessionRes = await axios.post(
        `https://graph.facebook.com/v21.0/${appIdForTemplates}/uploads`,
        null,
        { params: { file_length: samplePng.length, file_type: 'image/png', access_token: accessToken } }
      );
      const sessionId = sessionRes.data?.id;
      if (sessionId) {
        const uploadRes = await axios.post(
          `https://graph.facebook.com/v21.0/${sessionId}`,
          samplePng,
          { headers: { 'Authorization': `OAuth ${accessToken}`, 'file_offset': 0, 'Content-Type': 'image/png' } }
        );
        sharedSampleHandle = uploadRes.data?.h || null;
        // console.log(`[WhatsApp Templates] Uploaded shared sample image handle: ${sharedSampleHandle}`);
      }
    } catch (uploadErr) {
      console.warn('[WhatsApp Templates] Could not upload shared sample image handle:', uploadErr?.response?.data || uploadErr.message);
    }
  }

  const SYNCSOCIO_TEMPLATES = [
    {
      name: 'syncsocio_v2_festival',
      bodyText: '🎉 *{{1}}*\nThis festive season, we have something special for you:\n{{2}}\nOffer valid for a limited time. Powered by SyncSocio.',
      example: ['Happy Diwali — Exclusive Offer!', 'Celebrate with 20% OFF on all products today only!'],
      hasImageHeader: true,
      hasUrlButton: true,
      btnText: 'Claim Offer',
    },
    {
      name: 'syncsocio_v2_abandoned',
      bodyText: 'Hi *{{1}}*,\nYou left something behind! 🛒\n{{2}}\nComplete your purchase now before it runs out of stock. Powered by SyncSocio.',
      example: ['John', 'Your favorite red sneakers are waiting in your cart.'],
      hasImageHeader: true,
      hasUrlButton: true,
      btnText: 'Complete Purchase',
    },
    {
      name: 'syncsocio_v2_launch',
      bodyText: '🚀 *{{1}}*\nWe are thrilled to announce:\n{{2}}\nBe the first to check it out! Powered by SyncSocio.',
      example: ['New Collection Live!', 'Our Summer 2024 Collection just dropped featuring 50+ new styles.'],
      hasImageHeader: true,
      hasUrlButton: true,
      btnText: 'Shop New Arrivals',
    },
    {
      name: 'syncsocio_v2_promo_visit',
      bodyText: 'Hey there,\n*{{1}}*\n{{2}}\nBest, Team Powered by SyncSocio.',
      example: ['Check out our latest release!', 'We just added 20+ new items to our store. Grab them before they are gone.'],
      hasImageHeader: true,
      hasUrlButton: true,
      btnText: 'Shop Now',
    },
    {
      name: 'syncsocio_v2_welcome',
      bodyText: 'Welcome to *{{1}}*!\n{{2}}\nWe are so glad to have you with us. Powered by SyncSocio.',
      example: ['SyncSocio VIP Club', 'Enjoy 10% off your first order with code WELCOME10.'],
      hasImageHeader: true,
      hasUrlButton: true,
      btnText: 'Start Shopping',
    },
    {
      name: 'syncsocio_v2_feedback',
      bodyText: 'Hi *{{1}}*,\nWe hope you are enjoying your recent experience with us.\n{{2}}\nYour feedback means the world to us! Powered by SyncSocio.',
      example: ['Sarah', 'Could you take 1 minute to leave us a review?'],
      hasImageHeader: false,
      hasUrlButton: true,
      btnText: 'Leave a Review',
    },
    {
      name: 'syncsocio_v2_update',
      bodyText: '🔔 *{{1}}*\n{{2}}\nStay tuned for more updates! Powered by SyncSocio.',
      example: ['Important Account Update', 'We have updated our Terms of Service effective next month.'],
      hasImageHeader: false,
      hasUrlButton: true,
      btnText: 'Read More',
    },
    {
      name: 'syncsocio_v2_reengagement',
      bodyText: 'We miss you, *{{1}}*!\n{{2}}\nCome back and see what is new. Powered by SyncSocio.',
      example: ['Alex', 'It has been a while! Here is a special 15% discount just for you.'],
      hasImageHeader: true,
      hasUrlButton: true,
      btnText: 'See What is New',
    },
    {
      name: 'syncsocio_v2_exclusive_vip',
      bodyText: '🌟 *{{1}}*\nAs a valued member, here is your exclusive perk:\n{{2}}\nPowered by SyncSocio.',
      example: ['VIP Early Access', 'Shop the Black Friday sale 24 hours before anyone else.'],
      hasImageHeader: true,
      hasUrlButton: true,
      btnText: 'Access VIP Sale',
    },
    {
      name: 'syncsocio_v2_newsletter',
      bodyText: '📰 *{{1}}*\nHere is what is happening this month:\n{{2}}\nThanks for being part of our community. Powered by SyncSocio.',
      example: ['Monthly Wrap-Up', 'Read about our new features, community highlights, and upcoming events.'],
      hasImageHeader: true,
      hasUrlButton: true,
      btnText: 'Read Newsletter',
    },
    {
      name: 'syncsocio_v2_webinar_invite',
      bodyText: '📅 *{{1}}*\nJoin our upcoming session:\n{{2}}\nSeats are limited, reserve yours today! Powered by SyncSocio.',
      example: ['Masterclass: Growth Marketing', 'Learn top strategies from industry experts this Thursday at 2 PM.'],
      hasImageHeader: true,
      hasUrlButton: true,
      btnText: 'Register Now',
    },
    {
      name: 'syncsocio_v2_lead_magnet',
      bodyText: 'Here is your requested resource, *{{1}}*!\n{{2}}\nWe hope you find it valuable. Powered by SyncSocio.',
      example: ['Alex', 'Your free PDF guide to Social Media Automation is ready to download.'],
      hasImageHeader: false,
      hasUrlButton: true,
      btnText: 'Download Guide',
    },
    {
      name: 'syncsocio_v2_interactive_poll',
      bodyText: '🗳️ *{{1}}*\n{{2}}\nYour feedback helps us serve you better. Thank you for participating! Powered by SyncSocio.',
      example: ['Quick Poll for You', 'Tell us what you think — your opinion shapes what we build next for you!'],
      hasImageHeader: false,
      hasUrlButton: true,
      btnText: 'Vote Now',
    },
  ];

  const brandWebsite = profile.website && profile.website.startsWith('http')
    ? profile.website
    : 'https://www.syncsocio.com';

  // console.log(`[WhatsApp Templates] Auto-submitting ${SYNCSOCIO_TEMPLATES.length} campaign templates for WABA ${profile.whatsappWABAId}...`);
  let existingTemplatesMap = {};
  try {
    let nextUrl = `https://graph.facebook.com/v21.0/${profile.whatsappWABAId}/message_templates?fields=name,id&limit=100`;
    while (nextUrl) {
      const existingRes = await axios.get(nextUrl, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const templatesList = existingRes.data?.data || [];
      templatesList.forEach(t => {
        existingTemplatesMap[t.name] = t.id;
      });
      nextUrl = existingRes.data?.paging?.next || null;
    }
  } catch (err) {
    console.warn('[WhatsApp Templates] Could not fetch existing templates for robust syncing:', err.message);
  }

  for (const tmpl of SYNCSOCIO_TEMPLATES) {
    try {
      const components = [];
      if (tmpl.hasImageHeader) {
        const headerComp = { type: 'HEADER', format: 'IMAGE' };
        if (sharedSampleHandle) {
          headerComp.example = { header_handle: [sharedSampleHandle] };
        }
        components.push(headerComp);
      }
      components.push({
        type: 'BODY',
        text: tmpl.bodyText,
        example: { body_text: [tmpl.example] }
      });
      components.push({ type: 'FOOTER', text: 'T&C apply. Reply STOP to unsubscribe.' });
      if (tmpl.hasUrlButton) {
        components.push({
          type: 'BUTTONS',
          buttons: [{
            type: 'URL',
            text: tmpl.btnText,
            url: `${brandWebsite}/{{1}}`,
            example: ['shop']
          }]
        });
      }
      
      const existingTemplateId = existingTemplatesMap[tmpl.name];

      if (existingTemplateId) {
        // Edit existing template
        await axios.post(
          `https://graph.facebook.com/v21.0/${existingTemplateId}`,
          { components },
          { headers: { Authorization: `Bearer ${accessToken}` } }
        ).catch(e => {
          console.error(`[WhatsApp Templates] Failed to edit ${tmpl.name}:`, e?.response?.data || e.message);
        });
      } else {
        // Create new template
        await axios.post(
          `https://graph.facebook.com/v21.0/${profile.whatsappWABAId}/message_templates`,
          { name: tmpl.name, language: 'en_US', category: 'MARKETING', components },
          { headers: { Authorization: `Bearer ${accessToken}` } }
        ).catch(e => {
          if (
            !e?.response?.data?.error?.error_user_msg?.toLowerCase().includes('already exists') &&
            !e?.response?.data?.error?.error_user_title?.toLowerCase().includes('already exists') &&
            e?.response?.data?.error?.error_subcode !== 2388040
          ) {
            console.error(`[WhatsApp Templates] Failed to submit ${tmpl.name}:`, e?.response?.data || e.message);
          }
        });
      }
    } catch (e) {}
    await new Promise(r => setTimeout(r, 500));
  }
  // console.log(`[WhatsApp Templates] Batch submission complete.`);
}

// ── GET /api/whatsapp/config ─────────────────────────────────────────────────
// Returns the Meta App ID needed by the frontend Embedded Signup SDK
router.get('/config', protect, (req, res) => {
  const appId = process.env.INSTAGRAM_CLIENT_ID || process.env.FB_APP_ID;
  if (!appId) {
    return res.status(500).json({ message: 'Meta App ID not configured on server.' });
  }
  res.json({ appId });
});

// ── POST /api/whatsapp/callback ──────────────────────────────────────────────
// Receives the authorization code + phoneNumberId + wabaId from Embedded Signup
// OR receives an accessToken from Standard Login
// Exchanges the code for a System User Access Token and saves credentials to profile
router.post('/callback', protect, async (req, res) => {
  const { code, phoneNumberId, wabaId, isStandardLogin, isManualOAuth, isManualConfig, redirectUri } = req.body;

  // If manual configuration, skip OAuth exchange completely and save the IDs directly
  if (isManualConfig) {
    if (!phoneNumberId || !wabaId) {
      return res.status(400).json({ message: 'Both Phone Number ID and WABA ID are required.' });
    }
    try {
      const profile = await BrandProfile.findOne({
        user: req.user._id,
        ...(req.user.activeBrandId ? { _id: req.user.activeBrandId } : {})
      }) || await BrandProfile.findOne({ user: req.user._id });

      if (!profile) {
        return res.status(404).json({ message: 'Brand profile not found.' });
      }

      profile.whatsappIsConnected = true;
      profile.whatsappPhoneId = phoneNumberId.trim();
      profile.whatsappWABAId = wabaId.trim();
      
      // If we don't have an access token yet, we can keep using any existing token
      // or placeholder during the setup
      if (!profile.whatsappAccessToken) {
        profile.whatsappAccessToken = 'manual_setup';
      }

      await profile.save();

      // console.log(`[WhatsApp Manual Config] Successfully updated WhatsApp for user ${req.user._id}. WABA: ${profile.whatsappWABAId}, Phone: ${profile.whatsappPhoneId}`);

      return res.json({
        success: true,
        message: 'WhatsApp credentials saved successfully.',
        profile: {
          whatsappIsConnected: true,
          whatsappPhoneId: profile.whatsappPhoneId,
          whatsappNumber: profile.whatsappNumber || 'WhatsApp Business',
          whatsappWABAId: profile.whatsappWABAId,
        }
      });
    } catch (err) {
      console.error('[WhatsApp Manual Config] Error:', err.message);
      return res.status(500).json({ message: 'Failed to save WhatsApp credentials.' });
    }
  }

  if (!code) {
    return res.status(400).json({ message: 'Missing code or token from WhatsApp signup.' });
  }

  if (!isStandardLogin && !isManualOAuth && !phoneNumberId) {
    return res.status(400).json({ message: 'Missing phoneNumberId from WhatsApp Embedded Signup.' });
  }

  try {
    const appId = process.env.INSTAGRAM_CLIENT_ID || process.env.FB_APP_ID;
    const appSecret = process.env.INSTAGRAM_CLIENT_SECRET || process.env.FB_APP_SECRET;
    
    let accessToken;

    if (isStandardLogin) {
      // In standard login via popup, the frontend passes the short-lived access token directly as 'code'
      accessToken = code;
    } else {
      // Manual OAuth redirect OR Embedded Signup flow passes a code
      // We must exchange it for a token.
      const tokenRes = await axios.get('https://graph.facebook.com/v21.0/oauth/access_token', {
        params: {
          client_id: appId,
          client_secret: appSecret,
          // If manual OAuth, use the exact redirect URI the frontend used. Otherwise, omit or use empty string for JS SDK.
          redirect_uri: isManualOAuth ? redirectUri : '',
          code,
        },
      });
      accessToken = tokenRes.data.access_token;
    }

    // Step 2: Exchange for a long-lived token (60 days) if needed
    try {
      const longLivedRes = await axios.get('https://graph.facebook.com/v21.0/oauth/access_token', {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: appId,
          client_secret: appSecret,
          fb_exchange_token: accessToken,
        },
      });
      accessToken = longLivedRes.data.access_token;
    } catch (extendErr) {
      console.warn('[WhatsApp OAuth] Could not extend token, using original:', extendErr.message);
    }

    // Step 3: Save the credentials to the brand profile
    const profile = await BrandProfile.findOne({
      user: req.user._id,
      ...(req.user.activeBrandId ? { _id: req.user.activeBrandId } : {})
    }) || await BrandProfile.findOne({ user: req.user._id });

    if (!profile) {
      return res.status(404).json({ message: 'Brand profile not found.' });
    }

    // Automatically resolve WABA ID and Phone Number ID from Meta Graph API
    let resolvedWabaId = wabaId || '';
    let resolvedPhoneId = phoneNumberId || '';
    let resolvedPhoneNumber = '';

    try {
      // console.log('[WhatsApp OAuth] Resolving WABA ID via Meta debug_token...');
      
      // 1. Inspect the user token using debug_token to get the WABA IDs shared with the app
      const debugRes = await axios.get('https://graph.facebook.com/v21.0/debug_token', {
        params: {
          input_token: accessToken,
          access_token: `${appId}|${appSecret}`
        }
      });

      const granularScopes = debugRes.data?.data?.granular_scopes || [];
      const waMgmtScope = granularScopes.find(s => s.scope === 'whatsapp_business_management');
      const waMsgScope = granularScopes.find(s => s.scope === 'whatsapp_business_messaging');
      
      if (waMgmtScope && waMgmtScope.target_ids && waMgmtScope.target_ids.length > 0) {
        resolvedWabaId = waMgmtScope.target_ids[0];
        // console.log(`[WhatsApp OAuth] Resolved WABA ID via debug_token: ${resolvedWabaId}`);
      }

      // NOTE: Do NOT resolve phone ID from waMsgScope.target_ids — Meta sometimes returns
      // the WABA ID there instead of the actual phone number ID. We resolve it from the
      // WABA phone_numbers list below, which is the only reliable source.

      // 2. If debug_token didn't yield a WABA ID, fallback to businesses traversal
      if (!resolvedWabaId) {
        // console.log('[WhatsApp OAuth] debug_token fallback: Fetching associated businesses...');
        const businessesRes = await axios.get('https://graph.facebook.com/v21.0/me/businesses', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });

        const businesses = businessesRes.data?.data || [];
        // console.log(`[WhatsApp OAuth] Found ${businesses.length} businesses.`);

        const wabaIds = new Set();
        for (const biz of businesses) {
          try {
            const ownedRes = await axios.get(`https://graph.facebook.com/v21.0/${biz.id}/owned_whatsapp_business_accounts`, {
              headers: { Authorization: `Bearer ${accessToken}` }
            });
            (ownedRes.data?.data || []).forEach(waba => wabaIds.add(waba.id));
          } catch (bizErr) {
            console.warn(`[WhatsApp OAuth] Could not fetch WABAs for business ${biz.id}:`, bizErr?.response?.data || bizErr.message);
          }
        }
        if (wabaIds.size > 0) {
          resolvedWabaId = Array.from(wabaIds)[0];
        }
      }

      // 3. Fetch phone numbers from WABA list — ALWAYS do this to get the real phone number and phone ID.
      // We can NOT rely on debug_token for phone ID because Meta returns the WABA ID there.
      if (resolvedWabaId) {
        // console.log(`[WhatsApp OAuth] Fetching phone numbers for WABA: ${resolvedWabaId}...`);
        try {
          const phoneRes = await axios.get(`https://graph.facebook.com/v21.0/${resolvedWabaId}/phone_numbers`, {
            params: { fields: 'id,display_phone_number,verified_name,quality_rating,status' },
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          const phoneData = phoneRes.data?.data || [];
          // console.log(`[WhatsApp OAuth] WABA phone list count: ${phoneData.length}`);

          // Always prefer a verified real number over a test number
          const realPhone = phoneData.find(p => p.display_phone_number && !p.display_phone_number.startsWith('+1 555'));
          if (realPhone) {
            // ALWAYS overwrite resolvedPhoneId with the correct one from the list
            resolvedPhoneId = realPhone.id;
            resolvedPhoneNumber = realPhone.display_phone_number;
            // console.log(`[WhatsApp OAuth] WABA list — real phone: ${resolvedPhoneNumber}, phoneId: ${resolvedPhoneId}`);
          } else if (phoneData.length > 0) {
            // Only test numbers found — use its ID but don't save the fake display number
            resolvedPhoneId = phoneData[0].id;
            console.warn(`[WhatsApp OAuth] Only test numbers found in WABA list. Phone ID: ${resolvedPhoneId}`);
          }
        } catch (phoneListErr) {
          console.warn('[WhatsApp OAuth] WABA phone list lookup failed:', phoneListErr?.response?.data || phoneListErr.message);
        }
      }

      // 5. Register the resolved phone number to enable messaging (Required for Embedded Signup)
      if (resolvedPhoneId) {
        try {
          // console.log(`[WhatsApp OAuth] Registering phone number ${resolvedPhoneId}...`);
          await axios.post(`https://graph.facebook.com/v25.0/${resolvedPhoneId}/register`, {
            messaging_product: 'whatsapp',
            pin: '123456' // Standard 6-digit PIN for WhatsApp 2FA
          }, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          // console.log(`[WhatsApp OAuth] Phone number ${resolvedPhoneId} successfully registered!`);
        } catch (regErr) {
          console.error(`[WhatsApp OAuth] Failed to register phone number (may already be registered or unverified):`, regErr?.response?.data || regErr.message);
        }
      }
    } catch (graphErr) {
      console.error('[WhatsApp OAuth] Failed to auto-resolve WABA/Phone IDs from Graph API:', graphErr?.response?.data || graphErr.message);
    }

    profile.whatsappIsConnected = true;
    profile.whatsappAccessToken = accessToken;
    profile.whatsappPhoneId = resolvedPhoneId || phoneNumberId || 'pending_setup';
    profile.whatsappWABAId = resolvedWabaId || wabaId || '';
    if (resolvedPhoneNumber && !resolvedPhoneNumber.startsWith('+1 555')) {
      // Only save a real number, not Meta's test numbers
      profile.whatsappNumber = resolvedPhoneNumber;
    } else {
      // Clear any previously saved stale test number so UI shows Phone ID instead
      profile.whatsappNumber = '';
      // console.log('[WhatsApp OAuth] No real phone number resolved. Cleared stale whatsappNumber from profile.');
    }

    // Shared sample image handle — used for custom_campaign_image AND all syncsocio_* IMAGE headers
    let sampleHandle = null;

    // Auto-create general template upon connect
    if (profile.whatsappWABAId) {
      try {
        // console.log(`[WhatsApp Template] Auto-creating 'custom_campaign_image' template for WABA: ${profile.whatsappWABAId}...`);
        
        const btnText = (profile.brandName ? `${profile.brandName} now` : 'Visit Website')
          .replace(/[^\w\s]/gi, '')
          .trim()
          .substring(0, 25) || 'Visit Website';

        let btnUrl = profile.website && profile.website.startsWith('http')
          ? profile.website
          : 'https://www.syncsocio.com';

        // Obtain a real sample media handle from Meta's Resumable Upload API
        const appId = process.env.INSTAGRAM_CLIENT_ID || process.env.FB_APP_ID || '1491990322515220';

        try {
          const samplePng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
          const sessionRes = await axios.post(
            `https://graph.facebook.com/v21.0/${appId}/uploads`,
            null,
            { params: { file_length: samplePng.length, file_type: 'image/png', access_token: accessToken } }
          );
          const sessionId = sessionRes.data?.id;
          if (sessionId) {
            const uploadRes = await axios.post(
              `https://graph.facebook.com/v21.0/${sessionId}`,
              samplePng,
              { headers: { 'Authorization': `OAuth ${accessToken}`, 'file_offset': 0, 'Content-Type': 'image/png' } }
            );
            sampleHandle = uploadRes.data?.h || null;
            // console.log(`[WhatsApp Upload] Generated sample media handle: ${sampleHandle}`);
          }
        } catch (uploadErr) {
          console.warn('[WhatsApp Upload] Resumable upload failed, using fallback handle handling:', uploadErr?.response?.data || uploadErr.message);
        }

        const templateComponents = [
          {
            type: "BODY",
            text: "Hey! Check this out 👇\n\n{{1}}\n\nPowered by SyncSocio",
            example: {
              body_text: [
                ["Check out our exclusive Diwali offer on MuscleBlaze supplements! Get 20% OFF today."]
              ]
            }
          },
          {
            type: "FOOTER",
            text: "T&C apply. Reply STOP to unsubscribe."
          },
          {
            type: "BUTTONS",
            buttons: [
              {
                type: "URL",
                text: btnText,
                url: btnUrl
              }
            ]
          }
        ];

        // Add IMAGE Header if sampleHandle was successfully generated
        if (sampleHandle) {
          templateComponents.unshift({
            type: "HEADER",
            format: "IMAGE",
            example: {
              header_handle: [sampleHandle]
            }
          });
        }

        const templatePayload = {
          name: "custom_campaign_image",
          language: "en_US",
          category: "MARKETING",
          components: templateComponents
        };

        // Submit primary template with retry for transient errors
        let primarySubmitted = false;
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            await axios.post(
              `https://graph.facebook.com/v21.0/${profile.whatsappWABAId}/message_templates`,
              templatePayload,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            // console.log(`[WhatsApp Template] Successfully created template for WABA: ${profile.whatsappWABAId}`);
            primarySubmitted = true;
            break;
          } catch (tmplErr) {
            const errorDetail = tmplErr?.response?.data?.error;
            const isTransient = errorDetail?.is_transient;
            const errCode = errorDetail?.code;
            const isAlreadyExists = errorDetail && (
              errorDetail.error_subcode === 2388040 || 
              errorDetail.error_subcode === 2388024 ||
              (errorDetail.message && errorDetail.message.toLowerCase().includes('already exists')) ||
              (errorDetail.error_user_title && errorDetail.error_user_title.toLowerCase().includes('already exists'))
            );
            
            if (isAlreadyExists) {
              // console.log(`[WhatsApp Template] Template 'custom_campaign_image' already exists.`);
              primarySubmitted = true;
              break;
            } else if (isTransient && errCode === 2 && attempt < 2) {
              console.warn(`[WhatsApp Template] Transient error on custom_campaign_image, retrying in 2s...`);
              await new Promise(r => setTimeout(r, 2000));
            } else {
              console.error('[WhatsApp Template] Failed to auto-create primary template:', tmplErr?.response?.data || tmplErr.message);
              break;
            }
          }
        }

        if (!primarySubmitted) {
          // Fallback: Create text-only template if image header template failed
          // console.log(`[WhatsApp Template] Creating fallback text template 'custom_campaign_text'...`);
          const fallbackPayload = {
            name: "custom_campaign_text",
            language: "en_US",
            category: "MARKETING",
            components: [
              {
                type: "BODY",
                text: "Hey! We wanted to share this with you 👇\n\n{{1}}\n\nClick the link below to view it. Powered by SyncSocio",
                example: { body_text: [["Check out our exclusive Diwali offer on MuscleBlaze supplements!"]] }
              },
              { type: "FOOTER", text: "T&C apply. Reply STOP to unsubscribe." }
            ]
          };
          
          for (let attempt = 1; attempt <= 2; attempt++) {
            try {
              await axios.post(
                `https://graph.facebook.com/v21.0/${profile.whatsappWABAId}/message_templates`,
                fallbackPayload,
                { headers: { Authorization: `Bearer ${accessToken}` } }
              );
              // console.log(`[WhatsApp Template] Successfully created fallback template 'custom_campaign_text'.`);
              break;
            } catch (fbErr) {
              const errorDetail = fbErr?.response?.data?.error;
              const isTransient = errorDetail?.is_transient;
              const errCode = errorDetail?.code;
              
              if (errorDetail?.error_subcode === 2388040 || errorDetail?.error_subcode === 2388024 || (errorDetail?.message && errorDetail.message.toLowerCase().includes('already exists'))) {
                 // console.log(`[WhatsApp Template] Fallback template 'custom_campaign_text' already exists.`);
                 break;
              } else if (isTransient && errCode === 2 && attempt < 2) {
                 console.warn(`[WhatsApp Template] Transient error on custom_campaign_text, retrying in 2s...`);
                 await new Promise(r => setTimeout(r, 2000));
              } else {
                 console.error('[WhatsApp Template] Fallback template creation error:', fbErr?.response?.data || fbErr.message);
                 break;
              }
            }
          }
        }
        
        // Call the new template sync function
        await syncDefaultTemplates(profile, accessToken, sampleHandle);

      } catch (outerErr) {
        console.error('[WhatsApp Template] Unexpected error during initial template auto-creation:', outerErr?.response?.data || outerErr.message);
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    await profile.save();

    // Subscribe our App to the client's WABA to receive incoming messages via webhook
    if (profile.whatsappWABAId && accessToken) {
      try {
        await axios.post(
          `https://graph.facebook.com/v25.0/${profile.whatsappWABAId}/subscribed_apps`,
          {},
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        // console.log(`[WhatsApp OAuth] Successfully subscribed App to WABA: ${profile.whatsappWABAId}`);
      } catch (subErr) {
        console.error(`[WhatsApp OAuth] Failed to subscribe App to WABA ${profile.whatsappWABAId}:`, subErr?.response?.data || subErr.message);
      }
    }

    // console.log(`[WhatsApp OAuth] Successfully connected WhatsApp. WABA: ${profile.whatsappWABAId}, Phone: ${profile.whatsappPhoneId}`);

    res.json({
      success: true,
      message: 'WhatsApp Business account connected successfully.',
      profile: {
        whatsappIsConnected: true,
        whatsappPhoneId: profile.whatsappPhoneId,
        whatsappNumber: profile.whatsappNumber || '',
        whatsappWABAId: profile.whatsappWABAId || '',
      }
    });
  } catch (err) {
    console.error('[WhatsApp OAuth] Callback error:', err?.response?.data || err.message);
    const errMsg = err?.response?.data?.error?.message || err.message || 'Failed to connect WhatsApp Business account.';
    res.status(500).json({ message: errMsg });
  }
});

// ── DELETE /api/whatsapp/disconnect ──────────────────────────────────────────
// Disconnects the WhatsApp account from the brand profile
router.delete('/disconnect', protect, async (req, res) => {
  try {
    const profile = await BrandProfile.findOne({
      user: req.user._id,
      ...(req.user.activeBrandId ? { _id: req.user.activeBrandId } : {})
    }) || await BrandProfile.findOne({ user: req.user._id });

    if (!profile) {
      return res.status(404).json({ message: 'Brand profile not found.' });
    }

    profile.whatsappIsConnected = false;
    profile.whatsappPhoneId = '';
    profile.whatsappAccessToken = '';
    profile.whatsappWABAId = '';
    await profile.save();

    res.json({ success: true, message: 'WhatsApp account disconnected.' });
  } catch (err) {
    console.error('[WhatsApp Disconnect] Error:', err.message);
    res.status(500).json({ message: 'Failed to disconnect WhatsApp account.' });
  }
});

// ── GET /api/whatsapp/templates ──────────────────────────────────────────────
// Fetches real template statuses from Meta Graph API for the connected WABA
router.get('/templates', protect, async (req, res) => {
  try {
    const profile = await BrandProfile.findOne({
      user: req.user._id,
      ...(req.user.activeBrandId ? { _id: req.user.activeBrandId } : {})
    }) || await BrandProfile.findOne({ user: req.user._id });

    const token = profile?.whatsappAccessToken;
    const wabaId = profile?.whatsappWABAId;

    if (!token || !wabaId) {
      return res.status(400).json({ message: 'No WhatsApp account connected.' });
    }

    const result = await axios.get(`https://graph.facebook.com/v25.0/${wabaId}/message_templates`, {
      params: { fields: 'name,status,category,language,components', limit: 50 },
      headers: { Authorization: `Bearer ${token}` }
    });

    res.json(result.data);
  } catch (err) {
    console.error('[WhatsApp Templates] Error fetching templates:', err?.response?.data || err.message);
    res.status(500).json({ message: 'Failed to fetch templates.', error: err?.response?.data });
  }
});

// ── POST /api/whatsapp/sync-templates ────────────────────────────────────────
// Manually triggers template re-sync using the existing connection
router.post('/sync-templates', protect, async (req, res) => {
  try {
    const profile = await BrandProfile.findOne({
      user: req.user._id,
      ...(req.user.activeBrandId ? { _id: req.user.activeBrandId } : {})
    }) || await BrandProfile.findOne({ user: req.user._id });

    if (!profile || !profile.whatsappIsConnected || !profile.whatsappAccessToken) {
      return res.status(400).json({ message: 'WhatsApp is not connected.' });
    }
    await syncDefaultTemplates(profile, profile.whatsappAccessToken, null);
    res.json({ success: true, message: 'Templates submitted successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to sync templates.', error: 'An internal server error occurred.' });
  }
});
// ── POST /api/whatsapp/map-variables ─────────────────────────────────────────
// Uses Gemini to auto-map user instructions to template variables
router.post('/map-variables', protect, async (req, res) => {
  const { idea, templateBody, templateName } = req.body;
  if (!idea || !templateBody) {
    return res.status(400).json({ message: 'Idea and templateBody are required.' });
  }

  try {
    const profile = await BrandProfile.findOne({
      user: req.user._id,
      ...(req.user.activeBrandId ? { _id: req.user.activeBrandId } : {})
    }) || await BrandProfile.findOne({ user: req.user._id });

    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
    if (!GOOGLE_API_KEY) {
      // Fallback if no AI
      const fallbackMsg = idea.substring(0, 1024);
      return res.json({ filledText: templateBody.replace(/\{\{1\}\}/g, 'Offer').replace(/\{\{2\}\}/g, fallbackMsg), variables: { '1': 'Offer', '2': fallbackMsg } });
    }

    const industry = profile?.businessCategory || 'Retail';
    const tone = profile?.brandTone || 'professional and engaging';
    
    const prompt = `You are an expert WhatsApp marketing copywriter for ${industry} brands.

Brand Tone: ${tone}

The user wants to send a WhatsApp campaign about: "${idea}"

The chosen WhatsApp template is:
"${templateBody}"

This template contains variables like {{1}}, {{2}}, etc.
Your job is to generate the best text to fill in these variables based on the user's campaign idea.
Ensure the filled template reads naturally and fits the brand tone.

Return a valid JSON object where keys are the variable numbers (e.g., "1", "2") and values are the text to insert.
Rules:
- Keep text for variables short enough to fit WhatsApp limits.
- If it's a headline variable (usually {{1}} if it's a short intro), keep it under 60 chars.
- If it's a body variable, make it engaging.
- Output ONLY JSON.`;

    console.log("🔥 Sending to WhatsApp LLM (Gemini):", {
      idea,
      templateName,
      templateBody,
      prompt
    });
    
    const geminiRes = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GOOGLE_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 300, responseMimeType: 'application/json' }
      },
      { timeout: 15000 }
    );

    const raw = geminiRes.data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const variables = JSON.parse(raw.trim());

    let filledText = templateBody;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      filledText = filledText.replace(regex, String(value));
    }

    res.json({ filledText, variables });
  } catch (err) {
    console.error('[WhatsApp MapVariables] Error:', err.message);
    res.status(500).json({ message: 'Failed to map variables.', error: 'An internal server error occurred.' });
  }
});

// ── GET /api/whatsapp/webhook ─────────────────────────────────────────────────
// Meta webhook verification handshake
router.get('/webhook', (req, res) => {
  const verify_token = process.env.META_WEBHOOK_VERIFY_TOKEN || 'velocity_verify_token_123';
  
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === verify_token) {
      // console.log('[WhatsApp Webhook] Verification successful');
      return res.status(200).send(challenge);
    } else {
      // console.log('[WhatsApp Webhook] Verification failed - token mismatch');
      return res.sendStatus(403);
    }
  }
  res.sendStatus(400);
});

// ── POST /api/whatsapp/webhook ────────────────────────────────────────────────
// Receives incoming messages from WhatsApp users
router.post('/webhook', async (req, res) => {
  const body = req.body;
  
  // console.log(`[WhatsApp Webhook] Incoming POST request. Body:`, JSON.stringify(body, null, 2));

  if (body.object === 'whatsapp_business_account') {
    try {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          const value = change.value;
          if (value && value.messages && value.messages.length > 0) {
            
            const phoneNumberId = value.metadata.phone_number_id;
            const message = value.messages[0];
            const senderId = message.from; // The user's WhatsApp number
            
            let messageText = '';
            let imageUrl = null;
            if (message.type === 'text') {
              messageText = message.text.body;
            } else if (message.type === 'image') {
              messageText = '[Image uploaded]';
              imageUrl = message.image?.url || null; // May require auth, but we try passing it
            } else if (message.type === 'interactive') {
              messageText = message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || '[Interactive Message]';
            } else {
              messageText = `[${message.type} message received]`;
            }

            // Ensure messageText is never completely empty to prevent Mongoose validation errors
            if (!messageText || messageText.trim() === '') {
              messageText = '[Empty Message]';
            }

            // console.log(`[WhatsApp Webhook] Received message from ${senderId} to phone ID ${phoneNumberId}`);

            // Find the brand that owns this WhatsApp Phone ID
            const brandProfile = await BrandProfile.findOne({ whatsappPhoneId: phoneNumberId });
            
            if (!brandProfile || !brandProfile.nexa?.nexa_enabled || !brandProfile.whatsappAccessToken) {
              // console.log(`[WhatsApp Webhook] Ignored: Brand not found, Nexa disabled, or access token missing for phone ID ${phoneNumberId}`);
              continue;
            }

            // Load or create the conversation state
            const convo = await upsertNexaConversationFromDM({
              brandDoc: brandProfile,
              igUserId: senderId, // Reusing ig_user_id field for WhatsApp number
              platform: 'whatsapp',
            });

            // Pass the message to the Nexa AI Agent
            const nexaResult = await handleIncomingMessage({
              convo,
              incomingText: messageText,
              imageUrl: imageUrl,
              brandDoc: brandProfile,
              nexaSettings: brandProfile.nexa,
            });

            // Handle Razorpay Links
            let finalReplyText = nexaResult?.replyText || '';
            if (nexaResult?.paymentLinkRequested && brandProfile.nexa?.razorpay_connected) {
              try {
                const amount = nexaResult.mergedCollected?.price_agreed || 0;
                if (amount > 0) {
                  const { razorpay_short_url } = await generateRazorpayLink({
                    brandDoc: brandProfile,
                    nexaSettings: brandProfile.nexa,
                    amountRupees: amount,
                    customerName: nexaResult.mergedCollected?.customer_name || 'Customer',
                    phone: nexaResult.mergedCollected?.phone_number || '',
                    description: `Order: ${nexaResult.mergedCollected?.product_interested || 'Product'} x${nexaResult.mergedCollected?.quantity || 1}`,
                    conversationId: convo._id,
                  });
                  finalReplyText += `\n\n🔗 Pay here: ${razorpay_short_url}`;
                }
              } catch (payErr) {
                console.error('[WhatsApp Nexa] Failed to generate Razorpay link:', payErr.message);
                finalReplyText += '\n\n(Payment link generation failed — please contact us directly)';
              }
            }

            // Send Product Image if requested by Nexa
            if (nexaResult?.productImageUrlToSend) {
              try {
                const productImgPayload = {
                  messaging_product: 'whatsapp',
                  recipient_type: 'individual',
                  to: senderId,
                  type: 'image',
                  image: { link: nexaResult.productImageUrlToSend }
                };

                await axios.post(
                  `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`,
                  productImgPayload,
                  {
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${brandProfile.whatsappAccessToken}`,
                    },
                  }
                );
                // console.log(`[WhatsApp Webhook] Sent product image to ${senderId}`);
              } catch (imgErr) {
                console.error('[WhatsApp Nexa] Failed to send product image:', imgErr?.response?.data || imgErr.message);
              }
            }

            // Send Nexa's reply back to the user via Meta API
            if (finalReplyText) {
              const replyPayload = {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: senderId,
                type: 'text',
                text: { body: finalReplyText }
              };

              await axios.post(
                `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`,
                replyPayload,
                {
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${brandProfile.whatsappAccessToken}`,
                  },
                }
              );
              // console.log(`[WhatsApp Webhook] Sent reply to ${senderId}`);
            }

            // If Nexa requests to send UPI QR code, send it as an image attachment
            if (nexaResult?.sendUpiQr && brandProfile.nexa?.upi_qr_code_url) {
              try {
                const qrPayload = {
                  messaging_product: 'whatsapp',
                  recipient_type: 'individual',
                  to: senderId,
                  type: 'image',
                  image: { link: brandProfile.nexa.upi_qr_code_url }
                };

                await axios.post(
                  `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`,
                  qrPayload,
                  {
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${brandProfile.whatsappAccessToken}`,
                    },
                  }
                );
                // console.log(`[WhatsApp Webhook] Sent UPI QR to ${senderId}`);
              } catch (qrErr) {
                console.error('[WhatsApp Nexa] Failed to send UPI QR:', qrErr.message);
              }
            }
          }
        }
      }
      res.sendStatus(200);
    } catch (err) {
      console.error('[WhatsApp Webhook] Error processing message:', err.message);
      res.sendStatus(500);
    }
  } else {
    res.sendStatus(404);
  }
});

export default router;
