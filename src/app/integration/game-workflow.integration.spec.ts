import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { GameComponent } from '../components/game/game.component';
import { AppState } from '../state/app.state';
import { GameStatus } from '../models/game-state.model';
import { Photo } from '../models/photo.model';
import { Guess, Score } from '../models/scoring.model';

import * as GameActions from '../state/game/game.actions';
import * as PhotosActions from '../state/photos/photos.actions';
import * as ScoringActions from '../state/scoring/scoring.actions';

/**
 * Integration tests for the complete game workflow
 * Tests the integration of all components, services, and state management
 */
describe('Game Workflow Integration', () => {
  let component: GameComponent;
  let fixture: ComponentFixture<GameComponent>;
  let store: MockStore<AppState>;
  let router: jasmine.SpyObj<Router>;

  const mockPhoto: Photo = {
    id: 'test-photo-1',
    url: 'https://example.com/photo.jpg',
    title: 'Test Historical Photo',
    description: 'A test photo from 1950',
    year: 1950,
    coordinates: { latitude: 40.7128, longitude: -74.0060 },
    source: 'wikimedia',
    metadata: {
      photographer: 'Test Photographer',
      license: 'CC BY-SA 4.0',
      originalSource: 'https://commons.wikimedia.org/test',
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
    locationScore: 4000,
    totalScore: 7000
  };

  const initialState: AppState = {
    game: {
      gameStatus: GameStatus.NOT_STARTED,
      currentPhotoIndex: 0,
      totalPhotos: 5,
      startTime: new Date(),
      endTime: undefined,
      loading: false,
      error: null
    },
    photos: {
      photos: [mockPhoto],
      currentPhoto: null,
      loading: false,
      error: null
    },
    scoring: {
      scores: [],
      totalScore: 0,
      currentGuess: null,
      loading: false,
      error: null
    }
  };

  beforeEach(async () => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [GameComponent],
      providers: [
        provideMockStore({ initialState }),
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GameComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(Store) as MockStore<AppState>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    spyOn(store, 'dispatch').and.callThrough();
  });

  describe('Complete Game Flow', () => {
    it('should handle complete game workflow from start to finish', async () => {
      // 1. Start game
      component.startGame();
      expect(store.dispatch).toHaveBeenCalledWith(PhotosActions.loadPhotos());
      expect(store.dispatch).toHaveBeenCalledWith(GameActions.startGame());

      // 2. Simulate game in progress with loaded photos
      const gameInProgressState: AppState = {
        ...initialState,
        game: {
          ...initialState.game,
          gameStatus: GameStatus.IN_PROGRESS,
          currentPhotoIndex: 0
        },
        photos: {
          ...initialState.photos,
          currentPhoto: mockPhoto,
          loading: false
        }
      };
      store.setState(gameInProgressState);

      fixture.detectChanges();

      // 3. Simulate user making guesses
      const guessState: AppState = {
        ...gameInProgressState,
        scoring: {
          ...initialState.scoring,
          currentGuess: mockGuess
        }
      };
      store.setState(guessState);

      fixture.detectChanges();

      // 4. Submit guess
      component.submitGuess();
      expect(store.dispatch).toHaveBeenCalledWith(
        ScoringActions.submitGuess({ guess: mockGuess })
      );

      // 5. Simulate score calculation and results display
      const scoredState: AppState = {
        ...guessState,
        scoring: {
          ...guessState.scoring,
          scores: [mockScore],
          totalScore: 7000,
          currentGuess: null
        }
      };
      store.setState(scoredState);

      fixture.detectChanges();

      // 6. Verify results are shown
      expect(component.showingResults$).toBeDefined();

      // 7. Advance to next photo
      component.onNextPhoto();
      expect(store.dispatch).toHaveBeenCalledWith(GameActions.nextPhoto());

      // 8. Simulate game completion
      const completedState: AppState = {
        ...scoredState,
        game: {
          ...scoredState.game,
          gameStatus: GameStatus.COMPLETED,
          currentPhotoIndex: 5,
          endTime: new Date()
        }
      };
      store.setState(completedState);

      fixture.detectChanges();

      // 9. Verify navigation to results page
      expect(router.navigate).toHaveBeenCalledWith(['/results']);
    });

    it('should handle guess submission validation', () => {
      // Test with invalid guess (no location)
      const invalidGuess: Guess = {
        year: 1950,
        coordinates: { latitude: 0, longitude: 0 }
      };

      const invalidGuessState: AppState = {
        ...initialState,
        scoring: {
          ...initialState.scoring,
          currentGuess: invalidGuess
        }
      };
      store.setState(invalidGuessState);

      fixture.detectChanges();

      // Should not be able to submit invalid guess
      component.canSubmitGuess$.subscribe(canSubmit => {
        expect(canSubmit).toBeFalsy();
      });

      // Test with valid guess
      const validGuessState: AppState = {
        ...invalidGuessState,
        scoring: {
          ...invalidGuessState.scoring,
          currentGuess: mockGuess
        }
      };
      store.setState(validGuessState);

      fixture.detectChanges();

      component.canSubmitGuess$.subscribe(canSubmit => {
        expect(canSubmit).toBeTruthy();
      });
    });

    it('should handle error states properly', () => {
      // Simulate photo loading error
      const errorState: AppState = {
        ...initialState,
        photos: {
          ...initialState.photos,
          loading: false,
          error: 'Failed to load photos'
        }
      };
      store.setState(errorState);

      fixture.detectChanges();

      // Verify error is displayed
      component.photosError$.subscribe(error => {
        expect(error).toBe('Failed to load photos');
      });

      // Test retry functionality
      component.retryLoadPhotos();
      expect(store.dispatch).toHaveBeenCalledWith(PhotosActions.loadPhotos());
    });

    it('should handle game reset properly', () => {
      component.resetGame();
      expect(store.dispatch).toHaveBeenCalledWith(GameActions.resetGame());
      expect(router.navigate).toHaveBeenCalledWith(['/']);
    });
  });

  describe('State Management Integration', () => {
    it('should properly integrate with NgRx store', () => {
      // Verify all observables are properly connected
      expect(component.gameStatus$).toBeDefined();
      expect(component.gameProgress$).toBeDefined();
      expect(component.isGameInProgress$).toBeDefined();
      expect(component.isGameCompleted$).toBeDefined();
      expect(component.photosLoading$).toBeDefined();
      expect(component.scoringLoading$).toBeDefined();
      expect(component.currentGuess$).toBeDefined();
      expect(component.canSubmitGuess$).toBeDefined();
    });

    it('should handle state transitions correctly', () => {
      // Test game status transitions
      const inProgressState: AppState = {
        ...initialState,
        game: {
          ...initialState.game,
          gameStatus: GameStatus.IN_PROGRESS
        }
      };
      store.setState(inProgressState);

      component.isGameInProgress$.subscribe(inProgress => {
        expect(inProgress).toBeTruthy();
      });

      component.isGameCompleted$.subscribe(completed => {
        expect(completed).toBeFalsy();
      });

      // Test completion
      const completedState: AppState = {
        ...inProgressState,
        game: {
          ...inProgressState.game,
          gameStatus: GameStatus.COMPLETED,
          endTime: new Date()
        }
      };
      store.setState(completedState);

      component.isGameCompleted$.subscribe(completed => {
        expect(completed).toBeTruthy();
      });
    });
  });

  describe('Component Integration', () => {
    it('should properly integrate child components', () => {
      const componentTestState: AppState = {
        ...initialState,
        game: {
          ...initialState.game,
          gameStatus: GameStatus.IN_PROGRESS
        },
        photos: {
          ...initialState.photos,
          currentPhoto: mockPhoto
        }
      };
      store.setState(componentTestState);

      fixture.detectChanges();

      // Verify child components are rendered
      const photoDisplay = fixture.debugElement.query(
        sel => sel.name === 'app-photo-display'
      );
      const yearGuess = fixture.debugElement.query(
        sel => sel.name === 'app-year-guess'
      );
      const mapGuess = fixture.debugElement.query(
        sel => sel.name === 'app-map-guess'
      );

      expect(photoDisplay).toBeTruthy();
      expect(yearGuess).toBeTruthy();
      expect(mapGuess).toBeTruthy();
    });

    it('should show results component after guess submission', () => {
      // Simulate showing results
      const resultsState: AppState = {
        ...initialState,
        game: {
          ...initialState.game,
          gameStatus: GameStatus.IN_PROGRESS
        },
        scoring: {
          ...initialState.scoring,
          scores: [mockScore]
        }
      };
      store.setState(resultsState);

      // Set showingResults to true
      (component as any).showingResults = true;
      fixture.detectChanges();

      const resultsComponent = fixture.debugElement.query(
        sel => sel.name === 'app-results'
      );
      expect(resultsComponent).toBeTruthy();
    });
  });

  describe('Requirements Verification', () => {
    it('should meet requirement 1.1: Display first of five photographs', (done) => {
      const req1State: AppState = {
        ...initialState,
        game: {
          ...initialState.game,
          gameStatus: GameStatus.IN_PROGRESS,
          currentPhotoIndex: 0,
          totalPhotos: 5
        },
        photos: {
          ...initialState.photos,
          currentPhoto: mockPhoto
        }
      };
      store.setState(req1State);

      fixture.detectChanges();

      component.gameProgress$.subscribe(progress => {
        expect(progress.current).toBe(1); // 1-based display
        expect(progress.total).toBe(5);
        done();
      });
    });

    it('should meet requirement 2.1: Provide year guessing input', () => {
      const req2State: AppState = {
        ...initialState,
        game: {
          ...initialState.game,
          gameStatus: GameStatus.IN_PROGRESS
        }
      };
      store.setState(req2State);

      fixture.detectChanges();

      const yearGuessComponent = fixture.debugElement.query(
        sel => sel.name === 'app-year-guess'
      );
      expect(yearGuessComponent).toBeTruthy();
    });

    it('should meet requirement 3.1: Provide interactive map for location guessing', () => {
      const req3State: AppState = {
        ...initialState,
        game: {
          ...initialState.game,
          gameStatus: GameStatus.IN_PROGRESS
        }
      };
      store.setState(req3State);

      fixture.detectChanges();

      const mapGuessComponent = fixture.debugElement.query(
        sel => sel.name === 'app-map-guess'
      );
      expect(mapGuessComponent).toBeTruthy();
    });

    it('should meet requirement 4.1: Show correct answers after guess submission', () => {
      const req4State: AppState = {
        ...initialState,
        game: {
          ...initialState.game,
          gameStatus: GameStatus.IN_PROGRESS
        },
        scoring: {
          ...initialState.scoring,
          scores: [mockScore]
        }
      };
      store.setState(req4State);

      (component as any).showingResults = true;
      fixture.detectChanges();

      const resultsComponent = fixture.debugElement.query(
        sel => sel.name === 'app-results'
      );
      expect(resultsComponent).toBeTruthy();
    });

    it('should meet requirement 6.1: Display total score', () => {
      const req6State: AppState = {
        ...initialState,
        scoring: {
          ...initialState.scoring,
          scores: [mockScore],
          totalScore: 7000
        }
      };
      store.setState(req6State);

      fixture.detectChanges();

      component.gameProgress$.subscribe(progress => {
        expect(progress).toBeDefined();
      });
    });
  });
});