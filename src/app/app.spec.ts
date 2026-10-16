import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { Radio } from './features/radio/radio.component';

describe('App', () => {
  afterEach(() => vi.restoreAllMocks());

  beforeEach(async () => {
    // jsdom has no canvas; the pixel scene only needs a context object to exist.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      fillRect: vi.fn(),
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the pixel scene behind a router outlet', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('app-pixel-scene')).not.toBeNull();
    expect(root.querySelector('router-outlet')).not.toBeNull();
  });

  it('routes the empty path to the radio feature and everything else back to it', async () => {
    const [home, fallback] = routes;
    expect(home.path).toBe('');
    expect(typeof home.loadComponent).toBe('function');
    expect(fallback).toEqual({ path: '**', redirectTo: '' });
    const component = await (home.loadComponent as () => Promise<unknown>)();
    expect(component).toBe(Radio);
  });
});
