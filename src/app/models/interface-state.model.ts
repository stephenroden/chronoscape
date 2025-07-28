import { Coordinates, validateCoordinates } from './coordinates.model';

/**
 * Possible active view states for the interface toggle
 */
export type ActiveView = 'photo' | 'map';

/**
 * Photo zoom state tracking zoom level and position
 */
export interface PhotoZoomState {
  zoomLevel: number;
  position: { x: number; y: number };
  minZoom: number;
  maxZoom: number;
}

/**
 * Map state tracking zoom and center position
 */
export interface MapState {
  zoomLevel: number;
  center: Coordinates;
  defaultZoom: number;
  defaultCenter: Coordinates;
}

/**
 * Interface toggle state managing photo/map toggle and zoom states
 */
export interface InterfaceState {
  activeView: ActiveView;
  photoZoom: PhotoZoomState;
  mapState: MapState;
  transitionInProgress: boolean;
}

/**
 * Default photo zoom state
 */
export const defaultPhotoZoomState: PhotoZoomState = {
  zoomLevel: 1,
  position: { x: 0, y: 0 },
  minZoom: 0.5,
  maxZoom: 4
};

/**
 * Default map state (centered on world view)
 */
export const defaultMapState: MapState = {
  zoomLevel: 2,
  center: { latitude: 20, longitude: 0 },
  defaultZoom: 2,
  defaultCenter: { latitude: 20, longitude: 0 }
};

/**
 * Default interface state
 */
export const defaultInterfaceState: InterfaceState = {
  activeView: 'photo',
  photoZoom: defaultPhotoZoomState,
  mapState: defaultMapState,
  transitionInProgress: false
};

/**
 * Validates photo zoom state
 * @param photoZoom - The photo zoom state to validate
 * @returns true if valid, false otherwise
 */
export function validatePhotoZoomState(photoZoom: PhotoZoomState): boolean {
  if (!photoZoom || typeof photoZoom !== 'object') {
    return false;
  }

  const { zoomLevel, position, minZoom, maxZoom } = photoZoom;

  // Validate zoom level
  if (typeof zoomLevel !== 'number' || !isFinite(zoomLevel) || zoomLevel <= 0) {
    return false;
  }

  // Validate position
  if (!position || typeof position !== 'object' ||
      typeof position.x !== 'number' || typeof position.y !== 'number' ||
      !isFinite(position.x) || !isFinite(position.y)) {
    return false;
  }

  // Validate min/max zoom
  if (typeof minZoom !== 'number' || typeof maxZoom !== 'number' ||
      !isFinite(minZoom) || !isFinite(maxZoom) ||
      minZoom <= 0 || maxZoom <= 0 || minZoom >= maxZoom) {
    return false;
  }

  // Zoom level should be within bounds
  if (zoomLevel < minZoom || zoomLevel > maxZoom) {
    return false;
  }

  return true;
}

/**
 * Validates map state
 * @param mapState - The map state to validate
 * @returns true if valid, false otherwise
 */
export function validateMapState(mapState: MapState): boolean {
  if (!mapState || typeof mapState !== 'object') {
    return false;
  }

  const { zoomLevel, center, defaultZoom, defaultCenter } = mapState;

  // Validate zoom levels
  if (typeof zoomLevel !== 'number' || typeof defaultZoom !== 'number' ||
      !isFinite(zoomLevel) || !isFinite(defaultZoom) ||
      zoomLevel < 0 || defaultZoom < 0) {
    return false;
  }

  // Validate coordinates using existing validation
  if (!center || !defaultCenter) {
    return false;
  }

  // Validate coordinates using imported validation
  if (!validateCoordinates(center) || !validateCoordinates(defaultCenter)) {
    return false;
  }

  return true;
}

/**
 * Validates interface state
 * @param interfaceState - The interface state to validate
 * @returns true if valid, false otherwise
 */
export function validateInterfaceState(interfaceState: InterfaceState): boolean {
  if (!interfaceState || typeof interfaceState !== 'object') {
    return false;
  }

  const { activeView, photoZoom, mapState, transitionInProgress } = interfaceState;

  // Validate active view
  if (activeView !== 'photo' && activeView !== 'map') {
    return false;
  }

  // Validate transition flag
  if (typeof transitionInProgress !== 'boolean') {
    return false;
  }

  // Validate nested states
  if (!validatePhotoZoomState(photoZoom) || !validateMapState(mapState)) {
    return false;
  }

  return true;
}