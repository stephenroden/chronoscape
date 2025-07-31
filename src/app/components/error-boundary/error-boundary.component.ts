import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ErrorHandler, Injectable } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';

/**
 * Enhanced error boundary component for comprehensive error handling and loading states
 * Provides fallback UI, error recovery mechanisms, and loading state management
 * Requirements: 4.4, 4.5 - Error boundaries and fallback UI
 */
@Component({
  selector: 'app-error-boundary',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="error-boundary" 
         [class.has-error]="hasError"
         [class.is-loading]="isLoading"
         [class.has-fallback]="showFallback">
      
      <!-- Loading state -->
      <div *ngIf="isLoading && !hasError" 
           class="loading-state"
           role="status"
           aria-live="polite"
           [attr.aria-label]="'Loading ' + componentName">
        <div class="loading-content">
          <div class="loading-spinner" aria-hidden="true"></div>
          <p class="loading-text">{{ getLoadingMessage() }}</p>
          <div class="loading-progress" *ngIf="loadingProgress > 0">
            <div class="progress-bar">
              <div class="progress-fill" [style.width.%]="loadingProgress"></div>
            </div>
            <span class="progress-text">{{ loadingProgress }}%</span>
          </div>
        </div>
      </div>

      <!-- Normal content (when no error and not loading) -->
      <ng-container *ngIf="!hasError && !isLoading && !showFallback">
        <ng-content></ng-content>
      </ng-container>
      
      <!-- Error state -->
      <div *ngIf="hasError && !showFallback" 
           class="error-fallback" 
           role="alert" 
           aria-live="assertive"
           [attr.aria-label]="'Error in ' + componentName + ': ' + errorMessage">
        
        <div class="error-icon" aria-hidden="true">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z" opacity="0.3"/>
            <path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z"/>
          </svg>
        </div>
        
        <div class="error-content">
          <h3 class="error-title">{{ getErrorTitle() }}</h3>
          <p class="error-message">{{ getErrorMessage() }}</p>
          
          <div class="error-actions">
            <button 
              type="button" 
              class="btn btn-primary"
              (click)="retry()"
              [disabled]="isRetrying || !canRetry"
              [attr.aria-label]="'Retry ' + componentName">
              <span *ngIf="!isRetrying">Try Again</span>
              <span *ngIf="isRetrying">Retrying...</span>
            </button>
            
            <button 
              type="button" 
              class="btn btn-secondary"
              (click)="fallbackToBasic()"
              *ngIf="canFallback"
              [attr.aria-label]="'Use basic version of ' + componentName">
              Use Basic Version
            </button>
            
            <button 
              type="button" 
              class="btn btn-link"
              (click)="showDetails = !showDetails"
              [attr.aria-expanded]="showDetails"
              aria-controls="error-details">
              {{ showDetails ? 'Hide' : 'Show' }} Details
            </button>
          </div>
          
          <div class="retry-info" *ngIf="retryCount > 0">
            <p class="retry-count">Retry attempts: {{ retryCount }}/{{ maxRetries }}</p>
          </div>
          
          <div 
            id="error-details" 
            class="error-details" 
            *ngIf="showDetails"
            [attr.aria-hidden]="!showDetails">
            <h4>Technical Details</h4>
            <pre>{{ errorDetails }}</pre>
            <p class="error-timestamp">
              Error occurred at: {{ errorTimestamp | date:'medium' }}
            </p>
            <div class="error-context" *ngIf="errorContext">
              <h5>Context</h5>
              <p>{{ errorContext }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Fallback UI -->
      <div *ngIf="showFallback" 
           class="fallback-ui"
           role="region"
           [attr.aria-label]="'Basic version of ' + componentName">
        <div class="fallback-content">
          <div class="fallback-header">
            <h3>Basic {{ componentName }}</h3>
            <p>Enhanced features are temporarily unavailable</p>
          </div>
          
          <!-- Basic photo fallback -->
          <div *ngIf="componentName === 'Photo Display' && fallbackData?.photo" class="basic-photo">
            <img [src]="fallbackData.photo.url" 
                 [alt]="fallbackData.photo.title"
                 class="basic-photo-image"
                 (error)="onFallbackImageError()"
                 (load)="onFallbackImageLoad()">
            <div class="basic-photo-info">
              <h4>{{ fallbackData.photo.title }}</h4>
              <p>Year: {{ fallbackData.photo.year }}</p>
            </div>
          </div>
          
          <!-- Basic map fallback -->
          <div *ngIf="componentName === 'Map Display'" class="basic-map">
            <div class="basic-map-placeholder">
              <div class="map-icon">🗺️</div>
              <p>Interactive map temporarily unavailable</p>
              <p>Please use the coordinate input below:</p>
              <div class="coordinate-input">
                <label for="lat-input">Latitude:</label>
                <input id="lat-input" type="number" 
                       [(ngModel)]="fallbackCoordinates.latitude"
                       min="-90" max="90" step="0.0001"
                       (change)="onFallbackCoordinatesChange()">
                <label for="lng-input">Longitude:</label>
                <input id="lng-input" type="number" 
                       [(ngModel)]="fallbackCoordinates.longitude"
                       min="-180" max="180" step="0.0001"
                       (change)="onFallbackCoordinatesChange()">
              </div>
            </div>
          </div>
          
          <div class="fallback-actions">
            <button 
              type="button" 
              class="btn btn-primary"
              (click)="retryEnhanced()"
              [disabled]="isRetrying">
              Try Enhanced Version Again
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./error-boundary.component.scss']
})
export class ErrorBoundaryComponent implements OnInit, OnDestroy {
  @Input() componentName = 'Component';
  @Input() fallbackComponent?: any;
  @Input() enableRetry = true;
  @Input() enableFallback = true;
  @Input() maxRetries = 3;
  @Input() retryDelay = 1000;
  @Input() fallbackData?: any; // Data for fallback UI (photo, coordinates, etc.)
  @Input() isLoading = false; // External loading state
  @Input() loadingProgress = 0; // Loading progress (0-100)

  hasError = false;
  errorMessage = '';
  errorDetails = '';
  errorContext = '';
  errorTimestamp?: Date;
  showDetails = false;
  isRetrying = false;
  retryCount = 0;
  showFallback = false;
  fallbackCoordinates = { latitude: 0, longitude: 0 };

  @Output() retryRequested = new EventEmitter<void>();
  @Output() fallbackActivated = new EventEmitter<void>();
  @Output() fallbackCoordinatesChanged = new EventEmitter<{latitude: number, longitude: number}>();

  private destroy$ = new Subject<void>();
  private retryTimeout?: any;

  ngOnInit(): void {
    // Set up global error handler for this component's children
    this.setupErrorHandling();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  /**
   * Handle error from child components
   */
  handleError(error: Error, context?: string): void {
    console.error(`Error in ${this.componentName}:`, error);
    
    this.hasError = true;
    this.errorMessage = error.message || 'An unexpected error occurred';
    this.errorDetails = this.formatErrorDetails(error, context);
    this.errorTimestamp = new Date();
    
    // Report error to monitoring service if available
    this.reportError(error, context);
  }

  /**
   * Retry the failed operation
   */
  retry(): void {
    if (!this.enableRetry || this.retryCount >= this.maxRetries) {
      return;
    }

    this.isRetrying = true;
    this.retryCount++;

    this.retryTimeout = setTimeout(() => {
      this.hasError = false;
      this.isRetrying = false;
      this.errorMessage = '';
      this.errorDetails = '';
      this.showDetails = false;
    }, this.retryDelay);
  }

  /**
   * Fall back to basic version of component
   */
  fallbackToBasic(): void {
    if (!this.enableFallback) {
      return;
    }

    this.showFallback = true;
    this.hasError = false;
    this.fallbackActivated.emit();
    
    console.log(`Falling back to basic version of ${this.componentName}`);
  }

  /**
   * Retry enhanced version from fallback
   */
  retryEnhanced(): void {
    this.showFallback = false;
    this.hasError = false;
    this.retry();
  }

  /**
   * Handle fallback image error
   */
  onFallbackImageError(): void {
    console.error('Fallback image failed to load');
  }

  /**
   * Handle fallback image load success
   */
  onFallbackImageLoad(): void {
    console.log('Fallback image loaded successfully');
  }

  /**
   * Handle fallback coordinates change
   */
  onFallbackCoordinatesChange(): void {
    this.fallbackCoordinatesChanged.emit(this.fallbackCoordinates);
  }

  /**
   * Get loading message based on component type
   */
  getLoadingMessage(): string {
    switch (this.componentName) {
      case 'Photo Display':
        return 'Loading photograph...';
      case 'Map Display':
        return 'Loading interactive map...';
      default:
        return `Loading ${this.componentName}...`;
    }
  }

  /**
   * Get user-friendly error title
   */
  getErrorTitle(): string {
    return `${this.componentName} Unavailable`;
  }

  /**
   * Get user-friendly error message
   */
  getErrorMessage(): string {
    if (this.errorMessage.includes('network') || this.errorMessage.includes('fetch')) {
      return 'Unable to load content. Please check your internet connection.';
    }
    
    if (this.errorMessage.includes('permission') || this.errorMessage.includes('access')) {
      return 'Access denied. Some features may not be available.';
    }
    
    if (this.errorMessage.includes('timeout')) {
      return 'The operation took too long. Please try again.';
    }
    
    return 'Something went wrong. Please try again or use the basic version.';
  }

  /**
   * Format error details for display
   */
  private formatErrorDetails(error: Error, context?: string): string {
    const details = [];
    
    if (context) {
      details.push(`Context: ${context}`);
    }
    
    details.push(`Error: ${error.name}`);
    details.push(`Message: ${error.message}`);
    
    if (error.stack) {
      details.push(`Stack: ${error.stack}`);
    }
    
    details.push(`User Agent: ${navigator.userAgent}`);
    details.push(`URL: ${window.location.href}`);
    
    return details.join('\n');
  }

  /**
   * Report error to monitoring service
   */
  private reportError(error: Error, context?: string): void {
    // In a real application, this would send to error monitoring service
    const errorReport = {
      component: this.componentName,
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    console.warn('Error Report:', errorReport);
    
    // Could send to service like Sentry, LogRocket, etc.
    // this.errorReportingService.reportError(errorReport);
  }

  /**
   * Set up error handling for child components
   */
  private setupErrorHandling(): void {
    // This would typically be handled by Angular's ErrorHandler
    // or by wrapping child components in try-catch blocks
  }

  /**
   * Check if retry is available
   */
  get canRetry(): boolean {
    return this.enableRetry && this.retryCount < this.maxRetries && !this.isRetrying;
  }

  /**
   * Check if fallback is available
   */
  get canFallback(): boolean {
    return this.enableFallback && !!this.fallbackComponent;
  }
}

/**
 * Global error handler for enhanced interface components
 */
@Injectable()
export class EnhancedInterfaceErrorHandler implements ErrorHandler {
  handleError(error: any): void {
    console.error('Enhanced Interface Error:', error);
    
    // Check if error is from enhanced interface components
    if (this.isEnhancedInterfaceError(error)) {
      this.handleEnhancedInterfaceError(error);
    } else {
      // Let default error handler deal with other errors
      throw error;
    }
  }

  private isEnhancedInterfaceError(error: any): boolean {
    const enhancedComponents = [
      'PhotoMapToggleComponent',
      'PhotoZoomControlsComponent',
      'PhotoZoomService',
      'InterfaceToggleService'
    ];
    
    const errorString = error.toString();
    return enhancedComponents.some(component => errorString.includes(component));
  }

  private handleEnhancedInterfaceError(error: any): void {
    // Graceful degradation for enhanced interface errors
    console.warn('Enhanced interface feature failed, falling back to basic functionality');
    
    // Could dispatch action to disable enhanced features
    // this.store.dispatch(InterfaceActions.disableEnhancedFeatures());
  }
}