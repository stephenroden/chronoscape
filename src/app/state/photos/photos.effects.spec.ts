import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { PhotosEffects } from './photos.effects';
import { PhotoService } from '../../services/photo.service';
import { provideMockStore } from '@ngrx/store/testing';
import { Actions } from '@ngrx/effects';
import { provideMockActions } from '@ngrx/effects/testing';
import * as PhotosActions from './photos.actions';
import { Photo } from '../../models/photo.model';

describe('PhotosEffects', () => {
  let actions$: Observable<any>;
  let effects: PhotosEffects;
  let photoServiceSpy: jasmine.SpyObj<PhotoService>;

  const mockPhoto: Photo = {
    id: 'test-photo-1',
    url: 'https://example.com/photo1.jpg',
    title: 'Test Photo',
    description: 'A test photo',
    year: 1950,
    coordinates: { latitude: 40.7128, longitude: -74.0060 },
    source: 'Test Source',
    metadata: {
      photographer: 'Test Photographer',
      license: 'CC BY 4.0',
      originalSource: 'https://example.com/original',
      dateCreated: new Date('1950-01-01')
    }
  };

  const mockPhotos: Photo[] = [
    mockPhoto,
    {
      ...mockPhoto,
      id: 'test-photo-2',
      title: 'Test Photo 2'
    },
    {
      ...mockPhoto,
      id: 'test-photo-3',
      title: 'Test Photo 3'
    },
    {
      ...mockPhoto,
      id: 'test-photo-4',
      title: 'Test Photo 4'
    },
    {
      ...mockPhoto,
      id: 'test-photo-5',
      title: 'Test Photo 5'
    }
  ];

  beforeEach(() => {
    photoServiceSpy = jasmine.createSpyObj('PhotoService', ['fetchRandomPhotos', 'validatePhotoMetadata']);
    
    TestBed.configureTestingModule({
      providers: [
        PhotosEffects,
        provideMockStore(),
        provideMockActions(() => actions$),
        { provide: PhotoService, useValue: photoServiceSpy },
      ],
    });

    effects = TestBed.inject(PhotosEffects);
    actions$ = TestBed.inject(Actions);
  });

  describe('loadPhotos$', () => {
    it('should return loadPhotosSuccess when photos are loaded successfully', (done) => {
      const action = PhotosActions.loadPhotos();
      actions$ = of(action);
      photoServiceSpy.fetchRandomPhotos.and.returnValue(of(mockPhotos));

      effects.loadPhotos$.subscribe(result => {
        expect(result).toEqual(PhotosActions.loadPhotosSuccess({ photos: mockPhotos }));
        done();
      });
    });

    it('should return loadPhotosFailure when no photos are found', (done) => {
      const action = PhotosActions.loadPhotos();
      actions$ = of(action);
      photoServiceSpy.fetchRandomPhotos.and.returnValue(of([]));

      effects.loadPhotos$.subscribe(result => {
        expect(result).toEqual(PhotosActions.loadPhotosFailure({
          error: 'No suitable photos found. Please try again.'
        }));
        done();
      });
    });

    it('should warn when fewer than 5 photos are found but still succeed', (done) => {
      spyOn(console, 'warn');
      const partialPhotos = mockPhotos.slice(0, 3);
      const action = PhotosActions.loadPhotos();
      actions$ = of(action);
      photoServiceSpy.fetchRandomPhotos.and.returnValue(of(partialPhotos));

      effects.loadPhotos$.subscribe(result => {
        expect(result).toEqual(PhotosActions.loadPhotosSuccess({ photos: partialPhotos }));
        expect(console.warn).toHaveBeenCalledWith('Only 3 photos found, expected 5');
        done();
      });
    });

    it('should return loadPhotosFailure with network error message when status is 0', (done) => {
      spyOn(console, 'error');
      const action = PhotosActions.loadPhotos();
      const error = { status: 0 };
      actions$ = of(action);
      photoServiceSpy.fetchRandomPhotos.and.returnValue(throwError(() => error));

      effects.loadPhotos$.subscribe(result => {
        expect(result).toEqual(PhotosActions.loadPhotosFailure({
          error: 'Network connection failed. Please check your internet connection and try again.'
        }));
        expect(console.error).toHaveBeenCalledWith('Error loading photos:', error);
        done();
      });
    });

    it('should return loadPhotosFailure with rate limit message when status is 429', (done) => {
      spyOn(console, 'error');
      const action = PhotosActions.loadPhotos();
      const error = { status: 429 };
      actions$ = of(action);
      photoServiceSpy.fetchRandomPhotos.and.returnValue(throwError(() => error));

      effects.loadPhotos$.subscribe(result => {
        expect(result).toEqual(PhotosActions.loadPhotosFailure({
          error: 'Too many requests. Please wait a moment and try again.'
        }));
        expect(console.error).toHaveBeenCalledWith('Error loading photos:', error);
        done();
      });
    });

    it('should return loadPhotosFailure with server error message when status >= 500', (done) => {
      spyOn(console, 'error');
      const action = PhotosActions.loadPhotos();
      const error = { status: 500 };
      actions$ = of(action);
      photoServiceSpy.fetchRandomPhotos.and.returnValue(throwError(() => error));

      effects.loadPhotos$.subscribe(result => {
        expect(result).toEqual(PhotosActions.loadPhotosFailure({
          error: 'Server error occurred. Please try again later.'
        }));
        expect(console.error).toHaveBeenCalledWith('Error loading photos:', error);
        done();
      });
    });

    it('should return loadPhotosFailure with access denied message when status is 403', (done) => {
      spyOn(console, 'error');
      const action = PhotosActions.loadPhotos();
      const error = { status: 403 };
      actions$ = of(action);
      photoServiceSpy.fetchRandomPhotos.and.returnValue(throwError(() => error));

      effects.loadPhotos$.subscribe(result => {
        expect(result).toEqual(PhotosActions.loadPhotosFailure({
          error: 'Access to photo service denied. Please try again later.'
        }));
        expect(console.error).toHaveBeenCalledWith('Error loading photos:', error);
        done();
      });
    });

    it('should return loadPhotosFailure with not found message when status is 404', (done) => {
      spyOn(console, 'error');
      const action = PhotosActions.loadPhotos();
      const error = { status: 404 };
      actions$ = of(action);
      photoServiceSpy.fetchRandomPhotos.and.returnValue(throwError(() => error));

      effects.loadPhotos$.subscribe(result => {
        expect(result).toEqual(PhotosActions.loadPhotosFailure({
          error: 'Photo service not found. Please try again later.'
        }));
        expect(console.error).toHaveBeenCalledWith('Error loading photos:', error);
        done();
      });
    });

    it('should return loadPhotosFailure with custom message when error has message', (done) => {
      spyOn(console, 'error');
      const action = PhotosActions.loadPhotos();
      const error = { message: 'Custom error message' };
      actions$ = of(action);
      photoServiceSpy.fetchRandomPhotos.and.returnValue(throwError(() => error));

      effects.loadPhotos$.subscribe(result => {
        expect(result).toEqual(PhotosActions.loadPhotosFailure({
          error: 'Error loading photos: Custom error message'
        }));
        expect(console.error).toHaveBeenCalledWith('Error loading photos:', error);
        done();
      });
    });

    it('should return loadPhotosFailure with generic message for unknown errors', (done) => {
      spyOn(console, 'error');
      const action = PhotosActions.loadPhotos();
      const error = { someProperty: 'unknown error' };
      actions$ = of(action);
      photoServiceSpy.fetchRandomPhotos.and.returnValue(throwError(() => error));

      effects.loadPhotos$.subscribe(result => {
        expect(result).toEqual(PhotosActions.loadPhotosFailure({
          error: 'An unexpected error occurred while loading photos. Please try again.'
        }));
        expect(console.error).toHaveBeenCalledWith('Error loading photos:', error);
        done();
      });
    });
  });

  describe('validatePhoto$', () => {
    it('should return photoValidationSuccess when photo is valid', (done) => {
      const action = PhotosActions.validatePhoto({ photo: mockPhoto });
      actions$ = of(action);
      photoServiceSpy.validatePhotoMetadata.and.returnValue(true);

      effects.validatePhoto$.subscribe(result => {
        expect(result).toEqual(PhotosActions.photoValidationSuccess({ photo: mockPhoto }));
        expect(photoServiceSpy.validatePhotoMetadata).toHaveBeenCalledWith(mockPhoto);
        done();
      });
    });

    it('should return photoValidationFailure when photo is invalid', (done) => {
      const action = PhotosActions.validatePhoto({ photo: mockPhoto });
      actions$ = of(action);
      photoServiceSpy.validatePhotoMetadata.and.returnValue(false);

      effects.validatePhoto$.subscribe(result => {
        expect(result).toEqual(PhotosActions.photoValidationFailure({
          photoId: mockPhoto.id,
          error: 'Photo does not meet validation requirements'
        }));
        expect(photoServiceSpy.validatePhotoMetadata).toHaveBeenCalledWith(mockPhoto);
        done();
      });
    });

    it('should return photoValidationFailure when validation throws an error', (done) => {
      spyOn(console, 'error');
      const action = PhotosActions.validatePhoto({ photo: mockPhoto });
      actions$ = of(action);
      photoServiceSpy.validatePhotoMetadata.and.throwError('Validation error');

      effects.validatePhoto$.subscribe(result => {
        expect(result).toEqual(PhotosActions.photoValidationFailure({
          photoId: mockPhoto.id,
          error: 'Photo validation failed due to an error'
        }));
        expect(console.error).toHaveBeenCalledWith('Error validating photo:', jasmine.any(Error));
        expect(photoServiceSpy.validatePhotoMetadata).toHaveBeenCalledWith(mockPhoto);
        done();
      });
    });
  });

  describe('logPhotosSuccess$', () => {
    it('should log successful photo loading', (done) => {
      spyOn(console, 'log');
      const action = PhotosActions.loadPhotosSuccess({ photos: mockPhotos });
      actions$ = of(action);

      effects.logPhotosSuccess$.subscribe(() => {
        expect(console.log).toHaveBeenCalledWith(
          'Successfully loaded 5 photos:',
          mockPhotos.map(p => ({ id: p.id, year: p.year, title: p.title }))
        );
        done();
      });
    });
  });

  describe('logPhotosFailure$', () => {
    it('should log photo loading failures', (done) => {
      spyOn(console, 'error');
      const errorMessage = 'Test error message';
      const action = PhotosActions.loadPhotosFailure({ error: errorMessage });
      actions$ = of(action);

      effects.logPhotosFailure$.subscribe(() => {
        expect(console.error).toHaveBeenCalledWith('Photo loading failed:', errorMessage);
        done();
      });
    });
  });
});