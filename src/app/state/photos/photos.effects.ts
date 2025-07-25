import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Observable, of } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import { PhotoService } from '../../services/photo.service';
import * as PhotosActions from './photos.actions';
import { Action } from '@ngrx/store';

@Injectable()
export class PhotosEffects {
  loadPhotos$: Observable<Action>;
  validatePhoto$: Observable<Action>;
  logPhotosSuccess$: Observable<Action>;
  logPhotosFailure$: Observable<Action>;

  constructor(
    private actions$: Actions,
    private photoService: PhotoService
  ) {
    /**
     * Effect to handle photo loading from external API
     */
    this.loadPhotos$ = createEffect(() =>
      this.actions$.pipe(
        ofType(PhotosActions.loadPhotos),
        switchMap(() =>
          this.photoService.fetchRandomPhotos(5).pipe(
            map(photos => {
              if (photos.length === 0) {
                return PhotosActions.loadPhotosFailure({
                  error: 'No suitable photos found. Please try again.'
                });
              }
              if (photos.length < 5) {
                console.warn(`Only ${photos.length} photos found, expected 5`);
              }
              return PhotosActions.loadPhotosSuccess({ photos });
            }),
            catchError(error => {
              console.error('Error loading photos:', error);
              const errorMessage = this.getErrorMessage(error);
              return of(PhotosActions.loadPhotosFailure({ error: errorMessage }));
            })
          )
        )
      )
    );

    /**
     * Effect to handle photo validation
     */
    this.validatePhoto$ = createEffect(() =>
      this.actions$.pipe(
        ofType(PhotosActions.validatePhoto),
        switchMap(({ photo }) => {
          try {
            const isValid = this.photoService.validatePhotoMetadata(photo);
            if (isValid) {
              return of(PhotosActions.photoValidationSuccess({ photo }));
            } else {
              return of(PhotosActions.photoValidationFailure({
                photoId: photo.id,
                error: 'Photo does not meet validation requirements'
              }));
            }
          } catch (error) {
            console.error('Error validating photo:', error);
            return of(PhotosActions.photoValidationFailure({
              photoId: photo.id,
              error: 'Photo validation failed due to an error'
            }));
          }
        })
      )
    );

    /**
     * Effect to log successful photo loading for debugging
     */
    this.logPhotosSuccess$ = createEffect(() =>
      this.actions$.pipe(
        ofType(PhotosActions.loadPhotosSuccess),
        tap(({ photos }) => {
          console.log(`Successfully loaded ${photos.length} photos:`,
            photos.map(p => ({ id: p.id, year: p.year, title: p.title }))
          );
        })
      ),
      { dispatch: false }
    );

    /**
     * Effect to log photo loading failures for debugging
     */
    this.logPhotosFailure$ = createEffect(() =>
      this.actions$.pipe(
        ofType(PhotosActions.loadPhotosFailure),
        tap(({ error }) => {
          console.error('Photo loading failed:', error);
        })
      ),
      { dispatch: false }
    );
  }


  /**
   * Converts various error types to user-friendly messages
   */
  private getErrorMessage(error: any): string {
    if (error?.status === 0) {
      return 'Network connection failed. Please check your internet connection and try again.';
    }

    if (error?.status === 429) {
      return 'Too many requests. Please wait a moment and try again.';
    }

    if (error?.status >= 500) {
      return 'Server error occurred. Please try again later.';
    }

    if (error?.status === 404) {
      return 'Photo service not found. Please try again later.';
    }

    if (error?.status === 403) {
      return 'Access to photo service denied. Please try again later.';
    }

    if (error?.name === 'TimeoutError') {
      return 'Request timed out. Please check your connection and try again.';
    }

    if (error?.message) {
      // Check for specific error patterns
      if (error.message.includes('CORS')) {
        return 'Unable to access photo service due to security restrictions. Please try again later.';
      }
      if (error.message.includes('timeout')) {
        return 'Request timed out. Please check your connection and try again.';
      }
      if (error.message.includes('parse')) {
        return 'Invalid response from photo service. Please try again.';
      }
      return `Error loading photos: ${error.message}`;
    }

    return 'An unexpected error occurred while loading photos. Please try again.';
  }
}