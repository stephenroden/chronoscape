import { createReducer, on } from '@ngrx/store';
import { GameState, GameStatus } from '../../models/game-state.model';
import * as GameActions from './game.actions';

export const initialGameState: GameState = {
  currentPhotoIndex: 0,
  totalPhotos: 5,
  gameStatus: GameStatus.NOT_STARTED,
  startTime: new Date(),
  endTime: undefined,
  error: null,
  loading: false
};

export const gameReducer = createReducer(
  initialGameState,
  
  on(GameActions.startGame, (state): GameState => ({
    ...state,
    gameStatus: GameStatus.IN_PROGRESS,
    startTime: new Date(),
    currentPhotoIndex: 0,
    endTime: undefined,
    error: null,
    loading: false
  })),

  on(GameActions.nextPhoto, (state): GameState => {
    // If game is already completed, don't change anything
    if (state.gameStatus === GameStatus.COMPLETED) {
      return state;
    }
    
    const nextIndex = state.currentPhotoIndex + 1;
    
    // Game completes when we try to advance beyond the last photo (index 4 for 5 photos)
    if (nextIndex >= state.totalPhotos) {
      return {
        ...state,
        gameStatus: GameStatus.COMPLETED,
        endTime: new Date()
        // Keep currentPhotoIndex at the last valid photo (don't increment beyond bounds)
      };
    }
    
    return {
      ...state,
      currentPhotoIndex: nextIndex,
      gameStatus: GameStatus.IN_PROGRESS
    };
  }),

  on(GameActions.endGame, (state): GameState => ({
    ...state,
    gameStatus: GameStatus.COMPLETED,
    endTime: new Date()
  })),

  on(GameActions.resetGame, (): GameState => ({
    ...initialGameState,
    startTime: new Date()
  })),

  on(GameActions.setGameError, (state, { error }): GameState => ({
    ...state,
    gameStatus: GameStatus.ERROR,
    error,
    loading: false
  })),

  on(GameActions.clearGameError, (state): GameState => ({
    ...state,
    gameStatus: state.gameStatus === GameStatus.ERROR ? GameStatus.NOT_STARTED : state.gameStatus,
    error: null
  })),

  on(GameActions.setGameLoading, (state, { loading }): GameState => ({
    ...state,
    loading
  }))
);