import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type IconName = 'arrow-down-right' | 'arrow-right' | 'arrow-up-right' | 'building' | 'check' | 'home' | 'lamp' | 'menu' | 'store' | 'x';

@Component({
  selector: 'app-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg [attr.width]="size" [attr.height]="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      @switch (name) {
        @case ('arrow-right') { <path d="M5 12h14M13 6l6 6-6 6" /> }
        @case ('arrow-down-right') { <path d="M7 7h10v10M17 7 7 17" /> }
        @case ('arrow-up-right') { <path d="M7 17 17 7M7 7h10v10" /> }
        @case ('building') { <path d="M4 21V4h12v17M4 9h12M8 4v5M8 13v8M12 13v8M16 21h4V8h-4" /> }
        @case ('check') { <path d="m5 12 4 4L19 6" /> }
        @case ('home') { <path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM9 21v-6h6v6" /> }
        @case ('lamp') { <path d="M9 21h6M12 17v4M7 17h10l-2-9H9zM12 8V3M8 3h8" /> }
        @case ('menu') { <path d="M4 7h16M4 12h16M4 17h16" /> }
        @case ('store') { <path d="M3 10h18M5 10v11h14V10M4 10l2-6h12l2 6M9 21v-6h6v6" /> }
        @case ('x') { <path d="m6 6 12 12M18 6 6 18" /> }
      }
    </svg>
  `,
})
export class IconComponent {
  @Input({ required: true }) name!: IconName;
  @Input() size = 20;
}
