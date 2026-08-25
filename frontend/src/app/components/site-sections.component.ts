import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IconComponent, IconName } from './icon.component';
import { ClientInquiry, EmploymentInquiry, Project, Service } from '../core/models/site.models';
import { PublicApiService } from '../core/services/public-api.service';

@Component({
  selector: 'app-page-intro',
  standalone: true,
  template: `
    <section class="page-intro">
      <div class="page-intro__grid">
        <span class="eyebrow">{{ eyebrow }}</span>
        <h1>{{ title }}</h1>
        <p>{{ copy }}</p>
      </div>
    </section>
  `,
})
export class PageIntroComponent {
  @Input({ required: true }) eyebrow = '';
  @Input({ required: true }) title = '';
  @Input({ required: true }) copy = '';
}

@Component({
  selector: 'app-project-card',
  standalone: true,
  imports: [IconComponent],
  styles: [`
    :host {
      display: block;
      min-width: 0;
    }
  `],
  template: `
    <article class="project-card">
      <div class="project-card__image-wrap">
        <img class="project-card__image" [src]="project.image" alt="" [attr.loading]="priority ? 'eager' : 'lazy'" decoding="async" />
      </div>
      <div class="project-card__meta">
        <div><span>{{ project.category }}</span><h3>{{ project.title }}</h3></div>
        <span class="project-card__place">{{ project.place }}</span>
        <span class="project-card__arrow" [attr.aria-label]="'View ' + project.title"><app-icon name="arrow-up-right" [size]="18" /></span>
      </div>
    </article>
  `,
})
export class ProjectCardComponent {
  @Input({ required: true }) project!: Project;
  @Input() priority = false;
}

const projectBriefTypes = [
  { value: 'Residential', label: 'Residence', icon: 'home' as IconName },
  { value: 'Commercial', label: 'Workplace', icon: 'building' as IconName },
  { value: 'Hospitality', label: 'Hospitality', icon: 'store' as IconName },
  { value: 'Interiors', label: 'Interiors', icon: 'lamp' as IconName },
] as const;

@Component({
  selector: 'app-project-brief',
  standalone: true,
  imports: [IconComponent, RouterLink],
  template: `
    <div class="project-brief" aria-label="Project starter">
      <div class="project-brief__topline"><span>What are you shaping?</span><span>01 / 01</span></div>
      <div class="project-brief__options" role="radiogroup" aria-label="Project type">
        @for (option of options; track option.value) {
          <button class="brief-option" [class.brief-option--selected]="selectedProjectType === option.value" type="button" role="radio" [attr.aria-checked]="selectedProjectType === option.value" (click)="selectedProjectType = option.value">
            <app-icon [name]="option.icon" [size]="21" /><span>{{ option.label }}</span>
          </button>
        }
      </div>
      <div class="project-brief__action">
        <p>A few well-chosen details are enough to begin a meaningful conversation.</p>
        <a class="button button--glass" routerLink="/contact" [queryParams]="{ project: selectedProjectType }">Build my brief <app-icon name="arrow-right" [size]="17" /></a>
      </div>
    </div>
  `,
})
export class ProjectBriefComponent {
  readonly options = projectBriefTypes;
  selectedProjectType: (typeof projectBriefTypes)[number]['value'] = 'Residential';
}

@Component({
  selector: 'app-service-explorer',
  standalone: true,
  imports: [IconComponent, RouterLink],
  template: `
    @if (!services.length) {
      <section class="service-explorer service-explorer--status"><p role="status">{{ loading ? 'Loading studio services.' : unavailable ? 'Studio services are temporarily unavailable.' : '' }}</p></section>
    } @else if (activeService; as service) {
      <section class="service-explorer" aria-label="Service explorer">
        <div class="service-explorer__sidebar">
          <span class="eyebrow">Our capabilities</span>
          <div class="service-explorer__tabs" role="tablist" aria-label="Services">
            @for (item of services; track item.id; let index = $index) {
              <button class="service-tab" [class.service-tab--active]="index === activeIndex" type="button" role="tab" [attr.aria-selected]="index === activeIndex" (click)="activeIndex = index"><span>{{ item.number }}</span>{{ item.title }}</button>
            }
          </div>
        </div>
        <div class="service-explorer__visual"><img [src]="service.image" alt="" /><span>{{ service.number }}</span></div>
        <div class="service-explorer__detail" role="tabpanel">
          <h2>{{ service.title }}</h2><p>{{ service.summary }}</p>
          <ul>@for (detail of service.details; track detail) { <li><app-icon name="check" [size]="15" />{{ detail }}</li> }</ul>
          <a routerLink="/contact">Discuss this service <app-icon name="arrow-up-right" [size]="17" /></a>
        </div>
      </section>
    }
  `,
})
export class ServiceExplorerComponent implements OnChanges {
  @Input({ required: true }) services: Service[] = [];
  @Input() loading = false;
  @Input() unavailable = false;
  activeIndex = 0;

