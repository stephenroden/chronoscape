import { Component, Input, OnInit, OnDestroy, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { Observable, Subscription } from 'rxjs';
import { distinctUntilChanged, filter, tap, catchError } from 'rxjs/operators';
import { Photo } from '../../models/photo.model';
import { AppState } from '../../state/app.state';
import { ImagePreloaderService } from '../../services/image-preloader.service';
import { PhotoZoomService, PhotoZoomState } from '../../services/photo-zoom.service';
import { InterfaceToggleService } from '../../services/interface-toggle.service';
import { LoadingStateService } from '../../services/loading-state.service';
import { PhotoZoomControlsComponent } from '../photo-zoom-controls/photo-zoom-controls.component';
import * as PhotosSelectors from '../../state/photos/photos.selectors';
import * as GameSelectors from '../../state/game/game.selectors';

/**
 * Component responsible for displaying the current photograph with loading states and error handling.
 * Provides responsive image display that works across desktop, tablet, and mobile devices.
 * 
 * Features:
 * - Responsive image display with proper aspect ratio handling
 * - Loading states with skeleton placeholder
 * - Error handling with fallback messaging and retry functionality
 * - Accessibility support with proper alt text and ARIA labels
 * - Progressive image loading with blur-to-sharp transition
 */
@Component({
  selector: 'app-photo-display',
  standalone: true,
  imports: [CommonModule, PhotoZoomControlsComponent],
  templateUrl: './photo-display.component.html',
  styleUrls: ['./photo-display.component.scss']
})
export class PhotoDisplayComponent implements OnInit, OnDestroy {
  @Input() 
  set photo(value: Photo | null) {
    if (value !== this._photo) {
      this._photo = value;
      this.onPhotoChange(value);
    }
  }
  get photo(): Photo | null {
    return this._photo;
  }
  private _photo: Photo | null = null;

  @Input() showMetadata: boolean = false; // For testing purposes, normally false during game
  @Input() enableZoom: boolean = true; // Enable/disable zoom functionality

  @ViewChild('photoContainer', { static: false }) photoContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('photoImage', { static: false }) photoImage!: ElementRef<HTMLImageElement>;

  // Component state
  imageLoaded = false;
  imageError = false;
  imageLoading = true;
  hasAttemptedRetry = false; // Track if we've attempted an automatic retry
  retryCount = 0; // Track number of manual retries

  // Zoom state
  zoomState: PhotoZoomState | null = null;
  isDragging = false;
  lastPanPoint = { x: 0, y: 0 };

  // Touch gesture state
  public touchStartDistance = 0;
  public touchStartCenter = { x: 0, y: 0 };
  public isMultiTouch = false;
  private touchStartZoom = 1;
  private touchMoveThreshold = 5; // Minimum movement to register as gesture
  private lastTouchTime = 0;
  private doubleTapTimeout: any;

  // Performance optimization
  private resizeTimeout: any;

  // Store observables
  currentPhoto$: Observable<Photo | null>;
  photosLoading$: Observable<boolean>;
  photosError$: Observable<string | null>;
  allPhotos$: Observable<Photo[]>;
  currentPhotoIndex$: Observable<number>;

  private subscriptions = new Subscription();

  constructor(
    private store: Store<AppState>,
    private imagePreloader: ImagePreloaderService,
    private photoZoomService: PhotoZoomService,
    private interfaceToggleService: InterfaceToggleService,
    private loadingStateService: LoadingStateService
  ) {
    this.currentPhoto$ = this.store.select(PhotosSelectors.selectCurrentPhoto);
    this.photosLoading$ = this.store.select(PhotosSelectors.selectPhotosLoading);
    this.photosError$ = this.store.select(PhotosSelectors.selectPhotosError);
    this.allPhotos$ = this.store.select(PhotosSelectors.selectAllPhotos);
    this.currentPhotoIndex$ = this.store.select(GameSelectors.selectCurrentPhotoIndex);
  }

  ngOnInit(): void {
    // Subscribe to current photo changes with enhanced null checking
    this.subscriptions.add(
      this.currentPhoto$.pipe(
        distinctUntilChanged((prev, curr) => prev?.id === curr?.id),
        filter(photo => photo !== undefined) // Filter out undefined values
      ).subscribe(photo => {
        if (photo !== this.photo) {
          this.photo = photo;
          if (photo && this.isValidPhotoData(photo)) {
            this.resetImageState();
            this.resetZoomForNewPhoto();
            this.preloadNextPhoto();
          } else if (photo && !this.isValidPhotoData(photo)) {
            // Handle invalid photo data
            console.warn('Invalid photo data received:', photo);
            this.handleInvalidPhotoData();
          }
        }
      })
    );

    // Subscribe to zoom state changes from PhotoZoomService
    if (this.enableZoom) {
      this.subscriptions.add(
        this.photoZoomService.zoomState$.pipe(
          distinctUntilChanged((prev, curr) => 
            prev.zoomLevel === curr.zoomLevel && 
            prev.position.x === curr.position.x && 
            prev.position.y === curr.position.y
          )
        ).subscribe(state => {
          this.zoomState = state;
          // Only sync with interface service when view is actually changing
          // This prevents circular updates during normal zoom operations
        })
      );
    }

    // Preload all photos when they become available
    this.subscriptions.add(
      this.allPhotos$.subscribe(photos => {
        if (photos && photos.length > 0) {
          this.imagePreloader.preloadGamePhotos(photos).subscribe();
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    
    // Clean up timeouts
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    
    if (this.doubleTapTimeout) {
      clearTimeout(this.doubleTapTimeout);
    }
  }

  /**
   * Handles successful image loading
   * Requirements: 7.2, 4.4 - Responsive image display and loading state completion
   */
  onImageLoad(): void {
    this.imageLoaded = true;
    this.imageError = false;
    this.imageLoading = false;
    
    // Complete loading state
    this.loadingStateService.completePhotoLoad();
    
    // Initialize zoom after image loads
    if (this.enableZoom) {
      setTimeout(() => this.initializeZoom(), 0);
    }
  }

  /**
   * Preload the next photo in sequence for smooth transitions
   */
  private preloadNextPhoto(): void {
    this.subscriptions.add(
      this.allPhotos$.subscribe(photos => {
        if (photos && photos.length > 0) {
          this.subscriptions.add(
            this.currentPhotoIndex$.subscribe(currentIndex => {
              if (currentIndex >= 0) {
                this.imagePreloader.preloadNextPhoto(photos, currentIndex);
              }
            })
          );
        }
      })
    );
  }

  /**
   * Handles image loading errors with fallback messaging and retry logic
   * Requirements: 1.4, 4.2, 4.4, 4.5 - Error handling, loading states, and retry functionality
   */
  onImageError(): void {
    this.imageLoaded = false;
    this.imageError = true;
    this.imageLoading = false;
    
    // Set error state in loading service
    this.loadingStateService.setError(
      LoadingStateService.LOADING_KEYS.PHOTO_LOAD,
      `Failed to load image: ${this.photo?.title || 'Unknown photo'}`
    );
    
    // Log the error for debugging
    console.error('Image failed to load:', this.photo?.url);
    
    // Automatically retry once after a short delay if this is the first failure
    if (this.photo && !this.hasAttemptedRetry) {
      this.hasAttemptedRetry = true;
      setTimeout(() => {
        if (this.imageError && this.photo) {
          console.log('Attempting automatic retry for failed image:', this.photo.url);
          this.retryImageLoad();
        }
      }, 2000); // Wait 2 seconds before auto-retry
    }
  }

  /**
   * Resets image state when photo changes
   */
  private resetImageState(): void {
    this.imageLoaded = false;
    this.imageError = false;
    this.imageLoading = true;
    this.hasAttemptedRetry = false; // Reset retry flag for new photo
    this.retryCount = 0; // Reset retry count for new photo
  }

  /**
   * Retries loading the current image with enhanced error handling
   * Requirement 1.4, 4.2: Implement error handling for failed image loads with retry functionality
   */
  retryImageLoad(): void {
    if (!this.photo || !this.isValidPhotoData(this.photo)) {
      console.error('Cannot retry: Invalid or missing photo data');
      return;
    }

    // Limit retry attempts to prevent infinite loops
    if (this.retryCount >= 3) {
      console.error('Maximum retry attempts reached for image:', this.photo.url);
      this.imageError = true;
      this.imageLoading = false;
      return;
    }

    this.retryCount++;
    console.log(`Retrying image load (attempt ${this.retryCount}/3):`, this.photo.url);
    
    this.imageLoaded = false;
    this.imageError = false;
    this.imageLoading = true;
    
    // Try to use preloaded image first
    const preloadedImage = this.imagePreloader.getPreloadedImage(this.photo.url);
    if (preloadedImage) {
      console.log('Using preloaded image for retry');
      this.onImageLoad();
      return;
    }
    
    // Validate URL before attempting to load
    if (!this.isValidImageUrl(this.photo.url)) {
      console.error('Invalid image URL:', this.photo.url);
      this.onImageError();
      return;
    }
    
    // Force image reload by adding timestamp to URL
    const img = new Image();
    img.onload = () => {
      console.log('Image retry successful:', this.photo?.url);
      this.onImageLoad();
    };
    img.onerror = (error) => {
      console.error('Image retry failed:', this.photo?.url, error);
      this.onImageError();
    };
    
    // Add cache-busting parameter and retry count
    const separator = this.photo.url.includes('?') ? '&' : '?';
    img.src = `${this.photo.url}${separator}retry=${Date.now()}&attempt=${this.retryCount}`;
  }

  /**
   * Check if current image is preloaded
   */
  isImagePreloaded(): boolean {
    return this.photo ? this.imagePreloader.isPreloaded(this.photo.url) : false;
  }

  /**
   * Gets appropriate alt text for the image
   * Requirement: Accessibility support
   */
  getImageAltText(): string {
    if (!this.photo) return 'Historical photograph';
    
    let altText = this.photo.title || 'Historical photograph';
    
    if (this.showMetadata) {
      altText += ` from ${this.photo.year}`;
      if (this.photo.description) {
        altText += ` - ${this.photo.description}`;
      }
    }
    
    return altText;
  }

  /**
   * Gets accessible image label for screen readers
   */
  getAccessibleImageLabel(): string {
    if (!this.photo) return 'Historical photograph';
    
    let label = this.photo.title || 'Historical photograph';
    label += ` from ${this.photo.year}`;
    
    if (this.isPhotoZoomed()) {
      label += `. Currently zoomed to ${this.getCurrentZoomLevel()}x. Use arrow keys to pan.`;
    } else {
      label += '. Use plus key to zoom in.';
    }
    
    return label;
  }

  /**
   * Gets detailed photo description for screen readers
   */
  getDetailedPhotoDescription(): string {
    if (!this.photo) return 'No photograph information available';
    
    let description = `Historical photograph titled "${this.photo.title}" from ${this.photo.year}`;
    
    if (this.photo.description) {
      description += `. Description: ${this.photo.description}`;
    }
    
    if (this.photo.metadata.photographer) {
      description += `. Photographer: ${this.photo.metadata.photographer}`;
    }
    
    description += `. Source: ${this.photo.source}`;
    
    return description;
  }

  /**
   * Gets loading state for accessibility
   */
  getLoadingAriaLabel(): string {
    if (this.imageLoading) return 'Loading photograph...';
    if (this.imageError) return 'Failed to load photograph';
    if (this.imageLoaded) return 'Photograph loaded successfully';
    return 'Photograph';
  }

  /**
   * Initialize zoom functionality after image loads
   */
  private initializeZoom(): void {
    if (!this.enableZoom || !this.photoContainer || !this.photoImage) return;

    const container = this.photoContainer.nativeElement;
    const image = this.photoImage.nativeElement;

    this.photoZoomService.initializeZoom(
      container.clientWidth,
      container.clientHeight,
      image.naturalWidth,
      image.naturalHeight
    );
  }

  /**
   * Reset zoom to default state
   */
  private resetZoom(): void {
    if (this.enableZoom) {
      this.photoZoomService.reset();
    }
  }

  /**
   * Reset zoom for new photo (requirement 5.4)
   * This ensures each round starts with a clean slate
   */
  private resetZoomForNewPhoto(): void {
    if (this.enableZoom) {
      this.photoZoomService.reset();
      // Also reset the interface toggle service zoom state
      this.interfaceToggleService.resetPhotoZoom();
    }
  }

  /**
   * Sync zoom state with InterfaceToggleService for preservation during toggles (requirement 2.5)
   * DISABLED: This method was causing circular updates and browser crashes
   */
  private syncZoomStateWithInterface(zoomState: PhotoZoomState): void {
    // Temporarily disabled to prevent circular updates
    // TODO: Implement proper state preservation without circular dependencies
  }

  /**
   * Restore zoom state from InterfaceToggleService when switching back to photo view
   * DISABLED: This method was causing circular updates and browser crashes
   */
  private restoreZoomStateFromInterface(interfaceZoomState: any): void {
    // Temporarily disabled to prevent circular updates
    // TODO: Implement proper state restoration without circular dependencies
  }

  /**
   * Get CSS transform for zoomed image
   */
  getImageTransform(): string {
    if (!this.enableZoom || !this.zoomState) return '';
    return this.photoZoomService.getTransform();
  }

  /**
   * Handle mouse down for pan start
   */
  onMouseDown(event: MouseEvent): void {
    if (!this.enableZoom || !this.zoomState || this.zoomState.zoomLevel <= 1) return;
    
    event.preventDefault();
    this.isDragging = true;
    this.lastPanPoint = { x: event.clientX, y: event.clientY };
  }

  /**
   * Handle mouse wheel for zoom in/out
   */
  onWheel(event: WheelEvent): void {
    if (!this.enableZoom || !this.zoomState || !this.photoContainer) return;
    
    event.preventDefault();
    
    // Get mouse position relative to the container
    const containerRect = this.photoContainer.nativeElement.getBoundingClientRect();
    const centerX = event.clientX - containerRect.left;
    const centerY = event.clientY - containerRect.top;
    
    // Determine zoom direction and calculate new zoom level
    if (event.deltaY < 0) {
      // Zoom in
      const newZoomLevel = Math.min(this.zoomState.zoomLevel * 1.1, this.zoomState.maxZoom);
      this.photoZoomService.zoomToPoint(newZoomLevel, centerX, centerY);
    } else {
      // Zoom out
      if (this.zoomState.zoomLevel > 1) {
        const newZoomLevel = Math.max(this.zoomState.zoomLevel / 1.1, this.zoomState.minZoom);
        if (newZoomLevel <= 1.01) {
          this.photoZoomService.reset();
        } else {
          this.photoZoomService.zoomToPoint(newZoomLevel, centerX, centerY);
        }
      }
    }
  }

  /**
   * Handle mouse move for panning with boundary constraints
   */
  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.isDragging || !this.enableZoom || !this.zoomState || this.zoomState.zoomLevel <= 1) return;

    event.preventDefault();
    const deltaX = event.clientX - this.lastPanPoint.x;
    const deltaY = event.clientY - this.lastPanPoint.y;

    // Only update if movement is significant (reduces excessive updates)
    if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
      this.photoZoomService.pan(deltaX, deltaY);
      this.lastPanPoint = { x: event.clientX, y: event.clientY };
    }
  }

  /**
   * Handle mouse up for pan end
   */
  @HostListener('document:mouseup')
  onMouseUp(): void {
    this.isDragging = false;
  }

  /**
   * Handle touch start for pan and pinch gestures with enhanced mobile support
   */
  onTouchStart(event: TouchEvent): void {
    if (!this.enableZoom) return;

    event.preventDefault();
    
    const currentTime = Date.now();

    if (event.touches.length === 1) {
      const touch = event.touches[0];
      
      // Check for double tap
      if (currentTime - this.lastTouchTime < 300) {
        this.handleDoubleTap(touch);
        return;
      }
      
      this.lastTouchTime = currentTime;
      
      // Single touch - start pan or prepare for double tap
      this.isDragging = this.zoomState ? this.zoomState.zoomLevel > 1 : false;
      this.isMultiTouch = false;
      this.lastPanPoint = {
        x: touch.clientX,
        y: touch.clientY
      };
      
      // Add visual feedback for touch
      if (this.photoContainer) {
        this.photoContainer.nativeElement.classList.add('touch-active');
      }
      
    } else if (event.touches.length === 2) {
      // Multi-touch - start pinch
      this.isDragging = false;
      this.isMultiTouch = true;
      
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      
      this.touchStartDistance = this.getTouchDistance(touch1, touch2);
      this.touchStartCenter = this.getTouchCenter(touch1, touch2);
      this.touchStartZoom = this.zoomState ? this.zoomState.zoomLevel : 1;
      
      // Clear any pending double tap
      if (this.doubleTapTimeout) {
        clearTimeout(this.doubleTapTimeout);
        this.doubleTapTimeout = null;
      }
    }
  }

  /**
   * Handle touch move for pan and pinch gestures with enhanced mobile support
   */
  onTouchMove(event: TouchEvent): void {
    if (!this.enableZoom) return;

    event.preventDefault();

    if (event.touches.length === 1 && this.isDragging && !this.isMultiTouch) {
      // Single touch pan with boundary constraints and momentum
      if (this.zoomState && this.zoomState.zoomLevel > 1) {
        const touch = event.touches[0];
        const deltaX = touch.clientX - this.lastPanPoint.x;
        const deltaY = touch.clientY - this.lastPanPoint.y;

        // Only update if movement exceeds threshold (reduces jitter)
        const moveDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        if (moveDistance > this.touchMoveThreshold) {
          this.photoZoomService.pan(deltaX, deltaY);
          this.lastPanPoint = { x: touch.clientX, y: touch.clientY };
        }
      }
    } else if (event.touches.length === 2 && this.isMultiTouch) {
      // Enhanced pinch zoom with better scaling
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      
      const currentDistance = this.getTouchDistance(touch1, touch2);
      const currentCenter = this.getTouchCenter(touch1, touch2);
      
      if (this.touchStartDistance > 0) {
        const rawScale = currentDistance / this.touchStartDistance;
        
        // Apply smoothing to scale changes for better UX
        const smoothedScale = this.smoothScale(rawScale);
        
        // Only update if scale change is significant
        if (Math.abs(smoothedScale - 1) > 0.02) {
          // Calculate new zoom level based on initial zoom
          const newZoomLevel = this.touchStartZoom * smoothedScale;
          
          this.photoZoomService.handlePinchZoom(
            smoothedScale,
            currentCenter.x,
            currentCenter.y
          );
          
          // Update reference points less frequently for smoother experience
          if (Math.abs(rawScale - 1) > 0.1) {
            this.touchStartDistance = currentDistance;
            this.touchStartCenter = currentCenter;
            this.touchStartZoom = newZoomLevel;
          }
        }
      }
    }
  }

  /**
   * Handle touch end with enhanced mobile support
   */
  onTouchEnd(event: TouchEvent): void {
    if (!this.enableZoom) return;

    // Remove visual feedback
    if (this.photoContainer) {
      this.photoContainer.nativeElement.classList.remove('touch-active');
    }

    if (event.touches.length === 0) {
      // All touches ended
      this.isDragging = false;
      this.isMultiTouch = false;
      this.touchStartDistance = 0;
      this.touchStartZoom = 1;
      
      // Add haptic feedback if available
      if ('vibrate' in navigator && this.zoomState && this.zoomState.zoomLevel !== 1) {
        navigator.vibrate(10);
      }
      
    } else if (event.touches.length === 1 && this.isMultiTouch) {
      // Transition from multi-touch to single touch
      this.isMultiTouch = false;
      this.isDragging = this.zoomState ? this.zoomState.zoomLevel > 1 : false;
      this.lastPanPoint = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
      };
      this.touchStartDistance = 0;
      this.touchStartZoom = 1;
    }
  }

  /**
   * Handle keyboard shortcuts for photo zoom
   */
  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (!this.enableZoom || !this.imageLoaded || this.imageError) return;

    let handled = false;
    let announcement = '';

    switch (event.key) {
      case '+':
      case '=':
        if (this.photoZoomService.canZoomIn()) {
          this.photoZoomService.zoomIn();
          announcement = `Zoomed in to ${this.getCurrentZoomLevel()}x`;
          handled = true;
        }
        break;
      case '-':
        if (this.photoZoomService.canZoomOut()) {
          this.photoZoomService.zoomOut();
          announcement = `Zoomed out to ${this.getCurrentZoomLevel()}x`;
          handled = true;
        }
        break;
      case '0':
        if (this.zoomState && this.zoomState.zoomLevel !== 1) {
          this.photoZoomService.reset();
          announcement = 'Zoom reset to original size';
          handled = true;
        }
        break;
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
        if (this.zoomState && this.zoomState.zoomLevel > 1) {
          const panDistance = 20;
          let deltaX = 0;
          let deltaY = 0;

          switch (event.key) {
            case 'ArrowUp':
              deltaY = panDistance;
              break;
            case 'ArrowDown':
              deltaY = -panDistance;
              break;
            case 'ArrowLeft':
              deltaX = panDistance;
              break;
            case 'ArrowRight':
              deltaX = -panDistance;
              break;
          }

          this.photoZoomService.pan(deltaX, deltaY);
          announcement = `Panned ${event.key.replace('Arrow', '').toLowerCase()}`;
          handled = true;
        }
        break;
      case 'Home':
        if (this.zoomState && this.zoomState.zoomLevel > 1) {
          // Reset pan position to center
          this.photoZoomService.pan(-this.zoomState.position.x, -this.zoomState.position.y);
          announcement = 'Photo centered';
          handled = true;
        }
        break;
    }

    if (handled) {
      event.preventDefault();
      event.stopPropagation();
      
      // Announce the action to screen readers
      if (announcement) {
        this.announceToScreenReader(announcement);
      }
    }
  }

  /**
   * Handle window resize to update zoom container dimensions
   */
  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.enableZoom && this.photoContainer && this.imageLoaded) {
      // Throttle resize events to prevent excessive updates
      if (this.resizeTimeout) {
        clearTimeout(this.resizeTimeout);
      }
      
      this.resizeTimeout = setTimeout(() => {
        const container = this.photoContainer.nativeElement;
        this.photoZoomService.updateContainerDimensions(
          container.clientWidth,
          container.clientHeight
        );
        this.resizeTimeout = null;
      }, 250);
    }
  }

  /**
   * Announce message to screen readers
   */
  private announceToScreenReader(message: string): void {
    // Create a temporary element for screen reader announcements
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // Remove after announcement
    setTimeout(() => {
      if (document.body.contains(announcement)) {
        document.body.removeChild(announcement);
      }
    }, 1000);
  }

  /**
   * Calculate distance between two touch points
   */
  private getTouchDistance(touch1: Touch, touch2: Touch): number {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate center point between two touches
   */
  private getTouchCenter(touch1: Touch, touch2: Touch): { x: number; y: number } {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
  }

  /**
   * Handle double tap to zoom in/out
   */
  private handleDoubleTap(touch: Touch): void {
    if (!this.enableZoom || !this.zoomState) return;
    
    // Clear any existing timeout
    if (this.doubleTapTimeout) {
      clearTimeout(this.doubleTapTimeout);
      this.doubleTapTimeout = null;
    }
    
    const isZoomed = this.zoomState.zoomLevel > 1;
    
    if (isZoomed) {
      // Zoom out to fit
      this.photoZoomService.reset();
    } else {
      // Zoom in to 2x at touch point
      const containerRect = this.photoContainer.nativeElement.getBoundingClientRect();
      const centerX = touch.clientX - containerRect.left;
      const centerY = touch.clientY - containerRect.top;
      
      this.photoZoomService.zoomToPoint(2, centerX, centerY);
    }
    
    // Add haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(30);
    }
  }

  /**
   * Smooth scale changes for better pinch zoom experience
   */
  private smoothScale(rawScale: number): number {
    // Apply logarithmic smoothing to make zoom feel more natural
    const logScale = Math.log(rawScale);
    const smoothedLogScale = logScale * 0.8; // Reduce sensitivity
    return Math.exp(smoothedLogScale);
  }

  /**
   * Check if zoom is enabled and active
   */
  isZoomEnabled(): boolean {
    return this.enableZoom && this.imageLoaded && !this.imageError;
  }

  /**
   * Check if photo is currently zoomed
   */
  isPhotoZoomed(): boolean {
    return this.zoomState ? this.zoomState.zoomLevel > 1 : false;
  }

  /**
   * Get current zoom level for display
   */
  getCurrentZoomLevel(): number {
    return this.zoomState ? Math.round(this.zoomState.zoomLevel * 10) / 10 : 1;
  }

  /**
   * Handle zoom controls events
   */
  onZoomControlsEvent(event: 'zoomIn' | 'zoomOut' | 'reset'): void {
    if (!this.enableZoom) return;

    switch (event) {
      case 'zoomIn':
        this.photoZoomService.zoomIn();
        break;
      case 'zoomOut':
        this.photoZoomService.zoomOut();
        break;
      case 'reset':
        this.photoZoomService.reset();
        break;
    }
  }

  /**
   * Validates photo data to ensure it meets requirements
   * Requirement 1.1, 4.2: Add null checks and loading states for when photo data is undefined
   */
  private isValidPhotoData(photo: Photo | null): boolean {
    if (!photo) {
      return false;
    }

    // Check required fields
    if (!photo.id || typeof photo.id !== 'string') {
      console.warn('Photo missing or invalid id:', photo);
      return false;
    }

    if (!photo.url || typeof photo.url !== 'string') {
      console.warn('Photo missing or invalid url:', photo);
      return false;
    }

    if (!photo.title || typeof photo.title !== 'string') {
      console.warn('Photo missing or invalid title:', photo);
      return false;
    }

    if (typeof photo.year !== 'number' || photo.year < 1900 || photo.year > new Date().getFullYear()) {
      console.warn('Photo has invalid year:', photo.year);
      return false;
    }

    // Validate coordinates
    if (!photo.coordinates || 
        typeof photo.coordinates.latitude !== 'number' || 
        typeof photo.coordinates.longitude !== 'number' ||
        Math.abs(photo.coordinates.latitude) > 90 ||
        Math.abs(photo.coordinates.longitude) > 180) {
      console.warn('Photo has invalid coordinates:', photo.coordinates);
      return false;
    }

    return true;
  }

  /**
   * Validates image URL format and accessibility
   * Requirement 1.4: Ensure photo component properly handles photo URL validation
   */
  private isValidImageUrl(url: string): boolean {
    if (!url || typeof url !== 'string') {
      return false;
    }

    try {
      const urlObj = new URL(url);
      
      // Check if it's a valid HTTP/HTTPS URL
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return false;
      }

      // Check if it looks like an image URL (basic check)
      const pathname = urlObj.pathname.toLowerCase();
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
      const hasImageExtension = imageExtensions.some(ext => pathname.endsWith(ext));
      
      // Allow URLs without extensions (many APIs serve images without file extensions)
      // but log a warning for debugging
      if (!hasImageExtension) {
        console.log('Image URL without standard extension:', url);
      }

      return true;
    } catch (error) {
      console.error('Invalid URL format:', url, error);
      return false;
    }
  }

  /**
   * Handles invalid photo data by setting appropriate error state
   * Requirement 4.2: Component integration fix for invalid data
   */
  private handleInvalidPhotoData(): void {
    this.imageLoaded = false;
    this.imageError = true;
    this.imageLoading = false;
    this.photo = null; // Clear invalid photo data
    console.error('Invalid photo data received, clearing photo state');
  }

  /**
   * Gets user-friendly error message based on error type
   * Requirement 4.5: Error boundaries display fallback UI
   */
  getErrorMessage(): string {
    if (!this.photo) {
      return 'No photograph available to display';
    }

    if (this.retryCount >= 3) {
      return 'Unable to load photograph after multiple attempts. Please check your internet connection.';
    }

    return 'Failed to load photograph. Click "Try Again" to retry.';
  }

  /**
   * Checks if retry button should be shown
   * Requirement 1.4: Implement error handling with retry functionality
   */
  shouldShowRetryButton(): boolean {
    return this.imageError && this.photo !== null && this.retryCount < 3;
  }

  /**
   * Gets loading progress information for accessibility
   * Requirement 1.1: Add loading states for when photo data is undefined
   */
  getLoadingProgress(): string {
    if (this.imageLoading && this.photo) {
      if (this.retryCount > 0) {
        return `Loading photograph (attempt ${this.retryCount + 1})...`;
      }
      return 'Loading photograph...';
    }
    
    if (this.imageError) {
      return 'Failed to load photograph';
    }
    
    if (this.imageLoaded) {
      return 'Photograph loaded successfully';
    }
    
    return 'Preparing to load photograph...';
  }

  /**
   * Handles photo input changes with validation
   * Requirements: 1.1, 4.2, 4.4 - Add null checks, loading states, and comprehensive error handling
   */
  private onPhotoChange(newPhoto: Photo | null): void {
    // Reset state for new photo
    this.resetImageState();
    
    if (newPhoto) {
      if (this.isValidPhotoData(newPhoto)) {
        // Valid photo data - start loading state and proceed
        this.loadingStateService.startPhotoLoad(newPhoto.title || 'Historical photograph');
        this.resetZoomForNewPhoto();
        this.preloadNextPhoto();
      } else {
        // Invalid photo data - handle gracefully
        console.warn('Invalid photo data provided:', newPhoto);
        this.loadingStateService.setError(
          LoadingStateService.LOADING_KEYS.PHOTO_LOAD,
          'Invalid photo data received'
        );
        this.handleInvalidPhotoData();
      }
    } else {
      // No photo data - clear state
      this.imageLoading = false;
      this.loadingStateService.clearLoadingState(LoadingStateService.LOADING_KEYS.PHOTO_LOAD);
      if (this.enableZoom) {
        this.resetZoomForNewPhoto();
      }
    }
  }
}