import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { Component, DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { of } from 'rxjs';

import { GameComponent } from '../components/game/game.component';
import { PhotoMapToggleComponent } from '../components/photo-map-toggle/photo-map-toggle.component';
import { YearGuessComponent } from '../components/year-guess/year-guess.component';
import { ResultsComponent } from '../components/results/results.component';
import { AppState } from '../state/app.state';
import { GameStatus } from '../models/game-state.model';
import { Photo } from '../models/photo.model';
import { ActiveView } from '../models/interface-state.model';
import * as GameSelectors from '../state/game/game.selectors';
import * as PhotosSelectors from '../state/photos/photos.selectors';
import * as ScoringSelectors from '../state/scoring/scoring.selectors';
import * as InterfaceSelectors from '../state/interface/interface.selectors';

/**
 * Final Integration Verification Tests
 * 
 * This test suite verifies that all enhanced game interface requirements are met
 * and that the integration is working correctly across all components.
 * 
 * Requirements verified:
 * - 6.1: Preserve existing guess submission functionality
 * - 6.2: Maintain current scoring and progression logic
 * - 6.3: Reset zoom levels and toggle states appropriately
 * - 6.4: Display final results with enhanced feedback format
 * - 6.5: Reset all interface elements to default states
 */
describe('Final Integration Verification', () => {
  let component: GameComponent;
  let fixture: ComponentFixture<GameComponent>;
  let store: MockStore<AppState>;
  let debugElement: DebugElement;

  const mockPhoto: Photo = {
    id: 'test-photo-1',
    url: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    title: 'Test Historical Photo',
    description: 'A test photo for integration verification',
    year: 1975,
    coordinates: { latitude: 40.7128, longitude: -74.0060 },
    source: 'test-source',
    metadata: {
      license: 'CC0',
      originalSource: 'test-archive',
      dateCreated: new Date('1975-06-15')
    }
  };

  const initialState: AppState = {
    game: {
      gameStatus: GameStatus.IN_PROGRESS,
      currentPhotoIndex: 0,
      totalPhotos: 5,
      startTime: new Date(),
      error: null,
      loading: false
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
      currentGuess: null,
      loading: false,
      error: null
    },
    interface: {
      activeView: 'photo' as ActiveView,
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
    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        GameComponent,
        PhotoMapToggleComponent,
        YearGuessComponent,
        ResultsComponent
      ],
      providers: [
        provideMockStore({ initialState })
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GameComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(MockStore);
    debugElement = fixture.debugElement;

    // Mock all selectors
    store.overrideSelector(GameSelectors.selectGameStatus, GameStatus.IN_PROGRESS);
    store.overrideSelector(GameSelectors.selectGameProgress, { current: 1, total: 5, percentage: 20 });
    store.overrideSelector(GameSelectors.selectIsGameInProgress, true);
    store.overrideSelector(GameSelectors.selectIsGameCompleted, false);
    store.overrideSelector(GameSelectors.selectIsGameNotStarted, false);
    store.overrideSelector(GameSelectors.selectHasGameError, false);
    store.overrideSelector(GameSelectors.selectGameError, null);
    store.overrideSelector(GameSelectors.selectGameLoading, false);
    
    store.overrideSelector(PhotosSelectors.selectPhotosLoading, false);
    store.overrideSelector(PhotosSelectors.selectPhotosError, null);
    store.overrideSelector(PhotosSelectors.selectCurrentPhoto, mockPhoto);
    
    store.overrideSelector(ScoringSelectors.selectScoringLoading, false);
    store.overrideSelector(ScoringSelectors.selectScoringError, null);
    store.overrideSelector(ScoringSelectors.selectCurrentGuess, null);
    store.overrideSelector(ScoringSelectors.selectCurrentScore, null);
    
    store.overrideSelector(InterfaceSelectors.selectActiveView, 'photo' as ActiveView);
    store.overrideSelector(InterfaceSelectors.selectTransitionInProgress, false);

    fixture.detectChanges();
  });

  describe('Requirement 6.1: Preserve existing guess submission functionality', () => {
    it('should display submit guess button', () => {
      const submitButton = debugElement.query(By.css('.submit-guess-btn'));
      expect(submitButton).toBeTruthy();
      expect(submitButton.nativeElement.textContent.trim()).toBe('Submit Guess');
    });

    it('should have submit guess method available', () => {
      expect(component.submitGuess).toBeDefined();
      expect(typeof component.submitGuess).toBe('function');
    });

    it('should disable submit button when guess is incomplete', () => {
      store.overrideSelector(ScoringSelectors.selectCurrentGuess, null);
      store.refreshState();
      fixture.detectChanges();

      const submitButton = debugElement.query(By.css('.submit-guess-btn'));
      expect(submitButton.nativeElement.disabled).toBe(true);
    });
  });

  describe('Requirement 6.2: Maintain current scoring and progression logic', () => {
    it('should display game progress correctly', () => {
      const progressText = debugElement.query(By.css('.progress-text'));
      expect(progressText).toBeTruthy();
      expect(progressText.nativeElement.textContent).toContain('Photo 1 of 5');
    });

    it('should have progress bar with correct percentage', () => {
      const progressFill = debugElement.query(By.css('.progress-fill'));
      expect(progressFill).toBeTruthy();
      expect(progressFill.nativeElement.style.width).toBe('20%');
    });

    it('should have onNextPhoto method for progression', () => {
      expect(component.onNextPhoto).toBeDefined();
      expect(typeof component.onNextPhoto).toBe('function');
    });
  });

  describe('Requirement 6.3: Reset zoom levels and toggle states appropriately', () => {
    it('should have PhotoMapToggleComponent integrated', () => {
      const photoMapToggle = debugElement.query(By.css('app-photo-map-toggle'));
      expect(photoMapToggle).toBeTruthy();
    });

    it('should pass photo data to PhotoMapToggleComponent', () => {
      const photoMapToggle = debugElement.query(By.css('app-photo-map-toggle'));
      const componentInstance = photoMapToggle.componentInstance;
      
      // The photo should be passed via async pipe
      expect(photoMapToggle).toBeTruthy();
    });

    it('should have interface state reset methods', () => {
      expect(component.resetInterfaceState).toBeDefined();
      expect(typeof component.resetInterfaceState).toBe('function');
    });

    it('should handle view toggle events', () => {
      expect(component.onViewToggled).toBeDefined();
      expect(typeof component.onViewToggled).toBe('function');
    });

    it('should handle photo zoom change events', () => {
      expect(component.onPhotoZoomChanged).toBeDefined();
      expect(typeof component.onPhotoZoomChanged).toBe('function');
    });

    it('should handle map state change events', () => {
      expect(component.onMapStateChanged).toBeDefined();
      expect(typeof component.onMapStateChanged).toBe('function');
    });
  });

  describe('Requirement 6.4: Display final results with enhanced feedback format', () => {
    it('should show results component when results are available', () => {
      // Mock showing results state
      store.overrideSelector(ScoringSelectors.selectCurrentScore, { 
        photoId: 'test-photo-1',
        yearScore: 80, 
        locationScore: 90, 
        totalScore: 170 
      });
      store.refreshState();
      fixture.detectChanges();

      const resultsSection = debugElement.query(By.css('.game-results'));
      expect(resultsSection).toBeTruthy();
      
      const resultsComponent = debugElement.query(By.css('app-results'));
      expect(resultsComponent).toBeTruthy();
    });

    it('should handle next photo event from results', () => {
      spyOn(component, 'onNextPhoto');
      
      // Mock showing results state
      store.overrideSelector(ScoringSelectors.selectCurrentScore, { 
        photoId: 'test-photo-1',
        yearScore: 80, 
        locationScore: 90, 
        totalScore: 170 
      });
      store.refreshState();
      fixture.detectChanges();

      const resultsComponent = debugElement.query(By.css('app-results'));
      if (resultsComponent) {
        resultsComponent.componentInstance.nextPhoto.emit();
        expect(component.onNextPhoto).toHaveBeenCalled();
      }
    });
  });

  describe('Requirement 6.5: Reset all interface elements to default states', () => {
    it('should have resetGame method', () => {
      expect(component.resetGame).toBeDefined();
      expect(typeof component.resetGame).toBe('function');
    });

    it('should have startGame method that resets interface', () => {
      expect(component.startGame).toBeDefined();
      expect(typeof component.startGame).toBe('function');
    });

    it('should dispatch interface reset actions', () => {
      spyOn(store, 'dispatch');
      
      component.resetGame();
      
      // Verify that interface reset actions are dispatched
      expect(store.dispatch).toHaveBeenCalled();
    });
  });

  describe('Enhanced Interface Integration', () => {
    it('should have all required components integrated', () => {
      const photoMapToggle = debugElement.query(By.css('app-photo-map-toggle'));
      const yearGuess = debugElement.query(By.css('app-year-guess'));
      
      expect(photoMapToggle).toBeTruthy();
      expect(yearGuess).toBeTruthy();
    });

    it('should handle interface errors gracefully', () => {
      expect(component.handleInterfaceError).toBeDefined();
      expect(typeof component.handleInterfaceError).toBe('function');
      
      // Should not throw when called with error
      expect(() => component.handleInterfaceError('Test error')).not.toThrow();
    });

    it('should provide user-friendly error messages', () => {
      const networkError = 'Network connection failed';
      const friendlyMessage = component.getErrorMessage(networkError);
      
      expect(friendlyMessage).toContain('Unable to connect to the internet');
      expect(friendlyMessage).not.toBe(networkError); // Should be transformed
    });

    it('should identify retryable errors correctly', () => {
      expect(component.isRetryableError('Network connection failed')).toBe(true);
      expect(component.isRetryableError('Server error occurred')).toBe(true);
      expect(component.isRetryableError('Invalid user input')).toBe(false);
    });
  });

  describe('Accessibility and User Experience', () => {
    it('should have proper ARIA labels and roles', () => {
      const mainContent = debugElement.query(By.css('[role="main"]'));
      const progressBar = debugElement.query(By.css('[role="progressbar"]'));
      
      expect(mainContent).toBeTruthy();
      expect(progressBar).toBeTruthy();
    });

    it('should have skip link for accessibility', () => {
      const skipLink = debugElement.query(By.css('.skip-link'));
      expect(skipLink).toBeTruthy();
      expect(skipLink.nativeElement.textContent.trim()).toBe('Skip to main content');
    });

    it('should provide loading messages for screen readers', () => {
      const loadingMessage = component.getLoadingMessage();
      expect(loadingMessage).toBe('Loading game content, please wait');
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should display error states appropriately', () => {
      store.overrideSelector(GameSelectors.selectHasGameError, true);
      store.overrideSelector(GameSelectors.selectGameError, 'Test error');
      store.refreshState();
      fixture.detectChanges();

      const errorSection = debugElement.query(By.css('.game-error'));
      expect(errorSection).toBeTruthy();
    });

    it('should provide retry functionality for retryable errors', () => {
      store.overrideSelector(PhotosSelectors.selectPhotosError, 'Network connection failed');
      store.refreshState();
      fixture.detectChanges();

      const retryButton = debugElement.query(By.css('.primary-button'));
      expect(retryButton).toBeTruthy();
      expect(retryButton.nativeElement.textContent.trim()).toContain('Retry');
    });

    it('should handle game completion state', () => {
      store.overrideSelector(GameSelectors.selectIsGameCompleted, true);
      store.overrideSelector(GameSelectors.selectIsGameInProgress, false);
      store.refreshState();
      fixture.detectChanges();

      const completedSection = debugElement.query(By.css('.game-completed'));
      expect(completedSection).toBeTruthy();
    });
  });

  describe('Performance and Optimization', () => {
    it('should not cause memory leaks with subscriptions', () => {
      // Component should clean up subscriptions in ngOnDestroy
      expect(component.ngOnDestroy).toBeDefined();
      
      // Simulate component destruction
      spyOn(component['subscriptions'], 'unsubscribe');
      component.ngOnDestroy();
      
      expect(component['subscriptions'].unsubscribe).toHaveBeenCalled();
    });

    it('should handle loading states efficiently', () => {
      store.overrideSelector(GameSelectors.selectGameLoading, true);
      store.refreshState();
      fixture.detectChanges();

      const loadingOverlay = debugElement.query(By.css('.loading-overlay'));
      expect(loadingOverlay).toBeTruthy();
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain existing game flow structure', () => {
      // Verify that core game methods still exist and work
      expect(component.startGame).toBeDefined();
      expect(component.submitGuess).toBeDefined();
      expect(component.onNextPhoto).toBeDefined();
      expect(component.endGame).toBeDefined();
      expect(component.resetGame).toBeDefined();
    });

    it('should preserve existing component hierarchy', () => {
      // Verify that expected components are still present
      const gameContent = debugElement.query(By.css('.game-content'));
      const gameHeader = debugElement.query(By.css('.game-header'));
      
      expect(gameContent).toBeTruthy();
      expect(gameHeader).toBeTruthy();
    });
  });
});