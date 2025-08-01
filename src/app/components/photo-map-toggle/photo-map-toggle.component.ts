import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, HostListener, ElementRef, ViewChild, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { Observable, Subject, combineLatest } from 'rxjs';
import { takeUntil, map, distinctUntilChanged, catchError } from 'rxjs/operators';
import { PerformanceMonitorService } from '../../services/performance-monitor.service';
import { LoadingStateService, LoadingState } from '../../services/loading-state.service';
import { ErrorBoundaryComponent } from '../error-boundary/error-boundary.component';

import { AppState } from '../../state/app.state';
import { InterfaceToggleService } from '../../services/interface-toggle.service';
import { PhotoDisplayComponent } from '../photo-display/photo-display.component';
import { MapGuessComponent } from '../map-guess/map-guess.component';
import { Photo } from '../../models/photo.model';
import { ActiveView, PhotoZoomState, MapState } from '../../models/interface-state.model';
import { Coordinates } from '../../models/coordinates.model';
import { setCurrentGuess } from '../../state/scoring/scoring.actions';

/**
 * Container component that manages photo and map display areas with toggle functionality.
 * Provides micro thumbnail generation for inactive view and smooth transitions.
 * 
 * Features:
 * - Toggle between photo and map views
 * - Micro thumbnail display for inactive view
 * - Smooth transition animations
 * - Keyboard navigation support
 * - State preservation during toggles
 * - Accessibility support with ARIA labels
 */
