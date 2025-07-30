import { gameReducer, initialGameState } from './game.reducer';
import * as GameActions from './game.actions';
import { GameStatus } from '../../models/game-state.model';

describe('Game Reducer', () => {
  describe('unknown action', () => {
    it('should return the previous state', () => {
      const action = {} as any;
      const result = gameReducer(initialGameState, action);

      expect(result).toBe(initialGameState);
    });
  });

  describe('startGame action', () => {
    it('should set game status to IN_PROGRESS and reset state', () => {
      const action = GameActions.startGame();
      const result = gameReducer(initialGameState, action);

      expect(result.gameStatus).toBe(GameStatus.IN_PROGRESS);
      expect(result.currentPhotoIndex).toBe(0);
      expect(result.startTime).toBeInstanceOf(Date);
      expect(result.endTime).toBeUndefined();
    });

    it('should reset game from completed state', () => {
      const completedState = {
        ...initialGameState,
        gameStatus: GameStatus.COMPLETED,
        currentPhotoIndex: 5,
        endTime: new Date()
      };

      const action = GameActions.startGame();
      const result = gameReducer(completedState, action);

      expect(result.gameStatus).toBe(GameStatus.IN_PROGRESS);
      expect(result.currentPhotoIndex).toBe(0);
      expect(result.endTime).toBeUndefined();
    });
  });

  describe('nextPhoto action', () => {
    it('should increment photo index', () => {
      const state = {
        ...initialGameState,
        gameStatus: GameStatus.IN_PROGRESS,
        currentPhotoIndex: 2
      };

      const action = GameActions.nextPhoto();
      const result = gameReducer(state, action);

      expect(result.currentPhotoIndex).toBe(3);
      expect(result.gameStatus).toBe(GameStatus.IN_PROGRESS);
    });

    it('should complete game when trying to advance beyond last photo', () => {
      const state = {
        ...initialGameState,
        gameStatus: GameStatus.IN_PROGRESS,
        currentPhotoIndex: 4,
        totalPhotos: 5
      };

      const action = GameActions.nextPhoto();
      const result = gameReducer(state, action);

      // Photo index should stay at 4 (last valid index) when game completes
      expect(result.currentPhotoIndex).toBe(4);
      expect(result.gameStatus).toBe(GameStatus.COMPLETED);
      expect(result.endTime).toBeInstanceOf(Date);
    });

    it('should keep photo index within bounds (0-4 for 5 photos)', () => {
      const state = {
        ...initialGameState,
        gameStatus: GameStatus.IN_PROGRESS,
        currentPhotoIndex: 3,
        totalPhotos: 5
      };

      const action = GameActions.nextPhoto();
      const result = gameReducer(state, action);

      // Should increment normally when not at the end
      expect(result.currentPhotoIndex).toBe(4);
      expect(result.gameStatus).toBe(GameStatus.IN_PROGRESS);
    });
  });

  describe('endGame action', () => {
    it('should set game status to COMPLETED and set end time', () => {
      const state = {
        ...initialGameState,
        gameStatus: GameStatus.IN_PROGRESS
      };

      const action = GameActions.endGame();
      const result = gameReducer(state, action);

      expect(result.gameStatus).toBe(GameStatus.COMPLETED);
      expect(result.endTime).toBeInstanceOf(Date);
    });
  });

  describe('resetGame action', () => {
    it('should reset to initial state with new start time', () => {
      const state = {
        ...initialGameState,
        gameStatus: GameStatus.COMPLETED,
        currentPhotoIndex: 3,
        endTime: new Date()
      };

      const action = GameActions.resetGame();
      const result = gameReducer(state, action);

      expect(result.gameStatus).toBe(GameStatus.NOT_STARTED);
      expect(result.currentPhotoIndex).toBe(0);
      expect(result.totalPhotos).toBe(5);
      expect(result.startTime).toBeInstanceOf(Date);
      expect(result.endTime).toBeUndefined();
    });
  });

  describe('setGameError action', () => {
    it('should set game status to ERROR', () => {
      const state = {
        ...initialGameState,
        gameStatus: GameStatus.IN_PROGRESS
      };

      const action = GameActions.setGameError({ error: 'Test error' });
      const result = gameReducer(state, action);

      expect(result.gameStatus).toBe(GameStatus.ERROR);
    });
  });

  describe('clearGameError action', () => {
    it('should reset error status to NOT_STARTED', () => {
      const state = {
        ...initialGameState,
        gameStatus: GameStatus.ERROR
      };

      const action = GameActions.clearGameError();
      const result = gameReducer(state, action);

      expect(result.gameStatus).toBe(GameStatus.NOT_STARTED);
    });

    it('should not change status if not in error state', () => {
      const state = {
        ...initialGameState,
        gameStatus: GameStatus.IN_PROGRESS
      };

      const action = GameActions.clearGameError();
      const result = gameReducer(state, action);

      expect(result.gameStatus).toBe(GameStatus.IN_PROGRESS);
    });
  });
});