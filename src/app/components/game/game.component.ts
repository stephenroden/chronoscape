import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subscription, combineLatest } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AppState } from '../../state/app.state';
import { GameStatus } from '../../models/game-state.model';
import { validateGuess } from '../../models/scoring.model';
import { Photo } from '../../models/photo.model';
import { ActiveView, PhotoZoomState, MapState } from '../../models/interface-state.model';
import * as GameActions from '../../state/game/game.actions';
import * as GameSelectors from '../../state/game/game.selectors';
import * as PhotosActions from '../../state/photos/photos.actions';
import * as PhotosSelectors from '../../state/photos/photos.selectors';
import * as ScoringActions from '../../state/scoring/scoring.actions';
import * as ScoringSelectors from '../../state/scoring/scoring.selectors';
import * as InterfaceActions from '../../state/interface/interface.actions';
import * as InterfaceSelectors from '../../state/interface/interface.selectors';
import { PhotoMapToggleComponent } from '../photo-map-toggle/photo-map-toggle.component';
import { YearGuessComponent } from '../year-guess/year-guess.component';
import { ResultsComponent } from '../results/results.component';
import { ErrorBoundaryComponent } from '../error-boundary/error-boundary.component';
import { LoadingStateService } from '../../services/loading-state.service';

/**
 * Main game container component that orchestrates the overall game flow and state.
 * Manages game lifecycle (start, progress tracking, completion) and connects to NgRx store.
 * Integrates enhanced interface with photo/map toggle functionality and zoom capabilities.
 * 
 * Features:
 * - Game lifecycle management (start, progress, completion)
 * - Progress indicators showing current photo number out of five
 * - NgRx store integration for game state management
 * - Enhanced interface with photo/map toggle and zoom functionality
 * - Interface state reset for new photos and game transitions
 * - Error handling for enhanced interface features
 * - Responsive UI for different game states
 * 
 * Requirements addressed:
 * - 6.1: Preserve existing guess submission functionality
 * - 6.2: Maintain current scoring and progression logic
 * - 6.3: Reset zoom levels and toggle states appropriately
 * - 6.4: Display final results with enhanced feedback format
 * - 6.5: Reset all interface elements to default states
 */
