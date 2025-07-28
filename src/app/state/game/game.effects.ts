import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { Observable, of } from 'rxjs';
import { map, withLatestFrom, tap, switchMap } from 'rxjs/operators';
import { AppState } from '../app.state';
import * as GameActions from './game.actions';
import * as PhotosActions from '../photos/photos.actions';
import * as ScoringActions from '../scoring/scoring.actions';
import * as InterfaceActions from '../interface/interface.actions';
import * as GameSelectors from './game.selectors';

@Injectable()
export class GameEffects {

  /**
   * Effect to sync the current photo when the game advances to the next photo
   */
  syncCurrentPhoto$: Observable<any>;

  /**
   * Effect to sync the current photo when the game starts
   */
  syncCurrentPhotoOnStart$: Observable<any>;

  /**
   * Effect to reset interface state when advancing to new photo
   */
  resetForNewPhoto$: Observable<any>;

  constructor(
    private actions$: Actions,
    private store: Store<AppState>
  ) {
    /**
     * When nextPhoto action is dispatched, update the photos state with the new current photo
     */
    this.syncCurrentPhoto$ = createEffect(() =>
      this.actions$.pipe(
        ofType(GameActions.nextPhoto),
        withLatestFrom(this.store.select(GameSelectors.selectCurrentPhotoIndex)),
        map(([action, currentPhotoIndex]) => {
          return PhotosActions.setCurrentPhoto({ photoIndex: currentPhotoIndex });
        })
      )
    );

    /**
     * When the game starts, ensure the current photo is set to the first photo (index 0)
     */
    this.syncCurrentPhotoOnStart$ = createEffect(() =>
      this.actions$.pipe(
        ofType(GameActions.startGame),
        map(() => {
          return PhotosActions.setCurrentPhoto({ photoIndex: 0 });
        })
      )
    );

    /**
     * Reset interface state when advancing to new photo
     * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
     */
    this.resetForNewPhoto$ = createEffect(() =>
      this.actions$.pipe(
        ofType(GameActions.nextPhoto),
        switchMap(() => [
          // Reset year guess to 1966 (requirement 5.1)
          ScoringActions.resetYearGuessTo1966(),
          // Reset interface state for new photo (requirements 5.2, 5.3, 5.4)
          InterfaceActions.resetForNewPhoto()
        ])
      )
    );
  }
}