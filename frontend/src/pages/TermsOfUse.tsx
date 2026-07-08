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
              <h1 className="text-2xl font-black tracking-tight md:text-3xl">SyncSocio Terms of Use</h1>
              <p className="mt-1 text-sm text-muted-foreground">Last updated: {updatedOn}</p>
            </div>
          </div>

          <div className="mt-8 space-y-7 text-sm leading-7 text-muted-foreground">
            <section>
              <p className="text-foreground/80 leading-relaxed">
                These Terms of Service ("Terms") govern your access to and use of <strong>SyncSocio</strong>, an AI-powered social media automation and brand management platform. By creating an account or using any platform feature, you confirm you have read, understood, and agree to be bound by these Terms. Last updated: <strong>July 2026</strong>.
              </p>
            </section>

            <section className="border-t border-border/40 pt-6">
              <h2 className="text-base font-black uppercase tracking-wider text-foreground mb-3">1. Platform Use & Eligibility</h2>
              <p className="leading-relaxed">
                SyncSocio is intended for business owners, marketers, and brand professionals. You must use SyncSocio only for lawful marketing purposes and in compliance with all relevant guidelines.
              </p>
              <ul className="list-disc pl-5 space-y-2 mt-3 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Eligibility & Registration:</strong> Access is limited to users who meet the following:
                  <ul className="list-[circle] pl-5 space-y-1 mt-1 text-muted-foreground/90">
                    <li>Must be a business owner, marketer, or brand professional aged 18 or above.</li>
                    <li>Must register with accurate and complete credentials, and maintain account security.</li>
                  </ul>
                </li>
                <li>
                  <strong className="text-foreground">Acceptable Use Guidelines:</strong> You agree to use SyncSocio only for lawful purposes. You must not:
                  <ul className="list-[circle] pl-5 space-y-1 mt-1 text-muted-foreground/90">
                    <li>Send spam messages, post misleading claims, or automate harassing campaigns.</li>
                    <li>Engage in inauthentic, deceptive, or abusive behaviors on connected social channels.</li>
                    <li>Violate Meta's Platform Terms or Instagram's Community Guidelines.</li>
                  </ul>
                </li>
              </ul>
            </section>

            <section className="border-t border-border/40 pt-6">
              <h2 className="text-base font-black uppercase tracking-wider text-foreground mb-3">2. Meta / Instagram API Authorization & Automation Rules</h2>
              <p className="leading-relaxed">
                By connecting your Instagram Business Account, you explicitly authorize SyncSocio to access your account via Meta's official API.
              </p>
              <ul className="list-disc pl-5 space-y-2 mt-3 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Authorized Access Scopes:</strong> Connecting your account grants SyncSocio access to:
                  <ul className="list-[circle] pl-5 space-y-1 mt-1 text-muted-foreground/90">
                    <li>Read account profile data, media posts, comments, and follower/engagement insights.</li>
                    <li>Process and respond to inbound comments, story mentions, and DM events.</li>
                  </ul>
                </li>
                <li>
                  <strong className="text-foreground">Integration Constraints:</strong> Our automation is bound by Meta's technical limits:
                  <ul className="list-[circle] pl-5 space-y-1 mt-1 text-muted-foreground/90">
                    <li>Automations must run strictly within the approved <strong>24-hour messaging window</strong>.</li>
                    <li>All API requests are subject to Meta's developer rate limits.</li>
                    <li>SyncSocio does not store your Instagram passwords and uses secure OAuth 2.0.</li>
                  </ul>
                </li>
              </ul>
            </section>

            <section className="border-t border-border/40 pt-6">
              <h2 className="text-base font-black uppercase tracking-wider text-foreground mb-3">3. AI-Generated Content & Performance Disclaimer</h2>
              <p className="leading-relaxed">
                SyncSocio's AI agents generate content strategies, DM flow suggestions, and brand insights based on the data you provide.
              </p>
              <ul className="list-disc pl-5 space-y-2 mt-3 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Human Oversight Required:</strong> Since AI outputs can occasionally produce inaccuracies:
                  <ul className="list-[circle] pl-5 space-y-1 mt-1 text-muted-foreground/90">
                    <li>You retain full sole responsibility to edit, verify, and approve all AI-generated content before publication.</li>
                    <li>Ensure all promotions, claims, and links adhere to applicable consumer protection laws.</li>
                  </ul>
                </li>
                <li>
                  <strong className="text-foreground">No Guarantees of Performance:</strong> SyncSocio provides strategic recommendations, but:
                  <ul className="list-[circle] pl-5 space-y-1 mt-1 text-muted-foreground/90">
                    <li>We do not guarantee follower growth, conversion increases, reach improvements, or sales numbers.</li>
                    <li>We are independent and have no official affiliation with, sponsorship by, or endorsement from Meta Platforms, Inc.</li>
                  </ul>
                </li>
              </ul>
            </section>

            <section className="border-t border-border/40 pt-6">
              <h2 className="text-base font-black uppercase tracking-wider text-foreground mb-3">4. Subscriptions, Credits & Termination</h2>
              <p className="leading-relaxed">
                SyncSocio operates on a credit-based and subscription model. Paid plan fees are non-refundable unless required by applicable law.
              </p>
              <ul className="list-disc pl-5 space-y-2 mt-3 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Billing & Service Credits:</strong> Account charges are subject to the following rules:
                  <ul className="list-[circle] pl-5 space-y-1 mt-1 text-muted-foreground/90">
                    <li>Paid plan subscription fees are billed in advance and are non-refundable.</li>
                    <li>Credits purchased for AI generation or automation have no cash value and are non-transferable.</li>
                  </ul>
                </li>
                <li>
                  <strong className="text-foreground">Suspension & Account Erasure:</strong> We reserve the right to suspend or terminate access if:
                  <ul className="list-[circle] pl-5 space-y-1 mt-1 text-muted-foreground/90">
                    <li>You violate platform rules, fail to pay subscription fees, or cause security hazards.</li>
                    <li>Meta restricts or suspends our developer app or your specific social accounts.</li>
                  </ul>
                </li>
              </ul>
            </section>

            <section className="border-t border-border/40 pt-6">
              <h2 className="text-base font-black uppercase tracking-wider text-foreground mb-3">5. Intellectual Property & Limitation of Liability</h2>
              <p className="leading-relaxed">
                You retain ownership of all brand assets you bring to the platform. SyncSocio retains proprietary rights to platform software.
              </p>
              <ul className="list-disc pl-5 space-y-2 mt-3 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Property Ownership:</strong> A clear division of intellectual property:
                  <ul className="list-[circle] pl-5 space-y-1 mt-1 text-muted-foreground/90">
                    <li>You retain ownership of your brand assets, logo files, and creative content.</li>
                    <li>SyncSocio retains ownership of all platform designs, databases, source code, and workflow logic.</li>
                  </ul>
                </li>
                <li>
                  <strong className="text-foreground">Liability Restrictions:</strong> To the maximum extent permitted by law:
                  <ul className="list-[circle] pl-5 space-y-1 mt-1 text-muted-foreground/90">
                    <li>SyncSocio is provided on an "as-is" and "as-available" basis without warranties.</li>
                    <li>We are not liable for business interruptions, social account bans, or data losses.</li>
                  </ul>
                </li>
              </ul>
              <p className="mt-4">
                For legal inquiries, contact: <a href="mailto:supportsyncsocio@gmail.com" className="text-blue-500 hover:underline font-bold">supportsyncsocio@gmail.com</a>.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfUse;
