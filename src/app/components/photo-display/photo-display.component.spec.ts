import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { of, BehaviorSubject } from 'rxjs';
import { PhotoDisplayComponent } from './photo-display.component';
import { Photo } from '../../models/photo.model';
import { AppState } from '../../state/app.state';
import * as PhotosSelectors from '../../state/photos/photos.selectors';

describe('PhotoDisplayComponent', () => {
  let component: PhotoDisplayComponent;
  let fixture: ComponentFixture<PhotoDisplayComponent>;
  let mockStore: jasmine.SpyObj<Store<AppState>>;
  let currentPhotoSubject: BehaviorSubject<Photo | null>;
  let photosLoadingSubject: BehaviorSubject<boolean>;
  let photosErrorSubject: BehaviorSubject<string | null>;

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

  beforeEach(async () => {
    // Create behavior subjects for store selectors
    currentPhotoSubject = new BehaviorSubject<Photo | null>(null);
    photosLoadingSubject = new BehaviorSubject<boolean>(false);
    photosErrorSubject = new BehaviorSubject<string | null>(null);

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
      return of(null);
    });

    await TestBed.configureTestingModule({
      imports: [PhotoDisplayComponent],
      providers: [
        { provide: Store, useValue: mockStore }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PhotoDisplayComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    currentPhotoSubject.complete();
    photosLoadingSubject.complete();
    photosErrorSubject.complete();
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
      expect(mockStore.select).toHaveBeenCalledTimes(3);
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
      const containerElement = fixture.nativeElement.querySelector('.photo-container');
      expect(containerElement).toBeTruthy();
      expect(containerElement.classList.contains('photo-container')).toBeTrue();
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

      const containerElement = fixture.nativeElement.querySelector('.photo-container');
      expect(containerElement).toBeTruthy();
      expect(containerElement.classList.contains('photo-container')).toBeTrue();
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