import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { Store } from '@ngrx/store';
import { Observable, Subject, combineLatest, of } from 'rxjs';
import { takeUntil, map, switchMap } from 'rxjs/operators';

import { AppState } from '../../state/app.state';
import { Photo } from '../../models/photo.model';
import { Score, Guess } from '../../models/scoring.model';
import { Coordinates } from '../../models/coordinates.model';
import { EnhancedFeedback } from '../../models/enhanced-feedback.model';

import { selectCurrentPhoto } from '../../state/photos/photos.selectors';
import { selectCurrentGuess, selectScoreByPhotoId } from '../../state/scoring/scoring.selectors';

import { MapService } from '../../services/map.service';
import { EnhancedFeedbackService } from '../../services/enhanced-feedback.service';

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [CommonModule, TitleCasePipe],
  templateUrl: './results.component.html',
  styleUrls: ['./results.component.scss']
})
export class ResultsComponent implements OnInit, OnDestroy {
  @Output() nextPhoto = new EventEmitter<void>();
  
  private destroy$ = new Subject<void>();
  
  currentPhoto$: Observable<Photo | null>;
  currentGuess$: Observable<Guess | null>;
  
  // Combined observable for all results data
  resultsData$: Observable<{
    photo: Photo | null;
    guess: Guess | null;
    score: Score | null;
    enhancedFeedback: EnhancedFeedback | null;
  }>;

  // Map container ID for results map
  mapContainerId = 'results-map';
  private mapInitialized = false;

  constructor(
    private store: Store<AppState>,
    private mapService: MapService,
    private enhancedFeedbackService: EnhancedFeedbackService
  ) {
    this.currentPhoto$ = this.store.select(selectCurrentPhoto);
    this.currentGuess$ = this.store.select(selectCurrentGuess);

    // Combine all data streams with dynamic score selection and enhanced feedback
    this.resultsData$ = combineLatest([
      this.currentPhoto$,
      this.currentGuess$
    ]).pipe(
      switchMap(([photo, guess]) => {
        if (photo) {
          // Get the score for the current photo
          return this.store.select(selectScoreByPhotoId(photo.id)).pipe(
            map(score => {
              // Generate enhanced feedback if both photo and guess are available
              const enhancedFeedback = (photo && guess) ? 
                this.enhancedFeedbackService.generateFeedback(photo, guess) : 
                null;

              return {
                photo,
                guess,
                score,
                enhancedFeedback
              };
            })
          );
        }
        return of({
          photo,
          guess,
          score: null,
          enhancedFeedback: null
        });
      })
    );
  }

  ngOnInit(): void {
    // Subscribe to results data to initialize map when data is available
    this.resultsData$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(data => {
      if (data && data.photo && data.guess && !this.mapInitialized) {
        setTimeout(() => this.initializeResultsMap(data.photo!, data.guess!, data.enhancedFeedback), 100);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize the results map showing both user guess and correct location
   */
  private initializeResultsMap(photo: Photo, guess: Guess, enhancedFeedback: EnhancedFeedback | null): void {
    try {
      this.mapService.initializeMap(this.mapContainerId);
      
      // Add user's guess pin (red)
      this.mapService.addPin(guess.coordinates, {
        color: 'red',
        label: 'Your Guess'
      });
      
      // Add correct location pin (green)
      this.mapService.addAdditionalPin(photo.coordinates, {
        color: 'green',
        label: 'Correct Location'
      });
      
      // Set map view to show both pins
      this.mapService.fitBounds([guess.coordinates, photo.coordinates]);
      
      // Add distance line if enhanced feedback is available
      if (enhancedFeedback) {
        this.addDistanceLine(guess.coordinates, photo.coordinates);
      }
      
      this.mapInitialized = true;
    } catch (error) {
      console.error('Error initializing results map:', error);
    }
  }

  /**
   * Add a line showing the distance between guess and correct location
   */
  private addDistanceLine(guessCoords: Coordinates, correctCoords: Coordinates): void {
    try {
      // This would be implemented if the MapService supports drawing lines
      // For now, we'll rely on the visual connection between the two pins
      console.log('Distance line would be drawn between:', guessCoords, 'and', correctCoords);
    } catch (error) {
      console.error('Error adding distance line:', error);
    }
  }

  /**
   * Calculate the distance between user guess and actual location
   */
  calculateDistance(guess: Coordinates, actual: Coordinates): number {
    return this.mapService.calculateDistance(guess, actual);
  }

  /**
   * Format distance for display
   */
  formatDistance(distanceKm: number): string {
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)}m`;
    } else if (distanceKm < 100) {
      return `${distanceKm.toFixed(1)}km`;
    } else {
      return `${Math.round(distanceKm)}km`;
    }
  }

  /**
   * Format year difference for display
   */
  formatYearDifference(guess: number, actual: number): string {
    const diff = Math.abs(guess - actual);
    if (diff === 0) {
      return 'Exact match!';
    } else if (diff === 1) {
      return '1 year off';
    } else {
      return `${diff} years off`;
    }
  }

  /**
   * Get performance category for year guess
   */
  getYearPerformance(yearScore: number): string {
    if (yearScore === 5000) return 'Perfect!';
    if (yearScore >= 4500) return 'Excellent';
    if (yearScore >= 3000) return 'Good';
    if (yearScore >= 1500) return 'Fair';
    return 'Poor';
  }

  /**
   * Get performance category for location guess
   */
  getLocationPerformance(locationScore: number): string {
    if (locationScore === 5000) return 'Perfect!';
    if (locationScore >= 4000) return 'Excellent';
    if (locationScore >= 2500) return 'Good';
    if (locationScore >= 1000) return 'Fair';
    return 'Poor';
  }

  /**
   * Handle next photo button click
   * Requirements 2.2, 2.3, 3.2: Ensure proper navigation flow from results to game
   */
  onNextPhoto(): void {
    console.log('[ResultsComponent] Next Photo button clicked');
    
    // Reset map for next photo
    this.mapInitialized = false;
    
    // Emit event to parent game component to handle the transition
    // The game component will handle clearing the guess and advancing the photo
    this.nextPhoto.emit();
  }
}