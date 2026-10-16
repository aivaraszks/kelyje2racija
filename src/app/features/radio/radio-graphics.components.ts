import { ChangeDetectionStrategy, Component } from '@angular/core';

/** The "RACIJA" wordmark on a 35x7 pixel grid. Decorative: the parent h1 carries the name. */
export const LOGO_PATH =
  'M0 0h1v7h-1z M1 0h3v1h-3z M4 1h1v2h-1z M1 3h3v1h-3z M2 4h1v1h-1z M3 5h1v1h-1z M4 6h1v1h-1z M6 1h1v6h-1z M10 1h1v6h-1z M7 0h3v1h-3z M7 3h3v1h-3z M12 1h1v5h-1z M13 0h3v1h-3z M13 6h3v1h-3z M16 1h1v1h-1z M16 5h1v1h-1z M18 0h5v1h-5z M20 1h1v5h-1z M18 6h5v1h-5z M26 0h3v1h-3z M28 1h1v5h-1z M24 5h1v1h-1z M25 6h3v1h-3z M30 1h1v6h-1z M34 1h1v6h-1z M31 0h3v1h-3z M31 3h3v1h-3z';

@Component({
  selector: 'app-radio-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<svg viewBox="0 0 35 7" aria-hidden="true" focusable="false">
    <path [attr.d]="path" />
  </svg>`,
  styles: `
    :host {
      display: block;
    }
    svg {
      display: block;
      height: 1.75rem;
      width: auto;
      fill: var(--color-metal-200);
      shape-rendering: crispEdges;
    }
  `,
})
export class RadioLogo {
  protected readonly path = LOGO_PATH;
}

/** Coil path: `coils` turns across `width` units of a 160x32 box. */
export function cablePath(coils = 9, width = 160): string {
  const steps = coils * 24;
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = t * coils * 2 * Math.PI;
    d += `${i ? 'L' : 'M'}${(t * width + 5 * Math.cos(a)).toFixed(1)} ${(16 + 10 * Math.sin(a)).toFixed(1)}`;
  }
  return d;
}

/** Coiled cable, stretched to the available width. */
@Component({
  selector: 'app-radio-cable',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<svg
    viewBox="0 0 160 32"
    preserveAspectRatio="none"
    aria-hidden="true"
    focusable="false"
  >
    <path [attr.d]="path" class="coil" />
    <path [attr.d]="path" class="shine" transform="translate(0 -1)" />
  </svg>`,
  styles: `
    :host {
      display: block;
      flex: 1;
      min-width: 0;
      height: 2rem;
    }
    svg {
      display: block;
      width: 100%;
      height: 100%;
      overflow: visible;
    }
    path {
      fill: none;
      vector-effect: non-scaling-stroke;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .coil {
      stroke: var(--color-metal-900);
      stroke-width: 4;
    }
    .shine {
      stroke: var(--color-metal-500);
      stroke-width: 1.2;
    }
  `,
})
export class RadioCable {
  protected readonly path = cablePath();
}

/** Speaker grille: a tiled dot pattern that scales to any size. */
@Component({
  selector: 'app-radio-grille',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<svg width="100%" height="100%" aria-hidden="true" focusable="false">
    <defs>
      <pattern id="grille-dots" width="7" height="7" patternUnits="userSpaceOnUse">
        <circle cx="3.5" cy="3.8" r="1.8" fill="#fff" fill-opacity=".55" />
        <circle cx="3.5" cy="3.2" r="1.7" class="dot" />
      </pattern>
    </defs>
    <rect x="0" y="0" width="100%" height="100%" rx="12" fill="url(#grille-dots)" />
  </svg>`,
  styles: `
    :host {
      display: block;
      width: 100%;
      height: 2.75rem;
      border-radius: var(--radius-lg);
      background: linear-gradient(180deg, var(--color-metal-400), var(--color-metal-300));
      box-shadow:
        inset 0 2px 5px rgb(0 0 0 / 30%),
        0 1px 0 rgb(255 255 255 / 60%);
    }
    svg {
      display: block;
    }
    .dot {
      fill: var(--color-metal-600);
    }
    @media (min-width: 64rem) {
      :host {
        height: 3.25rem;
      }
    }
  `,
})
export class RadioGrille {}
