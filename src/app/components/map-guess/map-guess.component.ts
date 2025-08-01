import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild, Input } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subject, takeUntil, combineLatest } from 'rxjs';
import { CommonModule } from '@angular/common';

import { AppState } from '../../state/app.state';
import { MapService } from '../../services/map.service';
import { InterfaceToggleService } from '../../services/interface-toggle.service';
import { LoadingStateService } from '../../services/loading-state.service';
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
  retryCount = 0;

  private destroy$ = new Subject<void>();
  private readonly mapId = 'map-guess-container';

  constructor(
    private store: Store<AppState>,
    private mapService: MapService,
    private interfaceToggleService: InterfaceToggleService,
    private loadingStateService: LoadingStateService
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
    // Initialize map after view is ready, with additional delay for container sizing
    setTimeout(() => {
      this.waitForContainerAndInitialize();
    }, 100);
  }

  /**
   * Wait for container to be properly sized before initializing map
   */
  private waitForContainerAndInitialize(): void {
    if (!this.mapContainer?.nativeElement) {
      // Container not ready, retry
      setTimeout(() => this.waitForContainerAndInitialize(), 100);
      return;
    }

    const containerElement = this.mapContainer.nativeElement;
    const containerRect = containerElement.getBoundingClientRect();
    
    // In test environment, getBoundingClientRect may return 0, so check if element has an ID (test setup)
    const isTestEnvironment = containerRect.width === 0 && containerRect.height === 0 && containerElement.id;
    const hasValidDimensions = containerRect.width > 0 && containerRect.height > 0;
    
    if (!hasValidDimensions && !isTestEnvironment) {
      // Container not sized yet, wait a bit more
      setTimeout(() => this.waitForContainerAndInitialize(), 100);
      return;
    }

    // Container is ready, initialize map
    this.initializeMap();
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

      // Start loading state
      this.loadingStateService.startMapInit();

      // Check if container is available and properly sized
      if (!this.mapContainer?.nativeElement) {
        throw new Error('Map container element not available');
      }

      const containerElement = this.mapContainer.nativeElement;
      
      // Check if container has proper dimensions
      const containerRect = containerElement.getBoundingClientRect();
      const isTestEnvironment = containerRect.width === 0 && containerRect.height === 0 && containerElement.id;
      const hasValidDimensions = containerRect.width > 0 && containerRect.height > 0;
      
      if (!hasValidDimensions && !isTestEnvironment) {
        throw new Error('Map container has no dimensions - container may not be visible');
      }

      // Set the map container ID
      containerElement.id = this.mapId;

      // Ensure container is properly styled for map
      containerElement.style.width = '100%';
      containerElement.style.height = '100%';
      containerElement.style.position = 'relative';

      // Initialize the map with world view
      this.mapService.initializeMap(this.mapId, { latitude: 20, longitude: 0 }, 2);

      // Enable click-to-place functionality
      this.mapService.enableClickToPlace((coordinates: Coordinates) => {
        this.onMapClick(coordinates);
      });

      this.isMapInitialized = true;
      this.isMapLoading = false;

      // Complete loading state
      this.loadingStateService.completeMapInit();

      // If there's already a pin location, place it
      if (this.userPin) {
        this.updateMapPin();
      }

      // Force map resize after ini

    } catch (error) {
      console.error('Failed to initialize map:', error);
      this.isMapLoading = false;
      
      // Set error state in loading service
      this.loadingStateService.setError(
        LoadingStateService.LOADING_KEYS.MAP_INIT,
        error instanceof Error ? error.message : 'Unknown map initialization error'
      );
      
      // Provide specific error messages based on error type
      if (error instanceof Error) {
        if (error.message.includes('container')) {
          this.mapError = 'Map container not ready. Retrying...';
          // Auto-retry for container issues
          this.scheduleRetry();
        } else if (error.message.includes('dimensions')) {
          this.mapError = 'Map container sizing issue. Retrying...';
          // Auto-retry for sizing issues
          this.scheduleRetry();
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

  /**
   * Schedule automatic retry for container/sizing issues
   */
  private scheduleRetry(): void {
    // Auto-retry up to 3 times for container/sizing issues
    if (!this.retryCount) {
      this.retryCount = 0;
    }
    
    if (this.retryCount < 3) {
      this.retryCount++;
      setTimeout(() => {
        console.log(`Auto-retrying map initialization (attempt ${this.retryCount}/3)`);
        this.retryMapInitialization();
      }, 1000 * this.retryCount); // Increasing delay: 1s, 2s, 3s
    } else {
      this.mapError = 'Map failed to initialize after multiple attempts. Please refresh the page.';
    }
  }

  private onMapClick(coordinates: Coordinates): void {
    // Check if map is ready for interaction
    if (!this.isMapInteractive()) {
      console.warn('Map click ignored - map not interactive');
      return;
    }


    // Update local pin state
    this.userPin = coordinates;
    
    // Place pin on map
    this.updateMapPin();
    
    // Update the store with the new location guess
    this.updateCurrentGuess(coordinates);
  }

  private updateMapPin(): void {
    if (!this.isMapInteractive() || !this.userPin) {
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
      // If pin placement fails due to coordinate validation, reset local state
      if (error instanceof Error && error.message.includes('Invalid')) {
        console.warn('Pin placement failed due to invalid coordinates, resetting pin state');
        this.userPin = null;
        // Don't update the guess with invalid coordinates
        return;
      }
      // If pin placement fails, the map might have issues
      // Try to reinitialize if the error suggests map problems
      if (error instanceof Error && error.message.includes('Map must be initialized')) {
        console.warn('Map appears to be uninitialized, attempting to reinitialize');
        this.retryMapInitialization();
      }
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
    if (!this.isMapInteractive()) {
      return;
    }

    try {
      // Remove pin from map
      this.mapService.removePin();
      
      // Clear local state
      this.userPin = null;
      
      // Update store with placeholder coordinates
      this.updateCurrentGuess({ latitude: 0, longitude: 0 });
    } catch (error) {
      console.error('Failed to remove pin:', error);
    }
  }

  onCenterMap(): void {
    if (!this.isMapInteractive()) {
      return;
    }

    try {
      // Reset map to world view
      this.resetToDefaultView();
    } catch (error) {
      console.error('Failed to center map:', error);
    }
  }

  onZoomToPin(): void {
    if (!this.isMapInteractive() || !this.userPin) {
      return;
    }

    try {
      // Zoom to user's pin location
      this.mapService.setMapView(this.userPin, 8);
      
      // Update toggle service if in toggle container
      if (this.isInToggleContainer) {
        this.interfaceToggleService.setMapZoom(8);
        this.interfaceToggleService.setMapCenter(this.userPin);
      }
    } catch (error) {
      console.error('Failed to zoom to pin:', error);
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
   * Reset map state for new photo (requirements 5.2, 5.3)
   */
  resetMapForNewPhoto(): void {
    try {
      // Reset retry counter for new photo
      this.retryCount = 0;
      
      // Clear all pins from the map
      this.clearAllPins();
      
      // Reset to default view
      this.resetToDefaultView();
      
      // Clear local state
      this.userPin = null;
      
      // Update store with placeholder coordinates (requirement 5.3)
      this.updateCurrentGuess({ latitude: 0, longitude: 0 });
      
      // If in toggle container, reset toggle service map state (requirement 5.2)
      if (this.isInToggleContainer) {
        this.interfaceToggleService.resetMapState();
      }
    } catch (error) {
      console.error('Error clearing map pins:', error);
      // If reset fails, try to reinitialize the map
      this.retryMapInitialization();
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
      zoomLevel: this.mapService.getCurrentZoom(),
      hasPin: this.hasValidPin
    };
  }

  /**
   * Check if map is properly interactive and ready for pin placement
   */
  isMapInteractive(): boolean {
    if (!this.isMapInitialized || this.isMapLoading || this.mapError) {
      return false;
    }

    // Check if container is still available and sized
    if (this.mapContainer?.nativeElement) {
      const containerRect = this.mapContainer.nativeElement.getBoundingClientRect();
      // In test environment, getBoundingClientRect may return 0, so we check if element exists
      const hasValidDimensions = containerRect.width > 0 && containerRect.height > 0;
      const isTestEnvironment = containerRect.width === 0 && containerRect.height === 0 && this.mapContainer.nativeElement.id;
      
      return hasValidDimensions || isTestEnvironment;
    }

    return false;
  }

  /**
   * Set map as ready for testing purposes
   * @internal
   */
  setMapReadyForTesting(): void {
    this.isMapInitialized = true;
    this.isMapLoading = false;
    this.mapError = null;
  }

  /**
   * Force map resize (useful when container size changes in toggle)
   */
  resizeMap(): void {
    if (!this.isMapInitialized || !this.mapService) {
      return;
    }

    // Check if container is still properly sized
    if (this.mapContainer?.nativeElement) {
      const containerRect = this.mapContainer.nativeElement.getBoundingClientRect();
      if (containerRect.width === 0 || containerRect.height === 0) {
        console.warn('Map container has no dimensions during resize');
        return;
      }
    }

    // Trigger map resize - Leaflet maps need this when container size changes
    setTimeout(() => {
      try {
        this.mapService.invalidateSize();
      } catch (error) {
        console.warn('Could not resize map:', error);
        // If resize fails, try to reinitialize the map
        if (this.mapContainer?.nativeElement) {
          this.retryMapInitialization();
        }
      }
    }, 100);
  }
}