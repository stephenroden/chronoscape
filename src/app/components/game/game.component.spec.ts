import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { GameComponent } from './game.component';
import { GameStatus } from '../../models/game-state.model';
import * as GameActions from '../../state/game/game.actions';
import * as PhotosActions from '../../state/photos/photos.actions';

describe('GameComponent', () => {
  let component: GameComponent;
  let fixture: ComponentFixture<GameComponent>;
  let store: MockStore;
  
  const initialState = {
    game: {
      currentPhotoIndex: 0,
      totalPhotos: 5,
      gameStatus: GameStatus.NOT_STARTED,
      startTime: new Date(),
      endTime: undefined
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GameComponent],
      providers: [
        provideMockStore({ initialState })
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    spyOn(store, 'dispatch').and.callThrough();
    
    fixture = TestBed.createComponent(GameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show start screen when game is not started', () => {
    store.setState({
      game: {
        ...initialState.game,
        gameStatus: GameStatus.NOT_STARTED
      }
    });
    fixture.detectChanges();
    
    const startScreen = fixture.debugElement.query(By.css('.game-start'));
    expect(startScreen).toBeTruthy();
  });

  it('should show game play screen when game is in progress', () => {
    store.setState({
      game: {
        ...initialState.game,
        gameStatus: GameStatus.IN_PROGRESS
      }
    });
    fixture.detectChanges();
    
    const gamePlayScreen = fixture.debugElement.query(By.css('.game-play'));
    expect(gamePlayScreen).toBeTruthy();
  });

  it('should show completed screen when game is completed', () => {
    store.setState({
      game: {
        ...initialState.game,
        gameStatus: GameStatus.COMPLETED,
        endTime: new Date()
      }
    });
    fixture.detectChanges();
    
    const completedScreen = fixture.debugElement.query(By.css('.game-completed'));
    expect(completedScreen).toBeTruthy();
  });

  it('should show error screen when game has error', () => {
    store.setState({
      game: {
        ...initialState.game,
        gameStatus: GameStatus.ERROR
      }
    });
    fixture.detectChanges();
    
    const errorScreen = fixture.debugElement.query(By.css('.game-error'));
    expect(errorScreen).toBeTruthy();
  });

  it('should dispatch startGame action when start button is clicked', () => {
    store.setState({
      game: {
        ...initialState.game,
        gameStatus: GameStatus.NOT_STARTED
      }
    });
    fixture.detectChanges();
    
    const startButton = fixture.debugElement.query(By.css('.game-start .primary-button'));
    startButton.triggerEventHandler('click', null);
    
    expect(store.dispatch).toHaveBeenCalledWith(PhotosActions.loadPhotos());
    expect(store.dispatch).toHaveBeenCalledWith(GameActions.startGame());
  });

  it('should dispatch nextPhoto action when next button is clicked', () => {
    store.setState({
      game: {
        ...initialState.game,
        gameStatus: GameStatus.IN_PROGRESS
      }
    });
    fixture.detectChanges();
    
    const nextButton = fixture.debugElement.query(By.css('.game-controls .secondary-button:first-child'));
    nextButton.triggerEventHandler('click', null);
    
    expect(store.dispatch).toHaveBeenCalledWith(GameActions.nextPhoto());
  });

  it('should dispatch endGame action when end game button is clicked', () => {
    store.setState({
      game: {
        ...initialState.game,
        gameStatus: GameStatus.IN_PROGRESS
      }
    });
    fixture.detectChanges();
    
    const endButton = fixture.debugElement.query(By.css('.game-controls .secondary-button:last-child'));
    endButton.triggerEventHandler('click', null);
    
    expect(store.dispatch).toHaveBeenCalledWith(GameActions.endGame());
  });

  it('should dispatch resetGame action when play again button is clicked', () => {
    store.setState({
      game: {
        ...initialState.game,
        gameStatus: GameStatus.COMPLETED,
        endTime: new Date()
      }
    });
    fixture.detectChanges();
    
    const playAgainButton = fixture.debugElement.query(By.css('.game-completed .primary-button'));
    playAgainButton.triggerEventHandler('click', null);
    
    expect(store.dispatch).toHaveBeenCalledWith(GameActions.resetGame());
  });

  it('should display correct progress information', () => {
    store.setState({
      game: {
        ...initialState.game,
        gameStatus: GameStatus.IN_PROGRESS,
        currentPhotoIndex: 2,
        totalPhotos: 5
      }
    });
    fixture.detectChanges();
    
    const progressText = fixture.debugElement.query(By.css('.progress-text')).nativeElement.textContent;
    expect(progressText).toContain('Photo 3 of 5');
  });

  it('should display progress bar with correct percentage', () => {
    store.setState({
      game: {
        ...initialState.game,
        gameStatus: GameStatus.IN_PROGRESS,
        currentPhotoIndex: 1,
        totalPhotos: 5
      }
    });
    fixture.detectChanges();
    
    const progressFill = fixture.debugElement.query(By.css('.progress-fill'));
    expect(progressFill.nativeElement.style.width).toBe('40%');
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

  it('should dispatch resetGame action when try again button is clicked in error state', () => {
    store.setState({
      game: {
        ...initialState.game,
        gameStatus: GameStatus.ERROR
      }
    });
    fixture.detectChanges();
    
    const tryAgainButton = fixture.debugElement.query(By.css('.game-error .primary-button'));
    tryAgainButton.triggerEventHandler('click', null);
    
    expect(store.dispatch).toHaveBeenCalledWith(GameActions.resetGame());
  });

  it('should properly clean up subscriptions on destroy', () => {
    spyOn(component['subscriptions'], 'unsubscribe');
    
    component.ngOnDestroy();
    
    expect(component['subscriptions'].unsubscribe).toHaveBeenCalled();
  });

  it('should handle game lifecycle methods correctly', () => {
    // Test startGame
    component.startGame();
    expect(store.dispatch).toHaveBeenCalledWith(PhotosActions.loadPhotos());
    expect(store.dispatch).toHaveBeenCalledWith(GameActions.startGame());

    // Test nextPhoto
    component.nextPhoto();
    expect(store.dispatch).toHaveBeenCalledWith(GameActions.nextPhoto());

    // Test endGame
    component.endGame();
    expect(store.dispatch).toHaveBeenCalledWith(GameActions.endGame());

    // Test resetGame
    component.resetGame();
    expect(store.dispatch).toHaveBeenCalledWith(GameActions.resetGame());
  });

  it('should show correct content for each game state', () => {
    // Test NOT_STARTED state
    store.setState({
      game: { ...initialState.game, gameStatus: GameStatus.NOT_STARTED }
    });
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.game-start'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('.game-play'))).toBeFalsy();
    expect(fixture.debugElement.query(By.css('.game-completed'))).toBeFalsy();
    expect(fixture.debugElement.query(By.css('.game-error'))).toBeFalsy();

    // Test IN_PROGRESS state
    store.setState({
      game: { ...initialState.game, gameStatus: GameStatus.IN_PROGRESS }
    });
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.game-start'))).toBeFalsy();
    expect(fixture.debugElement.query(By.css('.game-play'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('.game-completed'))).toBeFalsy();
    expect(fixture.debugElement.query(By.css('.game-error'))).toBeFalsy();

    // Test COMPLETED state
    store.setState({
      game: { ...initialState.game, gameStatus: GameStatus.COMPLETED, endTime: new Date() }
    });
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.game-start'))).toBeFalsy();
    expect(fixture.debugElement.query(By.css('.game-play'))).toBeFalsy();
    expect(fixture.debugElement.query(By.css('.game-completed'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('.game-error'))).toBeFalsy();

    // Test ERROR state
    store.setState({
      game: { ...initialState.game, gameStatus: GameStatus.ERROR }
    });
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.game-start'))).toBeFalsy();
    expect(fixture.debugElement.query(By.css('.game-play'))).toBeFalsy();
    expect(fixture.debugElement.query(By.css('.game-completed'))).toBeFalsy();
    expect(fixture.debugElement.query(By.css('.game-error'))).toBeTruthy();
  });
});