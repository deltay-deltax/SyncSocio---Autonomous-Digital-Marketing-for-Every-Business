import BrandProfile from '../models/BrandProfile.js';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

const FB_API_VERSION = 'v25.0';
const FB_API_BASE = `https://graph.facebook.com/${FB_API_VERSION}`;
const IG_WEBHOOK_FIELDS = 'comments,mentions,messages,message_reactions';
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

  const accountsData = await graphGet('me/accounts', {
    fields: 'id,name,access_token,instagram_business_account',
    access_token: userAccessToken,
  });

  if (accountsData?.error) {
    console.error('Failed to resolve page access token:', accountsData.error);
    return '';
  }

  const pages = Array.isArray(accountsData?.data) ? accountsData.data : [];
  const page = pages.find((item) => String(item?.id) === String(pageId));
  return page?.access_token || '';
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

  if (igBusinessAccountId) {
    result.instagram.attempted = true;
    console.log('--- DEBUG: Subscribing Instagram account to webhook fields ---');
    const igSubscribeData = await graphPostForm(`${igBusinessAccountId}/subscribed_apps`, {
      subscribed_fields: IG_WEBHOOK_FIELDS,
      access_token: accessToken,
    });

    if (igSubscribeData?.error) {
      result.instagram.error = igSubscribeData.error;
      console.error('Instagram subscribed_apps failed:', igSubscribeData.error);
    } else {
      result.instagram.ok = true;
      console.log('Instagram subscribed_apps success:', igSubscribeData);
    }

    const igStatusData = await graphGet(`${igBusinessAccountId}/subscribed_apps`, {
      access_token: accessToken,
    });

    if (igStatusData?.error) {
      console.error('Instagram subscribed_apps status check failed:', igStatusData.error);
    } else {
      console.log('Instagram subscribed_apps status:', JSON.stringify(igStatusData));
    }
  }

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

  // Sign a state token containing the user ID
  const state = jwt.sign({ userId }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1h' });
  
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
    'business_management',
    'read_insights',
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

  if (!code || !state) {
    return res.status(400).json({ message: 'Missing code or state' });
  }

  try {
    // 0. Verify state to get userId
    const decoded = jwt.verify(state, process.env.JWT_SECRET || 'fallback_secret');
    const userId = decoded.userId;

    const clientId = process.env.INSTAGRAM_CLIENT_ID;
    const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;
    const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;

    // 1. Exchange code for short-lived access token
    console.log('--- DEBUG: Exchanging short-lived token ---');
    const tokenRes = await fetch(
      `${FB_API_BASE}/oauth/access_token?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${clientSecret}&code=${code}`
    );
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error('Meta Token Exchange Error:', tokenData.error);
      throw new Error(`Meta Error: ${tokenData.error.message}`);
    }

    const shortLivedToken = tokenData.access_token;

    // 2. Exchange short-lived for long-lived access token
    console.log('--- DEBUG: Exchanging long-lived token ---');
    const longLivedRes = await fetch(
      `${FB_API_BASE}/oauth/access_token?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${shortLivedToken}`
    );
    const longLivedData = await longLivedRes.json();
    
    if (longLivedData.error) {
      console.error('Meta Long Lived Token Error:', longLivedData.error);
      throw new Error(`Meta LL Error: ${longLivedData.error.message}`);
    }
    
    const accessToken = longLivedData.access_token;

    // 3. Resilient Discovery: Nested query for accounts and IG accounts
    const meRes = await fetch(`${FB_API_BASE}/me?fields=id,name,accounts{name,id,access_token,instagram_business_account}&access_token=${accessToken}`);
    const profileData = await meRes.json();
    
    if (profileData.error) {
      console.error('Meta Super Discovery Error:', profileData.error);
      throw new Error(`Meta Error: ${profileData.error.message}`);
    }
    
    console.log('--- DEBUG: Discovery Progress ---');
    console.log(`User Identified: ${profileData.name} (ID: ${profileData.id})`);
    
    const allPages = (profileData.accounts && profileData.accounts.data) || [];
    console.log(`Discovery: Found ${allPages.length} potential Facebook pages.`);
    
    allPages.forEach(p => {
      console.log(`- Page: ${p.name} (ID: ${p.id}) | Linked IG: ${p.instagram_business_account ? 'YES' : 'NO'}`);
    });

    // 4. Look for the Instagram Account
    let igBusinessAccountId = null;
    let igUsername = null;
    let igPageId = null;
    let igPageAccessToken = null;

    // Check pages first
    for (const page of allPages) {
      if (page.instagram_business_account) {
        igBusinessAccountId = page.instagram_business_account.id;
        igPageId = page.id;
        igPageAccessToken = page.access_token || null;
        break;
      }
    }

    // Check direct Instagram accounts if pages failed
    if (!igBusinessAccountId && profileData.instagram_business_accounts && profileData.instagram_business_accounts.data.length > 0) {
      console.log('Discovery: Found Instagram account via direct profile scan.');
      igBusinessAccountId = profileData.instagram_business_accounts.data[0].id;
    }

    if (!igBusinessAccountId) {
      throw new Error('No Instagram Business account found. Ensure your Instagram is linked to your Facebook Page and you selected the Page in the login popup.');
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

    await BrandProfile.findOneAndUpdate(
      { user: userId },
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

    const subscriptionResult = await subscribeWebhookTargets({
      accessToken,
      igBusinessAccountId,
      igPageId,
      pageAccessToken: resolvedPageToken,
    });

    console.log('Webhook subscription result:', subscriptionResult);

    // Redirect back to frontend
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/setup?success=true`);

  } catch (error) {
    console.error('Instagram OAuth Error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/setup?error=${encodeURIComponent(error.message)}`);
  }
};

export const resubscribeInstagramWebhooks = async (req, res) => {
  try {
    const profile = await BrandProfile.findOne({ user: req.user._id })
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
    const profile = await BrandProfile.findOne({ user: req.user._id });
    if (!profile) return res.status(404).json({ success: false, message: 'Brand profile not found' });
    
    res.json({
      success: true,
      data: profile.automations || {
        storyMention: { active: false, message: "Hey! 🙌 Thanks so much for tagging us..." },
        defaultReply: { active: false, message: "Hi there! How can we help you today?" }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PATCH /api/instagram/automations/:type
 */
export const updateAutomation = async (req, res) => {
  const { type } = req.params; // storyMention or defaultReply
  const { active, message } = req.body;

  try {
    const profile = await BrandProfile.findOne({ user: req.user._id });
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
    res.status(500).json({ success: false, message: err.message });
  }
};