@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule, PhotoMapToggleComponent, YearGuessComponent, ResultsComponent, ErrorBoundaryComponent],
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
  
  // Interface state observables
  activeView$: Observable<ActiveView>;
  transitionInProgress$: Observable<boolean>;
  currentPhoto$: Observable<Photo | null>;
  
  // Subscriptions to manage
  private subscriptions: Subscription = new Subscription();
  private showingResults = false;

  constructor(
    private store: Store<AppState>,
    private router: Router,
    private loadingStateService: LoadingStateService
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
    // Show results only when we have both a current guess and a score for the current photo
    this.showingResults$ = combineLatest([
      this.store.select(ScoringSelectors.selectCurrentGuess),
      this.store.select(PhotosSelectors.selectCurrentPhoto),
      this.store.select(ScoringSelectors.selectAllScores)
    ]).pipe(
      map(([currentGuess, currentPhoto, allScores]) => {
        // Show results if we have a current guess and a score for the current photo
        const hasCurrentGuess = !!currentGuess;
        const hasScoreForCurrentPhoto = !!(currentPhoto && allScores.some(score => score.photoId === currentPhoto.id));
        const shouldShowResults = hasCurrentGuess && hasScoreForCurrentPhoto;
        
        console.log('[GameComponent] showingResults$ calculation:', {
          hasCurrentGuess,
          hasScoreForCurrentPhoto,
          shouldShowResults,
          currentPhotoId: currentPhoto?.id,
          scoresCount: allScores.length,
          timestamp: new Date().toISOString()
        });
        
        return shouldShowResults;
      })
    );
    
    // Interface state observables
    this.activeView$ = this.store.select(InterfaceSelectors.selectActiveView);
    this.transitionInProgress$ = this.store.select(InterfaceSelectors.selectTransitionInProgress);
    this.currentPhoto$ = this.store.select(PhotosSelectors.selectCurrentPhoto);
  }

  ngOnInit(): void {
    // We don't automatically start the game on component init
    // The user will need to click a start button
    
    // Subscribe to game status changes to handle automatic transitions
    this.subscriptions.add(
      this.gameStatus$.subscribe(status => {
        console.log('[GameComponent] Game status changed:', status);
        // Navigate to results when game is completed
        if (status === GameStatus.COMPLETED) {
          this.router.navigate(['/results']);
        }
      })
    );
    
    // Subscribe to score additions to show results
    this.subscriptions.add(
      this.showingResults$.subscribe(showing => {
        this.showingResults = showing;
      })
    );

    // DEBUG: Add logging to track photo data flow (Task 1 requirement)
    this.subscriptions.add(
      this.currentPhoto$.subscribe(photo => {
        console.log('[GameComponent] Current photo changed:', {
          photo: photo ? {
            id: photo.id,
            title: photo.title,
            year: photo.year,
            url: photo.url ? photo.url.substring(0, 50) + '...' : null,
            coordinates: photo.coordinates
          } : null,
          timestamp: new Date().toISOString()
        });
        
        // Verify photo data is valid (Task 1 requirement)
        if (photo) {
          const isValid = this.validatePhotoData(photo);
          if (!isValid) {
            console.error('[GameComponent] Invalid photo data detected:', photo);
          }
        }
      })
    );

    // DEBUG: Track game progress and photo index synchronization
    this.subscriptions.add(
      this.store.select(GameSelectors.selectCurrentPhotoIndex).subscribe(index => {
        console.log('[GameComponent] Game photo index changed:', index);
      })
    );

    // DEBUG: Track game progress calculation for photo counter accuracy (Task 5)
    this.subscriptions.add(
      this.gameProgress$.subscribe(progress => {
        console.log('[GameComponent] Game progress calculated:', {
          current: progress.current,
          total: progress.total,
          percentage: progress.percentage,
          displayText: `Photo ${progress.current} of ${progress.total}`,
          timestamp: new Date().toISOString()
        });
      })
    );

    // DEBUG: Track photos loading state
    this.subscriptions.add(
      this.photosLoading$.subscribe(loading => {
        console.log('[GameComponent] Photos loading state:', loading);
      })
    );

    // DEBUG: Track photos error state
    this.subscriptions.add(
      this.photosError$.subscribe(error => {
        if (error) {
          console.error('[GameComponent] Photos error:', error);
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
   * Requirement 6.5: Reset all interface elements to default states
   */
  startGame(): void {
    this.startGameWithCategory('all');
  }

  /**
   * Starts a new game with a specific photo category
   * @param category - The photo category to use ('architecture', 'landmarks', 'events', or 'all')
   */
  startGameWithCategory(category: 'architecture' | 'landmarks' | 'events' | 'all' = 'all'): void {
    // Reset all game state for new game
    this.store.dispatch(GameActions.resetGame());
    this.store.dispatch(ScoringActions.resetScores());
    this.store.dispatch(ScoringActions.clearCurrentGuess());
    this.store.dispatch(PhotosActions.clearPhotos()); // Clear all photos to force fresh fetch
    this.store.dispatch(InterfaceActions.resetInterfaceState());
    
    // Load curated photos from high-quality Wikipedia categories with fresh photos
    this.store.dispatch(PhotosActions.loadCuratedPhotos({ category, forceRefresh: true }));
    
    // Then start the game which will set status to IN_PROGRESS
    this.store.dispatch(GameActions.startGame());
  }

  /**
   * Submits the current guess for scoring and displays results.
   * Requirement 2.1, 3.1: Submit year and location guesses for scoring.
   */
  submitGuess(): void {
    // Use take(1) to get the current guess value once and automatically unsubscribe
    this.currentGuess$.pipe(
      take(1)
    ).subscribe(guess => {
      if (guess && validateGuess(guess)) {
        this.store.dispatch(ScoringActions.submitGuess({ guess }));
      }
    });
  }

  /**
   * Advances to the next photo in the game sequence.
   * Called from results component after user views results.
   * Requirement 1.3: Advance to next photo when user completes their guess.
   * Requirement 5.1, 5.2, 5.3, 5.4, 5.5: Reset interface state for new photo.
   * Requirements 2.2, 2.3, 3.2: Ensure proper navigation flow from results to game.
   */
  onNextPhoto(): void {
    console.log('[GameComponent] onNextPhoto called - transitioning from results to next photo');
    
    // Check if we've completed all photos
    combineLatest([
      this.store.select(GameSelectors.selectCurrentPhotoIndex),
      this.store.select(GameSelectors.selectTotalPhotos)
    ]).pipe(take(1)).subscribe(([currentIndex, totalPhotos]) => {
      // currentIndex is 0-based, so we need to check if the next index would exceed total
      if (currentIndex + 1 >= totalPhotos) {
        // We've completed all photos, end the game
        console.log('[GameComponent] All photos completed, ending game');
        this.store.dispatch(GameActions.endGame());
      } else {
        // More photos to go, proceed to next photo
        // Clear the current guess to hide results view (Task 6 requirement)
        this.store.dispatch(ScoringActions.clearCurrentGuess());
        
        // Reset interface state for new photo (Requirements 5.1-5.5)
        this.store.dispatch(InterfaceActions.resetForNewPhoto());
        
        // Advance to next photo (this will update currentPhotoIndex and sync currentPhoto)
        this.store.dispatch(GameActions.nextPhoto());
        
        // Set local flag to ensure results are hidden during transition
        this.showingResults = false;
      }
    });
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
   * Requirement 6.5: Reset all interface elements to default states
   */
  resetGame(): void {
    // Reset all game state completely
    this.store.dispatch(GameActions.resetGame());
    this.store.dispatch(ScoringActions.resetScores());
    this.store.dispatch(ScoringActions.clearCurrentGuess());
    this.store.dispatch(PhotosActions.clearPhotos()); // Clear all photos to force fresh fetch
    this.store.dispatch(InterfaceActions.resetInterfaceState());
    
    // Reset local flags
    this.showingResults = false;
    
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
    // Try curated photos first, fallback to regular photos if needed
    this.store.dispatch(PhotosActions.loadCuratedPhotos({ category: 'all', forceRefresh: true }));
  }

  /**
   * Fallback to regular random photos if curated photos fail
   */
  fallbackToRandomPhotos(): void {
    this.store.dispatch(PhotosActions.loadPhotosWithOptions({ forceRefresh: true }));
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

  /**
   * Handle view toggle from PhotoMapToggleComponent
   * Requirement 6.1: Preserve existing guess submission functionality
   */
  onViewToggled(activeView: ActiveView): void {
    // View toggle is handled by the PhotoMapToggleComponent and InterfaceToggleService
    // No additional action needed here, but we could add analytics or logging
  }

  /**
   * Handle photo zoom changes from PhotoMapToggleComponent
   * Requirement 6.3: Reset zoom levels appropriately during transitions
   */
  onPhotoZoomChanged(zoomState: PhotoZoomState): void {
    // Zoom state is managed by the InterfaceToggleService
    // This handler allows for additional logic if needed (e.g., analytics)
  }

  /**
   * Handle map state changes from PhotoMapToggleComponent
   * Requirement 6.3: Reset zoom levels appropriately during transitions
   */
  onMapStateChanged(mapState: MapState): void {
    // Map state is managed by the InterfaceToggleService
    // This handler allows for additional logic if needed (e.g., analytics)
  }

  /**
   * Reset interface state when starting a new game
   * Requirement 6.5: Reset all interface elements to default states
   */
  resetInterfaceState(): void {
    this.store.dispatch(InterfaceActions.resetInterfaceState());
  }

  /**
   * Handle interface-related errors gracefully
   * Requirement 6.4: Maintain game flow despite interface issues
   */
  handleInterfaceError(error: string): void {
    console.warn('Interface error occurred:', error);
    // For now, we'll just log the error and continue
    // In a production app, we might want to show a user-friendly message
    // or fall back to a simpler interface
  }

  /**
   * Validate photo data to ensure it meets requirements (Task 1)
   * Requirements: 1.1, 1.3, 3.1, 4.1, 4.2
   */
  private validatePhotoData(photo: Photo): boolean {
    if (!photo) {
      console.error('[GameComponent] Photo validation failed: photo is null/undefined');
      return false;
    }

    const validationErrors: string[] = [];

    // Check required fields
    if (!photo.id) {
      validationErrors.push('Missing photo ID');
    }
    if (!photo.url) {
      validationErrors.push('Missing photo URL');
    }
    if (!photo.year || photo.year < 1900 || photo.year > new Date().getFullYear()) {
      validationErrors.push(`Invalid year: ${photo.year}`);
    }
    if (!photo.coordinates) {
      validationErrors.push('Missing coordinates');
    } else {
      if (photo.coordinates.latitude === 0 && photo.coordinates.longitude === 0) {
        validationErrors.push('Invalid coordinates (0,0)');
      }
      if (Math.abs(photo.coordinates.latitude) > 90) {
        validationErrors.push(`Invalid latitude: ${photo.coordinates.latitude}`);
      }
      if (Math.abs(photo.coordinates.longitude) > 180) {
        validationErrors.push(`Invalid longitude: ${photo.coordinates.longitude}`);
      }
    }

    if (validationErrors.length > 0) {
      console.error('[GameComponent] Photo validation failed:', {
        photoId: photo.id,
        errors: validationErrors,
        photo
      });
      return false;
    }

    console.log('[GameComponent] Photo validation passed:', photo.id);
    return true;
  }

  /**
   * Get detailed loading message based on current loading states
   * Requirements: 4.4 - Loading states while photos are being fetched from API
   */
  getDetailedLoadingMessage(): string {
    // Check specific loading states
    const photosLoadingState = this.loadingStateService.getLoadingState(LoadingStateService.LOADING_KEYS.PHOTOS_FETCH);
    const gameLoadingState = this.loadingStateService.getLoadingState(LoadingStateService.LOADING_KEYS.GAME_INIT);
    
    // Return the most specific message available
    let message = 'Preparing your game...';
    
    photosLoadingState.subscribe(state => {
      if (state.isLoading && state.message) {
        message = state.message;
      }
    }).unsubscribe();
    
    gameLoadingState.subscribe(state => {
      if (state.isLoading && state.message) {
        message = state.message;
      }
    }).unsubscribe();
    
    return message;
  }

  /**
   * Get overall loading progress
   * Requirements: 4.4 - Loading states with progress indication
   */
  getLoadingProgress(): number {
    let maxProgress = 0;
    
    // Check all loading states and return the highest progress
    const photosLoadingState = this.loadingStateService.getLoadingState(LoadingStateService.LOADING_KEYS.PHOTOS_FETCH);
    const gameLoadingState = this.loadingStateService.getLoadingState(LoadingStateService.LOADING_KEYS.GAME_INIT);
    
    photosLoadingState.subscribe(state => {
      if (state.isLoading) {
        maxProgress = Math.max(maxProgress, state.progress);
      }
    }).unsubscribe();
    
    gameLoadingState.subscribe(state => {
      if (state.isLoading) {
        maxProgress = Math.max(maxProgress, state.progress);
      }
    }).unsubscribe();
    
    return maxProgress;
  }

  /**
   * Check if photos have been loaded
   */
  hasPhotosLoaded(): boolean {
    let hasLoaded = false;
    this.store.select(PhotosSelectors.selectHasPhotos).pipe(take(1)).subscribe(loaded => {
      hasLoaded = loaded;
    });
    return hasLoaded;
  }

  /**
   * Handle interface retry request from error boundary
   * Requirements: 4.5 - Error boundaries with retry functionality
   */
  onInterfaceRetry(): void {
    console.log('Interface retry requested');
    // Could dispatch actions to reload photos or reset interface state
    // For now, we'll just log the event
  }

  /**
   * Handle interface fallback activation
   * Requirements: 4.5 - Fallback UI for when components fail to load
   */
  onInterfaceFallback(): void {
    console.log('Interface fallback activated');
    // Could dispatch action to disable enhanced features
    // For now, we'll just log the event
  }
}