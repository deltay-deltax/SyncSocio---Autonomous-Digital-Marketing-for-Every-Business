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
          // If manual OAuth, use the exact redirect URI the frontend used. Otherwise, use the explorer URL for embedded signup.
          redirect_uri: isManualOAuth ? redirectUri : 'https://developers.facebook.com/tools/explorer',
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
      
      if (waMgmtScope && waMgmtScope.target_ids && waMgmtScope.target_ids.length > 0) {
        resolvedWabaId = waMgmtScope.target_ids[0];
        console.log(`[WhatsApp OAuth] Resolved WABA ID via debug_token: ${resolvedWabaId}`);
      }

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

      // 3. Fetch phone numbers for the resolved WABA ID
      if (resolvedWabaId) {
        console.log(`[WhatsApp OAuth] Fetching phone numbers for WABA: ${resolvedWabaId}...`);
        const phoneRes = await axios.get(`https://graph.facebook.com/v21.0/${resolvedWabaId}/phone_numbers`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });

        const phoneData = phoneRes.data?.data || [];
        if (phoneData.length > 0) {
          resolvedPhoneId = phoneData[0].id;
          resolvedPhoneNumber = phoneData[0].display_phone_number || '';
          console.log(`[WhatsApp OAuth] Successfully resolved Phone ID: ${resolvedPhoneId}, Number: ${resolvedPhoneNumber}`);
        }
      }
    } catch (graphErr) {
      console.error('[WhatsApp OAuth] Failed to auto-resolve WABA/Phone IDs from Graph API:', graphErr?.response?.data || graphErr.message);
    }

    profile.whatsappIsConnected = true;
    profile.whatsappAccessToken = accessToken;
    profile.whatsappPhoneId = resolvedPhoneId || phoneNumberId || 'pending_setup';
    profile.whatsappWABAId = resolvedWabaId || wabaId || '';
    if (resolvedPhoneNumber) {
      profile.whatsappNumber = resolvedPhoneNumber;
    }

    // Auto-create general template upon connect
    if (profile.whatsappWABAId) {
      try {
        console.log(`[WhatsApp Template] Auto-creating 'velocity_campaign_generic' template for WABA: ${profile.whatsappWABAId}...`);
        
        const btnText = (profile.brandName ? `${profile.brandName} now` : 'Visit Website')
          .replace(/[^\w\s]/gi, '')
          .trim()
          .substring(0, 25) || 'Visit Website';

        let btnUrl = profile.website && profile.website.startsWith('http')
          ? profile.website
          : 'https://www.syncsocio.com';

        // Obtain a real sample media handle from Meta's Resumable Upload API
        const appId = process.env.INSTAGRAM_CLIENT_ID || process.env.FB_APP_ID || '1491990322515220';
        let sampleHandle = null;

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
          name: "velocity_campaign_generic",
          language: "en",
          category: "MARKETING",
          components: templateComponents
        };

        await axios.post(
          `https://graph.facebook.com/v21.0/${profile.whatsappWABAId}/message_templates`,
          templatePayload,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        console.log(`[WhatsApp Template] Successfully created template for WABA: ${profile.whatsappWABAId}`);
      } catch (tmplErr) {
        const errorDetail = tmplErr?.response?.data?.error;
        if (errorDetail && errorDetail.code === 100 && errorDetail.error_subcode === 2388040) {
          console.log(`[WhatsApp Template] Template 'velocity_campaign_generic' already exists.`);
        } else {
          console.error('[WhatsApp Template] Failed to auto-create primary template:', tmplErr?.response?.data || tmplErr.message);
          
          // Fallback: Create text-only template if image header template failed
          try {
            console.log(`[WhatsApp Template] Creating fallback text template 'velocity_campaign_text'...`);
            const fallbackPayload = {
              name: "velocity_campaign_text",
              language: "en",
              category: "MARKETING",
              components: [
                {
                  type: "BODY",
                  text: "Hey! Check this out 👇\n\n{{1}}\n\nPowered by SyncSocio",
                  example: { body_text: [["Check out our exclusive Diwali offer on MuscleBlaze supplements!"]] }
                },
                { type: "FOOTER", text: "T&C apply. Reply STOP to unsubscribe." }
              ]
            };
            await axios.post(
              `https://graph.facebook.com/v21.0/${profile.whatsappWABAId}/message_templates`,
              fallbackPayload,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            console.log(`[WhatsApp Template] Successfully created fallback template 'velocity_campaign_text'.`);
          } catch (fbErr) {
            console.error('[WhatsApp Template] Fallback template creation error:', fbErr?.response?.data || fbErr.message);
          }
        }
      }
    }

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

export default router;
