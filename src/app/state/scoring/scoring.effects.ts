import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { Observable, of } from 'rxjs';
import { map, switchMap, tap, withLatestFrom } from 'rxjs/operators';
import { ScoringService } from '../../services/scoring.service';
import { validateGuess } from '../../models/scoring.model';
import * as ScoringActions from './scoring.actions';
import * as GameActions from '../game/game.actions';
import * as PhotosActions from '../photos/photos.actions';
import { selectCurrentPhoto } from '../photos/photos.selectors';
import { selectCurrentPhotoIndex } from '../game/game.selectors';
import { Action } from '@ngrx/store';

@Injectable()
export class ScoringEffects {
  validateGuess$: any;
  submitGuess$: any;
  calculateScore$: any;
  handleGameCompletion$: any;
  updateCurrentPhoto$: any;
  logScoringEvents$: any;

  constructor(
    private actions$: Actions,
    private store: Store,
    private scoringService: ScoringService
  ) {
    this.validateGuess$ = createEffect(() =>
      this.actions$.pipe(
        ofType(ScoringActions.validateGuess),
        map(({ guess }) => {
          try {
            const isValid = validateGuess(guess);
            if (isValid) {
              return ScoringActions.guessValidationSuccess({ guess });
            } else {
              let errorMessage = 'Invalid guess: ';
              const errors: string[] = [];
              
              if (!guess.year || guess.year < 1900 || guess.year > new Date().getFullYear()) {
                errors.push('Year must be between 1900 and current year');
              }
              
              if (!guess.coordinates || (guess.coordinates.latitude === 0 && guess.coordinates.longitude === 0)) {
                errors.push('Location must be selected on the map');
              }
              
              if (guess.coordinates && (
                guess.coordinates.latitude < -90 || guess.coordinates.latitude > 90 ||
                guess.coordinates.longitude < -360 || guess.coordinates.longitude > 360
              )) {
                errors.push('Coordinates must be valid');
              }
              
              errorMessage += errors.join(', ');
              
              return ScoringActions.guessValidationFailure({
                error: errorMessage
              });
            }
          } catch (error) {
            console.error('Error validating guess:', error);
            return ScoringActions.guessValidationFailure({
              error: 'Guess validation failed due to an unexpected error. Please try again.'
            });
          }
        })
      )
    );

    this.submitGuess$ = createEffect(() =>
      this.actions$.pipe(
        ofType(ScoringActions.submitGuess),
        withLatestFrom(
          this.store.select(selectCurrentPhoto)
        ),
        switchMap(([{ guess }, currentPhoto]) => {
          if (!currentPhoto) {
            return of(ScoringActions.guessValidationFailure({
              error: 'No current photo available for scoring'
            }));
          }

          if (!validateGuess(guess)) {
            return of(ScoringActions.guessValidationFailure({
              error: 'Invalid guess provided'
            }));
          }

          return of(ScoringActions.calculateScore({
            photoId: currentPhoto.id,
            guess,
            actualYear: currentPhoto.year,
            actualCoordinates: currentPhoto.coordinates
          }));
        })
      )
    );

    this.calculateScore$ = createEffect(() =>
      this.actions$.pipe(
        ofType(ScoringActions.calculateScore),
        map(({ photoId, guess, actualYear, actualCoordinates }) => {
          try {
            // Validate inputs before calculation
            if (!photoId || typeof photoId !== 'string') {
              throw new Error('Invalid photo ID provided');
            }
            
            if (!validateGuess(guess)) {
              throw new Error('Invalid guess provided for scoring');
            }
            
            if (!actualYear || actualYear < 1900 || actualYear > new Date().getFullYear()) {
              throw new Error('Invalid actual year provided');
            }
            
            if (!actualCoordinates || 
                actualCoordinates.latitude < -90 || actualCoordinates.latitude > 90 ||
                actualCoordinates.longitude < -360 || actualCoordinates.longitude > 360) {
              throw new Error('Invalid actual coordinates provided');
            }
            
            const score = this.scoringService.calculateScore(
              photoId,
              guess,
              actualYear,
              actualCoordinates
            );
            
            // Validate calculated score
            if (!score || typeof score.totalScore !== 'number' || score.totalScore < 0) {
              throw new Error('Invalid score calculated');
            }
            
            return ScoringActions.addScore({ score });
          } catch (error) {
            console.error('Error calculating score:', error);
            const errorMessage = error instanceof Error ? error.message : 'Score calculation failed due to an unexpected error';
            return ScoringActions.setScoringError({
              error: errorMessage
            });
          }
        })
      )
    );

    this.handleGameCompletion$ = createEffect(() =>
      this.actions$.pipe(
        ofType(GameActions.endGame),
        tap(() => {
          console.log('Game completed!');
        })
      ),
      { dispatch: false }
    );

    this.updateCurrentPhoto$ = createEffect(() =>
      this.actions$.pipe(
        ofType(GameActions.nextPhoto),
        withLatestFrom(
          this.store.select(selectCurrentPhotoIndex)
        ),
        map(([, currentIndex]) => {
          const nextIndex = currentIndex + 1;
          return PhotosActions.setCurrentPhoto({ photoIndex: nextIndex });
        })
      )
    );

    // Removed clearGuessAfterScoring$ effect to allow results to be displayed
    // The guess will be cleared when user clicks "Next Photo" button in game component

    this.logScoringEvents$ = createEffect(() =>
      this.actions$.pipe(
        ofType(
          ScoringActions.addScore,
          ScoringActions.guessValidationFailure,
          ScoringActions.calculateScore
        ),
        tap((action) => {
          switch (action.type) {
            case ScoringActions.addScore.type:
              const addScoreAction = action as ReturnType<typeof ScoringActions.addScore>;
              console.log('Score added:', {
                photoId: addScoreAction.score.photoId,
                yearScore: addScoreAction.score.yearScore,
                locationScore: addScoreAction.score.locationScore,
                totalScore: addScoreAction.score.totalScore
              });
              break;
            case ScoringActions.guessValidationFailure.type:
              const validationFailureAction = action as ReturnType<typeof ScoringActions.guessValidationFailure>;
              console.warn('Guess validation failed:', validationFailureAction.error);
              break;
            case ScoringActions.calculateScore.type:
              const calculateScoreAction = action as ReturnType<typeof ScoringActions.calculateScore>;
              console.log('Calculating score for photo:', calculateScoreAction.photoId);
              break;
          }
        })
      ),
      { dispatch: false }
    );
  }
}