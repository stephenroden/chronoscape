import { photosReducer, initialPhotosState } from './photos.reducer';
import * as PhotosActions from './photos.actions';
import { Photo } from '../../models/photo.model';

describe('Photos Reducer', () => {
  const mockPhoto: Photo = {
    id: 'test-1',
    url: 'https://example.com/photo.jpg',
    title: 'Test Photo',
    description: 'A test photo',
    year: 1950,
    coordinates: { latitude: 40.7128, longitude: -74.0060 },
    source: 'test-source',
    metadata: {
      license: 'CC BY-SA',
      originalSource: 'https://example.com',
      dateCreated: new Date('1950-01-01')
    }
  };

  const mockPhotos = [mockPhoto];

  describe('unknown action', () => {
    it('should return the previous state', () => {
      const action = {} as any;
      const result = photosReducer(initialPhotosState, action);

      expect(result).toBe(initialPhotosState);
    });
  });

  describe('loadPhotos action', () => {
    it('should set loading to true and clear error', () => {
      const state = {
        ...initialPhotosState,
        error: 'Previous error'
      };

      const action = PhotosActions.loadPhotos();
      const result = photosReducer(state, action);

      expect(result.loading).toBe(true);
      expect(result.error).toBeNull();
    });
  });

  describe('loadPhotosSuccess action', () => {
    it('should set photos, clear loading, and set current photo', () => {
      const state = {
        ...initialPhotosState,
        loading: true
      };

      const action = PhotosActions.loadPhotosSuccess({ photos: mockPhotos });
      const result = photosReducer(state, action);

      expect(result.photos).toEqual(mockPhotos);
      expect(result.loading).toBe(false);
      expect(result.error).toBeNull();
      expect(result.currentPhoto).toEqual(mockPhoto);
    });

    it('should set current photo to null if no photos provided', () => {
      const state = {
        ...initialPhotosState,
        loading: true
      };

      const action = PhotosActions.loadPhotosSuccess({ photos: [] });
      const result = photosReducer(state, action);

      expect(result.photos).toEqual([]);
      expect(result.currentPhoto).toBeNull();
    });
  });

  describe('loadPhotosFailure action', () => {
    it('should set error, clear loading, and reset photos', () => {
      const state = {
        ...initialPhotosState,
        loading: true,
        photos: mockPhotos
      };

      const error = 'Failed to load photos';
      const action = PhotosActions.loadPhotosFailure({ error });
      const result = photosReducer(state, action);

      expect(result.loading).toBe(false);
      expect(result.error).toBe(error);
      expect(result.photos).toEqual([]);
      expect(result.currentPhoto).toBeNull();
    });
  });

  describe('setCurrentPhoto action', () => {
    it('should set current photo by index', () => {
      const state = {
        ...initialPhotosState,
        photos: mockPhotos
      };

      const action = PhotosActions.setCurrentPhoto({ photoIndex: 0 });
      const result = photosReducer(state, action);

      expect(result.currentPhoto).toEqual(mockPhoto);
    });

    it('should set current photo to null for invalid index', () => {
      const state = {
        ...initialPhotosState,
        photos: mockPhotos
      };

      const action = PhotosActions.setCurrentPhoto({ photoIndex: 5 });
      const result = photosReducer(state, action);

      expect(result.currentPhoto).toBeNull();
    });
  });

  describe('clearCurrentPhoto action', () => {
    it('should set current photo to null', () => {
      const state = {
        ...initialPhotosState,
        currentPhoto: mockPhoto
      };

      const action = PhotosActions.clearCurrentPhoto();
      const result = photosReducer(state, action);

      expect(result.currentPhoto).toBeNull();
    });
  });

  describe('validatePhoto action', () => {
    it('should set loading to true', () => {
      const action = PhotosActions.validatePhoto({ photo: mockPhoto });
      const result = photosReducer(initialPhotosState, action);

      expect(result.loading).toBe(true);
    });
  });

  describe('photoValidationSuccess action', () => {
    it('should set loading to false', () => {
      const state = {
        ...initialPhotosState,
        loading: true
      };

      const action = PhotosActions.photoValidationSuccess({ photo: mockPhoto });
      const result = photosReducer(state, action);

      expect(result.loading).toBe(false);
    });
  });

  describe('photoValidationFailure action', () => {
    it('should set loading to false and set error', () => {
      const state = {
        ...initialPhotosState,
        loading: true
      };

      const error = 'Validation failed';
      const action = PhotosActions.photoValidationFailure({ 
        photoId: 'test-1', 
        error 
      });
      const result = photosReducer(state, action);

      expect(result.loading).toBe(false);
      expect(result.error).toBe(error);
    });
  });
});