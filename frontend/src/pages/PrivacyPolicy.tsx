import { useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowLeft } from 'lucide-react';

const PrivacyPolicy = () => {
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
            <div className="mt-1 rounded-xl bg-emerald-500/10 p-2 text-emerald-600">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight md:text-3xl">VelocityDM Privacy Policy</h1>
              <p className="mt-1 text-sm text-muted-foreground">Last updated: {updatedOn}</p>
            </div>
          </div>

          <div className="mt-8 space-y-7 text-sm leading-7 text-muted-foreground">
            <section>
              <h2 className="text-base font-black uppercase tracking-wider text-foreground">1. Overview</h2>
              <p className="mt-2">
                This Privacy Policy explains how VelocityDM collects, uses, stores, and discloses information when you
                use our AI marketing automation services, including dashboard analytics, Instagram integrations, and
                message automation features.
              </p>
            </section>

            <section>
              <h2 className="text-base font-black uppercase tracking-wider text-foreground">2. Information We Collect</h2>
              <p className="mt-2">
                Account and profile data: name, email, password hash, brand profile attributes, onboarding responses,
                and plan selections.
              </p>
              <p className="mt-2">
                Connected platform data: Instagram business/page identifiers, usernames, access tokens, media metadata,
                insights metrics, comment events, message events, and webhook payload fields required for automation.
              </p>
              <p className="mt-2">
                Usage and technical data: timestamps, logs, API response metadata, and feature activity used for system
                reliability and abuse prevention.
              </p>
            </section>

            <section>
              <h2 className="text-base font-black uppercase tracking-wider text-foreground">3. How We Use Information</h2>
              <p className="mt-2">We process data to:</p>
              <p className="mt-2">Provide account access and security controls.</p>
              <p className="mt-2">Operate automations such as comment-trigger replies, story mention replies, and default DM responses.</p>
              <p className="mt-2">Generate and evaluate content strategies and recommendation insights from aggregated performance metrics.</p>
              <p className="mt-2">Monitor system health, debug incidents, prevent fraud, and enforce platform policies.</p>
            </section>

            <section>
              <h2 className="text-base font-black uppercase tracking-wider text-foreground">4. Legal Bases And Consent</h2>
              <p className="mt-2">
                We rely on contractual necessity (service delivery), legitimate interests (security and product
                improvement), and consent where required by law or platform rules (such as connected account
                authorizations).
              </p>
            </section>

            <section>
              <h2 className="text-base font-black uppercase tracking-wider text-foreground">5. Data Sharing</h2>
              <p className="mt-2">
                We do not sell personal data. We share data only with service providers and integrations required to
                run the product (for example, cloud hosting, analytics, messaging APIs, and social platform endpoints),
                and when required by law or valid legal process.
              </p>
            </section>

            <section>
              <h2 className="text-base font-black uppercase tracking-wider text-foreground">6. Data Retention</h2>
              <p className="mt-2">
                We retain information as long as necessary for product operations, legal obligations, dispute
                resolution, and enforcement of agreements. You may request deletion of your account and associated
                profile data, subject to lawful retention requirements.
              </p>
            </section>

            <section>
              <h2 className="text-base font-black uppercase tracking-wider text-foreground">7. Security</h2>
              <p className="mt-2">
                We apply technical and organizational safeguards for stored data and tokens, including access controls
                and operational logging. No internet-based system is completely secure, and you are responsible for
                keeping your own credentials and device environment secure.
              </p>
            </section>

            <section>
              <h2 className="text-base font-black uppercase tracking-wider text-foreground">8. Your Rights</h2>
              <p className="mt-2">
                Depending on jurisdiction, you may have rights to access, correct, export, or delete personal data,
                and to object to or restrict certain processing. To exercise rights, contact us using the details
                below.
              </p>
            </section>

            <section>
              <h2 className="text-base font-black uppercase tracking-wider text-foreground">9. International Transfers</h2>
              <p className="mt-2">
                Your data may be processed in countries other than your own, where we or our providers operate.
                We take steps to apply appropriate safeguards when transferring data across borders.
              </p>
            </section>

            <section>
              <h2 className="text-base font-black uppercase tracking-wider text-foreground">10. Children</h2>
              <p className="mt-2">
                VelocityDM is not directed to children and is intended for business and professional use. Do not use the
                service if prohibited by applicable age restrictions in your jurisdiction.
              </p>
            </section>

            <section>
              <h2 className="text-base font-black uppercase tracking-wider text-foreground">11. Policy Updates</h2>
              <p className="mt-2">
                We may update this Privacy Policy to reflect legal or product changes. Material updates will be
                reflected by revising the effective date.
              </p>
            </section>

            <section>
              <h2 className="text-base font-black uppercase tracking-wider text-foreground">12. Contact</h2>
              <p className="mt-2">
                Privacy and data requests: supportvelocitydm@gmail.com.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
