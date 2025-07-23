import { TestBed } from '@angular/core/testing';
import { ScoringService } from './scoring.service';
import { Coordinates } from '../models/coordinates.model';
import { Guess, Score } from '../models/scoring.model';

describe('ScoringService', () => {
  let service: ScoringService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ScoringService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('calculateYearScore', () => {
    it('should return 5000 points for exact match', () => {
      expect(service.calculateYearScore(1950, 1950)).toBe(5000);
      expect(service.calculateYearScore(2000, 2000)).toBe(5000);
    });

    it('should return 4500 points for within 1 year', () => {
      expect(service.calculateYearScore(1950, 1951)).toBe(4500);
      expect(service.calculateYearScore(1951, 1950)).toBe(4500);
      expect(service.calculateYearScore(2000, 1999)).toBe(4500);
    });

    it('should return 3000 points for within 5 years', () => {
      expect(service.calculateYearScore(1950, 1955)).toBe(3000);
      expect(service.calculateYearScore(1955, 1950)).toBe(3000);
      expect(service.calculateYearScore(2000, 1996)).toBe(3000);
      expect(service.calculateYearScore(1945, 1950)).toBe(3000);
    });

    it('should return 1500 points for within 10 years', () => {
      expect(service.calculateYearScore(1950, 1960)).toBe(1500);
      expect(service.calculateYearScore(1960, 1950)).toBe(1500);
      expect(service.calculateYearScore(2000, 1990)).toBe(1500);
      expect(service.calculateYearScore(1940, 1950)).toBe(1500);
    });

    it('should return 0 points for more than 10 years difference', () => {
      expect(service.calculateYearScore(1950, 1961)).toBe(0);
      expect(service.calculateYearScore(1961, 1950)).toBe(0);
      expect(service.calculateYearScore(2000, 1989)).toBe(0);
      expect(service.calculateYearScore(1930, 1950)).toBe(0);
    });

    it('should handle edge cases correctly', () => {
      // Boundary cases for 1 year
      expect(service.calculateYearScore(1950, 1949)).toBe(4500);
      
      // Boundary cases for 5 years
      expect(service.calculateYearScore(1950, 1945)).toBe(3000);
      
      // Boundary cases for 10 years
      expect(service.calculateYearScore(1950, 1940)).toBe(1500);
      
      // Just over 10 years
      expect(service.calculateYearScore(1950, 1939)).toBe(0);
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between same coordinates as 0', () => {
      const coord1: Coordinates = { latitude: 40.7128, longitude: -74.0060 };
      const coord2: Coordinates = { latitude: 40.7128, longitude: -74.0060 };
      
      expect(service.calculateDistance(coord1, coord2)).toBeCloseTo(0, 2);
    });

    it('should calculate distance between New York and Los Angeles correctly', () => {
      const nyc: Coordinates = { latitude: 40.7128, longitude: -74.0060 };
      const la: Coordinates = { latitude: 34.0522, longitude: -118.2437 };
      
      // Expected distance is approximately 3936 km
      const distance = service.calculateDistance(nyc, la);
      expect(distance).toBeCloseTo(3936, 0);
    });

    it('should calculate distance between London and Paris correctly', () => {
      const london: Coordinates = { latitude: 51.5074, longitude: -0.1278 };
      const paris: Coordinates = { latitude: 48.8566, longitude: 2.3522 };
      
      // Expected distance is approximately 344 km
      const distance = service.calculateDistance(london, paris);
      expect(distance).toBeCloseTo(344, 0);
    });

    it('should handle antipodal points correctly', () => {
      const coord1: Coordinates = { latitude: 0, longitude: 0 };
      const coord2: Coordinates = { latitude: 0, longitude: 180 };
      
      // Half the Earth's circumference
      const distance = service.calculateDistance(coord1, coord2);
      expect(distance).toBeCloseTo(20015, 0);
    });

    it('should handle polar coordinates correctly', () => {
      const northPole: Coordinates = { latitude: 90, longitude: 0 };
      const southPole: Coordinates = { latitude: -90, longitude: 0 };
      
      // Half the Earth's circumference
      const distance = service.calculateDistance(northPole, southPole);
      expect(distance).toBeCloseTo(20015, 0);
    });
  });

  describe('calculateLocationScore', () => {
    it('should return 5000 points for within 1km', () => {
      const coord1: Coordinates = { latitude: 40.7128, longitude: -74.0060 };
      const coord2: Coordinates = { latitude: 40.7138, longitude: -74.0070 }; // ~1km away
      
      expect(service.calculateLocationScore(coord1, coord2)).toBe(5000);
    });

    it('should return 4000 points for within 10km', () => {
      const coord1: Coordinates = { latitude: 40.7128, longitude: -74.0060 };
      const coord2: Coordinates = { latitude: 40.8000, longitude: -74.0060 }; // ~9.7km away
      
      expect(service.calculateLocationScore(coord1, coord2)).toBe(4000);
    });

    it('should return 2500 points for within 50km', () => {
      const coord1: Coordinates = { latitude: 40.7128, longitude: -74.0060 };
      const coord2: Coordinates = { latitude: 41.0000, longitude: -74.0060 }; // ~32km away
      
      expect(service.calculateLocationScore(coord1, coord2)).toBe(2500);
    });

    it('should return 1000 points for within 200km', () => {
      const coord1: Coordinates = { latitude: 40.7128, longitude: -74.0060 };
      const coord2: Coordinates = { latitude: 42.0000, longitude: -74.0060 }; // ~143km away
      
      expect(service.calculateLocationScore(coord1, coord2)).toBe(1000);
    });

    it('should return 0 points for more than 200km', () => {
      const nyc: Coordinates = { latitude: 40.7128, longitude: -74.0060 };
      const boston: Coordinates = { latitude: 42.3601, longitude: -71.0589 }; // ~306km away
      
      expect(service.calculateLocationScore(nyc, boston)).toBe(0);
    });

    it('should handle exact same location', () => {
      const coord: Coordinates = { latitude: 40.7128, longitude: -74.0060 };
      
      expect(service.calculateLocationScore(coord, coord)).toBe(5000);
    });
  });

  describe('calculateScore', () => {
    it('should calculate complete score correctly', () => {
      const photoId = 'test-photo-1';
      const guess: Guess = {
        year: 1950,
        coordinates: { latitude: 40.7128, longitude: -74.0060 }
      };
      const actualYear = 1952;
      const actualCoords: Coordinates = { latitude: 40.7138, longitude: -74.0070 };

      const score = service.calculateScore(photoId, guess, actualYear, actualCoords);

      expect(score.photoId).toBe(photoId);
      expect(score.yearScore).toBe(3000); // Within 5 years
      expect(score.locationScore).toBe(5000); // Within 1km
      expect(score.totalScore).toBe(8000);
    });

    it('should handle perfect score', () => {
      const photoId = 'perfect-photo';
      const guess: Guess = {
        year: 1950,
        coordinates: { latitude: 40.7128, longitude: -74.0060 }
      };
      const actualYear = 1950;
      const actualCoords: Coordinates = { latitude: 40.7128, longitude: -74.0060 };

      const score = service.calculateScore(photoId, guess, actualYear, actualCoords);

      expect(score.photoId).toBe(photoId);
      expect(score.yearScore).toBe(5000);
      expect(score.locationScore).toBe(5000);
      expect(score.totalScore).toBe(10000);
    });

    it('should handle zero score', () => {
      const photoId = 'zero-photo';
      const guess: Guess = {
        year: 1950,
        coordinates: { latitude: 40.7128, longitude: -74.0060 }
      };
      const actualYear = 1970; // 20 years off
      const actualCoords: Coordinates = { latitude: 34.0522, longitude: -118.2437 }; // LA, ~3944km away

      const score = service.calculateScore(photoId, guess, actualYear, actualCoords);

      expect(score.photoId).toBe(photoId);
      expect(score.yearScore).toBe(0);
      expect(score.locationScore).toBe(0);
      expect(score.totalScore).toBe(0);
    });
  });

  describe('getTotalScore', () => {
    it('should calculate total score from array of scores', () => {
      const scores: Score[] = [
        { photoId: '1', yearScore: 5000, locationScore: 4000, totalScore: 9000 },
        { photoId: '2', yearScore: 3000, locationScore: 2500, totalScore: 5500 },
        { photoId: '3', yearScore: 1500, locationScore: 1000, totalScore: 2500 }
      ];

      expect(service.getTotalScore(scores)).toBe(17000);
    });

    it('should return 0 for empty array', () => {
      expect(service.getTotalScore([])).toBe(0);
    });

    it('should handle single score', () => {
      const scores: Score[] = [
        { photoId: '1', yearScore: 5000, locationScore: 5000, totalScore: 10000 }
      ];

      expect(service.getTotalScore(scores)).toBe(10000);
    });

    it('should handle all zero scores', () => {
      const scores: Score[] = [
        { photoId: '1', yearScore: 0, locationScore: 0, totalScore: 0 },
        { photoId: '2', yearScore: 0, locationScore: 0, totalScore: 0 }
      ];

      expect(service.getTotalScore(scores)).toBe(0);
    });
  });

  describe('toRadians (private method testing through public methods)', () => {
    it('should convert degrees to radians correctly in distance calculations', () => {
      // Test with coordinates that have known conversion values
      const coord1: Coordinates = { latitude: 0, longitude: 0 };
      const coord2: Coordinates = { latitude: 90, longitude: 0 }; // Quarter of Earth
      
      const distance = service.calculateDistance(coord1, coord2);
      // Quarter of Earth's circumference should be ~10,007 km
      expect(distance).toBeCloseTo(10007, 0);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle very small distances correctly', () => {
      const coord1: Coordinates = { latitude: 40.7128, longitude: -74.0060 };
      const coord2: Coordinates = { latitude: 40.7128001, longitude: -74.0060001 };
      
      const distance = service.calculateDistance(coord1, coord2);
      expect(distance).toBeGreaterThanOrEqual(0);
      expect(distance).toBeLessThan(0.1); // Should be very small
    });

    it('should handle maximum possible distance on Earth', () => {
      const coord1: Coordinates = { latitude: 0, longitude: 0 };
      const coord2: Coordinates = { latitude: 0, longitude: 180 };
      
      const distance = service.calculateDistance(coord1, coord2);
      expect(distance).toBeLessThanOrEqual(20016); // Half Earth's circumference
    });

    it('should handle negative coordinates correctly', () => {
      const coord1: Coordinates = { latitude: -40.7128, longitude: -74.0060 };
      const coord2: Coordinates = { latitude: -40.8000, longitude: -74.0060 };
      
      const distance = service.calculateDistance(coord1, coord2);
      expect(distance).toBeGreaterThan(0);
    });
  });
});