import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild, Input } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subject, takeUntil, combineLatest } from 'rxjs';
import { CommonModule } from '@angular/common';

import { AppState } from '../../state/app.state';
import { MapService } from '../../services/map.service';
import { InterfaceToggleService } from '../../services/interface-toggle.service';
import { Coordinates } from '../../models/coordinates.model';
import { setCurrentGuess } from '../../state/scoring/scoring.actions';
import { selectCurrentGuess } from '../../state/scoring/scoring.selectors';
import { selectCurrentPhoto } from '../../state/photos/photos.selectors';
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
  @Input() isInToggleContainer = false; // Flag to indicate if component is within toggle container

  currentGuess: Guess | null = null;
  userPin: Coordinates | null = null;
  isMapInitialized = false;
  isMapLoading = true;
  mapError: string | null = null;
  currentPhotoId: string | null = null;

  private destroy$ = new Subject<void>();
  private readonly mapId = 'map-guess-container';

  constructor(
    private store: Store<AppState>,
    private mapService: MapService,
    private interfaceToggleService: InterfaceToggleService
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

    // Subscribe to current photo to detect photo changes for reset
    this.store.select(selectCurrentPhoto)
      .pipe(takeUntil(this.destroy$))
      .subscribe(photo => {
        const newPhotoId = photo?.id || null;
        
        // If photo changed, reset map state
        if (this.currentPhotoId !== null && this.currentPhotoId !== newPhotoId) {
          this.resetMapForNewPhoto();
        }
        
        this.currentPhotoId = newPhotoId;
      });

    // If in toggle container, sync with interface toggle service
    if (this.isInToggleContainer) {
      this.syncWithToggleService();
    }
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
      this.isMapLoading = false;
      
      // Provide specific error messages based on error type
      if (error instanceof Error) {
        if (error.message.includes('container')) {
          this.mapError = 'Map container not found. Please refresh the page and try again.';
        } else if (error.message.includes('coordinates')) {
          this.mapError = 'Invalid map coordinates. Please refresh the page and try again.';
        } else {
          this.mapError = `Map initialization failed: ${error.message}`;
        }
      } else {
        this.mapError = 'Failed to load map. Please refresh the page and try again.';
      }
    }
  }

  /**
   * Retries map initialization
   */
  retryMapInitialization(): void {
    this.mapError = null;
    this.isMapInitialized = false;
    
    // Clean up any existing map instance
    try {
      this.mapService.destroy();
    } catch (error) {
      console.warn('Error cleaning up map during retry:', error);
    }
    
    // Retry initialization after a short delay
    setTimeout(() => {
      this.initializeMap();
    }, 500);
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
      // Don't show error to user for pin updates, just log it
      // The map is still functional even if pin styling fails
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
    this.resetToDefaultView();
  }

  onZoomToPin(): void {
    if (!this.isMapInitialized || !this.userPin) {
      return;
    }

    // Zoom to user's pin location
    this.mapService.setMapView(this.userPin, 8);
    
    // Update toggle service if in toggle container
    if (this.isInToggleContainer) {
      this.interfaceToggleService.setMapZoom(8);
      this.interfaceToggleService.setMapCenter(this.userPin);
    }
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

  /**
   * Gets accessible pin status description
   */
  getPinStatusAriaLabel(): string {
    if (this.hasValidPin) {
      return `Location pin placed at coordinates ${this.pinDisplayText}`;
    }
    return 'No location pin placed yet';
  }

  /**
   * Enhanced keyboard navigation for the map
   * Supports arrow keys for navigation, Enter/Space for pin placement
   */
  onMapKeyDown(event: KeyboardEvent): void {
    if (!this.isMapInitialized) {
      return;
    }

    let handled = false;

    switch (event.key) {
      case 'Enter':
      case ' ':
        // Place pin at current map center
        const center = this.mapService.getMapCenter();
        if (center) {
          this.onMapClick(center);
          handled = true;
        }
        break;
        
      case 'Escape':
        // Remove current pin
        if (this.hasValidPin) {
          this.onRemovePin();
          handled = true;
        }
        break;
        
      case 'ArrowUp':
        // Pan map up
        this.mapService.panMap('up');
        handled = true;
        break;
        
      case 'ArrowDown':
        // Pan map down
        this.mapService.panMap('down');
        handled = true;
        break;
        
      case 'ArrowLeft':
        // Pan map left
        this.mapService.panMap('left');
        handled = true;
        break;
        
      case 'ArrowRight':
        // Pan map right
        this.mapService.panMap('right');
        handled = true;
        break;
        
      case '+':
      case '=':
        // Zoom in
        this.mapService.zoomIn();
        handled = true;
        break;
        
      case '-':
        // Zoom out
        this.mapService.zoomOut();
        handled = true;
        break;
        
      case 'Home':
        // Center map to world view
        this.onCenterMap();
        handled = true;
        break;
    }

    if (handled) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  /**
   * Sync map state with interface toggle service
   */
  private syncWithToggleService(): void {
    // Subscribe to map state changes from toggle service
    this.interfaceToggleService.mapState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(mapState => {
        if (this.isMapInitialized && mapState) {
          // Update map view to match toggle service state
          this.mapService.setMapView(mapState.center, mapState.zoomLevel);
        }
      });

    // Update toggle service when map state changes
    // This would typically be done through map event listeners
    // For now, we'll update it when user interacts with controls
  }

  /**
   * Reset map state for new photo
   */
  resetMapForNewPhoto(): void {
    if (!this.isMapInitialized) {
      return;
    }

    try {
      // Clear any existing pins
      this.clearAllPins();
      
      // Reset map to default view
      this.resetToDefaultView();
      
      // Clear local state
      this.userPin = null;
      
      // Update store with placeholder coordinates
      this.updateCurrentGuess({ latitude: 0, longitude: 0 });
      
      // If in toggle container, reset toggle service map state
      if (this.isInToggleContainer) {
        this.interfaceToggleService.resetMapState();
      }
    } catch (error) {
      console.error('Error resetting map for new photo:', error);
    }
  }

  /**
   * Clear all pins from the map
   */
  clearAllPins(): void {
    if (!this.isMapInitialized) {
      return;
    }

    try {
      // Remove current user pin
      this.mapService.removePin();
      
      // Clear any additional markers (from results, etc.)
      this.mapService.clearAdditionalMarkers();
    } catch (error) {
      console.error('Error clearing map pins:', error);
    }
  }

  /**
   * Reset map to default view (world view)
   */
  resetToDefaultView(): void {
    if (!this.isMapInitialized) {
      return;
    }

    try {
      // Reset to world view
      this.mapService.setMapView({ latitude: 20, longitude: 0 }, 2);
      
      // If in toggle container, update toggle service
      if (this.isInToggleContainer) {
        this.interfaceToggleService.setMapCenter({ latitude: 20, longitude: 0 });
        this.interfaceToggleService.setMapZoom(2);
      }
    } catch (error) {
      console.error('Error resetting map to default view:', error);
    }
  }

  /**
   * Update toggle service with current map state
   */
  private updateToggleServiceMapState(): void {
    if (!this.isInToggleContainer || !this.isMapInitialized) {
      return;
    }

    try {
      const center = this.mapService.getMapCenter();
      if (center) {
        this.interfaceToggleService.setMapCenter(center);
      }
    } catch (error) {
      console.error('Error updating toggle service map state:', error);
    }
  }



  /**
   * Get current map state for external access
   */
  getCurrentMapState(): { center: Coordinates | null; zoomLevel: number | null; hasPin: boolean } {
    if (!this.isMapInitialized) {
      return { center: null, zoomLevel: null, hasPin: false };
    }

    return {
      center: this.mapService.getMapCenter(),
      zoomLevel: null, // Map service doesn't expose current zoom level
      hasPin: this.hasValidPin
    };
  }

  /**
   * Force map resize (useful when container size changes in toggle)
   */
  resizeMap(): void {
    if (this.isMapInitialized && this.mapService) {
      // Trigger map resize - Leaflet maps need this when container size changes
      setTimeout(() => {
        try {
          // Access the private map instance to trigger resize
          (this.mapService as any).map?.invalidateSize();
        } catch (error) {
          console.warn('Could not resize map:', error);
        }
      }, 100);
    }
  }
}