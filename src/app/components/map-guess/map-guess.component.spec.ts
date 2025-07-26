import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { of, Subject } from 'rxjs';
import { ElementRef } from '@angular/core';

import { MapGuessComponent } from './map-guess.component';
import { MapService } from '../../services/map.service';
import { setCurrentGuess } from '../../state/scoring/scoring.actions';
import { Coordinates } from '../../models/coordinates.model';
import { Guess } from '../../models/scoring.model';

describe('MapGuessComponent', () => {
  let component: MapGuessComponent;
  let fixture: ComponentFixture<MapGuessComponent>;
  let mockStore: jasmine.SpyObj<Store>;
  let mockMapService: jasmine.SpyObj<MapService>;
  let mockElementRef: jasmine.SpyObj<ElementRef>;

  const mockCoordinates: Coordinates = { latitude: 40.7128, longitude: -74.0060 };
  const mockGuess: Guess = { year: 2020, coordinates: mockCoordinates };

  beforeEach(async () => {
    // Create spy objects
    mockStore = jasmine.createSpyObj('Store', ['select', 'dispatch']);
    mockMapService = jasmine.createSpyObj('MapService', [
      'initializeMap',
      'enableClickToPlace',
      'addPin',
      'removePin',
      'setMapView',
      'destroy'
    ]);

    // Mock store selectors
    mockStore.select.and.returnValue(of(null));

    await TestBed.configureTestingModule({
      imports: [MapGuessComponent],
      providers: [
        { provide: Store, useValue: mockStore },
        { provide: MapService, useValue: mockMapService }
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
      component.isMapInitialized = true;
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
      component.isMapInitialized = true;
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
      component.isMapInitialized = true;
      component.isMapLoading = false;
      component.mapError = null;
      fixture.detectChanges();

      const controlsElement = fixture.nativeElement.querySelector('.map-controls');
      expect(controlsElement).toBeTruthy();
    });

    it('should disable zoom and remove buttons when no valid pin', () => {
      component.isMapInitialized = true;
      component.isMapLoading = false;
      component.mapError = null;
      component.userPin = null;
      fixture.detectChanges();

      const zoomButton = fixture.nativeElement.querySelector('.zoom-button');
      const removeButton = fixture.nativeElement.querySelector('.remove-button');

      expect(zoomButton.disabled).toBeTrue();
      expect(removeButton.disabled).toBeTrue();
    });

    it('should enable zoom and remove buttons when valid pin exists', () => {
      component.isMapInitialized = true;
      component.isMapLoading = false;
      component.mapError = null;
      component.userPin = mockCoordinates;
      fixture.detectChanges();

      const zoomButton = fixture.nativeElement.querySelector('.zoom-button');
      const removeButton = fixture.nativeElement.querySelector('.remove-button');

      expect(zoomButton.disabled).toBeFalse();
      expect(removeButton.disabled).toBeFalse();
    });

    it('should call control methods when buttons are clicked', () => {
      component.isMapInitialized = true;
      component.isMapLoading = false;
      component.mapError = null;
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
  });
});