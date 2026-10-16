import { TestBed } from '@angular/core/testing';
import {
  LOGO_PATH,
  RadioCable,
  RadioGrille,
  RadioLogo,
  cablePath,
} from './radio-graphics.components';

describe('radio graphics', () => {
  it('draws the logo from the specified pixel path, hidden from assistive tech', () => {
    const el = TestBed.createComponent(RadioLogo);
    el.detectChanges();
    const svg = (el.nativeElement as HTMLElement).querySelector('svg')!;
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('viewBox')).toBe('0 0 35 7');
    expect(svg.querySelector('path')?.getAttribute('d')).toBe(LOGO_PATH);
  });

  it('builds a 9-coil cable path and renders it twice (coil and highlight)', () => {
    const d = cablePath();
    expect(d.startsWith('M5.0 16.0')).toBe(true);
    expect(d.match(/L/g)?.length).toBe(9 * 24);
    const el = TestBed.createComponent(RadioCable);
    el.detectChanges();
    const root = el.nativeElement as HTMLElement;
    expect(root.querySelectorAll('path').length).toBe(2);
    expect(root.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders a decorative grille with a tiling pattern', () => {
    const el = TestBed.createComponent(RadioGrille);
    el.detectChanges();
    const root = el.nativeElement as HTMLElement;
    expect(root.querySelector('pattern')?.getAttribute('width')).toBe('7');
    expect(root.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });
});
