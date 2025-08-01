import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { Observable, of } from 'rxjs';
import { Action } from '@ngrx/store';
import { ScoringEffects } from './scoring.effects';
import { ScoringService } from '../../services/scoring.service';
import * as ScoringActions from './scoring.actions';
import * as GameActions from '../game/game.actions';
import * as PhotosActions from '../photos/photos.actions';
import { selectCurrentPhoto } from '../photos/photos.selectors';
import { selectCurrentPhotoIndex, selectTotalPhotos } from '../game/game.selectors';
import { selectScoresCount } from './scoring.selectors';
import { Photo } from '../../models/photo.model';
import { Guess, Score } from '../../models/scoring.model';
import { GameStatus } from '../../models/game-state.model';

describe('ScoringEffects', () => {
  let actions$: Observable<Action>;
  let effects: ScoringEffects;
  let store: MockStore;
  let scoringService: jasmine.SpyObj<ScoringService>;

  const mockPhoto: Photo = {
    id: 'test-photo-1',
    url: 'https://example.com/photo.jpg',
    title: 'Test Photo',
    year: 1950,
    coordinates: { latitude: 40.7128, longitude: -74.0060 },
    source: 'test',
    metadata: {
      license: 'CC0',
      originalSource: 'test',
      dateCreated: new Date('1950-01-01')
    }
  };

  const mockGuess: Guess = {
    year: 1955,
    coordinates: { latitude: 40.7000, longitude: -74.0000 }
  };

  const mockScore: Score = {
    photoId: 'test-photo-1',
    yearScore: 3000,
    locationScore: 5000,
    totalScore: 8000
  };

  const initialState = {
    game: {
      currentPhotoIndex: 0,
      totalPhotos: 5,
      gameStatus: GameStatus.IN_PROGRESS,
      startTime: new Date(),
      endTime: undefined
    },
    photos: {
      photos: [mockPhoto],
      currentPhoto: mockPhoto,
      loading: false,
      error: null
    },
    scoring: {
      scores: [],
      totalScore: 0,
      currentGuess: null
    }
  };

  beforeEach(() => {
    const scoringServiceSpy = jasmine.createSpyObj('ScoringService', [
      'calculateScore',
      'calculateYearScore',
      'calculateLocationScore'
    ]);

    TestBed.configureTestingModule({
      providers: [
        ScoringEffects,
        provideMockActions(() => actions$),
        provideMockStore({ initialState }),
        { provide: ScoringService, useValue: scoringServiceSpy }
      ]
    });

    effects = TestBed.inject(ScoringEffects);
    store = TestBed.inject(MockStore);
    scoringService = TestBed.inject(ScoringService) as jasmine.SpyObj<ScoringService>;
  });

  describe('validateGuess$', () => {
    it('should return guessValidationSuccess for valid guess', (done) => {
      const action = ScoringActions.validateGuess({ guess: mockGuess });
      actions$ = of(action);

      effects.validateGuess$.subscribe((result: Action) => {
        expect(result).toEqual(ScoringActions.guessValidationSuccess({ guess: mockGuess }));
        done();
      });
    });

    it('should return guessValidationFailure for invalid year', (done) => {
      const invalidGuess: Guess = {
        year: 1800, // Invalid year (before 1900)
        coordinates: { latitude: 40.7000, longitude: -74.0000 }
      };
      
      const action = ScoringActions.validateGuess({ guess: invalidGuess });
      actions$ = of(action);

      effects.validateGuess$.subscribe((result: Action) => {
        expect(result.type).toBe(ScoringActions.guessValidationFailure.type);
        expect((result as any).error).toContain('Invalid guess');
        done();
      });
    });

    it('should return guessValidationFailure for invalid coordinates', (done) => {
      const invalidGuess: Guess = {
        year: 1950,
        coordinates: { latitude: 200, longitude: -74.0000 } // Invalid latitude
      };
      
      const action = ScoringActions.validateGuess({ guess: invalidGuess });
      actions$ = of(action);

      effects.validateGuess$.subscribe((result: Action) => {
        expect(result.type).toBe(ScoringActions.guessValidationFailure.type);
        expect((result as any).error).toContain('Invalid guess');
        done();
      });
    });
  });

  describe('submitGuess$', () => {
    it('should trigger score calculation for valid guess with current photo', (done) => {
      store.overrideSelector(selectCurrentPhoto, mockPhoto);
      
      const action = ScoringActions.submitGuess({ guess: mockGuess });
      actions$ = of(action);

      effects.submitGuess$.subscribe((result: Action) => {
        expect(result).toEqual(ScoringActions.calculateScore({
          photoId: mockPhoto.id,
          guess: mockGuess,
          actualYear: mockPhoto.year,
          actualCoordinates: mockPhoto.coordinates
        }));
        done();
      });
    });

    it('should return validation failure when no current photo', (done) => {
      store.overrideSelector(selectCurrentPhoto, null);
      
      const action = ScoringActions.submitGuess({ guess: mockGuess });
      actions$ = of(action);

      effects.submitGuess$.subscribe((result: Action) => {
        expect(result.type).toBe(ScoringActions.guessValidationFailure.type);
        expect((result as any).error).toContain('No current photo available');
        done();
      });
    });

    it('should return validation failure for invalid guess', (done) => {
      store.overrideSelector(selectCurrentPhoto, mockPhoto);
      
      const invalidGuess: Guess = {
        year: 1800, // Invalid year
        coordinates: { latitude: 40.7000, longitude: -74.0000 }
      };
      
      const action = ScoringActions.submitGuess({ guess: invalidGuess });
      actions$ = of(action);

      effects.submitGuess$.subscribe((result: Action) => {
        expect(result.type).toBe(ScoringActions.guessValidationFailure.type);
        expect((result as any).error).toContain('Invalid guess provided');
        done();
      });
    });
  });

  describe('calculateScore$', () => {
    it('should calculate score and return addScore action', (done) => {
      scoringService.calculateScore.and.returnValue(mockScore);
      
      const action = ScoringActions.calculateScore({
        photoId: mockPhoto.id,
        guess: mockGuess,
        actualYear: mockPhoto.year,
        actualCoordinates: mockPhoto.coordinates
      });
      actions$ = of(action);

      effects.calculateScore$.subscribe((result: Action) => {
        expect(scoringService.calculateScore).toHaveBeenCalledWith(
          mockPhoto.id,
          mockGuess,
          mockPhoto.year,
          mockPhoto.coordinates
        );
        expect(result).toEqual(ScoringActions.addScore({ score: mockScore }));
        done();
      });
    });

    it('should handle scoring service errors', (done) => {
      scoringService.calculateScore.and.throwError('Calculation error');
      
      const action = ScoringActions.calculateScore({
        photoId: mockPhoto.id,
        guess: mockGuess,
        actualYear: mockPhoto.year,
        actualCoordinates: mockPhoto.coordinates
      });
      actions$ = of(action);

      effects.calculateScore$.subscribe((result: Action) => {
        expect(result.type).toBe(ScoringActions.guessValidationFailure.type);
        expect((result as any).error).toContain('Score calculation failed');
        done();
      });
    });
  });

  describe('updateCurrentPhoto$', () => {
    it('should set current photo to next index', (done) => {
      store.overrideSelector(selectCurrentPhotoIndex, 1);
      
      const action = GameActions.nextPhoto();
      actions$ = of(action);

      effects.updateCurrentPhoto$.subscribe((result: Action) => {
        expect(result).toEqual(PhotosActions.setCurrentPhoto({ photoIndex: 2 }));
        done();
      });
    });
  });

  // Removed clearGuessAfterScoring$ test since the effect was removed
  // to allow results to be displayed before advancing to next photo

  describe('integration scenarios', () => {
    it('should handle complete scoring workflow', (done) => {
      // Test the complete flow from guess submission to score calculation
      scoringService.calculateScore.and.returnValue(mockScore);
      store.overrideSelector(selectCurrentPhoto, mockPhoto);

      let effectsCompleted = 0;
      const totalEffects = 2; // submitGuess$ and calculateScore$

      // Test submitGuess$ effect
      actions$ = of(ScoringActions.submitGuess({ guess: mockGuess }));
      effects.submitGuess$.subscribe((result: Action) => {
        expect(result.type).toBe(ScoringActions.calculateScore.type);
        effectsCompleted++;
        if (effectsCompleted === totalEffects) done();
      });

      // Test calculateScore$ effect
      actions$ = of(ScoringActions.calculateScore({
        photoId: mockPhoto.id,
        guess: mockGuess,
        actualYear: mockPhoto.year,
        actualCoordinates: mockPhoto.coordinates
      }));
      effects.calculateScore$.subscribe((result: Action) => {
        expect(result.type).toBe(ScoringActions.addScore.type);
        effectsCompleted++;
        if (effectsCompleted === totalEffects) done();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors in validateGuess$', (done) => {
      const invalidGuess: Guess = {
        year: 1800, // Before 1900
        coordinates: { latitude: 40.7128, longitude: -74.0060 }
      };
      const action = ScoringActions.validateGuess({ guess: invalidGuess });
      actions$ = of(action);

      effects.validateGuess$.subscribe((result: any) => {
        expect(result.type).toBe(ScoringActions.guessValidationFailure.type);
        expect(result.error).toContain('Invalid guess');
        done();
      });
    });

    it('should handle missing photo in submitGuess$', (done) => {
      store.overrideSelector(selectCurrentPhoto, null);
      const action = ScoringActions.submitGuess({ guess: mockGuess });
      actions$ = of(action);

      effects.submitGuess$.subscribe((result: any) => {
        expect(result.type).toBe(ScoringActions.guessValidationFailure.type);
        expect(result.error).toContain('No current photo available');
        done();
      });
    });

    it('should handle scoring service errors in calculateScore$', (done) => {
      spyOn(console, 'error');
      scoringService.calculateScore.and.throwError('Scoring service error');
      
      const action = ScoringActions.calculateScore({
        photoId: 'test-photo-1',
        guess: mockGuess,
        actualYear: 1950,
        actualCoordinates: { latitude: 40.7128, longitude: -74.0060 }
      });
      actions$ = of(action);

      effects.calculateScore$.subscribe((result: any) => {
        expect(result.type).toBe(ScoringActions.setScoringError.type);
        expect(result.error).toContain('Calculation error');
        expect(console.error).toHaveBeenCalled();
        done();
      });
    });
  });
});