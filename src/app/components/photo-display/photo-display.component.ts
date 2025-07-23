import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { Observable, Subscription } from 'rxjs';
import { Photo } from '../../models/photo.model';
import { AppState } from '../../state/app.state';
import * as PhotosSelectors from '../../state/photos/photos.selectors';

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
  imports: [CommonModule],
  templateUrl: './photo-display.component.html',
  styleUrls: ['./photo-display.component.scss']
})
export class PhotoDisplayComponent implements OnInit, OnDestroy {
  @Input() photo: Photo | null = null;
  @Input() showMetadata: boolean = false; // For testing purposes, normally false during game

  // Component state
  imageLoaded = false;
  imageError = false;
  imageLoading = true;

  // Store observables
  currentPhoto$: Observable<Photo | null>;
  photosLoading$: Observable<boolean>;
  photosError$: Observable<string | null>;

  private subscriptions = new Subscription();

  constructor(private store: Store<AppState>) {
    this.currentPhoto$ = this.store.select(PhotosSelectors.selectCurrentPhoto);
    this.photosLoading$ = this.store.select(PhotosSelectors.selectPhotosLoading);
    this.photosError$ = this.store.select(PhotosSelectors.selectPhotosError);
  }

  ngOnInit(): void {
    // Subscribe to current photo changes
    this.subscriptions.add(
      this.currentPhoto$.subscribe(photo => {
        if (photo !== this.photo) {
          this.photo = photo;
          if (photo) {
            this.resetImageState();
          }
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
      // Force image reload by adding timestamp to URL
      const img = new Image();
      img.onload = () => this.onImageLoad();
      img.onerror = () => this.onImageError();
      img.src = `${this.photo.url}?retry=${Date.now()}`;
    }
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
}