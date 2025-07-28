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
        this.photoZoomService.zoomState$.subscribe(state => {
          this.zoomState = state;
          // Sync zoom state with InterfaceToggleService for preservation during toggles
          this.syncZoomStateWithInterface(state);
        })
      );

      // Subscribe to interface toggle service for zoom state restoration
      this.subscriptions.add(
        this.interfaceToggleService.photoZoomState$.pipe(
          filter(state => !!state),
          distinctUntilChanged()
        ).subscribe(interfaceZoomState => {
          // Restore zoom state when switching back to photo view
          if (this.interfaceToggleService.getCurrentActiveView() === 'photo') {
            this.restoreZoomStateFromInterface(interfaceZoomState);
          }
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
   */
  private syncZoomStateWithInterface(zoomState: PhotoZoomState): void {
    if (this.enableZoom && zoomState) {
      // Convert PhotoZoomService state to InterfaceToggleService state format
      this.interfaceToggleService.setPhotoZoomState({
        zoomLevel: zoomState.zoomLevel,
        position: zoomState.position,
        minZoom: zoomState.minZoom,
        maxZoom: zoomState.maxZoom
      });
    }
  }

  /**
   * Restore zoom state from InterfaceToggleService when switching back to photo view
   */
  private restoreZoomStateFromInterface(interfaceZoomState: any): void {
    if (this.enableZoom && interfaceZoomState && this.photoContainer && this.photoImage) {
      const container = this.photoContainer.nativeElement;
      const image = this.photoImage.nativeElement;

      // Initialize zoom service with current dimensions
      this.photoZoomService.initializeZoom(
        container.clientWidth,
        container.clientHeight,
        image.naturalWidth,
        image.naturalHeight
      );

      // Restore the zoom level and position
      this.photoZoomService.setZoomLevel(interfaceZoomState.zoomLevel);
      this.photoZoomService.setPosition(interfaceZoomState.position.x, interfaceZoomState.position.y);
    }
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

    // Apply pan with boundary constraints
    this.photoZoomService.pan(deltaX, deltaY);
    this.lastPanPoint = { x: event.clientX, y: event.clientY };
  }

  /**
   * Handle mouse up for pan end
   */
  @HostListener('document:mouseup')
  onMouseUp(): void {
    this.isDragging = false;
  }

  /**
   * Handle touch start for pan and pinch gestures
   */
  onTouchStart(event: TouchEvent): void {
    if (!this.enableZoom) return;

    event.preventDefault();

    if (event.touches.length === 1) {
      // Single touch - start pan
      this.isDragging = true;
      this.isMultiTouch = false;
      this.lastPanPoint = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
      };
    } else if (event.touches.length === 2) {
      // Multi-touch - start pinch
      this.isDragging = false;
      this.isMultiTouch = true;
      
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      
      this.touchStartDistance = this.getTouchDistance(touch1, touch2);
      this.touchStartCenter = this.getTouchCenter(touch1, touch2);
    }
  }

  /**
   * Handle touch move for pan and pinch gestures with boundary constraints
   */
  onTouchMove(event: TouchEvent): void {
    if (!this.enableZoom) return;

    event.preventDefault();

    if (event.touches.length === 1 && this.isDragging && !this.isMultiTouch) {
      // Single touch pan with boundary constraints
      if (this.zoomState && this.zoomState.zoomLevel > 1) {
        const touch = event.touches[0];
        const deltaX = touch.clientX - this.lastPanPoint.x;
        const deltaY = touch.clientY - this.lastPanPoint.y;

        this.photoZoomService.pan(deltaX, deltaY);
        this.lastPanPoint = { x: touch.clientX, y: touch.clientY };
      }
    } else if (event.touches.length === 2 && this.isMultiTouch) {
      // Pinch zoom with smooth scaling
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      
      const currentDistance = this.getTouchDistance(touch1, touch2);
      const currentCenter = this.getTouchCenter(touch1, touch2);
      
      if (this.touchStartDistance > 0) {
        const scale = currentDistance / this.touchStartDistance;
        
        // Apply pinch zoom with center point
        this.photoZoomService.handlePinchZoom(
          scale,
          currentCenter.x,
          currentCenter.y
        );
      }
      
      this.touchStartDistance = currentDistance;
      this.touchStartCenter = currentCenter;
    }
  }

  /**
   * Handle touch end
   */
  onTouchEnd(event: TouchEvent): void {
    if (!this.enableZoom) return;

    if (event.touches.length === 0) {
      this.isDragging = false;
      this.isMultiTouch = false;
      this.touchStartDistance = 0;
    } else if (event.touches.length === 1 && this.isMultiTouch) {
      // Transition from multi-touch to single touch
      this.isMultiTouch = false;
      this.isDragging = true;
      this.lastPanPoint = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
      };
    }
  }

  /**
   * Handle window resize to update zoom container dimensions
   */
  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.enableZoom && this.photoContainer && this.imageLoaded) {
      setTimeout(() => {
        const container = this.photoContainer.nativeElement;
        this.photoZoomService.updateContainerDimensions(
          container.clientWidth,
          container.clientHeight
        );
      }, 100);
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