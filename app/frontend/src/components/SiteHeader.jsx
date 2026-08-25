import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { navigation } from '../data/site.js';
import { Logo } from './Logo.jsx';

function pathIsActive(href) {
  return window.location.pathname === href;
}

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const closeMenu = () => setMenuOpen(false);
    window.addEventListener('popstate', closeMenu);
    return () => window.removeEventListener('popstate', closeMenu);
  }, []);

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Logo />
        <button
          className="menu-button"
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={20} /> : <Menu size={21} />}
        </button>
        <nav className={`site-nav ${menuOpen ? 'site-nav--open' : ''}`} aria-label="Primary navigation">
          {navigation.map((item) => (
            <a
              className={pathIsActive(item.href) ? 'site-nav__link site-nav__link--active' : 'site-nav__link'}
              href={item.href}
              key={item.href}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </a>
          ))}
          <a className="site-nav__contact" href="/contact" onClick={() => setMenuOpen(false)}>
            Start a project
          </a>
        </nav>
      </div>
    </header>
  );
}
