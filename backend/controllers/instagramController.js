import BrandProfile from '../models/BrandProfile.js';
import User from '../models/User.js';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { runMetricsFetch } from '../services/metricsPoller.js';

dotenv.config();

const FB_API_VERSION = 'v19.0';
const FB_API_BASE = `https://graph.facebook.com/${FB_API_VERSION}`;
const PAGE_WEBHOOK_FIELDS = 'feed,messages';

const graphGet = async (path, params = {}) => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      query.append(key, String(value));
    }
  }

  const url = `${FB_API_BASE}/${path}${query.toString() ? `?${query.toString()}` : ''}`;
  const response = await fetch(url);
  return response.json();
};

const graphPostForm = async (path, params = {}) => {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      body.append(key, String(value));
    }
  }

  const response = await fetch(`${FB_API_BASE}/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  return response.json();
};

const resolvePageAccessToken = async ({ userAccessToken, pageId }) => {
  if (!userAccessToken || !pageId) {
    return '';
  }

  // Tier 1: direct /me/accounts
  const accountsData = await graphGet('me/accounts', {
    fields: 'id,name,access_token,instagram_business_account',
    access_token: userAccessToken,
  });

  if (!accountsData?.error) {
    const pages = Array.isArray(accountsData?.data) ? accountsData.data : [];
    const page = pages.find((item) => String(item?.id) === String(pageId));
    if (page?.access_token) {
      console.log(`resolvePageAccessToken: Found token via /me/accounts for page ${pageId}`);
      return page.access_token;
    }
  } else {
    console.error('resolvePageAccessToken /me/accounts failed:', accountsData.error);
  }

  // Tier 2: Business Manager owned_pages
  console.log(`resolvePageAccessToken: Falling back to BM discovery for page ${pageId}...`);
  try {
    const bizData = await graphGet('me/businesses', {
      fields: 'id,owned_pages{id,access_token}',
      access_token: userAccessToken,
    });
    if (!bizData?.error) {
      for (const biz of (bizData.data || [])) {
        const bmPage = (biz.owned_pages?.data || []).find((p) => String(p.id) === String(pageId));
        if (bmPage?.access_token) {
          console.log(`resolvePageAccessToken: Found token via BM (${biz.id}) for page ${pageId}`);
          return bmPage.access_token;
        }
      }
    }
  } catch (e) {
    console.warn('resolvePageAccessToken BM fallback failed:', e.message);
  }

  console.warn(`resolvePageAccessToken: Could not find a token for page ${pageId} via any method.`);
  return '';
};

const subscribeWebhookTargets = async ({ accessToken, igBusinessAccountId, igPageId, pageAccessToken }) => {
  const result = {
    instagram: { attempted: false, ok: false, error: null },
    page: { attempted: false, ok: false, error: null },
  };

  if (!accessToken) {
    result.instagram.error = 'Missing access token';
    result.page.error = 'Missing access token';
    return result;
  }

  // For Instagram Messaging, we only need to subscribe at the Page level.
  // The Instagram Business Account level subscription is often restricted and unnecessary.
  result.instagram.attempted = false;
  result.instagram.ok = true;

  if (igPageId) {
    result.page.attempted = true;

    if (!pageAccessToken) {
      result.page.error = {
        message: 'Missing page access token. Cannot subscribe page webhook fields.',
        code: 210,
      };
      console.error('Page subscribed_apps failed: missing page access token');
      return result;
    }

    console.log('--- DEBUG: Subscribing Facebook Page to webhook fields ---');
    const pageSubscribeData = await graphPostForm(`${igPageId}/subscribed_apps`, {
      subscribed_fields: PAGE_WEBHOOK_FIELDS,
      access_token: pageAccessToken,
    });

    if (pageSubscribeData?.error) {
      result.page.error = pageSubscribeData.error;
      console.error('Page subscribed_apps failed:', pageSubscribeData.error);
    } else {
      result.page.ok = true;
      console.log('Page subscribed_apps success:', pageSubscribeData);
    }

    const pageStatusData = await graphGet(`${igPageId}/subscribed_apps`, {
      access_token: pageAccessToken,
    });

    if (pageStatusData?.error) {
      console.error('Page subscribed_apps status check failed:', pageStatusData.error);
    } else {
      console.log('Page subscribed_apps status:', JSON.stringify(pageStatusData));
    }
  }

  return result;
};

/**
 * Get the Facebook Login URL for Instagram Graph API
 */
export const getInstagramAuthUrl = (req, res) => {
  const clientId = process.env.INSTAGRAM_CLIENT_ID;
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;
  const userId = req.user.id;

  const { relink } = req.query;
  // Sign a state token containing the user ID and relink flag
  const state = jwt.sign({ userId, relink: relink === 'true' }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1h' });
  
  // Scopes needed for Instagram Graph API (Business/Creator)
  const scopes = [
    'instagram_basic',
    'instagram_content_publish',
    'instagram_manage_comments',
    'instagram_manage_messages',
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_engagement',
    'pages_manage_metadata',
    'pages_read_user_content',
    'pages_manage_posts',
    'pages_messaging',
    'pages_messaging_subscriptions',
    'business_management',
    'instagram_manage_insights',
    'public_profile'
  ].join(',');

  const authUrl = `https://www.facebook.com/${FB_API_VERSION}/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&response_type=code&state=${state}`;

  res.json({ url: authUrl });
};

