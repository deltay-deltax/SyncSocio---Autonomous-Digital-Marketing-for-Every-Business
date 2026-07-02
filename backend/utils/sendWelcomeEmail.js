import sgMail from '@sendgrid/mail';

const SIGNUP_METHOD_LABELS = {
  email: 'Email/Password',
  google: 'Google',
  apple: 'Apple'
};

const PLAN_DETAILS = {
  'Bootstrapper': {
    frequency: 'Once a week',
    formats: 'Static only',
    postsPerMonth: '4 posts/month'
  },
  'SyncSocio Starter': {
    frequency: '3-4x a week',
    formats: 'Static + Carousels',
    postsPerMonth: '16 posts/month'
  },
  'SyncSocio Pro': {
    frequency: 'Daily',
    formats: 'Static + Carousels + Reels',
    postsPerMonth: '30 posts/month'
  },
  'Empire': {
    frequency: 'Daily',
    formats: 'All content types',
    postsPerMonth: '30+ posts/month'
  }
};

const resolveSignupMethodLabel = (provider) => {
  return SIGNUP_METHOD_LABELS[provider] || provider || 'Email/Password';
};

const resolvePlanDetails = (selectedPlan) => PLAN_DETAILS[selectedPlan] || null;

export const sendSignupWelcomeEmail = async ({ to, name, provider, plan }) => {
  if (!process.env.SENDGRID_API_KEY) {
    throw new Error('SENDGRID_API_KEY is missing for welcome email delivery.');
  }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  const userName = name?.trim() || 'there';
  const signupMethod = resolveSignupMethodLabel(provider);
  const selectedPlan = plan?.trim() || 'Not selected yet';
  const selectedPlanDetails = resolvePlanDetails(selectedPlan);
  const frontendBaseUrl = (process.env.FRONTEND_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
  const onboardingUrl = `${frontendBaseUrl}/onboarding`;

  const textPlanDetails = selectedPlanDetails
    ? [
        `Plan frequency: ${selectedPlanDetails.frequency}`,
        `Formats included: ${selectedPlanDetails.formats}`,
        `Posting volume: ${selectedPlanDetails.postsPerMonth}`,
      ]
    : [];

  const textBody = [
    `Welcome to SyncSocio, ${userName}!`,
    '',
    'Thanks for joining SyncSocio. We are excited to help you grow your brand.',
    `Signup method: ${signupMethod}`,
    `Selected plan: ${selectedPlan}`,
    ...textPlanDetails,
    '',
    `Continue setup: ${onboardingUrl}`,
  ].join('\n');

  const htmlPlanDetails = selectedPlanDetails
    ? `
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 14px; margin-bottom: 22px;">
            <p style="margin: 0 0 6px; color: #1e3a8a; font-size: 14px;"><strong>Plan frequency:</strong> ${selectedPlanDetails.frequency}</p>
            <p style="margin: 0 0 6px; color: #1e3a8a; font-size: 14px;"><strong>Formats included:</strong> ${selectedPlanDetails.formats}</p>
            <p style="margin: 0; color: #1e3a8a; font-size: 14px;"><strong>Posting volume:</strong> ${selectedPlanDetails.postsPerMonth}</p>
          </div>
      `
    : '';

  const msg = {
    to,
    from: `SyncSocio <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
    subject: `Welcome to SyncSocio, ${userName}!`,
    text: textBody,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 560px; margin: 0 auto; padding: 20px; background-color: #f3f6fb; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 18px;">
          <h1 style="margin: 0; color: #1d4ed8; font-size: 30px; font-weight: 800; letter-spacing: -0.4px;">SyncSocio</h1>
        </div>
        <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 30px; box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);">
          <h2 style="color: #111827; font-size: 24px; margin: 0 0 12px;">Welcome aboard, ${userName}!</h2>
          <p style="color: #4b5563; font-size: 15px; line-height: 1.7; margin: 0 0 20px;">
            Thanks for joining SyncSocio. We are excited to help you build and grow your brand with AI-powered strategy and execution.
          </p>

          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; margin-bottom: 22px;">
            <p style="margin: 0 0 8px; color: #374151; font-size: 14px;"><strong>Signup method:</strong> ${signupMethod}</p>
            <p style="margin: 0; color: #374151; font-size: 14px;"><strong>Selected plan:</strong> ${selectedPlan}</p>
          </div>

          ${htmlPlanDetails}

          <p style="color: #4b5563; font-size: 15px; line-height: 1.7; margin: 0 0 24px;">
            Your account is ready. You can continue your onboarding and start building your content engine right away.
          </p>

          <div style="text-align: center; margin-bottom: 10px;">
            <a href="${onboardingUrl}" style="display: inline-block; text-decoration: none; background: #2563eb; color: #ffffff; padding: 12px 22px; border-radius: 8px; font-size: 14px; font-weight: 600;">
              Continue Setup
            </a>
          </div>
        </div>
        <p style="margin: 14px 0 0; text-align: center; color: #9ca3af; font-size: 12px;">
          &copy; ${new Date().getFullYear()} SyncSocio. All rights reserved.
        </p>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log(`Welcome email correctly dispatched to ${to}`);
  } catch (error) {
    console.error(`Failed to send welcome email to ${to}:`, error.response?.body || error);
    throw error;
  }
};

export const sendSignupNotificationEmail = async ({ to, name, provider }) => {
  if (!process.env.SENDGRID_API_KEY) {
    throw new Error('SENDGRID_API_KEY is missing for signup notification email delivery.');
  }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  const userName = name?.trim() || 'there';
  const signupMethod = resolveSignupMethodLabel(provider);
  const frontendBaseUrl = (process.env.FRONTEND_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
  const onboardingUrl = `${frontendBaseUrl}/onboarding`;

  const textBody = [
    `Welcome to SyncSocio, ${userName}!`,
    '',
    'Thanks for joining SyncSocio. Your email has been verified successfully.',
    `Signup method: ${signupMethod}`,
    '',
    'You can now continue your onboarding and start building your content engine.',
    `Continue setup: ${onboardingUrl}`,
  ].join('\n');

  const msg = {
    to,
    from: `SyncSocio <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
    subject: `Welcome to SyncSocio, ${userName}!`,
    text: textBody,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 560px; margin: 0 auto; padding: 20px; background-color: #f3f6fb; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 18px;">
          <h1 style="margin: 0; color: #1d4ed8; font-size: 30px; font-weight: 800; letter-spacing: -0.4px;">SyncSocio</h1>
        </div>
        <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 30px; box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);">
          <h2 style="color: #111827; font-size: 24px; margin: 0 0 12px;">Welcome aboard, ${userName}!</h2>
          <p style="color: #4b5563; font-size: 15px; line-height: 1.7; margin: 0 0 20px;">
            Thanks for joining SyncSocio. Your email has been verified successfully. We are excited to help you build and grow your brand with AI-powered strategy and execution.
          </p>

          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; margin-bottom: 22px;">
            <p style="margin: 0; color: #374151; font-size: 14px;"><strong>Signup method:</strong> ${signupMethod}</p>
          </div>

          <p style="color: #4b5563; font-size: 15px; line-height: 1.7; margin: 0 0 24px;">
            Your account is ready. You can continue your onboarding and start building your content engine right away.
          </p>

          <div style="text-align: center; margin-bottom: 10px;">
            <a href="${onboardingUrl}" style="display: inline-block; text-decoration: none; background: #2563eb; color: #ffffff; padding: 12px 22px; border-radius: 8px; font-size: 14px; font-weight: 600;">
              Continue Setup
            </a>
          </div>
        </div>
        <p style="margin: 14px 0 0; text-align: center; color: #9ca3af; font-size: 12px;">
          &copy; ${new Date().getFullYear()} SyncSocio. All rights reserved.
        </p>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
  } catch (error) {
    console.error(`Failed to send signup notification:`, error.response?.body || error);
  }
};