  get activeService(): Service | undefined {
    return this.services[this.activeIndex] ?? this.services[0];
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['services'] && this.activeIndex >= this.services.length) this.activeIndex = 0;
  }
}

@Component({
  selector: 'app-client-enquiry-form',
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent],
  template: `
    <form class="contact-form" [formGroup]="form" (ngSubmit)="submit()">
      <label><span>Your name</span><input formControlName="name" type="text" autocomplete="name" required /></label>
      <label><span>Email address</span><input formControlName="email" type="email" autocomplete="email" required /></label>
      <label><span>Project type</span><select formControlName="projectType" required><option value="" disabled>Select an option</option><option value="Residential">Residential</option><option value="Commercial">Commercial</option><option value="Hospitality">Hospitality</option><option value="Interiors">Interiors</option><option value="Other">Other</option></select></label>
      <label class="contact-form__message"><span>Tell us about your project</span><textarea formControlName="message" rows="5" required></textarea></label>
      <div class="contact-form__submit-row"><button class="button button--dark" type="submit" [disabled]="submitting">Send enquiry <app-icon name="arrow-right" [size]="17" /></button><p class="form-status" role="status">{{ status }}</p></div>
    </form>
  `,
})
export class ClientEnquiryFormComponent implements OnChanges {
  @Input() suggestedProjectType = '';
  private readonly formBuilder = inject(FormBuilder);
  private readonly api = inject(PublicApiService);
  submitting = false;
  status = '';
  readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    projectType: ['', Validators.required],
    message: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(2000)]],
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['suggestedProjectType'] && this.suggestedProjectType) this.form.controls.projectType.setValue(this.suggestedProjectType);
  }

  async submit(): Promise<void> {
    if (this.form.invalid || this.submitting) { this.form.markAllAsTouched(); return; }
    this.submitting = true;
    this.status = '';
    try {
      await this.api.submitClientInquiry(this.form.getRawValue() as ClientInquiry);
      this.form.reset({ name: '', email: '', projectType: '', message: '' });
      this.status = 'Thank you. Your enquiry has been received.';
    } catch {
      this.status = 'We could not send your enquiry. Please try again shortly.';
    } finally {
      this.submitting = false;
    }
  }
}

@Component({
  selector: 'app-employment-enquiry-form',
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent],
  template: `
    <form class="contact-form" [formGroup]="form" (ngSubmit)="submit()">
      <label><span>Your name</span><input formControlName="name" type="text" autocomplete="name" required /></label>
      <label><span>Email address</span><input formControlName="email" type="email" autocomplete="email" required /></label>
      <label><span>Phone number</span><input formControlName="phone" type="tel" autocomplete="tel" required /></label>
      <label><span>Position of interest</span><input formControlName="position" type="text" required /></label>
      <label class="contact-form__message"><span>Portfolio link</span><input formControlName="portfolioUrl" type="url" inputmode="url" /></label>
      <label class="contact-form__message"><span>Tell us about your experience</span><textarea formControlName="message" rows="5" required></textarea></label>
      <div class="contact-form__submit-row"><button class="button button--dark" type="submit" [disabled]="submitting">Send application <app-icon name="arrow-right" [size]="17" /></button><p class="form-status" role="status">{{ status }}</p></div>
    </form>
  `,
})
export class EmploymentEnquiryFormComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly api = inject(PublicApiService);
  submitting = false;
  status = '';
  readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    phone: ['', [Validators.required, Validators.minLength(7), Validators.maxLength(30)]],
    position: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    portfolioUrl: [''],
    message: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(2000)]],
  });

  async submit(): Promise<void> {
    if (this.form.invalid || this.submitting) { this.form.markAllAsTouched(); return; }
    this.submitting = true;
    this.status = '';
    try {
      await this.api.submitEmploymentInquiry(this.form.getRawValue() as EmploymentInquiry);
      this.form.reset({ name: '', email: '', phone: '', position: '', portfolioUrl: '', message: '' });
      this.status = 'Thank you. Your application has been received.';
    } catch {
      this.status = 'We could not send your application. Please try again shortly.';
    } finally {
      this.submitting = false;
    }
  }
}
