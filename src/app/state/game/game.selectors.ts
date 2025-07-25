import { createFeatureSelector, createSelector } from '@ngrx/store';
import { GameState, GameStatus } from '../../models/game-state.model';

export const selectGameState = createFeatureSelector<GameState>('game');

export const selectCurrentPhotoIndex = createSelector(
  selectGameState,
  (state: GameState) => state.currentPhotoIndex
);

export const selectTotalPhotos = createSelector(
  selectGameState,
  (state: GameState) => state.totalPhotos
);

export const selectGameStatus = createSelector(
  selectGameState,
  (state: GameState) => state.gameStatus
);

export const selectStartTime = createSelector(
  selectGameState,
  (state: GameState) => state.startTime
);

export const selectEndTime = createSelector(
  selectGameState,
  (state: GameState) => state.endTime
);

export const selectIsGameInProgress = createSelector(
  selectGameStatus,
  (status: GameStatus) => status === GameStatus.IN_PROGRESS
);

export const selectIsGameCompleted = createSelector(
  selectGameStatus,
  (status: GameStatus) => status === GameStatus.COMPLETED
);

export const selectIsGameNotStarted = createSelector(
  selectGameStatus,
  (status: GameStatus) => status === GameStatus.NOT_STARTED
);

export const selectHasGameError = createSelector(
  selectGameStatus,
  (status: GameStatus) => status === GameStatus.ERROR
);

export const selectGameProgress = createSelector(
  selectCurrentPhotoIndex,
  selectTotalPhotos,
  (currentIndex: number, totalPhotos: number) => ({
    current: currentIndex + 1,
    total: totalPhotos,
    percentage: Math.round(((currentIndex + 1) / totalPhotos) * 100)
  })
);

export const selectGameDuration = createSelector(
  selectStartTime,
  selectEndTime,
  (startTime: Date, endTime: Date | undefined) => {
    if (!endTime) return null;
    return endTime.getTime() - startTime.getTime();
  }
);

export const selectGameError = createSelector(
  selectGameState,
  (state: GameState) => state.error || null
);

export const selectGameLoading = createSelector(
  selectGameState,
  (state: GameState) => state.loading || false
);