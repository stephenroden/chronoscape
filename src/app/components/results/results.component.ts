import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { Observable, Subject, combineLatest, of } from 'rxjs';
import { takeUntil, map, switchMap } from 'rxjs/operators';

import { AppState } from '../../state/app.state';
import { Photo } from '../../models/photo.model';
import { Score, Guess } from '../../models/scoring.model';
import { Coordinates } from '../../models/coordinates.model';

import { selectCurrentPhoto } from '../../state/photos/photos.selectors';
import { selectCurrentGuess, selectScoreByPhotoId } from '../../state/scoring/scoring.selectors';

import { MapService } from '../../services/map.service';

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [CommonModule],
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
  }>;

  // Map container ID for results map
  mapContainerId = 'results-map';
  private mapInitialized = false;

  constructor(
    private store: Store<AppState>,
    private mapService: MapService
  ) {
    this.currentPhoto$ = this.store.select(selectCurrentPhoto);
    this.currentGuess$ = this.store.select(selectCurrentGuess);

    // Combine all data streams with dynamic score selection
    this.resultsData$ = combineLatest([
      this.currentPhoto$,
      this.currentGuess$
    ]).pipe(
      switchMap(([photo, guess]) => {
        if (photo) {
          // Get the score for the current photo
          return this.store.select(selectScoreByPhotoId(photo.id)).pipe(
            map(score => ({
              photo,
              guess,
              score
            }))
          );
        }
        return of({
          photo,
          guess,
          score: null
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
        setTimeout(() => this.initializeResultsMap(data.photo!, data.guess!), 100);
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
  private initializeResultsMap(photo: Photo, guess: Guess): void {
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
      
      this.mapInitialized = true;
    } catch (error) {
      console.error('Error initializing results map:', error);
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
   */
  onNextPhoto(): void {
    this.mapInitialized = false; // Reset map for next photo
    this.nextPhoto.emit();
  }
}