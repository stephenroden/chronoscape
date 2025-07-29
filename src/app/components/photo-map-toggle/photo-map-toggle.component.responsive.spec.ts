import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Component, DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';

import { PhotoMapToggleComponent } from './photo-map-toggle.component';
import { InterfaceToggleService } from '../../services/interface-toggle.service';
import { Photo } from '../../models/photo.model';
import { ActiveView } from '../../models/interface-state.model';

// Mock components for testing
@Component({
  selector: 'app-photo-display',
  template: '<div>Mock Photo Display</div>'
})
class MockPhotoDisplayComponent {}

@Component({
  selector: 'app-map-guess',
  template: '<div>Mock Map Guess</div>'
})
class MockMapGuessComponent {}

describe('PhotoMapToggleComponent - Responsive and Mobile Support', () => {
  let component: PhotoMapToggleComponent;
  let fixture: ComponentFixture<PhotoMapToggleComponent>;
  let mockStore: jasmine.SpyObj<Store>;
  let mockInterfaceToggleService: jasmine.SpyObj<InterfaceToggleService>;
  let thumbnailElement: DebugElement;

  const mockPhoto: Photo = {
    id: '1',
    url: 'test-photo.jpg',
    title: 'Test Photo',
    year: 1950,
    coordinates: { latitude: 40.7128, longitude: -74.0060 },
    description: 'Test description',
    source: 'Test Source',
    metadata: {
      license: 'CC BY 4.0',
      originalSource: 'Test Archive',
      dateCreated: new Date('1950-01-01')
    }
  };

  beforeEach(async () => {
    const storeSpy = jasmine.createSpyObj('Store', ['select', 'dispatch']);
    const interfaceToggleServiceSpy = jasmine.createSpyObj('InterfaceToggleService', [
      'toggleView',
      'setActiveView',
      'resetInterfaceState',
      'resetPhotoZoom'
    ], {
      activeView$: of('photo' as ActiveView),
      isPhotoActive$: of(true),
      isMapActive$: of(false),
      inactiveView$: of('map' as ActiveView),
      transitionInProgress$: of(false),
      canToggle$: of(true),
      photoZoomState$: of({ zoomLevel: 1, position: { x: 0, y: 0 }, minZoom: 0.5, maxZoom: 5 }),
      mapState$: of({ zoomLevel: 10, center: { latitude: 0, longitude: 0 }, pins: [] })
    });

    await TestBed.configureTestingModule({
      imports: [PhotoMapToggleComponent],
      declarations: [MockPhotoDisplayComponent, MockMapGuessComponent],
      providers: [
        { provide: Store, useValue: storeSpy },
        { provide: InterfaceToggleService, useValue: interfaceToggleServiceSpy }
      ]
    }).compileComponents();

    mockStore = TestBed.inject(Store) as jasmine.SpyObj<Store>;
    mockInterfaceToggleService = TestBed.inject(InterfaceToggleService) as jasmine.SpyObj<InterfaceToggleService>;

    fixture = TestBed.createComponent(PhotoMapToggleComponent);
    component = fixture.componentInstance;
    component.photo = mockPhoto;

    fixture.detectChanges();
    thumbnailElement = fixture.debugElement.query(By.css('.thumbnail-area'));
  });

  describe('Mobile Device Detection', () => {
    it('should detect mobile device correctly', () => {
      // Mock mobile user agent
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)'
      });

      component.ngOnInit();
      expect(component.isTouchDevice).toBe(true);
    });

    it('should detect desktop device correctly', () => {
      // Mock desktop user agent
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      });

      component.ngOnInit();
      expect(component.isTouchDevice).toBe(false);
    });

    it('should add mobile-device class when on mobile', () => {
      // Simulate mobile device
      (component as any).isMobileDevice = true;
      fixture.detectChanges();

      const containerClasses = component.getMainContainerClasses();
      expect(containerClasses).toContain('mobile-device');
    });
  });

  describe('Responsive Thumbnail Sizing', () => {
    it('should return correct thumbnail size for mobile screens', () => {
      // Mock mobile screen width
      spyOnProperty(window, 'innerWidth', 'get').and.returnValue(360);
      
      const size = component.getResponsiveThumbnailSize();
      expect(size).toEqual({ width: 75, height: 50 });
    });

    it('should return correct thumbnail size for tablet screens', () => {
      // Mock tablet screen width
      spyOnProperty(window, 'innerWidth', 'get').and.returnValue(768);
      
      const size = component.getResponsiveThumbnailSize();
      expect(size).toEqual({ width: 100, height: 66 });
    });

    it('should return correct thumbnail size for desktop screens', () => {
      // Mock desktop screen width
      spyOnProperty(window, 'innerWidth', 'get').and.returnValue(1200);
      
      const size = component.getResponsiveThumbnailSize();
      expect(size).toEqual({ width: 120, height: 80 });
    });
  });

  describe('Touch Event Handling', () => {
    beforeEach(() => {
      (component as any).isMobileDevice = true;
      fixture.detectChanges();
    });

    it('should handle touch start on thumbnail', fakeAsync(() => {
      const touchEvent = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 100 } as Touch]
      });

      spyOn(touchEvent, 'preventDefault');
      component.onThumbnailTouchStart(touchEvent);

      expect(touchEvent.preventDefault).toHaveBeenCalled();
      expect((component as any).touchStartTime).toBeGreaterThan(0);
      expect((component as any).touchStartPosition).toEqual({ x: 100, y: 100 });
    }));

    it('should handle touch move within threshold', () => {
      // Set up initial touch
      (component as any).touchStartTime = Date.now();
      (component as any).touchStartPosition = { x: 100, y: 100 };

      const touchEvent = new TouchEvent('touchmove', {
        touches: [{ clientX: 105, clientY: 105 } as Touch]
      });

      component.onThumbnailTouchMove(touchEvent);

      // Should not cancel touch interaction for small movement
      expect((component as any).touchStartTime).toBeGreaterThan(0);
    });

    it('should cancel touch interaction on large movement', () => {
      // Set up initial touch
      (component as any).touchStartTime = Date.now();
      (component as any).touchStartPosition = { x: 100, y: 100 };

      const touchEvent = new TouchEvent('touchmove', {
        touches: [{ clientX: 150, clientY: 150 } as Touch]
      });

      const mockElement = jasmine.createSpyObj('HTMLElement', ['classList']);
      mockElement.classList = jasmine.createSpyObj('DOMTokenList', ['remove']);

      component.onThumbnailTouchMove(touchEvent);
      (component as any).cancelTouchInteraction(mockElement);

      expect(mockElement.classList.remove).toHaveBeenCalledWith('touch-active');
      expect((component as any).touchStartTime).toBe(0);
    });

    it('should handle touch end and perform toggle for short touch', fakeAsync(() => {
      // Set up short touch
      (component as any).touchStartTime = Date.now() - 200; // 200ms ago
      mockInterfaceToggleService.toggleView.and.returnValue(of('map' as ActiveView));

      const touchEvent = new TouchEvent('touchend', { touches: [] });
      const mockElement = jasmine.createSpyObj('HTMLElement', ['classList']);
      mockElement.classList = jasmine.createSpyObj('DOMTokenList', ['remove']);

      Object.defineProperty(touchEvent, 'currentTarget', {
        writable: false,
        value: mockElement
      });
      component.onThumbnailTouchEnd(touchEvent);

      tick(100);

      expect(mockElement.classList.remove).toHaveBeenCalledWith('touch-active');
      expect(mockInterfaceToggleService.toggleView).toHaveBeenCalled();
    }));

    it('should handle long press with haptic feedback', fakeAsync(() => {
      // Mock vibrate API
      const vibrateSpy = jasmine.createSpy('vibrate');
      Object.defineProperty(navigator, 'vibrate', {
        writable: true,
        value: vibrateSpy
      });

      mockInterfaceToggleService.toggleView.and.returnValue(of('map' as ActiveView));

      // Trigger long press
      (component as any).handleLongPress();

      expect(vibrateSpy).toHaveBeenCalledWith(50);
      expect(mockInterfaceToggleService.toggleView).toHaveBeenCalled();
    }));
  });

  describe('Adaptive Transition Duration', () => {
    it('should return faster transition duration for mobile devices', () => {
      (component as any).isMobileDevice = true;
      component.transitionDuration = 300;

      const adaptiveDuration = component.adaptiveTransitionDuration;
      expect(adaptiveDuration).toBe(200); // 300 - 100, but minimum 200
    });

    it('should return normal transition duration for desktop devices', () => {
      (component as any).isMobileDevice = false;
      component.transitionDuration = 300;

      const adaptiveDuration = component.adaptiveTransitionDuration;
      expect(adaptiveDuration).toBe(300);
    });

    it('should respect minimum transition duration', () => {
      (component as any).isMobileDevice = true;
      component.transitionDuration = 150;

      const adaptiveDuration = component.adaptiveTransitionDuration;
      expect(adaptiveDuration).toBe(200); // Minimum enforced
    });
  });

  describe('CSS Classes for Mobile', () => {
    it('should add mobile-thumbnail class for mobile devices', () => {
      (component as any).isMobileDevice = true;
      fixture.detectChanges();

      const thumbnailClasses = component.getThumbnailClasses();
      expect(thumbnailClasses).toContain('mobile-thumbnail');
    });

    it('should not add mobile-thumbnail class for desktop devices', () => {
      (component as any).isMobileDevice = false;
      fixture.detectChanges();

      const thumbnailClasses = component.getThumbnailClasses();
      expect(thumbnailClasses).not.toContain('mobile-thumbnail');
    });
  });

  describe('Accessibility on Mobile', () => {
    it('should maintain proper ARIA labels on mobile', () => {
      (component as any).isMobileDevice = true;
      fixture.detectChanges();

      const ariaLabel = component.getThumbnailAriaLabel();
      expect(ariaLabel).toContain('Click to switch to');
      expect(ariaLabel).toContain('view');
    });

    it('should maintain keyboard navigation on mobile', () => {
      (component as any).isMobileDevice = true;
      fixture.detectChanges();

      const keyEvent = new KeyboardEvent('keydown', { key: 't' });
      spyOn(component, 'onToggleClick');

      component.onKeyDown(keyEvent);
      expect(component.onToggleClick).toHaveBeenCalled();
    });
  });

  describe('Performance Optimizations', () => {
    it('should throttle resize events', fakeAsync(() => {
      const resizeSpy = spyOn(component, 'getResponsiveThumbnailSize');
      
      // Trigger multiple resize events
      window.dispatchEvent(new Event('resize'));
      window.dispatchEvent(new Event('resize'));
      window.dispatchEvent(new Event('resize'));

      // Should not call immediately
      expect(resizeSpy).not.toHaveBeenCalled();

      // Should call after throttle period
      tick(300);
      expect(resizeSpy).toHaveBeenCalledTimes(1);
    }));

    it('should clean up timeouts on destroy', () => {
      (component as any).longPressTimeout = setTimeout(() => {}, 1000);
      const clearTimeoutSpy = spyOn(window, 'clearTimeout');

      component.ngOnDestroy();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });

  describe('Integration with Touch Events', () => {
    it('should integrate touch events with existing click handlers', fakeAsync(() => {
      mockInterfaceToggleService.toggleView.and.returnValue(of('map' as ActiveView));

      // Simulate touch sequence
      const touchStart = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 100 } as Touch]
      });
      const touchEnd = new TouchEvent('touchend', { touches: [] });

      component.onThumbnailTouchStart(touchStart);
      tick(100); // Short touch
      component.onThumbnailTouchEnd(touchEnd);

      expect(mockInterfaceToggleService.toggleView).toHaveBeenCalled();
    }));

    it('should prevent default touch behaviors', () => {
      const touchEvent = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 100 } as Touch]
      });
      spyOn(touchEvent, 'preventDefault');

      component.onThumbnailTouchStart(touchEvent);

      expect(touchEvent.preventDefault).toHaveBeenCalled();
    });
  });
});