import { ArrowUpRight } from 'lucide-react';
import { navigation } from '../data/site.js';
import { Logo } from './Logo.jsx';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__top">
        <Logo compact />
        <p>Architecture and interiors with a distinct sense of place.</p>
        <a className="footer-email" href="/contact">
          Start a conversation <ArrowUpRight size={17} aria-hidden="true" />
        </a>
      </div>
      <div className="site-footer__bottom">
        <span>SK Jangid &amp; Associates</span>
        <nav aria-label="Footer navigation">
          {navigation.map((item) => (
            <a href={item.href} key={item.href}>{item.label}</a>
          ))}
        </nav>
        <span>Designed by you.</span>
      </div>
    </footer>
  );
}
