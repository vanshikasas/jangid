import { Component, inject } from '@angular/core';
import { PageIntroComponent, ProjectCardComponent } from '../components/site-sections.component';
import { ContentService } from '../core/services/content.service';

@Component({
  selector: 'app-projects-page',
  standalone: true,
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
  readonly content = inject(ContentService);
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
