import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IconComponent } from '../components/icon.component';
import { ClientEnquiryFormComponent, EmploymentEnquiryFormComponent, PageIntroComponent } from '../components/site-sections.component';

@Component({
  selector: 'app-contact-page',
  standalone: true,
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
