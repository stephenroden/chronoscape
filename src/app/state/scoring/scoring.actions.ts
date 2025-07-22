import { createAction, props } from '@ngrx/store';
import { Guess, Score } from '../../models/scoring.model';

// Guess submission actions
export const submitGuess = createAction(
  '[Scoring] Submit Guess',
  props<{ guess: Guess }>()
);

export const setCurrentGuess = createAction(
  '[Scoring] Set Current Guess',
  props<{ guess: Guess }>()
);

export const clearCurrentGuess = createAction('[Scoring] Clear Current Guess');

// Score calculation actions
export const calculateScore = createAction(
  '[Scoring] Calculate Score',
  props<{ photoId: string; guess: Guess; actualYear: number; actualCoordinates: { latitude: number; longitude: number } }>()
);

export const addScore = createAction(
  '[Scoring] Add Score',
  props<{ score: Score }>()
);

export const updateTotalScore = createAction('[Scoring] Update Total Score');

// Score management
export const resetScores = createAction('[Scoring] Reset Scores');

export const removeScore = createAction(
  '[Scoring] Remove Score',
  props<{ photoId: string }>()
);

// Validation actions
export const validateGuess = createAction(
  '[Scoring] Validate Guess',
  props<{ guess: Guess }>()
);

export const guessValidationSuccess = createAction(
  '[Scoring] Guess Validation Success',
  props<{ guess: Guess }>()
);

export const guessValidationFailure = createAction(
  '[Scoring] Guess Validation Failure',
  props<{ error: string }>()
);