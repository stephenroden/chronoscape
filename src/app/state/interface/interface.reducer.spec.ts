import { interfaceReducer, initialInterfaceState } from './interface.reducer';
import * as InterfaceActions from './interface.actions';
import { 
  InterfaceState, 
  defaultInterfaceState, 
  PhotoZoomState, 
  MapState 
} from '../../models/interface-state.model';

describe('Interface Reducer', () => {
  describe('Initial State', () => {
    it('should have correct initial state', () => {
      expect(initialInterfaceState).toEqual(defaultInterfaceState);
    });

    it('should return initial state for unknown action', () => {
      const action = { type: 'Unknown Action' } as any;
      const state = interfaceReducer(initialInterfaceState, action);
      expect(state).toBe(initialInterfaceState);
    });
  });

  describe('Toggle Actions', () => {
    it('should toggle view from photo to map', () => {
      const initialState: InterfaceState = {
        ...defaultInterfaceState,
        activeView: 'photo'
      };

      const action = InterfaceActions.toggleView();
      const state = interfaceReducer(initialState, action);

      expect(state.activeView).toBe('map');
      expect(state.transitionInProgress).toBe(true);
    });

    it('should toggle view from map to photo', () => {
      const initialState: InterfaceState = {
        ...defaultInterfaceState,
        activeView: 'map'
      };

      const action = InterfaceActions.toggleView();
      const state = interfaceReducer(initialState, action);

      expect(state.activeView).toBe('photo');
      expect(state.transitionInProgress).toBe(true);
    });

    it('should set active view to photo', () => {
      const action = InterfaceActions.setActiveView({ activeView: 'photo' });
      const state = interfaceReducer(initialInterfaceState, action);

      expect(state.activeView).toBe('photo');
      expect(state.transitionInProgress).toBe(true);
    });

    it('should set active view to map', () => {
      const action = InterfaceActions.setActiveView({ activeView: 'map' });
      const state = interfaceReducer(initialInterfaceState, action);

      expect(state.activeView).toBe('map');
      expect(state.transitionInProgress).toBe(true);
    });

    it('should start transition', () => {
      const action = InterfaceActions.startTransition();
      const state = interfaceReducer(initialInterfaceState, action);

      expect(state.transitionInProgress).toBe(true);
    });

    it('should complete transition', () => {
      const initialState: InterfaceState = {
        ...defaultInterfaceState,
        transitionInProgress: true
      };

      const action = InterfaceActions.completeTransition();
      const state = interfaceReducer(initialState, action);

      expect(state.transitionInProgress).toBe(false);
    });
  });

  describe('Photo Zoom Actions', () => {
    it('should set photo zoom level within bounds', () => {
      const action = InterfaceActions.setPhotoZoom({ zoomLevel: 2.5 });
      const state = interfaceReducer(initialInterfaceState, action);

      expect(state.photoZoom.zoomLevel).toBe(2.5);
    });

    it('should clamp photo zoom level to maximum', () => {
      const action = InterfaceActions.setPhotoZoom({ zoomLevel: 10 });
      const state = interfaceReducer(initialInterfaceState, action);

      expect(state.photoZoom.zoomLevel).toBe(defaultInterfaceState.photoZoom.maxZoom);
    });

    it('should clamp photo zoom level to minimum', () => {
      const action = InterfaceActions.setPhotoZoom({ zoomLevel: 0.1 });
      const state = interfaceReducer(initialInterfaceState, action);

      expect(state.photoZoom.zoomLevel).toBe(defaultInterfaceState.photoZoom.minZoom);
    });

    it('should set photo position', () => {
      const position = { x: 100, y: 50 };
      const action = InterfaceActions.setPhotoPosition({ position });
      const state = interfaceReducer(initialInterfaceState, action);

      expect(state.photoZoom.position).toEqual(position);
    });

    it('should set complete photo zoom state with bounds checking', () => {
      const photoZoom: PhotoZoomState = {
        zoomLevel: 10, // Above max
        position: { x: 10, y: 20 },
        minZoom: 0.5,
        maxZoom: 4
      };

      const action = InterfaceActions.setPhotoZoomState({ photoZoom });
      const state = interfaceReducer(initialInterfaceState, action);

      expect(state.photoZoom.zoomLevel).toBe(4); // Clamped to max
      expect(state.photoZoom.position).toEqual({ x: 10, y: 20 });
      expect(state.photoZoom.minZoom).toBe(0.5);
      expect(state.photoZoom.maxZoom).toBe(4);
    });

    it('should reset photo zoom', () => {
      const initialState: InterfaceState = {
        ...defaultInterfaceState,
        photoZoom: {
          ...defaultInterfaceState.photoZoom,
          zoomLevel: 3,
          position: { x: 50, y: 25 }
        }
      };

      const action = InterfaceActions.resetPhotoZoom();
      const state = interfaceReducer(initialState, action);

      expect(state.photoZoom.zoomLevel).toBe(1);
      expect(state.photoZoom.position).toEqual({ x: 0, y: 0 });
    });
  });

  describe('Map State Actions', () => {
    it('should set map zoom level', () => {
      const action = InterfaceActions.setMapZoom({ zoomLevel: 8 });
      const state = interfaceReducer(initialInterfaceState, action);

      expect(state.mapState.zoomLevel).toBe(8);
    });

    it('should clamp negative map zoom level to zero', () => {
      const action = InterfaceActions.setMapZoom({ zoomLevel: -5 });
      const state = interfaceReducer(initialInterfaceState, action);

      expect(state.mapState.zoomLevel).toBe(0);
    });

    it('should set map center', () => {
      const center = { latitude: 40.7128, longitude: -74.0060 };
      const action = InterfaceActions.setMapCenter({ center });
      const state = interfaceReducer(initialInterfaceState, action);

      expect(state.mapState.center).toEqual(center);
    });

    it('should set complete map state with bounds checking', () => {
      const mapState: MapState = {
        zoomLevel: -2, // Negative value
        center: { latitude: 51.5074, longitude: -0.1278 },
        defaultZoom: 2,
        defaultCenter: { latitude: 20, longitude: 0 }
      };

      const action = InterfaceActions.setMapState({ mapState });
      const state = interfaceReducer(initialInterfaceState, action);

      expect(state.mapState.zoomLevel).toBe(0); // Clamped to 0
      expect(state.mapState.center).toEqual({ latitude: 51.5074, longitude: -0.1278 });
    });

    it('should reset map state to defaults', () => {
      const initialState: InterfaceState = {
        ...defaultInterfaceState,
        mapState: {
          ...defaultInterfaceState.mapState,
          zoomLevel: 10,
          center: { latitude: 40, longitude: -74 }
        }
      };

      const action = InterfaceActions.resetMapState();
      const state = interfaceReducer(initialState, action);

      expect(state.mapState.zoomLevel).toBe(state.mapState.defaultZoom);
      expect(state.mapState.center).toEqual(state.mapState.defaultCenter);
    });
  });

  describe('Combined Reset Actions', () => {
    it('should reset entire interface state', () => {
      const modifiedState: InterfaceState = {
        activeView: 'map',
        photoZoom: {
          zoomLevel: 3,
          position: { x: 100, y: 50 },
          minZoom: 0.5,
          maxZoom: 4
        },
        mapState: {
          zoomLevel: 10,
          center: { latitude: 40, longitude: -74 },
          defaultZoom: 2,
          defaultCenter: { latitude: 20, longitude: 0 }
        },
        transitionInProgress: true
      };

      const action = InterfaceActions.resetInterfaceState();
      const state = interfaceReducer(modifiedState, action);

      expect(state).toEqual(defaultInterfaceState);
    });

    it('should reset for new photo', () => {
      const modifiedState: InterfaceState = {
        activeView: 'map',
        photoZoom: {
          zoomLevel: 3,
          position: { x: 100, y: 50 },
          minZoom: 0.5,
          maxZoom: 4
        },
        mapState: {
          zoomLevel: 10,
          center: { latitude: 40, longitude: -74 },
          defaultZoom: 2,
          defaultCenter: { latitude: 20, longitude: 0 }
        },
        transitionInProgress: true
      };

      const action = InterfaceActions.resetForNewPhoto();
      const state = interfaceReducer(modifiedState, action);

      expect(state.activeView).toBe('photo');
      expect(state.photoZoom.zoomLevel).toBe(1);
      expect(state.photoZoom.position).toEqual({ x: 0, y: 0 });
      expect(state.mapState.zoomLevel).toBe(state.mapState.defaultZoom);
      expect(state.mapState.center).toEqual(state.mapState.defaultCenter);
      expect(state.transitionInProgress).toBe(false);
    });
  });

  describe('State Immutability', () => {
    it('should not mutate original state', () => {
      const originalState = { ...initialInterfaceState };
      const action = InterfaceActions.setPhotoZoom({ zoomLevel: 2 });
      
      interfaceReducer(initialInterfaceState, action);
      
      expect(initialInterfaceState).toEqual(originalState);
    });

    it('should create new state object', () => {
      const action = InterfaceActions.setPhotoZoom({ zoomLevel: 2 });
      const newState = interfaceReducer(initialInterfaceState, action);
      
      expect(newState).not.toBe(initialInterfaceState);
    });

    it('should preserve unmodified nested objects', () => {
      const action = InterfaceActions.setMapZoom({ zoomLevel: 5 });
      const newState = interfaceReducer(initialInterfaceState, action);
      
      // Photo zoom should be unchanged (same reference)
      expect(newState.photoZoom).toBe(initialInterfaceState.photoZoom);
      // Map state should be new object
      expect(newState.mapState).not.toBe(initialInterfaceState.mapState);
    });
  });
});