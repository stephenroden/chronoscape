import { GameState, GameStatus } from '../../models/game-state.model';
import * as GameSelectors from './game.selectors';

describe('Game Selectors', () => {
  const mockGameState: GameState = {
    currentPhotoIndex: 2,
    totalPhotos: 5,
    gameStatus: GameStatus.IN_PROGRESS,
    startTime: new Date('2025-01-01T10:00:00Z'),
    endTime: undefined
  };

  const mockCompletedGameState: GameState = {
    ...mockGameState,
    gameStatus: GameStatus.COMPLETED,
    endTime: new Date('2025-01-01T10:30:00Z')
  };

  describe('selectCurrentPhotoIndex', () => {
    it('should select current photo index', () => {
      const result = GameSelectors.selectCurrentPhotoIndex.projector(mockGameState);
      expect(result).toBe(2);
    });
  });

  describe('selectTotalPhotos', () => {
    it('should select total photos', () => {
      const result = GameSelectors.selectTotalPhotos.projector(mockGameState);
      expect(result).toBe(5);
    });
  });

  describe('selectGameStatus', () => {
    it('should select game status', () => {
      const result = GameSelectors.selectGameStatus.projector(mockGameState);
      expect(result).toBe(GameStatus.IN_PROGRESS);
    });
  });

  describe('selectStartTime', () => {
    it('should select start time', () => {
      const result = GameSelectors.selectStartTime.projector(mockGameState);
      expect(result).toEqual(new Date('2025-01-01T10:00:00Z'));
    });
  });

  describe('selectEndTime', () => {
    it('should select end time', () => {
      const result = GameSelectors.selectEndTime.projector(mockGameState);
      expect(result).toBeUndefined();
    });

    it('should select end time when game is completed', () => {
      const result = GameSelectors.selectEndTime.projector(mockCompletedGameState);
      expect(result).toEqual(new Date('2025-01-01T10:30:00Z'));
    });
  });

  describe('selectIsGameInProgress', () => {
    it('should return true when game is in progress', () => {
      const result = GameSelectors.selectIsGameInProgress.projector(GameStatus.IN_PROGRESS);
      expect(result).toBe(true);
    });

    it('should return false when game is not in progress', () => {
      const result = GameSelectors.selectIsGameInProgress.projector(GameStatus.NOT_STARTED);
      expect(result).toBe(false);
    });
  });

  describe('selectIsGameCompleted', () => {
    it('should return true when game is completed', () => {
      const result = GameSelectors.selectIsGameCompleted.projector(GameStatus.COMPLETED);
      expect(result).toBe(true);
    });

    it('should return false when game is not completed', () => {
      const result = GameSelectors.selectIsGameCompleted.projector(GameStatus.IN_PROGRESS);
      expect(result).toBe(false);
    });
  });

  describe('selectIsGameNotStarted', () => {
    it('should return true when game is not started', () => {
      const result = GameSelectors.selectIsGameNotStarted.projector(GameStatus.NOT_STARTED);
      expect(result).toBe(true);
    });

    it('should return false when game is started', () => {
      const result = GameSelectors.selectIsGameNotStarted.projector(GameStatus.IN_PROGRESS);
      expect(result).toBe(false);
    });
  });

  describe('selectHasGameError', () => {
    it('should return true when game has error', () => {
      const result = GameSelectors.selectHasGameError.projector(GameStatus.ERROR);
      expect(result).toBe(true);
    });

    it('should return false when game has no error', () => {
      const result = GameSelectors.selectHasGameError.projector(GameStatus.IN_PROGRESS);
      expect(result).toBe(false);
    });
  });

  describe('selectGameProgress', () => {
    it('should calculate game progress correctly', () => {
      const result = GameSelectors.selectGameProgress.projector(2, 5);
      expect(result).toEqual({
        current: 3,
        total: 5,
        percentage: 60
      });
    });

    it('should handle first photo correctly', () => {
      const result = GameSelectors.selectGameProgress.projector(0, 5);
      expect(result).toEqual({
        current: 1,
        total: 5,
        percentage: 20
      });
    });

    it('should handle last photo correctly', () => {
      const result = GameSelectors.selectGameProgress.projector(4, 5);
      expect(result).toEqual({
        current: 5,
        total: 5,
        percentage: 100
      });
    });
  });

  describe('selectGameDuration', () => {
    it('should return null when game is not completed', () => {
      const result = GameSelectors.selectGameDuration.projector(
        new Date('2025-01-01T10:00:00Z'),
        undefined
      );
      expect(result).toBeNull();
    });

    it('should calculate duration when game is completed', () => {
      const result = GameSelectors.selectGameDuration.projector(
        new Date('2025-01-01T10:00:00Z'),
        new Date('2025-01-01T10:30:00Z')
      );
      expect(result).toBe(30 * 60 * 1000); // 30 minutes in milliseconds
    });
  });
});