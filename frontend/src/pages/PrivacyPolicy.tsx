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
              <h1 className="text-2xl font-black tracking-tight md:text-3xl">SyncSocio Privacy Policy</h1>
              <p className="mt-1 text-sm text-muted-foreground">Last updated: {updatedOn}</p>
            </div>
          </div>

          <div className="mt-8 space-y-7 text-sm leading-7 text-muted-foreground">
            <section>
              <p className="text-foreground/80 leading-relaxed">
                This Privacy Policy explains how <strong>SyncSocio</strong> collects, processes, stores, and protects your data when you use our AI-powered social media automation platform. We comply with applicable data protection laws including India's <strong>Digital Personal Data Protection Act, 2023 (DPDP Act)</strong>. Last updated: <strong>July 2026</strong>.
              </p>
            </section>

            <section className="border-t border-border/40 pt-6">
              <h2 className="text-base font-black uppercase tracking-wider text-foreground mb-3">1. Data We Collect & Why</h2>
              <p className="leading-relaxed">
                We collect the following categories of data strictly to operate and improve our services:
              </p>
              <ul className="list-disc pl-5 space-y-2 mt-3 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Account Data:</strong> Name, email address, hashed password, and plan selections.
                </li>
                <li>
                  <strong className="text-foreground">Brand Profile Data:</strong> Business name, social handle, target audience, brand colors, logo, keywords, posting preferences, and onboarding responses you provide.
                </li>
                <li>
                  <strong className="text-foreground">Instagram Integration Data:</strong> Accessed only via Meta's official Graph API with your authorization:
                  <ul className="list-[circle] pl-5 space-y-1 mt-1 text-muted-foreground/90">
                    <li>Instagram Business Account ID, username, and OAuth access tokens.</li>
                    <li>Media metadata, post insights, follower metrics, and webhook event payloads (comments, DM events, story mentions).</li>
                  </ul>
                </li>
                <li>
                  <strong className="text-foreground">Technical & Usage Data:</strong> Login timestamps, API logs, feature activity, device info, and error reports for system reliability and security.
                </li>
              </ul>
            </section>

            <section className="border-t border-border/40 pt-6">
              <h2 className="text-base font-black uppercase tracking-wider text-foreground mb-3">2. How We Use Your Data</h2>
              <p className="leading-relaxed">
                Your data is processed exclusively to deliver the services you configure.
              </p>
              <ul className="list-disc pl-5 space-y-2 mt-3 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Service Delivery:</strong> We use your data to operate the core platform features:
                  <ul className="list-[circle] pl-5 space-y-1 mt-1 text-muted-foreground/90">
                    <li>Authenticate and manage your account credentials securely.</li>
                    <li>Operate automated Instagram DM flows, comment replies, and story mention responses you configure.</li>
                    <li>Deliver transactional notification emails (e.g., password reset, welcome, credit/plan updates).</li>
                  </ul>
                </li>
                <li>
                  <strong className="text-foreground">AI Intelligence & Optimization:</strong> To formulate your marketing blueprints:
                  <ul className="list-[circle] pl-5 space-y-1 mt-1 text-muted-foreground/90">
                    <li>Generate AI-powered content strategies, brand recommendations, and analytics insights.</li>
                    <li>Monitor system health, prevent platform abuse, and ensure legal and API compliance.</li>
                  </ul>
                </li>
              </ul>
              <p className="mt-3 leading-relaxed">
                We do <strong>not</strong> use your data to train third-party AI models or sell it for advertising.
              </p>
            </section>

            <section className="border-t border-border/40 pt-6">
              <h2 className="text-base font-black uppercase tracking-wider text-foreground mb-3">3. Data Sharing & Third-Party Services</h2>
              <p className="leading-relaxed">
                <strong>We do not sell your personal data.</strong> Data is shared only with the following categories of trusted service providers necessary to operate SyncSocio:
              </p>
              <ul className="list-disc pl-5 space-y-2 mt-3 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Core Service Integrations:</strong> Shared only with essential platforms to execute your automations:
                  <ul className="list-[circle] pl-5 space-y-1 mt-1 text-muted-foreground/90">
                    <li><strong>Meta Platforms, Inc.</strong> — via the official Instagram Graph API for comment and message processing.</li>
                    <li><strong>SendGrid (Twilio)</strong> — for routing transactional notifications and email campaigns.</li>
                    <li><strong>Payment Gateways (Razorpay/Stripe)</strong> — for processing payments and subscription billing.</li>
                  </ul>
                </li>
                <li>
                  <strong className="text-foreground">Infrastructure & Security:</strong> To keep your workflows running:
                  <ul className="list-[circle] pl-5 space-y-1 mt-1 text-muted-foreground/90">
                    <li><strong>Cloud Infrastructure Providers</strong> — for secure database storage and server hosting.</li>
                    <li><strong>Regulatory & Legal Authorities</strong> — only when required by law or valid legal processes.</li>
                  </ul>
                </li>
              </ul>
            </section>

            <section className="border-t border-border/40 pt-6">
              <h2 className="text-base font-black uppercase tracking-wider text-foreground mb-3">4. Data Retention, Security & Tokens</h2>
              <p className="leading-relaxed">
                Your account data is retained for as long as your account is active. Instagram access tokens are stored in encrypted form and used solely to execute your authorized automations.
              </p>
              <ul className="list-disc pl-5 space-y-2 mt-3 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Encryption & Access:</strong> Tokens are encrypted at rest. We apply industry-standard security safeguards.
                </li>
                <li>
                  <strong className="text-foreground">No Password Storage:</strong> We never request or store your Instagram passwords.
                </li>
                <li>
                  <strong className="text-foreground">Erasure Request:</strong> You may request full account deletion and data erasure by contacting us. We action requests within 30 days under the DPDP Act.
                </li>
              </ul>
            </section>

            <section className="border-t border-border/40 pt-6">
              <h2 className="text-base font-black uppercase tracking-wider text-foreground mb-3">5. Your Rights & Contact</h2>
              <p className="leading-relaxed">
                Under the DPDP Act 2023 and applicable regulations, you possess rights concerning your personal data.
              </p>
              <ul className="list-disc pl-5 space-y-2 mt-3 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Account Controls:</strong> Rights regarding your personal information:
                  <ul className="list-[circle] pl-5 space-y-1 mt-1 text-muted-foreground/90">
                    <li><strong>Access & Export:</strong> Request a copy of the data we hold.</li>
                    <li><strong>Correction:</strong> Modify any outdated or inaccurate details in your settings.</li>
                    <li><strong>Erasure:</strong> Request permanent deletion of your account and personal data.</li>
                  </ul>
                </li>
                <li>
                  <strong className="text-foreground">Consent Management:</strong> You can revoke access at any time:
                  <ul className="list-[circle] pl-5 space-y-1 mt-1 text-muted-foreground/90">
                    <li>Withdraw consent by disconnecting integrations or deleting your brand profiles.</li>
                    <li>Object to any processing you believe does not comply with regulations.</li>
                  </ul>
                </li>
              </ul>
              <p className="mt-4">
                To exercise these rights, contact: <a href="mailto:supportsyncsocio@gmail.com" className="text-blue-500 hover:underline font-bold">supportsyncsocio@gmail.com</a>.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
