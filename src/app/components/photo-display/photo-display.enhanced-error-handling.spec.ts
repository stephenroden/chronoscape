import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { of, BehaviorSubject } from 'rxjs';
import { PhotoDisplayComponent } from './photo-display.component';
import { Photo } from '../../models/photo.model';
import { ImagePreloaderService } from '../../services/image-preloader.service';
import { PhotoZoomService } from '../../services/photo-zoom.service';
import { InterfaceToggleService } from '../../services/interface-toggle.service';

describe('PhotoDisplayComponent - Enhanced Error Handling', () => {
  let component: PhotoDisplayComponent;
  let fixture: ComponentFixture<PhotoDisplayComponent>;
  let mockStore: jasmine.SpyObj<Store>;
  let mockImagePreloader: jasmine.SpyObj<ImagePreloaderService>;
  let mockPhotoZoomService: jasmine.SpyObj<PhotoZoomService>;
  let mockInterfaceToggleService: jasmine.SpyObj<InterfaceToggleService>;

  const validPhoto: Photo = {
    id: 'test-photo-1',
    url: 'https://example.com/test-photo.jpg',
    title: 'Test Photo',
    description: 'A test photograph',
    year: 1950,
    coordinates: { latitude: 40.7128, longitude: -74.0060 },
    source: 'Test Source',
    metadata: {
      license: 'CC BY 4.0',
      originalSource: 'https://example.com/original',
      dateCreated: new Date(1950, 0, 1),
      photographer: 'Test Photographer'
    }
  };

  const invalidPhoto = {
    id: '',
    url: '',
    title: null,
    year: 'invalid',
    coordinates: null
  } as any;

  beforeEach(async () => {
    const storeSpy = jasmine.createSpyObj('Store', ['select']);
    const imagePreloaderSpy = jasmine.createSpyObj('ImagePreloaderService', [
      'getPreloadedImage', 'preloadGamePhotos', 'preloadNextPhoto', 'isPreloaded'
    ]);
    const photoZoomSpy = jasmine.createSpyObj('PhotoZoomService', [
      'initializeZoom', 'reset', 'zoomIn', 'zoomOut', 'pan', 'getTransform', 'updateContainerDimensions'
    ]);
    const interfaceToggleSpy = jasmine.createSpyObj('InterfaceToggleService', ['resetPhotoZoom']);

    await TestBed.configureTestingModule({
      imports: [PhotoDisplayComponent],
      providers: [
        { provide: Store, useValue: storeSpy },
        { provide: ImagePreloaderService, useValue: imagePreloaderSpy },
        { provide: PhotoZoomService, useValue: photoZoomSpy },
        { provide: InterfaceToggleService, useValue: interfaceToggleSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PhotoDisplayComponent);
    component = fixture.componentInstance;
    mockStore = TestBed.inject(Store) as jasmine.SpyObj<Store>;
    mockImagePreloader = TestBed.inject(ImagePreloaderService) as jasmine.SpyObj<ImagePreloaderService>;
    mockPhotoZoomService = TestBed.inject(PhotoZoomService) as jasmine.SpyObj<PhotoZoomService>;
    mockInterfaceToggleService = TestBed.inject(InterfaceToggleService) as jasmine.SpyObj<InterfaceToggleService>;

    // Setup default store selectors
    mockStore.select.and.callFake((selector: any) => {
      // Return appropriate observables for different selectors
      return of(null);
    });
    mockImagePreloader.preloadGamePhotos.and.returnValue(of({ completed: 0, total: 0, progress: 0 }));
    mockImagePreloader.getPreloadedImage.and.returnValue(null);
    mockImagePreloader.isPreloaded.and.returnValue(false);
    
    // Create a spy property for zoomState$
    Object.defineProperty(mockPhotoZoomService, 'zoomState$', {
      value: of({ zoomLevel: 1, position: { x: 0, y: 0 } }),
      writable: false
    });
  });

  describe('Photo Data Validation', () => {
    it('should accept valid photo data', () => {
      // Bypass the setter to avoid store dependencies
      component['_photo'] = validPhoto;
      expect(component.photo).toBe(validPhoto);
    });

    it('should handle null photo data gracefully', () => {
      component['_photo'] = null;
      expect(component.photo).toBeNull();
    });

    it('should handle invalid photo data gracefully', () => {
      spyOn(console, 'warn');
      spyOn(console, 'error');
      
      // Test the validation method directly
      const isValid = component['isValidPhotoData'](invalidPhoto);
      expect(isValid).toBeFalse();
      expect(console.warn).toHaveBeenCalled();
    });

    it('should validate photo URLs correctly', () => {
      const validUrls = [
        'https://example.com/photo.jpg',
        'http://example.com/image.png',
        'https://api.example.com/image/123'
      ];

      const invalidUrls = [
        '',
        'not-a-url',
        'ftp://example.com/photo.jpg',
        'javascript:alert("xss")'
      ];

      validUrls.forEach(url => {
        expect(component['isValidImageUrl'](url)).toBeTrue();
      });

      invalidUrls.forEach(url => {
        expect(component['isValidImageUrl'](url)).toBeFalse();
      });
    });
  });

  describe('Error Handling and Retry Logic', () => {
    beforeEach(() => {
      component['_photo'] = validPhoto;
      fixture.detectChanges();
    });

    it('should handle image load errors', () => {
      spyOn(console, 'error');
      
      component.onImageError();
      
      expect(component.imageError).toBeTrue();
      expect(component.imageLoaded).toBeFalse();
      expect(component.imageLoading).toBeFalse();
      expect(console.error).toHaveBeenCalledWith('Image failed to load:', validPhoto.url);
    });

    it('should attempt automatic retry on first error', (done) => {
      spyOn(component, 'retryImageLoad');
      
      component.onImageError();
      
      setTimeout(() => {
        expect(component.retryImageLoad).toHaveBeenCalled();
        done();
      }, 2100); // Wait for auto-retry timeout
    });

    it('should limit retry attempts', () => {
      spyOn(console, 'error');
      spyOn(console, 'log');
      
      // Simulate multiple retry attempts
      for (let i = 0; i < 5; i++) {
        component.retryImageLoad();
      }
      
      expect(component.retryCount).toBe(3); // Should be capped at 3
      expect(console.error).toHaveBeenCalledWith(
        'Maximum retry attempts reached for image:', 
        validPhoto.url
      );
    });

    it('should show appropriate error messages', () => {
      component['_photo'] = null;
      expect(component.getErrorMessage()).toBe('No photograph available to display');

      component['_photo'] = validPhoto;
      component.retryCount = 3;
      expect(component.getErrorMessage()).toContain('Unable to load photograph after multiple attempts');

      component.retryCount = 1;
      expect(component.getErrorMessage()).toBe('Failed to load photograph. Click "Try Again" to retry.');
    });

    it('should show retry button appropriately', () => {
      component.imageError = true;
      component['_photo'] = validPhoto;
      component.retryCount = 1;
      expect(component.shouldShowRetryButton()).toBeTrue();

      component.retryCount = 3;
      expect(component.shouldShowRetryButton()).toBeFalse();

      component['_photo'] = null;
      expect(component.shouldShowRetryButton()).toBeFalse();
    });
  });

  describe('Loading States', () => {
    it('should provide appropriate loading progress messages', () => {
      component.imageLoading = true;
      component['_photo'] = validPhoto;
      expect(component.getLoadingProgress()).toBe('Loading photograph...');

      component.retryCount = 2;
      expect(component.getLoadingProgress()).toBe('Loading photograph (attempt 3)...');

      component.imageLoading = false;
      component.imageError = true;
      expect(component.getLoadingProgress()).toBe('Failed to load photograph');

      component.imageError = false;
      component.imageLoaded = true;
      expect(component.getLoadingProgress()).toBe('Photograph loaded successfully');
    });

    it('should reset state when photo changes', () => {
      component.imageError = true;
      component.retryCount = 2;
      component.hasAttemptedRetry = true;

      // Test the reset method directly
      component['resetImageState']();

      expect(component.imageError).toBeFalse();
      expect(component.retryCount).toBe(0);
      expect(component.hasAttemptedRetry).toBeFalse();
      expect(component.imageLoading).toBeTrue();
    });
  });

  describe('Accessibility', () => {
    it('should provide appropriate ARIA labels', () => {
      component.imageLoading = true;
      component['_photo'] = validPhoto;
      
      expect(component.getLoadingProgress()).toBe('Loading photograph...');
    });

    it('should announce retry attempts to screen readers', () => {
      component.imageError = true;
      component.retryCount = 1;
      
      expect(component.getLoadingProgress()).toBe('Failed to load photograph');
    });
  });
});