/**
 * Handle the callback from Meta, exchange code for tokens, and save to DB
 */
export const instagramCallback = async (req, res) => {
  const { code, state } = req.query;
  console.log('--- 🛡️ INSTAGRAM CALLBACK START ---');
  console.log('Query Params:', { code: code ? 'PRESENT' : 'MISSING', state: state ? 'PRESENT' : 'MISSING' });

  if (!code || !state) {
    console.error('❌ Callback failed: Missing code or state');
    return res.status(400).json({ message: 'Missing code or state' });
  }

  try {
    // 0. Verify state to get userId
    const decoded = jwt.verify(state, process.env.JWT_SECRET || 'fallback_secret');
    const userId = decoded.userId;
    const isRelink = decoded.relink === true;
    console.log('✅ State verified. User ID:', userId, 'Relink:', isRelink);

    const clientId = process.env.INSTAGRAM_CLIENT_ID;
    const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;
    const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;

    console.log(`📡 DEBUG: Using Client ID: ${clientId}`);
    console.log(`📡 DEBUG: Using Redirect URI: ${redirectUri}`);

    // 1. Exchange code for short-lived access token
    console.log('📡 Exchanging code for short-lived token...');
    const tokenRes = await fetch(
      `${FB_API_BASE}/oauth/access_token?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${clientSecret}&code=${code}`
    );
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error('❌ Meta Token Exchange Error:', tokenData.error);
      throw new Error(`Meta Error: ${tokenData.error.message}`);
    }

    const shortLivedToken = tokenData.access_token;
    console.log('✅ Short-lived token received');

    // 2. Exchange short-lived for long-lived access token
    console.log('📡 Exchanging for long-lived token...');
    const longLivedRes = await fetch(
      `${FB_API_BASE}/oauth/access_token?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${shortLivedToken}`
    );
    const longLivedData = await longLivedRes.json();
    
    if (longLivedData.error) {
      console.error('❌ Meta Long Lived Token Error:', longLivedData.error);
      throw new Error(`Meta LL Error: ${longLivedData.error.message}`);
    }
    
    const accessToken = longLivedData.access_token;
    console.log('✅ Long-lived token received');

    // 3. Resilient Discovery: Tier 1 — personal /me/accounts
    console.log('📡 Starting discovery of Pages and IG accounts...');
    const meRes = await fetch(`${FB_API_BASE}/me?fields=id,name,accounts{name,id,access_token,instagram_business_account}&access_token=${accessToken}`);
    const profileData = await meRes.json();
    
    if (profileData.error) {
      console.error('❌ Meta Super Discovery Error:', profileData.error);
      throw new Error(`Meta Error: ${profileData.error.message}`);
    }
    
    console.log('--- 🔍 DISCOVERY RESULTS ---');
    console.log(`User Identified: ${profileData.name} (ID: ${profileData.id})`);
    console.log('📋 Raw accounts field from Meta:', JSON.stringify(profileData.accounts || null));
    
    let allPages = (profileData.accounts && profileData.accounts.data) || [];
    console.log(`Tier 1 (/me/accounts): Found ${allPages.length} personal-admin pages.`);
    allPages.forEach(p => {
      console.log(`- Page: ${p.name} (ID: ${p.id}) | Linked IG: ${p.instagram_business_account ? `YES (${p.instagram_business_account.id})` : 'NO'} | Has Page Token: ${Boolean(p.access_token)}`);
    });

    // Tier 2 — Business Manager owned pages (handles BM-managed pages which /me/accounts misses)
    if (allPages.length === 0) {
      console.log('⚠️  No personal pages found. Trying Tier 2: Business Manager discovery...');
      try {
        const bizRes = await fetch(`${FB_API_BASE}/me/businesses?fields=id,name,owned_pages{name,id,access_token,instagram_business_account}&access_token=${accessToken}`);
        const bizData = await bizRes.json();

        if (bizData.error) {
          console.warn('⚠️  Business Manager query failed:', bizData.error.message);
        } else {
          const businesses = (bizData.data) || [];
          console.log(`Tier 2 (/me/businesses): Found ${businesses.length} Business Manager(s).`);
          for (const biz of businesses) {
            console.log(`  Business: ${biz.name} (ID: ${biz.id})`);
            const bmPages = (biz.owned_pages && biz.owned_pages.data) || [];
            console.log(`  -> ${bmPages.length} owned page(s) in this BM.`);
            bmPages.forEach(p => {
              console.log(`     - Page: ${p.name} (ID: ${p.id}) | Linked IG: ${p.instagram_business_account ? `YES (${p.instagram_business_account.id})` : 'NO'}`);
            });
            allPages = allPages.concat(bmPages);
          }
          console.log(`Tier 2 total pages found: ${allPages.length}`);
        }
      } catch (bizErr) {
        console.warn('⚠️  Business Manager discovery threw an exception:', bizErr.message);
      }
    }

    // 4. Look for the Instagram Account
    let igBusinessAccountId = null;
    let igUsername = null;
    let igPageId = null;
    let igPageAccessToken = null;

    // Check pages (from both Tier 1 and Tier 2)
    for (const page of allPages) {
      if (page.instagram_business_account) {
        igBusinessAccountId = page.instagram_business_account.id;
        igPageId = page.id;
        igPageAccessToken = page.access_token || null;
        console.log(`✅ Found IG Business Account ${igBusinessAccountId} via Page: ${page.name} (${page.id})`);
        break;
      }
    }

    // Tier 3 — direct instagram_business_accounts on the user profile (legacy fallback)
    if (!igBusinessAccountId && profileData.instagram_business_accounts && profileData.instagram_business_accounts.data && profileData.instagram_business_accounts.data.length > 0) {
      console.log('Discovery Tier 3: Found Instagram account via direct profile scan.');
      igBusinessAccountId = profileData.instagram_business_accounts.data[0].id;
    }

    if (!igBusinessAccountId) {
      const debugInfo = allPages.length === 0
        ? 'No Facebook Pages were returned by Meta — the user did not grant page access during the login popup.'
        : `${allPages.length} Facebook Page(s) found but none have an Instagram Business account linked.`;
      console.error(`❌ IG Discovery Failed: ${debugInfo}`);
      throw new Error(
        allPages.length === 0
          ? 'No Facebook Pages were shared with SyncSocio. Please reconnect and make sure to SELECT your Facebook Page when the login popup asks \'What pages do you want to use?\'.'
          : 'Your Facebook Page was found but has no Instagram Business account linked. Please go to your Facebook Page settings and connect your Instagram account there first.'
      );
    }

    // 5. Get Instagram Username and Profile Picture
    const igUserRes = await fetch(`${FB_API_BASE}/${igBusinessAccountId}?fields=username,profile_picture_url&access_token=${accessToken}`);
    const igUserData = await igUserRes.json();
    igUsername = igUserData.username;
    const igProfilePicture = igUserData.profile_picture_url;

    const resolvedPageToken = igPageAccessToken || await resolvePageAccessToken({
      userAccessToken: accessToken,
      pageId: igPageId,
    });

    console.log(`--- PAGE TOKEN DEBUG ---`);
    console.log(`igPageAccessToken from discovery: ${Boolean(igPageAccessToken)}`);
    console.log(`resolvedPageToken final: ${Boolean(resolvedPageToken)}`);

    const userDoc = await User.findById(userId).select('activeBrandId');
    const brandFilter = userDoc?.activeBrandId 
      ? { user: userId, _id: userDoc.activeBrandId }
      : { user: userId };

    await BrandProfile.findOneAndUpdate(
      brandFilter,
      {
        instagramAccessToken: accessToken,
        instagramPageAccessToken: resolvedPageToken || '',
        instagramBusinessAccountId: igBusinessAccountId,
        instagramPageId: igPageId,
        instagramUsername: igUsername,
        instagramProfilePicture: igProfilePicture,
        instagramIsConnected: true
      },
      { returnDocument: 'after', upsert: true }
    );

    // Trigger metrics poller for this brand immediately so analytics populate instantly
    setImmediate(() => {
      console.log('🚀 Triggering immediate metrics fetch for newly connected brand');
      runMetricsFetch().catch(e => console.error('Immediate metrics fetch failed:', e));
    });

    const subscriptionResult = await subscribeWebhookTargets({
      accessToken,
      igBusinessAccountId,
      igPageId,
      pageAccessToken: resolvedPageToken,
    });

    console.log('Webhook subscription result:', subscriptionResult);
    
    const { createNotification } = await import('../utils/notificationHelper.js');
    if (isRelink) {
      await createNotification(
        userId,
        'success',
        'Instagram Reconnected Successfully! 🚀',
        'Your connection to Meta has been updated and all systems are online.'
      );
    }

    // Redirect back to frontend
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const targetPath = isRelink ? '/dashboard?relinked=true' : '/setup?success=true';
    res.redirect(`${frontendUrl}${targetPath}`);

  } catch (error) {
    console.error('Instagram OAuth Error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    // If it was a relink attempt, go back to dashboard settings on error
    const decoded = jwt.decode(req.query.state);
    const errorPath = decoded?.relink ? '/dashboard/settings?error=' : '/setup?error=';
    res.redirect(`${frontendUrl}${errorPath}${encodeURIComponent(error.message)}`);
  }
};

