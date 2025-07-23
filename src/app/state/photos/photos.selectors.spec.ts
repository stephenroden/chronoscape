import { PhotoState } from '../../models/game-state.model';
import { Photo } from '../../models/photo.model';
import * as PhotosSelectors from './photos.selectors';

describe('Photos Selectors', () => {
  const mockPhotos: Photo[] = [
    {
      id: 'photo-1',
      url: 'https://example.com/photo1.jpg',
      title: 'Historic Building',
      year: 1925,
      coordinates: { latitude: 40.7128, longitude: -74.0060 },
      source: 'Wikimedia Commons',
      metadata: {
        license: 'CC BY-SA 4.0',
        originalSource: 'https://example.com/photo1.jpg',
        dateCreated: new Date(1925, 0, 1)
      }
    },
    {
      id: 'photo-2',
      url: 'https://example.com/photo2.jpg',
      title: 'Street Scene',
      year: 1950,
      coordinates: { latitude: 51.5074, longitude: -0.1278 },
      source: 'Wikimedia Commons',
      metadata: {
        license: 'CC BY-SA 4.0',
        originalSource: 'https://example.com/photo2.jpg',
        dateCreated: new Date(1950, 0, 1)
      }
    },
    {
      id: 'photo-3',
      url: 'https://example.com/photo3.jpg',
      title: 'Market Square',
      year: 1960,
      coordinates: { latitude: 48.8566, longitude: 2.3522 },
      source: 'Wikimedia Commons',
      metadata: {
        license: 'CC BY-SA 4.0',
        originalSource: 'https://example.com/photo3.jpg',
        dateCreated: new Date(1960, 0, 1)
      }
    }
  ];

  const initialState: PhotoState = {
    photos: [],
    currentPhoto: null,
    loading: false,
    error: null
  };

  const loadedState: PhotoState = {
    photos: mockPhotos,
    currentPhoto: mockPhotos[1], // Second photo is current
    loading: false,
    error: null
  };

  const loadingState: PhotoState = {
    photos: [],
    currentPhoto: null,
    loading: true,
    error: null
  };

  const errorState: PhotoState = {
    photos: [],
    currentPhoto: null,
    loading: false,
    error: 'Failed to load photos'
  };

  describe('selectPhotosState', () => {
    it('should select the photos state', () => {
      const result = PhotosSelectors.selectPhotosState.projector(loadedState);
      expect(result).toEqual(loadedState);
    });
  });

  describe('selectAllPhotos', () => {
    it('should select all photos from state', () => {
      const result = PhotosSelectors.selectAllPhotos.projector(loadedState);
      expect(result).toEqual(mockPhotos);
    });

    it('should return empty array when no photos loaded', () => {
      const result = PhotosSelectors.selectAllPhotos.projector(initialState);
      expect(result).toEqual([]);
    });
  });

  describe('selectCurrentPhoto', () => {
    it('should select current photo from state', () => {
      const result = PhotosSelectors.selectCurrentPhoto.projector(loadedState);
      expect(result).toEqual(mockPhotos[1]);
    });

    it('should return null when no current photo', () => {
      const result = PhotosSelectors.selectCurrentPhoto.projector(initialState);
      expect(result).toBeNull();
    });
  });

  describe('selectPhotosLoading', () => {
    it('should select loading state as true when loading', () => {
      const result = PhotosSelectors.selectPhotosLoading.projector(loadingState);
      expect(result).toBe(true);
    });

    it('should select loading state as false when not loading', () => {
      const result = PhotosSelectors.selectPhotosLoading.projector(loadedState);
      expect(result).toBe(false);
    });
  });

  describe('selectPhotosError', () => {
    it('should select error message when error exists', () => {
      const result = PhotosSelectors.selectPhotosError.projector(errorState);
      expect(result).toBe('Failed to load photos');
    });

    it('should return null when no error', () => {
      const result = PhotosSelectors.selectPhotosError.projector(loadedState);
      expect(result).toBeNull();
    });
  });

  describe('selectPhotosCount', () => {
    it('should return correct count of photos', () => {
      const result = PhotosSelectors.selectPhotosCount.projector(mockPhotos);
      expect(result).toBe(3);
    });

    it('should return 0 when no photos', () => {
      const result = PhotosSelectors.selectPhotosCount.projector([]);
      expect(result).toBe(0);
    });
  });

  describe('selectHasPhotos', () => {
    it('should return true when photos exist', () => {
      const result = PhotosSelectors.selectHasPhotos.projector(3);
      expect(result).toBe(true);
    });

    it('should return false when no photos', () => {
      const result = PhotosSelectors.selectHasPhotos.projector(0);
      expect(result).toBe(false);
    });
  });

  describe('selectPhotoById', () => {
    it('should return photo with matching id', () => {
      const selector = PhotosSelectors.selectPhotoById('photo-2');
      const result = selector.projector(mockPhotos);
      expect(result).toEqual(mockPhotos[1]);
    });

    it('should return null when photo id not found', () => {
      const selector = PhotosSelectors.selectPhotoById('non-existent');
      const result = selector.projector(mockPhotos);
      expect(result).toBeNull();
    });

    it('should return null when photos array is empty', () => {
      const selector = PhotosSelectors.selectPhotoById('photo-1');
      const result = selector.projector([]);
      expect(result).toBeNull();
    });
  });

  describe('selectPhotoByIndex', () => {
    it('should return photo at specified index', () => {
      const selector = PhotosSelectors.selectPhotoByIndex(1);
      const result = selector.projector(mockPhotos);
      expect(result).toEqual(mockPhotos[1]);
    });

    it('should return photo at index 0', () => {
      const selector = PhotosSelectors.selectPhotoByIndex(0);
      const result = selector.projector(mockPhotos);
      expect(result).toEqual(mockPhotos[0]);
    });

    it('should return null when index is out of bounds', () => {
      const selector = PhotosSelectors.selectPhotoByIndex(10);
      const result = selector.projector(mockPhotos);
      expect(result).toBeNull();
    });

    it('should return null when index is negative', () => {
      const selector = PhotosSelectors.selectPhotoByIndex(-1);
      const result = selector.projector(mockPhotos);
      expect(result).toBeNull();
    });

    it('should return null when photos array is empty', () => {
      const selector = PhotosSelectors.selectPhotoByIndex(0);
      const result = selector.projector([]);
      expect(result).toBeNull();
    });
  });

  describe('selectCurrentPhotoIndex', () => {
    it('should return correct index of current photo', () => {
      const result = PhotosSelectors.selectCurrentPhotoIndex.projector(mockPhotos, mockPhotos[1]);
      expect(result).toBe(1);
    });

    it('should return 0 for first photo', () => {
      const result = PhotosSelectors.selectCurrentPhotoIndex.projector(mockPhotos, mockPhotos[0]);
      expect(result).toBe(0);
    });

    it('should return -1 when no current photo', () => {
      const result = PhotosSelectors.selectCurrentPhotoIndex.projector(mockPhotos, null);
      expect(result).toBe(-1);
    });

    it('should return -1 when current photo not in photos array', () => {
      const differentPhoto: Photo = {
        id: 'different-photo',
        url: 'https://example.com/different.jpg',
        title: 'Different Photo',
        year: 1970,
        coordinates: { latitude: 0, longitude: 0 },
        source: 'Wikimedia Commons',
        metadata: {
          license: 'CC BY-SA 4.0',
          originalSource: 'https://example.com/different.jpg',
          dateCreated: new Date(1970, 0, 1)
        }
      };
      const result = PhotosSelectors.selectCurrentPhotoIndex.projector(mockPhotos, differentPhoto);
      expect(result).toBe(-1);
    });

    it('should return -1 when photos array is empty', () => {
      const result = PhotosSelectors.selectCurrentPhotoIndex.projector([], mockPhotos[0]);
      expect(result).toBe(-1);
    });
  });

  describe('selectIsPhotosReady', () => {
    it('should return true when photos are loaded, not loading, and no error', () => {
      const result = PhotosSelectors.selectIsPhotosReady.projector(true, false, null);
      expect(result).toBe(true);
    });

    it('should return false when no photos loaded', () => {
      const result = PhotosSelectors.selectIsPhotosReady.projector(false, false, null);
      expect(result).toBe(false);
    });

    it('should return false when still loading', () => {
      const result = PhotosSelectors.selectIsPhotosReady.projector(true, true, null);
      expect(result).toBe(false);
    });

    it('should return false when there is an error', () => {
      const result = PhotosSelectors.selectIsPhotosReady.projector(true, false, 'Error message');
      expect(result).toBe(false);
    });

    it('should return false when loading and has error', () => {
      const result = PhotosSelectors.selectIsPhotosReady.projector(false, true, 'Error message');
      expect(result).toBe(false);
    });
  });

  describe('selectPhotosLoadingState', () => {
    it('should return loading state with no error', () => {
      const result = PhotosSelectors.selectPhotosLoadingState.projector(true, null);
      expect(result).toEqual({
        loading: true,
        error: null,
        hasError: false
      });
    });

    it('should return loading state with error', () => {
      const result = PhotosSelectors.selectPhotosLoadingState.projector(false, 'Test error');
      expect(result).toEqual({
        loading: false,
        error: 'Test error',
        hasError: true
      });
    });
  });

  describe('selectCanLoadPhotos', () => {
    it('should return true when not loading', () => {
      const result = PhotosSelectors.selectCanLoadPhotos.projector(false);
      expect(result).toBe(true);
    });

    it('should return false when loading', () => {
      const result = PhotosSelectors.selectCanLoadPhotos.projector(true);
      expect(result).toBe(false);
    });
  });

  describe('selectPhotosWithValidation', () => {
    it('should return photos with validation status', () => {
      const result = PhotosSelectors.selectPhotosWithValidation.projector(mockPhotos);
      expect(result).toEqual([
        { ...mockPhotos[0], isValid: true },
        { ...mockPhotos[1], isValid: true },
        { ...mockPhotos[2], isValid: true }
      ]);
    });

    it('should mark photos as invalid when year is before 1900', () => {
      const invalidPhoto = { ...mockPhotos[0], year: 1850 };
      const result = PhotosSelectors.selectPhotosWithValidation.projector([invalidPhoto]);
      expect(result[0].isValid).toBe(false);
    });

    it('should mark photos as invalid when coordinates are zero', () => {
      const invalidPhoto = { ...mockPhotos[0], coordinates: { latitude: 0, longitude: 0 } };
      const result = PhotosSelectors.selectPhotosWithValidation.projector([invalidPhoto]);
      expect(result[0].isValid).toBe(false);
    });
  });

  describe('selectValidPhotosCount', () => {
    it('should return count of valid photos', () => {
      const photosWithValidation = mockPhotos.map(p => ({ ...p, isValid: true }));
      const result = PhotosSelectors.selectValidPhotosCount.projector(photosWithValidation);
      expect(result).toBe(3);
    });

    it('should return 0 when no valid photos', () => {
      const photosWithValidation = mockPhotos.map(p => ({ ...p, isValid: false }));
      const result = PhotosSelectors.selectValidPhotosCount.projector(photosWithValidation);
      expect(result).toBe(0);
    });
  });

  describe('selectPhotosProgress', () => {
    it('should return progress information', () => {
      const result = PhotosSelectors.selectPhotosProgress.projector(5, 2);
      expect(result).toEqual({
        current: 3,
        total: 5,
        percentage: 60
      });
    });

    it('should handle first photo correctly', () => {
      const result = PhotosSelectors.selectPhotosProgress.projector(5, 0);
      expect(result).toEqual({
        current: 1,
        total: 5,
        percentage: 20
      });
    });

    it('should handle no photos', () => {
      const result = PhotosSelectors.selectPhotosProgress.projector(0, -1);
      expect(result).toEqual({
        current: 0,
        total: 0,
        percentage: 0
      });
    });

    it('should handle negative index', () => {
      const result = PhotosSelectors.selectPhotosProgress.projector(5, -1);
      expect(result).toEqual({
        current: 0,
        total: 5,
        percentage: 0
      });
    });
  });
});