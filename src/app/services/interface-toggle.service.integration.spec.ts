import { TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { provideMockStore, MockStore } from '@ngrx/store/testing';

import { InterfaceToggleService } from './interface-toggle.service';
import { AppState } from '../state/app.state';
import { defaultInterfaceState } from '../models/interface-state.model';

describe('InterfaceToggleService Integration', () => {
  let service: InterfaceToggleService;
  let store: MockStore<AppState>;

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
  });

  it('should create service with proper store integration', () => {
    expect(service).toBeTruthy();
  });

  it('should have observable streams that emit initial values', (done) => {
    service.activeView$.subscribe(activeView => {
      expect(activeView).toBe('photo');
      done();
    });
  });

  it('should have photo zoom observables working', (done) => {
    service.photoZoomLevel$.subscribe(zoomLevel => {
      expect(zoomLevel).toBe(1);
      done();
    });
  });

  it('should have map state observables working', (done) => {
    service.mapZoomLevel$.subscribe(zoomLevel => {
      expect(zoomLevel).toBe(2);
      done();
    });
  });

  it('should handle state preservation correctly', (done) => {
    service.preserveCurrentState().subscribe(state => {
      expect(state.photoZoom).toBeDefined();
      expect(state.mapState).toBeDefined();
      expect(state.photoZoom.zoomLevel).toBe(1);
      expect(state.mapState.zoomLevel).toBe(2);
      done();
    });
  });

  it('should check if interface needs reset', (done) => {
    service.needsReset().subscribe(needsReset => {
      expect(needsReset).toBe(false); // Default state doesn't need reset
      done();
    });
  });

  it('should get thumbnail data correctly', (done) => {
    service.getThumbnailData().subscribe(data => {
      expect(data.view).toBe('map'); // Inactive view when photo is active
      expect(data.isActive).toBe(false);
      done();
    });
  });
});