import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';

import { PhotoDisplayComponent } from './photo-display.component';
import { ImagePreloaderService } from '../../services/image-preloader.service';
import { PhotoZoomService } from '../../services/photo-zoom.service';
import { InterfaceToggleService } from '../../services/interface-toggle.service';
import { Photo } from '../../models/photo.model';

describe('PhotoDisplayComponent - Mobile Touch Support', () => {
  let component: PhotoDisplayComponent;
  let fixture: ComponentFixture<PhotoDisplayComponent>;
  let mockStore: jasmine.SpyObj<Store>;
  let mockImagePreloader: jasmine.SpyObj<ImagePreloaderService>;
  let mockPhotoZoomService: jasmine.SpyObj<PhotoZoomService>;
  let mockInterfaceToggleService: jasmine.SpyObj<InterfaceToggleService>;

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

  const createMockZoomState = (zoomLevel: number = 1) => ({
    zoomLevel,
    position: { x: 0, y: 0 },
    minZoom: 0.5,
    maxZoom: 5,
    containerWidth: 800,
    containerHeight: 600,
    imageWidth: 1200,
    imageHeight: 800
  });

  beforeEach(async () => {
    const storeSpy = jasmine.createSpyObj('Store', ['select']);
    const imagePreloaderSpy = jasmine.createSpyObj('ImagePreloaderService', [
      'preloadGamePhotos',
      'preloadNextPhoto',
      'getPreloadedImage',
      'isPreloaded'
    ]);
    const photoZoomServiceSpy = jasmine.createSpyObj('PhotoZoomService', [
      'initializeZoom',
      'reset',
      'zoomIn',
      'zoomOut',
      'pan',
      'handlePinchZoom',
      'setZoomLevel',
      'zoomToPoint',
      'getTransform',
      'updateContainerDimensions'
    ], {
      zoomState$: of(createMockZoomState())
    });
    const interfaceToggleServiceSpy = jasmine.createSpyObj('InterfaceToggleService', [
      'resetPhotoZoom'
    ]);

    // Mock store selectors
    storeSpy.select.and.returnValue(of(mockPhoto));

    await TestBed.configureTestingModule({
      imports: [PhotoDisplayComponent],
      providers: [
        { provide: Store, useValue: storeSpy },
        { provide: ImagePreloaderService, useValue: imagePreloaderSpy },
        { provide: PhotoZoomService, useValue: photoZoomServiceSpy },
        { provide: InterfaceToggleService, useValue: interfaceToggleServiceSpy }
      ]
    }).compileComponents();

    mockStore = TestBed.inject(Store) as jasmine.SpyObj<Store>;
    mockImagePreloader = TestBed.inject(ImagePreloaderService) as jasmine.SpyObj<ImagePreloaderService>;
    mockPhotoZoomService = TestBed.inject(PhotoZoomService) as jasmine.SpyObj<PhotoZoomService>;
    mockInterfaceToggleService = TestBed.inject(InterfaceToggleService) as jasmine.SpyObj<InterfaceToggleService>;

    fixture = TestBed.createComponent(PhotoDisplayComponent);
    component = fixture.componentInstance;
    component.photo = mockPhoto;
    component.enableZoom = true;

    fixture.detectChanges();
  });

  describe('Enhanced Touch Start Handling', () => {
    it('should handle single touch start correctly', () => {
      const touchEvent = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 100 } as Touch]
      });

      spyOn(touchEvent, 'preventDefault');
      component.onTouchStart(touchEvent);

      expect(touchEvent.preventDefault).toHaveBeenCalled();
      expect((component as any).lastPanPoint).toEqual({ x: 100, y: 100 });
      expect((component as any).lastTouchTime).toBeGreaterThan(0);
    });

    it('should handle double tap detection', fakeAsync(() => {
      mockPhotoZoomService.reset.and.stub();
      
      // First tap
      const firstTouch = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 100 } as Touch]
      });
      component.onTouchStart(firstTouch);
      
      tick(100);
      
      // Second tap within double tap window
      const secondTouch = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 100 } as Touch]
      });
      component.onTouchStart(secondTouch);

      expect(mockPhotoZoomService.reset).toHaveBeenCalled();
    }));

    it('should handle pinch start correctly', () => {
      const touchEvent = new TouchEvent('touchstart', {
        touches: [
          { clientX: 100, clientY: 100 } as Touch,
          { clientX: 200, clientY: 200 } as Touch
        ]
      });

      component.onTouchStart(touchEvent);

      expect((component as any).isMultiTouch).toBe(true);
      expect((component as any).touchStartDistance).toBeGreaterThan(0);
      expect((component as any).touchStartCenter).toEqual({ x: 150, y: 150 });
    });

    it('should add visual feedback on touch start', () => {
      const mockContainer = jasmine.createSpyObj('HTMLElement', ['classList']);
      mockContainer.classList = jasmine.createSpyObj('DOMTokenList', ['add']);
      (component as any).photoContainer = { nativeElement: mockContainer };

      const touchEvent = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 100 } as Touch]
      });

      component.onTouchStart(touchEvent);

      expect(mockContainer.classList.add).toHaveBeenCalledWith('touch-active');
    });
  });

  describe('Enhanced Touch Move Handling', () => {
    beforeEach(() => {
      // Set up initial touch state
      (component as any).isDragging = true;
      (component as any).lastPanPoint = { x: 100, y: 100 };
      (component as any).touchMoveThreshold = 5;
      component.zoomState = createMockZoomState(2);
    });

    it('should handle single touch pan with threshold', () => {
      const touchEvent = new TouchEvent('touchmove', {
        touches: [{ clientX: 110, clientY: 110 } as Touch]
      });

      spyOn(touchEvent, 'preventDefault');
      component.onTouchMove(touchEvent);

      expect(touchEvent.preventDefault).toHaveBeenCalled();
      expect(mockPhotoZoomService.pan).toHaveBeenCalledWith(10, 10);
    });

    it('should not pan if movement is below threshold', () => {
      const touchEvent = new TouchEvent('touchmove', {
        touches: [{ clientX: 102, clientY: 102 } as Touch]
      });

      component.onTouchMove(touchEvent);

      expect(mockPhotoZoomService.pan).not.toHaveBeenCalled();
    });

    it('should handle pinch zoom with smoothing', () => {
      (component as any).isMultiTouch = true;
      (component as any).touchStartDistance = 100;
      (component as any).touchStartZoom = 1;

      const touchEvent = new TouchEvent('touchmove', {
        touches: [
          { clientX: 90, clientY: 90 } as Touch,
          { clientX: 210, clientY: 210 } as Touch
        ]
      });

      component.onTouchMove(touchEvent);

      expect(mockPhotoZoomService.handlePinchZoom).toHaveBeenCalled();
    });

    it('should apply scale smoothing for better UX', () => {
      const rawScale = 1.5;
      const smoothedScale = (component as any).smoothScale(rawScale);

      expect(smoothedScale).toBeLessThan(rawScale);
      expect(smoothedScale).toBeGreaterThan(1);
    });
  });

  describe('Enhanced Touch End Handling', () => {
    it('should remove visual feedback on touch end', () => {
      const mockContainer = jasmine.createSpyObj('HTMLElement', ['classList']);
      mockContainer.classList = jasmine.createSpyObj('DOMTokenList', ['remove']);
      (component as any).photoContainer = { nativeElement: mockContainer };

      const touchEvent = new TouchEvent('touchend', { touches: [] });
      component.onTouchEnd(touchEvent);

      expect(mockContainer.classList.remove).toHaveBeenCalledWith('touch-active');
    });

    it('should provide haptic feedback when zoomed', () => {
      const vibrateSpy = jasmine.createSpy('vibrate');
      Object.defineProperty(navigator, 'vibrate', {
        writable: true,
        value: vibrateSpy
      });

      component.zoomState = createMockZoomState(2);
      const touchEvent = new TouchEvent('touchend', { touches: [] });
      
      component.onTouchEnd(touchEvent);

      expect(vibrateSpy).toHaveBeenCalledWith(10);
    });

    it('should handle transition from multi-touch to single touch', () => {
      (component as any).isMultiTouch = true;
      component.zoomState = createMockZoomState(2);

      const touchEvent = new TouchEvent('touchend', {
        touches: [{ clientX: 100, clientY: 100 } as Touch]
      });

      component.onTouchEnd(touchEvent);

      expect((component as any).isMultiTouch).toBe(false);
      expect((component as any).isDragging).toBe(true);
      expect((component as any).lastPanPoint).toEqual({ x: 100, y: 100 });
    });
  });

  describe('Double Tap Zoom', () => {
    it('should zoom out when already zoomed', () => {
      component.zoomState = createMockZoomState(2);
      
      const touch = { clientX: 100, clientY: 100 } as Touch;
      (component as any).handleDoubleTap(touch);

      expect(mockPhotoZoomService.reset).toHaveBeenCalled();
    });

    it('should zoom in when not zoomed', () => {
      component.zoomState = createMockZoomState(1);
      
      const mockContainer = { getBoundingClientRect: () => ({ left: 0, top: 0 }) };
      (component as any).photoContainer = { nativeElement: mockContainer };

      const touch = { clientX: 100, clientY: 100 } as Touch;
      (component as any).handleDoubleTap(touch);

      expect(mockPhotoZoomService.zoomToPoint).toHaveBeenCalledWith(2, 100, 100);
    });

    it('should provide haptic feedback on double tap', () => {
      const vibrateSpy = jasmine.createSpy('vibrate');
      Object.defineProperty(navigator, 'vibrate', {
        writable: true,
        value: vibrateSpy
      });

      component.zoomState = createMockZoomState(1);
      
      const touch = { clientX: 100, clientY: 100 } as Touch;
      (component as any).handleDoubleTap(touch);

      expect(vibrateSpy).toHaveBeenCalledWith(30);
    });
  });

  describe('Touch Distance and Center Calculations', () => {
    it('should calculate touch distance correctly', () => {
      const touch1 = { clientX: 0, clientY: 0 } as Touch;
      const touch2 = { clientX: 3, clientY: 4 } as Touch;

      const distance = (component as any).getTouchDistance(touch1, touch2);
      expect(distance).toBe(5); // 3-4-5 triangle
    });

    it('should calculate touch center correctly', () => {
      const touch1 = { clientX: 0, clientY: 0 } as Touch;
      const touch2 = { clientX: 100, clientY: 200 } as Touch;

      const center = (component as any).getTouchCenter(touch1, touch2);
      expect(center).toEqual({ x: 50, y: 100 });
    });
  });

  describe('Responsive Window Resize', () => {
    it('should throttle resize events', fakeAsync(() => {
      const mockContainer = { clientWidth: 800, clientHeight: 600 };
      (component as any).photoContainer = { nativeElement: mockContainer };
      component.imageLoaded = true;

      // Trigger multiple resize events
      window.dispatchEvent(new Event('resize'));
      window.dispatchEvent(new Event('resize'));
      window.dispatchEvent(new Event('resize'));

      // Should not call immediately
      expect(mockPhotoZoomService.updateContainerDimensions).not.toHaveBeenCalled();

      // Should call after throttle period
      tick(300);
      expect(mockPhotoZoomService.updateContainerDimensions).toHaveBeenCalledWith(800, 600);
    }));

    it('should clean up resize timeout on destroy', () => {
      (component as any).resizeTimeout = setTimeout(() => {}, 1000);
      const clearTimeoutSpy = spyOn(window, 'clearTimeout');

      component.ngOnDestroy();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });

  describe('Touch Gesture State Management', () => {
    it('should reset touch state properly', () => {
      (component as any).touchStartDistance = 100;
      (component as any).touchStartZoom = 2;
      (component as any).isMultiTouch = true;
      (component as any).isDragging = true;

      const touchEvent = new TouchEvent('touchend', { touches: [] });
      component.onTouchEnd(touchEvent);

      expect((component as any).touchStartDistance).toBe(0);
      expect((component as any).touchStartZoom).toBe(1);
      expect((component as any).isMultiTouch).toBe(false);
      expect((component as any).isDragging).toBe(false);
    });

    it('should handle touch cancel events', () => {
      (component as any).isDragging = true;
      (component as any).isMultiTouch = true;

      // Simulate touch cancel (like when user swipes up for control center on iOS)
      const touchEvent = new TouchEvent('touchcancel', { touches: [] });
      component.onTouchEnd(touchEvent);

      expect((component as any).isDragging).toBe(false);
      expect((component as any).isMultiTouch).toBe(false);
    });
  });

  describe('Performance Optimizations', () => {
    it('should only update pan when movement is significant', () => {
      (component as any).isDragging = true;
      (component as any).lastPanPoint = { x: 100, y: 100 };
      (component as any).touchMoveThreshold = 5;
      component.zoomState = createMockZoomState(2);

      // Small movement below threshold
      const smallMoveEvent = new TouchEvent('touchmove', {
        touches: [{ clientX: 102, clientY: 102 } as Touch]
      });

      component.onTouchMove(smallMoveEvent);
      expect(mockPhotoZoomService.pan).not.toHaveBeenCalled();

      // Large movement above threshold
      const largeMoveEvent = new TouchEvent('touchmove', {
        touches: [{ clientX: 110, clientY: 110 } as Touch]
      });

      component.onTouchMove(largeMoveEvent);
      expect(mockPhotoZoomService.pan).toHaveBeenCalled();
    });

    it('should throttle pinch zoom updates', () => {
      (component as any).isMultiTouch = true;
      (component as any).touchStartDistance = 100;
      (component as any).touchStartZoom = 1;

      // Small scale change below threshold
      const smallScaleEvent = new TouchEvent('touchmove', {
        touches: [
          { clientX: 99, clientY: 99 } as Touch,
          { clientX: 201, clientY: 201 } as Touch
        ]
      });

      component.onTouchMove(smallScaleEvent);
      expect(mockPhotoZoomService.handlePinchZoom).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility Integration', () => {
    it('should maintain zoom functionality with keyboard', () => {
      component.onZoomControlsEvent('zoomIn');
      expect(mockPhotoZoomService.zoomIn).toHaveBeenCalled();

      component.onZoomControlsEvent('zoomOut');
      expect(mockPhotoZoomService.zoomOut).toHaveBeenCalled();

      component.onZoomControlsEvent('reset');
      expect(mockPhotoZoomService.reset).toHaveBeenCalled();
    });

    it('should provide appropriate alt text for images', () => {
      component.photo = mockPhoto;
      component.showMetadata = true;

      const altText = component.getImageAltText();
      expect(altText).toContain('Test Photo');
      expect(altText).toContain('1950');
      expect(altText).toContain('Test description');
    });
  });
});