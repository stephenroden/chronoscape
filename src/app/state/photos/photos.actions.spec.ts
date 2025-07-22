import * as PhotosActions from './photos.actions';
import { Photo } from '../../models/photo.model';

describe('Photos Actions', () => {
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

  describe('loadPhotos', () => {
    it('should create an action', () => {
      const action = PhotosActions.loadPhotos();
      expect(action.type).toBe('[Photos] Load Photos');
    });
  });

  describe('loadPhotosSuccess', () => {
    it('should create an action with photos payload', () => {
      const photos = [mockPhoto];
      const action = PhotosActions.loadPhotosSuccess({ photos });
      
      expect(action.type).toBe('[Photos] Load Photos Success');
      expect(action.photos).toEqual(photos);
    });
  });

  describe('loadPhotosFailure', () => {
    it('should create an action with error payload', () => {
      const error = 'Failed to load photos';
      const action = PhotosActions.loadPhotosFailure({ error });
      
      expect(action.type).toBe('[Photos] Load Photos Failure');
      expect(action.error).toBe(error);
    });
  });

  describe('setCurrentPhoto', () => {
    it('should create an action with photo index payload', () => {
      const photoIndex = 2;
      const action = PhotosActions.setCurrentPhoto({ photoIndex });
      
      expect(action.type).toBe('[Photos] Set Current Photo');
      expect(action.photoIndex).toBe(photoIndex);
    });
  });

  describe('clearCurrentPhoto', () => {
    it('should create an action', () => {
      const action = PhotosActions.clearCurrentPhoto();
      expect(action.type).toBe('[Photos] Clear Current Photo');
    });
  });

  describe('validatePhoto', () => {
    it('should create an action with photo payload', () => {
      const action = PhotosActions.validatePhoto({ photo: mockPhoto });
      
      expect(action.type).toBe('[Photos] Validate Photo');
      expect(action.photo).toEqual(mockPhoto);
    });
  });

  describe('photoValidationSuccess', () => {
    it('should create an action with photo payload', () => {
      const action = PhotosActions.photoValidationSuccess({ photo: mockPhoto });
      
      expect(action.type).toBe('[Photos] Photo Validation Success');
      expect(action.photo).toEqual(mockPhoto);
    });
  });

  describe('photoValidationFailure', () => {
    it('should create an action with photoId and error payload', () => {
      const photoId = 'test-1';
      const error = 'Invalid photo metadata';
      const action = PhotosActions.photoValidationFailure({ photoId, error });
      
      expect(action.type).toBe('[Photos] Photo Validation Failure');
      expect(action.photoId).toBe(photoId);
      expect(action.error).toBe(error);
    });
  });
});