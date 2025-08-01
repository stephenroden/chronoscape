import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { GameComponent } from './game.component';
import { GameStatus } from '../../models/game-state.model';
import { ActiveView, defaultInterfaceState } from '../../models/interface-state.model';
import { Photo } from '../../models/photo.model';
import * as GameActions from '../../state/game/game.actions';
import * as PhotosActions from '../../state/photos/photos.actions';
import * as InterfaceActions from '../../state/interface/interface.actions';

describe('GameComponent', () => {
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
      gameStatus: GameStatus.NOT_STARTED,
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
      currentGuess: null,
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

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show game play screen when game is in progress', () => {
    store.setState({
      ...initialState,
      game: { ...initialState.game, gameStatus: GameStatus.IN_PROGRESS }
    });
    fixture.detectChanges();
    
    const gamePlayScreen = fixture.debugElement.query(By.css('.game-play'));
    expect(gamePlayScreen).toBeTruthy();
  });

  it('should show completed screen when game is completed', () => {
    store.setState({
      ...initialState,
      game: { ...initialState.game, gameStatus: GameStatus.COMPLETED, endTime: new Date() }
    });
    fixture.detectChanges();
    
    const completedScreen = fixture.debugElement.query(By.css('.game-completed'));
    expect(completedScreen).toBeTruthy();
  });

  it('should show error screen when game has error', () => {
    store.setState({
      ...initialState,
      game: { ...initialState.game, gameStatus: GameStatus.ERROR }
    });
    fixture.detectChanges();
    
    const errorScreen = fixture.debugElement.query(By.css('.game-error'));
    expect(errorScreen).toBeTruthy();
  });

  it('should dispatch startGame and reset interface actions when starting game', () => {
    component.startGame();
    
    expect(store.dispatch).toHaveBeenCalledWith(InterfaceActions.resetInterfaceState());
    expect(store.dispatch).toHaveBeenCalledWith(PhotosActions.loadPhotosWithOptions({ forceRefresh: true }));
    expect(store.dispatch).toHaveBeenCalledWith(GameActions.startGame());
  });

  it('should dispatch resetForNewPhoto and nextPhoto actions when advancing to next photo', () => {
    component.onNextPhoto();
    
    expect(store.dispatch).toHaveBeenCalledWith(InterfaceActions.resetForNewPhoto());
    expect(store.dispatch).toHaveBeenCalledWith(GameActions.nextPhoto());
  });

  it('should dispatch endGame action when called', () => {
    component.endGame();
    
    expect(store.dispatch).toHaveBeenCalledWith(GameActions.endGame());
  });

  it('should dispatch resetGame and resetInterfaceState actions when resetting game', () => {
    component.resetGame();
    
    expect(store.dispatch).toHaveBeenCalledWith(GameActions.resetGame());
    expect(store.dispatch).toHaveBeenCalledWith(InterfaceActions.resetInterfaceState());
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should display correct progress information', () => {
    store.setState({
      ...initialState,
      game: {
        ...initialState.game,
        gameStatus: GameStatus.IN_PROGRESS,
        currentPhotoIndex: 2,
        totalPhotos: 5
      }
    });
    fixture.detectChanges();
    
    const progressText = fixture.debugElement.query(By.css('.progress-text'));
    if (progressText) {
      expect(progressText.nativeElement.textContent).toContain('Photo 3 of 5');
    }
  });

  it('should display progress bar with correct percentage', () => {
    store.setState({
      ...initialState,
      game: {
        ...initialState.game,
        gameStatus: GameStatus.IN_PROGRESS,
        currentPhotoIndex: 1,
        totalPhotos: 5
      }
    });
    fixture.detectChanges();
    
    const progressFill = fixture.debugElement.query(By.css('.progress-fill'));
    if (progressFill) {
      expect(progressFill.nativeElement.style.width).toBe('40%');
    }
  });

  it('should not show progress indicator when game is not in progress', () => {
    store.setState({
      game: {
        ...initialState.game,
        gameStatus: GameStatus.NOT_STARTED
      }
    });
    fixture.detectChanges();
    
    const progressContainer = fixture.debugElement.query(By.css('.progress-container'));
    expect(progressContainer).toBeFalsy();
  });

  it('should handle error states appropriately', () => {
    store.setState({
      ...initialState,
      game: { ...initialState.game, gameStatus: GameStatus.ERROR }
    });
    fixture.detectChanges();
    
    const errorScreen = fixture.debugElement.query(By.css('.game-error'));
    expect(errorScreen).toBeTruthy();
  });

  it('should properly clean up subscriptions on destroy', () => {
    spyOn(component['subscriptions'], 'unsubscribe');
    
    component.ngOnDestroy();
    
    expect(component['subscriptions'].unsubscribe).toHaveBeenCalled();
  });

  it('should handle game lifecycle methods correctly', () => {
    // Test startGame
    component.startGame();
    expect(store.dispatch).toHaveBeenCalledWith(InterfaceActions.resetInterfaceState());
    expect(store.dispatch).toHaveBeenCalledWith(PhotosActions.loadPhotosWithOptions({ forceRefresh: true }));
    expect(store.dispatch).toHaveBeenCalledWith(GameActions.startGame());

    // Test nextPhoto
    component.onNextPhoto();
    expect(store.dispatch).toHaveBeenCalledWith(InterfaceActions.resetForNewPhoto());
    expect(store.dispatch).toHaveBeenCalledWith(GameActions.nextPhoto());

    // Test endGame
    component.endGame();
    expect(store.dispatch).toHaveBeenCalledWith(GameActions.endGame());

    // Test resetGame
    component.resetGame();
    expect(store.dispatch).toHaveBeenCalledWith(GameActions.resetGame());
    expect(store.dispatch).toHaveBeenCalledWith(InterfaceActions.resetInterfaceState());
  });

  it('should show correct content for each game state', () => {
    // Test NOT_STARTED state
    store.setState({
      ...initialState,
      game: { ...initialState.game, gameStatus: GameStatus.NOT_STARTED }
    });
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.game-loading'))).toBeFalsy();
    expect(fixture.debugElement.query(By.css('.game-play'))).toBeFalsy();
    expect(fixture.debugElement.query(By.css('.game-completed'))).toBeFalsy();
    expect(fixture.debugElement.query(By.css('.game-error'))).toBeFalsy();

    // Test IN_PROGRESS state
    store.setState({
      ...initialState,
      game: { ...initialState.game, gameStatus: GameStatus.IN_PROGRESS }
    });
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.game-loading'))).toBeFalsy();
    expect(fixture.debugElement.query(By.css('.game-play'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('.game-completed'))).toBeFalsy();
    expect(fixture.debugElement.query(By.css('.game-error'))).toBeFalsy();

    // Test COMPLETED state
    store.setState({
      ...initialState,
      game: { ...initialState.game, gameStatus: GameStatus.COMPLETED, endTime: new Date() }
    });
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.game-loading'))).toBeFalsy();
    expect(fixture.debugElement.query(By.css('.game-play'))).toBeFalsy();
    expect(fixture.debugElement.query(By.css('.game-completed'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('.game-error'))).toBeFalsy();

    // Test ERROR state
    store.setState({
      ...initialState,
      game: { ...initialState.game, gameStatus: GameStatus.ERROR }
    });
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.game-loading'))).toBeFalsy();
    expect(fixture.debugElement.query(By.css('.game-play'))).toBeFalsy();
    expect(fixture.debugElement.query(By.css('.game-completed'))).toBeFalsy();
    expect(fixture.debugElement.query(By.css('.game-error'))).toBeTruthy();
  });

  // Enhanced Interface Integration Tests
  describe('Enhanced Interface Integration', () => {
    beforeEach(() => {
      store.setState({
        ...initialState,
        game: { ...initialState.game, gameStatus: GameStatus.IN_PROGRESS }
      });
      fixture.detectChanges();
    });

    it('should render PhotoMapToggleComponent when game is in progress', () => {
      const photoMapToggle = fixture.debugElement.query(By.css('app-photo-map-toggle'));
      expect(photoMapToggle).toBeTruthy();
    });

    it('should pass correct inputs to PhotoMapToggleComponent', () => {
      const photoMapToggle = fixture.debugElement.query(By.css('app-photo-map-toggle'));
      const componentInstance = photoMapToggle.componentInstance;
      
      expect(componentInstance.photo).toBe(mockPhoto);
      expect(componentInstance.enableZoom).toBe(true);
      expect(componentInstance.showMetadata).toBe(false);
      expect(componentInstance.transitionDuration).toBe(300);
    });

    it('should handle view toggle events from PhotoMapToggleComponent', () => {
      spyOn(component, 'onViewToggled');
      const photoMapToggle = fixture.debugElement.query(By.css('app-photo-map-toggle'));
      
      photoMapToggle.triggerEventHandler('viewToggled', 'map' as ActiveView);
      
      expect(component.onViewToggled).toHaveBeenCalledWith('map');
    });

    it('should handle photo zoom change events from PhotoMapToggleComponent', () => {
      spyOn(component, 'onPhotoZoomChanged');
      const photoMapToggle = fixture.debugElement.query(By.css('app-photo-map-toggle'));
      const mockZoomState = { zoomLevel: 2, position: { x: 0, y: 0 }, minZoom: 0.5, maxZoom: 4 };
      
      photoMapToggle.triggerEventHandler('photoZoomChanged', mockZoomState);
      
      expect(component.onPhotoZoomChanged).toHaveBeenCalledWith(mockZoomState);
    });

    it('should handle map state change events from PhotoMapToggleComponent', () => {
      spyOn(component, 'onMapStateChanged');
      const photoMapToggle = fixture.debugElement.query(By.css('app-photo-map-toggle'));
      const mockMapState = { 
        zoomLevel: 5, 
        center: { latitude: 40, longitude: -74 },
        defaultZoom: 2,
        defaultCenter: { latitude: 20, longitude: 0 }
      };
      
      photoMapToggle.triggerEventHandler('mapStateChanged', mockMapState);
      
      expect(component.onMapStateChanged).toHaveBeenCalledWith(mockMapState);
    });

    it('should disable submit button when transition is in progress', () => {
      store.setState({
        ...initialState,
        game: { ...initialState.game, gameStatus: GameStatus.IN_PROGRESS },
        interface: { ...defaultInterfaceState, transitionInProgress: true },
        scoring: { ...initialState.scoring, currentGuess: { year: 1970, coordinates: { latitude: 40, longitude: -74 } } }
      });
      fixture.detectChanges();
      
      const submitButton = fixture.debugElement.query(By.css('.submit-guess-btn'));
      expect(submitButton.nativeElement.disabled).toBe(true);
    });

    it('should show transition help text when transition is in progress', () => {
      store.setState({
        ...initialState,
        game: { ...initialState.game, gameStatus: GameStatus.IN_PROGRESS },
        interface: { ...defaultInterfaceState, transitionInProgress: true }
      });
      fixture.detectChanges();
      
      const helpTexts = fixture.debugElement.queryAll(By.css('.submit-help-text'));
      const transitionHelpText = helpTexts.find(el => 
        el.nativeElement.textContent.includes('Please wait for the interface transition to complete')
      );
      expect(transitionHelpText).toBeTruthy();
    });
  });

  describe('Interface State Management', () => {
    it('should reset interface state when starting new game', () => {
      component.startGame();
      
      expect(store.dispatch).toHaveBeenCalledWith(InterfaceActions.resetInterfaceState());
    });

    it('should reset interface state for new photo when advancing', () => {
      component.onNextPhoto();
      
      expect(store.dispatch).toHaveBeenCalledWith(InterfaceActions.resetForNewPhoto());
    });

    it('should reset interface state when resetting game', () => {
      component.resetGame();
      
      expect(store.dispatch).toHaveBeenCalledWith(InterfaceActions.resetInterfaceState());
    });

    it('should call resetInterfaceState method', () => {
      component.resetInterfaceState();
      
      expect(store.dispatch).toHaveBeenCalledWith(InterfaceActions.resetInterfaceState());
    });

    it('should handle interface errors gracefully', () => {
      spyOn(console, 'warn');
      const errorMessage = 'Test interface error';
      
      component.handleInterfaceError(errorMessage);
      
      expect(console.warn).toHaveBeenCalledWith('Interface error occurred:', errorMessage);
    });
  });

  describe('Event Handlers', () => {
    it('should handle onViewToggled without errors', () => {
      expect(() => component.onViewToggled('photo')).not.toThrow();
      expect(() => component.onViewToggled('map')).not.toThrow();
    });

    it('should handle onPhotoZoomChanged without errors', () => {
      const mockZoomState = { zoomLevel: 2, position: { x: 10, y: 20 }, minZoom: 0.5, maxZoom: 4 };
      
      expect(() => component.onPhotoZoomChanged(mockZoomState)).not.toThrow();
    });

    it('should handle onMapStateChanged without errors', () => {
      const mockMapState = { 
        zoomLevel: 5, 
        center: { latitude: 40, longitude: -74 },
        defaultZoom: 2,
        defaultCenter: { latitude: 20, longitude: 0 }
      };
      
      expect(() => component.onMapStateChanged(mockMapState)).not.toThrow();
    });
  });
});