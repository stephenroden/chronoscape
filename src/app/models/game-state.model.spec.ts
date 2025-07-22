import { 
  GameState, 
  PhotoState, 
  GameStatus, 
  validateGameState, 
  validatePhotoState 
} from './game-state.model';
import { Photo } from './photo.model';

describe('Game State Model', () => {
  let validGameState: GameState;
  let validPhotoState: PhotoState;
  let mockPhoto: Photo;

  beforeEach(() => {
    validGameState = {
      currentPhotoIndex: 0,
      totalPhotos: 5,
      gameStatus: GameStatus.IN_PROGRESS,
      startTime: new Date('2023-01-01T10:00:00Z'),
      endTime: undefined
    };

    mockPhoto = {
      id: 'photo-1',
      url: 'https://example.com/photo.jpg',
      title: 'Test Photo',
      year: 1950,
      coordinates: { latitude: 40.7128, longitude: -74.0060 },
      source: 'Test Source',
      metadata: {
        license: 'CC BY-SA 4.0',
        originalSource: 'https://example.com',
        dateCreated: new Date('1950-01-01')
      }
    };

    validPhotoState = {
      photos: [mockPhoto],
      currentPhoto: mockPhoto,
      loading: false,
      error: null
    };
  });

  describe('GameStatus enum', () => {
    it('should have correct enum values', () => {
      expect(GameStatus.NOT_STARTED).toBe('not_started');
      expect(GameStatus.IN_PROGRESS).toBe('in_progress');
      expect(GameStatus.COMPLETED).toBe('completed');
      expect(GameStatus.ERROR).toBe('error');
    });
  });

  describe('validateGameState', () => {
    it('should return true for valid game state', () => {
      expect(validateGameState(validGameState)).toBe(true);
    });

    it('should return true for completed game with end time', () => {
      const completedGame: GameState = {
        ...validGameState,
        currentPhotoIndex: 4,
        gameStatus: GameStatus.COMPLETED,
        endTime: new Date('2023-01-01T11:00:00Z')
      };

      expect(validateGameState(completedGame)).toBe(true);
    });

    it('should return false for null or undefined input', () => {
      expect(validateGameState(null as any)).toBe(false);
      expect(validateGameState(undefined as any)).toBe(false);
    });

    it('should return false for non-object input', () => {
      const invalidInputs = ['string', 123, true, []];
      
      invalidInputs.forEach(input => {
        expect(validateGameState(input as any)).toBe(false);
      });
    });

    describe('currentPhotoIndex validation', () => {
      it('should return false for negative currentPhotoIndex', () => {
        const gameState = { ...validGameState, currentPhotoIndex: -1 };
        expect(validateGameState(gameState)).toBe(false);
      });

      it('should return false for non-integer currentPhotoIndex', () => {
        const invalidIndices = [1.5, 'string', null, undefined, true];
        
        invalidIndices.forEach(index => {
          const gameState = { ...validGameState, currentPhotoIndex: index };
          expect(validateGameState(gameState as any)).toBe(false);
        });
      });

      it('should return false when currentPhotoIndex >= totalPhotos', () => {
        const gameState = { ...validGameState, currentPhotoIndex: 5, totalPhotos: 5 };
        expect(validateGameState(gameState)).toBe(false);
      });
    });

    describe('totalPhotos validation', () => {
      it('should return false for zero or negative totalPhotos', () => {
        const invalidTotals = [0, -1, -5];
        
        invalidTotals.forEach(total => {
          const gameState = { ...validGameState, totalPhotos: total };
          expect(validateGameState(gameState)).toBe(false);
        });
      });

      it('should return false for non-integer totalPhotos', () => {
        const invalidTotals = [1.5, 'string', null, undefined, true];
        
        invalidTotals.forEach(total => {
          const gameState = { ...validGameState, totalPhotos: total };
          expect(validateGameState(gameState as any)).toBe(false);
        });
      });
    });

    describe('gameStatus validation', () => {
      it('should return false for invalid game status', () => {
        const invalidStatuses = ['invalid_status', 123, null, undefined, true];
        
        invalidStatuses.forEach(status => {
          const gameState = { ...validGameState, gameStatus: status };
          expect(validateGameState(gameState as any)).toBe(false);
        });
      });

      it('should return true for all valid game statuses', () => {
        const validStatuses = Object.values(GameStatus);
        
        validStatuses.forEach(status => {
          let gameState = { ...validGameState, gameStatus: status };
          
          // If status is COMPLETED, we need to provide an endTime
          if (status === GameStatus.COMPLETED) {
            gameState = {
              ...gameState,
              endTime: new Date('2023-01-01T11:00:00Z')
            };
          }
          
          expect(validateGameState(gameState)).toBe(true);
        });
      });
    });

    describe('startTime validation', () => {
      it('should return false for invalid startTime', () => {
        const invalidTimes = [null, undefined, 'string', 123, true, {}];
        
        invalidTimes.forEach(time => {
          const gameState = { ...validGameState, startTime: time };
          expect(validateGameState(gameState as any)).toBe(false);
        });
      });
    });

    describe('endTime validation', () => {
      it('should return false for invalid endTime when present', () => {
        const invalidTimes = ['string', 123, true, {}];
        
        invalidTimes.forEach(time => {
          const gameState = { ...validGameState, endTime: time };
          expect(validateGameState(gameState as any)).toBe(false);
        });
      });

      it('should return false when endTime is before startTime', () => {
        const gameState: GameState = {
          ...validGameState,
          startTime: new Date('2023-01-01T11:00:00Z'),
          endTime: new Date('2023-01-01T10:00:00Z')
        };

        expect(validateGameState(gameState)).toBe(false);
      });

      it('should return false when endTime equals startTime', () => {
        const time = new Date('2023-01-01T10:00:00Z');
        const gameState: GameState = {
          ...validGameState,
          startTime: time,
          endTime: time
        };

        expect(validateGameState(gameState)).toBe(false);
      });

      it('should return false for completed game without endTime', () => {
        const gameState: GameState = {
          ...validGameState,
          gameStatus: GameStatus.COMPLETED,
          endTime: undefined
        };

        expect(validateGameState(gameState)).toBe(false);
      });
    });
  });

  describe('validatePhotoState', () => {
    it('should return true for valid photo state', () => {
      expect(validatePhotoState(validPhotoState)).toBe(true);
    });

    it('should return true for photo state with null currentPhoto', () => {
      const photoState = { ...validPhotoState, currentPhoto: null };
      expect(validatePhotoState(photoState)).toBe(true);
    });

    it('should return true for photo state with empty photos array', () => {
      const photoState = { ...validPhotoState, photos: [] };
      expect(validatePhotoState(photoState)).toBe(true);
    });

    it('should return true for photo state with error message', () => {
      const photoState = { ...validPhotoState, error: 'Failed to load photos' };
      expect(validatePhotoState(photoState)).toBe(true);
    });

    it('should return false for null or undefined input', () => {
      expect(validatePhotoState(null as any)).toBe(false);
      expect(validatePhotoState(undefined as any)).toBe(false);
    });

    it('should return false for non-object input', () => {
      const invalidInputs = ['string', 123, true, []];
      
      invalidInputs.forEach(input => {
        expect(validatePhotoState(input as any)).toBe(false);
      });
    });

    describe('photos array validation', () => {
      it('should return false for non-array photos', () => {
        const invalidPhotos = ['string', 123, true, {}, null, undefined];
        
        invalidPhotos.forEach(photos => {
          const photoState = { ...validPhotoState, photos };
          expect(validatePhotoState(photoState as any)).toBe(false);
        });
      });
    });

    describe('loading flag validation', () => {
      it('should return false for non-boolean loading', () => {
        const invalidLoading = ['string', 123, {}, [], null, undefined];
        
        invalidLoading.forEach(loading => {
          const photoState = { ...validPhotoState, loading };
          expect(validatePhotoState(photoState as any)).toBe(false);
        });
      });
    });

    describe('error validation', () => {
      it('should return false for invalid error types', () => {
        const invalidErrors = [123, true, {}, []];
        
        invalidErrors.forEach(error => {
          const photoState = { ...validPhotoState, error };
          expect(validatePhotoState(photoState as any)).toBe(false);
        });
      });
    });

    describe('currentPhoto validation', () => {
      it('should return false for invalid currentPhoto types', () => {
        const invalidCurrentPhotos = ['string', 123, true, []];
        
        invalidCurrentPhotos.forEach(currentPhoto => {
          const photoState = { ...validPhotoState, currentPhoto };
          expect(validatePhotoState(photoState as any)).toBe(false);
        });
      });
    });
  });
});