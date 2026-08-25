import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../components/icon.component';
import { PageIntroComponent, ServiceExplorerComponent } from '../components/site-sections.component';
import { ContentService } from '../core/services/content.service';

@Component({
  selector: 'app-services-page',
  standalone: true,
  imports: [IconComponent, RouterLink, PageIntroComponent, ServiceExplorerComponent],
  template: `
    <app-page-intro eyebrow="Services" title="A practiced balance of imagination and precision." copy="We guide each project through a deliberate process, connecting the big idea to the smallest decision." />
    <app-service-explorer [services]="content.services()" [loading]="content.loading()" [unavailable]="content.unavailable()" />
    <section class="process-section"><div class="process-section__heading"><span class="eyebrow">Our process</span><h2>Clear at every stage.</h2></div><ol class="process-list"><li><span>01</span><div><h3>Discover</h3><p>We listen for the practical needs, aspirations, context, and character of the brief.</p></div></li><li><span>02</span><div><h3>Develop</h3><p>Ideas become coordinated spaces, materials, and details with a coherent visual language.</p></div></li><li><span>03</span><div><h3>Deliver</h3><p>We stay close to the work, helping the design remain intact as it becomes built reality.</p></div></li></ol></section>
    <section class="service-cta"><p>Bring us in at the beginning.</p><a class="button button--light" routerLink="/contact">Discuss your project <app-icon name="arrow-right" [size]="17" /></a></section>
  `,
})
export class ServicesPageComponent {
  readonly content = inject(ContentService);

  constructor() { void this.content.load(); }
}
