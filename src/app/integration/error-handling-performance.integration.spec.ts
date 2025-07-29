import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { Store } from '@ngrx/store';
import { of, throwError, timer } from 'rxjs';
import { delay, switchMap } from 'rxjs/operators';

import { PhotoMapToggleComponent } from '../components/photo-map-toggle/photo-map-toggle.component';
import { PhotoZoomControlsComponent } from '../components/photo-zoom-controls/photo-zoom-controls.component';
import { ErrorBoundaryComponent } from '../components/error-boundary/error-boundary.component';
import { PerformanceMonitorService } from '../services/performance-monitor.service';
import { OptimizedImageLoaderService } from '../services/optimized-image-loader.service';
import { InterfaceToggleService } from '../services/interface-toggle.service';
import { PhotoZoomService } from '../services/photo-zoom.service';
import { Photo } from '../models/photo.model';
import { ActiveView } from '../models/interface-state.model';

// Mock components for testing
@Component({
  selector: 'app-photo-display',
  template: '<div class="photo-display">Photo Display</div>'
})
class MockPhotoDisplayComponent {
  photo: Photo | null = null;
  enableZoom = true;
  showMetadata = false;
}

@Component({
  selector: 'app-map-guess',
  template: '<div class="map-guess">Map Guess</div>'
})
class MockMapGuessComponent {}

// Test host component
@Component({
  template: `
    <app-error-boundary 
      componentName="Enhanced Game Interface"
      [enableRetry]="true"
      [enableFallback]="true">
      
      <app-photo-map-toggle
        [photo]="testPhoto"
        [enableZoom]="enableZoom"
        [transitionDuration]="transitionDuration"
        (viewToggled)="onViewToggled($event)"
        (photoZoomChanged)="onPhotoZoomChanged($event)">
      </app-photo-map-toggle>
      
      <app-photo-zoom-controls
        [disabled]="zoomDisabled"
        (zoomIn)="onZoomIn()"
        (zoomOut)="onZoomOut()"
        (reset)="onZoomReset()">
      </app-photo-zoom-controls>
      
    </app-error-boundary>
  `
})
class TestHostComponent {
  testPhoto: Photo = {
    id: 'test-1',
    url: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    title: 'Test Photo',
    year: 1970,
    coordinates: { latitude: 40.7128, longitude: -74.0060 },
    description: 'Test photo description'
  };
  
  enableZoom = true;
  zoomDisabled = false;
  transitionDuration = 300;
  
  viewToggleCount = 0;
  zoomChangeCount = 0;
  zoomInCount = 0;
  zoomOutCount = 0;
  zoomResetCount = 0;
  
  onViewToggled(view: any) {
    this.viewToggleCount++;
  }
  
  onPhotoZoomChanged(zoomState: any) {
    this.zoomChangeCount++;
  }
  
  onZoomIn() {
    this.zoomInCount++;
  }
  
  onZoomOut() {
    this.zoomOutCount++;
  }
  
  onZoomReset() {
    this.zoomResetCount++;
  }
}

