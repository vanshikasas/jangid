import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../components/icon.component';
import { ProjectBriefComponent, ProjectCardComponent } from '../components/site-sections.component';
import { ContentService } from '../core/services/content.service';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [IconComponent, RouterLink, ProjectBriefComponent, ProjectCardComponent],
  template: `
    <section class="home-hero">
      <div class="home-hero__image"></div><div class="home-hero__veil"></div><div class="home-hero__grid-lines" aria-hidden="true"></div>
      <div class="home-hero__content">
        <span class="hero-kicker">SK Jangid &amp; Associates</span>
        <h1>Spaces that become part of your story.</h1>
        <div class="home-hero__footer"><p>Architecture and interiors conceived around the way you want to live, work, and gather.</p><a class="hero-link" routerLink="/projects">Explore selected work <app-icon name="arrow-down-right" [size]="20" /></a></div>
      </div>
    </section>
    <section class="statement-section section-pad">
      <div class="statement-section__aside"><span class="eyebrow">01 / Approach</span></div>
      <div class="statement-section__content"><p class="display-copy">We turn a brief into a place with presence: rigorous in its details, generous in how it feels.</p><a class="text-link" routerLink="/services">How we work <app-icon name="arrow-right" [size]="17" /></a></div>
    </section>
    <section class="brief-section">
      <div class="brief-section__image" aria-hidden="true"></div><div class="brief-section__shade" aria-hidden="true"></div>
      <div class="brief-section__content"><div><span class="eyebrow eyebrow--light">A place to begin</span><h2>Bring the first idea into focus.</h2></div><app-project-brief /></div>
    </section>
    <section class="services-preview section-pad">
      <div class="section-heading"><span class="eyebrow">02 / Expertise</span><h2>A complete point of view, from first line to final finish.</h2></div>
      <div class="services-list">
        @for (service of content.services(); track service.id) { <a routerLink="/services" class="service-row"><span class="service-row__number">{{ service.number }}</span><h3>{{ service.title }}</h3><p>{{ service.summary }}</p><app-icon class="service-row__arrow" name="arrow-right" [size]="20" /></a> }
      </div>
    </section>
    <section class="featured-work section-pad">
      <div class="section-heading section-heading--work"><span class="eyebrow">03 / Selected work</span><a class="text-link" routerLink="/projects">View all projects <app-icon name="arrow-right" [size]="17" /></a></div>
      <div class="project-grid project-grid--home">@for (project of content.projects().slice(0, 2); track project.id; let index = $index) { <app-project-card [project]="project" [priority]="index === 0" /> }</div>
      @if (!content.projects().length) { <p class="content-status" role="status">{{ content.loading() ? 'Loading selected work.' : content.unavailable() ? 'Selected work is temporarily unavailable.' : '' }}</p> }
    </section>
    <section class="home-contact"><p>Have a site, an idea, or a beginning?</p><a routerLink="/contact">Let's make it considered <app-icon name="arrow-right" [size]="22" /></a></section>
  `,
})
export class HomePageComponent {
  readonly content = inject(ContentService);

  constructor() { void this.content.load(); }
}
