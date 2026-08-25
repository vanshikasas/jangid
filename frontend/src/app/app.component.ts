import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PageLoaderComponent, SiteFooterComponent, SiteHeaderComponent } from './components/layout.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, PageLoaderComponent, SiteHeaderComponent, SiteFooterComponent],
  template: `
    <div class="app-shell">
      <app-page-loader />
      <app-site-header />
      <main><router-outlet /></main>
      <app-site-footer />
    </div>
  `,
})
export class AppComponent {}
