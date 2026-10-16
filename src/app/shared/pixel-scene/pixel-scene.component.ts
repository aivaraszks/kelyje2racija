import {
  afterNextRender,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { createScene, type Scene } from './scene';

const FRAME_MS = 1000 / 12 - 2;
const RESIZE_DEBOUNCE_MS = 150;

@Component({
  selector: 'app-pixel-scene',
  template: `
    <canvas #canvas class="scene" aria-hidden="true" role="presentation"></canvas>
    <div class="dim" aria-hidden="true"></div>
  `,
  styleUrl: './pixel-scene.component.css',
  host: { 'aria-hidden': 'true' },
})
export class PixelScene {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  private scene: Scene | null = null;
  private raf = 0;
  private last = 0;
  private t0 = 0;
  private reduce = false;

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const mq =
        typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
      this.reduce = mq?.matches ?? false;
      this.t0 = performance.now();
      this.build();
      this.apply();

      const onMotion = (e: { matches: boolean }) => {
        this.reduce = e.matches;
        this.apply();
      };
      const onVisibility = () => this.apply();
      mq?.addEventListener('change', onMotion);
      document.addEventListener('visibilitychange', onVisibility);

      let timer: ReturnType<typeof setTimeout> | undefined;
      const onResize = () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          this.build();
          this.apply();
        }, RESIZE_DEBOUNCE_MS);
      };
      const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(onResize) : null;
      ro?.observe(this.host.nativeElement);
      window.addEventListener('orientationchange', onResize);

      destroyRef.onDestroy(() => {
        this.stop();
        clearTimeout(timer);
        mq?.removeEventListener('change', onMotion);
        document.removeEventListener('visibilitychange', onVisibility);
        window.removeEventListener('orientationchange', onResize);
        ro?.disconnect();
      });
    });
  }

  private build(): void {
    const el = this.host.nativeElement;
    this.scene = createScene(
      this.canvas().nativeElement,
      el.clientWidth || window.innerWidth,
      el.clientHeight || window.innerHeight,
    );
  }

  /** Applies the current motion state: one static frame, a running loop, or paused. */
  private apply(): void {
    this.stop();
    if (!this.scene) return;
    if (this.reduce) {
      this.scene.render(0);
    } else if (!document.hidden) {
      this.last = 0;
      this.raf = requestAnimationFrame(this.loop);
    }
  }

  private stop(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private readonly loop = (now: number): void => {
    this.raf = requestAnimationFrame(this.loop);
    if (now - this.last < FRAME_MS) return;
    this.last = now;
    this.scene?.render((now - this.t0) / 1000);
  };
}
