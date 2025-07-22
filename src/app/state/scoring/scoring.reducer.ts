import { createReducer, on } from '@ngrx/store';
import { ScoringState } from '../../models/scoring.model';
import * as ScoringActions from './scoring.actions';

export const initialScoringState: ScoringState = {
  scores: [],
  totalScore: 0,
  currentGuess: null
};

export const scoringReducer = createReducer(
  initialScoringState,

  on(ScoringActions.submitGuess, (state, { guess }): ScoringState => ({
    ...state,
    currentGuess: guess
  })),

  on(ScoringActions.setCurrentGuess, (state, { guess }): ScoringState => ({
    ...state,
    currentGuess: guess
  })),

  on(ScoringActions.clearCurrentGuess, (state): ScoringState => ({
    ...state,
    currentGuess: null
  })),

  on(ScoringActions.addScore, (state, { score }): ScoringState => {
    // Remove any existing score for this photo to avoid duplicates
    const filteredScores = state.scores.filter(s => s.photoId !== score.photoId);
    const newScores = [...filteredScores, score];
    const newTotalScore = newScores.reduce((sum, s) => sum + s.totalScore, 0);

    return {
      ...state,
      scores: newScores,
      totalScore: newTotalScore
    };
  }),

  on(ScoringActions.updateTotalScore, (state): ScoringState => {
    const newTotalScore = state.scores.reduce((sum, score) => sum + score.totalScore, 0);
    return {
      ...state,
      totalScore: newTotalScore
    };
  }),

  on(ScoringActions.resetScores, (): ScoringState => ({
    ...initialScoringState
  })),

  on(ScoringActions.removeScore, (state, { photoId }): ScoringState => {
    const filteredScores = state.scores.filter(score => score.photoId !== photoId);
    const newTotalScore = filteredScores.reduce((sum, score) => sum + score.totalScore, 0);

    return {
      ...state,
      scores: filteredScores,
      totalScore: newTotalScore
    };
  }),

  on(ScoringActions.validateGuess, (state): ScoringState => state),

  on(ScoringActions.guessValidationSuccess, (state, { guess }): ScoringState => ({
    ...state,
    currentGuess: guess
  })),

  on(ScoringActions.guessValidationFailure, (state): ScoringState => ({
    ...state,
    currentGuess: null
  }))
);