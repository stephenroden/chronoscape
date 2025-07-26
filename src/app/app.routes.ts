import { Routes } from '@angular/router';
import { StartScreenComponent } from './components/start-screen/start-screen.component';
import { GameComponent } from './components/game/game.component';
import { FinalResultsComponent } from './components/final-results/final-results.component';
import { GameGuard, ResultsGuard, StartGuard } from './guards/game.guard';

export const routes: Routes = [
  { 
    path: '', 
    component: StartScreenComponent,
    canActivate: [StartGuard],
    title: 'Chronoscape - Historical Photo Guessing Game'
  },
  { 
    path: 'game', 
    component: GameComponent,
    canActivate: [GameGuard],
    canDeactivate: [GameGuard],
    title: 'Chronoscape - Game in Progress'
  },
  { 
    path: 'results', 
    component: FinalResultsComponent,
    canActivate: [ResultsGuard],
    title: 'Chronoscape - Game Results'
  },
  { 
    path: '**', 
    redirectTo: '' 
  }
];
