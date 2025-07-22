import { Coordinates, validateCoordinates } from './coordinates.model';

describe('Coordinates Model', () => {
  describe('validateCoordinates', () => {
    it('should return true for valid coordinates', () => {
      const validCoordinates: Coordinates[] = [
        { latitude: 0, longitude: 0 },
        { latitude: 90, longitude: 180 },
        { latitude: -90, longitude: -180 },
        { latitude: 45.5, longitude: -122.3 },
        { latitude: -33.8688, longitude: 151.2093 } // Sydney
      ];

      validCoordinates.forEach(coords => {
        expect(validateCoordinates(coords)).toBe(true);
      });
    });

    it('should return false for invalid latitude values', () => {
      const invalidLatitudes: Coordinates[] = [
        { latitude: 91, longitude: 0 },
        { latitude: -91, longitude: 0 },
        { latitude: 180, longitude: 0 },
        { latitude: -180, longitude: 0 }
      ];

      invalidLatitudes.forEach(coords => {
        expect(validateCoordinates(coords)).toBe(false);
      });
    });

    it('should return false for invalid longitude values', () => {
      const invalidLongitudes: Coordinates[] = [
        { latitude: 0, longitude: 181 },
        { latitude: 0, longitude: -181 },
        { latitude: 0, longitude: 360 },
        { latitude: 0, longitude: -360 }
      ];

      invalidLongitudes.forEach(coords => {
        expect(validateCoordinates(coords)).toBe(false);
      });
    });

    it('should return false for non-numeric values', () => {
      const invalidTypes = [
        { latitude: 'invalid' as any, longitude: 0 },
        { latitude: 0, longitude: 'invalid' as any },
        { latitude: null as any, longitude: 0 },
        { latitude: 0, longitude: undefined as any },
        { latitude: true as any, longitude: false as any }
      ];

      invalidTypes.forEach(coords => {
        expect(validateCoordinates(coords)).toBe(false);
      });
    });

    it('should return false for infinite or NaN values', () => {
      const invalidNumbers: Coordinates[] = [
        { latitude: Infinity, longitude: 0 },
        { latitude: -Infinity, longitude: 0 },
        { latitude: 0, longitude: Infinity },
        { latitude: 0, longitude: -Infinity },
        { latitude: NaN, longitude: 0 },
        { latitude: 0, longitude: NaN }
      ];

      invalidNumbers.forEach(coords => {
        expect(validateCoordinates(coords)).toBe(false);
      });
    });

    it('should return false for null, undefined, or non-object inputs', () => {
      const invalidInputs = [
        null,
        undefined,
        'string',
        123,
        [],
        true
      ];

      invalidInputs.forEach(input => {
        expect(validateCoordinates(input as any)).toBe(false);
      });
    });

    it('should return false for objects missing required properties', () => {
      const incompleteObjects = [
        { latitude: 45 }, // missing longitude
        { longitude: -122 }, // missing latitude
        {}, // missing both
        { latitude: 45, longitude: -122, extra: 'property' } // extra properties should still work
      ];

      expect(validateCoordinates(incompleteObjects[0] as any)).toBe(false);
      expect(validateCoordinates(incompleteObjects[1] as any)).toBe(false);
      expect(validateCoordinates(incompleteObjects[2] as any)).toBe(false);
      expect(validateCoordinates(incompleteObjects[3] as any)).toBe(true); // extra properties are ok
    });
  });
});