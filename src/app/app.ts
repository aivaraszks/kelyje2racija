import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PixelScene } from './shared/pixel-scene/pixel-scene.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, PixelScene],
  template: `
    <app-pixel-scene />
    <router-outlet />
  `,
})
export class App {}
