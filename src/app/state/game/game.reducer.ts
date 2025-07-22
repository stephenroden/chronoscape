import { createReducer, on } from '@ngrx/store';
import { GameState, GameStatus } from '../../models/game-state.model';
import * as GameActions from './game.actions';

export const initialGameState: GameState = {
  currentPhotoIndex: 0,
  totalPhotos: 5,
  gameStatus: GameStatus.NOT_STARTED,
  startTime: new Date(),
  endTime: undefined
};

export const gameReducer = createReducer(
  initialGameState,
  
  on(GameActions.startGame, (state): GameState => ({
    ...state,
    gameStatus: GameStatus.IN_PROGRESS,
    startTime: new Date(),
    currentPhotoIndex: 0,
    endTime: undefined
  })),

  on(GameActions.nextPhoto, (state): GameState => {
    const nextIndex = state.currentPhotoIndex + 1;
    const isGameComplete = nextIndex >= state.totalPhotos;
    
    return {
      ...state,
      currentPhotoIndex: nextIndex,
      gameStatus: isGameComplete ? GameStatus.COMPLETED : GameStatus.IN_PROGRESS,
      endTime: isGameComplete ? new Date() : state.endTime
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
    gameStatus: GameStatus.ERROR
  })),

  on(GameActions.clearGameError, (state): GameState => ({
    ...state,
    gameStatus: state.gameStatus === GameStatus.ERROR ? GameStatus.NOT_STARTED : state.gameStatus
  }))
);