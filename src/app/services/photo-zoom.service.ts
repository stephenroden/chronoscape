import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Interface for photo zoom state
 */
export interface PhotoZoomState {
  zoomLevel: number;
  position: { x: number; y: number };
  minZoom: number;
  maxZoom: number;
  containerWidth: number;
  containerHeight: number;
  imageWidth: number;
  imageHeight: number;
}

/**
 * Interface for zoom bounds
 */
export interface ZoomBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * Service for managing photo zoom, pan, and reset functionality
 * Handles zoom state management with min/max limits and position tracking
 */
@Injectable({
  providedIn: 'root'
})
export class PhotoZoomService {
  private readonly DEFAULT_MIN_ZOOM = 1;
  private readonly DEFAULT_MAX_ZOOM = 5;
  private readonly ZOOM_STEP = 0.5;
  private readonly PAN_BOUNDARY_BUFFER = 10; // pixels

  private zoomStateSubject = new BehaviorSubject<PhotoZoomState>({
    zoomLevel: this.DEFAULT_MIN_ZOOM,
    position: { x: 0, y: 0 },
    minZoom: this.DEFAULT_MIN_ZOOM,
    maxZoom: this.DEFAULT_MAX_ZOOM,
    containerWidth: 0,
    containerHeight: 0,
    imageWidth: 0,
    imageHeight: 0
  });

  /**
   * Observable for zoom state changes
   */
  get zoomState$(): Observable<PhotoZoomState> {
    return this.zoomStateSubject.asObservable();
  }

  /**
   * Get current zoom state
   */
  get currentState(): PhotoZoomState {
    return this.zoomStateSubject.value;
  }

  /**
   * Initialize zoom service with container and image dimensions
   * @param containerWidth - Width of the container element
   * @param containerHeight - Height of the container element
   * @param imageWidth - Natural width of the image
   * @param imageHeight - Natural height of the image
   */
  initializeZoom(
    containerWidth: number,
    containerHeight: number,
    imageWidth: number,
    imageHeight: number
  ): void {
    const newState: PhotoZoomState = {
      ...this.currentState,
      containerWidth,
      containerHeight,
      imageWidth,
      imageHeight,
      zoomLevel: this.DEFAULT_MIN_ZOOM,
      position: { x: 0, y: 0 }
    };

    this.zoomStateSubject.next(newState);
  }

  /**
   * Zoom in by one step
   * @returns true if zoom was applied, false if at max zoom
   */
  zoomIn(): boolean {
    const currentState = this.currentState;
    const newZoomLevel = Math.min(
      currentState.zoomLevel + this.ZOOM_STEP,
      currentState.maxZoom
    );

    if (newZoomLevel === currentState.zoomLevel) {
      return false; // Already at max zoom
    }

    this.setZoomLevel(newZoomLevel);
    return true;
  }

  /**
   * Zoom out by one step
   * @returns true if zoom was applied, false if at min zoom
   */
  zoomOut(): boolean {
    const currentState = this.currentState;
    const newZoomLevel = Math.max(
      currentState.zoomLevel - this.ZOOM_STEP,
      currentState.minZoom
    );

    if (newZoomLevel === currentState.zoomLevel) {
      return false; // Already at min zoom
    }

    this.setZoomLevel(newZoomLevel);
    return true;
  }

  /**
   * Set specific zoom level
   * @param zoomLevel - Target zoom level
   */
  setZoomLevel(zoomLevel: number): void {
    const currentState = this.currentState;
    const clampedZoom = Math.max(
      currentState.minZoom,
      Math.min(zoomLevel, currentState.maxZoom)
    );

    // Calculate new position to keep image centered when zooming
    const zoomRatio = clampedZoom / currentState.zoomLevel;
    const newPosition = this.calculateCenteredPosition(
      currentState.position,
      zoomRatio,
      clampedZoom
    );

    const newState: PhotoZoomState = {
      ...currentState,
      zoomLevel: clampedZoom,
      position: this.constrainPosition(newPosition, clampedZoom)
    };

    this.zoomStateSubject.next(newState);
  }

  /**
   * Pan the image by the specified offset
   * @param deltaX - Horizontal pan offset in pixels
   * @param deltaY - Vertical pan offset in pixels
   */
  pan(deltaX: number, deltaY: number): void {
    const currentState = this.currentState;
    const newPosition = {
      x: currentState.position.x + deltaX,
      y: currentState.position.y + deltaY
    };

    const constrainedPosition = this.constrainPosition(newPosition, currentState.zoomLevel);

    // Only emit if position actually changed (prevents excessive updates)
    if (constrainedPosition.x !== currentState.position.x || constrainedPosition.y !== currentState.position.y) {
      const newState: PhotoZoomState = {
        ...currentState,
        position: constrainedPosition
      };

      this.zoomStateSubject.next(newState);
    }
  }

  /**
   * Set absolute position
   * @param x - X position
   * @param y - Y position
   */
  setPosition(x: number, y: number): void {
    const currentState = this.currentState;
    const constrainedPosition = this.constrainPosition(
      { x, y },
      currentState.zoomLevel
    );

    const newState: PhotoZoomState = {
      ...currentState,
      position: constrainedPosition
    };

    this.zoomStateSubject.next(newState);
  }

  /**
   * Reset zoom to default state
   */
  reset(): void {
    const currentState = this.currentState;
    const newState: PhotoZoomState = {
      ...currentState,
      zoomLevel: this.DEFAULT_MIN_ZOOM,
      position: { x: 0, y: 0 }
    };

    this.zoomStateSubject.next(newState);
  }

