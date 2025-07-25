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

// Game progress selectors
export const selectGameProgress = createSelector(
  selectScoresCount,
  (scoresCount: number) => ({
    completedPhotos: scoresCount,
    totalPhotos: 5, // Based on requirements - always 5 photos per game
    percentage: Math.round((scoresCount / 5) * 100),
    isComplete: scoresCount >= 5
  })
);

export const selectCurrentScoreForPhoto = (photoId: string) => createSelector(
  selectScoreByPhotoId(photoId),
  (score) => score || null
);

export const selectMaxPossibleScore = createSelector(
  selectScoresCount,
  (scoresCount: number) => scoresCount * 10000 // 10,000 points per photo
);

export const selectScorePercentage = createSelector(
  selectTotalScore,
  selectMaxPossibleScore,
  (totalScore: number, maxScore: number) => 
    maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0
);

export const selectPerformanceCategory = createSelector(
  selectTotalScore,
  selectScoresCount,
  (totalScore: number, scoresCount: number) => {
    if (scoresCount === 0) return 'Not Started';
    
    const averageScore = totalScore / scoresCount;
    const percentage = (averageScore / 10000) * 100;
    
    if (percentage >= 90) return 'History Master';
    if (percentage >= 80) return 'Time Expert';
    if (percentage >= 70) return 'History Buff';
    if (percentage >= 60) return 'Good Guesser';
    if (percentage >= 50) return 'Learning Explorer';
    if (percentage >= 40) return 'Time Traveler';
    if (percentage >= 30) return 'History Student';
    return 'Beginner Explorer';
  }
);

export const selectIsGameComplete = createSelector(
  selectGameProgress,
  (progress) => progress.isComplete
);

export const selectCanSubmitGuess = createSelector(
  selectHasCurrentGuess,
  selectIsGameComplete,
  (hasGuess: boolean, isComplete: boolean) => hasGuess && !isComplete
);

export const selectScoreStatistics = createSelector(
  selectAllScores,
  selectTotalScore,
  selectTotalYearScore,
  selectTotalLocationScore,
  (scores: Score[], totalScore: number, yearScore: number, locationScore: number) => {
    if (scores.length === 0) {
      return {
        totalScore: 0,
        averageScore: 0,
        yearAccuracy: 0,
        locationAccuracy: 0,
        bestPhoto: null,
        worstPhoto: null
      };
    }

    const averageScore = Math.round(totalScore / scores.length);
    const yearAccuracy = Math.round((yearScore / (scores.length * 5000)) * 100);
    const locationAccuracy = Math.round((locationScore / (scores.length * 5000)) * 100);
    
    const sortedScores = [...scores].sort((a, b) => b.totalScore - a.totalScore);
    const bestPhoto = sortedScores[0];
    const worstPhoto = sortedScores[sortedScores.length - 1];

    return {
      totalScore,
      averageScore,
      yearAccuracy,
      locationAccuracy,
      bestPhoto,
      worstPhoto
    };
  }
);

export const selectScoringLoading = createSelector(
  selectScoringState,
  (state: ScoringState) => state.loading
);

export const selectScoringError = createSelector(
  selectScoringState,
  (state: ScoringState) => state.error
);