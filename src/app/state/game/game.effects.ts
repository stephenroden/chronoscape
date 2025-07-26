import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { Observable, of } from 'rxjs';
import { map, withLatestFrom, tap } from 'rxjs/operators';
import { AppState } from '../app.state';
import * as GameActions from './game.actions';
import * as PhotosActions from '../photos/photos.actions';
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
  }
}