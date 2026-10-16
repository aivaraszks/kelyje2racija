import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./features/radio/radio.component').then((m) => m.Radio),
  },
  { path: '**', redirectTo: '' },
];
