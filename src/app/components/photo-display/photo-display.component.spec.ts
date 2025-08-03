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

describe('PhotoDisplayComponent', () => {
  let component: PhotoDisplayComponent;
  let fixture: ComponentFixture<PhotoDisplayComponent>;
  let mockStore: jasmine.SpyObj<Store<AppState>>;
  let mockPhotoZoomService: jasmine.SpyObj<PhotoZoomService>;
  let mockInterfaceToggleService: jasmine.SpyObj<InterfaceToggleService>;
  let mockImagePreloaderService: jasmine.SpyObj<ImagePreloaderService>;
  let currentPhotoSubject: BehaviorSubject<Photo | null>;
  let photosLoadingSubject: BehaviorSubject<boolean>;
  let photosErrorSubject: BehaviorSubject<string | null>;
  let allPhotosSubject: BehaviorSubject<Photo[]>;
  let currentPhotoIndexSubject: BehaviorSubject<number>;
  let zoomStateSubject: BehaviorSubject<PhotoZoomState>;
  let photoZoomStateSubject: BehaviorSubject<any>;

  const mockPhoto: Photo = {
    id: 'test-photo-1',
    url: 'https://example.com/test-photo.jpg',
    title: 'Test Historical Photo',
    description: 'A test photo for unit testing',
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
    // Create behavior subjects for store selectors
    currentPhotoSubject = new BehaviorSubject<Photo | null>(null);
    photosLoadingSubject = new BehaviorSubject<boolean>(false);
    photosErrorSubject = new BehaviorSubject<string | null>(null);
    allPhotosSubject = new BehaviorSubject<Photo[]>([]);
    currentPhotoIndexSubject = new BehaviorSubject<number>(0);
    zoomStateSubject = new BehaviorSubject<PhotoZoomState>(mockZoomState);
    photoZoomStateSubject = new BehaviorSubject<any>(null);

    // Create mock services
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

    // Create mock store
    mockStore = jasmine.createSpyObj('Store', ['select', 'dispatch']);
    mockStore.select.and.callFake((selector: any) => {
      if (selector === PhotosSelectors.selectCurrentPhoto) {
        return currentPhotoSubject.asObservable();
      }
      if (selector === PhotosSelectors.selectPhotosLoading) {
        return photosLoadingSubject.asObservable();
      }
      if (selector === PhotosSelectors.selectPhotosError) {
        return photosErrorSubject.asObservable();
      }
      if (selector === PhotosSelectors.selectAllPhotos) {
        return allPhotosSubject.asObservable();
      }
      if (selector === GameSelectors.selectCurrentPhotoIndex) {
        return currentPhotoIndexSubject.asObservable();
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
  });

  afterEach(() => {
    currentPhotoSubject.complete();
    photosLoadingSubject.complete();
    photosErrorSubject.complete();
    allPhotosSubject.complete();
    currentPhotoIndexSubject.complete();
    zoomStateSubject.complete();
    photoZoomStateSubject.complete();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default state', () => {
      expect(component.photo).toBeNull();
      expect(component.showMetadata).toBeFalse();
      expect(component.imageLoaded).toBeFalse();
      expect(component.imageError).toBeFalse();
      expect(component.imageLoading).toBeTrue();
    });

    it('should subscribe to store selectors on init', () => {
      component.ngOnInit();
      expect(mockStore.select).toHaveBeenCalledTimes(5); // Updated to match actual calls
    });
  });

  describe('Photo Loading States', () => {
    it('should show loading state when photos are loading', () => {
      photosLoadingSubject.next(true);
      fixture.detectChanges();

      const loadingElement = fixture.nativeElement.querySelector('.photo-loading');
      expect(loadingElement).toBeTruthy();
      expect(loadingElement.textContent).toContain('Loading photograph...');
    });

    it('should show loading state when image is loading', () => {
      component.imageLoading = true;
      fixture.detectChanges();

      const loadingElement = fixture.nativeElement.querySelector('.photo-loading');
      expect(loadingElement).toBeTruthy();
    });

    it('should show skeleton placeholder during loading', () => {
      photosLoadingSubject.next(true);
      fixture.detectChanges();

      const skeletonElement = fixture.nativeElement.querySelector('.skeleton-image');
      expect(skeletonElement).toBeTruthy();
    });

    it('should have proper accessibility attributes during loading', () => {
      photosLoadingSubject.next(true);
      fixture.detectChanges();

      const loadingElement = fixture.nativeElement.querySelector('.photo-loading');
      expect(loadingElement.getAttribute('role')).toBe('status');
      expect(loadingElement.getAttribute('aria-label')).toBe('Loading photograph');
    });
  });

  describe('Error Handling', () => {
    it('should show service error when photos fail to load', () => {
      photosErrorSubject.next('Failed to fetch photos from API');
      photosLoadingSubject.next(false);
      fixture.detectChanges();

      const errorElement = fixture.nativeElement.querySelector('.service-error');
      expect(errorElement).toBeTruthy();
      expect(errorElement.textContent).toContain('Unable to Load Photos');
      expect(errorElement.textContent).toContain('Failed to fetch photos from API');
    });

    it('should show image error when individual image fails to load', () => {
      // Set up error state
      component.photo = mockPhoto;
      component.imageError = true;
      component.imageLoaded = false;
      component.imageLoading = false;
      
      photosLoadingSubject.next(false);
      photosErrorSubject.next(null);
      currentPhotoSubject.next(mockPhoto);
      fixture.detectChanges();

      const errorElement = fixture.nativeElement.querySelector('.image-error');
      expect(errorElement).toBeTruthy();
      expect(errorElement.textContent).toContain('Image Failed to Load');
    });

    it('should have retry button for image errors', () => {
      // Set up error state
      component.photo = mockPhoto;
      component.imageError = true;
      component.imageLoaded = false;
      component.imageLoading = false;
      
      photosLoadingSubject.next(false);
      photosErrorSubject.next(null);
      currentPhotoSubject.next(mockPhoto);
      fixture.detectChanges();

      const retryButton = fixture.nativeElement.querySelector('.retry-button');
      expect(retryButton).toBeTruthy();
      expect(retryButton.textContent.trim()).toBe('Try Again');
    });

    it('should have proper accessibility attributes for errors', () => {
      photosErrorSubject.next('Test error');
      photosLoadingSubject.next(false);
      fixture.detectChanges();

      const errorElement = fixture.nativeElement.querySelector('.photo-error');
      expect(errorElement.getAttribute('role')).toBe('alert');
      expect(errorElement.getAttribute('aria-live')).toBe('polite');
    });
  });

  describe('Photo Display', () => {
    beforeEach(() => {
      // Set up store state first
      photosLoadingSubject.next(false);
      photosErrorSubject.next(null);
      currentPhotoSubject.next(mockPhoto);
      
      // Initialize component to subscribe to store
      component.ngOnInit();
      
      // Set up component state
      component.imageLoaded = true;
      component.imageError = false;
      component.imageLoading = false;
      
      fixture.detectChanges();
    });

    it('should display photo when loaded successfully', () => {
      // Set the photo through the store instead of directly on component
      currentPhotoSubject.next(mockPhoto);
      fixture.detectChanges();
      
      const photoElement = fixture.nativeElement.querySelector('.photo-image');
      expect(photoElement).toBeTruthy();
      expect(photoElement.src).toBe(mockPhoto.url);
    });

    it('should display photo when loaded successfully', () => {
      const photoElement = fixture.nativeElement.querySelector('.photo-image');
      expect(photoElement).toBeTruthy();
      expect(photoElement.src).toBe(mockPhoto.url);
    });

    it('should have proper alt text for accessibility', () => {
      const photoElement = fixture.nativeElement.querySelector('.photo-image');
      expect(photoElement).toBeTruthy();
      expect(photoElement.alt).toBe(mockPhoto.title);
    });

    it('should show metadata when showMetadata is true', () => {
      component.showMetadata = true;
      fixture.detectChanges();

      const metadataElement = fixture.nativeElement.querySelector('.photo-metadata');
      expect(metadataElement).toBeTruthy();
      expect(metadataElement.textContent).toContain(mockPhoto.title);
      expect(metadataElement.textContent).toContain(mockPhoto.year.toString());
    });

    it('should hide metadata when showMetadata is false', () => {
      component.showMetadata = false;
      fixture.detectChanges();

      const metadataElement = fixture.nativeElement.querySelector('.photo-metadata');
      expect(metadataElement).toBeFalsy();
    });

    it('should have responsive image container', () => {
      const containerElement = fixture.nativeElement.querySelector('.photo-display-image-container');
      expect(containerElement).toBeTruthy();
      expect(containerElement.classList.contains('photo-display-image-container')).toBeTrue();
    });
  });

  describe('Image Event Handlers', () => {
    beforeEach(() => {
      component.photo = mockPhoto;
    });

    it('should handle image load event', () => {
      component.onImageLoad();
      
      expect(component.imageLoaded).toBeTrue();
      expect(component.imageError).toBeFalse();
      expect(component.imageLoading).toBeFalse();
    });

    it('should handle image error event', () => {
      component.onImageError();
      
      expect(component.imageLoaded).toBeFalse();
      expect(component.imageError).toBeTrue();
      expect(component.imageLoading).toBeFalse();
    });

    it('should reset image state when photo changes', () => {
      // Initialize component first
      component.ngOnInit();
      
      // Set initial state
      component.imageLoaded = true;
      component.imageError = true;
      component.imageLoading = false;

      // Simulate photo change from store with a different photo
      const newPhoto = { ...mockPhoto, id: 'different-photo' };
      currentPhotoSubject.next(newPhoto);
      
      expect(component.imageLoaded).toBeFalse();
      expect(component.imageError).toBeFalse();
      expect(component.imageLoading).toBeTrue();
    });
  });

  describe('Retry Functionality', () => {
    it('should retry image loading when retryImageLoad is called', () => {
      component.photo = mockPhoto;
      component.imageError = true;
      
      spyOn(component, 'onImageLoad');
      spyOn(component, 'onImageError');
      
      component.retryImageLoad();
      
      expect(component.imageLoaded).toBeFalse();
      expect(component.imageError).toBeFalse();
      expect(component.imageLoading).toBeTrue();
    });

    it('should not retry if no photo is available', () => {
      component.photo = null;
      const initialState = {
        imageLoaded: component.imageLoaded,
        imageError: component.imageError,
        imageLoading: component.imageLoading
      };
      
      component.retryImageLoad();
      
      expect(component.imageLoaded).toBe(initialState.imageLoaded);
      expect(component.imageError).toBe(initialState.imageError);
      expect(component.imageLoading).toBe(initialState.imageLoading);
    });
  });

  describe('Accessibility Methods', () => {
    it('should generate appropriate alt text for image', () => {
      component.photo = mockPhoto;
      component.showMetadata = false;
      
      const altText = component.getImageAltText();
      expect(altText).toBe(mockPhoto.title);
    });

    it('should generate detailed alt text when metadata is shown', () => {
      component.photo = mockPhoto;
      component.showMetadata = true;
      
      const altText = component.getImageAltText();
      expect(altText).toContain(mockPhoto.title);
      expect(altText).toContain(mockPhoto.year.toString());
      if (mockPhoto.description) {
        expect(altText).toContain(mockPhoto.description);
      }
    });

    it('should provide default alt text when no photo', () => {
      component.photo = null;
      
      const altText = component.getImageAltText();
      expect(altText).toBe('Historical photograph');
    });

    it('should provide appropriate loading aria labels', () => {
      component.imageLoading = true;
      expect(component.getLoadingAriaLabel()).toBe('Loading photograph...');
      
      component.imageLoading = false;
      component.imageError = true;
      expect(component.getLoadingAriaLabel()).toBe('Failed to load photograph');
      
      component.imageError = false;
      component.imageLoaded = true;
      expect(component.getLoadingAriaLabel()).toBe('Photograph loaded successfully');
    });
  });

  describe('No Photo State', () => {
    it('should show no photo message when no photo is available', () => {
      component.photo = null;
      photosLoadingSubject.next(false);
      photosErrorSubject.next(null);
      fixture.detectChanges();

      const noPhotoElement = fixture.nativeElement.querySelector('.no-photo');
      expect(noPhotoElement).toBeTruthy();
      expect(noPhotoElement.textContent).toContain('No photograph to display');
    });
  });

  describe('Responsive Behavior', () => {
    it('should have responsive CSS classes', () => {
      const containerElement = fixture.nativeElement.querySelector('.photo-display-container');
      expect(containerElement).toBeTruthy();
      expect(containerElement.classList.contains('photo-display-container')).toBeTrue();
    });

    it('should maintain aspect ratio in photo container when photo is displayed', () => {
      // Set up photo display state
      component.photo = mockPhoto;
      component.imageLoaded = true;
      component.imageError = false;
      component.imageLoading = false;
      
      photosLoadingSubject.next(false);
      photosErrorSubject.next(null);
      currentPhotoSubject.next(mockPhoto);
      fixture.detectChanges();

      const containerElement = fixture.nativeElement.querySelector('.photo-display-image-container');
      expect(containerElement).toBeTruthy();
      expect(containerElement.classList.contains('photo-display-image-container')).toBeTrue();
    });
  });

  describe('Zoom Functionality', () => {
    beforeEach(() => {
      component.enableZoom = true;
      component.imageLoaded = true;
      component.imageError = false;
      component.photo = mockPhoto;
    });

    it('should initialize zoom when image loads', (done) => {
      // Mock DOM elements
      const mockContainer = { clientWidth: 800, clientHeight: 600 };
      const mockImage = { naturalWidth: 1200, naturalHeight: 900 };
      
      component.photoContainer = { nativeElement: mockContainer } as any;
      component.photoImage = { nativeElement: mockImage } as any;
      
      component.onImageLoad();
      
      // Should initialize zoom after a timeout
      setTimeout(() => {
        expect(mockPhotoZoomService.initializeZoom).toHaveBeenCalledWith(800, 600, 1200, 900);
        done();
      }, 10);
    });

    it('should reset zoom when new photo loads', () => {
      component.ngOnInit();
      
      // Simulate new photo
      const newPhoto = { ...mockPhoto, id: 'new-photo' };
      currentPhotoSubject.next(newPhoto);
      
      expect(mockPhotoZoomService.reset).toHaveBeenCalled();
      expect(mockInterfaceToggleService.resetPhotoZoom).toHaveBeenCalled();
    });

    it('should sync zoom state with interface toggle service', () => {
      component.ngOnInit();
      
      const newZoomState = { ...mockZoomState, zoomLevel: 2 };
      const expectedInterfaceState = {
        zoomLevel: 2,
        position: newZoomState.position,
        minZoom: newZoomState.minZoom,
        maxZoom: newZoomState.maxZoom
      };
      
      zoomStateSubject.next(newZoomState);
      
      expect(mockInterfaceToggleService.setPhotoZoomState).toHaveBeenCalledWith(expectedInterfaceState);
    });

    it('should handle zoom controls events', () => {
      component.onZoomControlsEvent('zoomIn');
      expect(mockPhotoZoomService.zoomIn).toHaveBeenCalled();
      
      component.onZoomControlsEvent('zoomOut');
      expect(mockPhotoZoomService.zoomOut).toHaveBeenCalled();
      
      component.onZoomControlsEvent('reset');
      expect(mockPhotoZoomService.reset).toHaveBeenCalled();
    });

    it('should check if photo is zoomed', () => {
      component.zoomState = { ...mockZoomState, zoomLevel: 2 };
      expect(component.isPhotoZoomed()).toBe(true);
      
      component.zoomState = { ...mockZoomState, zoomLevel: 1 };
      expect(component.isPhotoZoomed()).toBe(false);
    });

    it('should get current zoom level', () => {
      component.zoomState = { ...mockZoomState, zoomLevel: 2.34 };
      expect(component.getCurrentZoomLevel()).toBe(2.3);
    });

    it('should check if zoom is enabled', () => {
      expect(component.isZoomEnabled()).toBe(true);
      
      component.imageLoaded = false;
      expect(component.isZoomEnabled()).toBe(false);
      
      component.imageLoaded = true;
      component.imageError = true;
      expect(component.isZoomEnabled()).toBe(false);
      
      component.imageError = false;
      component.enableZoom = false;
      expect(component.isZoomEnabled()).toBe(false);
    });
  });

  describe('Pan Functionality', () => {
    beforeEach(() => {
      component.enableZoom = true;
      component.zoomState = { ...mockZoomState, zoomLevel: 2 };
    });

    it('should handle mouse down for pan start', () => {
      const mockEvent = new MouseEvent('mousedown', { clientX: 100, clientY: 200 });
      spyOn(mockEvent, 'preventDefault');
      
      component.onMouseDown(mockEvent);
      
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(component.isDragging).toBe(true);
      expect(component.lastPanPoint).toEqual({ x: 100, y: 200 });
    });

    it('should not start pan if zoom level is 1 or less', () => {
      component.zoomState = { ...mockZoomState, zoomLevel: 1 };
      const mockEvent = new MouseEvent('mousedown', { clientX: 100, clientY: 200 });
      
      component.onMouseDown(mockEvent);
      
      expect(component.isDragging).toBe(false);
    });

    it('should handle mouse move for panning', () => {
      component.isDragging = true;
      component.lastPanPoint = { x: 100, y: 200 };
      
      const mockEvent = new MouseEvent('mousemove', { clientX: 150, clientY: 250 });
      spyOn(mockEvent, 'preventDefault');
      
      component.onMouseMove(mockEvent);
      
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockPhotoZoomService.pan).toHaveBeenCalledWith(50, 50);
      expect(component.lastPanPoint).toEqual({ x: 150, y: 250 });
    });

    it('should not pan if not dragging', () => {
      component.isDragging = false;
      const mockEvent = new MouseEvent('mousemove', { clientX: 150, clientY: 250 });
      
      component.onMouseMove(mockEvent);
      
      expect(mockPhotoZoomService.pan).not.toHaveBeenCalled();
    });

    it('should stop dragging on mouse up', () => {
      component.isDragging = true;
      
      component.onMouseUp();
      
      expect(component.isDragging).toBe(false);
    });
  });

  describe('Touch Gestures', () => {
    beforeEach(() => {
      component.enableZoom = true;
      component.zoomState = { ...mockZoomState, zoomLevel: 2 };
    });

    it('should handle single touch start for pan', () => {
      const mockTouch = { clientX: 100, clientY: 200 } as Touch;
      const mockEvent = { 
        touches: [mockTouch], 
        preventDefault: jasmine.createSpy('preventDefault') 
      } as any;
      
      component.onTouchStart(mockEvent);
      
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(component.isDragging).toBe(true);
      expect(component.isMultiTouch).toBe(false);
      expect(component.lastPanPoint).toEqual({ x: 100, y: 200 });
    });

    it('should handle multi-touch start for pinch', () => {
      const mockTouch1 = { clientX: 100, clientY: 200 } as Touch;
      const mockTouch2 = { clientX: 200, clientY: 300 } as Touch;
      const mockEvent = { 
        touches: [mockTouch1, mockTouch2], 
        preventDefault: jasmine.createSpy('preventDefault') 
      } as any;
      
      component.onTouchStart(mockEvent);
      
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(component.isDragging).toBe(false);
      expect(component.isMultiTouch).toBe(true);
      expect(component.touchStartDistance).toBeGreaterThan(0);
    });

    it('should handle single touch move for pan', () => {
      component.isDragging = true;
      component.isMultiTouch = false;
      component.lastPanPoint = { x: 100, y: 200 };
      
      const mockTouch = { clientX: 150, clientY: 250 } as Touch;
      const mockEvent = { 
        touches: [mockTouch], 
        preventDefault: jasmine.createSpy('preventDefault') 
      } as any;
      
      component.onTouchMove(mockEvent);
      
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockPhotoZoomService.pan).toHaveBeenCalledWith(50, 50);
    });

    it('should handle multi-touch move for pinch zoom', () => {
      component.isMultiTouch = true;
      component.touchStartDistance = 100;
      
      const mockTouch1 = { clientX: 100, clientY: 200 } as Touch;
      const mockTouch2 = { clientX: 300, clientY: 400 } as Touch;
      const mockEvent = { 
        touches: [mockTouch1, mockTouch2], 
        preventDefault: jasmine.createSpy('preventDefault') 
      } as any;
      
      component.onTouchMove(mockEvent);
      
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockPhotoZoomService.handlePinchZoom).toHaveBeenCalled();
    });

    it('should handle touch end', () => {
      component.isDragging = true;
      component.isMultiTouch = true;
      
      const mockEvent = { touches: [] } as any;
      
      component.onTouchEnd(mockEvent);
      
      expect(component.isDragging).toBe(false);
      expect(component.isMultiTouch).toBe(false);
      expect(component.touchStartDistance).toBe(0);
    });
  });

  describe('Window Resize Handling', () => {
    it('should update container dimensions on window resize', (done) => {
      component.enableZoom = true;
      component.imageLoaded = true;
      
      const mockContainer = { clientWidth: 900, clientHeight: 700 };
      component.photoContainer = { nativeElement: mockContainer } as any;
      
      component.onWindowResize();
      
      setTimeout(() => {
        expect(mockPhotoZoomService.updateContainerDimensions).toHaveBeenCalledWith(900, 700);
        done();
      }, 150);
    });

    it('should not update dimensions if zoom is disabled', (done) => {
      component.enableZoom = false;
      
      component.onWindowResize();
      
      setTimeout(() => {
        expect(mockPhotoZoomService.updateContainerDimensions).not.toHaveBeenCalled();
        done();
      }, 150);
    });
  });

  describe('Interface Toggle Integration', () => {
    it('should restore zoom state from interface service', () => {
      component.enableZoom = true;
      const mockContainer = { clientWidth: 800, clientHeight: 600 };
      const mockImage = { naturalWidth: 1200, naturalHeight: 900 };
      
      component.photoContainer = { nativeElement: mockContainer } as any;
      component.photoImage = { nativeElement: mockImage } as any;
      
      const interfaceZoomState = {
        zoomLevel: 2,
        position: { x: 50, y: 100 },
        minZoom: 1,
        maxZoom: 5
      };
      
      component['restoreZoomStateFromInterface'](interfaceZoomState);
      
      expect(mockPhotoZoomService.initializeZoom).toHaveBeenCalledWith(800, 600, 1200, 900);
      expect(mockPhotoZoomService.setZoomLevel).toHaveBeenCalledWith(2);
      expect(mockPhotoZoomService.setPosition).toHaveBeenCalledWith(50, 100);
    });

    it('should sync zoom state changes with interface service', () => {
      const newZoomState = { ...mockZoomState, zoomLevel: 3 };
      const expectedInterfaceState = {
        zoomLevel: 3,
        position: newZoomState.position,
        minZoom: newZoomState.minZoom,
        maxZoom: newZoomState.maxZoom
      };
      
      component['syncZoomStateWithInterface'](newZoomState);
      
      expect(mockInterfaceToggleService.setPhotoZoomState).toHaveBeenCalledWith(expectedInterfaceState);
    });
  });

  describe('Component Cleanup', () => {
    it('should unsubscribe from observables on destroy', () => {
      component.ngOnInit();
      spyOn(component['subscriptions'], 'unsubscribe');
      
      component.ngOnDestroy();
      
      expect(component['subscriptions'].unsubscribe).toHaveBeenCalled();
    });
  });
});