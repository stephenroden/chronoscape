import { createAction, props } from '@ngrx/store';
import { ActiveView, PhotoZoomState, MapState } from '../../models/interface-state.model';
import { Coordinates } from '../../models/coordinates.model';

// Toggle actions
export const toggleView = createAction('[Interface] Toggle View');

export const setActiveView = createAction(
  '[Interface] Set Active View',
  props<{ activeView: ActiveView }>()
);

export const startTransition = createAction('[Interface] Start Transition');

export const completeTransition = createAction('[Interface] Complete Transition');

// Photo zoom actions
export const setPhotoZoom = createAction(
  '[Interface] Set Photo Zoom',
  props<{ zoomLevel: number }>()
);

export const setPhotoPosition = createAction(
  '[Interface] Set Photo Position',
  props<{ position: { x: number; y: number } }>()
);

export const setPhotoZoomState = createAction(
  '[Interface] Set Photo Zoom State',
  props<{ photoZoom: PhotoZoomState }>()
);

export const resetPhotoZoom = createAction('[Interface] Reset Photo Zoom');

// Map state actions
export const setMapZoom = createAction(
  '[Interface] Set Map Zoom',
  props<{ zoomLevel: number }>()
);

export const setMapCenter = createAction(
  '[Interface] Set Map Center',
  props<{ center: Coordinates }>()
);

export const setMapState = createAction(
  '[Interface] Set Map State',
  props<{ mapState: MapState }>()
);

export const resetMapState = createAction('[Interface] Reset Map State');

// Combined reset actions
export const resetInterfaceState = createAction('[Interface] Reset Interface State');

export const resetForNewPhoto = createAction('[Interface] Reset For New Photo');

// Error handling
export const setInterfaceError = createAction(
  '[Interface] Set Interface Error',
  props<{ error: string }>()
);

export const clearInterfaceError = createAction('[Interface] Clear Interface Error');