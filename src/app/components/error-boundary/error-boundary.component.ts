import { Component, Input, OnInit, OnDestroy, ErrorHandler, Injectable } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';

/**
 * Error boundary component for graceful error handling in enhanced interface components
 * Provides fallback UI and error recovery mechanisms
 */
@Component({
  selector: 'app-error-boundary',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="error-boundary" [class.has-error]="hasError">
      <ng-container *ngIf="!hasError; else errorTemplate">
        <ng-content></ng-content>
      </ng-container>
      
      <ng-template #errorTemplate>
        <div class="error-fallback" 
             role="alert" 
             aria-live="assertive"
             [attr.aria-label]="'Error in ' + componentName + ': ' + errorMessage">
          
          <div class="error-icon" aria-hidden="true">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
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
                [disabled]="isRetrying"
                [attr.aria-label]="'Retry ' + componentName">
                <span *ngIf="!isRetrying">Try Again</span>
                <span *ngIf="isRetrying">Retrying...</span>
              </button>
              
              <button 
                type="button" 
                class="btn btn-secondary"
                (click)="fallbackToBasic()"
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
            </div>
          </div>
        </div>
      </ng-template>
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

  hasError = false;
  errorMessage = '';
  errorDetails = '';
  errorTimestamp?: Date;
  showDetails = false;
  isRetrying = false;
  retryCount = 0;

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

    // Emit event to parent to switch to basic version
    // This would be handled by the parent component
    this.hasError = false;
    
    // Could dispatch action to store to disable enhanced features
    console.log(`Falling back to basic version of ${this.componentName}`);
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