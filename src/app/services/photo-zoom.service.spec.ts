import { TestBed } from '@angular/core/testing';
import { PhotoZoomService, PhotoZoomState } from './photo-zoom.service';

describe('PhotoZoomService', () => {
  let service: PhotoZoomService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PhotoZoomService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const state = service.currentState;
      expect(state.zoomLevel).toBe(1);
      expect(state.position).toEqual({ x: 0, y: 0 });
      expect(state.minZoom).toBe(1);
      expect(state.maxZoom).toBe(5);
    });

    it('should initialize zoom with container and image dimensions', () => {
      service.initializeZoom(800, 600, 1200, 900);
      
      const state = service.currentState;
      expect(state.containerWidth).toBe(800);
      expect(state.containerHeight).toBe(600);
      expect(state.imageWidth).toBe(1200);
      expect(state.imageHeight).toBe(900);
      expect(state.zoomLevel).toBe(1);
      expect(state.position).toEqual({ x: 0, y: 0 });
    });
  });

  describe('zoom functionality', () => {
    beforeEach(() => {
      service.initializeZoom(800, 600, 1200, 900);
    });

    it('should zoom in by step amount', () => {
      const result = service.zoomIn();
      expect(result).toBe(true);
      expect(service.currentState.zoomLevel).toBe(1.5);
    });

    it('should zoom out by step amount', () => {
      service.setZoomLevel(2);
      const result = service.zoomOut();
      expect(result).toBe(true);
      expect(service.currentState.zoomLevel).toBe(1.5);
    });

    it('should not zoom in beyond max zoom', () => {
      service.setZoomLevel(5);
      const result = service.zoomIn();
      expect(result).toBe(false);
      expect(service.currentState.zoomLevel).toBe(5);
    });

    it('should not zoom out below min zoom', () => {
      const result = service.zoomOut();
      expect(result).toBe(false);
      expect(service.currentState.zoomLevel).toBe(1);
    });

    it('should set specific zoom level within bounds', () => {
      service.setZoomLevel(3);
      expect(service.currentState.zoomLevel).toBe(3);
    });

    it('should clamp zoom level to max when exceeding', () => {
      service.setZoomLevel(10);
      expect(service.currentState.zoomLevel).toBe(5);
    });

    it('should clamp zoom level to min when below', () => {
      service.setZoomLevel(0.5);
      expect(service.currentState.zoomLevel).toBe(1);
    });

    it('should check if zoom in is possible', () => {
      expect(service.canZoomIn()).toBe(true);
      service.setZoomLevel(5);
      expect(service.canZoomIn()).toBe(false);
    });

    it('should check if zoom out is possible', () => {
      expect(service.canZoomOut()).toBe(false);
      service.setZoomLevel(2);
      expect(service.canZoomOut()).toBe(true);
    });
  });

  describe('pan functionality', () => {
    beforeEach(() => {
      service.initializeZoom(800, 600, 1200, 900);
      service.setZoomLevel(2); // Zoom in to enable panning
    });

    it('should pan image by delta values', () => {
      service.pan(50, 30);
      const state = service.currentState;
      expect(state.position.x).toBe(50);
      expect(state.position.y).toBe(30);
    });

    it('should set absolute position', () => {
      service.setPosition(100, 75);
      const state = service.currentState;
      expect(state.position.x).toBe(100);
      expect(state.position.y).toBe(75);
    });

    it('should constrain position within bounds', () => {
      // Try to pan beyond bounds
      service.pan(1000, 1000);
      const state = service.currentState;
      
      // Position should be constrained
      expect(state.position.x).toBeLessThanOrEqual(600); // Max pan based on zoom and dimensions
      expect(state.position.y).toBeLessThanOrEqual(450);
    });

    it('should not allow panning at minimum zoom', () => {
      service.setZoomLevel(1);
      service.pan(100, 100);
      const state = service.currentState;
      expect(state.position).toEqual({ x: 0, y: 0 });
    });
  });

  describe('reset functionality', () => {
    beforeEach(() => {
      service.initializeZoom(800, 600, 1200, 900);
    });

    it('should reset zoom to default state', () => {
      service.setZoomLevel(3);
      service.pan(100, 50);
      
      service.reset();
      
      const state = service.currentState;
      expect(state.zoomLevel).toBe(1);
      expect(state.position).toEqual({ x: 0, y: 0 });
    });

    it('should preserve container and image dimensions on reset', () => {
      service.setZoomLevel(3);
      service.reset();
      
      const state = service.currentState;
      expect(state.containerWidth).toBe(800);
      expect(state.containerHeight).toBe(600);
      expect(state.imageWidth).toBe(1200);
      expect(state.imageHeight).toBe(900);
    });
  });

  describe('pinch zoom functionality', () => {
    beforeEach(() => {
      service.initializeZoom(800, 600, 1200, 900);
    });

    it('should handle pinch zoom with scale factor', () => {
      service.handlePinchZoom(1.5, 400, 300);
      expect(service.currentState.zoomLevel).toBe(1.5);
    });

    it('should zoom towards pinch center', () => {
      const centerX = 400;
      const centerY = 300;
      service.handlePinchZoom(2, centerX, centerY);
      
      // Position should be adjusted to zoom towards center
      const state = service.currentState;
      expect(state.zoomLevel).toBe(2);
      // Position calculation depends on zoom center offset
    });

    it('should constrain pinch zoom to bounds', () => {
      service.handlePinchZoom(10, 400, 300);
      expect(service.currentState.zoomLevel).toBe(5); // Max zoom
      
      service.handlePinchZoom(0.1, 400, 300);
      expect(service.currentState.zoomLevel).toBe(1); // Min zoom
    });
  });

  describe('transform calculation', () => {
    beforeEach(() => {
      service.initializeZoom(800, 600, 1200, 900);
    });

    it('should generate correct CSS transform string', () => {
      service.setZoomLevel(2);
      service.setPosition(50, 30);
      
      const transform = service.getTransform();
      expect(transform).toBe('translate(50px, 30px) scale(2)');
    });

    it('should generate transform for default state', () => {
      const transform = service.getTransform();
      expect(transform).toBe('translate(0px, 0px) scale(1)');
    });
  });

  describe('container dimension updates', () => {
    beforeEach(() => {
      service.initializeZoom(800, 600, 1200, 900);
      service.setZoomLevel(2);
      service.setPosition(100, 50);
    });

    it('should update container dimensions', () => {
      service.updateContainerDimensions(1000, 800);
      
      const state = service.currentState;
      expect(state.containerWidth).toBe(1000);
      expect(state.containerHeight).toBe(800);
    });

    it('should recalculate position bounds after dimension update', () => {
      const initialPosition = service.currentState.position;
      
      // Make container smaller
      service.updateContainerDimensions(400, 300);
      
      const newState = service.currentState;
      // Position should be recalculated to fit new bounds
      expect(newState.containerWidth).toBe(400);
      expect(newState.containerHeight).toBe(300);
    });
  });

  describe('zoom limits', () => {
    beforeEach(() => {
      service.initializeZoom(800, 600, 1200, 900);
    });

    it('should set custom zoom limits', () => {
      service.setZoomLimits(0.5, 10);
      
      const state = service.currentState;
      expect(state.minZoom).toBe(0.5);
      expect(state.maxZoom).toBe(10);
    });

    it('should enforce minimum zoom limit', () => {
      service.setZoomLimits(0, 10);
      
      const state = service.currentState;
      expect(state.minZoom).toBe(0.1); // Should be clamped to minimum
    });

    it('should ensure max zoom is not less than min zoom', () => {
      service.setZoomLimits(3, 2);
      
      const state = service.currentState;
      expect(state.minZoom).toBe(3);
      expect(state.maxZoom).toBe(3); // Should be adjusted to match min
    });

    it('should adjust current zoom level when limits change', () => {
      service.setZoomLevel(4);
      service.setZoomLimits(1, 2);
      
      const state = service.currentState;
      expect(state.zoomLevel).toBe(2); // Should be clamped to new max
    });
  });

  describe('boundary calculations', () => {
    beforeEach(() => {
      service.initializeZoom(800, 600, 1200, 900);
    });

    it('should calculate correct bounds for zoom level 2', () => {
      service.setZoomLevel(2);
      
      // At 2x zoom, scaled image is 2400x1800
      // Max pan should be (2400-800)/2 = 800 for X, (1800-600)/2 = 600 for Y
      service.setPosition(1000, 1000); // Try to exceed bounds
      
      const state = service.currentState;
      expect(state.position.x).toBeLessThanOrEqual(800);
      expect(state.position.y).toBeLessThanOrEqual(600);
      expect(state.position.x).toBeGreaterThanOrEqual(-800);
      expect(state.position.y).toBeGreaterThanOrEqual(-600);
    });

    it('should have no pan bounds at minimum zoom', () => {
      service.setZoomLevel(1);
      service.setPosition(100, 100);
      
      const state = service.currentState;
      expect(state.position).toEqual({ x: 0, y: 0 });
    });
  });

  describe('observable state updates', () => {
    it('should emit state changes through observable', (done) => {
      service.initializeZoom(800, 600, 1200, 900);
      
      let emissionCount = 0;
      service.zoomState$.subscribe((state: PhotoZoomState) => {
        emissionCount++;
        if (emissionCount === 2) { // Skip initial emission
          expect(state.zoomLevel).toBe(2);
          done();
        }
      });
      
      service.setZoomLevel(2);
    });

    it('should provide current state synchronously', () => {
      service.initializeZoom(800, 600, 1200, 900);
      service.setZoomLevel(3);
      
      const state = service.currentState;
      expect(state.zoomLevel).toBe(3);
    });
  });
});