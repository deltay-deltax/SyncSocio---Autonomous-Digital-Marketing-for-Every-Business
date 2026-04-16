import BrandProfile from '../models/BrandProfile.js';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

const FB_API_VERSION = 'v25.0';
const FB_API_BASE = `https://graph.facebook.com/${FB_API_VERSION}`;

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
    'pages_show_list',
    'pages_read_engagement',
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
    const meRes = await fetch(`${FB_API_BASE}/me?fields=id,name,accounts{name,id,instagram_business_account}&access_token=${accessToken}`);
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

    // Check pages first
    for (const page of allPages) {
      if (page.instagram_business_account) {
        igBusinessAccountId = page.instagram_business_account.id;
        igPageId = page.id;
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

    await BrandProfile.findOneAndUpdate(
      { user: userId },
      {
        instagramAccessToken: accessToken,
        instagramBusinessAccountId: igBusinessAccountId,
        instagramPageId: igPageId,
        instagramUsername: igUsername,
        instagramProfilePicture: igProfilePicture,
        instagramIsConnected: true
      },
      { new: true, upsert: true }
    );

    // Redirect back to frontend
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/setup?success=true`);

  } catch (error) {
    console.error('Instagram OAuth Error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/setup?error=${encodeURIComponent(error.message)}`);
  }
};
