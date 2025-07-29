import { createReducer, on } from '@ngrx/store';
import { PhotoState } from '../../models/game-state.model';
import * as PhotosActions from './photos.actions';

export const initialPhotosState: PhotoState = {
  photos: [],
  currentPhoto: null,
  loading: false,
  error: null
};

export const photosReducer = createReducer(
  initialPhotosState,

  on(PhotosActions.loadPhotos, (state): PhotoState => ({
    ...state,
    loading: true,
    error: null
  })),

  on(PhotosActions.loadPhotosSuccess, (state, { photos }): PhotoState => {
    // DEBUG: Log photos loading success (Task 1 requirement)
    console.log('[PhotosReducer] Photos loaded successfully:', {
      photoCount: photos.length,
      photos: photos.map(p => ({
        id: p.id,
        title: p.title,
        year: p.year,
        hasUrl: !!p.url,
        hasCoordinates: !!p.coordinates
      })),
      firstPhotoId: photos.length > 0 ? photos[0].id : null,
      timestamp: new Date().toISOString()
    });

    return {
      ...state,
      photos,
      loading: false,
      error: null,
      currentPhoto: photos.length > 0 ? photos[0] : null
    };
  }),

  on(PhotosActions.loadPhotosFailure, (state, { error }): PhotoState => ({
    ...state,
    loading: false,
    error,
    photos: [],
    currentPhoto: null
  })),

  on(PhotosActions.setCurrentPhoto, (state, { photoIndex }): PhotoState => {
    const photo = state.photos[photoIndex] || null;
    
    // DEBUG: Log current photo changes (Task 1 requirement)
    console.log('[PhotosReducer] Setting current photo:', {
      photoIndex,
      photoId: photo?.id || null,
      photoTitle: photo?.title || null,
      photoYear: photo?.year || null,
      totalPhotos: state.photos.length,
      timestamp: new Date().toISOString()
    });

    if (photoIndex >= state.photos.length) {
      console.warn('[PhotosReducer] Photo index out of bounds:', {
        requestedIndex: photoIndex,
        totalPhotos: state.photos.length
      });
    }

    if (!photo && photoIndex < state.photos.length) {
      console.error('[PhotosReducer] Photo at index is null/undefined:', {
        photoIndex,
        photosArray: state.photos.map(p => ({ id: p?.id, title: p?.title }))
      });
    }

    return {
      ...state,
      currentPhoto: photo
    };
  }),

  on(PhotosActions.clearCurrentPhoto, (state): PhotoState => ({
    ...state,
    currentPhoto: null
  })),

  on(PhotosActions.validatePhoto, (state): PhotoState => ({
    ...state,
    loading: true
  })),

  on(PhotosActions.photoValidationSuccess, (state, { photo }): PhotoState => ({
    ...state,
    loading: false
  })),

  on(PhotosActions.photoValidationFailure, (state, { error }): PhotoState => ({
    ...state,
    loading: false,
    error
  }))
);