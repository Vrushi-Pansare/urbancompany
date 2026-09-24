import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/** Line icon for a listing category code (used where the API has no image) */
@Component({
  selector: 'app-service-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <ng-container [ngSwitch]="code">
      <!-- AC unit -->
      <svg *ngSwitchCase="'air_conditioner'" viewBox="0 0 24 24">
        <rect x="2.5" y="5" width="19" height="9" rx="1.5" />
        <path d="M5.5 11h13M8 17.5v2M12 17.5v3M16 17.5v2" />
      </svg>
      <!-- Washing machine -->
      <svg *ngSwitchCase="'applainces'" viewBox="0 0 24 24">
        <rect x="4" y="2.5" width="16" height="19" rx="2" />
        <path d="M4 7h16" />
        <circle cx="12" cy="14" r="4.5" />
        <path d="M7 4.75h.01M9.5 4.75h.01" />
      </svg>
      <!-- Laptop -->
      <svg *ngSwitchCase="'computers'" viewBox="0 0 24 24">
        <rect x="4.5" y="5" width="15" height="10.5" rx="1.2" />
        <path d="M2 18.5h20l-1.5-3h-17z" />
      </svg>
      <!-- TV -->
      <svg *ngSwitchCase="'home_entertainment'" viewBox="0 0 24 24">
        <rect x="2.5" y="4" width="19" height="13" rx="1.5" />
        <path d="M8 20.5h8M12 17v3.5" />
      </svg>
      <!-- Water drop -->
      <svg *ngSwitchCase="'water_ro_system'" viewBox="0 0 24 24">
        <path d="M12 2.75s6.25 6.9 6.25 11.25a6.25 6.25 0 01-12.5 0C5.75 9.65 12 2.75 12 2.75z" />
        <path d="M9 14.5a3 3 0 003 3" />
      </svg>
      <!-- Wrench (any other category) -->
      <svg *ngSwitchDefault viewBox="0 0 24 24">
        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
      </svg>
    </ng-container>
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    svg {
      width: var(--uc-icon-size, 34px);
      height: var(--uc-icon-size, 34px);
      fill: none;
      stroke: #0f0f0f;
      stroke-width: 1.5;
      stroke-linecap: round;
      stroke-linejoin: round;
      display: block;
    }
  `]
})
export class ServiceIconComponent {
  @Input() code = '';
}
