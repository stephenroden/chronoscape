import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Loading state information for a specific operation
 */
export interface LoadingState {
  isLoading: boolean;
  progress: number; // 0-100
  message: string;
  error?: string;
  startTime?: Date;
  estimatedDuration?: number; // in milliseconds
}

/**
 * Service to manage comprehensive loading states across the application
 * Requirements: 4.4, 4.5 - Loading states while photos are being fetched from API
 */
@Injectable({
  providedIn: 'root'
})
export class LoadingStateService {
  private loadingStates = new Map<string, BehaviorSubject<LoadingState>>();
  private globalLoadingState$ = new BehaviorSubject<boolean>(false);

  constructor() {}

  /**
   * Set loading state for a specific operation
   */
  setLoadingState(key: string, state: Partial<LoadingState>): void {
    if (!this.loadingStates.has(key)) {
      this.loadingStates.set(key, new BehaviorSubject<LoadingState>({
        isLoading: false,
        progress: 0,
        message: ''
      }));
    }

    const currentState = this.loadingStates.get(key)!.value;
    const newState: LoadingState = {
      ...currentState,
      ...state,
      startTime: state.isLoading && !currentState.isLoading ? new Date() : currentState.startTime
    };

    this.loadingStates.get(key)!.next(newState);
    this.updateGlobalLoadingState();
  }

  /**
   * Get loading state for a specific operation
   */
  getLoadingState(key: string): Observable<LoadingState> {
    if (!this.loadingStates.has(key)) {
      this.loadingStates.set(key, new BehaviorSubject<LoadingState>({
        isLoading: false,
        progress: 0,
        message: ''
      }));
    }
    return this.loadingStates.get(key)!.asObservable();
  }

  /**
   * Check if a specific operation is loading
   */
  isLoading(key: string): Observable<boolean> {
    return this.getLoadingState(key).pipe(
      map(state => state.isLoading)
    );
  }

  /**
   * Get loading progress for a specific operation
   */
  getProgress(key: string): Observable<number> {
    return this.getLoadingState(key).pipe(
      map(state => state.progress)
    );
  }

  /**
   * Get loading message for a specific operation
   */
  getMessage(key: string): Observable<string> {
    return this.getLoadingState(key).pipe(
      map(state => state.message)
    );
  }

  /**
   * Clear loading state for a specific operation
   */
  clearLoadingState(key: string): void {
    this.setLoadingState(key, {
      isLoading: false,
      progress: 0,
      message: '',
      error: undefined
    });
  }

  /**
   * Start loading for a specific operation
   */
  startLoading(key: string, message: string, estimatedDuration?: number): void {
    this.setLoadingState(key, {
      isLoading: true,
      progress: 0,
      message,
      estimatedDuration,
      error: undefined
    });
  }

  /**
   * Update loading progress
   */
  updateProgress(key: string, progress: number, message?: string): void {
    const updates: Partial<LoadingState> = { progress: Math.max(0, Math.min(100, progress)) };
    if (message) {
      updates.message = message;
    }
    this.setLoadingState(key, updates);
  }

  /**
   * Complete loading for a specific operation
   */
  completeLoading(key: string, message?: string): void {
    this.setLoadingState(key, {
      isLoading: false,
      progress: 100,
      message: message || 'Completed',
      error: undefined
    });

    // Clear the state after a short delay
    setTimeout(() => {
      this.clearLoadingState(key);
    }, 1000);
  }

  /**
   * Set error state for a specific operation
   */
  setError(key: string, error: string): void {
    this.setLoadingState(key, {
      isLoading: false,
      error,
      message: 'Error occurred'
    });
  }

  /**
   * Get global loading state (true if any operation is loading)
   */
  getGlobalLoadingState(): Observable<boolean> {
    return this.globalLoadingState$.asObservable();
  }

  /**
   * Get all active loading operations
   */
  getActiveLoadingOperations(): Observable<string[]> {
    return combineLatest(
      Array.from(this.loadingStates.entries()).map(([key, state$]) =>
        state$.pipe(map(state => ({ key, isLoading: state.isLoading })))
      )
    ).pipe(
      map(states => states.filter(state => state.isLoading).map(state => state.key))
    );
  }

  /**
   * Update global loading state based on individual states
   */
  private updateGlobalLoadingState(): void {
    const hasAnyLoading = Array.from(this.loadingStates.values())
      .some(state$ => state$.value.isLoading);
    this.globalLoadingState$.next(hasAnyLoading);
  }

  /**
   * Get estimated time remaining for a loading operation
   */
  getEstimatedTimeRemaining(key: string): Observable<number | null> {
    return this.getLoadingState(key).pipe(
      map(state => {
        if (!state.isLoading || !state.startTime || !state.estimatedDuration) {
          return null;
        }

        const elapsed = Date.now() - state.startTime.getTime();
        const progressRatio = state.progress / 100;
        
        if (progressRatio <= 0) {
          return state.estimatedDuration;
        }

        const estimatedTotal = elapsed / progressRatio;
        return Math.max(0, estimatedTotal - elapsed);
      })
    );
  }

  /**
   * Predefined loading operations for common use cases
   */
  static readonly LOADING_KEYS = {
    PHOTOS_FETCH: 'photos-fetch',
    PHOTO_LOAD: 'photo-load',
    MAP_INIT: 'map-init',
    GAME_INIT: 'game-init',
    SCORING: 'scoring',
    IMAGE_PRELOAD: 'image-preload'
  } as const;

  /**
   * Helper method to start photo fetching loading state
   */
  startPhotosFetch(count: number): void {
    this.startLoading(
      LoadingStateService.LOADING_KEYS.PHOTOS_FETCH,
      `Fetching ${count} historical photos...`,
      5000 // Estimated 5 seconds
    );
  }

  /**
   * Helper method to update photo fetching progress
   */
  updatePhotosFetchProgress(current: number, total: number): void {
    const progress = (current / total) * 100;
    this.updateProgress(
      LoadingStateService.LOADING_KEYS.PHOTOS_FETCH,
      progress,
      `Loading photo ${current} of ${total}...`
    );
  }

  /**
   * Helper method to complete photo fetching
   */
  completePhotosFetch(): void {
    this.completeLoading(
      LoadingStateService.LOADING_KEYS.PHOTOS_FETCH,
      'Photos loaded successfully'
    );
  }

  /**
   * Helper method to start individual photo loading
   */
  startPhotoLoad(photoTitle: string): void {
    this.startLoading(
      LoadingStateService.LOADING_KEYS.PHOTO_LOAD,
      `Loading ${photoTitle}...`,
      2000 // Estimated 2 seconds
    );
  }

  /**
   * Helper method to complete individual photo loading
   */
  completePhotoLoad(): void {
    this.completeLoading(
      LoadingStateService.LOADING_KEYS.PHOTO_LOAD,
      'Photo loaded'
    );
  }

  /**
   * Helper method to start map initialization
   */
  startMapInit(): void {
    this.startLoading(
      LoadingStateService.LOADING_KEYS.MAP_INIT,
      'Initializing interactive map...',
      3000 // Estimated 3 seconds
    );
  }

  /**
   * Helper method to complete map initialization
   */
  completeMapInit(): void {
    this.completeLoading(
      LoadingStateService.LOADING_KEYS.MAP_INIT,
      'Map ready'
    );
  }
}