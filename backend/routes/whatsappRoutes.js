import express from 'express';
import axios from 'axios';
import { protect } from '../middleware/authMiddleware.js';
import BrandProfile from '../models/BrandProfile.js';

const router = express.Router();

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

      console.log(`[WhatsApp Manual Config] Successfully updated WhatsApp for user ${req.user._id}. WABA: ${profile.whatsappWABAId}, Phone: ${profile.whatsappPhoneId}`);

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
      console.log('[WhatsApp OAuth] Resolving WABA ID via Meta debug_token...');
      
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
        console.log(`[WhatsApp OAuth] Resolved WABA ID via debug_token: ${resolvedWabaId}`);
      }

      // NOTE: Do NOT resolve phone ID from waMsgScope.target_ids — Meta sometimes returns
      // the WABA ID there instead of the actual phone number ID. We resolve it from the
      // WABA phone_numbers list below, which is the only reliable source.

      // 2. If debug_token didn't yield a WABA ID, fallback to businesses traversal
      if (!resolvedWabaId) {
        console.log('[WhatsApp OAuth] debug_token fallback: Fetching associated businesses...');
        const businessesRes = await axios.get('https://graph.facebook.com/v21.0/me/businesses', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });

        const businesses = businessesRes.data?.data || [];
        console.log(`[WhatsApp OAuth] Found ${businesses.length} businesses.`);

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
        console.log(`[WhatsApp OAuth] Fetching phone numbers for WABA: ${resolvedWabaId}...`);
        try {
          const phoneRes = await axios.get(`https://graph.facebook.com/v21.0/${resolvedWabaId}/phone_numbers`, {
            params: { fields: 'id,display_phone_number,verified_name,quality_rating,status' },
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          const phoneData = phoneRes.data?.data || [];
          console.log(`[WhatsApp OAuth] WABA phone list count: ${phoneData.length}`);

          // Always prefer a verified real number over a test number
          const realPhone = phoneData.find(p => p.display_phone_number && !p.display_phone_number.startsWith('+1 555'));
          if (realPhone) {
            // ALWAYS overwrite resolvedPhoneId with the correct one from the list
            resolvedPhoneId = realPhone.id;
            resolvedPhoneNumber = realPhone.display_phone_number;
            console.log(`[WhatsApp OAuth] WABA list — real phone: ${resolvedPhoneNumber}, phoneId: ${resolvedPhoneId}`);
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
          console.log(`[WhatsApp OAuth] Registering phone number ${resolvedPhoneId}...`);
          await axios.post(`https://graph.facebook.com/v25.0/${resolvedPhoneId}/register`, {
            messaging_product: 'whatsapp',
            pin: '123456' // Standard 6-digit PIN for WhatsApp 2FA
          }, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          console.log(`[WhatsApp OAuth] Phone number ${resolvedPhoneId} successfully registered!`);
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
      console.log('[WhatsApp OAuth] No real phone number resolved. Cleared stale whatsappNumber from profile.');
    }

    // Shared sample image handle — used for custom_campaign_image AND all syncsocio_* IMAGE headers
    let sampleHandle = null;

    // Auto-create general template upon connect
    if (profile.whatsappWABAId) {
      try {
        console.log(`[WhatsApp Template] Auto-creating 'custom_campaign_image' template for WABA: ${profile.whatsappWABAId}...`);
        
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
            console.log(`[WhatsApp Upload] Generated sample media handle: ${sampleHandle}`);
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
            console.log(`[WhatsApp Template] Successfully created template for WABA: ${profile.whatsappWABAId}`);
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
              console.log(`[WhatsApp Template] Template 'custom_campaign_image' already exists.`);
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
          console.log(`[WhatsApp Template] Creating fallback text template 'custom_campaign_text'...`);
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
              console.log(`[WhatsApp Template] Successfully created fallback template 'custom_campaign_text'.`);
              break;
            } catch (fbErr) {
              const errorDetail = fbErr?.response?.data?.error;
              const isTransient = errorDetail?.is_transient;
              const errCode = errorDetail?.code;
              
              if (errorDetail?.error_subcode === 2388040 || errorDetail?.error_subcode === 2388024 || (errorDetail?.message && errorDetail.message.toLowerCase().includes('already exists'))) {
                 console.log(`[WhatsApp Template] Fallback template 'custom_campaign_text' already exists.`);
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
      } catch (outerErr) {
        console.error('[WhatsApp Template] Unexpected error during initial template auto-creation:', outerErr?.response?.data || outerErr.message);
      }
    }
    // ── AUTO-SUBMIT ALL SYNCSOCIO CAMPAIGN TEMPLATES FOR REVIEW ─────────────
    // These are the pre-built templates used by WhatsApp campaigns. Submit all
    // so they go into "In Review" on Meta and can be approved for messaging.
    if (profile.whatsappWABAId && accessToken) {
      // Upload a shared sample image handle for all IMAGE-header templates
      // (Meta requires example.header_handle for IMAGE headers — error_subcode 2388043)
      const appIdForTemplates = process.env.INSTAGRAM_CLIENT_ID || process.env.FB_APP_ID || '1491990322515220';
      let sharedSampleHandle = sampleHandle || null; // Reuse handle from custom_campaign_image upload if available

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
            console.log(`[WhatsApp Templates] Uploaded shared sample image handle: ${sharedSampleHandle}`);
          }
        } catch (uploadErr) {
          console.warn('[WhatsApp Templates] Could not upload shared sample image handle:', uploadErr?.response?.data || uploadErr.message);
        }
      }

      const SYNCSOCIO_TEMPLATES = [
        {
          name: 'syncsocio_festival',
          // Body text is long enough relative to 2 variables (words-ratio check)
          bodyText: '🎉 *{{1}}*\n\nHere is your exclusive deal from us:\n{{2}}\n\nDon\'t miss out — this offer is valid for a limited time only. Powered by SyncSocio.',
          example: ['Happy Diwali — Exclusive Offer!', 'Celebrate with 20% OFF on all products today only!'],
          hasImageHeader: true,
          hasUrlButton: true,
          btnText: 'Shop Now',
        },
        {
          name: 'syncsocio_promo_image',
          bodyText: '🛍️ *{{1}}*\n\nHere is what we have for you:\n{{2}}\n\nGrab it before it runs out. Powered by SyncSocio.',
          example: ['New Collection Drop', 'Our latest arrivals are live — grab yours before they run out!'],
          hasImageHeader: true,
          hasUrlButton: true,
          btnText: 'View Collection',
        },
        {
          name: 'syncsocio_promo_generic',
          bodyText: '🔥 *{{1}}*\n\nHere are the details:\n{{2}}\n\nAct fast — limited availability. Powered by SyncSocio.',
          example: ['Exclusive Offer Inside', 'Get 30% off when you order today. Limited time only!'],
          hasImageHeader: true,
          hasUrlButton: true,
          btnText: 'Claim Offer',
        },
        {
          name: 'syncsocio_promo_text',
          // TEXT-ONLY: no image header. Longer body needed to satisfy words-to-variable ratio.
          bodyText: '💬 *{{1}}*\n\nWe wanted to share something important with you:\n{{2}}\n\nTap below to find out more and stay ahead. Powered by SyncSocio.',
          example: ['Special Announcement', 'We have something big coming your way — stay tuned for the big reveal!'],
          hasImageHeader: false,
          hasUrlButton: true,
          btnText: 'Learn More',
        },
        {
          name: 'syncsocio_promo_shop',
          bodyText: '🛒 *{{1}}*\n\nHere is what is on offer:\n{{2}}\n\nShop now before stocks run out. Powered by SyncSocio.',
          example: ['Weekend Sale is Live!', 'Shop our bestsellers at up to 40% off this weekend only.'],
          hasImageHeader: true,
          hasUrlButton: true,
          btnText: 'Shop Now',
        },
        {
          name: 'syncsocio_promo_claim',
          bodyText: '🎁 *{{1}}*\n\nYour exclusive deal is waiting:\n{{2}}\n\nClaim it before it expires. Powered by SyncSocio.',
          example: ['Your Offer is Ready', 'Claim your exclusive discount before it expires tonight!'],
          hasImageHeader: true,
          hasUrlButton: true,
          btnText: 'Claim Now',
        },
        {
          name: 'syncsocio_promo_visit',
          bodyText: '📍 *{{1}}*\n\nHere is what you need to know:\n{{2}}\n\nCome visit us — we would love to see you. Powered by SyncSocio.',
          example: ['Visit Our Store', 'We would love to see you! Find us at our new location this weekend.'],
          hasImageHeader: true,
          hasUrlButton: true,
          btnText: 'Get Directions',
        },
        {
          name: 'syncsocio_promo_book',
          bodyText: '📅 *{{1}}*\n\nHere are the details for your booking:\n{{2}}\n\nSecure your spot now. Powered by SyncSocio.',
          example: ['Book Your Appointment', 'Slots are filling fast — reserve yours now before they are all gone!'],
          hasImageHeader: true,
          hasUrlButton: true,
          btnText: 'Book Now',
        },
        {
          name: 'syncsocio_promo_order',
          bodyText: '📦 *{{1}}*\n\nHere is the latest update on your order:\n{{2}}\n\nThank you for shopping with us. Powered by SyncSocio.',
          example: ['Order Update', 'Your order has been dispatched and is on its way. Track it here.'],
          hasImageHeader: true,
          hasUrlButton: true,
          btnText: 'Track Order',
        },
        {
          name: 'syncsocio_promo_learn',
          bodyText: '📚 *{{1}}*\n\nHere is what we have lined up for you:\n{{2}}\n\nStart learning today and grow your skills. Powered by SyncSocio.',
          example: ['New Course Alert', 'Enrol in our new course and level up your skills starting today!'],
          hasImageHeader: true,
          hasUrlButton: true,
          btnText: 'Learn More',
        },
        {
          name: 'syncsocio_promo_get',
          bodyText: '⚡ *{{1}}*\n\nHere is your exclusive freebie:\n{{2}}\n\nDownload it now — available for a limited time only. Powered by SyncSocio.',
          example: ['Grab Your Freebie', 'Download your free guide — available for 24 hours only. Grab it now!'],
          hasImageHeader: true,
          hasUrlButton: true,
          btnText: 'Get It Now',
        },
        {
          name: 'syncsocio_promo_lead',
          bodyText: '📋 *{{1}}*\n\nHere is how you can claim your reward:\n{{2}}\n\nFill the form and get your exclusive benefit. Powered by SyncSocio.',
          example: ['You Have Been Selected', 'Fill out a quick form and get your exclusive reward today!'],
          hasImageHeader: true,
          hasUrlButton: true,
          btnText: 'Fill Form',
        },
        {
          name: 'syncsocio_interactive_poll',
          // TEXT-ONLY: longer body to satisfy words-to-variable ratio.
          bodyText: '🗳️ *{{1}}*\n\nWe would love to hear from you:\n{{2}}\n\nYour feedback helps us serve you better. Thank you for participating! Powered by SyncSocio.',
          example: ['Quick Poll for You', 'Tell us what you think — your opinion shapes what we build next for you!'],
          hasImageHeader: false,
          hasUrlButton: true,
          btnText: 'Vote Now',
        },
      ];

      const brandWebsite = profile.website && profile.website.startsWith('http')
        ? profile.website
        : 'https://www.syncsocio.com';

      console.log(`[WhatsApp Templates] Auto-submitting ${SYNCSOCIO_TEMPLATES.length} campaign templates for WABA ${profile.whatsappWABAId}...`);
      for (const tmpl of SYNCSOCIO_TEMPLATES) {
        try {
          const components = [];

          if (tmpl.hasImageHeader) {
            // IMAGE header MUST include example.header_handle — Meta error_subcode 2388043
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

          // Submit with one retry for transient Meta server errors (code 2, is_transient: true)
          let submitted = false;
          for (let attempt = 1; attempt <= 2; attempt++) {
            try {
              await axios.post(
                `https://graph.facebook.com/v21.0/${profile.whatsappWABAId}/message_templates`,
                { name: tmpl.name, language: 'en_US', category: 'MARKETING', components },
                { headers: { Authorization: `Bearer ${accessToken}` } }
              );
              console.log(`[WhatsApp Templates] Submitted: ${tmpl.name}`);
              submitted = true;
              break;
            } catch (tmplErr) {
              const isTransient = tmplErr?.response?.data?.error?.is_transient;
              const errCode = tmplErr?.response?.data?.error?.code;
              const subcode = tmplErr?.response?.data?.error?.error_subcode;
              const msg = tmplErr?.response?.data?.error?.message || '';
              const errTitle = tmplErr?.response?.data?.error?.error_user_title || '';
              if (subcode === 2388040 || subcode === 2388024 || msg.toLowerCase().includes('already exists') || errTitle.toLowerCase().includes('already exists')) {
                console.log(`[WhatsApp Templates] Already exists (skipping): ${tmpl.name}`);
                submitted = true;
                break;
              } else if (isTransient && errCode === 2 && attempt < 2) {
                console.warn(`[WhatsApp Templates] Transient error on ${tmpl.name}, retrying in 2s...`);
                await new Promise(r => setTimeout(r, 2000));
              } else {
                console.error(`[WhatsApp Templates] Failed to submit ${tmpl.name}:`, tmplErr?.response?.data || tmplErr.message);
                break;
              }
            }
          }
        } catch (outerErr) {
          console.error(`[WhatsApp Templates] Error preparing template ${tmpl.name}:`, outerErr.message);
        }
        // Delay between template submissions to avoid Meta rate limits (1s)
        await new Promise(r => setTimeout(r, 1000));
      }
      console.log(`[WhatsApp Templates] Batch submission complete.`);
    }
    // ─────────────────────────────────────────────────────────────────────────

    await profile.save();

    console.log(`[WhatsApp OAuth] Successfully connected WhatsApp. WABA: ${profile.whatsappWABAId}, Phone: ${profile.whatsappPhoneId}`);

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
      params: { fields: 'name,status,category,language', limit: 50 },
      headers: { Authorization: `Bearer ${token}` }
    });

    res.json(result.data);
  } catch (err) {
    console.error('[WhatsApp Templates] Error fetching templates:', err?.response?.data || err.message);
    res.status(500).json({ message: 'Failed to fetch templates.', error: err?.response?.data });
  }
});

export default router;
