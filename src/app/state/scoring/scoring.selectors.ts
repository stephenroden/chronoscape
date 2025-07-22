import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ScoringState, Score } from '../../models/scoring.model';

export const selectScoringState = createFeatureSelector<ScoringState>('scoring');

export const selectAllScores = createSelector(
  selectScoringState,
  (state: ScoringState) => state.scores
);

export const selectTotalScore = createSelector(
  selectScoringState,
  (state: ScoringState) => state.totalScore
);

export const selectCurrentGuess = createSelector(
  selectScoringState,
  (state: ScoringState) => state.currentGuess
);

export const selectScoreByPhotoId = (photoId: string) => createSelector(
  selectAllScores,
  (scores: Score[]) => scores.find(score => score.photoId === photoId) || null
);

export const selectScoresCount = createSelector(
  selectAllScores,
  (scores: Score[]) => scores.length
);

export const selectAverageScore = createSelector(
  selectTotalScore,
  selectScoresCount,
  (totalScore: number, count: number) => count > 0 ? Math.round(totalScore / count) : 0
);

export const selectYearScores = createSelector(
  selectAllScores,
  (scores: Score[]) => scores.map(score => score.yearScore)
);

export const selectLocationScores = createSelector(
  selectAllScores,
  (scores: Score[]) => scores.map(score => score.locationScore)
);

export const selectTotalYearScore = createSelector(
  selectYearScores,
  (yearScores: number[]) => yearScores.reduce((sum, score) => sum + score, 0)
);

export const selectTotalLocationScore = createSelector(
  selectLocationScores,
  (locationScores: number[]) => locationScores.reduce((sum, score) => sum + score, 0)
);

export const selectAverageYearScore = createSelector(
  selectTotalYearScore,
  selectScoresCount,
  (totalYearScore: number, count: number) => count > 0 ? Math.round(totalYearScore / count) : 0
);

export const selectAverageLocationScore = createSelector(
  selectTotalLocationScore,
  selectScoresCount,
  (totalLocationScore: number, count: number) => count > 0 ? Math.round(totalLocationScore / count) : 0
);

export const selectScoreBreakdown = createSelector(
  selectTotalScore,
  selectTotalYearScore,
  selectTotalLocationScore,
  selectScoresCount,
  (totalScore: number, yearScore: number, locationScore: number, count: number) => ({
    total: totalScore,
    year: yearScore,
    location: locationScore,
    average: count > 0 ? Math.round(totalScore / count) : 0,
    maxPossible: count * 10000
  })
);

export const selectHasCurrentGuess = createSelector(
  selectCurrentGuess,
  (guess) => guess !== null
);