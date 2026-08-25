import { AfterViewInit, Component, HostListener, OnDestroy, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from './icon.component';

const navigation = [
  { label: 'Home', href: '/' },
  { label: 'Services', href: '/services' },
  { label: 'Projects', href: '/projects' },
  { label: 'Contact', href: '/contact' },
];

@Component({
  selector: 'app-page-loader',
  standalone: true,
  template: `
    @if (visible()) {
      <div class="page-loader" [class.page-loader--leaving]="leaving()" aria-label="Loading website" role="status">
        <div class="page-loader__content">
          <span class="page-loader__index">{{ paddedProgress }}</span>
          <div class="page-loader__brand"><span>SKJA</span></div>
          <span class="page-loader__status">Preparing your workspace <b>{{ formattedElapsed }}s</b></span>
        </div>
        <span class="page-loader__line" [style.transform]="'scaleX(' + progress() / 100 + ')' "></span>
      </div>
    }
  `,
})
export class PageLoaderComponent implements AfterViewInit, OnDestroy {
  readonly visible = signal(true);
  readonly leaving = signal(false);
  readonly elapsed = signal(0);
  readonly progress = signal(8);
  private finished = false;
  private readonly timers: number[] = [];

  get paddedProgress(): string {
    return String(this.progress()).padStart(3, '0');
  }

  get formattedElapsed(): string {
    return (this.elapsed() / 10).toFixed(1).padStart(4, '0');
  }

  ngAfterViewInit(): void {
    const startedAt = performance.now();
    this.timers.push(window.setInterval(() => {
      this.elapsed.set(Math.floor((performance.now() - startedAt) / 100));
      this.progress.update((current) => Math.min(88, current + 3));
    }, 100));

    const finish = () => {
      if (this.finished) return;
      this.finished = true;
      const remaining = Math.max(0, 720 - (performance.now() - startedAt));
      this.timers.push(window.setTimeout(() => {
        this.progress.set(100);
        this.timers.push(window.setTimeout(() => this.leaving.set(true), 260));
        this.timers.push(window.setTimeout(() => this.visible.set(false), 620));
      }, remaining));
    };

    if (document.readyState === 'complete') finish();
    else window.addEventListener('load', finish, { once: true });
    this.timers.push(window.setTimeout(finish, 5000));
    this.timers.push(window.setTimeout(() => {
      if (this.visible()) return;
      this.progress.set(100);
      this.leaving.set(true);
      this.visible.set(false);
    }, 7000));
  }

  ngOnDestroy(): void {
    this.timers.forEach((timer) => window.clearTimeout(timer));
  }
}

@Component({
  selector: 'app-site-header',
  standalone: true,
  imports: [IconComponent, RouterLink, RouterLinkActive],
  template: `
    <header class="site-header" [class.site-header--compact]="isCompact" [class.site-header--portal]="isPortalPage">
      <div class="site-header__inner">
        @if (!isPortalPage) {
          <button class="menu-button" type="button" (click)="menuOpen = !menuOpen" [attr.aria-label]="menuOpen ? 'Close navigation' : 'Open navigation'" [attr.aria-expanded]="menuOpen">
            <app-icon [name]="menuOpen ? 'x' : 'menu'" [size]="21" />
          </button>
          <nav class="site-nav" [class.site-nav--open]="menuOpen" aria-label="Primary navigation">
            @for (item of navigation; track item.href) {
              <a class="site-nav__link" [routerLink]="item.href" routerLinkActive="site-nav__link--active" [routerLinkActiveOptions]="{ exact: item.href === '/' }" (click)="closeMenu()">{{ item.label }}</a>
            }
          </nav>
        }

        <div class="site-header__meta">
          <span class="site-header__divider" aria-hidden="true">—</span>
          <button class="site-header__portal-button" type="button" [class.site-header__portal-button--active]="isPortalPage" (click)="togglePortal()">
            {{ isPortalPage ? 'Close portal' : 'Portal' }}
          </button>
        </div>
      </div>
    </header>
  `,
})
export class SiteHeaderComponent {
  private readonly router = inject(Router);
  readonly navigation = navigation;
  menuOpen = false;
  isCompact = false;
  isPortalPage = false;
  private lastScrollY = 0;

  constructor() {
    this.syncRouteState();
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.syncRouteState();
        this.closeMenu();
      }
    });
  }

  @HostListener('window:scroll')
  onScroll(): void {
    const currentScroll = window.scrollY;
    this.isCompact = currentScroll > 48 && currentScroll > this.lastScrollY;
    this.lastScrollY = currentScroll;
  }

  togglePortal(): void {
    if (this.isPortalPage) {
      void this.router.navigate(['/']);
      return;
    }
    void this.router.navigate(['/portal']);
  }

  closeMenu(): void {
    this.menuOpen = false;
  }

  private syncRouteState(): void {
    this.isPortalPage = this.router.url === '/portal';
  }
}

@Component({
  selector: 'app-site-footer',
  standalone: true,
  imports: [IconComponent, RouterLink],
  template: `
    <footer class="site-footer">
      <div class="site-footer__top">
        <a class="brand brand--compact brand--inverse" routerLink="/" aria-label="SK Jangid & Associates home">
          <img src="/brand/skja-logo.png" alt="SK Jangid & Associates" />
        </a>
        <p>Architecture and interiors with a distinct sense of place.</p>
        <a class="footer-email" routerLink="/contact">Start a conversation <app-icon name="arrow-up-right" [size]="17" /></a>
      </div>
      <div class="site-footer__bottom">
        <span>SK Jangid &amp; Associates</span>
        <nav aria-label="Footer navigation">
          @for (item of navigation; track item.href) { <a [routerLink]="item.href">{{ item.label }}</a> }
        </nav>
        <span>Designed by you.</span>
      </div>
    </footer>
  `,
})
export class SiteFooterComponent {
  readonly navigation = navigation;
}
