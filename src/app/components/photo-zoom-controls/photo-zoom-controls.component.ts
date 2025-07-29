import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { PhotoZoomService, PhotoZoomState } from '../../services/photo-zoom.service';

/**
 * Component for photo zoom controls (zoom in, zoom out, reset)
 * Provides accessible zoom controls with keyboard support
 */
@Component({
  selector: 'app-photo-zoom-controls',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="zoom-controls" 
         role="toolbar" 
         aria-label="Photo zoom controls"
         [class.disabled]="disabled"
         [attr.aria-describedby]="'zoom-help-' + componentId">
      
      <button 
        type="button"
        class="zoom-btn zoom-in"
        [disabled]="disabled || !canZoomIn"
        (click)="onZoomIn()"
        (keydown.plus)="onZoomIn()"
        (keydown.equal)="onZoomIn()"
        [attr.aria-label]="getZoomInAriaLabel()"
        [attr.aria-describedby]="'zoom-in-help-' + componentId"
        title="Zoom in (+ key)">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          <path d="M12 10h-2v2H9v-2H7V9h2V7h1v2h2v1z"/>
        </svg>
        <span class="sr-only">Zoom in</span>
      </button>

      <button 
        type="button"
        class="zoom-btn zoom-out"
        [disabled]="disabled || !canZoomOut"
        (click)="onZoomOut()"
        (keydown.minus)="onZoomOut()"
        [attr.aria-label]="getZoomOutAriaLabel()"
        [attr.aria-describedby]="'zoom-out-help-' + componentId"
        title="Zoom out (- key)">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          <path d="M7 9v1h5V9H7z"/>
        </svg>
        <span class="sr-only">Zoom out</span>
      </button>

      <button 
        type="button"
        class="zoom-btn zoom-reset"
        [disabled]="disabled || currentZoomLevel === 1"
        (click)="onReset()"
        (keydown.0)="onReset()"
        [attr.aria-label]="getResetAriaLabel()"
        [attr.aria-describedby]="'zoom-reset-help-' + componentId"
        title="Reset zoom (0 key)">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        <span class="sr-only">Reset zoom</span>
      </button>

      <div class="zoom-level-indicator" 
           [attr.id]="'zoom-level-' + componentId"
           aria-live="polite" 
           aria-atomic="true"
           [attr.aria-label]="'Current zoom level: ' + currentZoomLevel + 'x'">
        {{ currentZoomLevel }}x
      </div>

      <!-- Hidden help text for screen readers -->
      <div [attr.id]="'zoom-help-' + componentId" class="sr-only">
        Use plus and minus keys to zoom, or 0 to reset. Current zoom level is {{ currentZoomLevel }}x.
      </div>
      
      <div [attr.id]="'zoom-in-help-' + componentId" class="sr-only">
        Increase zoom level. Press plus or equals key.
      </div>
      
      <div [attr.id]="'zoom-out-help-' + componentId" class="sr-only">
        Decrease zoom level. Press minus key.
      </div>
      
      <div [attr.id]="'zoom-reset-help-' + componentId" class="sr-only">
        Reset zoom to original size. Press 0 key.
      </div>

      <!-- Zoom status announcements -->
      <div class="sr-only" aria-live="assertive" aria-atomic="true">
        <span *ngIf="zoomChangeAnnouncement">{{ zoomChangeAnnouncement }}</span>
      </div>
    </div>
  `,
  styleUrls: ['./photo-zoom-controls.component.scss']
})
export class PhotoZoomControlsComponent implements OnInit, OnDestroy {
  @Input() disabled = false;
  @Output() zoomIn = new EventEmitter<void>();
  @Output() zoomOut = new EventEmitter<void>();
  @Output() reset = new EventEmitter<void>();

  currentZoomLevel = 1;
  canZoomIn = true;
  canZoomOut = false;
  componentId = Math.random().toString(36).substr(2, 9); // Unique ID for ARIA references
  zoomChangeAnnouncement = '';

  private subscriptions = new Subscription();
  private announcementTimeout: any;

  constructor(private photoZoomService: PhotoZoomService) {}

  ngOnInit(): void {
    // Subscribe to zoom state changes
    this.subscriptions.add(
      this.photoZoomService.zoomState$.subscribe((state: PhotoZoomState) => {
        this.currentZoomLevel = Math.round(state.zoomLevel * 10) / 10; // Round to 1 decimal
        this.canZoomIn = this.photoZoomService.canZoomIn();
        this.canZoomOut = this.photoZoomService.canZoomOut();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    if (this.announcementTimeout) {
      clearTimeout(this.announcementTimeout);
    }
  }

  onZoomIn(): void {
    if (!this.disabled && this.canZoomIn) {
      this.photoZoomService.zoomIn();
      this.zoomIn.emit();
      this.announceZoomChange(`Zoomed in to ${this.currentZoomLevel}x`);
    }
  }

  onZoomOut(): void {
    if (!this.disabled && this.canZoomOut) {
      this.photoZoomService.zoomOut();
      this.zoomOut.emit();
      this.announceZoomChange(`Zoomed out to ${this.currentZoomLevel}x`);
    }
  }

  onReset(): void {
    if (!this.disabled) {
      this.photoZoomService.reset();
      this.reset.emit();
      this.announceZoomChange('Zoom reset to original size');
    }
  }

  /**
   * Handle keyboard shortcuts for zoom controls
   */
  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (this.disabled) return;

    let handled = false;

    switch (event.key) {
      case '+':
      case '=':
        if (this.canZoomIn) {
          this.onZoomIn();
          handled = true;
        }
        break;
      case '-':
        if (this.canZoomOut) {
          this.onZoomOut();
          handled = true;
        }
        break;
      case '0':
        if (this.currentZoomLevel !== 1) {
          this.onReset();
          handled = true;
        }
        break;
    }

    if (handled) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  /**
   * Get accessible aria label for zoom in button
   */
  getZoomInAriaLabel(): string {
    if (!this.canZoomIn) {
      return `Zoom in unavailable. Maximum zoom level reached at ${this.currentZoomLevel}x`;
    }
    return `Zoom in from ${this.currentZoomLevel}x. Press plus key or click to zoom in.`;
  }

  /**
   * Get accessible aria label for zoom out button
   */
  getZoomOutAriaLabel(): string {
    if (!this.canZoomOut) {
      return `Zoom out unavailable. Already at minimum zoom level of ${this.currentZoomLevel}x`;
    }
    return `Zoom out from ${this.currentZoomLevel}x. Press minus key or click to zoom out.`;
  }

  /**
   * Get accessible aria label for reset button
   */
  getResetAriaLabel(): string {
    if (this.currentZoomLevel === 1) {
      return 'Reset zoom unavailable. Already at original size.';
    }
    return `Reset zoom from ${this.currentZoomLevel}x to original size. Press 0 key or click to reset.`;
  }

  /**
   * Announce zoom changes to screen readers
   */
  private announceZoomChange(message: string): void {
    this.zoomChangeAnnouncement = message;
    
    // Clear previous timeout
    if (this.announcementTimeout) {
      clearTimeout(this.announcementTimeout);
    }
    
    // Clear announcement after a short delay
    this.announcementTimeout = setTimeout(() => {
      this.zoomChangeAnnouncement = '';
    }, 1500);
  }
}