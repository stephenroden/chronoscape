import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { ElementRef } from '@angular/core';

import { MapGuessComponent } from './map-guess.component';
import { MapService } from '../../services/map.service';
import { InterfaceToggleService } from '../../services/interface-toggle.service';
import { Coordinates } from '../../models/coordinates.model';
import { defaultMapState } from '../../models/interface-state.model';

/**
 * Integration tests for MapGuessComponent with toggle functionality
 */
describe('MapGuessComponent Integration', () => {
  let component: MapGuessComponent;
  let fixture: ComponentFixture<MapGuessComponent>;
  let mockStore: jasmine.SpyObj<Store>;
  let mockMapService: jasmine.SpyObj<MapService>;
  let mockInterfaceToggleService: jasmine.SpyObj<InterfaceToggleService>;

  const mockCoordinates: Coordinates = { latitude: 40.7128, longitude: -74.0060 };

  beforeEach(async () => {
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
      'clearAdditionalMarkers',
      'resetToDefault'
    ]);
    mockInterfaceToggleService = jasmine.createSpyObj('InterfaceToggleService', [
      'setMapCenter',
      'setMapZoom',
      'resetMapState'
    ], {
      mapState$: of(defaultMapState)
    });

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

  describe('Toggle Container Integration', () => {
    it('should work correctly when used in toggle container', () => {
      component.isInToggleContainer = true;
      component.setMapReadyForTesting();
      
      // Test that component adapts to toggle container mode
      expect(component.isInToggleContainer).toBeTrue();
      
      // Test reset functionality
      component.resetMapForNewPhoto();
      
      expect(mockMapService.removePin).toHaveBeenCalled();
      expect(mockMapService.clearAdditionalMarkers).toHaveBeenCalled();
      expect(mockInterfaceToggleService.resetMapState).toHaveBeenCalled();
    });

    it('should work correctly when used standalone', () => {
      component.isInToggleContainer = false;
      component.setMapReadyForTesting();
      
      // Test that component works in standalone mode
      expect(component.isInToggleContainer).toBeFalse();
      
      // Test reset functionality (should not call toggle service)
      component.resetMapForNewPhoto();
      
      expect(mockMapService.removePin).toHaveBeenCalled();
      expect(mockMapService.clearAdditionalMarkers).toHaveBeenCalled();
      expect(mockInterfaceToggleService.resetMapState).not.toHaveBeenCalled();
    });

    it('should provide current map state for external access', () => {
      component.setMapReadyForTesting();
      component.userPin = mockCoordinates;
      mockMapService.getMapCenter.and.returnValue(mockCoordinates);

      const state = component.getCurrentMapState();

      expect(state.center).toEqual(mockCoordinates);
      expect(state.hasPin).toBeTrue();
    });

    it('should handle map resize for toggle transitions', () => {
      component.setMapReadyForTesting();
      
      // Should not throw error
      expect(() => component.resizeMap()).not.toThrow();
    });
  });

  describe('Enhanced Reset Functionality', () => {
    beforeEach(() => {
      component.setMapReadyForTesting();
    });

    it('should clear all pins and reset view', () => {
      component.userPin = mockCoordinates;
      
      component.clearAllPins();
      
      expect(mockMapService.removePin).toHaveBeenCalled();
      expect(mockMapService.clearAdditionalMarkers).toHaveBeenCalled();
    });

    it('should reset to default view', () => {
      component.resetToDefaultView();
      
      expect(mockMapService.setMapView).toHaveBeenCalledWith(
        { latitude: 20, longitude: 0 }, 
        2
      );
    });

    it('should handle complete reset for new photo', () => {
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
  });

  describe('Template Integration with Toggle Container', () => {
    it('should show appropriate UI elements for toggle container mode', () => {
      component.isInToggleContainer = true;
      component.setMapReadyForTesting();
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.map-guess-container');
      expect(container.classList.contains('in-toggle-container')).toBeTrue();

      // Should not show instructions in toggle mode
      const instructions = fixture.nativeElement.querySelector('.map-instructions');
      expect(instructions).toBeFalsy();

      // Should show reset button in toggle mode
      const resetButton = fixture.nativeElement.querySelector('.reset-button');
      expect(resetButton).toBeTruthy();
    });

    it('should show appropriate UI elements for standalone mode', () => {
      component.isInToggleContainer = false;
      component.setMapReadyForTesting();
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.map-guess-container');
      expect(container.classList.contains('in-toggle-container')).toBeFalse();

      // Should show instructions in standalone mode
      const instructions = fixture.nativeElement.querySelector('.map-instructions');
      expect(instructions).toBeTruthy();

      // Should not show reset button in standalone mode
      const resetButton = fixture.nativeElement.querySelector('.reset-button');
      expect(resetButton).toBeFalsy();
    });
  });
});