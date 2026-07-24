import { Link } from 'react-router-dom';

const InstagramIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
);

const FacebookIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
);

const LinkedinIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
);

const TwitterIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
    <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
  </svg>
);

const Footer = () => {
  return (
    <footer className="py-12 border-t border-border">
      <div className="container mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="font-display text-lg font-bold">
          <span className="gradient-text">SyncSocio</span>
        </div>
        <p className="text-sm text-muted-foreground">
          © 2026 SyncSocio. Built with ❤️ in India.
        </p>
        <div className="flex items-center gap-6">
          <a href="/#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Testimonials</a>
          <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy</Link>
          <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms</Link>
          <div className="flex items-center gap-4 border-l border-border pl-6 ml-2">
            <a href="https://www.instagram.com/syncsocio/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-all duration-200 hover:scale-110 transform">
              <InstagramIcon size={18} />
            </a>
            <a href="https://www.facebook.com/share/18sBwN4Bys/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-all duration-200 hover:scale-110 transform">
              <FacebookIcon size={18} />
            </a>
            <a href="https://www.linkedin.com/company/syncsocio/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-all duration-200 hover:scale-110 transform">
              <LinkedinIcon size={18} />
            </a>
            <a href="https://x.com/SyncSocio" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-all duration-200 hover:scale-110 transform">
              <TwitterIcon size={18} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
