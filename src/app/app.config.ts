import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideStore } from '@ngrx/store';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { provideEffects } from '@ngrx/effects';

import { routes } from './app.routes';
import { gameReducer } from './state/game/game.reducer';
import { photosReducer } from './state/photos/photos.reducer';
import { scoringReducer } from './state/scoring/scoring.reducer';
import { interfaceReducer } from './state/interface/interface.reducer';
import { PhotosEffects } from './state/photos/photos.effects';
import { ScoringEffects } from './state/scoring/scoring.effects';
import { GameEffects } from './state/game/game.effects';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withHashLocation()),
    provideHttpClient(withInterceptorsFromDi()),
    provideStore({
      game: gameReducer,
      photos: photosReducer,
      scoring: scoringReducer,
      interface: interfaceReducer
    }),
    provideStoreDevtools({
      maxAge: 25,
      logOnly: false,
      autoPause: true,
      trace: false,
      traceLimit: 75
    }),
    provideEffects([PhotosEffects, ScoringEffects, GameEffects])
  ]
};
