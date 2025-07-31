import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { GameComponent } from './game.component';
import { GameStatus } from '../../models/game-state.model';
import { AppState } from '../../state/app.state';

describe('GameComponent - Photo Counter Accuracy', () => {
  let component: GameComponent;
  let fixture: ComponentFixture<GameComponent>;
  let store: MockStore<AppState>;

  const initialState = {
    game: {
      currentPhotoIndex: 0,
      totalPhotos: 5,
      gameStatus: GameStatus.NOT_STARTED,
      startTime: new Date(),
      endTime: undefined,
      error: null,
      loading: false
    },
    photos: {
      photos: [],
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
      activeView: 'photo' as const,
      transitionInProgress: false,
      photoZoom: {
        zoomLevel: 1,
        position: { x: 0, y: 0 },
        minZoom: 0.5,
        maxZoom: 3
      },
      mapState: {
        zoomLevel: 2,
        center: { latitude: 0, longitude: 0 },
        defaultZoom: 2,
        defaultCenter: { latitude: 20, longitude: 0 }
      }
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GameComponent],
      providers: [
        provideMockStore({ initialState })
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GameComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(MockStore);
  });

  it('should display "Photo 1 of 5" when currentPhotoIndex is 0', () => {
    store.setState({
      ...initialState,
      game: {
        ...initialState.game,
        gameStatus: GameStatus.IN_PROGRESS,
        currentPhotoIndex: 0,
        totalPhotos: 5
      }
    });
    fixture.detectChanges();

    const progressText = fixture.debugElement.query(By.css('.progress-text'));
    expect(progressText).toBeTruthy();
    expect(progressText.nativeElement.textContent.trim()).toBe('Photo 1 of 5');
  });

  it('should display "Photo 2 of 5" when currentPhotoIndex is 1', () => {
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

    const progressText = fixture.debugElement.query(By.css('.progress-text'));
    expect(progressText).toBeTruthy();
    expect(progressText.nativeElement.textContent.trim()).toBe('Photo 2 of 5');
  });

  it('should display "Photo 3 of 5" when currentPhotoIndex is 2', () => {
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
    expect(progressText).toBeTruthy();
    expect(progressText.nativeElement.textContent.trim()).toBe('Photo 3 of 5');
  });

  it('should display "Photo 4 of 5" when currentPhotoIndex is 3', () => {
    store.setState({
      ...initialState,
      game: {
        ...initialState.game,
        gameStatus: GameStatus.IN_PROGRESS,
        currentPhotoIndex: 3,
        totalPhotos: 5
      }
    });
    fixture.detectChanges();

    const progressText = fixture.debugElement.query(By.css('.progress-text'));
    expect(progressText).toBeTruthy();
    expect(progressText.nativeElement.textContent.trim()).toBe('Photo 4 of 5');
  });

  it('should display "Photo 5 of 5" when currentPhotoIndex is 4', () => {
    store.setState({
      ...initialState,
      game: {
        ...initialState.game,
        gameStatus: GameStatus.IN_PROGRESS,
        currentPhotoIndex: 4,
        totalPhotos: 5
      }
    });
    fixture.detectChanges();

    const progressText = fixture.debugElement.query(By.css('.progress-text'));
    expect(progressText).toBeTruthy();
    expect(progressText.nativeElement.textContent.trim()).toBe('Photo 5 of 5');
  });

  it('should calculate correct percentage for each photo', () => {
    const testCases = [
      { index: 0, expectedPercentage: 20 },
      { index: 1, expectedPercentage: 40 },
      { index: 2, expectedPercentage: 60 },
      { index: 3, expectedPercentage: 80 },
      { index: 4, expectedPercentage: 100 }
    ];

    testCases.forEach(({ index, expectedPercentage }) => {
      store.setState({
        ...initialState,
        game: {
          ...initialState.game,
          gameStatus: GameStatus.IN_PROGRESS,
          currentPhotoIndex: index,
          totalPhotos: 5
        }
      });
      fixture.detectChanges();

      const progressBar = fixture.debugElement.query(By.css('.progress-fill'));
      expect(progressBar).toBeTruthy();
      expect(progressBar.nativeElement.style.width).toBe(`${expectedPercentage}%`);
    });
  });
});