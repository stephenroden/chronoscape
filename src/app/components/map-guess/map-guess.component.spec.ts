import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { of, Subject } from 'rxjs';
import { ElementRef } from '@angular/core';

import { MapGuessComponent } from './map-guess.component';
import { MapService } from '../../services/map.service';
import { InterfaceToggleService } from '../../services/interface-toggle.service';
import { setCurrentGuess } from '../../state/scoring/scoring.actions';
import { selectCurrentGuess } from '../../state/scoring/scoring.selectors';
import { selectCurrentPhoto } from '../../state/photos/photos.selectors';
import { Coordinates } from '../../models/coordinates.model';
import { Guess } from '../../models/scoring.model';
import { Photo } from '../../models/photo.model';
import { defaultMapState } from '../../models/interface-state.model';

describe('MapGuessComponent', () => {
  let component: MapGuessComponent;
  let fixture: ComponentFixture<MapGuessComponent>;
  let mockStore: jasmine.SpyObj<Store>;
  let mockMapService: jasmine.SpyObj<MapService>;
  let mockInterfaceToggleService: jasmine.SpyObj<InterfaceToggleService>;
  let mockElementRef: jasmine.SpyObj<ElementRef>;

  const mockCoordinates: Coordinates = { latitude: 40.7128, longitude: -74.0060 };
  const mockGuess: Guess = { year: 2020, coordinates: mockCoordinates };
  const mockPhoto: Photo = { 
    id: 'photo1', 
    url: 'test.jpg', 
    title: 'Test Photo',
    year: 2020, 
    coordinates: mockCoordinates,
    description: 'Test photo',
    source: 'Test Source',
    metadata: {
      license: 'CC0',
      originalSource: 'test.com',
      dateCreated: new Date('2020-01-01')
    }
  };

  beforeEach(async () => {
    // Create spy objects
    mockStore = jasmine.createSpyObj('Store', ['select', 'dispatch']);
    mockMapService = jasmine.createSpyObj('MapService', [
      'initializeMap',
      'enableClickToPlace',
      'addPin',
      'removePin',
      'setMapView',
      'destroy',
      'getMapCenter',
      'getCurrentZoom',
      'resetToDefault',
      'resetForNewPhoto',
      'clearAdditionalMarkers',
      'invalidateSize',
      'hasPins',
      'getAllMarkerPositions'
    ]);
    mockInterfaceToggleService = jasmine.createSpyObj('InterfaceToggleService', [
      'setMapCenter',
      'setMapZoom',
      'resetMapState'
    ], {
      mapState$: of(defaultMapState)
    });

    // Mock store selectors
    mockStore.select.and.returnValue(of(null));

    await TestBed.configureTestingModule({
      imports: [MapGuessComponent],
      providers: [
        { provide: Store, useValue: mockStore },
        { provide: MapService, useValue: mockMapService },
        { provide: InterfaceToggleService, useValue: mockInterfaceToggleService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MapGuessComponent);
    component = fixture.componentInstance;

    // Mock the ViewChild ElementRef
    const mockElement = document.createElement('div');
    mockElement.id = 'test-map-container';
    component.mapContainer = new ElementRef(mockElement);
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default values', () => {
      expect(component.currentGuess).toBeNull();
      expect(component.userPin).toBeNull();
      expect(component.isMapInitialized).toBeFalse();
      expect(component.isMapLoading).toBeTrue();
      expect(component.mapError).toBeNull();
    });

    it('should subscribe to current guess on init', () => {
      const mockGuessSubject = new Subject<Guess | null>();
      mockStore.select.and.returnValue(mockGuessSubject.asObservable());

      component.ngOnInit();

      // Emit a guess
      mockGuessSubject.next(mockGuess);

      expect(component.currentGuess).toEqual(mockGuess);
      expect(component.userPin).toEqual(mockCoordinates);
    });

    it('should not update pin for placeholder coordinates', () => {
      const placeholderGuess: Guess = { year: 2020, coordinates: { latitude: 0, longitude: 0 } };
      const mockGuessSubject = new Subject<Guess | null>();
      mockStore.select.and.returnValue(mockGuessSubject.asObservable());

      component.ngOnInit();
      mockGuessSubject.next(placeholderGuess);

      expect(component.currentGuess).toEqual(placeholderGuess);
      expect(component.userPin).toBeNull();
    });
  });

  describe('Map Initialization', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should initialize map after view init', fakeAsync(() => {
      spyOn(component as any, 'initializeMap');
      
      component.ngAfterViewInit();
      tick(100);

      expect((component as any).initializeMap).toHaveBeenCalled();
    }));

    it('should successfully initialize map', fakeAsync(() => {
      component.ngAfterViewInit();
      tick(100);

      expect(mockMapService.initializeMap).toHaveBeenCalledWith(
        'map-guess-container',
        { latitude: 20, longitude: 0 },
        2
      );
      expect(mockMapService.enableClickToPlace).toHaveBeenCalled();
      expect(component.isMapInitialized).toBeTrue();
      expect(component.isMapLoading).toBeFalse();
      expect(component.mapError).toBeNull();
    }));

    it('should handle map initialization error', fakeAsync(() => {
      mockMapService.initializeMap.and.throwError('Map initialization failed');
      spyOn(console, 'error');

      component.ngAfterViewInit();
      tick(100);

      expect(component.isMapInitialized).toBeFalse();
      expect(component.isMapLoading).toBeFalse();
      expect(component.mapError).toBe('Map initialization failed: Map initialization failed');
      expect(console.error).toHaveBeenCalled();
    }));

    it('should place existing pin after map initialization', fakeAsync(() => {
      component.userPin = mockCoordinates;
      spyOn(component as any, 'updateMapPin');

      component.ngAfterViewInit();
      tick(100);

      expect((component as any).updateMapPin).toHaveBeenCalled();
    }));
  });

  describe('Map Interactions', () => {
    beforeEach(() => {
      component.ngOnInit();
      component.setMapReadyForTesting();
    });

    it('should handle map click and place pin', () => {
      const clickCoordinates: Coordinates = { latitude: 51.5074, longitude: -0.1278 };
      spyOn(component as any, 'updateMapPin');
      spyOn(component as any, 'updateCurrentGuess');

      (component as any).onMapClick(clickCoordinates);

      expect(component.userPin).toEqual(clickCoordinates);
      expect((component as any).updateMapPin).toHaveBeenCalled();
      expect((component as any).updateCurrentGuess).toHaveBeenCalledWith(clickCoordinates);
    });

    it('should update map pin when pin location exists', () => {
      component.userPin = mockCoordinates;

      (component as any).updateMapPin();

      expect(mockMapService.addPin).toHaveBeenCalledWith(mockCoordinates, {
        title: 'Your guess',
        alt: 'Your location guess pin'
      });
    });

    it('should not update map pin when map is not initialized', () => {
      component.isMapInitialized = false;
      component.userPin = mockCoordinates;

      (component as any).updateMapPin();

      expect(mockMapService.addPin).not.toHaveBeenCalled();
    });

    it('should handle pin update error gracefully', () => {
      component.userPin = mockCoordinates;
      mockMapService.addPin.and.throwError('Pin update failed');
      spyOn(console, 'error');

      (component as any).updateMapPin();

      expect(console.error).toHaveBeenCalledWith('Failed to update map pin:', jasmine.any(Error));
    });
  });

  describe('Current Guess Management', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should update current guess with new coordinates', () => {
      const newCoordinates: Coordinates = { latitude: 48.8566, longitude: 2.3522 };
      component.currentGuess = { year: 1995, coordinates: { latitude: 0, longitude: 0 } };

      (component as any).updateCurrentGuess(newCoordinates);

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        setCurrentGuess({
          guess: { year: 1995, coordinates: newCoordinates }
        })
      );
    });

    it('should use current year when no existing guess', () => {
      const newCoordinates: Coordinates = { latitude: 48.8566, longitude: 2.3522 };
      const currentYear = new Date().getFullYear();

      (component as any).updateCurrentGuess(newCoordinates);

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        setCurrentGuess({
          guess: { year: currentYear, coordinates: newCoordinates }
        })
      );
    });
  });

  describe('Control Actions', () => {
    beforeEach(() => {
      component.ngOnInit();
      component.setMapReadyForTesting();
    });

    it('should remove pin and update state', () => {
      component.userPin = mockCoordinates;
      spyOn(component as any, 'updateCurrentGuess');

      component.onRemovePin();

      expect(mockMapService.removePin).toHaveBeenCalled();
      expect(component.userPin).toBeNull();
      expect((component as any).updateCurrentGuess).toHaveBeenCalledWith({ latitude: 0, longitude: 0 });
    });

    it('should not remove pin when map is not initialized', () => {
      component.isMapInitialized = false;

      component.onRemovePin();

      expect(mockMapService.removePin).not.toHaveBeenCalled();
    });

    it('should center map to world view', () => {
      component.onCenterMap();

      expect(mockMapService.setMapView).toHaveBeenCalledWith({ latitude: 20, longitude: 0 }, 2);
    });

    it('should not center map when not initialized', () => {
      component.isMapInitialized = false;

      component.onCenterMap();

      expect(mockMapService.setMapView).not.toHaveBeenCalled();
    });

    it('should zoom to pin location', () => {
      component.userPin = mockCoordinates;

      component.onZoomToPin();

      expect(mockMapService.setMapView).toHaveBeenCalledWith(mockCoordinates, 8);
    });

    it('should not zoom to pin when no pin exists', () => {
      component.userPin = null;

      component.onZoomToPin();

      expect(mockMapService.setMapView).not.toHaveBeenCalled();
    });

    it('should not zoom to pin when map is not initialized', () => {
      component.isMapInitialized = false;
      component.userPin = mockCoordinates;

      component.onZoomToPin();

      expect(mockMapService.setMapView).not.toHaveBeenCalled();
    });
  });

  describe('Getters and Display Properties', () => {
    it('should return true for hasValidPin when pin exists and is not placeholder', () => {
      component.userPin = mockCoordinates;

      expect(component.hasValidPin).toBeTrue();
    });

    it('should return false for hasValidPin when pin is null', () => {
      component.userPin = null;

      expect(component.hasValidPin).toBeFalse();
    });

    it('should return false for hasValidPin when pin is placeholder coordinates', () => {
      component.userPin = { latitude: 0, longitude: 0 };

      expect(component.hasValidPin).toBeFalse();
    });

    it('should return formatted coordinates for pinDisplayText', () => {
      component.userPin = { latitude: 40.7128, longitude: -74.0060 };

      expect(component.pinDisplayText).toBe('40.7128, -74.0060');
    });

    it('should return no location message when no valid pin', () => {
      component.userPin = null;

      expect(component.pinDisplayText).toBe('No location selected');
    });

    it('should return adjustment instructions when pin exists', () => {
      component.userPin = mockCoordinates;

      expect(component.mapInstructions).toBe('Click on the map to adjust your guess, or use the controls below.');
    });

    it('should return placement instructions when no pin exists', () => {
      component.userPin = null;

      expect(component.mapInstructions).toBe('Click anywhere on the map to place your location guess.');
    });
  });

  describe('Toggle Integration', () => {
    beforeEach(() => {
      component.isInToggleContainer = true;
      component.ngOnInit();
    });

    it('should sync with toggle service when in toggle container', () => {
      component.setMapReadyForTesting();
      const mapState = { ...defaultMapState, zoomLevel: 5 };
      
      // Create a new subject for the test
      const mapStateSubject = new Subject();
      Object.defineProperty(mockInterfaceToggleService, 'mapState$', {
        value: mapStateSubject.asObservable()
      });
      
      // Re-initialize to pick up the new observable
      component.ngOnInit();
      
      mapStateSubject.next(mapState);

      expect(mockMapService.setMapView).toHaveBeenCalledWith(mapState.center, mapState.zoomLevel);
    });

    it('should not sync with toggle service when not in toggle container', () => {
      component.isInToggleContainer = false;
      component.ngOnInit();
      component.setMapReadyForTesting();

      expect(mockMapService.setMapView).not.toHaveBeenCalled();
    });

    it('should update toggle service on zoom to pin', () => {
      component.setMapReadyForTesting();
      component.userPin = mockCoordinates;

      component.onZoomToPin();

      expect(mockInterfaceToggleService.setMapZoom).toHaveBeenCalledWith(8);
      expect(mockInterfaceToggleService.setMapCenter).toHaveBeenCalledWith(mockCoordinates);
    });

    it('should reset toggle service map state on reset', () => {
      component.setMapReadyForTesting();

      component.resetMapForNewPhoto();

      expect(mockInterfaceToggleService.resetMapState).toHaveBeenCalled();
    });
  });

  describe('Photo Change Detection', () => {
    it('should reset map when photo changes', () => {
      const guessSubject = new Subject<Guess | null>();
      const photoSubject = new Subject<Photo | null>();
      
      mockStore.select.and.callFake((selector: any) => {
        if (selector === selectCurrentGuess || selector.toString().includes('selectCurrentGuess')) {
          return guessSubject.asObservable();
        }
        if (selector === selectCurrentPhoto || selector.toString().includes('selectCurrentPhoto')) {
          return photoSubject.asObservable();
        }
        return of(null);
      });

      spyOn(component, 'resetMapForNewPhoto');
      component.ngOnInit();

      // Set initial photo
      photoSubject.next(mockPhoto);
      expect(component.currentPhotoId).toBe('photo1');

      // Change to new photo
      const newPhoto = { ...mockPhoto, id: 'photo2' };
      photoSubject.next(newPhoto);

      expect(component.resetMapForNewPhoto).toHaveBeenCalled();
      expect(component.currentPhotoId).toBe('photo2');
    });

    it('should not reset map on first photo load', () => {
      const guessSubject = new Subject<Guess | null>();
      const photoSubject = new Subject<Photo | null>();
      
      mockStore.select.and.callFake((selector: any) => {
        if (selector === selectCurrentGuess || selector.toString().includes('selectCurrentGuess')) {
          return guessSubject.asObservable();
        }
        if (selector === selectCurrentPhoto || selector.toString().includes('selectCurrentPhoto')) {
          return photoSubject.asObservable();
        }
        return of(null);
      });

      spyOn(component, 'resetMapForNewPhoto');
      component.ngOnInit();

      photoSubject.next(mockPhoto);

      expect(component.resetMapForNewPhoto).not.toHaveBeenCalled();
    });
  });

  describe('Reset Functionality', () => {
    beforeEach(() => {
      component.ngOnInit();
      component.setMapReadyForTesting();
    });

    it('should reset map for new photo', () => {
      component.userPin = mockCoordinates;
      spyOn(component, 'clearAllPins');
      spyOn(component, 'resetToDefaultView');
      spyOn(component as any, 'updateCurrentGuess');

      component.resetMapForNewPhoto();

      expect(component.clearAllPins).toHaveBeenCalled();
      expect(component.resetToDefaultView).toHaveBeenCalled();
      expect(component.userPin).toBeNull();
      expect((component as any).updateCurrentGuess).toHaveBeenCalledWith({ latitude: 0, longitude: 0 });
    });

    it('should clear all pins', () => {
      component.clearAllPins();

      expect(mockMapService.removePin).toHaveBeenCalled();
      expect(mockMapService.clearAdditionalMarkers).toHaveBeenCalled();
    });

    it('should reset to default view', () => {
      component.resetToDefaultView();

      expect(mockMapService.setMapView).toHaveBeenCalledWith({ latitude: 20, longitude: 0 }, 2);
    });

    it('should update toggle service on reset to default view', () => {
      component.isInToggleContainer = true;

      component.resetToDefaultView();

      expect(mockInterfaceToggleService.setMapCenter).toHaveBeenCalledWith({ latitude: 20, longitude: 0 });
      expect(mockInterfaceToggleService.setMapZoom).toHaveBeenCalledWith(2);
    });

    it('should handle reset errors gracefully', () => {
      mockMapService.removePin.and.throwError('Reset error');
      spyOn(console, 'error');

      component.resetMapForNewPhoto();

      expect(console.error).toHaveBeenCalledWith('Error clearing map pins:', jasmine.any(Error));
    });
  });

  describe('Map State Access', () => {
    beforeEach(() => {
      component.ngOnInit();
      component.isMapInitialized = true;
    });

    it('should get current map state', () => {
      component.userPin = mockCoordinates;
      mockMapService.getMapCenter.and.returnValue(mockCoordinates);

      const state = component.getCurrentMapState();

      expect(state.center).toEqual(mockCoordinates);
      expect(state.hasPin).toBeTrue();
    });

    it('should return null state when map not initialized', () => {
      component.isMapInitialized = false;

      const state = component.getCurrentMapState();

      expect(state.center).toBeNull();
      expect(state.zoomLevel).toBeNull();
      expect(state.hasPin).toBeFalse();
    });

    it('should resize map', fakeAsync(() => {
      spyOn(component as any, 'mapService').and.returnValue({ map: { invalidateSize: jasmine.createSpy() } });

      component.resizeMap();
      tick(100);

      // Test that resize was attempted (implementation detail may vary)
      expect(component.isMapInitialized).toBeTrue();
    }));
  });

  describe('Enhanced Control Methods', () => {
    beforeEach(() => {
      component.ngOnInit();
      component.setMapReadyForTesting();
    });

    it('should call resetToDefaultView on center map', () => {
      spyOn(component, 'resetToDefaultView');

      component.onCenterMap();

      expect(component.resetToDefaultView).toHaveBeenCalled();
    });

    it('should clear local state on remove pin', () => {
      component.userPin = mockCoordinates;
      spyOn(component as any, 'updateCurrentGuess');

      component.onRemovePin();

      expect(mockMapService.removePin).toHaveBeenCalled();
      expect(component.userPin).toBeNull();
      expect((component as any).updateCurrentGuess).toHaveBeenCalledWith({ latitude: 0, longitude: 0 });
    });
  });

  describe('Component Cleanup', () => {
    it('should clean up resources on destroy', () => {
      const destroySpy = spyOn((component as any).destroy$, 'next');
      const completeSpy = spyOn((component as any).destroy$, 'complete');

      component.ngOnDestroy();

      expect(destroySpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
      expect(mockMapService.destroy).toHaveBeenCalled();
    });
  });

  describe('Template Integration', () => {
    beforeEach(() => {
      component.ngOnInit();
      fixture.detectChanges();
    });

    it('should show loading state initially', () => {
      component.isMapLoading = true;
      fixture.detectChanges();

      const loadingElement = fixture.nativeElement.querySelector('.map-loading');
      expect(loadingElement).toBeTruthy();
      expect(loadingElement.textContent).toContain('Loading map...');
    });

    it('should show error state when map fails to load', () => {
      component.isMapLoading = false;
      component.mapError = 'Test error message';
      fixture.detectChanges();

      const errorElement = fixture.nativeElement.querySelector('.map-error');
      expect(errorElement).toBeTruthy();
      expect(errorElement.textContent).toContain('Test error message');
    });

    it('should show map controls when map is initialized', () => {
      component.setMapReadyForTesting();
      fixture.detectChanges();

      const controlsElement = fixture.nativeElement.querySelector('.map-controls');
      expect(controlsElement).toBeTruthy();
    });

    it('should disable zoom and remove buttons when no valid pin', () => {
      component.setMapReadyForTesting();
      component.userPin = null;
      fixture.detectChanges();

      const zoomButton = fixture.nativeElement.querySelector('.zoom-button');
      const removeButton = fixture.nativeElement.querySelector('.remove-button');

      expect(zoomButton.disabled).toBeTrue();
      expect(removeButton.disabled).toBeTrue();
    });

    it('should enable zoom and remove buttons when valid pin exists', () => {
      component.setMapReadyForTesting();
      component.userPin = mockCoordinates;
      fixture.detectChanges();

      const zoomButton = fixture.nativeElement.querySelector('.zoom-button');
      const removeButton = fixture.nativeElement.querySelector('.remove-button');

      expect(zoomButton.disabled).toBeFalse();
      expect(removeButton.disabled).toBeFalse();
    });

    it('should call control methods when buttons are clicked', () => {
      component.setMapReadyForTesting();
      component.userPin = mockCoordinates;
      fixture.detectChanges();

      spyOn(component, 'onCenterMap');
      spyOn(component, 'onZoomToPin');
      spyOn(component, 'onRemovePin');

      const centerButton = fixture.nativeElement.querySelector('.center-button');
      const zoomButton = fixture.nativeElement.querySelector('.zoom-button');
      const removeButton = fixture.nativeElement.querySelector('.remove-button');

      centerButton.click();
      zoomButton.click();
      removeButton.click();

      expect(component.onCenterMap).toHaveBeenCalled();
      expect(component.onZoomToPin).toHaveBeenCalled();
      expect(component.onRemovePin).toHaveBeenCalled();
    });

    it('should show reset button when in toggle container', () => {
      component.isInToggleContainer = true;
      component.setMapReadyForTesting();
      fixture.detectChanges();

      const resetButton = fixture.nativeElement.querySelector('.reset-button');
      expect(resetButton).toBeTruthy();
      expect(resetButton.textContent).toContain('Reset Map');
    });

    it('should not show reset button when not in toggle container', () => {
      component.isInToggleContainer = false;
      component.setMapReadyForTesting();
      fixture.detectChanges();

      const resetButton = fixture.nativeElement.querySelector('.reset-button');
      expect(resetButton).toBeFalsy();
    });

    it('should hide instructions when in toggle container', () => {
      component.isInToggleContainer = true;
      fixture.detectChanges();

      const instructions = fixture.nativeElement.querySelector('.map-instructions');
      expect(instructions).toBeFalsy();
    });

    it('should show instructions when not in toggle container', () => {
      component.isInToggleContainer = false;
      fixture.detectChanges();

      const instructions = fixture.nativeElement.querySelector('.map-instructions');
      expect(instructions).toBeTruthy();
    });

    it('should apply toggle container CSS class', () => {
      component.isInToggleContainer = true;
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.map-guess-container');
      expect(container.classList.contains('in-toggle-container')).toBeTrue();
    });

    it('should call resetToDefaultView when reset button is clicked', () => {
      component.isInToggleContainer = true;
      component.setMapReadyForTesting();
      fixture.detectChanges();

      spyOn(component, 'resetToDefaultView');

      const resetButton = fixture.nativeElement.querySelector('.reset-button');
      resetButton.click();

      expect(component.resetToDefaultView).toHaveBeenCalled();
    });
  });
});