import { createFeatureSelector, createSelector } from '@ngrx/store';
import { InterfaceState, ActiveView } from '../../models/interface-state.model';

export const selectInterfaceState = createFeatureSelector<InterfaceState>('interface');

// Active view selectors
export const selectActiveView = createSelector(
  selectInterfaceState,
  (state: InterfaceState): ActiveView => state.activeView
);

export const selectIsPhotoActive = createSelector(
  selectActiveView,
  (activeView: ActiveView): boolean => activeView === 'photo'
);

export const selectIsMapActive = createSelector(
  selectActiveView,
  (activeView: ActiveView): boolean => activeView === 'map'
);

export const selectInactiveView = createSelector(
  selectActiveView,
  (activeView: ActiveView): ActiveView => activeView === 'photo' ? 'map' : 'photo'
);

// Transition selectors
export const selectTransitionInProgress = createSelector(
  selectInterfaceState,
  (state: InterfaceState): boolean => state.transitionInProgress
);

export const selectCanToggle = createSelector(
  selectTransitionInProgress,
  (transitionInProgress: boolean): boolean => !transitionInProgress
);

// Photo zoom selectors
export const selectPhotoZoomState = createSelector(
  selectInterfaceState,
  (state: InterfaceState) => state.photoZoom
);

export const selectPhotoZoomLevel = createSelector(
  selectPhotoZoomState,
  (photoZoom) => photoZoom.zoomLevel
);

export const selectPhotoPosition = createSelector(
  selectPhotoZoomState,
  (photoZoom) => photoZoom.position
);

export const selectPhotoZoomLimits = createSelector(
  selectPhotoZoomState,
  (photoZoom) => ({
    minZoom: photoZoom.minZoom,
    maxZoom: photoZoom.maxZoom
  })
);

export const selectIsPhotoZoomed = createSelector(
  selectPhotoZoomLevel,
  (zoomLevel: number): boolean => zoomLevel > 1
);

export const selectCanZoomIn = createSelector(
  selectPhotoZoomState,
  (photoZoom): boolean => photoZoom.zoomLevel < photoZoom.maxZoom
);

export const selectCanZoomOut = createSelector(
  selectPhotoZoomState,
  (photoZoom): boolean => photoZoom.zoomLevel > photoZoom.minZoom
);

// Map state selectors
export const selectMapState = createSelector(
  selectInterfaceState,
  (state: InterfaceState) => state.mapState
);

export const selectMapZoomLevel = createSelector(
  selectMapState,
  (mapState) => mapState.zoomLevel
);

export const selectMapCenter = createSelector(
  selectMapState,
  (mapState) => mapState.center
);

export const selectMapDefaults = createSelector(
  selectMapState,
  (mapState) => ({
    defaultZoom: mapState.defaultZoom,
    defaultCenter: mapState.defaultCenter
  })
);

export const selectIsMapAtDefault = createSelector(
  selectMapState,
  (mapState): boolean => 
    mapState.zoomLevel === mapState.defaultZoom &&
    mapState.center.latitude === mapState.defaultCenter.latitude &&
    mapState.center.longitude === mapState.defaultCenter.longitude
);

// Combined state selectors
export const selectCurrentViewState = createSelector(
  selectActiveView,
  selectPhotoZoomState,
  selectMapState,
  (activeView, photoZoom, mapState) => ({
    activeView,
    currentState: activeView === 'photo' ? photoZoom : mapState
  })
);

export const selectToggleState = createSelector(
  selectActiveView,
  selectTransitionInProgress,
  selectPhotoZoomState,
  selectMapState,
  (activeView, transitionInProgress, photoZoom, mapState) => ({
    activeView,
    inactiveView: activeView === 'photo' ? 'map' : 'photo',
    transitionInProgress,
    canToggle: !transitionInProgress,
    photoZoom,
    mapState
  })
);

// State preservation selectors
export const selectStateForPreservation = createSelector(
  selectInterfaceState,
  (state: InterfaceState) => ({
    photoZoom: state.photoZoom,
    mapState: state.mapState
  })
);

export const selectNeedsReset = createSelector(
  selectPhotoZoomState,
  selectMapState,
  (photoZoom, mapState): boolean => 
    photoZoom.zoomLevel !== 1 || 
    photoZoom.position.x !== 0 || 
    photoZoom.position.y !== 0 ||
    mapState.zoomLevel !== mapState.defaultZoom ||
    mapState.center.latitude !== mapState.defaultCenter.latitude ||
    mapState.center.longitude !== mapState.defaultCenter.longitude
);