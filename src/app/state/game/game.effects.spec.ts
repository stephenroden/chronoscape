import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { Observable, of } from 'rxjs';
import { Action } from '@ngrx/store';
import { GameEffects } from './game.effects';
import * as GameActions from './game.actions';
import * as PhotosActions from '../photos/photos.actions';
import * as ScoringActions from '../scoring/scoring.actions';
import * as InterfaceActions from '../interface/interface.actions';
import * as GameSelectors from './game.selectors';
import { AppState } from '../app.state';
import { GameStatus } from '../../models/game-state.model';

describe('GameEffects', () => {
  let actions$: Observable<Action>;
  let effects: GameEffects;
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
      currentGuess: null,
      totalScore: 0,
      loading: false,
      error: null
    }
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        GameEffects,
        provideMockActions(() => actions$),
        provideMockStore({ initialState })
      ]
    });

    effects = TestBed.inject(GameEffects);
    store = TestBed.inject(MockStore);
  });

  describe('syncCurrentPhoto$', () => {
    it('should dispatch setCurrentPhoto when nextPhoto action is dispatched', (done) => {
      const action = GameActions.nextPhoto();
      const expectedAction = PhotosActions.setCurrentPhoto({ photoIndex: 1 });

      // Mock the current photo index to be 1 after nextPhoto
      store.overrideSelector(GameSelectors.selectCurrentPhotoIndex, 1);

      actions$ = of(action);

      effects.syncCurrentPhoto$.subscribe(result => {
        expect(result).toEqual(expectedAction);
        done();
      });
    });

    it('should use the current photo index from the store', (done) => {
      const action = GameActions.nextPhoto();
      const expectedAction = PhotosActions.setCurrentPhoto({ photoIndex: 3 });

      // Mock the current photo index to be 3
      store.overrideSelector(GameSelectors.selectCurrentPhotoIndex, 3);

      actions$ = of(action);

      effects.syncCurrentPhoto$.subscribe(result => {
        expect(result).toEqual(expectedAction);
        done();
      });
    });
  });

  describe('syncCurrentPhotoOnStart$', () => {
    it('should dispatch setCurrentPhoto with index 0 when startGame action is dispatched', (done) => {
      const action = GameActions.startGame();
      const expectedAction = PhotosActions.setCurrentPhoto({ photoIndex: 0 });

      actions$ = of(action);

      effects.syncCurrentPhotoOnStart$.subscribe(result => {
        expect(result).toEqual(expectedAction);
        done();
      });
    });
  });

  describe('resetForNewPhoto$', () => {
    it('should dispatch reset actions when nextPhoto action is dispatched', (done) => {
      const action = GameActions.nextPhoto();
      const expectedActions = [
        ScoringActions.resetYearGuessTo1966(),
        InterfaceActions.resetForNewPhoto()
      ];

      actions$ = of(action);

      let actionCount = 0;
      effects.resetForNewPhoto$.subscribe(result => {
        expect(result).toEqual(expectedActions[actionCount]);
        actionCount++;
        if (actionCount === expectedActions.length) {
          done();
        }
      });
    });

    it('should reset year guess to 1966 (requirement 5.1)', (done) => {
      const action = GameActions.nextPhoto();
      actions$ = of(action);

      let actionCount = 0;
      effects.resetForNewPhoto$.subscribe(result => {
        if (actionCount === 0) {
          expect(result).toEqual(ScoringActions.resetYearGuessTo1966());
          done();
        }
        actionCount++;
      });
    });

    it('should reset interface state (requirements 5.2, 5.3, 5.4)', (done) => {
      const action = GameActions.nextPhoto();
      actions$ = of(action);

      let actionCount = 0;
      effects.resetForNewPhoto$.subscribe(result => {
        if (actionCount === 1) {
          expect(result).toEqual(InterfaceActions.resetForNewPhoto());
          done();
        }
        actionCount++;
      });
    });
  });
});