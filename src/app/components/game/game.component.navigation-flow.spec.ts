import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { GameComponent } from './game.component';
import { AppState } from '../../state/app.state';
import { GameStatus } from '../../models/game-state.model';
import * as GameActions from '../../state/game/game.actions';
import * as ScoringActions from '../../state/scoring/scoring.actions';
import * as InterfaceActions from '../../state/interface/interface.actions';

describe('GameComponent - Navigation Flow (Task 6)', () => {
  let component: GameComponent;
  let fixture: ComponentFixture<GameComponent>;
  let mockStore: jasmine.SpyObj<Store<AppState>>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const storeSpy = jasmine.createSpyObj('Store', ['select', 'dispatch']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [GameComponent],
      providers: [
        { provide: Store, useValue: storeSpy },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    mockStore = TestBed.inject(Store) as jasmine.SpyObj<Store<AppState>>;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    // Setup comprehensive store selector mocks
    mockStore.select.and.callFake((selector: any) => {
      // Convert selector to string for matching
      const selectorStr = selector.toString();
      
      // Game selectors
      if (selectorStr.includes('selectGameStatus')) {
        return of(GameStatus.IN_PROGRESS);
      }
      if (selectorStr.includes('selectGameProgress')) {
        return of({ current: 2, total: 5, percentage: 40 });
      }
      if (selectorStr.includes('selectIsGameInProgress')) {
        return of(true);
      }
      if (selectorStr.includes('selectIsGameCompleted')) {
        return of(false);
      }
      if (selectorStr.includes('selectIsGameNotStarted')) {
        return of(false);
      }
      if (selectorStr.includes('selectHasGameError')) {
        return of(false);
      }
      if (selectorStr.includes('selectGameError')) {
        return of(null);
      }
      if (selectorStr.includes('selectGameLoading')) {
        return of(false);
      }
      
      // Photo selectors
      if (selectorStr.includes('selectPhotosLoading')) {
        return of(false);
      }
      if (selectorStr.includes('selectPhotosError')) {
        return of(null);
      }
      if (selectorStr.includes('selectCurrentPhoto')) {
        return of({ id: 'photo-1', title: 'Test Photo', year: 1955, url: 'test.jpg', coordinates: { latitude: 40.7128, longitude: -74.0060 } });
      }
      
      // Scoring selectors
      if (selectorStr.includes('selectScoringLoading')) {
        return of(false);
      }
      if (selectorStr.includes('selectScoringError')) {
        return of(null);
      }
      if (selectorStr.includes('selectCurrentGuess')) {
        return of({ year: 1950, coordinates: { latitude: 40.7128, longitude: -74.0060 } });
      }
      if (selectorStr.includes('selectAllScores')) {
        return of([{ photoId: 'photo-1', yearScore: 4000, locationScore: 3000, totalScore: 7000 }]);
      }
      
      // Interface selectors
      if (selectorStr.includes('selectActiveView')) {
        return of('photo');
      }
      if (selectorStr.includes('selectTransitionInProgress')) {
        return of(false);
      }
      
      // Default fallback
      return of(null);
    });

    fixture = TestBed.createComponent(GameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('onNextPhoto method', () => {
    it('should clear current guess when advancing to next photo', () => {
      // Act
      component.onNextPhoto();

      // Assert
      expect(mockStore.dispatch).toHaveBeenCalledWith(ScoringActions.clearCurrentGuess());
    });

    it('should reset interface state when advancing to next photo', () => {
      // Act
      component.onNextPhoto();

      // Assert
      expect(mockStore.dispatch).toHaveBeenCalledWith(InterfaceActions.resetForNewPhoto());
    });

    it('should dispatch nextPhoto action when advancing to next photo', () => {
      // Act
      component.onNextPhoto();

      // Assert
      expect(mockStore.dispatch).toHaveBeenCalledWith(GameActions.nextPhoto());
    });

    it('should dispatch actions in correct order for proper navigation flow', () => {
      // Act
      component.onNextPhoto();

      // Assert - verify the order of dispatched actions
      const dispatchCalls = mockStore.dispatch.calls.all();
      expect(dispatchCalls.length).toBe(3);
      
      // First: Clear current guess to hide results
      expect(dispatchCalls[0].args[0]).toEqual(ScoringActions.clearCurrentGuess());
      
      // Second: Reset interface state
      expect(dispatchCalls[1].args[0]).toEqual(InterfaceActions.resetForNewPhoto());
      
      // Third: Advance to next photo
      expect(dispatchCalls[2].args[0]).toEqual(GameActions.nextPhoto());
    });

    it('should set showingResults flag to false', () => {
      // Arrange
      component['showingResults'] = true;

      // Act
      component.onNextPhoto();

      // Assert
      expect(component['showingResults']).toBe(false);
    });
  });

  describe('showingResults$ observable', () => {
    it('should return true when there is both a current guess and a score for current photo', (done) => {
      // Arrange - mock store to return current guess, photo, and matching score
      mockStore.select.and.callFake((selector: any) => {
        if (selector.toString().includes('selectCurrentGuess')) {
          return of({ year: 1950, coordinates: { latitude: 40.7128, longitude: -74.0060 } });
        }
        if (selector.toString().includes('selectCurrentPhoto')) {
          return of({ id: 'photo-1', title: 'Test Photo', year: 1955, url: 'test.jpg', coordinates: { latitude: 40.7128, longitude: -74.0060 } });
        }
        if (selector.toString().includes('selectAllScores')) {
          return of([{ photoId: 'photo-1', yearScore: 4000, locationScore: 3000, totalScore: 7000 }]);
        }
        return of(null);
      });

      // Recreate component to pick up new mock behavior
      fixture = TestBed.createComponent(GameComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      // Act & Assert
      component.showingResults$.subscribe(showingResults => {
        expect(showingResults).toBe(true);
        done();
      });
    });

    it('should return false when there is no current guess', (done) => {
      // Arrange - mock store to return no current guess
      mockStore.select.and.callFake((selector: any) => {
        if (selector.toString().includes('selectCurrentGuess')) {
          return of(null);
        }
        if (selector.toString().includes('selectCurrentPhoto')) {
          return of({ id: 'photo-1', title: 'Test Photo', year: 1955, url: 'test.jpg', coordinates: { latitude: 40.7128, longitude: -74.0060 } });
        }
        if (selector.toString().includes('selectAllScores')) {
          return of([{ photoId: 'photo-1', yearScore: 4000, locationScore: 3000, totalScore: 7000 }]);
        }
        return of(null);
      });

      // Recreate component to pick up new mock behavior
      fixture = TestBed.createComponent(GameComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      // Act & Assert
      component.showingResults$.subscribe(showingResults => {
        expect(showingResults).toBe(false);
        done();
      });
    });

    it('should return false when there is no score for current photo', (done) => {
      // Arrange - mock store to return current guess but no matching score
      mockStore.select.and.callFake((selector: any) => {
        if (selector.toString().includes('selectCurrentGuess')) {
          return of({ year: 1950, coordinates: { latitude: 40.7128, longitude: -74.0060 } });
        }
        if (selector.toString().includes('selectCurrentPhoto')) {
          return of({ id: 'photo-1', title: 'Test Photo', year: 1955, url: 'test.jpg', coordinates: { latitude: 40.7128, longitude: -74.0060 } });
        }
        if (selector.toString().includes('selectAllScores')) {
          return of([{ photoId: 'photo-2', yearScore: 4000, locationScore: 3000, totalScore: 7000 }]); // Different photo ID
        }
        return of(null);
      });

      // Recreate component to pick up new mock behavior
      fixture = TestBed.createComponent(GameComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      // Act & Assert
      component.showingResults$.subscribe(showingResults => {
        expect(showingResults).toBe(false);
        done();
      });
    });
  });

  describe('Navigation flow integration', () => {
    it('should transition from results view to game view when onNextPhoto is called', (done) => {
      // Arrange - start with showing results
      mockStore.select.and.callFake((selector: any) => {
        if (selector.toString().includes('selectCurrentGuess')) {
          return of({ year: 1950, coordinates: { latitude: 40.7128, longitude: -74.0060 } });
        }
        if (selector.toString().includes('selectCurrentPhoto')) {
          return of({ id: 'photo-1', title: 'Test Photo', year: 1955, url: 'test.jpg', coordinates: { latitude: 40.7128, longitude: -74.0060 } });
        }
        if (selector.toString().includes('selectAllScores')) {
          return of([{ photoId: 'photo-1', yearScore: 4000, locationScore: 3000, totalScore: 7000 }]);
        }
        return of(null);
      });

      // Recreate component to pick up new mock behavior
      fixture = TestBed.createComponent(GameComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      // Verify we start with showing results
      component.showingResults$.subscribe(showingResults => {
        expect(showingResults).toBe(true);
        
        // Act - call onNextPhoto
        component.onNextPhoto();
        
        // Assert - verify local flag is set to false
        expect(component['showingResults']).toBe(false);
        
        // Verify correct actions were dispatched
        expect(mockStore.dispatch).toHaveBeenCalledWith(ScoringActions.clearCurrentGuess());
        expect(mockStore.dispatch).toHaveBeenCalledWith(InterfaceActions.resetForNewPhoto());
        expect(mockStore.dispatch).toHaveBeenCalledWith(GameActions.nextPhoto());
        
        done();
      });
    });
  });
});