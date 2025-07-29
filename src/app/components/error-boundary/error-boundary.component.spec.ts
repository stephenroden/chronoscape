import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ErrorBoundaryComponent } from './error-boundary.component';

// Test component that can throw errors
@Component({
  template: `<div>Test Content</div>`
})
class TestComponent {
  shouldThrowError = false;
  
  ngOnInit() {
    if (this.shouldThrowError) {
      throw new Error('Test error');
    }
  }
}

// Host component for testing
@Component({
  template: `
    <app-error-boundary 
      [componentName]="componentName"
      [enableRetry]="enableRetry"
      [enableFallback]="enableFallback"
      [maxRetries]="maxRetries">
      <div class="test-content">Test Content</div>
    </app-error-boundary>
  `
})
class HostComponent {
  componentName = 'Test Component';
  enableRetry = true;
  enableFallback = true;
  maxRetries = 3;
}

describe('ErrorBoundaryComponent', () => {
  let component: ErrorBoundaryComponent;
  let hostComponent: HostComponent;
  let fixture: ComponentFixture<HostComponent>;
  let errorBoundary: DebugElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HostComponent],
      imports: [ErrorBoundaryComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    hostComponent = fixture.componentInstance;
    errorBoundary = fixture.debugElement.query(By.directive(ErrorBoundaryComponent));
    component = errorBoundary.componentInstance;
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display content when no error', () => {
    expect(component.hasError).toBe(false);
    
    const testContent = fixture.debugElement.query(By.css('.test-content'));
    expect(testContent).toBeTruthy();
    expect(testContent.nativeElement.textContent).toContain('Test Content');
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      // Simulate an error
      const testError = new Error('Test error message');
      component.handleError(testError, 'Test context');
      fixture.detectChanges();
    });

    it('should display error fallback when error occurs', () => {
      expect(component.hasError).toBe(true);
      
      const errorFallback = fixture.debugElement.query(By.css('.error-fallback'));
      expect(errorFallback).toBeTruthy();
      
      const testContent = fixture.debugElement.query(By.css('.test-content'));
      expect(testContent).toBeFalsy();
    });

    it('should display error title and message', () => {
      const errorTitle = fixture.debugElement.query(By.css('.error-title'));
      const errorMessage = fixture.debugElement.query(By.css('.error-message'));
      
      expect(errorTitle.nativeElement.textContent).toContain('Test Component Unavailable');
      expect(errorMessage.nativeElement.textContent).toContain('Something went wrong');
    });

    it('should show retry button when retry is enabled', () => {
      const retryButton = fixture.debugElement.query(By.css('.btn-primary'));
      expect(retryButton).toBeTruthy();
      expect(retryButton.nativeElement.textContent).toContain('Try Again');
      expect(retryButton.nativeElement.disabled).toBe(false);
    });

    it('should show fallback button when fallback is enabled', () => {
      const fallbackButton = fixture.debugElement.query(By.css('.btn-secondary'));
      expect(fallbackButton).toBeTruthy();
      expect(fallbackButton.nativeElement.textContent).toContain('Use Basic Version');
    });

    it('should show details toggle button', () => {
      const detailsButton = fixture.debugElement.query(By.css('.btn-link'));
      expect(detailsButton).toBeTruthy();
      expect(detailsButton.nativeElement.textContent).toContain('Show Details');
    });
  });

  describe('Retry Functionality', () => {
    beforeEach(() => {
      const testError = new Error('Test error');
      component.handleError(testError);
      fixture.detectChanges();
    });

    it('should retry when retry button is clicked', (done) => {
      const retryButton = fixture.debugElement.query(By.css('.btn-primary'));
      
      retryButton.nativeElement.click();
      fixture.detectChanges();
      
      expect(component.isRetrying).toBe(true);
      expect(component.retryCount).toBe(1);
      
      // Wait for retry delay
      setTimeout(() => {
        expect(component.hasError).toBe(false);
        expect(component.isRetrying).toBe(false);
        done();
      }, component.retryDelay + 100);
    });

    it('should disable retry after max retries', () => {
      // Exhaust retry attempts
      for (let i = 0; i < component.maxRetries; i++) {
        component.retry();
      }
      
      fixture.detectChanges();
      
      expect(component.canRetry).toBe(false);
      
      const retryButton = fixture.debugElement.query(By.css('.btn-primary'));
      expect(retryButton.nativeElement.disabled).toBe(true);
    });

    it('should not retry when retry is disabled', () => {
      hostComponent.enableRetry = false;
      fixture.detectChanges();
      
      const retryButton = fixture.debugElement.query(By.css('.btn-primary'));
      expect(retryButton.nativeElement.disabled).toBe(true);
    });
  });

  describe('Details Toggle', () => {
    beforeEach(() => {
      const testError = new Error('Test error');
      component.handleError(testError, 'Test context');
      fixture.detectChanges();
    });

    it('should toggle error details visibility', () => {
      expect(component.showDetails).toBe(false);
      
      let errorDetails = fixture.debugElement.query(By.css('.error-details'));
      expect(errorDetails).toBeFalsy();
      
      const detailsButton = fixture.debugElement.query(By.css('.btn-link'));
      detailsButton.nativeElement.click();
      fixture.detectChanges();
      
      expect(component.showDetails).toBe(true);
      errorDetails = fixture.debugElement.query(By.css('.error-details'));
      expect(errorDetails).toBeTruthy();
    });

    it('should display error details when shown', () => {
      component.showDetails = true;
      fixture.detectChanges();
      
      const errorDetails = fixture.debugElement.query(By.css('.error-details'));
      const errorPre = errorDetails.query(By.css('pre'));
      
      expect(errorPre.nativeElement.textContent).toContain('Test error');
      expect(errorPre.nativeElement.textContent).toContain('Test context');
    });
  });

  describe('Fallback Functionality', () => {
    beforeEach(() => {
      const testError = new Error('Test error');
      component.handleError(testError);
      fixture.detectChanges();
    });

    it('should handle fallback button click', () => {
      spyOn(console, 'log');
      
      const fallbackButton = fixture.debugElement.query(By.css('.btn-secondary'));
      fallbackButton.nativeElement.click();
      
      expect(component.hasError).toBe(false);
      expect(console.log).toHaveBeenCalledWith('Falling back to basic version of Test Component');
    });

    it('should disable fallback when not enabled', () => {
      hostComponent.enableFallback = false;
      fixture.detectChanges();
      
      const fallbackButton = fixture.debugElement.query(By.css('.btn-secondary'));
      expect(fallbackButton.nativeElement.disabled).toBe(true);
    });
  });

  describe('Error Message Formatting', () => {
    it('should format network errors appropriately', () => {
      const networkError = new Error('Network request failed');
      component.handleError(networkError);
      
      expect(component.getErrorMessage()).toContain('check your internet connection');
    });

    it('should format permission errors appropriately', () => {
      const permissionError = new Error('Access denied');
      component.handleError(permissionError);
      
      expect(component.getErrorMessage()).toContain('Access denied');
    });

    it('should format timeout errors appropriately', () => {
      const timeoutError = new Error('Request timeout');
      component.handleError(timeoutError);
      
      expect(component.getErrorMessage()).toContain('took too long');
    });

    it('should provide generic message for unknown errors', () => {
      const unknownError = new Error('Unknown error');
      component.handleError(unknownError);
      
      expect(component.getErrorMessage()).toContain('Something went wrong');
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      const testError = new Error('Test error');
      component.handleError(testError);
      fixture.detectChanges();
    });

    it('should have proper ARIA attributes', () => {
      const errorFallback = fixture.debugElement.query(By.css('.error-fallback'));
      
      expect(errorFallback.nativeElement.getAttribute('role')).toBe('alert');
      expect(errorFallback.nativeElement.getAttribute('aria-live')).toBe('assertive');
      expect(errorFallback.nativeElement.getAttribute('aria-label')).toContain('Error in Test Component');
    });

    it('should have proper button labels', () => {
      const retryButton = fixture.debugElement.query(By.css('.btn-primary'));
      const fallbackButton = fixture.debugElement.query(By.css('.btn-secondary'));
      
      expect(retryButton.nativeElement.getAttribute('aria-label')).toContain('Retry Test Component');
      expect(fallbackButton.nativeElement.getAttribute('aria-label')).toContain('Use basic version of Test Component');
    });

    it('should have proper details toggle attributes', () => {
      const detailsButton = fixture.debugElement.query(By.css('.btn-link'));
      
      expect(detailsButton.nativeElement.getAttribute('aria-expanded')).toBe('false');
      expect(detailsButton.nativeElement.getAttribute('aria-controls')).toBe('error-details');
      
      detailsButton.nativeElement.click();
      fixture.detectChanges();
      
      expect(detailsButton.nativeElement.getAttribute('aria-expanded')).toBe('true');
    });
  });

  describe('Component Configuration', () => {
    it('should use custom component name', () => {
      hostComponent.componentName = 'Custom Component';
      fixture.detectChanges();
      
      const testError = new Error('Test error');
      component.handleError(testError);
      fixture.detectChanges();
      
      const errorTitle = fixture.debugElement.query(By.css('.error-title'));
      expect(errorTitle.nativeElement.textContent).toContain('Custom Component Unavailable');
    });

    it('should respect max retries setting', () => {
      hostComponent.maxRetries = 1;
      fixture.detectChanges();
      
      const testError = new Error('Test error');
      component.handleError(testError);
      
      // First retry should work
      component.retry();
      expect(component.canRetry).toBe(false); // Should be disabled after 1 retry
    });

    it('should use custom retry delay', (done) => {
      component.retryDelay = 100; // Short delay for testing
      
      const testError = new Error('Test error');
      component.handleError(testError);
      fixture.detectChanges();
      
      const startTime = Date.now();
      component.retry();
      
      setTimeout(() => {
        const elapsed = Date.now() - startTime;
        expect(elapsed).toBeGreaterThanOrEqual(100);
        expect(component.hasError).toBe(false);
        done();
      }, 150);
    });
  });

  describe('Error Reporting', () => {
    it('should log error details to console', () => {
      spyOn(console, 'error');
      spyOn(console, 'warn');
      
      const testError = new Error('Test error');
      component.handleError(testError, 'Test context');
      
      expect(console.error).toHaveBeenCalledWith('Error in Test Component:', testError);
      expect(console.warn).toHaveBeenCalledWith('Error Report:', jasmine.any(Object));
    });

    it('should include context in error report', () => {
      spyOn(console, 'warn');
      
      const testError = new Error('Test error');
      component.handleError(testError, 'Test context');
      
      const errorReport = (console.warn as jasmine.Spy).calls.mostRecent().args[1];
      expect(errorReport.context).toBe('Test context');
      expect(errorReport.component).toBe('Test Component');
    });
  });
});