export const resubscribeInstagramWebhooks = async (req, res) => {
  try {
    const profile = await BrandProfile.findOne({ user: req.user._id, _id: req.user.activeBrandId }) || await BrandProfile.findOne({ user: req.user._id })
      .select('instagramAccessToken instagramBusinessAccountId instagramPageId instagramIsConnected')
      .lean();

    if (!profile?.instagramIsConnected) {
      return res.status(400).json({ message: 'Instagram is not connected for this account.' });
    }

    if (!profile.instagramAccessToken || !profile.instagramBusinessAccountId) {
      return res.status(400).json({ message: 'Missing Instagram token or business account id on profile.' });
    }

    const pageAccessToken = await resolvePageAccessToken({
      userAccessToken: profile.instagramAccessToken,
      pageId: profile.instagramPageId,
    });

    const subscriptionResult = await subscribeWebhookTargets({
      accessToken: profile.instagramAccessToken,
      igBusinessAccountId: profile.instagramBusinessAccountId,
      igPageId: profile.instagramPageId,
      pageAccessToken,
    });

    return res.status(200).json({
      message: 'Resubscribe attempted. Check server logs for provider-level details.',
      subscriptionResult,
    });
  } catch (error) {
    console.error('Instagram resubscribe error:', error);
    return res.status(500).json({ message: 'Failed to resubscribe webhook targets.' });
  }
};

