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
import { selectCurrentPhotoIndex, selectTotalPhotos } from '../game/game.selectors';
import { selectScoresCount } from './scoring.selectors';
import { Action } from '@ngrx/store';

@Injectable()
export class ScoringEffects {
  validateGuess$: any;
  submitGuess$: any;
  calculateScore$: any;
  handlePhotoTransition$: any;
  handleGameCompletion$: any;
  updateCurrentPhoto$: any;
  clearGuessAfterScoring$: any;
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
              return ScoringActions.guessValidationFailure({
                error: 'Invalid guess: Year must be between 1900 and current year, and coordinates must be valid'
              });
            }
          } catch (error) {
            console.error('Error validating guess:', error);
            return ScoringActions.guessValidationFailure({
              error: 'Guess validation failed due to an error'
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
            const score = this.scoringService.calculateScore(
              photoId,
              guess,
              actualYear,
              actualCoordinates
            );
            
            return ScoringActions.addScore({ score });
          } catch (error) {
            console.error('Error calculating score:', error);
            return ScoringActions.guessValidationFailure({
              error: 'Score calculation failed'
            });
          }
        })
      )
    );

    this.handlePhotoTransition$ = createEffect(() =>
      this.actions$.pipe(
        ofType(ScoringActions.addScore),
        withLatestFrom(
          this.store.select(selectCurrentPhotoIndex),
          this.store.select(selectTotalPhotos),
          this.store.select(selectScoresCount)
        ),
        switchMap(([{ score }, currentIndex, totalPhotos, scoresCount]) => {
          if (currentIndex >= totalPhotos - 1 || scoresCount >= totalPhotos) {
            return of(GameActions.endGame());
          } else {
            return of(GameActions.nextPhoto());
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

    this.clearGuessAfterScoring$ = createEffect(() =>
      this.actions$.pipe(
        ofType(ScoringActions.addScore),
        map(() => ScoringActions.clearCurrentGuess())
      )
    );

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