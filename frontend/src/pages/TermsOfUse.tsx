import { useLocation, useNavigate } from 'react-router-dom';
import { FileText, ArrowLeft } from 'lucide-react';

const TermsOfUse = () => {
  const updatedOn = '20 April 2026';

  const navigate = useNavigate();
  const location = useLocation();
  const fromSettings = location.state?.from === 'settings';

  const handleBack = () => {
    if (fromSettings) {
      navigate('/dashboard/settings');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/10 text-foreground">
      <div className="mx-auto w-full max-w-4xl px-6 py-10 md:py-14">
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={14} /> {fromSettings ? "Back To Settings" : "Back To Home"}
        </button>

        <div className="mt-6 rounded-3xl border border-border/60 bg-card/90 p-7 shadow-sm md:p-10">
          <div className="flex items-start gap-3">
            <div className="mt-1 rounded-xl bg-primary/10 p-2 text-primary">
              <FileText size={18} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight md:text-3xl">Velocity Terms of Use</h1>
              <p className="mt-1 text-sm text-muted-foreground">Last updated: {updatedOn}</p>
            </div>
          </div>

          <div className="mt-8 space-y-7 text-sm leading-7 text-muted-foreground">
            <section>
              <h2 className="text-base font-black uppercase tracking-wider text-foreground">1. Acceptance Of Terms</h2>
              <p className="mt-2">
                These Terms govern your access to and use of Velocity, an AI-powered digital marketing automation
                platform for social channels. By creating an account, connecting Instagram, or using Velocity services,
                you agree to these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-base font-black uppercase tracking-wider text-foreground">2. Service Scope</h2>
              <p className="mt-2">
                Velocity provides workflows including brand onboarding, AI-assisted content generation, Instagram DM
                automation, comment-triggered messaging, story mention replies, post analytics, and performance
                insight recommendations.
              </p>
              <p className="mt-2">
                Some features depend on third-party platform APIs, especially Meta/Instagram Graph API availability,
                permissions, and account status.
              </p>
            </section>

            <section>
              <h2 className="text-base font-black uppercase tracking-wider text-foreground">3. Account Eligibility And Security</h2>
              <p className="mt-2">
                You must provide accurate information and maintain security of your account credentials. You are
                responsible for all activity under your account and connected social identities.
              </p>
            </section>

            <section>
              <h2 className="text-base font-black uppercase tracking-wider text-foreground">4. Connected Platform Authorization</h2>
              <p className="mt-2">
                By connecting Instagram or related Meta assets, you authorize Velocity to access approved scopes
                (such as reading profile/media details, insights, messages, and webhooks) strictly for providing
                configured automation and analytics features.
              </p>
              <p className="mt-2">
                You represent that you own or are authorized to manage any social accounts connected to Velocity.
              </p>
            </section>

            <section>
              <h2 className="text-base font-black uppercase tracking-wider text-foreground">5. User Responsibilities And Acceptable Use</h2>
              <p className="mt-2">
                You agree not to use Velocity for unlawful, deceptive, harassing, spam, or rights-infringing content
                and campaigns. You are responsible for the legality and accuracy of generated or published content,
                including promotions, claims, links, and disclosures.
              </p>
              <p className="mt-2">
                You must comply with platform rules, including Meta messaging windows, rate limits, and policy
                requirements for automation.
              </p>
            </section>

            <section>
              <h2 className="text-base font-black uppercase tracking-wider text-foreground">6. AI Outputs And Performance</h2>
              <p className="mt-2">
                AI-generated suggestions and automation outcomes may vary. Velocity does not guarantee any specific
                growth, reach, conversion, follower count, or revenue result.
              </p>
              <p className="mt-2">
                You should review content where needed before publication and maintain human oversight appropriate to
                your brand and regulatory environment.
              </p>
            </section>

            <section>
              <h2 className="text-base font-black uppercase tracking-wider text-foreground">7. Intellectual Property</h2>
              <p className="mt-2">
                You retain ownership of your brand assets and content you provide. Velocity and its software,
                interfaces, workflow logic, and product branding remain proprietary to Velocity and its licensors.
              </p>
            </section>

            <section>
              <h2 className="text-base font-black uppercase tracking-wider text-foreground">8. Third-Party Services</h2>
              <p className="mt-2">
                Velocity integrates with third-party providers including Meta platforms. Their separate terms,
                policies, outages, and API changes may affect feature behavior. Velocity is not responsible for
                third-party downtime or policy enforcement actions.
              </p>
            </section>

            <section>
              <h2 className="text-base font-black uppercase tracking-wider text-foreground">9. Fees, Suspension, And Termination</h2>
              <p className="mt-2">
                Paid plans, if applicable, are billed under the pricing terms shown at purchase. We may suspend or
                terminate access for policy abuse, non-payment, security issues, or legal compliance reasons.
              </p>
            </section>

            <section>
              <h2 className="text-base font-black uppercase tracking-wider text-foreground">10. Disclaimer And Liability Limits</h2>
              <p className="mt-2">
                Velocity is provided on an "as is" and "as available" basis. To the maximum extent permitted by law,
                Velocity disclaims warranties and is not liable for indirect, incidental, special, consequential,
                reputational, or data-loss damages, or for lost profits arising from service use.
              </p>
            </section>

            <section>
              <h2 className="text-base font-black uppercase tracking-wider text-foreground">11. Changes To Terms</h2>
              <p className="mt-2">
                We may update these Terms to reflect legal, technical, or product changes. Continued use after updates
                constitutes acceptance of revised Terms.
              </p>
            </section>

            <section>
              <h2 className="text-base font-black uppercase tracking-wider text-foreground">12. Contact</h2>
              <p className="mt-2">
                For legal requests, compliance issues, or account concerns, contact: support@velocityaas.com.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfUse;
