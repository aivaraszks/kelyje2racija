import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RadioButton } from './radio-button.component';

@Component({
  imports: [RadioButton],
  template: `
    <button appRadioButton [variant]="variant()" [lit]="lit()" (click)="clicks.set(clicks() + 1)">
      PRIIMTI<span class="sr-only">, groti</span>
    </button>
  `,
})
class Host {
  readonly variant = signal<'pill' | 'round'>('pill');
  readonly lit = signal(false);
  readonly clicks = signal(0);
}

describe('RadioButton', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    return { fixture, button };
  }

  it('renders a real button of type button with the projected label', () => {
    const { button } = setup();
    expect(button.getAttribute('type')).toBe('button');
    expect(button.textContent).toContain('PRIIMTI');
    expect(button.classList.contains('pill')).toBe(true);
    expect(button.querySelector('.led')).toBeNull();
  });

  it('renders the LED ring and a play icon in the round variant', () => {
    const { fixture, button } = setup();
    fixture.componentInstance.variant.set('round');
    fixture.detectChanges();
    expect(button.classList.contains('round')).toBe(true);
    expect(button.querySelector('.led')).not.toBeNull();
    expect(button.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 8 10');
    expect(button.classList.contains('lit')).toBe(false);
  });

  it('lights the LED and shows the stop icon when lit', () => {
    const { fixture, button } = setup();
    fixture.componentInstance.variant.set('round');
    fixture.componentInstance.lit.set(true);
    fixture.detectChanges();
    expect(button.classList.contains('lit')).toBe(true);
    expect(button.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 10 10');
  });

  it('keeps native click behaviour', () => {
    const { fixture, button } = setup();
    button.click();
    expect(fixture.componentInstance.clicks()).toBe(1);
  });
});
