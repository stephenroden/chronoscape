import { createAction, props } from '@ngrx/store';

// Game lifecycle actions
export const startGame = createAction('[Game] Start Game');

export const nextPhoto = createAction('[Game] Next Photo');

export const endGame = createAction('[Game] End Game');

export const resetGame = createAction('[Game] Reset Game');

export const setGameError = createAction(
  '[Game] Set Game Error',
  props<{ error: string }>()
);

export const clearGameError = createAction('[Game] Clear Game Error');

export const setGameLoading = createAction(
  '[Game] Set Game Loading',
  props<{ loading: boolean }>()
);