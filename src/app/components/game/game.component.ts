import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subscription, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { AppState } from '../../state/app.state';
import { GameStatus } from '../../models/game-state.model';
import { validateGuess } from '../../models/scoring.model';
import * as GameActions from '../../state/game/game.actions';
import * as GameSelectors from '../../state/game/game.selectors';
import * as PhotosActions from '../../state/photos/photos.actions';
import * as PhotosSelectors from '../../state/photos/photos.selectors';
import * as ScoringActions from '../../state/scoring/scoring.actions';
import * as ScoringSelectors from '../../state/scoring/scoring.selectors';
import { PhotoDisplayComponent } from '../photo-display/photo-display.component';
import { YearGuessComponent } from '../year-guess/year-guess.component';
import { MapGuessComponent } from '../map-guess/map-guess.component';
import { ResultsComponent } from '../results/results.component';

/**
 * Main game container component that orchestrates the overall game flow and state.
 * Manages game lifecycle (start, progress tracking, completion) and connects to NgRx store.
 * 
 * Features:
 * - Game lifecycle management (start, progress, completion)
 * - Progress indicators showing current photo number out of five
 * - NgRx store integration for game state management
 * - Responsive UI for different game states
 */
@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule, PhotoDisplayComponent, YearGuessComponent, MapGuessComponent, ResultsComponent],
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss']
})
export class GameComponent implements OnInit, OnDestroy {
  // Game state observables
  gameStatus$: Observable<GameStatus>;
  gameProgress$: Observable<{ current: number; total: number; percentage: number }>;
  isGameInProgress$: Observable<boolean>;
  isGameCompleted$: Observable<boolean>;
  isGameNotStarted$: Observable<boolean>;
  hasGameError$: Observable<boolean>;
  gameError$: Observable<string | null>;
  gameLoading$: Observable<boolean>;
  
  // Photo state observables
  photosLoading$: Observable<boolean>;
  photosError$: Observable<string | null>;
  
  // Scoring state observables
  scoringLoading$: Observable<boolean>;
  scoringError$: Observable<string | null>;
  currentGuess$: Observable<any>;
  canSubmitGuess$: Observable<boolean>;
  showingResults$: Observable<boolean>;
  
  // Subscriptions to manage
  private subscriptions: Subscription = new Subscription();
  private showingResults = false;

  constructor(
    private store: Store<AppState>,
    private router: Router
  ) {
    // Initialize observables from selectors
    this.gameStatus$ = this.store.select(GameSelectors.selectGameStatus);
    this.gameProgress$ = this.store.select(GameSelectors.selectGameProgress);
    this.isGameInProgress$ = this.store.select(GameSelectors.selectIsGameInProgress);
    this.isGameCompleted$ = this.store.select(GameSelectors.selectIsGameCompleted);
    this.isGameNotStarted$ = this.store.select(GameSelectors.selectIsGameNotStarted);
    this.hasGameError$ = this.store.select(GameSelectors.selectHasGameError);
    this.gameError$ = this.store.select(GameSelectors.selectGameError);
    this.gameLoading$ = this.store.select(GameSelectors.selectGameLoading);
    
    // Photo state observables
    this.photosLoading$ = this.store.select(PhotosSelectors.selectPhotosLoading);
    this.photosError$ = this.store.select(PhotosSelectors.selectPhotosError);
    
    // Scoring state observables
    this.scoringLoading$ = this.store.select(ScoringSelectors.selectScoringLoading);
    this.scoringError$ = this.store.select(ScoringSelectors.selectScoringError);
    this.currentGuess$ = this.store.select(ScoringSelectors.selectCurrentGuess);
    
    // Determine if user can submit guess (both year and location provided)
    this.canSubmitGuess$ = this.currentGuess$.pipe(
      map(guess => guess && validateGuess(guess))
    );
    
    // Track if we're showing results for current photo
    this.showingResults$ = this.store.select(ScoringSelectors.selectCurrentScore).pipe(
      map(score => !!score && !this.showingResults)
    );
  }

  ngOnInit(): void {
    // We don't automatically start the game on component init
    // The user will need to click a start button
    
    // Subscribe to game status changes to handle automatic transitions
    this.subscriptions.add(
      this.gameStatus$.subscribe(status => {
        // Navigate to results when game is completed
        if (status === GameStatus.COMPLETED) {
          this.router.navigate(['/results']);
        }
      })
    );
    
    // Subscribe to score additions to show results
    this.subscriptions.add(
      this.store.select(ScoringSelectors.selectCurrentScore).subscribe(score => {
        if (score && !this.showingResults) {
          this.showingResults = true;
        }
      })
    );
  }

  ngOnDestroy(): void {
    // Clean up subscriptions to prevent memory leaks
    this.subscriptions.unsubscribe();
  }

  /**
   * Starts a new game by loading photos and initializing game state.
   * Requirement 1.1: Display the first of five photographs when game starts.
   */
  startGame(): void {
    // First load photos from the API
    this.store.dispatch(PhotosActions.loadPhotos());
    
    // Then start the game which will set status to IN_PROGRESS
    this.store.dispatch(GameActions.startGame());
  }

  /**
   * Submits the current guess for scoring and displays results.
   * Requirement 2.1, 3.1: Submit year and location guesses for scoring.
   */
  submitGuess(): void {
    this.subscriptions.add(
      this.currentGuess$.subscribe(guess => {
        if (guess && validateGuess(guess)) {
          this.store.dispatch(ScoringActions.submitGuess({ guess }));
        }
      }).unsubscribe()
    );
  }

  /**
   * Advances to the next photo in the game sequence.
   * Called from results component after user views results.
   * Requirement 1.3: Advance to next photo when user completes their guess.
   */
  onNextPhoto(): void {
    this.showingResults = false;
    this.store.dispatch(GameActions.nextPhoto());
  }

  /**
   * Ends the current game and transitions to completion state.
   * Requirement 1.4: Display final score summary when all photos are guessed.
   */
  endGame(): void {
    this.store.dispatch(GameActions.endGame());
  }

  /**
   * Resets the game state and navigates to start screen.
   */
  resetGame(): void {
    this.store.dispatch(GameActions.resetGame());
    this.router.navigate(['/']);
  }

  /**
   * Clears any game errors and allows retry
   */
  clearGameError(): void {
    this.store.dispatch(GameActions.clearGameError());
  }

  /**
   * Retries loading photos when there's an error
   */
  retryLoadPhotos(): void {
    this.store.dispatch(PhotosActions.loadPhotos());
  }

  /**
   * Gets user-friendly error message for display
   */
  getErrorMessage(error: string | null): string {
    if (!error) return '';
    
    // Provide more user-friendly messages for common errors
    if (error.includes('Network connection failed')) {
      return 'Unable to connect to the internet. Please check your connection and try again.';
    }
    if (error.includes('No suitable photos found')) {
      return 'Unable to find photos for the game. Please try again in a moment.';
    }
    if (error.includes('Too many requests')) {
      return 'Please wait a moment before trying again.';
    }
    
    return error;
  }

  /**
   * Determines if an error is retryable
   */
  isRetryableError(error: string | null): boolean {
    if (!error) return false;
    
    // Network and temporary errors are retryable
    return error.includes('Network connection failed') ||
           error.includes('Server error occurred') ||
           error.includes('Too many requests') ||
           error.includes('No suitable photos found');
  }

  /**
   * Gets appropriate loading message for accessibility
   */
  getLoadingMessage(): string {
    // This method will be called by the template to provide accessible loading messages
    return 'Loading game content, please wait';
  }
}