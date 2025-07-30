import { gameReducer, initialGameState } from './game.reducer';
import * as GameActions from './game.actions';
import { GameStatus } from '../../models/game-state.model';

describe('Game Progression Integration', () => {

  // Test the reducer logic directly

  describe('Photo Index Progression', () => {
    it('should keep photo index within bounds (0-4 for 5 photos)', () => {
      let state = initialGameState;

      // Start game at photo 1 (index 0)
      state = gameReducer(state, GameActions.startGame());
      expect(state.currentPhotoIndex).toBe(0);
      expect(state.gameStatus).toBe(GameStatus.IN_PROGRESS);

      // Advance through photos 2-5 (indices 1-4)
      for (let i = 0; i < 4; i++) {
        state = gameReducer(state, GameActions.nextPhoto());
        expect(state.currentPhotoIndex).toBe(i + 1);
        expect(state.gameStatus).toBe(GameStatus.IN_PROGRESS);
      }

      // After 4 nextPhoto calls, we should be at photo 5 (index 4) and game should be IN_PROGRESS
      expect(state.currentPhotoIndex).toBe(4);
      expect(state.gameStatus).toBe(GameStatus.IN_PROGRESS);

      // One more nextPhoto should complete the game (trying to go beyond photo 5)
      state = gameReducer(state, GameActions.nextPhoto());
      expect(state.currentPhotoIndex).toBe(4); // Should stay at index 4
      expect(state.gameStatus).toBe(GameStatus.COMPLETED);

      // Try to advance beyond - should stay at index 4
      state = gameReducer(state, GameActions.nextPhoto());
      expect(state.currentPhotoIndex).toBe(4);
      expect(state.gameStatus).toBe(GameStatus.COMPLETED);
    });

    it('should increment photo index by exactly 1 each time until completion', () => {
      let state = initialGameState;

      // Start game
      state = gameReducer(state, GameActions.startGame());
      expect(state.currentPhotoIndex).toBe(0);

      // Test increments 1-4 (should remain IN_PROGRESS)
      for (let i = 0; i < 4; i++) {
        state = gameReducer(state, GameActions.nextPhoto());
        expect(state.currentPhotoIndex).toBe(i + 1);
        expect(state.gameStatus).toBe(GameStatus.IN_PROGRESS);
      }

      // Try to advance beyond photo 5 - should complete game but stay at index 4
      state = gameReducer(state, GameActions.nextPhoto());
      expect(state.currentPhotoIndex).toBe(4); // Should stay at 4
      expect(state.gameStatus).toBe(GameStatus.COMPLETED);

      // Try to advance beyond - should stay at 4
      state = gameReducer(state, GameActions.nextPhoto());
      expect(state.currentPhotoIndex).toBe(4);
      expect(state.gameStatus).toBe(GameStatus.COMPLETED);
    });
  });

  describe('Game Status Transitions', () => {
    it('should transition game status correctly through progression', () => {
      let state = initialGameState;

      // Start: NOT_STARTED -> IN_PROGRESS
      expect(state.gameStatus).toBe(GameStatus.NOT_STARTED);
      
      state = gameReducer(state, GameActions.startGame());
      expect(state.gameStatus).toBe(GameStatus.IN_PROGRESS);

      // Photos 2-5: Should remain IN_PROGRESS
      for (let i = 0; i < 4; i++) {
        state = gameReducer(state, GameActions.nextPhoto());
        expect(state.gameStatus).toBe(GameStatus.IN_PROGRESS);
      }

      // Try to advance beyond photo 5: Should transition to COMPLETED
      state = gameReducer(state, GameActions.nextPhoto());
      expect(state.gameStatus).toBe(GameStatus.COMPLETED);
    });
  });
});