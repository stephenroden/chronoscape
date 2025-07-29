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
     * FIXED: Get the photo index BEFORE the game reducer increments it, then use the incremented value
     */
    this.syncCurrentPhoto$ = createEffect(() =>
      this.actions$.pipe(
        ofType(GameActions.nextPhoto),
        withLatestFrom(this.store.select(GameSelectors.selectCurrentPhotoIndex)),
        map(([action, currentPhotoIndex]) => {
          // The game reducer will increment the index, so we need to use the incremented value
          const nextPhotoIndex = currentPhotoIndex + 1;
          console.log('[GameEffects] Syncing current photo:', {
            previousIndex: currentPhotoIndex,
            nextIndex: nextPhotoIndex,
            timestamp: new Date().toISOString()
          });
          return PhotosActions.setCurrentPhoto({ photoIndex: nextPhotoIndex });
        })
      )
    );

    /**
     * When the game starts, ensure the current photo is set to the first photo (index 0)
     */
    this.syncCurrentPhotoOnStart$ = createEffect(() =>
      this.actions$.pipe(
        ofType(GameActions.startGame),
        tap(() => {
          console.log('[GameEffects] Game started, syncing to first photo (index 0)');
        }),
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