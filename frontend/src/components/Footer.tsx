import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="py-12 border-t border-border">
      <div className="container mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="font-display text-lg font-bold">
          <span className="gradient-text">VelocityDM</span>
        </div>
        <p className="text-sm text-muted-foreground">
          © 2026 VelocityDM. Built with ❤️ in India.
        </p>
        <div className="flex gap-6">
          <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy</Link>
          <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms</Link>
          <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Twitter</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
