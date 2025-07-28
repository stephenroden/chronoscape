import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, HostListener, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { Observable, Subject, combineLatest } from 'rxjs';
import { takeUntil, map, distinctUntilChanged } from 'rxjs/operators';

import { AppState } from '../../state/app.state';
import { InterfaceToggleService } from '../../services/interface-toggle.service';
import { PhotoDisplayComponent } from '../photo-display/photo-display.component';
import { MapGuessComponent } from '../map-guess/map-guess.component';
import { Photo } from '../../models/photo.model';
import { ActiveView, PhotoZoomState, MapState } from '../../models/interface-state.model';
import { Coordinates } from '../../models/coordinates.model';

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
  imports: [CommonModule, PhotoDisplayComponent, MapGuessComponent],
  templateUrl: './photo-map-toggle.component.html',
  styleUrls: ['./photo-map-toggle.component.scss']
})
export class PhotoMapToggleComponent implements OnInit, OnDestroy {
  @Input() photo: Photo | null = null;
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

  // Component state
  currentActiveView: ActiveView = 'photo';
  currentInactiveView: ActiveView = 'map';
  isTransitioning = false;
  canToggleView = true;

  // Thumbnail state
  thumbnailData: { view: ActiveView; isActive: boolean } | null = null;
  thumbnailImageSrc: string | null = null;
  thumbnailMapSrc: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private store: Store<AppState>,
    private interfaceToggleService: InterfaceToggleService,
    private elementRef: ElementRef
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
  }

  ngOnInit(): void {
    this.setupSubscriptions();
    this.initializeThumbnails();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
        this.viewToggled.emit(activeView);
      });

    // Subscribe to transition state
    this.transitionInProgress$
      .pipe(takeUntil(this.destroy$))
      .subscribe(inProgress => {
        this.isTransitioning = inProgress;
      });

    // Subscribe to toggle capability
    this.canToggle$
      .pipe(takeUntil(this.destroy$))
      .subscribe(canToggle => {
        this.canToggleView = canToggle;
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
   * Perform the actual toggle operation
   */
  private performToggle(): void {
    this.interfaceToggleService.toggleView(this.transitionDuration)
      .pipe(takeUntil(this.destroy$))
      .subscribe(newActiveView => {
        // Toggle completed
        this.generateThumbnails();
      });
  }

  /**
   * Handle keyboard navigation
   */
  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    // Only handle if this component has focus or contains the focused element
    if (!this.elementRef.nativeElement.contains(document.activeElement)) {
      return;
    }

    let handled = false;

    switch (event.key) {
      case 'Tab':
        // Handle Tab key for toggle (with modifier to avoid interfering with normal tab navigation)
        if (event.shiftKey) {
          this.onToggleClick();
          handled = true;
        }
        break;

      case 't':
      case 'T':
        // Toggle with 't' key
        this.onToggleClick();
        handled = true;
        break;

      case 'p':
      case 'P':
        // Switch to photo view
        if (this.currentActiveView !== 'photo') {
          this.setActiveView('photo');
          handled = true;
        }
        break;

      case 'm':
      case 'M':
        // Switch to map view
        if (this.currentActiveView !== 'map') {
          this.setActiveView('map');
          handled = true;
        }
        break;

      case 'Enter':
      case ' ':
        // Toggle on Enter or Space when thumbnail is focused
        if (event.target === this.thumbnailContainer?.nativeElement ||
            this.thumbnailContainer?.nativeElement.contains(event.target as Node)) {
          this.onThumbnailClick();
          handled = true;
        }
        break;

      case 'Escape':
        // Reset interface state
        this.interfaceToggleService.resetInterfaceState();
        handled = true;
        break;
    }

    if (handled) {
      event.preventDefault();
      event.stopPropagation();
    }
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
   * Get CSS classes for main container
   */
  getMainContainerClasses(): string[] {
    const classes = ['photo-map-toggle-container'];
    
    if (this.isTransitioning) {
      classes.push('transitioning');
    }
    
    classes.push(`active-${this.currentActiveView}`);
    
    return classes;
  }

  /**
   * Get CSS classes for active view
   */
  getActiveViewClasses(): string[] {
    const classes = ['active-view'];
    
    if (this.isTransitioning) {
      classes.push('transitioning');
    }
    
    return classes;
  }

  /**
   * Get CSS classes for thumbnail
   */
  getThumbnailClasses(): string[] {
    const classes = ['thumbnail-container'];
    
    if (this.thumbnailData) {
      classes.push(`thumbnail-${this.thumbnailData.view}`);
    }
    
    if (this.isTransitioning) {
      classes.push('transitioning');
    }
    
    return classes;
  }

  /**
   * Get thumbnail image source
   */
  getThumbnailImageSrc(): string | null {
    if (!this.thumbnailData) {
      return null;
    }

    return this.thumbnailData.view === 'photo' ? this.thumbnailImageSrc : this.thumbnailMapSrc;
  }

  /**
   * Get thumbnail alt text
   */
  getThumbnailAltText(): string {
    if (!this.thumbnailData) {
      return 'Thumbnail';
    }

    const viewName = this.thumbnailData.view === 'photo' ? 'photograph' : 'map';
    return `Switch to ${viewName} view`;
  }

  /**
   * Get thumbnail aria label
   */
  getThumbnailAriaLabel(): string {
    if (!this.thumbnailData) {
      return 'Toggle view';
    }

    const viewName = this.thumbnailData.view === 'photo' ? 'photograph' : 'map';
    const currentViewName = this.currentActiveView === 'photo' ? 'photograph' : 'map';
    
    return `Currently viewing ${currentViewName}. Click to switch to ${viewName} view.`;
  }

  /**
   * Get main container aria label
   */
  getMainContainerAriaLabel(): string {
    const viewName = this.currentActiveView === 'photo' ? 'photograph' : 'map';
    return `${viewName} view container. Press T to toggle views, P for photo, M for map.`;
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
}