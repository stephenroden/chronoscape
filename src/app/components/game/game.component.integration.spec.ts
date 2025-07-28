import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { GameComponent } from './game.component';
import { GameStatus } from '../../models/game-state.model';
import { defaultInterfaceState } from '../../models/interface-state.model';
import { Photo } from '../../models/photo.model';
import * as InterfaceActions from '../../state/interface/interface.actions';

/**
 * Integration tests for GameComponent with enhanced interface
 * Tests the integration between GameComponent and PhotoMapToggleComponent
 */
describe('GameComponent Integration Tests', () => {
  let component: GameComponent;
  let fixture: ComponentFixture<GameComponent>;
  let store: MockStore;
  let router: jasmine.SpyObj<Router>;
  
  const mockPhoto: Photo = {
    id: '1',
    url: 'test-photo.jpg',
    title: 'Test Photo',
    description: 'Test photo',
    year: 1970,
    coordinates: { latitude: 40.7128, longitude: -74.0060 },
    source: 'Test Source',
    metadata: {
      license: 'Test License',
      originalSource: 'Test Original Source',
      dateCreated: new Date('1970-01-01')
    }
  };
  
  const initialState = {
    game: {
      currentPhotoIndex: 0,
      totalPhotos: 5,
      gameStatus: GameStatus.IN_PROGRESS,
      startTime: new Date(),
      endTime: undefined,
      loading: false,
      error: null
    },
    photos: {
      photos: [mockPhoto],
      currentPhoto: mockPhoto,
      loading: false,
      error: null
    },
    scoring: {
      scores: [],
      currentGuess: { year: 1970, coordinates: { latitude: 40, longitude: -74 } },
      currentScore: null,
      loading: false,
      error: null
    },
    interface: defaultInterfaceState
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

    store = TestBed.inject(MockStore);
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    spyOn(store, 'dispatch').and.callThrough();
    
    fixture = TestBed.createComponent(GameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Enhanced Interface Integration', () => {
    it('should integrate PhotoMapToggleComponent successfully', () => {
      const photoMapToggle = fixture.debugElement.query(By.css('app-photo-map-toggle'));
      expect(photoMapToggle).toBeTruthy();
      expect(photoMapToggle.componentInstance.photo).toBe(mockPhoto);
    });

    it('should maintain game flow with enhanced interface', () => {
      // Verify submit button is enabled with valid guess
      const submitButton = fixture.debugElement.query(By.css('.submit-guess-btn'));
      expect(submitButton.nativeElement.disabled).toBe(false);
      
      // Verify year guess component is present
      const yearGuess = fixture.debugElement.query(By.css('app-year-guess'));
      expect(yearGuess).toBeTruthy();
    });

    it('should reset interface state when starting new game', () => {
      component.startGame();
      
      expect(store.dispatch).toHaveBeenCalledWith(InterfaceActions.resetInterfaceState());
    });

    it('should reset interface state when advancing to next photo', () => {
      component.onNextPhoto();
      
      expect(store.dispatch).toHaveBeenCalledWith(InterfaceActions.resetForNewPhoto());
    });

    it('should handle interface state changes without breaking game flow', () => {
      // Test view toggle
      expect(() => component.onViewToggled('map')).not.toThrow();
      
      // Test zoom change
      const mockZoomState = { zoomLevel: 2, position: { x: 0, y: 0 }, minZoom: 0.5, maxZoom: 4 };
      expect(() => component.onPhotoZoomChanged(mockZoomState)).not.toThrow();
      
      // Test map state change
      const mockMapState = { 
        zoomLevel: 5, 
        center: { latitude: 40, longitude: -74 },
        defaultZoom: 2,
        defaultCenter: { latitude: 20, longitude: 0 }
      };
      expect(() => component.onMapStateChanged(mockMapState)).not.toThrow();
    });

    it('should preserve existing game functionality', () => {
      // Test that core game methods still work
      expect(() => component.submitGuess()).not.toThrow();
      expect(() => component.endGame()).not.toThrow();
      expect(() => component.resetGame()).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle interface errors gracefully', () => {
      spyOn(console, 'warn');
      
      component.handleInterfaceError('Test error');
      
      expect(console.warn).toHaveBeenCalledWith('Interface error occurred:', 'Test error');
    });

    it('should continue game flow despite interface issues', () => {
      // Simulate interface error
      component.handleInterfaceError('Interface failed');
      
      // Game should still be functional
      expect(() => component.submitGuess()).not.toThrow();
      expect(() => component.onNextPhoto()).not.toThrow();
    });
  });

  describe('State Management Integration', () => {
    it('should properly integrate with interface state selectors', () => {
      // Verify observables are properly initialized
      expect(component.activeView$).toBeDefined();
      expect(component.transitionInProgress$).toBeDefined();
      expect(component.currentPhoto$).toBeDefined();
    });

    it('should dispatch correct actions for interface state management', () => {
      // Reset interface state
      component.resetInterfaceState();
      expect(store.dispatch).toHaveBeenCalledWith(InterfaceActions.resetInterfaceState());
      
      // Start game with interface reset
      component.startGame();
      expect(store.dispatch).toHaveBeenCalledWith(InterfaceActions.resetInterfaceState());
      
      // Next photo with interface reset
      component.onNextPhoto();
      expect(store.dispatch).toHaveBeenCalledWith(InterfaceActions.resetForNewPhoto());
      
      // Reset game with interface reset
      component.resetGame();
      expect(store.dispatch).toHaveBeenCalledWith(InterfaceActions.resetInterfaceState());
    });
  });
});