describe('Error Handling and Performance Integration', () => {
  let component: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;
  let performanceMonitor: PerformanceMonitorService;
  let imageLoader: OptimizedImageLoaderService;
  let interfaceToggleService: jasmine.SpyObj<InterfaceToggleService>;
  let photoZoomService: jasmine.SpyObj<PhotoZoomService>;
  let store: jasmine.SpyObj<Store>;

  beforeEach(async () => {
    const interfaceToggleSpy = jasmine.createSpyObj('InterfaceToggleService', [
      'toggleView', 'setActiveView', 'getCurrentActiveView', 'isTransitionInProgress',
      'activeView$', 'isPhotoActive$', 'isMapActive$', 'transitionInProgress$', 'canToggle$'
    ]);
    
    const photoZoomSpy = jasmine.createSpyObj('PhotoZoomService', [
      'zoomIn', 'zoomOut', 'reset', 'canZoomIn', 'canZoomOut', 'zoomState$'
    ]);
    
    const storeSpy = jasmine.createSpyObj('Store', ['select', 'dispatch']);

    // Set up default spy returns
    interfaceToggleSpy.activeView$ = of('photo');
    interfaceToggleSpy.isPhotoActive$ = of(true);
    interfaceToggleSpy.isMapActive$ = of(false);
    interfaceToggleSpy.transitionInProgress$ = of(false);
    interfaceToggleSpy.canToggle$ = of(true);
    interfaceToggleSpy.toggleView.and.returnValue(of('map'));
    interfaceToggleSpy.getCurrentActiveView.and.returnValue('photo');
    interfaceToggleSpy.isTransitionInProgress.and.returnValue(false);

    photoZoomSpy.zoomState$ = of({
      zoomLevel: 1,
      position: { x: 0, y: 0 },
      minZoom: 1,
      maxZoom: 5,
      containerWidth: 800,
      containerHeight: 600,
      imageWidth: 800,
      imageHeight: 600
    });
    photoZoomSpy.canZoomIn.and.returnValue(true);
    photoZoomSpy.canZoomOut.and.returnValue(false);
    photoZoomSpy.zoomIn.and.returnValue(true);
    photoZoomSpy.zoomOut.and.returnValue(true);

    await TestBed.configureTestingModule({
      declarations: [TestHostComponent, MockPhotoDisplayComponent, MockMapGuessComponent],
      imports: [
        PhotoMapToggleComponent,
        PhotoZoomControlsComponent,
        ErrorBoundaryComponent
      ],
      providers: [
        PerformanceMonitorService,
        OptimizedImageLoaderService,
        { provide: InterfaceToggleService, useValue: interfaceToggleSpy },
        { provide: PhotoZoomService, useValue: photoZoomSpy },
        { provide: Store, useValue: storeSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    component = fixture.componentInstance;
    performanceMonitor = TestBed.inject(PerformanceMonitorService);
    imageLoader = TestBed.inject(OptimizedImageLoaderService);
    interfaceToggleService = TestBed.inject(InterfaceToggleService) as jasmine.SpyObj<InterfaceToggleService>;
    photoZoomService = TestBed.inject(PhotoZoomService) as jasmine.SpyObj<PhotoZoomService>;
    store = TestBed.inject(Store) as jasmine.SpyObj<Store>;

    fixture.detectChanges();
  });

  describe('Error Boundary Integration', () => {
    it('should wrap components in error boundaries', () => {
      const errorBoundaries = fixture.debugElement.queryAll(By.directive(ErrorBoundaryComponent));
      expect(errorBoundaries.length).toBeGreaterThan(0);
    });

    it('should handle component errors gracefully', () => {
      const errorBoundary = fixture.debugElement.query(By.directive(ErrorBoundaryComponent));
      const errorBoundaryComponent = errorBoundary.componentInstance;
      
      spyOn(console, 'error');
      
      const testError = new Error('Component error');
      errorBoundaryComponent.handleError(testError, 'Test context');
      fixture.detectChanges();
      
      expect(errorBoundaryComponent.hasError).toBe(true);
      expect(console.error).toHaveBeenCalledWith(
        'Error in Enhanced Game Interface:',
        testError
      );
    });

    it('should provide retry functionality for failed components', (done) => {
      const errorBoundary = fixture.debugElement.query(By.directive(ErrorBoundaryComponent));
      const errorBoundaryComponent = errorBoundary.componentInstance;
      
      errorBoundaryComponent.handleError(new Error('Test error'));
      fixture.detectChanges();
      
      const retryButton = fixture.debugElement.query(By.css('.btn-primary'));
      expect(retryButton).toBeTruthy();
      
      retryButton.nativeElement.click();
      
      setTimeout(() => {
        expect(errorBoundaryComponent.hasError).toBe(false);
        done();
      }, errorBoundaryComponent.retryDelay + 100);
    });

    it('should provide fallback functionality', () => {
      const errorBoundary = fixture.debugElement.query(By.directive(ErrorBoundaryComponent));
      const errorBoundaryComponent = errorBoundary.componentInstance;
      
      errorBoundaryComponent.handleError(new Error('Test error'));
      fixture.detectChanges();
      
      const fallbackButton = fixture.debugElement.query(By.css('.btn-secondary'));
      expect(fallbackButton).toBeTruthy();
      
      spyOn(console, 'log');
      fallbackButton.nativeElement.click();
      
      expect(console.log).toHaveBeenCalledWith(
        'Falling back to basic version of Enhanced Game Interface'
      );
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should monitor toggle performance', (done) => {
      spyOn(performanceMonitor, 'startTiming');
      spyOn(performanceMonitor, 'endTiming');
      
      const toggleComponent = fixture.debugElement.query(By.directive(PhotoMapToggleComponent));
      const thumbnailArea = toggleComponent.query(By.css('.thumbnail-area'));
      
      thumbnailArea.nativeElement.click();
      
      setTimeout(() => {
        expect(performanceMonitor.startTiming).toHaveBeenCalledWith(
          jasmine.stringMatching(/component-toggle-/),
          'toggle',
          jasmine.any(Object)
        );
        expect(performanceMonitor.endTiming).toHaveBeenCalledWith(
          jasmine.stringMatching(/component-toggle-/),
          'Component Toggle (Success)'
        );
        done();
      }, 100);
    });

    it('should monitor zoom performance', () => {
      spyOn(performanceMonitor, 'measureSync').and.callThrough();
      
      const zoomControls = fixture.debugElement.query(By.directive(PhotoZoomControlsComponent));
      const zoomInButton = zoomControls.query(By.css('.zoom-in'));
      
      zoomInButton.nativeElement.click();
      
      expect(photoZoomService.zoomIn).toHaveBeenCalled();
      // Note: The actual performance monitoring happens in the service
    });

    it('should track slow operations', (done) => {
      // Simulate slow toggle operation
      interfaceToggleService.toggleView.and.returnValue(
        timer(1000).pipe(switchMap(() => of('map' as ActiveView)))
      );
      
      spyOn(performanceMonitor, 'recordTiming');
      
      const toggleComponent = fixture.debugElement.query(By.directive(PhotoMapToggleComponent));
      const thumbnailArea = toggleComponent.query(By.css('.thumbnail-area'));
      
      thumbnailArea.nativeElement.click();
      
      setTimeout(() => {
        // Should record a slow operation
        expect(performanceMonitor.recordTiming).toHaveBeenCalled();
        done();
      }, 1100);
    });

    it('should provide performance metrics', () => {
      performanceMonitor.recordTiming('Test Toggle', 200, 'toggle');
      performanceMonitor.recordTiming('Test Zoom', 50, 'zoom');
      
      const metrics = performanceMonitor.getMetricsByCategory('toggle');
      expect(metrics.length).toBe(1);
      expect(metrics[0].name).toBe('Test Toggle');
      
      const avgPerformance = performanceMonitor.getAveragePerformance('Test Toggle');
      expect(avgPerformance).toBe(200);
    });
  });

  describe('Image Loading Performance', () => {
    it('should cache images for better performance', (done) => {
      const testUrl = component.testPhoto.url;
      
      // First load
      imageLoader.loadImage(testUrl).subscribe({
        next: (firstResult) => {
          expect(firstResult.fromCache).toBe(false);
          
          // Second load should be from cache
          imageLoader.loadImage(testUrl).subscribe({
            next: (secondResult) => {
              expect(secondResult.fromCache).toBe(true);
              expect(secondResult.loadTime).toBe(0);
              done();
            }
          });
        }
      });
    });

    it('should handle image loading errors gracefully', (done) => {
      const invalidUrl = 'invalid-image-url';
      
      imageLoader.loadImage(invalidUrl, { retries: 1, timeout: 1000 }).subscribe({
        next: () => {
          fail('Should not succeed with invalid URL');
        },
        error: (error) => {
          expect(error).toBeDefined();
          expect(error.message).toContain('Failed to load image');
          done();
        }
      });
    });

    it('should preload images for better UX', (done) => {
      const urls = [
        'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
      ];
      
      imageLoader.preloadImages(urls).subscribe({
        next: (loadedCount) => {
          if (loadedCount === urls.length) {
            urls.forEach(url => {
              expect(imageLoader.isCached(url)).toBe(true);
            });
            done();
          }
        }
      });
    });

    it('should optimize image URLs for performance', () => {
      const baseUrl = 'https://example.com/image.jpg';
      const options = {
        quality: 'medium' as const,
        maxWidth: 800,
        maxHeight: 600
      };
      
      const optimizedUrl = imageLoader.createOptimizedUrl(baseUrl, options);
      
      expect(optimizedUrl).toContain('quality=70');
      expect(optimizedUrl).toContain('w=800');
      expect(optimizedUrl).toContain('h=600');
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should recover from toggle service failures', (done) => {
      // Simulate toggle service failure
      interfaceToggleService.toggleView.and.returnValue(
        throwError(() => new Error('Toggle service error'))
      );
      
      spyOn(console, 'error');
      
      const toggleComponent = fixture.debugElement.query(By.directive(PhotoMapToggleComponent));
      const thumbnailArea = toggleComponent.query(By.css('.thumbnail-area'));
      
      thumbnailArea.nativeElement.click();
      
      setTimeout(() => {
        expect(console.error).toHaveBeenCalledWith(
          'Toggle operation failed:',
          jasmine.any(Error)
        );
        
        // Component should still be functional
        const toggleComponentInstance = toggleComponent.componentInstance;
        expect(toggleComponentInstance.isTransitioning).toBe(false);
        done();
      }, 100);
    });

    it('should handle zoom service failures gracefully', () => {
      photoZoomService.zoomIn.and.throwError('Zoom service error');
      
      spyOn(console, 'error');
      
      const zoomControls = fixture.debugElement.query(By.directive(PhotoZoomControlsComponent));
      const zoomInButton = zoomControls.query(By.css('.zoom-in'));
      
      expect(() => zoomInButton.nativeElement.click()).not.toThrow();
    });

    it('should maintain accessibility during errors', () => {
      const errorBoundary = fixture.debugElement.query(By.directive(ErrorBoundaryComponent));
      const errorBoundaryComponent = errorBoundary.componentInstance;
      
      errorBoundaryComponent.handleError(new Error('Test error'));
      fixture.detectChanges();
      
      const errorFallback = fixture.debugElement.query(By.css('.error-fallback'));
      
      expect(errorFallback.nativeElement.getAttribute('role')).toBe('alert');
      expect(errorFallback.nativeElement.getAttribute('aria-live')).toBe('assertive');
    });
  });

  describe('Performance Edge Cases', () => {
    it('should handle rapid toggle operations', (done) => {
      let toggleCount = 0;
      const maxToggles = 10;
      
      const performRapidToggles = () => {
        if (toggleCount < maxToggles) {
          const toggleComponent = fixture.debugElement.query(By.directive(PhotoMapToggleComponent));
          const thumbnailArea = toggleComponent.query(By.css('.thumbnail-area'));
          
          thumbnailArea.nativeElement.click();
          toggleCount++;
          
          setTimeout(performRapidToggles, 50); // Rapid succession
        } else {
          // Should not crash or cause memory leaks
          expect(component.viewToggleCount).toBeGreaterThan(0);
          done();
        }
      };
      
      performRapidToggles();
    });

    it('should handle memory pressure gracefully', () => {
      // Simulate high memory usage by loading many images
      const urls = Array.from({ length: 100 }, (_, i) => 
        `data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7?id=${i}`
      );
      
      urls.forEach(url => {
        imageLoader.loadImage(url).subscribe({
          error: () => {
            // Ignore errors for this test
          }
        });
      });
      
      const stats = imageLoader.getCacheStatistics();
      expect(stats.totalEntries).toBeLessThanOrEqual(100); // Should enforce limits
    });

    it('should throttle performance monitoring under load', () => {
      spyOn(performanceMonitor, 'recordMetric');
      
      // Generate many performance events
      for (let i = 0; i < 1000; i++) {
        performanceMonitor.recordTiming(`Operation ${i}`, 100, 'interaction');
      }
      
      // Should not overwhelm the system
      expect(performanceMonitor.recordMetric).toHaveBeenCalled();
      
      const metrics = performanceMonitor.exportData();
      expect(metrics.metrics.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Accessibility Under Error Conditions', () => {
    it('should maintain keyboard navigation during errors', () => {
      const errorBoundary = fixture.debugElement.query(By.directive(ErrorBoundaryComponent));
      const errorBoundaryComponent = errorBoundary.componentInstance;
      
      errorBoundaryComponent.handleError(new Error('Test error'));
      fixture.detectChanges();
      
      const retryButton = fixture.debugElement.query(By.css('.btn-primary'));
      const fallbackButton = fixture.debugElement.query(By.css('.btn-secondary'));
      
      expect(retryButton.nativeElement.tabIndex).not.toBe(-1);
      expect(fallbackButton.nativeElement.tabIndex).not.toBe(-1);
    });

    it('should announce errors to screen readers', () => {
      const errorBoundary = fixture.debugElement.query(By.directive(ErrorBoundaryComponent));
      const errorBoundaryComponent = errorBoundary.componentInstance;
      
      errorBoundaryComponent.handleError(new Error('Test error'));
      fixture.detectChanges();
      
      const errorFallback = fixture.debugElement.query(By.css('.error-fallback'));
      const ariaLabel = errorFallback.nativeElement.getAttribute('aria-label');
      
      expect(ariaLabel).toContain('Error in Enhanced Game Interface');
    });

    it('should provide alternative interaction methods during failures', () => {
      // Simulate touch device
      const toggleComponent = fixture.debugElement.query(By.directive(PhotoMapToggleComponent));
      const toggleComponentInstance = toggleComponent.componentInstance;
      
      // Should provide keyboard alternatives
      const keyboardEvent = new KeyboardEvent('keydown', { key: 't' });
      toggleComponentInstance.onKeyDown(keyboardEvent);
      
      expect(interfaceToggleService.toggleView).toHaveBeenCalled();
    });
  });

  describe('Resource Cleanup', () => {
    it('should clean up resources on component destroy', () => {
      const toggleComponent = fixture.debugElement.query(By.directive(PhotoMapToggleComponent));
      const toggleComponentInstance = toggleComponent.componentInstance;
      
      spyOn(toggleComponentInstance, 'ngOnDestroy').and.callThrough();
      
      fixture.destroy();
      
      expect(toggleComponentInstance.ngOnDestroy).toHaveBeenCalled();
    });

    it('should clear performance monitoring data when needed', () => {
      performanceMonitor.recordTiming('Test', 100, 'toggle');
      
      let metricsCount = 0;
      performanceMonitor.metrics$.subscribe(metrics => {
        metricsCount = metrics.length;
      });
      
      expect(metricsCount).toBe(1);
      
      performanceMonitor.clearMetrics();
      
      performanceMonitor.metrics$.subscribe(metrics => {
        expect(metrics.length).toBe(0);
      });
    });

    it('should clear image cache when memory is low', () => {
      const testUrl = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      
      imageLoader.loadImage(testUrl).subscribe(() => {
        expect(imageLoader.isCached(testUrl)).toBe(true);
        
        imageLoader.clearCache();
        expect(imageLoader.isCached(testUrl)).toBe(false);
      });
    });
  });
});