import { Component, inject } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { IconComponent } from '../components/icon.component';
import { ClientEnquiryFormComponent, EmploymentEnquiryFormComponent, PageIntroComponent, ProjectBriefComponent, ProjectCardComponent, ServiceExplorerComponent } from '../components/marketing-components.component';
import { ContentStore } from '../core/services/content-store.service';

@Component({
  selector: 'app-home-page',
  imports: [IconComponent, RouterLink, ProjectBriefComponent, ProjectCardComponent],
  template: `
    <section class="home-hero">
      <div class="home-hero__image"></div><div class="home-hero__veil"></div><div class="home-hero__grid-lines" aria-hidden="true"></div>
      <div class="home-hero__content">
        <span class="hero-kicker">SK Jangid &amp; Associates</span>
        <h1>Spaces that become part of your story.</h1>
        <div class="home-hero__footer">
        <p>Architecture and interiors conceived around the way you want to live, work, and gather.
        </p>
        <a class="hero-link" routerLink="/projects">Explore selected work <app-icon name="arrow-down-right" [size]="20" /></a>
        </div>
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
  readonly content = inject(ContentStore);

  constructor() { void this.content.load(); }
}

@Component({
  selector: 'app-services-page',
  imports: [IconComponent, RouterLink, PageIntroComponent, ServiceExplorerComponent],
  template: `
    <app-page-intro eyebrow="Services" title="A practiced balance of imagination and precision." copy="We guide each project through a deliberate process, connecting the big idea to the smallest decision." />
    <app-service-explorer [services]="content.services()" [loading]="content.loading()" [unavailable]="content.unavailable()" />
    <section class="process-section"><div class="process-section__heading"><span class="eyebrow">Our process</span><h2>Clear at every stage.</h2></div><ol class="process-list"><li><span>01</span><div><h3>Discover</h3><p>We listen for the practical needs, aspirations, context, and character of the brief.</p></div></li><li><span>02</span><div><h3>Develop</h3><p>Ideas become coordinated spaces, materials, and details with a coherent visual language.</p></div></li><li><span>03</span><div><h3>Deliver</h3><p>We stay close to the work, helping the design remain intact as it becomes built reality.</p></div></li></ol></section>
    <section class="service-cta"><p>Bring us in at the beginning.</p><a class="button button--light" routerLink="/contact">Discuss your project <app-icon name="arrow-right" [size]="17" /></a></section>
  `,
})
export class ServicesPageComponent {
  readonly content = inject(ContentStore);

  constructor() { void this.content.load(); }
}

@Component({
  selector: 'app-projects-page',
  imports: [PageIntroComponent, ProjectCardComponent],
  template: `
    <app-page-intro eyebrow="Selected work" title="Architecture is a record of attention." copy="A growing collection of spaces designed to feel inevitable in their setting and personal to the people inside them." />
    <section class="projects-section">
      <div class="projects-section__bar"><div class="projects-section__filter" aria-label="Project types">@for (filter of projectFilters; track filter) { <button class="project-filter" [class.project-filter--active]="filter === activeFilter" type="button" (click)="activeFilter = filter">{{ filter === 'All' ? 'All work' : filter }}</button> }</div><span class="projects-section__count">{{ visibleProjects.length.toString().padStart(2, '0') }} projects</span></div>
      <div class="project-grid project-grid--editorial">@for (project of visibleProjects; track project.id; let index = $index) { <app-project-card [project]="project" [priority]="index < 2" /> }</div>
      @if (!visibleProjects.length) { <p class="content-status" role="status">{{ content.loading() ? 'Loading projects.' : content.unavailable() ? 'Projects are temporarily unavailable.' : 'No projects match this filter.' }}</p> }
    </section>
  `,
})
export class ProjectsPageComponent {
  readonly content = inject(ContentStore);
  activeFilter = 'All';

  constructor() { void this.content.load(); }

  get projectFilters(): string[] {
    return ['All', ...new Set(this.content.projects().map((project) => project.category))];
  }

  get visibleProjects() {
    return this.activeFilter === 'All'
      ? this.content.projects()
      : this.content.projects().filter((project) => project.category === this.activeFilter);
  }
}

@Component({
  selector: 'app-contact-page',
  imports: [IconComponent, RouterLink, PageIntroComponent, ClientEnquiryFormComponent, EmploymentEnquiryFormComponent],
  template: `
    <app-page-intro eyebrow="Contact" title="A thoughtful place starts with a good conversation." copy="Tell us about your site, your timeline, or the question you are beginning with." />
    <section class="contact-section">
      <div>
        <div class="contact-tabs" role="tablist" aria-label="Enquiry type"><button class="contact-tab" [class.contact-tab--active]="formType === 'client'" type="button" role="tab" [attr.aria-selected]="formType === 'client'" (click)="formType = 'client'">Client enquiry</button><button class="contact-tab" [class.contact-tab--active]="formType === 'employment'" type="button" role="tab" [attr.aria-selected]="formType === 'employment'" (click)="formType = 'employment'">Employment</button></div>
        @if (formType === 'client') { <app-client-enquiry-form [suggestedProjectType]="suggestedProjectType" /> } @else { <app-employment-enquiry-form /> }
      </div>
      <aside class="contact-aside"><span class="eyebrow">Studio enquiries</span><p>We welcome private residential, commercial, hospitality, and interior design enquiries.</p><a routerLink="/services">Explore our services <app-icon name="arrow-up-right" [size]="17" /></a></aside>
    </section>
  `,
})
export class ContactPageComponent {
  private readonly route = inject(ActivatedRoute);
  formType: 'client' | 'employment' = 'client';
  suggestedProjectType = this.route.snapshot.queryParamMap.get('project') ?? '';
}
