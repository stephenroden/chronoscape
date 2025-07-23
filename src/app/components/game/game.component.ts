import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { Observable, Subscription } from 'rxjs';
import { AppState } from '../../state/app.state';
import { GameStatus } from '../../models/game-state.model';
import * as GameActions from '../../state/game/game.actions';
import * as GameSelectors from '../../state/game/game.selectors';
import * as PhotosActions from '../../state/photos/photos.actions';
import { PhotoDisplayComponent } from '../photo-display/photo-display.component';

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
  imports: [CommonModule, PhotoDisplayComponent],
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
  
  // Subscriptions to manage
  private subscriptions: Subscription = new Subscription();

  constructor(private store: Store<AppState>) {
    // Initialize observables from selectors
    this.gameStatus$ = this.store.select(GameSelectors.selectGameStatus);
    this.gameProgress$ = this.store.select(GameSelectors.selectGameProgress);
    this.isGameInProgress$ = this.store.select(GameSelectors.selectIsGameInProgress);
    this.isGameCompleted$ = this.store.select(GameSelectors.selectIsGameCompleted);
    this.isGameNotStarted$ = this.store.select(GameSelectors.selectIsGameNotStarted);
    this.hasGameError$ = this.store.select(GameSelectors.selectHasGameError);
  }

  ngOnInit(): void {
    // We don't automatically start the game on component init
    // The user will need to click a start button
    
    // Subscribe to game status changes to handle automatic transitions
    this.subscriptions.add(
      this.gameStatus$.subscribe(status => {
        // Any additional logic for status changes can be added here
        // For now, we let the NgRx effects handle the transitions
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
   * Advances to the next photo in the game sequence.
   * Requirement 1.3: Advance to next photo when user completes their guess.
   */
  nextPhoto(): void {
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
   * Resets the game state to allow starting a new game.
   * Requirement 6.1: Provide option to start new game from final results.
   */
  resetGame(): void {
    this.store.dispatch(GameActions.resetGame());
  }
}