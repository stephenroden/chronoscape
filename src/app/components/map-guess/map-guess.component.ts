import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';

import { AppState } from '../../state/app.state';
import { MapService } from '../../services/map.service';
import { Coordinates } from '../../models/coordinates.model';
import { setCurrentGuess } from '../../state/scoring/scoring.actions';
import { selectCurrentGuess } from '../../state/scoring/scoring.selectors';
import { Guess } from '../../models/scoring.model';

@Component({
  selector: 'app-map-guess',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map-guess.component.html',
  styleUrls: ['./map-guess.component.scss']
})
export class MapGuessComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;

  currentGuess: Guess | null = null;
  userPin: Coordinates | null = null;
  isMapInitialized = false;
  isMapLoading = true;
  mapError: string | null = null;

  private destroy$ = new Subject<void>();
  private readonly mapId = 'map-guess-container';

  constructor(
    private store: Store<AppState>,
    private mapService: MapService
  ) {}

  ngOnInit(): void {
    // Subscribe to current guess to sync with year component
    this.store.select(selectCurrentGuess)
      .pipe(takeUntil(this.destroy$))
      .subscribe(guess => {
        this.currentGuess = guess;
        
        // If there's a valid location guess, update the pin
        if (guess?.coordinates && 
            guess.coordinates.latitude !== 0 && 
            guess.coordinates.longitude !== 0) {
          this.userPin = guess.coordinates;
          this.updateMapPin();
        }
      });
  }

  ngAfterViewInit(): void {
    // Initialize map after view is ready
    setTimeout(() => {
      this.initializeMap();
    }, 100);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    // Clean up map resources
    this.mapService.destroy();
  }

  initializeMap(): void {
    try {
      this.isMapLoading = true;
      this.mapError = null;

      // Set the map container ID
      this.mapContainer.nativeElement.id = this.mapId;

      // Initialize the map with world view
      this.mapService.initializeMap(this.mapId, { latitude: 20, longitude: 0 }, 2);

      // Enable click-to-place functionality
      this.mapService.enableClickToPlace((coordinates: Coordinates) => {
        this.onMapClick(coordinates);
      });

      this.isMapInitialized = true;
      this.isMapLoading = false;

      // If there's already a pin location, place it
      if (this.userPin) {
        this.updateMapPin();
      }

    } catch (error) {
      console.error('Failed to initialize map:', error);
      this.mapError = 'Failed to load map. Please refresh the page and try again.';
      this.isMapLoading = false;
    }
  }

  private onMapClick(coordinates: Coordinates): void {
    // Update local pin state
    this.userPin = coordinates;
    
    // Place pin on map
    this.updateMapPin();
    
    // Update the store with the new location guess
    this.updateCurrentGuess(coordinates);
  }

  private updateMapPin(): void {
    if (!this.isMapInitialized || !this.userPin) {
      return;
    }

    try {
      // Add pin to map with custom styling for user guess
      this.mapService.addPin(this.userPin, {
        title: 'Your guess',
        alt: 'Your location guess pin'
      });
    } catch (error) {
      console.error('Failed to update map pin:', error);
    }
  }

  private updateCurrentGuess(coordinates: Coordinates): void {
    // Create updated guess with new coordinates, preserving existing year
    const updatedGuess: Guess = {
      year: this.currentGuess?.year || new Date().getFullYear(),
      coordinates
    };

    // Dispatch action to update current guess
    this.store.dispatch(setCurrentGuess({ guess: updatedGuess }));
  }

  onRemovePin(): void {
    if (!this.isMapInitialized) {
      return;
    }

    // Remove pin from map
    this.mapService.removePin();
    
    // Clear local state
    this.userPin = null;
    
    // Update store with placeholder coordinates
    this.updateCurrentGuess({ latitude: 0, longitude: 0 });
  }

  onCenterMap(): void {
    if (!this.isMapInitialized) {
      return;
    }

    // Reset map to world view
    this.mapService.setMapView({ latitude: 20, longitude: 0 }, 2);
  }

  onZoomToPin(): void {
    if (!this.isMapInitialized || !this.userPin) {
      return;
    }

    // Zoom to user's pin location
    this.mapService.setMapView(this.userPin, 8);
  }

  get hasValidPin(): boolean {
    return this.userPin !== null && 
           this.userPin.latitude !== 0 && 
           this.userPin.longitude !== 0;
  }

  get pinDisplayText(): string {
    if (!this.hasValidPin) {
      return 'No location selected';
    }

    const lat = this.userPin!.latitude.toFixed(4);
    const lng = this.userPin!.longitude.toFixed(4);
    return `${lat}, ${lng}`;
  }

  get mapInstructions(): string {
    if (this.hasValidPin) {
      return 'Click on the map to adjust your guess, or use the controls below.';
    }
    return 'Click anywhere on the map to place your location guess.';
  }
}