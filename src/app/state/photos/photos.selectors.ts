import { createFeatureSelector, createSelector } from '@ngrx/store';
import { PhotoState } from '../../models/game-state.model';
import { Photo } from '../../models/photo.model';

export const selectPhotosState = createFeatureSelector<PhotoState>('photos');

export const selectAllPhotos = createSelector(
  selectPhotosState,
  (state: PhotoState) => state.photos
);

export const selectCurrentPhoto = createSelector(
  selectPhotosState,
  (state: PhotoState) => state.currentPhoto
);

export const selectPhotosLoading = createSelector(
  selectPhotosState,
  (state: PhotoState) => state.loading
);

export const selectPhotosError = createSelector(
  selectPhotosState,
  (state: PhotoState) => state.error
);

export const selectPhotosCount = createSelector(
  selectAllPhotos,
  (photos: Photo[]) => photos.length
);

export const selectHasPhotos = createSelector(
  selectPhotosCount,
  (count: number) => count > 0
);

export const selectPhotoById = (photoId: string) => createSelector(
  selectAllPhotos,
  (photos: Photo[]) => photos.find(photo => photo.id === photoId) || null
);

export const selectPhotoByIndex = (index: number) => createSelector(
  selectAllPhotos,
  (photos: Photo[]) => photos[index] || null
);

export const selectCurrentPhotoIndex = createSelector(
  selectAllPhotos,
  selectCurrentPhoto,
  (photos: Photo[], currentPhoto: Photo | null) => {
    if (!currentPhoto) return -1;
    return photos.findIndex(photo => photo.id === currentPhoto.id);
  }
);

export const selectIsPhotosReady = createSelector(
  selectHasPhotos,
  selectPhotosLoading,
  selectPhotosError,
  (hasPhotos: boolean, loading: boolean, error: string | null) => 
    hasPhotos && !loading && !error
);

// Additional selectors for loading indicators and error handling
export const selectPhotosLoadingState = createSelector(
  selectPhotosLoading,
  selectPhotosError,
  (loading: boolean, error: string | null) => ({
    loading,
    error,
    hasError: !!error
  })
);

export const selectCanLoadPhotos = createSelector(
  selectPhotosLoading,
  (loading: boolean) => !loading
);

export const selectPhotosWithValidation = createSelector(
  selectAllPhotos,
  (photos: Photo[]) => photos.map(photo => ({
    ...photo,
    isValid: photo.year >= 1900 && 
             photo.coordinates.latitude !== 0 && 
             photo.coordinates.longitude !== 0 &&
             !!photo.url
  }))
);

export const selectValidPhotosCount = createSelector(
  selectPhotosWithValidation,
  (photosWithValidation) => photosWithValidation.filter(p => p.isValid).length
);

export const selectPhotosProgress = createSelector(
  selectPhotosCount,
  selectCurrentPhotoIndex,
  (totalPhotos: number, currentIndex: number) => ({
    current: Math.max(0, currentIndex + 1),
    total: totalPhotos,
    percentage: totalPhotos > 0 ? Math.round(((currentIndex + 1) / totalPhotos) * 100) : 0
  })
);