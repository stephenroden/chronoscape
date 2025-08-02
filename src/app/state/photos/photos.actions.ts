import { createAction, props } from '@ngrx/store';
import { Photo } from '../../models/photo.model';

// Photo loading actions
export const loadPhotos = createAction('[Photos] Load Photos');

export const loadPhotosWithOptions = createAction(
  '[Photos] Load Photos With Options',
  props<{ forceRefresh?: boolean }>()
);

export const loadCuratedPhotos = createAction(
  '[Photos] Load Curated Photos',
  props<{ category?: 'architecture' | 'landmarks' | 'events' | 'all'; forceRefresh?: boolean }>()
);

export const loadPhotosSuccess = createAction(
  '[Photos] Load Photos Success',
  props<{ photos: Photo[] }>()
);

export const loadPhotosFailure = createAction(
  '[Photos] Load Photos Failure',
  props<{ error: string }>()
);

// Current photo management
export const setCurrentPhoto = createAction(
  '[Photos] Set Current Photo',
  props<{ photoIndex: number }>()
);

export const clearCurrentPhoto = createAction('[Photos] Clear Current Photo');

export const clearPhotos = createAction('[Photos] Clear Photos');

// Photo validation
export const validatePhoto = createAction(
  '[Photos] Validate Photo',
  props<{ photo: Photo }>()
);

export const photoValidationSuccess = createAction(
  '[Photos] Photo Validation Success',
  props<{ photo: Photo }>()
);

export const photoValidationFailure = createAction(
  '[Photos] Photo Validation Failure',
  props<{ photoId: string; error: string }>()
);