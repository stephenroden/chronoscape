import { Component, Input, OnInit, OnDestroy, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { Observable, Subscription } from 'rxjs';
import { distinctUntilChanged, filter } from 'rxjs/operators';
import { Photo } from '../../models/photo.model';
import { AppState } from '../../state/app.state';
import { ImagePreloaderService } from '../../services/image-preloader.service';
import { PhotoZoomService, PhotoZoomState } from '../../services/photo-zoom.service';
import { InterfaceToggleService } from '../../services/interface-toggle.service';
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
  @Input() photo: Photo | null = null;
  @Input() showMetadata: boolean = false; // For testing purposes, normally false during game
  @Input() enableZoom: boolean = true; // Enable/disable zoom functionality

  @ViewChild('photoContainer', { static: false }) photoContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('photoImage', { static: false }) photoImage!: ElementRef<HTMLImageElement>;

  // Component state
  imageLoaded = false;
  imageError = false;
  imageLoading = true;

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
    private interfaceToggleService: InterfaceToggleService
  ) {
    this.currentPhoto$ = this.store.select(PhotosSelectors.selectCurrentPhoto);
    this.photosLoading$ = this.store.select(PhotosSelectors.selectPhotosLoading);
    this.photosError$ = this.store.select(PhotosSelectors.selectPhotosError);
    this.allPhotos$ = this.store.select(PhotosSelectors.selectAllPhotos);
    this.currentPhotoIndex$ = this.store.select(GameSelectors.selectCurrentPhotoIndex);
  }

  ngOnInit(): void {
    // Subscribe to current photo changes
    this.subscriptions.add(
      this.currentPhoto$.pipe(
        distinctUntilChanged((prev, curr) => prev?.id === curr?.id)
      ).subscribe(photo => {
        if (photo !== this.photo) {
          this.photo = photo;
          if (photo) {
            this.resetImageState();
            this.resetZoomForNewPhoto();
            this.preloadNextPhoto();
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
   * Requirement 7.2: Responsive image display
   */
  onImageLoad(): void {
    this.imageLoaded = true;
    this.imageError = false;
    this.imageLoading = false;
    
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
   * Handles image loading errors with fallback messaging
   * Requirement 7.4: Error handling for failed image loads
   */
  onImageError(): void {
    this.imageLoaded = false;
    this.imageError = true;
    this.imageLoading = false;
  }

  /**
   * Resets image state when photo changes
   */
  private resetImageState(): void {
    this.imageLoaded = false;
    this.imageError = false;
    this.imageLoading = true;
  }

  /**
   * Retries loading the current image
   */
  retryImageLoad(): void {
    if (this.photo) {
      this.resetImageState();
      
      // Try to use preloaded image first
      const preloadedImage = this.imagePreloader.getPreloadedImage(this.photo.url);
      if (preloadedImage) {
        this.onImageLoad();
        return;
      }
      
      // Force image reload by adding timestamp to URL
      const img = new Image();
      img.onload = () => this.onImageLoad();
      img.onerror = () => this.onImageError();
      img.src = `${this.photo.url}?retry=${Date.now()}`;
    }
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
}