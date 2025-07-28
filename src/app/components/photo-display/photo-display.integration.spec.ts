import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { of, BehaviorSubject } from 'rxjs';
import { PhotoDisplayComponent } from './photo-display.component';
import { Photo } from '../../models/photo.model';
import { AppState } from '../../state/app.state';
import { PhotoZoomService, PhotoZoomState } from '../../services/photo-zoom.service';
import { InterfaceToggleService } from '../../services/interface-toggle.service';
import { ImagePreloaderService } from '../../services/image-preloader.service';
import * as PhotosSelectors from '../../state/photos/photos.selectors';
import * as GameSelectors from '../../state/game/game.selectors';

/**
 * Integration tests for PhotoDisplayComponent with enhanced zoom capabilities
 * Tests the complete workflow of zoom functionality with interface toggle integration
 */
describe('PhotoDisplayComponent Integration Tests', () => {
  let component: PhotoDisplayComponent;
  let fixture: ComponentFixture<PhotoDisplayComponent>;
  let mockStore: jasmine.SpyObj<Store<AppState>>;
  let mockPhotoZoomService: jasmine.SpyObj<PhotoZoomService>;
  let mockInterfaceToggleService: jasmine.SpyObj<InterfaceToggleService>;
  let mockImagePreloaderService: jasmine.SpyObj<ImagePreloaderService>;
  let currentPhotoSubject: BehaviorSubject<Photo | null>;
  let zoomStateSubject: BehaviorSubject<PhotoZoomState>;
  let photoZoomStateSubject: BehaviorSubject<any>;

  const mockPhoto: Photo = {
    id: 'test-photo-1',
    url: 'https://example.com/test-photo.jpg',
    title: 'Test Historical Photo',
    description: 'A test photo for integration testing',
    year: 1950,
    coordinates: { latitude: 40.7128, longitude: -74.0060 },
    source: 'Test Source',
    metadata: {
      photographer: 'Test Photographer',
      license: 'CC BY-SA 4.0',
      originalSource: 'https://example.com/original',
      dateCreated: new Date('1950-01-01')
    }
  };

  const mockZoomState: PhotoZoomState = {
    zoomLevel: 1,
    position: { x: 0, y: 0 },
    minZoom: 1,
    maxZoom: 5,
    containerWidth: 800,
    containerHeight: 600,
    imageWidth: 1200,
    imageHeight: 900
  };

  beforeEach(async () => {
    currentPhotoSubject = new BehaviorSubject<Photo | null>(null);
    zoomStateSubject = new BehaviorSubject<PhotoZoomState>(mockZoomState);
    photoZoomStateSubject = new BehaviorSubject<any>(null);

    mockPhotoZoomService = jasmine.createSpyObj('PhotoZoomService', [
      'initializeZoom', 'reset', 'zoomIn', 'zoomOut', 'setZoomLevel', 'pan', 'setPosition',
      'handlePinchZoom', 'canZoomIn', 'canZoomOut', 'getTransform', 'updateContainerDimensions'
    ]);
    Object.defineProperty(mockPhotoZoomService, 'zoomState$', {
      get: () => zoomStateSubject.asObservable()
    });
    mockPhotoZoomService.getTransform.and.returnValue('translate(0px, 0px) scale(1)');
    mockPhotoZoomService.canZoomIn.and.returnValue(true);
    mockPhotoZoomService.canZoomOut.and.returnValue(false);

    mockInterfaceToggleService = jasmine.createSpyObj('InterfaceToggleService', [
      'setPhotoZoomState', 'resetPhotoZoom', 'getCurrentActiveView'
    ]);
    Object.defineProperty(mockInterfaceToggleService, 'photoZoomState$', {
      get: () => photoZoomStateSubject.asObservable()
    });
    mockInterfaceToggleService.getCurrentActiveView.and.returnValue('photo');

    mockImagePreloaderService = jasmine.createSpyObj('ImagePreloaderService', [
      'preloadGamePhotos', 'preloadNextPhoto', 'getPreloadedImage', 'isPreloaded'
    ]);
    mockImagePreloaderService.preloadGamePhotos.and.returnValue(of({ completed: 0, total: 0, progress: 0 }));
    mockImagePreloaderService.isPreloaded.and.returnValue(false);

    mockStore = jasmine.createSpyObj('Store', ['select', 'dispatch']);
    mockStore.select.and.callFake((selector: any) => {
      if (selector === PhotosSelectors.selectCurrentPhoto) {
        return currentPhotoSubject.asObservable();
      }
      if (selector === PhotosSelectors.selectPhotosLoading) {
        return of(false);
      }
      if (selector === PhotosSelectors.selectPhotosError) {
        return of(null);
      }
      if (selector === PhotosSelectors.selectAllPhotos) {
        return of([mockPhoto]);
      }
      if (selector === GameSelectors.selectCurrentPhotoIndex) {
        return of(0);
      }
      return of(null);
    });

    await TestBed.configureTestingModule({
      imports: [PhotoDisplayComponent],
      providers: [
        { provide: Store, useValue: mockStore },
        { provide: PhotoZoomService, useValue: mockPhotoZoomService },
        { provide: InterfaceToggleService, useValue: mockInterfaceToggleService },
        { provide: ImagePreloaderService, useValue: mockImagePreloaderService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PhotoDisplayComponent);
    component = fixture.componentInstance;
    component.enableZoom = true;
  });

  afterEach(() => {
    currentPhotoSubject.complete();
    zoomStateSubject.complete();
    photoZoomStateSubject.complete();
  });

  describe('Complete Zoom Workflow', () => {
    it('should handle complete photo loading and zoom initialization workflow', (done) => {
      // Initialize component first
      component.ngOnInit();

      // Setup DOM elements after initialization
      const mockContainer = { clientWidth: 800, clientHeight: 600 };
      const mockImage = { naturalWidth: 1200, naturalHeight: 900 };
      component.photoContainer = { nativeElement: mockContainer } as any;
      component.photoImage = { nativeElement: mockImage } as any;

      // Simulate photo loading
      currentPhotoSubject.next(mockPhoto);
      fixture.detectChanges();

      // Simulate image load event
      component.onImageLoad();

      // Verify zoom initialization after timeout
      setTimeout(() => {
        expect(mockPhotoZoomService.initializeZoom).toHaveBeenCalled();
        expect(mockPhotoZoomService.reset).toHaveBeenCalled();
        expect(mockInterfaceToggleService.resetPhotoZoom).toHaveBeenCalled();
        
        // Verify the call was made with some dimensions (actual DOM dimensions may vary)
        const initCall = mockPhotoZoomService.initializeZoom.calls.mostRecent();
        expect(initCall.args.length).toBe(4);
        expect(typeof initCall.args[0]).toBe('number'); // container width
        expect(typeof initCall.args[1]).toBe('number'); // container height
        expect(typeof initCall.args[2]).toBe('number'); // image width
        expect(typeof initCall.args[3]).toBe('number'); // image height
        done();
      }, 10);
    });

    it('should handle zoom state changes and sync with interface service', () => {
      component.ngOnInit();

      // Simulate zoom state change
      const newZoomState = { ...mockZoomState, zoomLevel: 2.5 };
      zoomStateSubject.next(newZoomState);

      // Verify sync with interface service
      expect(mockInterfaceToggleService.setPhotoZoomState).toHaveBeenCalledWith({
        zoomLevel: 2.5,
        position: newZoomState.position,
        minZoom: newZoomState.minZoom,
        maxZoom: newZoomState.maxZoom
      });
    });

    it('should handle new photo transitions with proper reset', () => {
      component.ngOnInit();

      // Load first photo
      currentPhotoSubject.next(mockPhoto);

      // Reset call counts
      mockPhotoZoomService.reset.calls.reset();
      mockInterfaceToggleService.resetPhotoZoom.calls.reset();

      // Load new photo
      const newPhoto = { ...mockPhoto, id: 'new-photo-2' };
      currentPhotoSubject.next(newPhoto);

      // Verify reset was called for new photo
      expect(mockPhotoZoomService.reset).toHaveBeenCalled();
      expect(mockInterfaceToggleService.resetPhotoZoom).toHaveBeenCalled();
    });
  });

  describe('Pan and Zoom Interaction', () => {
    beforeEach(() => {
      component.zoomState = { ...mockZoomState, zoomLevel: 2 };
      component.ngOnInit();
    });

    it('should handle complete mouse pan workflow', () => {
      // Ensure proper zoom state for panning
      component.zoomState = { ...mockZoomState, zoomLevel: 2 };
      
      // Start pan
      const mouseDownEvent = new MouseEvent('mousedown', { clientX: 100, clientY: 200 });
      spyOn(mouseDownEvent, 'preventDefault');
      component.onMouseDown(mouseDownEvent);

      expect(mouseDownEvent.preventDefault).toHaveBeenCalled();
      expect(component.isDragging).toBe(true);

      // Pan movement
      const mouseMoveEvent = new MouseEvent('mousemove', { clientX: 150, clientY: 250 });
      spyOn(mouseMoveEvent, 'preventDefault');
      component.onMouseMove(mouseMoveEvent);

      expect(mouseMoveEvent.preventDefault).toHaveBeenCalled();
      expect(mockPhotoZoomService.pan).toHaveBeenCalledWith(50, 50);

      // End pan
      component.onMouseUp();
      expect(component.isDragging).toBe(false);
    });

    it('should handle complete touch pan workflow', () => {
      // Ensure proper zoom state for panning
      component.zoomState = { ...mockZoomState, zoomLevel: 2 };
      
      const mockTouch = { clientX: 100, clientY: 200 } as Touch;
      
      // Start touch
      const touchStartEvent = { 
        touches: [mockTouch], 
        preventDefault: jasmine.createSpy('preventDefault') 
      } as any;
      component.onTouchStart(touchStartEvent);

      expect(touchStartEvent.preventDefault).toHaveBeenCalled();
      expect(component.isDragging).toBe(true);
      expect(component.isMultiTouch).toBe(false);

      // Touch move
      const newTouch = { clientX: 150, clientY: 250 } as Touch;
      const touchMoveEvent = { 
        touches: [newTouch], 
        preventDefault: jasmine.createSpy('preventDefault') 
      } as any;
      component.onTouchMove(touchMoveEvent);

      expect(touchMoveEvent.preventDefault).toHaveBeenCalled();
      expect(mockPhotoZoomService.pan).toHaveBeenCalledWith(50, 50);

      // End touch
      const touchEndEvent = { touches: [] } as any;
      component.onTouchEnd(touchEndEvent);

      expect(component.isDragging).toBe(false);
      expect(component.isMultiTouch).toBe(false);
    });
  });

  describe('Zoom Controls Integration', () => {
    it('should handle all zoom control events', () => {
      component.onZoomControlsEvent('zoomIn');
      expect(mockPhotoZoomService.zoomIn).toHaveBeenCalled();

      component.onZoomControlsEvent('zoomOut');
      expect(mockPhotoZoomService.zoomOut).toHaveBeenCalled();

      component.onZoomControlsEvent('reset');
      expect(mockPhotoZoomService.reset).toHaveBeenCalled();
    });

    it('should provide correct zoom state information', () => {
      component.zoomState = { ...mockZoomState, zoomLevel: 2.34 };
      component.imageLoaded = true;
      component.imageError = false;
      
      expect(component.isPhotoZoomed()).toBe(true);
      expect(component.getCurrentZoomLevel()).toBe(2.3);
      expect(component.isZoomEnabled()).toBe(true);
    });
  });

  describe('Interface Toggle Integration', () => {
    it('should restore zoom state when switching back to photo view', () => {
      const mockContainer = { clientWidth: 800, clientHeight: 600 };
      const mockImage = { naturalWidth: 1200, naturalHeight: 900 };
      component.photoContainer = { nativeElement: mockContainer } as any;
      component.photoImage = { nativeElement: mockImage } as any;

      component.ngOnInit();

      // Simulate interface zoom state restoration
      const interfaceZoomState = {
        zoomLevel: 3,
        position: { x: 100, y: 50 },
        minZoom: 1,
        maxZoom: 5
      };

      photoZoomStateSubject.next(interfaceZoomState);

      // Verify restoration calls
      expect(mockPhotoZoomService.initializeZoom).toHaveBeenCalledWith(800, 600, 1200, 900);
      expect(mockPhotoZoomService.setZoomLevel).toHaveBeenCalledWith(3);
      expect(mockPhotoZoomService.setPosition).toHaveBeenCalledWith(100, 50);
    });
  });

  describe('Responsive Behavior', () => {
    it('should handle window resize events', (done) => {
      component.enableZoom = true;
      component.imageLoaded = true;
      
      const mockContainer = { clientWidth: 1000, clientHeight: 800 };
      component.photoContainer = { nativeElement: mockContainer } as any;

      component.onWindowResize();

      setTimeout(() => {
        expect(mockPhotoZoomService.updateContainerDimensions).toHaveBeenCalledWith(1000, 800);
        done();
      }, 150);
    });
  });

  describe('Error Handling', () => {
    it('should handle zoom operations when zoom is disabled', () => {
      component.enableZoom = false;

      component.onZoomControlsEvent('zoomIn');
      component.onZoomControlsEvent('zoomOut');
      component.onZoomControlsEvent('reset');

      expect(mockPhotoZoomService.zoomIn).not.toHaveBeenCalled();
      expect(mockPhotoZoomService.zoomOut).not.toHaveBeenCalled();
      expect(mockPhotoZoomService.reset).not.toHaveBeenCalled();
    });

    it('should not start pan when zoom level is at minimum', () => {
      component.zoomState = { ...mockZoomState, zoomLevel: 1 };
      
      const mouseDownEvent = new MouseEvent('mousedown', { clientX: 100, clientY: 200 });
      component.onMouseDown(mouseDownEvent);

      expect(component.isDragging).toBe(false);
    });
  });
});