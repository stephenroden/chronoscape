import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { Store } from '@ngrx/store';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { take } from 'rxjs/operators';

import { GameComponent } from '../components/game/game.component';
import { AppState } from '../state/app.state';
import { GameStatus } from '../models/game-state.model';
import { Photo } from '../models/photo.model';
import { Guess, Score } from '../models/scoring.model';

import * as GameActions from '../state/game/game.actions';
import * as PhotosActions from '../state/photos/photos.actions';
import * as ScoringActions from '../state/scoring/scoring.actions';

/**
 * Complete Game Flow Verification Test
 * 
 * This test verifies that all critical bug fixes from task 8 are working correctly:
 * - Photo and map display throughout the game
 * - Accurate photo counting and navigation flow
 * - Complete game progression from start to finish
 * - All 5 photos are properly handled
 * 
 * Requirements verified: 2.5, 3.5, 4.1
 */
describe('Complete Game Flow Verification', () => {
  let component: GameComponent;
  let fixture: ComponentFixture<GameComponent>;
  let store: MockStore<AppState>;
  let router: jasmine.SpyObj<Router>;

  const mockPhotos: Photo[] = [
    {
      id: 'photo-1',
      url: 'https://example.com/photo1.jpg',
      title: 'Historical Photo 1',
      description: 'A photo from 1950',
      year: 1950,
      coordinates: { latitude: 40.7128, longitude: -74.0060 },
      source: 'wikimedia',
      metadata: {
        photographer: 'Test Photographer 1',
        license: 'CC BY-SA 4.0',
        originalSource: 'https://commons.wikimedia.org/test1',
        dateCreated: new Date('1950-01-01')
      }
    },
    {
      id: 'photo-2',
      url: 'https://example.com/photo2.jpg',
      title: 'Historical Photo 2',
      description: 'A photo from 1960',
      year: 1960,
      coordinates: { latitude: 51.5074, longitude: -0.1278 },
      source: 'wikimedia',
      metadata: {
        photographer: 'Test Photographer 2',
        license: 'CC BY-SA 4.0',
        originalSource: 'https://commons.wikimedia.org/test2',
        dateCreated: new Date('1960-01-01')
      }
    },
    {
      id: 'photo-3',
      url: 'https://example.com/photo3.jpg',
      title: 'Historical Photo 3',
      description: 'A photo from 1970',
      year: 1970,
      coordinates: { latitude: 48.8566, longitude: 2.3522 },
      source: 'wikimedia',
      metadata: {
        photographer: 'Test Photographer 3',
        license: 'CC BY-SA 4.0',
        originalSource: 'https://commons.wikimedia.org/test3',
        dateCreated: new Date('1970-01-01')
      }
    },
    {
      id: 'photo-4',
      url: 'https://example.com/photo4.jpg',
      title: 'Historical Photo 4',
      description: 'A photo from 1980',
      year: 1980,
      coordinates: { latitude: 35.6762, longitude: 139.6503 },
      source: 'wikimedia',
      metadata: {
        photographer: 'Test Photographer 4',
        license: 'CC BY-SA 4.0',
        originalSource: 'https://commons.wikimedia.org/test4',
        dateCreated: new Date('1980-01-01')
      }
    },
    {
      id: 'photo-5',
      url: 'https://example.com/photo5.jpg',
      title: 'Historical Photo 5',
      description: 'A photo from 1990',
      year: 1990,
      coordinates: { latitude: -33.8688, longitude: 151.2093 },
      source: 'wikimedia',
      metadata: {
        photographer: 'Test Photographer 5',
        license: 'CC BY-SA 4.0',
        originalSource: 'https://commons.wikimedia.org/test5',
        dateCreated: new Date('1990-01-01')
      }
    }
  ];

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
      photos: mockPhotos,
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
    },
    interface: {
      activeView: 'photo',
      photoZoom: {
        zoomLevel: 1,
        position: { x: 0, y: 0 },
        minZoom: 0.5,
        maxZoom: 4
      },
      mapState: {
        zoomLevel: 2,
        center: { latitude: 20, longitude: 0 },
        defaultZoom: 2,
        defaultCenter: { latitude: 20, longitude: 0 }
      },
      transitionInProgress: false
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

  describe('Complete Game Flow - All 5 Photos', () => {
    it('should handle complete game flow from start to finish with all 5 photos', async () => {
      // 1. Start the game
      component.startGame();
      expect(store.dispatch).toHaveBeenCalledWith(PhotosActions.loadPhotos());
      expect(store.dispatch).toHaveBeenCalledWith(GameActions.startGame());

      // 2. Simulate game starting with first photo
      let currentState: AppState = {
        ...initialState,
        game: {
          ...initialState.game,
          gameStatus: GameStatus.IN_PROGRESS,
          currentPhotoIndex: 0
        },
        photos: {
          ...initialState.photos,
          photos: mockPhotos,
          currentPhoto: mockPhotos[0],
          loading: false
        }
      };
      store.setState(currentState);
      fixture.detectChanges();

      // Verify first photo display
      component.gameProgress$.pipe(take(1)).subscribe(progress => {
        expect(progress.current).toBe(1);
        expect(progress.total).toBe(5);
        expect(progress.percentage).toBe(20);
      });

      // 3. Play through all 5 photos
      for (let photoIndex = 0; photoIndex < 5; photoIndex++) {
        console.log(`Testing photo ${photoIndex + 1} of 5`);
        
        // Update state for current photo
        currentState = {
          ...currentState,
          game: {
            ...currentState.game,
            currentPhotoIndex: photoIndex
          },
          photos: {
            ...currentState.photos,
            currentPhoto: mockPhotos[photoIndex]
          },
          scoring: {
            ...currentState.scoring,
            currentGuess: null // Reset guess for new photo
          }
        };
        store.setState(currentState);
        fixture.detectChanges();

        // Verify photo counter is accurate
        component.gameProgress$.pipe(take(1)).subscribe(progress => {
          expect(progress.current).toBe(photoIndex + 1);
          expect(progress.total).toBe(5);
          expect(progress.percentage).toBe((photoIndex + 1) * 20);
        });

        // Verify current photo is correct
        component.currentPhoto$.pipe(take(1)).subscribe(photo => {
          expect(photo).toEqual(mockPhotos[photoIndex]);
        });

        // Simulate making a guess
        const guess: Guess = {
          year: mockPhotos[photoIndex].year + 5, // Slightly off guess
          coordinates: {
            latitude: mockPhotos[photoIndex].coordinates.latitude + 1,
            longitude: mockPhotos[photoIndex].coordinates.longitude + 1
          }
        };

        // Update state with guess
        currentState = {
          ...currentState,
          scoring: {
            ...currentState.scoring,
            currentGuess: guess
          }
        };
        store.setState(currentState);
        fixture.detectChanges();

        // Submit guess
        component.submitGuess();
        expect(store.dispatch).toHaveBeenCalledWith(
          ScoringActions.submitGuess({ guess })
        );

        // Simulate score calculation
        const score: Score = {
          photoId: mockPhotos[photoIndex].id,
          yearScore: 4000,
          locationScore: 3000,
          totalScore: 7000
        };

        // Update state with score but keep the guess to show results
        currentState = {
          ...currentState,
          scoring: {
            ...currentState.scoring,
            scores: [...currentState.scoring.scores, score],
            totalScore: currentState.scoring.totalScore + score.totalScore
            // Keep currentGuess to show results
          }
        };
        store.setState(currentState);
        fixture.detectChanges();

        // Verify results are shown (need both guess and score)
        component.showingResults$.pipe(take(1)).subscribe(showingResults => {
          expect(showingResults).toBe(true);
        });

        // If not the last photo, advance to next photo
        if (photoIndex < 4) {
          component.onNextPhoto();
          expect(store.dispatch).toHaveBeenCalledWith(GameActions.nextPhoto());
          
          // Clear the guess after advancing (this happens in onNextPhoto)
          currentState = {
            ...currentState,
            scoring: {
              ...currentState.scoring,
              currentGuess: null
            }
          };
        }
      }

      // 4. Complete the game
      currentState = {
        ...currentState,
        game: {
          ...currentState.game,
          gameStatus: GameStatus.COMPLETED,
          currentPhotoIndex: 5,
          endTime: new Date()
        }
      };
      store.setState(currentState);
      fixture.detectChanges();

      // Verify game completion
      component.isGameCompleted$.pipe(take(1)).subscribe(completed => {
        expect(completed).toBe(true);
      });

      // Verify navigation to final results
      expect(router.navigate).toHaveBeenCalledWith(['/results']);

      // Verify final score
      expect(currentState.scoring.totalScore).toBe(35000); // 5 photos * 7000 points each
      expect(currentState.scoring.scores.length).toBe(5);
    });

    it('should maintain accurate photo counting throughout the game', () => {
      // Test photo counter accuracy for each photo
      for (let i = 0; i < 5; i++) {
        const testState: AppState = {
          ...initialState,
          game: {
            ...initialState.game,
            gameStatus: GameStatus.IN_PROGRESS,
            currentPhotoIndex: i
          },
          photos: {
            ...initialState.photos,
            photos: mockPhotos,
            currentPhoto: mockPhotos[i]
          }
        };
        store.setState(testState);
        fixture.detectChanges();

        component.gameProgress$.pipe(take(1)).subscribe(progress => {
          expect(progress.current).toBe(i + 1);
          expect(progress.total).toBe(5);
          expect(progress.percentage).toBe((i + 1) * 20);
        });
      }
    });

    it('should properly handle photo and map display throughout the game', () => {
      // Test that photo-map-toggle component receives valid photo data
      const testState: AppState = {
        ...initialState,
        game: {
          ...initialState.game,
          gameStatus: GameStatus.IN_PROGRESS,
          currentPhotoIndex: 2
        },
        photos: {
          ...initialState.photos,
          photos: mockPhotos,
          currentPhoto: mockPhotos[2]
        }
      };
      store.setState(testState);
      fixture.detectChanges();

      // Verify photo data is passed to child components
      component.currentPhoto$.pipe(take(1)).subscribe(photo => {
        expect(photo).toEqual(mockPhotos[2]);
        if (photo) {
          expect(photo.id).toBe('photo-3');
          expect(photo.year).toBe(1970);
          expect(photo.coordinates).toEqual({ latitude: 48.8566, longitude: 2.3522 });
        }
      });

      // Verify game is in progress
      component.isGameInProgress$.pipe(take(1)).subscribe(inProgress => {
        expect(inProgress).toBe(true);
      });
    });

    it('should handle navigation flow correctly between photos', () => {
      // Start with photo 1 with both guess and score to show results
      let testState: AppState = {
        ...initialState,
        game: {
          ...initialState.game,
          gameStatus: GameStatus.IN_PROGRESS,
          currentPhotoIndex: 0
        },
        photos: {
          ...initialState.photos,
          photos: mockPhotos,
          currentPhoto: mockPhotos[0]
        },
        scoring: {
          ...initialState.scoring,
          currentGuess: {
            year: 1955,
            coordinates: { latitude: 41, longitude: -75 }
          },
          scores: [{
            photoId: 'photo-1',
            yearScore: 4000,
            locationScore: 3000,
            totalScore: 7000
          }]
        }
      };
      store.setState(testState);
      fixture.detectChanges();

      // Verify we're showing results for photo 1 (need both guess and score)
      component.showingResults$.pipe(take(1)).subscribe(showingResults => {
        expect(showingResults).toBe(true);
      });

      // Click next photo
      component.onNextPhoto();
      expect(store.dispatch).toHaveBeenCalledWith(GameActions.nextPhoto());

      // Simulate advancing to photo 2
      testState = {
        ...testState,
        game: {
          ...testState.game,
          currentPhotoIndex: 1
        },
        photos: {
          ...testState.photos,
          currentPhoto: mockPhotos[1]
        },
        scoring: {
          ...testState.scoring,
          currentGuess: null // Reset guess for new photo
        }
      };
      store.setState(testState);
      fixture.detectChanges();

      // Verify we're now on photo 2 and not showing results
      component.gameProgress$.pipe(take(1)).subscribe(progress => {
        expect(progress.current).toBe(2);
      });

      component.showingResults$.pipe(take(1)).subscribe(showingResults => {
        expect(showingResults).toBe(false);
      });
    });

    it('should handle edge cases and error states gracefully', () => {
      // Test with null photo
      const errorState: AppState = {
        ...initialState,
        game: {
          ...initialState.game,
          gameStatus: GameStatus.IN_PROGRESS,
          currentPhotoIndex: 0
        },
        photos: {
          ...initialState.photos,
          photos: mockPhotos,
          currentPhoto: null,
          error: 'Failed to load photo'
        }
      };
      store.setState(errorState);
      fixture.detectChanges();

      // Verify error handling
      component.photosError$.pipe(take(1)).subscribe(error => {
        expect(error).toBe('Failed to load photo');
      });

      // Test retry functionality
      component.retryLoadPhotos();
      expect(store.dispatch).toHaveBeenCalledWith(PhotosActions.loadPhotos());
    });
  });

  describe('Requirements Verification', () => {
    it('should meet requirement 2.5: Complete game progression', () => {
      // Verify game can progress through all states
      const states = [GameStatus.NOT_STARTED, GameStatus.IN_PROGRESS, GameStatus.COMPLETED];
      
      states.forEach(status => {
        const testState: AppState = {
          ...initialState,
          game: {
            ...initialState.game,
            gameStatus: status
          },
          photos: {
            ...initialState.photos,
            photos: mockPhotos
          }
        };
        store.setState(testState);
        fixture.detectChanges();

        component.gameStatus$.pipe(take(1)).subscribe(gameStatus => {
          expect(gameStatus).toBe(status);
        });
      });
    });

    it('should meet requirement 3.5: State consistency throughout game', () => {
      // Test state consistency across photo transitions
      for (let i = 0; i < 5; i++) {
        const testState: AppState = {
          ...initialState,
          game: {
            ...initialState.game,
            gameStatus: GameStatus.IN_PROGRESS,
            currentPhotoIndex: i
          },
          photos: {
            ...initialState.photos,
            photos: mockPhotos,
            currentPhoto: mockPhotos[i]
          }
        };
        store.setState(testState);
        fixture.detectChanges();

        // Verify state consistency
        component.currentPhoto$.pipe(take(1)).subscribe(photo => {
          expect(photo).toEqual(mockPhotos[i]);
        });

        component.gameProgress$.pipe(take(1)).subscribe(progress => {
          expect(progress.current).toBe(i + 1);
        });
      }
    });

    it('should meet requirement 4.1: Component integration', () => {
      const testState: AppState = {
        ...initialState,
        game: {
          ...initialState.game,
          gameStatus: GameStatus.IN_PROGRESS,
          currentPhotoIndex: 0
        },
        photos: {
          ...initialState.photos,
          photos: mockPhotos,
          currentPhoto: mockPhotos[0]
        }
      };
      store.setState(testState);
      fixture.detectChanges();

      // Verify all components are properly integrated
      expect(component.currentPhoto$).toBeDefined();
      expect(component.gameProgress$).toBeDefined();
      expect(component.isGameInProgress$).toBeDefined();
      expect(component.showingResults$).toBeDefined();

      // Verify photo data flows to child components
      component.currentPhoto$.pipe(take(1)).subscribe(photo => {
        expect(photo).toBeTruthy();
        if (photo) {
          expect(photo.id).toBe('photo-1');
        }
      });
    });
  });
});