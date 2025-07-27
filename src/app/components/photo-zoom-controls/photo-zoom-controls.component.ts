import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
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
         [class.disabled]="disabled">
      
      <button 
        type="button"
        class="zoom-btn zoom-in"
        [disabled]="disabled || !canZoomIn"
        (click)="onZoomIn()"
        [attr.aria-label]="'Zoom in (current level: ' + currentZoomLevel + 'x)'"
        title="Zoom in">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
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
        [attr.aria-label]="'Zoom out (current level: ' + currentZoomLevel + 'x)'"
        title="Zoom out">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
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
        [attr.aria-label]="'Reset zoom to original size (current level: ' + currentZoomLevel + 'x)'"
        title="Reset zoom">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        <span class="sr-only">Reset zoom</span>
      </button>

      <div class="zoom-level-indicator" 
           aria-live="polite" 
           aria-label="Current zoom level">
        {{ currentZoomLevel }}x
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

  private subscriptions = new Subscription();

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
  }

  onZoomIn(): void {
    if (!this.disabled && this.canZoomIn) {
      this.photoZoomService.zoomIn();
      this.zoomIn.emit();
    }
  }

  onZoomOut(): void {
    if (!this.disabled && this.canZoomOut) {
      this.photoZoomService.zoomOut();
      this.zoomOut.emit();
    }
  }

  onReset(): void {
    if (!this.disabled) {
      this.photoZoomService.reset();
      this.reset.emit();
    }
  }
}