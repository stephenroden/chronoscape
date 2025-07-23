import { TestBed } from '@angular/core/testing';
import * as L from 'leaflet';
import { MapService } from './map.service';
import { Coordinates } from '../models/coordinates.model';

describe('MapService', () => {
  let service: MapService;
  let mockMapElement: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MapService);

    // Create a mock DOM element for the map
    mockMapElement = document.createElement('div');
    mockMapElement.id = 'test-map';
    mockMapElement.style.height = '400px';
    mockMapElement.style.width = '400px';
    document.body.appendChild(mockMapElement);
  });

  afterEach(() => {
    // Clean up the map and DOM element
    service.destroy();
    if (mockMapElement && mockMapElement.parentNode) {
      mockMapElement.parentNode.removeChild(mockMapElement);
    }
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initializeMap', () => {
    it('should initialize a map with default coordinates and zoom', () => {
      const map = service.initializeMap('test-map');
      
      expect(map).toBeTruthy();
      expect(map instanceof L.Map).toBe(true);
      
      const center = map.getCenter();
      expect(center.lat).toBe(20);
      expect(center.lng).toBe(0);
      expect(map.getZoom()).toBe(2);
    });

    it('should initialize a map with custom coordinates and zoom', () => {
      const coordinates: Coordinates = { latitude: 40.7128, longitude: -74.0060 };
      const zoom = 10;
      
      const map = service.initializeMap('test-map', coordinates, zoom);
      
      const center = map.getCenter();
      expect(center.lat).toBeCloseTo(coordinates.latitude, 4);
      expect(center.lng).toBeCloseTo(coordinates.longitude, 4);
      expect(map.getZoom()).toBe(zoom);
    });

    it('should clean up existing map when initializing a new one', () => {
      const map1 = service.initializeMap('test-map');
      const removeSpy = spyOn(map1, 'remove');
      
      service.initializeMap('test-map');
      
      expect(removeSpy).toHaveBeenCalled();
    });
  });

  describe('addPin', () => {
    beforeEach(() => {
      service.initializeMap('test-map');
    });

    it('should add a pin at specified coordinates', () => {
      const coordinates: Coordinates = { latitude: 40.7128, longitude: -74.0060 };
      
      const marker = service.addPin(coordinates);
      
      expect(marker).toBeTruthy();
      expect(marker instanceof L.Marker).toBe(true);
      
      const markerLatLng = marker.getLatLng();
      expect(markerLatLng.lat).toBeCloseTo(coordinates.latitude, 4);
      expect(markerLatLng.lng).toBeCloseTo(coordinates.longitude, 4);
    });

    it('should remove existing pin when adding a new one', () => {
      const coordinates1: Coordinates = { latitude: 40.7128, longitude: -74.0060 };
      const coordinates2: Coordinates = { latitude: 51.5074, longitude: -0.1278 };
      
      const marker1 = service.addPin(coordinates1);
      const marker2 = service.addPin(coordinates2);
      
      expect(marker1).not.toBe(marker2);
      
      const pinCoordinates = service.getPinCoordinates();
      expect(pinCoordinates?.latitude).toBeCloseTo(coordinates2.latitude, 4);
      expect(pinCoordinates?.longitude).toBeCloseTo(coordinates2.longitude, 4);
    });

    it('should throw error if map is not initialized', () => {
      service.destroy();
      const coordinates: Coordinates = { latitude: 40.7128, longitude: -74.0060 };
      
      expect(() => service.addPin(coordinates)).toThrowError('Map must be initialized before adding pins');
    });
  });

  describe('removePin', () => {
    beforeEach(() => {
      service.initializeMap('test-map');
    });

    it('should remove the current pin', () => {
      const coordinates: Coordinates = { latitude: 40.7128, longitude: -74.0060 };
      service.addPin(coordinates);
      
      expect(service.getPinCoordinates()).toBeTruthy();
      
      service.removePin();
      
      expect(service.getPinCoordinates()).toBeNull();
    });

    it('should handle removing pin when no pin exists', () => {
      expect(() => service.removePin()).not.toThrow();
      expect(service.getPinCoordinates()).toBeNull();
    });
  });

  describe('getPinCoordinates', () => {
    beforeEach(() => {
      service.initializeMap('test-map');
    });

    it('should return pin coordinates when pin exists', () => {
      const coordinates: Coordinates = { latitude: 40.7128, longitude: -74.0060 };
      service.addPin(coordinates);
      
      const pinCoordinates = service.getPinCoordinates();
      
      expect(pinCoordinates).toBeTruthy();
      expect(pinCoordinates?.latitude).toBeCloseTo(coordinates.latitude, 4);
      expect(pinCoordinates?.longitude).toBeCloseTo(coordinates.longitude, 4);
    });

    it('should return null when no pin exists', () => {
      const pinCoordinates = service.getPinCoordinates();
      
      expect(pinCoordinates).toBeNull();
    });
  });

  describe('setMapView', () => {
    beforeEach(() => {
      service.initializeMap('test-map');
    });

    it('should set map view to specified coordinates and zoom', () => {
      const coordinates: Coordinates = { latitude: 48.8566, longitude: 2.3522 };
      const zoom = 15;
      
      service.setMapView(coordinates, zoom);
      
      const map = service['map'] as L.Map;
      const center = map.getCenter();
      expect(center.lat).toBeCloseTo(coordinates.latitude, 4);
      expect(center.lng).toBeCloseTo(coordinates.longitude, 4);
      expect(map.getZoom()).toBe(zoom);
    });

    it('should throw error if map is not initialized', () => {
      service.destroy();
      const coordinates: Coordinates = { latitude: 48.8566, longitude: 2.3522 };
      
      expect(() => service.setMapView(coordinates, 15)).toThrowError('Map must be initialized before setting view');
    });
  });

  describe('enableClickToPlace', () => {
    beforeEach(() => {
      service.initializeMap('test-map');
    });

    it('should enable click handling and call callback with coordinates', () => {
      const callback = jasmine.createSpy('callback');
      const testCoordinates: Coordinates = { latitude: 40.7128, longitude: -74.0060 };
      
      service.enableClickToPlace(callback);
      
      // Simulate a map click event
      const map = service['map'] as L.Map;
      const mockEvent = {
        latlng: L.latLng(testCoordinates.latitude, testCoordinates.longitude)
      } as L.LeafletMouseEvent;
      
      map.fire('click', mockEvent);
      
      expect(callback).toHaveBeenCalledWith(testCoordinates);
    });

    it('should throw error if map is not initialized', () => {
      service.destroy();
      const callback = jasmine.createSpy('callback');
      
      expect(() => service.enableClickToPlace(callback)).toThrowError('Map must be initialized before enabling click handling');
    });
  });

  describe('disableClickToPlace', () => {
    beforeEach(() => {
      service.initializeMap('test-map');
    });

    it('should disable click handling', () => {
      const callback = jasmine.createSpy('callback');
      
      service.enableClickToPlace(callback);
      service.disableClickToPlace();
      
      // Simulate a map click event after disabling
      const map = service['map'] as L.Map;
      const mockEvent = {
        latlng: L.latLng(40.7128, -74.0060)
      } as L.LeafletMouseEvent;
      
      map.fire('click', mockEvent);
      
      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle disabling when map is not initialized', () => {
      service.destroy();
      expect(() => service.disableClickToPlace()).not.toThrow();
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two coordinates using Haversine formula', () => {
      // Distance between New York and London (approximately 5585 km)
      const newYork: Coordinates = { latitude: 40.7128, longitude: -74.0060 };
      const london: Coordinates = { latitude: 51.5074, longitude: -0.1278 };
      
      const distance = service.calculateDistance(newYork, london);
      
      // Allow for some tolerance in the calculation
      expect(distance).toBeCloseTo(5585, -2); // Within 100km tolerance
    });

    it('should return 0 for identical coordinates', () => {
      const coordinates: Coordinates = { latitude: 40.7128, longitude: -74.0060 };
      
      const distance = service.calculateDistance(coordinates, coordinates);
      
      expect(distance).toBeCloseTo(0, 6);
    });

    it('should calculate short distances accurately', () => {
      // Two points very close to each other (approximately 1.11 km apart)
      const point1: Coordinates = { latitude: 40.7128, longitude: -74.0060 };
      const point2: Coordinates = { latitude: 40.7228, longitude: -74.0060 };
      
      const distance = service.calculateDistance(point1, point2);
      
      expect(distance).toBeCloseTo(1.11, 1);
    });
  });

  describe('getMapBounds', () => {
    it('should return map bounds when map is initialized', () => {
      service.initializeMap('test-map');
      
      const bounds = service.getMapBounds();
      
      expect(bounds).toBeTruthy();
      expect(bounds instanceof L.LatLngBounds).toBe(true);
    });

    it('should return null when map is not initialized', () => {
      const bounds = service.getMapBounds();
      
      expect(bounds).toBeNull();
    });
  });

  describe('fitBounds', () => {
    beforeEach(() => {
      service.initializeMap('test-map');
    });

    it('should fit map bounds to show both coordinates', () => {
      const coord1: Coordinates = { latitude: 40.7128, longitude: -74.0060 };
      const coord2: Coordinates = { latitude: 51.5074, longitude: -0.1278 };
      
      const map = service['map'] as L.Map;
      const fitBoundsSpy = spyOn(map, 'fitBounds');
      
      service.fitBounds(coord1, coord2);
      
      expect(fitBoundsSpy).toHaveBeenCalled();
      const bounds = fitBoundsSpy.calls.argsFor(0)[0] as L.LatLngBounds;
      expect(bounds.contains([coord1.latitude, coord1.longitude])).toBe(true);
      expect(bounds.contains([coord2.latitude, coord2.longitude])).toBe(true);
    });

    it('should throw error if map is not initialized', () => {
      service.destroy();
      const coord1: Coordinates = { latitude: 40.7128, longitude: -74.0060 };
      const coord2: Coordinates = { latitude: 51.5074, longitude: -0.1278 };
      
      expect(() => service.fitBounds(coord1, coord2)).toThrowError('Map must be initialized before fitting bounds');
    });
  });

  describe('addSecondPin', () => {
    beforeEach(() => {
      service.initializeMap('test-map');
    });

    it('should add a second pin without removing the first pin', () => {
      const coord1: Coordinates = { latitude: 40.7128, longitude: -74.0060 };
      const coord2: Coordinates = { latitude: 51.5074, longitude: -0.1278 };
      
      service.addPin(coord1);
      const secondMarker = service.addSecondPin(coord2);
      
      expect(secondMarker).toBeTruthy();
      expect(secondMarker instanceof L.Marker).toBe(true);
      
      // First pin should still exist
      const firstPinCoordinates = service.getPinCoordinates();
      expect(firstPinCoordinates?.latitude).toBeCloseTo(coord1.latitude, 4);
      expect(firstPinCoordinates?.longitude).toBeCloseTo(coord1.longitude, 4);
      
      // Second pin should be at correct location
      const secondPinLatLng = secondMarker.getLatLng();
      expect(secondPinLatLng.lat).toBeCloseTo(coord2.latitude, 4);
      expect(secondPinLatLng.lng).toBeCloseTo(coord2.longitude, 4);
    });

    it('should throw error if map is not initialized', () => {
      service.destroy();
      const coordinates: Coordinates = { latitude: 40.7128, longitude: -74.0060 };
      
      expect(() => service.addSecondPin(coordinates)).toThrowError('Map must be initialized before adding pins');
    });
  });

  describe('destroy', () => {
    it('should clean up map instance and reset state', () => {
      const map = service.initializeMap('test-map');
      const removeSpy = spyOn(map, 'remove');
      
      service.addPin({ latitude: 40.7128, longitude: -74.0060 });
      
      service.destroy();
      
      expect(removeSpy).toHaveBeenCalled();
      expect(service.getPinCoordinates()).toBeNull();
      expect(service.getMapBounds()).toBeNull();
    });

    it('should handle destroying when no map exists', () => {
      expect(() => service.destroy()).not.toThrow();
    });
  });

  describe('private methods', () => {
    it('should convert degrees to radians correctly', () => {
      // Access private method through bracket notation for testing
      const toRadians = (service as any).toRadians;
      
      expect(toRadians(0)).toBe(0);
      expect(toRadians(90)).toBeCloseTo(Math.PI / 2, 6);
      expect(toRadians(180)).toBeCloseTo(Math.PI, 6);
      expect(toRadians(360)).toBeCloseTo(2 * Math.PI, 6);
    });
  });
});