/**
 * GET /api/instagram/automations
 */
export const getAutomations = async (req, res) => {
  try {
    const profile = await BrandProfile.findOne({ user: req.user._id, _id: req.user.activeBrandId }) || await BrandProfile.findOne({ user: req.user._id });
    if (!profile) return res.status(404).json({ success: false, message: 'Brand profile not found' });
    
    res.json({
      success: true,
      data: profile.automations || {
        storyMention: { active: false, message: "Hey! 🙌 Thanks so much for tagging us..." },
        defaultReply: { active: false, message: "Hi there! How can we help you today?" }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  }
};

/**
 * PATCH /api/instagram/automations/:type
 */
export const updateAutomation = async (req, res) => {
  const { type } = req.params; // storyMention or defaultReply
  const { active, message } = req.body;

  try {
    const profile = await BrandProfile.findOne({ user: req.user._id, _id: req.user.activeBrandId }) || await BrandProfile.findOne({ user: req.user._id });
    if (!profile) return res.status(404).json({ success: false, message: 'Brand profile not found' });

    if (!profile.automations) profile.automations = {};
    if (!profile.automations[type]) profile.automations[type] = {};

    if (active !== undefined) profile.automations[type].active = active;
    if (message !== undefined) profile.automations[type].message = message;

    profile.markModified('automations');
    await profile.save();
    
    console.log(`[AUTOMATION] Updated ${type}: active=${active}, msgLength=${message?.length || 'no-change'}`);
    res.json({ success: true, data: profile.automations[type] });
  } catch (err) {
    console.error('[AUTOMATION] Update failed:', err);
    res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  }
};

/**
 * DELETE /api/auth/instagram/disconnect
 * POST /api/auth/instagram/disconnect
 * Disconnects the Instagram account from the user's active brand profile.
 */
export const disconnectInstagram = async (req, res) => {
  try {
    const profile = await BrandProfile.findOne({
      user: req.user._id,
      ...(req.user.activeBrandId ? { _id: req.user.activeBrandId } : {})
    }) || await BrandProfile.findOne({ user: req.user._id });

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Brand profile not found.' });
    }

    profile.instagramIsConnected = false;
    profile.instagramAccessToken = '';
    profile.instagramPageAccessToken = '';
    profile.instagramBusinessAccountId = '';
    profile.instagramPageId = '';
    profile.instagramUsername = '';
    profile.instagramProfilePicture = '';
    await profile.save();

    console.log(`[Instagram Disconnect] Disconnected Instagram for user: ${req.user._id}, brand: ${profile.brandName || profile._id}`);

    res.json({
      success: true,
      message: 'Instagram account disconnected successfully.',
      profile
    });
  } catch (err) {
    console.error('[Instagram Disconnect] Error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to disconnect Instagram account.' });
  }
};