  /**
   * Handle pinch-to-zoom gesture
   * @param scale - Scale factor from pinch gesture
   * @param centerX - Center X coordinate of pinch gesture
   * @param centerY - Center Y coordinate of pinch gesture
   */
  handlePinchZoom(scale: number, centerX: number, centerY: number): void {
    const currentState = this.currentState;
    const newZoomLevel = Math.max(
      currentState.minZoom,
      Math.min(currentState.zoomLevel * scale, currentState.maxZoom)
    );

    // Only proceed if zoom level actually changed
    if (Math.abs(newZoomLevel - currentState.zoomLevel) < 0.01) {
      return;
    }

    // Calculate position adjustment to zoom towards the pinch center
    const zoomRatio = newZoomLevel / currentState.zoomLevel;
    const containerCenterX = currentState.containerWidth / 2;
    const containerCenterY = currentState.containerHeight / 2;

    // Calculate offset from container center to pinch center
    const offsetX = centerX - containerCenterX;
    const offsetY = centerY - containerCenterY;

    // Adjust position to zoom towards pinch center
    const newPosition = {
      x: currentState.position.x - offsetX * (zoomRatio - 1),
      y: currentState.position.y - offsetY * (zoomRatio - 1)
    };

    const constrainedPosition = this.constrainPosition(newPosition, newZoomLevel);

    const newState: PhotoZoomState = {
      ...currentState,
      zoomLevel: newZoomLevel,
      position: constrainedPosition
    };

    this.zoomStateSubject.next(newState);
  }

  /**
   * Check if zoom in is possible
   */
  canZoomIn(): boolean {
    return this.currentState.zoomLevel < this.currentState.maxZoom;
  }

  /**
   * Check if zoom out is possible
   */
  canZoomOut(): boolean {
    return this.currentState.zoomLevel > this.currentState.minZoom;
  }

  /**
   * Get CSS transform string for current zoom and position
   */
  getTransform(): string {
    const state = this.currentState;
    return `translate(${state.position.x}px, ${state.position.y}px) scale(${state.zoomLevel})`;
  }

  /**
   * Calculate centered position when zooming
   * @param currentPosition - Current position
   * @param zoomRatio - Ratio of new zoom to current zoom
   * @param newZoomLevel - New zoom level
   */
  private calculateCenteredPosition(
    currentPosition: { x: number; y: number },
    zoomRatio: number,
    newZoomLevel: number
  ): { x: number; y: number } {
    const currentState = this.currentState;
    
    // If zooming out to minimum, center the image
    if (newZoomLevel === currentState.minZoom) {
      return { x: 0, y: 0 };
    }

    // For other zoom levels, maintain relative position
    return {
      x: currentPosition.x * zoomRatio,
      y: currentPosition.y * zoomRatio
    };
  }

  /**
   * Constrain position to prevent image from moving outside bounds
   * @param position - Desired position
   * @param zoomLevel - Current zoom level
   */
  private constrainPosition(
    position: { x: number; y: number },
    zoomLevel: number
  ): { x: number; y: number } {
    const bounds = this.calculateZoomBounds(zoomLevel);
    
    return {
      x: Math.max(bounds.minX, Math.min(position.x, bounds.maxX)),
      y: Math.max(bounds.minY, Math.min(position.y, bounds.maxY))
    };
  }

  /**
   * Calculate zoom bounds based on current zoom level
   * @param zoomLevel - Current zoom level
   */
  private calculateZoomBounds(zoomLevel: number): ZoomBounds {
    const currentState = this.currentState;
    
    if (zoomLevel <= currentState.minZoom) {
      // At minimum zoom, image should be centered
      return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    }

    // Calculate scaled image dimensions
    const scaledImageWidth = currentState.imageWidth * zoomLevel;
    const scaledImageHeight = currentState.imageHeight * zoomLevel;

    // Calculate maximum pan distance
    const maxPanX = Math.max(0, (scaledImageWidth - currentState.containerWidth) / 2);
    const maxPanY = Math.max(0, (scaledImageHeight - currentState.containerHeight) / 2);

    return {
      minX: -maxPanX,
      maxX: maxPanX,
      minY: -maxPanY,
      maxY: maxPanY
    };
  }

  /**
   * Update container dimensions (for responsive behavior)
   * @param width - New container width
   * @param height - New container height
   */
  updateContainerDimensions(width: number, height: number): void {
    const currentState = this.currentState;
    const newState: PhotoZoomState = {
      ...currentState,
      containerWidth: width,
      containerHeight: height,
      position: this.constrainPosition(currentState.position, currentState.zoomLevel)
    };

    this.zoomStateSubject.next(newState);
  }

  /**
   * Set custom zoom limits
   * @param minZoom - Minimum zoom level
   * @param maxZoom - Maximum zoom level
   */
  setZoomLimits(minZoom: number, maxZoom: number): void {
    const currentState = this.currentState;
    const clampedMin = Math.max(0.1, minZoom);
    const clampedMax = Math.max(clampedMin, maxZoom);

    const newState: PhotoZoomState = {
      ...currentState,
      minZoom: clampedMin,
      maxZoom: clampedMax,
      zoomLevel: Math.max(clampedMin, Math.min(currentState.zoomLevel, clampedMax))
    };

    this.zoomStateSubject.next(newState);
  }
}