export const sendLoginNotificationEmail = async ({ to, name }) => {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('SENDGRID_API_KEY missing. Admin login notification skipped.');
    return;
  }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  const userName = name?.trim() || 'there';

  const textBody = [
    `Hello ${userName},`,
    '',
    'Thank you for logging in to SyncSocio. We hope you have a great experience building your brand.',
    '',
    'If you have any questions, feel free to reach out.',
    '',
    'Best regards,',
    'The SyncSocio Team'
  ].join('\n');

  const msg = {
    to,
    from: `SyncSocio <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
    subject: `Welcome back to SyncSocio, ${userName}!`,
    text: textBody,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 560px; margin: 0 auto; padding: 20px; background-color: #f3f6fb; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 18px;">
          <h1 style="margin: 0; color: #1d4ed8; font-size: 30px; font-weight: 800; letter-spacing: -0.4px;">SyncSocio</h1>
        </div>
        <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 30px; box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);">
          <h2 style="color: #111827; font-size: 24px; margin: 0 0 12px;">Welcome back, ${userName}!</h2>
          <p style="color: #4b5563; font-size: 15px; line-height: 1.7; margin: 0 0 20px;">
            Thank you for logging in to SyncSocio. We hope you have a great experience building your brand.
          </p>
          <p style="color: #4b5563; font-size: 15px; line-height: 1.7; margin: 0;">
            If you have any questions, feel free to reach out.
          </p>
        </div>
        <p style="margin: 14px 0 0; text-align: center; color: #9ca3af; font-size: 12px;">
          &copy; ${new Date().getFullYear()} SyncSocio. All rights reserved.
        </p>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
  } catch (error) {
    console.error(`Failed to send admin login notification for ${to}:`, error.response?.body || error);
  }
};
