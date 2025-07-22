import { TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { provideStore } from '@ngrx/store';
import { AppState } from './app.state';
import { gameReducer } from './game/game.reducer';
import { photosReducer } from './photos/photos.reducer';
import { scoringReducer } from './scoring/scoring.reducer';
import * as GameActions from './game/game.actions';
import * as PhotosActions from './photos/photos.actions';
import * as ScoringActions from './scoring/scoring.actions';
import { selectGameStatus, selectCurrentPhotoIndex } from './game/game.selectors';
import { selectAllPhotos, selectPhotosLoading } from './photos/photos.selectors';
import { selectTotalScore, selectAllScores } from './scoring/scoring.selectors';
import { GameStatus } from '../models/game-state.model';
import { Photo } from '../models/photo.model';
import { Guess } from '../models/scoring.model';

describe('NgRx Store Integration', () => {
  let store: Store<AppState>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideStore({
          game: gameReducer,
          photos: photosReducer,
          scoring: scoringReducer
        })
      ]
    });

    store = TestBed.inject(Store);
  });

  it('should initialize with correct initial state', () => {
    let gameStatus: GameStatus | undefined;
    let currentPhotoIndex: number | undefined;
    let photos: Photo[] | undefined;
    let photosLoading: boolean | undefined;
    let totalScore: number | undefined;

    store.select(selectGameStatus).subscribe(status => gameStatus = status);
    store.select(selectCurrentPhotoIndex).subscribe(index => currentPhotoIndex = index);
    store.select(selectAllPhotos).subscribe(p => photos = p);
    store.select(selectPhotosLoading).subscribe(loading => photosLoading = loading);
    store.select(selectTotalScore).subscribe(score => totalScore = score);

    expect(gameStatus).toBe(GameStatus.NOT_STARTED);
    expect(currentPhotoIndex).toBe(0);
    expect(photos).toEqual([]);
    expect(photosLoading).toBe(false);
    expect(totalScore).toBe(0);
  });

  it('should handle game flow actions correctly', () => {
    let gameStatus: GameStatus | undefined;
    let currentPhotoIndex: number | undefined;

    store.select(selectGameStatus).subscribe(status => gameStatus = status);
    store.select(selectCurrentPhotoIndex).subscribe(index => currentPhotoIndex = index);

    // Start game
    store.dispatch(GameActions.startGame());
    expect(gameStatus).toBe(GameStatus.IN_PROGRESS);
    expect(currentPhotoIndex).toBe(0);

    // Next photo
    store.dispatch(GameActions.nextPhoto());
    expect(currentPhotoIndex).toBe(1);

    // End game
    store.dispatch(GameActions.endGame());
    expect(gameStatus).toBe(GameStatus.COMPLETED);
  });

  it('should handle photo loading actions correctly', () => {
    let photos: Photo[] | undefined;
    let photosLoading: boolean | undefined;
    let photosError: string | null | undefined;

    store.select(selectAllPhotos).subscribe(p => photos = p);
    store.select(selectPhotosLoading).subscribe(loading => photosLoading = loading);
    store.select(state => state.photos.error).subscribe(error => photosError = error);

    const mockPhotos: Photo[] = [
      {
        id: '1',
        url: 'test-url',
        title: 'Test Photo',
        year: 2020,
        coordinates: { latitude: 0, longitude: 0 },
        source: 'test',
        metadata: {
          license: 'test',
          originalSource: 'test',
          dateCreated: new Date()
        }
      }
    ];

    // Start loading
    store.dispatch(PhotosActions.loadPhotos());
    expect(photosLoading).toBe(true);
    expect(photosError).toBe(null);

    // Success
    store.dispatch(PhotosActions.loadPhotosSuccess({ photos: mockPhotos }));
    expect(photosLoading).toBe(false);
    expect(photos).toEqual(mockPhotos);
    expect(photosError).toBe(null);
  });

  it('should handle scoring actions correctly', () => {
    let totalScore: number | undefined;
    let scores: any[] | undefined;
    let currentGuess: Guess | null | undefined;

    store.select(selectTotalScore).subscribe(score => totalScore = score);
    store.select(selectAllScores).subscribe(s => scores = s);
    store.select(state => state.scoring.currentGuess).subscribe(guess => currentGuess = guess);

    const mockGuess: Guess = {
      year: 2020,
      coordinates: { latitude: 0, longitude: 0 }
    };

    const mockScore = {
      photoId: '1',
      yearScore: 5000,
      locationScore: 3000,
      totalScore: 8000
    };

    // Submit guess
    store.dispatch(ScoringActions.submitGuess({ guess: mockGuess }));
    expect(currentGuess).toEqual(mockGuess);

    // Add score
    store.dispatch(ScoringActions.addScore({ score: mockScore }));
    expect(totalScore).toBe(8000);
    expect(scores).toContain(mockScore);
  });

  it('should handle cross-feature state updates correctly', () => {
    let gameStatus: GameStatus | undefined;
    let currentPhotoIndex: number | undefined;
    let totalScore: number | undefined;

    store.select(selectGameStatus).subscribe(status => gameStatus = status);
    store.select(selectCurrentPhotoIndex).subscribe(index => currentPhotoIndex = index);
    store.select(selectTotalScore).subscribe(score => totalScore = score);

    // Start a complete game flow
    store.dispatch(GameActions.startGame());
    expect(gameStatus).toBe(GameStatus.IN_PROGRESS);

    // Add some scores
    store.dispatch(ScoringActions.addScore({
      score: { photoId: '1', yearScore: 5000, locationScore: 4000, totalScore: 9000 }
    }));
    expect(totalScore).toBe(9000);

    // Progress through photos
    store.dispatch(GameActions.nextPhoto());
    store.dispatch(GameActions.nextPhoto());
    expect(currentPhotoIndex).toBe(2);

    // Reset everything
    store.dispatch(GameActions.resetGame());
    store.dispatch(ScoringActions.resetScores());
    
    expect(gameStatus).toBe(GameStatus.NOT_STARTED);
    expect(currentPhotoIndex).toBe(0);
    expect(totalScore).toBe(0);
  });
});