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

  on(PhotosActions.loadPhotosSuccess, (state, { photos }): PhotoState => ({
    ...state,
    photos,
    loading: false,
    error: null,
    currentPhoto: photos.length > 0 ? photos[0] : null
  })),

  on(PhotosActions.loadPhotosFailure, (state, { error }): PhotoState => ({
    ...state,
    loading: false,
    error,
    photos: [],
    currentPhoto: null
  })),

  on(PhotosActions.setCurrentPhoto, (state, { photoIndex }): PhotoState => {
    const photo = state.photos[photoIndex] || null;
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