@Component({
  selector: 'app-photo-map-toggle',
  standalone: true,
  imports: [CommonModule, PhotoDisplayComponent, MapGuessComponent, ErrorBoundaryComponent],
  templateUrl: './photo-map-toggle.component.html',
  styleUrls: ['./photo-map-toggle.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PhotoMapToggleComponent implements OnInit, OnDestroy {
  private _photo: Photo | null = null;
  
  @Input() 
  set photo(value: Photo | null) {
    // DEBUG: Log photo input changes (Task 1 requirement)
    console.log('[PhotoMapToggleComponent] Photo input changed:', {
      previousPhoto: this._photo ? {
        id: this._photo.id,
        title: this._photo.title,
        year: this._photo.year
      } : null,
      newPhoto: value ? {
        id: value.id,
        title: value.title,
        year: value.year,
        url: value.url ? value.url.substring(0, 50) + '...' : null,
        coordinates: value.coordinates
      } : null,
      timestamp: new Date().toISOString()
    });

    // Validate photo data (Task 1 requirement)
    if (value && !this.validatePhotoInput(value)) {
      console.error('[PhotoMapToggleComponent] Received invalid photo data:', value);
    }

    this._photo = value;
    
    // Mark cached values for update
    this._needsAriaUpdate = true;
    this._needsClassUpdate = true;
    
    // Update thumbnails when photo changes
    if (this.thumbnailImageSrc !== null || this.thumbnailMapSrc !== null) {
      this.updatePhotoThumbnail();
    }
    
    // Trigger change detection
    this.cdr.markForCheck();
  }
  
  get photo(): Photo | null {
    return this._photo;
  }

  @Input() enableZoom: boolean = true;
  @Input() showMetadata: boolean = false;
  @Input() transitionDuration: number = 300;

  @Output() viewToggled = new EventEmitter<ActiveView>();
  @Output() photoZoomChanged = new EventEmitter<PhotoZoomState>();
  @Output() mapStateChanged = new EventEmitter<MapState>();

  @ViewChild('mainContainer', { static: true }) mainContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('thumbnailContainer', { static: true }) thumbnailContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('photoDisplay', { static: false }) photoDisplay!: PhotoDisplayComponent;
  @ViewChild('mapGuess', { static: false }) mapGuess!: MapGuessComponent;

  // Observable streams
  activeView$: Observable<ActiveView>;
  isPhotoActive$: Observable<boolean>;
  isMapActive$: Observable<boolean>;
  inactiveView$: Observable<ActiveView>;
  transitionInProgress$: Observable<boolean>;
  canToggle$: Observable<boolean>;
  photoZoomState$: Observable<PhotoZoomState>;
  mapState$: Observable<MapState>;
  
  // Loading state observables
  photoLoadingState$: Observable<LoadingState>;
  mapLoadingState$: Observable<LoadingState>;

  // Component state
  currentActiveView: ActiveView = 'photo';
  currentInactiveView: ActiveView = 'map';
  isTransitioning = false;
  canToggleView = true;

  // Thumbnail state
  thumbnailData: { view: ActiveView; isActive: boolean } | null = null;
  thumbnailImageSrc: string | null = null;
  thumbnailMapSrc: string | null = null;

  // Cached computed values to avoid change detection issues
  private _mainContainerClasses: string[] = [];
  private _activeViewClasses: string[] = [];
  private _thumbnailClasses: string[] = [];
  private _thumbnailImageSrc: string | null = null;
  private _thumbnailAltText: string = '';
  private _thumbnailAriaLabel: string = '';
  private _mainContainerAriaLabel: string = '';
  private _photoDescription: string = '';

  // Flags to track when cached values need updating
  private _needsClassUpdate = true;
  private _needsAriaUpdate = true;

  // Mobile and touch support
  private isMobileDevice = false;
  private touchStartTime = 0;
  private touchStartPosition = { x: 0, y: 0 };
  private longPressTimeout: any;
  private readonly LONG_PRESS_DURATION = 500;
  private readonly MAX_TOUCH_MOVE_DISTANCE = 10;

  private destroy$ = new Subject<void>();

  constructor(
    private store: Store<AppState>,
    private interfaceToggleService: InterfaceToggleService,
    private elementRef: ElementRef,
    private performanceMonitor: PerformanceMonitorService,
    private loadingStateService: LoadingStateService,
    private cdr: ChangeDetectorRef
  ) {
    // Initialize observables
    this.activeView$ = this.interfaceToggleService.activeView$;
    this.isPhotoActive$ = this.interfaceToggleService.isPhotoActive$;
    this.isMapActive$ = this.interfaceToggleService.isMapActive$;
    this.inactiveView$ = this.interfaceToggleService.inactiveView$;
    this.transitionInProgress$ = this.interfaceToggleService.transitionInProgress$;
    this.canToggle$ = this.interfaceToggleService.canToggle$;
    this.photoZoomState$ = this.interfaceToggleService.photoZoomState$;
    this.mapState$ = this.interfaceToggleService.mapState$;
    
    // Initialize loading state observables
    this.photoLoadingState$ = this.loadingStateService.getLoadingState(LoadingStateService.LOADING_KEYS.PHOTO_LOAD);
    this.mapLoadingState$ = this.loadingStateService.getLoadingState(LoadingStateService.LOADING_KEYS.MAP_INIT);
  }

  ngOnInit(): void {
    this.detectMobileDevice();
    this.setupSubscriptions();
    this.initializeThumbnails();

    // DEBUG: Log initial photo input (Task 1 requirement)
    console.log('[PhotoMapToggleComponent] Component initialized with photo:', {
      photo: this.photo ? {
        id: this.photo.id,
        title: this.photo.title,
        year: this.photo.year,
        url: this.photo.url ? this.photo.url.substring(0, 50) + '...' : null
      } : null,
      timestamp: new Date().toISOString()
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    // Clean up touch timeouts
    if (this.longPressTimeout) {
      clearTimeout(this.longPressTimeout);
    }
  }

  /**
   * Detect if running on mobile device for enhanced touch support
   */
  private detectMobileDevice(): void {
    this.isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                         ('ontouchstart' in window) ||
                         (navigator.maxTouchPoints > 0);
  }

  /**
   * Setup component subscriptions
   */
  private setupSubscriptions(): void {
    // Subscribe to active view changes
    this.activeView$
      .pipe(
        takeUntil(this.destroy$),
        distinctUntilChanged()
      )
      .subscribe(activeView => {
        this.currentActiveView = activeView;
        this.currentInactiveView = activeView === 'photo' ? 'map' : 'photo';
        this.updateThumbnailData();
        this._needsClassUpdate = true;
        this._needsAriaUpdate = true;
        this.viewToggled.emit(activeView);
        this.cdr.markForCheck();
      });

    // Subscribe to transition state
    this.transitionInProgress$
      .pipe(takeUntil(this.destroy$))
      .subscribe(inProgress => {
        this.isTransitioning = inProgress;
        this._needsClassUpdate = true;
        this._needsAriaUpdate = true;
        this.cdr.markForCheck();
      });

    // Subscribe to toggle capability
    this.canToggle$
      .pipe(takeUntil(this.destroy$))
      .subscribe(canToggle => {
        this.canToggleView = canToggle;
        this._needsClassUpdate = true;
        this._needsAriaUpdate = true;
        this.cdr.markForCheck();
      });

    // Subscribe to photo zoom changes
    this.photoZoomState$
      .pipe(
        takeUntil(this.destroy$),
        distinctUntilChanged((prev, curr) => 
          prev.zoomLevel === curr.zoomLevel && 
          prev.position.x === curr.position.x && 
          prev.position.y === curr.position.y
        )
      )
      .subscribe(zoomState => {
        this.photoZoomChanged.emit(zoomState);
        this.updatePhotoThumbnail();
      });

    // Subscribe to map state changes
    this.mapState$
      .pipe(
        takeUntil(this.destroy$),
        distinctUntilChanged((prev, curr) => 
          prev.zoomLevel === curr.zoomLevel && 
          prev.center.latitude === curr.center.latitude && 
          prev.center.longitude === curr.center.longitude
        )
      )
      .subscribe(mapState => {
        this.mapStateChanged.emit(mapState);
        this.updateMapThumbnail();
      });
  }

  /**
   * Initialize thumbnail generation
   */
  private initializeThumbnails(): void {
    this.updateThumbnailData();
    this.generateThumbnails();
  }

  /**
   * Update thumbnail data based on current state
   */
  private updateThumbnailData(): void {
    this.thumbnailData = {
      view: this.currentInactiveView,
      isActive: false
    };
  }

  /**
   * Generate thumbnails for both views
   */
  private generateThumbnails(): void {
    this.updatePhotoThumbnail();
    this.updateMapThumbnail();
  }

  /**
   * Update photo thumbnail
   */
  private updatePhotoThumbnail(): void {
    if (this.photo?.url) {
      this.thumbnailImageSrc = this.photo.url;
    }
  }

  /**
   * Update map thumbnail (placeholder for now)
   */
  private updateMapThumbnail(): void {
    // For now, use a placeholder. In a real implementation, 
    // this would generate a thumbnail from the current map view
    this.thumbnailMapSrc = 'data:image/svg+xml;base64,' + btoa(`
      <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="#e0e0e0"/>
        <circle cx="50" cy="50" r="20" fill="#4285f4"/>
        <text x="50" y="55" text-anchor="middle" font-family="Arial" font-size="12" fill="white">Map</text>
      </svg>
    `);
  }

  /**
   * Handle toggle button click
   */
  onToggleClick(): void {
    if (!this.canToggleView || this.isTransitioning) {
      return;
    }

    this.performToggle();
  }

  /**
   * Handle thumbnail click
   */
  onThumbnailClick(): void {
    if (!this.canToggleView || this.isTransitioning) {
      return;
    }

    this.performToggle();
  }

  /**
   * Handle touch start on thumbnail for enhanced mobile support
   */
  onThumbnailTouchStart(event: TouchEvent): void {
    if (!this.canToggleView || this.isTransitioning) {
      return;
    }

    event.preventDefault();
    
    const touch = event.touches[0];
    this.touchStartTime = Date.now();
    this.touchStartPosition = { x: touch.clientX, y: touch.clientY };
    
    // Add visual feedback for touch
    const thumbnail = event.currentTarget as HTMLElement;
    thumbnail.classList.add('touch-active');
    
    // Set up long press detection
    this.longPressTimeout = setTimeout(() => {
      this.handleLongPress();
    }, this.LONG_PRESS_DURATION);
  }

  /**
   * Handle touch move on thumbnail
   */
  onThumbnailTouchMove(event: TouchEvent): void {
    if (!this.touchStartTime) return;
    
    const touch = event.touches[0];
    const moveDistance = Math.sqrt(
      Math.pow(touch.clientX - this.touchStartPosition.x, 2) +
      Math.pow(touch.clientY - this.touchStartPosition.y, 2)
    );
    
    // Cancel long press if user moves too far
    if (moveDistance > this.MAX_TOUCH_MOVE_DISTANCE) {
      this.cancelTouchInteraction(event.currentTarget as HTMLElement);
    }
  }

  /**
   * Handle touch end on thumbnail
   */
  onThumbnailTouchEnd(event: TouchEvent): void {
    const thumbnail = event.currentTarget as HTMLElement;
    thumbnail.classList.remove('touch-active');
    
    if (!this.touchStartTime) return;
    
    const touchDuration = Date.now() - this.touchStartTime;
    
    // Clear long press timeout
    if (this.longPressTimeout) {
      clearTimeout(this.longPressTimeout);
      this.longPressTimeout = null;
    }
    
    // Handle as tap if it was a short touch
    if (touchDuration < this.LONG_PRESS_DURATION) {
      this.performToggle();
    }
    
    this.touchStartTime = 0;
  }

  /**
   * Handle long press on thumbnail (could show additional options in future)
   */
  private handleLongPress(): void {
    // For now, just perform the toggle with haptic feedback if available
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    
    this.performToggle();
    this.longPressTimeout = null;
  }

  /**
   * Handle touch cancel on thumbnail
   */
  onThumbnailTouchCancel(event: TouchEvent): void {
    const thumbnail = event.currentTarget as HTMLElement;
    this.cancelTouchInteraction(thumbnail);
  }

  /**
   * Cancel touch interaction
   */
  public cancelTouchInteraction(element: HTMLElement): void {
    element.classList.remove('touch-active');
    
    if (this.longPressTimeout) {
      clearTimeout(this.longPressTimeout);
      this.longPressTimeout = null;
    }
    
    this.touchStartTime = 0;
  }

  /**
   * Perform the actual toggle operation
   */
  private performToggle(): void {
    const operationId = `component-toggle-${Date.now()}`;
    this.performanceMonitor.startTiming(operationId, 'toggle', { 
      currentView: this.currentActiveView,
      transitionDuration: this.transitionDuration 
    });

    this.interfaceToggleService.toggleView(this.transitionDuration)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Toggle operation failed:', error);
          this.performanceMonitor.endTiming(operationId, 'Component Toggle (Error)');
          
          // Attempt graceful recovery
          this.handleToggleError(error);
          throw error;
        })
      )
      .subscribe({
        next: (newActiveView) => {
          // Toggle completed successfully
          this.performanceMonitor.endTiming(operationId, 'Component Toggle (Success)');
          this.generateThumbnails();
        },
        error: (error) => {
          // Error already handled in catchError, but log for completeness
          console.error('Toggle subscription error:', error);
        }
      });
  }

  /**
   * Handle toggle operation errors with graceful recovery
   */
  private handleToggleError(error: any): void {
    console.warn('Attempting to recover from toggle error:', error);
    
    // Reset transition state
    this.isTransitioning = false;
    
    // Ensure UI is in a consistent state
    this.updateThumbnailData();
    this.generateThumbnails();
    
    // Announce error to screen readers
    this.announceToScreenReader('Toggle operation failed. Interface remains in current view.');
  }

  /**
   * Handle keyboard navigation with comprehensive accessibility shortcuts
   */
  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    // Only handle if this component has focus or contains the focused element
    if (!this.elementRef.nativeElement.contains(document.activeElement)) {
      return;
    }

    let handled = false;
    let announcement = '';

    switch (event.key) {
      case 'Tab':
        // Handle Tab key for toggle (with modifier to avoid interfering with normal tab navigation)
        if (event.shiftKey) {
          this.onToggleClick();
          announcement = `Switched to ${this.currentActiveView === 'photo' ? 'map' : 'photo'} view`;
          handled = true;
        }
        break;

      case 't':
      case 'T':
        // Toggle with 't' key
        this.onToggleClick();
        announcement = `Switched to ${this.currentActiveView === 'photo' ? 'map' : 'photo'} view`;
        handled = true;
        break;

      case 'p':
      case 'P':
        // Switch to photo view
        if (this.currentActiveView !== 'photo') {
          this.setActiveView('photo');
          announcement = 'Switched to photo view';
          handled = true;
        } else {
          announcement = 'Already viewing photo';
        }
        break;

      case 'm':
      case 'M':
        // Switch to map view
        if (this.currentActiveView !== 'map') {
          this.setActiveView('map');
          announcement = 'Switched to map view';
          handled = true;
        } else {
          announcement = 'Already viewing map';
        }
        break;

      case 'Enter':
      case ' ':
        // Toggle on Enter or Space when thumbnail is focused
        if (event.target === this.thumbnailContainer?.nativeElement ||
            this.thumbnailContainer?.nativeElement.contains(event.target as Node)) {
          this.onThumbnailClick();
          announcement = `Switched to ${this.currentActiveView === 'photo' ? 'map' : 'photo'} view`;
          handled = true;
        }
        break;

      case 'Escape':
        // Reset interface state
        this.interfaceToggleService.resetInterfaceState();
        announcement = 'Interface reset to default state';
        handled = true;
        break;

      case 'h':
      case 'H':
        // Show keyboard shortcuts help
        if (event.ctrlKey || event.metaKey) {
          this.announceKeyboardShortcuts();
          handled = true;
        }
        break;

      case '?':
        // Show help (without modifier)
        this.announceKeyboardShortcuts();
        handled = true;
        break;

      case 'ArrowLeft':
      case 'ArrowRight':
        // Navigate between views with arrow keys
        if (event.altKey) {
          this.onToggleClick();
          announcement = `Switched to ${this.currentActiveView === 'photo' ? 'map' : 'photo'} view`;
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
   * Announce keyboard shortcuts to screen readers
   */
  private announceKeyboardShortcuts(): void {
    const shortcuts = [
      'Keyboard shortcuts:',
      'T - Toggle between photo and map views',
      'P - Switch to photo view',
      'M - Switch to map view',
      'Alt + Arrow keys - Navigate between views',
      'Escape - Reset interface',
      'Question mark - Show this help'
    ].join('. ');
    
    this.announceToScreenReader(shortcuts);
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
      document.body.removeChild(announcement);
    }, 1000);
  }

  /**
   * Set active view directly
   */
  private setActiveView(view: ActiveView): void {
    if (!this.canToggleView || this.isTransitioning) {
      return;
    }

    this.interfaceToggleService.setActiveView(view, this.transitionDuration)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.generateThumbnails();
      });
  }

  /**
   * Get CSS classes for main container (cached to avoid change detection issues)
   */
  getMainContainerClasses(): string[] {
    if (this._needsClassUpdate) {
      this._mainContainerClasses = ['photo-map-toggle-container'];
      
      if (this.isTransitioning) {
        this._mainContainerClasses.push('transitioning');
      }
      
      this._mainContainerClasses.push(`active-${this.currentActiveView}`);
      
      // Add mobile-specific classes
      if (this.isMobileDevice) {
        this._mainContainerClasses.push('mobile-device');
      }
    }
    
    return this._mainContainerClasses;
  }

  /**
   * Get CSS classes for active view (cached to avoid change detection issues)
   */
  getActiveViewClasses(): string[] {
    if (this._needsClassUpdate) {
      this._activeViewClasses = ['active-view'];
      
      if (this.isTransitioning) {
        this._activeViewClasses.push('transitioning');
      }
    }
    
    return this._activeViewClasses;
  }

  /**
   * Get CSS classes for thumbnail (cached to avoid change detection issues)
   */
  getThumbnailClasses(): string[] {
    if (this._needsClassUpdate) {
      this._thumbnailClasses = ['thumbnail-container'];
      
      if (this.thumbnailData) {
        this._thumbnailClasses.push(`thumbnail-${this.thumbnailData.view}`);
      }
      
      if (this.isTransitioning) {
        this._thumbnailClasses.push('transitioning');
      }
      
      // Add mobile-specific classes
      if (this.isMobileDevice) {
        this._thumbnailClasses.push('mobile-thumbnail');
      }
      
      this._needsClassUpdate = false;
    }
    
    return this._thumbnailClasses;
  }

  /**
   * Get thumbnail image source (cached to avoid change detection issues)
   */
  getThumbnailImageSrc(): string | null {
    if (this._needsClassUpdate || this._thumbnailImageSrc === null) {
      if (!this.thumbnailData) {
        this._thumbnailImageSrc = null;
      } else {
        this._thumbnailImageSrc = this.thumbnailData.view === 'photo' ? this.thumbnailImageSrc : this.thumbnailMapSrc;
      }
    }

    return this._thumbnailImageSrc;
  }

  /**
   * Get thumbnail alt text (cached to avoid change detection issues)
   */
  getThumbnailAltText(): string {
    if (this._needsAriaUpdate) {
      if (!this.thumbnailData) {
        this._thumbnailAltText = 'Thumbnail';
      } else {
        const viewName = this.thumbnailData.view === 'photo' ? 'photograph' : 'map';
        this._thumbnailAltText = `Switch to ${viewName} view`;
      }
    }

    return this._thumbnailAltText;
  }

  /**
   * Get thumbnail aria label (cached to avoid change detection issues)
   */
  getThumbnailAriaLabel(): string {
    if (this._needsAriaUpdate) {
      if (!this.thumbnailData) {
        this._thumbnailAriaLabel = 'Toggle view';
      } else {
        const viewName = this.thumbnailData.view === 'photo' ? 'photograph' : 'map';
        const currentViewName = this.currentActiveView === 'photo' ? 'photograph' : 'map';
        
        this._thumbnailAriaLabel = `Currently viewing ${currentViewName}. Click to switch to ${viewName} view.`;
      }
    }
    
    return this._thumbnailAriaLabel;
  }

  /**
   * Get main container aria label (cached to avoid change detection issues)
   */
  getMainContainerAriaLabel(): string {
    if (this._needsAriaUpdate) {
      const viewName = this.currentActiveView === 'photo' ? 'photograph' : 'map';
      this._mainContainerAriaLabel = `${viewName} view container. Press T to toggle views, P for photo, M for map.`;
      this._needsAriaUpdate = false;
    }
    
    return this._mainContainerAriaLabel;
  }

  /**
   * Get photo description for screen readers (cached to avoid change detection issues)
   */
  getPhotoDescription(): string {
    if (this._needsAriaUpdate || this._photoDescription === '') {
      if (!this.photo) {
        this._photoDescription = 'No photograph available';
      } else {
        let description = this.photo.title || 'Historical photograph';
        if (this.photo.year) {
          description += ` from ${this.photo.year}`;
        }
        if (this.photo.description) {
          description += `. ${this.photo.description}`;
        }
        this._photoDescription = description;
      }
    }
    
    return this._photoDescription;
  }

  /**
   * Check if photo is currently active
   */
  get isPhotoActive(): boolean {
    return this.currentActiveView === 'photo';
  }

  /**
   * Check if map is currently active
   */
  get isMapActive(): boolean {
    return this.currentActiveView === 'map';
  }

  /**
   * Get current transition duration for CSS
   */
  get transitionDurationMs(): string {
    return `${this.transitionDuration}ms`;
  }

  /**
   * Check if component can handle toggle operations
   */
  get canPerformToggle(): boolean {
    return this.canToggleView && !this.isTransitioning;
  }

  /**
   * Get responsive thumbnail size based on screen size
   */
  getResponsiveThumbnailSize(): { width: number; height: number } {
    const screenWidth = window.innerWidth;
    
    if (screenWidth <= 360) {
      return { width: 75, height: 50 };
    } else if (screenWidth <= 480) {
      return { width: 85, height: 57 };
    } else if (screenWidth <= 768) {
      return { width: 100, height: 66 };
    } else if (screenWidth <= 1024) {
      return { width: 110, height: 73 };
    } else {
      return { width: 120, height: 80 };
    }
  }

  /**
   * Check if device supports touch
   */
  get isTouchDevice(): boolean {
    return this.isMobileDevice;
  }

  /**
   * Get appropriate transition duration based on device capabilities
   */
  get adaptiveTransitionDuration(): number {
    // Slightly faster transitions on mobile for better perceived performance
    return this.isMobileDevice ? Math.max(200, this.transitionDuration - 100) : this.transitionDuration;
  }

  /**
   * Validate photo input data (Task 1 requirement)
   * Requirements: 1.1, 1.3, 3.1, 4.1, 4.2
   */
  private validatePhotoInput(photo: Photo): boolean {
    if (!photo) {
      console.error('[PhotoMapToggleComponent] Photo validation failed: photo is null/undefined');
      return false;
    }

    const validationErrors: string[] = [];

    // Check required fields for photo display
    if (!photo.id) {
      validationErrors.push('Missing photo ID');
    }
    if (!photo.url) {
      validationErrors.push('Missing photo URL');
    }
    if (!photo.year) {
      validationErrors.push('Missing photo year');
    }
    if (!photo.coordinates) {
      validationErrors.push('Missing photo coordinates');
    }

    if (validationErrors.length > 0) {
      console.error('[PhotoMapToggleComponent] Photo validation failed:', {
        photoId: photo.id,
        errors: validationErrors,
        photo
      });
      return false;
    }

    console.log('[PhotoMapToggleComponent] Photo validation passed:', photo.id);
    return true;
  }

  /**
   * Handle fallback coordinates change from error boundary
   * Requirements: 4.5 - Fallback UI for when components fail to load
   */
  onFallbackCoordinatesChanged(coordinates: {latitude: number, longitude: number}): void {
    // Update the current guess with fallback coordinates
    this.store.dispatch(setCurrentGuess({ 
      guess: { 
        year: new Date().getFullYear(), // Default year
        coordinates 
      } 
    }));
    
    console.log('Fallback coordinates updated:', coordinates);
  }
}