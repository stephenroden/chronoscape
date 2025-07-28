import { TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';

import { InterfaceToggleService } from './interface-toggle.service';
import { AppState } from '../state/app.state';
import { 
  defaultInterfaceState, 
  ActiveView, 
  PhotoZoomState, 
  MapState 
} from '../models/interface-state.model';
import * as InterfaceActions from '../state/interface/interface.actions';
import * as InterfaceSelectors from '../state/interface/interface.selectors';

describe('InterfaceToggleService', () => {
  let service: InterfaceToggleService;
  let store: MockStore<AppState>;
  let dispatchSpy: jasmine.Spy;

  const initialState = {
    interface: defaultInterfaceState
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        InterfaceToggleService,
        provideMockStore({ initialState })
      ]
    });

    service = TestBed.inject(InterfaceToggleService);
    store = TestBed.inject(Store) as MockStore<AppState>;
    dispatchSpy = spyOn(store, 'dispatch');
  });

  afterEach(() => {
    dispatchSpy.calls.reset();
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should have observable streams available', () => {
      expect(service.activeView$).toBeDefined();
      expect(service.isPhotoActive$).toBeDefined();
      expect(service.isMapActive$).toBeDefined();
      expect(service.transitionInProgress$).toBeDefined();
      expect(service.canToggle$).toBeDefined();
    });
  });

  describe('Toggle Operations', () => {
    it('should toggle view when canToggle is true', (done) => {
      store.overrideSelector(InterfaceSelectors.selectCanToggle, true);
      store.overrideSelector(InterfaceSelectors.selectActiveView, 'photo');
      store.refreshState();

      service.toggleView(100).subscribe(result => {
        expect(dispatchSpy).toHaveBeenCalledWith(InterfaceActions.toggleView());
        expect(dispatchSpy).toHaveBeenCalledWith(InterfaceActions.completeTransition());
        done();
      });
    });

    it('should not toggle view when canToggle is false', (done) => {
      store.overrideSelector(InterfaceSelectors.selectCanToggle, false);
      store.refreshState();

      const subscription = service.toggleView(100).subscribe({
        next: () => {
          fail('Should not emit when toggle is not allowed');
          done();
        },
        error: () => {
          fail('Should not error');
          done();
        }
      });

      // Complete the test after a short delay since filter will not emit
      setTimeout(() => {
        subscription.unsubscribe();
        expect(dispatchSpy).not.toHaveBeenCalled();
        done();
      }, 150);
    });

    it('should set active view to photo', (done) => {
      store.overrideSelector(InterfaceSelectors.selectActiveView, 'map');
      store.overrideSelector(InterfaceSelectors.selectCanToggle, true);
      store.refreshState();

      service.setActiveView('photo', 100).subscribe(result => {
        expect(result).toBe('photo');
        expect(dispatchSpy).toHaveBeenCalledWith(
          InterfaceActions.setActiveView({ activeView: 'photo' })
        );
        expect(dispatchSpy).toHaveBeenCalledWith(InterfaceActions.completeTransition());
        done();
      });
    });

    it('should set active view to map', (done) => {
      store.overrideSelector(InterfaceSelectors.selectActiveView, 'photo');
      store.overrideSelector(InterfaceSelectors.selectCanToggle, true);
      store.refreshState();

      service.setActiveView('map', 100).subscribe(result => {
        expect(result).toBe('map');
        expect(dispatchSpy).toHaveBeenCalledWith(
          InterfaceActions.setActiveView({ activeView: 'map' })
        );
        done();
      });
    });

    it('should not change view if already active', (done) => {
      store.overrideSelector(InterfaceSelectors.selectActiveView, 'photo');
      store.refreshState();

      service.setActiveView('photo', 100).subscribe(result => {
        expect(result).toBe('photo');
        expect(dispatchSpy).not.toHaveBeenCalled();
        done();
      });
    });
  });

  describe('Photo Zoom Operations', () => {
    it('should set photo zoom level', () => {
      service.setPhotoZoom(2.5);
      expect(dispatchSpy).toHaveBeenCalledWith(
        InterfaceActions.setPhotoZoom({ zoomLevel: 2.5 })
      );
    });

    it('should set photo position', () => {
      const position = { x: 100, y: 50 };
      service.setPhotoPosition(position);
      expect(dispatchSpy).toHaveBeenCalledWith(
        InterfaceActions.setPhotoPosition({ position })
      );
    });

    it('should set complete photo zoom state', () => {
      const photoZoom: PhotoZoomState = {
        zoomLevel: 2,
        position: { x: 10, y: 20 },
        minZoom: 0.5,
        maxZoom: 4
      };
      service.setPhotoZoomState(photoZoom);
      expect(dispatchSpy).toHaveBeenCalledWith(
        InterfaceActions.setPhotoZoomState({ photoZoom })
      );
    });

    it('should reset photo zoom', () => {
      service.resetPhotoZoom();
      expect(dispatchSpy).toHaveBeenCalledWith(InterfaceActions.resetPhotoZoom());
    });
  });

  describe('Map State Operations', () => {
    it('should set map zoom level', () => {
      service.setMapZoom(5);
      expect(dispatchSpy).toHaveBeenCalledWith(
        InterfaceActions.setMapZoom({ zoomLevel: 5 })
      );
    });

    it('should set map center', () => {
      const center = { latitude: 40.7128, longitude: -74.0060 };
      service.setMapCenter(center);
      expect(dispatchSpy).toHaveBeenCalledWith(
        InterfaceActions.setMapCenter({ center })
      );
    });

    it('should set complete map state', () => {
      const mapState: MapState = {
        zoomLevel: 10,
        center: { latitude: 51.5074, longitude: -0.1278 },
        defaultZoom: 2,
        defaultCenter: { latitude: 20, longitude: 0 }
      };
      service.setMapState(mapState);
      expect(dispatchSpy).toHaveBeenCalledWith(
        InterfaceActions.setMapState({ mapState })
      );
    });

    it('should reset map state', () => {
      service.resetMapState();
      expect(dispatchSpy).toHaveBeenCalledWith(InterfaceActions.resetMapState());
    });
  });

  describe('Combined Operations', () => {
    it('should reset entire interface state', () => {
      service.resetInterfaceState();
      expect(dispatchSpy).toHaveBeenCalledWith(InterfaceActions.resetInterfaceState());
    });

    it('should reset for new photo', () => {
      service.resetForNewPhoto();
      expect(dispatchSpy).toHaveBeenCalledWith(InterfaceActions.resetForNewPhoto());
    });

    it('should preserve current state', (done) => {
      const mockState = {
        photoZoom: defaultInterfaceState.photoZoom,
        mapState: defaultInterfaceState.mapState
      };
      store.overrideSelector(InterfaceSelectors.selectStateForPreservation, mockState);
      store.refreshState();

      service.preserveCurrentState().subscribe(state => {
        expect(state).toEqual(mockState);
        done();
      });
    });

    it('should restore preserved state', () => {
      const preservedState = {
        photoZoom: {
          zoomLevel: 2,
          position: { x: 50, y: 25 },
          minZoom: 0.5,
          maxZoom: 4
        },
        mapState: {
          zoomLevel: 8,
          center: { latitude: 40, longitude: -74 },
          defaultZoom: 2,
          defaultCenter: { latitude: 20, longitude: 0 }
        }
      };

      service.restoreState(preservedState);
      
      expect(dispatchSpy).toHaveBeenCalledWith(
        InterfaceActions.setPhotoZoomState({ photoZoom: preservedState.photoZoom })
      );
      expect(dispatchSpy).toHaveBeenCalledWith(
        InterfaceActions.setMapState({ mapState: preservedState.mapState })
      );
    });
  });

  describe('Synchronous Methods', () => {
    it('should get current active view synchronously', () => {
      store.overrideSelector(InterfaceSelectors.selectActiveView, 'map');
      store.refreshState();

      const activeView = service.getCurrentActiveView();
      expect(activeView).toBe('map');
    });

    it('should check if transition is in progress synchronously', () => {
      store.overrideSelector(InterfaceSelectors.selectTransitionInProgress, true);
      store.refreshState();

      const inProgress = service.isTransitionInProgress();
      expect(inProgress).toBe(true);
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should handle toggle shortcut (t)', () => {
      const handled = service.handleKeyboardShortcut('t');
      expect(handled).toBe(true);
      // Note: The actual dispatch happens asynchronously in toggleView()
    });

    it('should handle toggle shortcut (tab)', () => {
      const handled = service.handleKeyboardShortcut('tab');
      expect(handled).toBe(true);
    });

    it('should handle photo shortcut (p)', () => {
      const handled = service.handleKeyboardShortcut('p');
      expect(handled).toBe(true);
    });

    it('should handle map shortcut (m)', () => {
      const handled = service.handleKeyboardShortcut('m');
      expect(handled).toBe(true);
    });

    it('should handle reset shortcut (r)', () => {
      const handled = service.handleKeyboardShortcut('r');
      expect(handled).toBe(true);
      expect(dispatchSpy).toHaveBeenCalledWith(InterfaceActions.resetInterfaceState());
    });

    it('should return false for unhandled shortcuts', () => {
      const handled = service.handleKeyboardShortcut('x');
      expect(handled).toBe(false);
    });

    it('should handle case-insensitive shortcuts', () => {
      const handled = service.handleKeyboardShortcut('T');
      expect(handled).toBe(true);
    });
  });

  describe('Thumbnail Data', () => {
    it('should get thumbnail data for inactive view', (done) => {
      store.overrideSelector(InterfaceSelectors.selectActiveView, 'photo');
      store.overrideSelector(InterfaceSelectors.selectInactiveView, 'map');
      store.refreshState();

      service.getThumbnailData().subscribe(data => {
        expect(data.view).toBe('map');
        expect(data.isActive).toBe(false);
        done();
      });
    });
  });

  describe('Needs Reset Check', () => {
    it('should check if interface needs reset', (done) => {
      store.overrideSelector(InterfaceSelectors.selectNeedsReset, true);
      store.refreshState();

      service.needsReset().subscribe(needsReset => {
        expect(needsReset).toBe(true);
        done();
      });
    });
  });
});