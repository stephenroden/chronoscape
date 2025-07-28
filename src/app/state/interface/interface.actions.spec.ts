import * as InterfaceActions from './interface.actions';
import { ActiveView, PhotoZoomState, MapState } from '../../models/interface-state.model';

describe('Interface Actions', () => {
  describe('Toggle Actions', () => {
    it('should create toggleView action', () => {
      const action = InterfaceActions.toggleView();
      expect(action.type).toBe('[Interface] Toggle View');
    });

    it('should create setActiveView action', () => {
      const activeView: ActiveView = 'photo';
      const action = InterfaceActions.setActiveView({ activeView });
      expect(action.type).toBe('[Interface] Set Active View');
      expect(action.activeView).toBe('photo');
    });

    it('should create startTransition action', () => {
      const action = InterfaceActions.startTransition();
      expect(action.type).toBe('[Interface] Start Transition');
    });

    it('should create completeTransition action', () => {
      const action = InterfaceActions.completeTransition();
      expect(action.type).toBe('[Interface] Complete Transition');
    });
  });

  describe('Photo Zoom Actions', () => {
    it('should create setPhotoZoom action', () => {
      const zoomLevel = 2.5;
      const action = InterfaceActions.setPhotoZoom({ zoomLevel });
      expect(action.type).toBe('[Interface] Set Photo Zoom');
      expect(action.zoomLevel).toBe(2.5);
    });

    it('should create setPhotoPosition action', () => {
      const position = { x: 100, y: 50 };
      const action = InterfaceActions.setPhotoPosition({ position });
      expect(action.type).toBe('[Interface] Set Photo Position');
      expect(action.position).toEqual({ x: 100, y: 50 });
    });

    it('should create setPhotoZoomState action', () => {
      const photoZoom: PhotoZoomState = {
        zoomLevel: 2,
        position: { x: 10, y: 20 },
        minZoom: 0.5,
        maxZoom: 4
      };
      const action = InterfaceActions.setPhotoZoomState({ photoZoom });
      expect(action.type).toBe('[Interface] Set Photo Zoom State');
      expect(action.photoZoom).toEqual(photoZoom);
    });

    it('should create resetPhotoZoom action', () => {
      const action = InterfaceActions.resetPhotoZoom();
      expect(action.type).toBe('[Interface] Reset Photo Zoom');
    });
  });

  describe('Map State Actions', () => {
    it('should create setMapZoom action', () => {
      const zoomLevel = 8;
      const action = InterfaceActions.setMapZoom({ zoomLevel });
      expect(action.type).toBe('[Interface] Set Map Zoom');
      expect(action.zoomLevel).toBe(8);
    });

    it('should create setMapCenter action', () => {
      const center = { latitude: 40.7128, longitude: -74.0060 };
      const action = InterfaceActions.setMapCenter({ center });
      expect(action.type).toBe('[Interface] Set Map Center');
      expect(action.center).toEqual(center);
    });

    it('should create setMapState action', () => {
      const mapState: MapState = {
        zoomLevel: 10,
        center: { latitude: 51.5074, longitude: -0.1278 },
        defaultZoom: 2,
        defaultCenter: { latitude: 20, longitude: 0 }
      };
      const action = InterfaceActions.setMapState({ mapState });
      expect(action.type).toBe('[Interface] Set Map State');
      expect(action.mapState).toEqual(mapState);
    });

    it('should create resetMapState action', () => {
      const action = InterfaceActions.resetMapState();
      expect(action.type).toBe('[Interface] Reset Map State');
    });
  });

  describe('Combined Reset Actions', () => {
    it('should create resetInterfaceState action', () => {
      const action = InterfaceActions.resetInterfaceState();
      expect(action.type).toBe('[Interface] Reset Interface State');
    });

    it('should create resetForNewPhoto action', () => {
      const action = InterfaceActions.resetForNewPhoto();
      expect(action.type).toBe('[Interface] Reset For New Photo');
    });
  });

  describe('Error Handling Actions', () => {
    it('should create setInterfaceError action', () => {
      const error = 'Test error message';
      const action = InterfaceActions.setInterfaceError({ error });
      expect(action.type).toBe('[Interface] Set Interface Error');
      expect(action.error).toBe('Test error message');
    });

    it('should create clearInterfaceError action', () => {
      const action = InterfaceActions.clearInterfaceError();
      expect(action.type).toBe('[Interface] Clear Interface Error');
    });
  });
});