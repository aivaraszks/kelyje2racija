import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * A radio key. Used as `<button appRadioButton variant="pill">LABEL</button>` so the host
 * element is the real button; aria-* state is set by the parent on the host.
 */
@Component({
  selector: 'button[appRadioButton]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    type: 'button',
    '[class.pill]': "variant() === 'pill'",
    '[class.round]': "variant() === 'round'",
    '[class.lit]': 'lit()',
  },
  template: `
    @if (variant() === 'round') {
      <span class="led" aria-hidden="true"></span>
    }
    <span class="face">
      @if (variant() === 'round') {
        @if (lit()) {
          <svg class="ic" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 1h8v8H1z" /></svg>
        } @else {
          <svg class="ic" viewBox="0 0 8 10" aria-hidden="true">
            <path d="M1 0h2v2h2v2h2v2H5v2H3v2H1z" />
          </svg>
        }
      }
      <span class="t"><ng-content /></span>
    </span>
  `,
  styleUrl: './radio-button.component.css',
})
export class RadioButton {
  readonly variant = input<'pill' | 'round'>('pill');
  /** Round variant only: the LED is lit and the stop icon shows (a clip is playing). */
  readonly lit = input(false);
}
