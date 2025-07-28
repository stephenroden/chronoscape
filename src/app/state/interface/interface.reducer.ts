import { createReducer, on } from '@ngrx/store';
import { 
  InterfaceState, 
  defaultInterfaceState, 
  defaultPhotoZoomState, 
  defaultMapState 
} from '../../models/interface-state.model';
import * as InterfaceActions from './interface.actions';

export const initialInterfaceState: InterfaceState = {
  ...defaultInterfaceState
};

export const interfaceReducer = createReducer(
  initialInterfaceState,

  // Toggle actions
  on(InterfaceActions.toggleView, (state): InterfaceState => ({
    ...state,
    activeView: state.activeView === 'photo' ? 'map' : 'photo',
    transitionInProgress: true
  })),

  on(InterfaceActions.setActiveView, (state, { activeView }): InterfaceState => ({
    ...state,
    activeView,
    transitionInProgress: true
  })),

  on(InterfaceActions.startTransition, (state): InterfaceState => ({
    ...state,
    transitionInProgress: true
  })),

  on(InterfaceActions.completeTransition, (state): InterfaceState => ({
    ...state,
    transitionInProgress: false
  })),

  // Photo zoom actions
  on(InterfaceActions.setPhotoZoom, (state, { zoomLevel }): InterfaceState => ({
    ...state,
    photoZoom: {
      ...state.photoZoom,
      zoomLevel: Math.max(
        state.photoZoom.minZoom,
        Math.min(state.photoZoom.maxZoom, zoomLevel)
      )
    }
  })),

  on(InterfaceActions.setPhotoPosition, (state, { position }): InterfaceState => ({
    ...state,
    photoZoom: {
      ...state.photoZoom,
      position
    }
  })),

  on(InterfaceActions.setPhotoZoomState, (state, { photoZoom }): InterfaceState => ({
    ...state,
    photoZoom: {
      ...photoZoom,
      // Ensure zoom level is within bounds
      zoomLevel: Math.max(
        photoZoom.minZoom,
        Math.min(photoZoom.maxZoom, photoZoom.zoomLevel)
      )
    }
  })),

  on(InterfaceActions.resetPhotoZoom, (state): InterfaceState => ({
    ...state,
    photoZoom: {
      ...state.photoZoom,
      zoomLevel: 1,
      position: { x: 0, y: 0 }
    }
  })),

  // Map state actions
  on(InterfaceActions.setMapZoom, (state, { zoomLevel }): InterfaceState => ({
    ...state,
    mapState: {
      ...state.mapState,
      zoomLevel: Math.max(0, zoomLevel)
    }
  })),

  on(InterfaceActions.setMapCenter, (state, { center }): InterfaceState => ({
    ...state,
    mapState: {
      ...state.mapState,
      center
    }
  })),

  on(InterfaceActions.setMapState, (state, { mapState }): InterfaceState => ({
    ...state,
    mapState: {
      ...mapState,
      // Ensure zoom level is non-negative
      zoomLevel: Math.max(0, mapState.zoomLevel)
    }
  })),

  on(InterfaceActions.resetMapState, (state): InterfaceState => ({
    ...state,
    mapState: {
      ...state.mapState,
      zoomLevel: state.mapState.defaultZoom,
      center: state.mapState.defaultCenter
    }
  })),

  // Combined reset actions
  on(InterfaceActions.resetInterfaceState, (): InterfaceState => ({
    ...defaultInterfaceState
  })),

  on(InterfaceActions.resetForNewPhoto, (state): InterfaceState => ({
    ...state,
    activeView: 'photo',
    photoZoom: {
      ...defaultPhotoZoomState
    },
    mapState: {
      ...state.mapState,
      zoomLevel: state.mapState.defaultZoom,
      center: state.mapState.defaultCenter
    },
    transitionInProgress: false
  }))
);