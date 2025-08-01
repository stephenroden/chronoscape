import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { AppState } from '../../state/app.state';
import * as PhotosActions from '../../state/photos/photos.actions';
import * as GameActions from '../../state/game/game.actions';
import * as PhotosSelectors from '../../state/photos/photos.selectors';
import * as GameSelectors from '../../state/game/game.selectors';

/**
 * Start screen component that displays the welcome message and game start button.
 * Handles game initialization and navigation to the game play screen.
 */
@Component({
  selector: 'app-start-screen',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './start-screen.component.html',
  styleUrls: ['./start-screen.component.scss']
})
export class StartScreenComponent {
  // Loading state observables
  photosLoading$: Observable<boolean>;
  gameLoading$: Observable<boolean>;
  photosError$: Observable<string | null>;
  gameError$: Observable<string | null>;

  constructor(
    private store: Store<AppState>,
    private router: Router
  ) {
    this.photosLoading$ = this.store.select(PhotosSelectors.selectPhotosLoading);
    this.gameLoading$ = this.store.select(GameSelectors.selectGameLoading);
    this.photosError$ = this.store.select(PhotosSelectors.selectPhotosError);
    this.gameError$ = this.store.select(GameSelectors.selectGameError);
  }

  /**
   * Starts a new game by loading photos and navigating to game screen.
   * Requirement 1.1: Display the first of five photographs when game starts.
   */
  startGame(): void {
    // First load photos from the API with fresh photos (forceRefresh: true)
    this.store.dispatch(PhotosActions.loadPhotosWithOptions({ forceRefresh: true }));
    
    // Start the game which will set status to IN_PROGRESS
    this.store.dispatch(GameActions.startGame());
    
    // Navigate to the game play screen
    this.router.navigate(['/game']);
  }

  /**
   * Retries loading photos when there's an error
   */
  retryLoadPhotos(): void {
    this.store.dispatch(PhotosActions.loadPhotos());
  }

  /**
   * Clears any game errors and allows retry
   */
  clearGameError(): void {
    this.store.dispatch(GameActions.clearGameError());
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
}