import { TestBed } from '@angular/core/testing';
import { EnhancedFeedbackService } from './enhanced-feedback.service';
import { ScoringService } from './scoring.service';
import { Photo } from '../models/photo.model';
import { Guess } from '../models/scoring.model';
import { Coordinates } from '../models/coordinates.model';
import { YearAccuracy, LocationAccuracy } from '../models/enhanced-feedback.model';

describe('EnhancedFeedbackService', () => {
  let service: EnhancedFeedbackService;
  let scoringService: jasmine.SpyObj<ScoringService>;

  const mockPhoto: Photo = {
    id: 'test-photo-1',
    url: 'https://example.com/photo.jpg',
    title: 'Test Photo',
    description: 'A test photograph',
    year: 1965,
    coordinates: { latitude: 40.7128, longitude: -74.0060 }, // New York
    source: 'Test Source',
    metadata: {
      license: 'CC BY 4.0',
      originalSource: 'Test Archive',
      dateCreated: new Date('1965-06-15'),
      photographer: 'Test Photographer'
    }
  };

  const mockGuess: Guess = {
    year: 1967,
    coordinates: { latitude: 40.7589, longitude: -73.9851 } // Times Square
  };

  beforeEach(() => {
    const scoringServiceSpy = jasmine.createSpyObj('ScoringService', ['calculateDistance']);

    TestBed.configureTestingModule({
      providers: [
        EnhancedFeedbackService,
        { provide: ScoringService, useValue: scoringServiceSpy }
      ]
    });

    service = TestBed.inject(EnhancedFeedbackService);
    scoringService = TestBed.inject(ScoringService) as jasmine.SpyObj<ScoringService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('generateFeedback', () => {
    beforeEach(() => {
      scoringService.calculateDistance.and.returnValue(5.2);
    });

    it('should generate comprehensive feedback', () => {
      const feedback = service.generateFeedback(mockPhoto, mockGuess);

      expect(feedback).toBeDefined();
      expect(feedback.correctYear).toBe(1965);
      expect(feedback.correctLocation).toEqual(mockPhoto.coordinates);
      expect(feedback.userGuess).toEqual(mockGuess);
      expect(feedback.distanceKm).toBe(5.2);
      expect(feedback.yearDifference).toBe(2);
      expect(feedback.yearAccuracy).toBe('good');
      expect(feedback.locationAccuracy).toBe('excellent');
      expect(feedback.photoContext).toBeDefined();
      expect(feedback.performanceSummary).toContain('Good year guess');
    });

    it('should round distance to 2 decimal places', () => {
      scoringService.calculateDistance.and.returnValue(5.12345);
      
      const feedback = service.generateFeedback(mockPhoto, mockGuess);
      
      expect(feedback.distanceKm).toBe(5.12);
    });

    it('should handle perfect year guess', () => {
      const perfectGuess: Guess = {
        year: 1965,
        coordinates: mockGuess.coordinates
      };

      const feedback = service.generateFeedback(mockPhoto, perfectGuess);

      expect(feedback.yearDifference).toBe(0);
      expect(feedback.yearAccuracy).toBe('perfect');
      expect(feedback.performanceSummary).toContain('Perfect year guess');
    });
  });

  describe('calculateDistance', () => {
    it('should delegate to scoring service', () => {
      const coord1: Coordinates = { latitude: 40.7128, longitude: -74.0060 };
      const coord2: Coordinates = { latitude: 40.7589, longitude: -73.9851 };
      scoringService.calculateDistance.and.returnValue(5.2);

      const result = service.calculateDistance(coord1, coord2);

      expect(scoringService.calculateDistance).toHaveBeenCalledWith(coord1, coord2);
      expect(result).toBe(5.2);
    });
  });

  describe('categorizeYearAccuracy', () => {
    it('should return perfect for exact match', () => {
      expect(service.categorizeYearAccuracy(0)).toBe('perfect');
    });

    it('should return excellent for 1 year difference', () => {
      expect(service.categorizeYearAccuracy(1)).toBe('excellent');
    });

    it('should return good for 2-5 year difference', () => {
      expect(service.categorizeYearAccuracy(2)).toBe('good');
      expect(service.categorizeYearAccuracy(5)).toBe('good');
    });

    it('should return fair for 6-10 year difference', () => {
      expect(service.categorizeYearAccuracy(6)).toBe('fair');
      expect(service.categorizeYearAccuracy(10)).toBe('fair');
    });

    it('should return poor for more than 10 year difference', () => {
      expect(service.categorizeYearAccuracy(11)).toBe('poor');
      expect(service.categorizeYearAccuracy(50)).toBe('poor');
    });
  });

  describe('categorizeLocationAccuracy', () => {
    it('should return excellent for distance <= 10km', () => {
      expect(service.categorizeLocationAccuracy(5)).toBe('excellent');
      expect(service.categorizeLocationAccuracy(10)).toBe('excellent');
    });

    it('should return good for distance <= 50km', () => {
      expect(service.categorizeLocationAccuracy(25)).toBe('good');
      expect(service.categorizeLocationAccuracy(50)).toBe('good');
    });

    it('should return fair for distance <= 200km', () => {
      expect(service.categorizeLocationAccuracy(100)).toBe('fair');
      expect(service.categorizeLocationAccuracy(200)).toBe('fair');
    });

    it('should return poor for distance > 200km', () => {
      expect(service.categorizeLocationAccuracy(300)).toBe('poor');
      expect(service.categorizeLocationAccuracy(1000)).toBe('poor');
    });
  });

  describe('enhancePhotoMetadata', () => {
    it('should enhance photo metadata with additional context', () => {
      const enhanced = service.enhancePhotoMetadata(mockPhoto);

      expect(enhanced.photographer).toBe('Test Photographer');
      expect(enhanced.detailedDescription).toBe('A test photograph');
      expect(enhanced.historicalContext).toContain('1960s');
      expect(enhanced.interestingFacts).toBeInstanceOf(Array);
      expect(enhanced.interestingFacts!.length).toBeGreaterThan(0);
      expect(enhanced.era).toBe('Cultural Revolution');
      expect(enhanced.significance).toContain('historical document');
    });

    it('should generate description when not provided', () => {
      const photoWithoutDescription = { ...mockPhoto, description: undefined };
      
      const enhanced = service.enhancePhotoMetadata(photoWithoutDescription);

      expect(enhanced.detailedDescription).toContain('1965');
      expect(enhanced.detailedDescription).toContain('Cultural Revolution');
    });

    it('should generate era-specific historical context', () => {
      const testCases = [
        { year: 1910, expectedEra: 'Edwardian/Early Modern', contextKeyword: 'industrialization' },
        { year: 1925, expectedEra: 'Interwar Period', contextKeyword: 'interwar' },
        { year: 1945, expectedEra: 'Mid-Century Modern', contextKeyword: 'world war ii' },
        { year: 1965, expectedEra: 'Cultural Revolution', contextKeyword: 'cultural revolution' },
        { year: 1985, expectedEra: 'Late 20th Century', contextKeyword: 'technological advancement' },
        { year: 2005, expectedEra: 'Digital Age', contextKeyword: 'digital technology' }
      ];

      testCases.forEach(testCase => {
        const photo = { ...mockPhoto, year: testCase.year };
        const enhanced = service.enhancePhotoMetadata(photo);

        expect(enhanced.era).toBe(testCase.expectedEra);
        expect(enhanced.historicalContext!.toLowerCase()).toContain(testCase.contextKeyword);
      });
    });

    it('should generate era-specific interesting facts', () => {
      const enhanced = service.enhancePhotoMetadata(mockPhoto);

      expect(enhanced.interestingFacts).toContain(jasmine.stringMatching(/1960s.*social.*cultural/));
      expect(enhanced.interestingFacts).toContain(jasmine.stringMatching(/Color photography.*available/));
      expect(enhanced.interestingFacts).toContain(jasmine.stringMatching(/coordinates.*40\.7128.*-74\.0060/));
    });
  });

  describe('generatePerformanceSummary', () => {
    it('should generate appropriate summary for perfect year and excellent location', () => {
      const summary = service.generatePerformanceSummary('perfect', 'excellent', 0, 5);

      expect(summary).toContain('Perfect year guess');
      expect(summary).toContain('Excellent location guess');
    });

    it('should generate appropriate summary for poor performance', () => {
      const summary = service.generatePerformanceSummary('poor', 'poor', 25, 500);

      expect(summary).toContain('25 years off');
      expect(summary).toContain('500 km away');
    });

    it('should handle distance formatting correctly', () => {
      const summaryMeters = service.generatePerformanceSummary('excellent', 'excellent', 1, 0.5);
      const summaryKm = service.generatePerformanceSummary('good', 'good', 3, 25.67);

      expect(summaryMeters).toContain('500 meters');
      expect(summaryKm).toContain('25.67 km');
    });

    it('should handle singular vs plural years correctly', () => {
      const summaryOne = service.generatePerformanceSummary('excellent', 'excellent', 1, 5);
      const summaryMultiple = service.generatePerformanceSummary('good', 'good', 3, 25);

      expect(summaryOne).toContain('1 year off');
      expect(summaryMultiple).toContain('3 years off');
    });
  });

  describe('distance calculation integration', () => {
    beforeEach(() => {
      // Use real distance calculation for integration tests
      scoringService.calculateDistance.and.callFake((coord1, coord2) => {
        const R = 6371; // Earth's radius in kilometers
        
        const lat1Rad = coord1.latitude * (Math.PI / 180);
        const lat2Rad = coord2.latitude * (Math.PI / 180);
        const deltaLatRad = (coord2.latitude - coord1.latitude) * (Math.PI / 180);
        const deltaLonRad = (coord2.longitude - coord1.longitude) * (Math.PI / 180);

        const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
                  Math.cos(lat1Rad) * Math.cos(lat2Rad) *
                  Math.sin(deltaLonRad / 2) * Math.sin(deltaLonRad / 2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        
        return R * c;
      });
    });

    it('should calculate realistic distances for known locations', () => {
      const nyc: Coordinates = { latitude: 40.7128, longitude: -74.0060 };
      const timesSquare: Coordinates = { latitude: 40.7589, longitude: -73.9851 };

      const distance = service.calculateDistance(nyc, timesSquare);

      // Distance between NYC center and Times Square should be around 5-6 km
      expect(distance).toBeGreaterThan(4);
      expect(distance).toBeLessThan(7);
    });

    it('should handle same location correctly', () => {
      const location: Coordinates = { latitude: 40.7128, longitude: -74.0060 };

      const distance = service.calculateDistance(location, location);

      expect(distance).toBe(0);
    });

    it('should calculate long distances correctly', () => {
      const nyc: Coordinates = { latitude: 40.7128, longitude: -74.0060 };
      const london: Coordinates = { latitude: 51.5074, longitude: -0.1278 };

      const distance = service.calculateDistance(nyc, london);

      // Distance between NYC and London should be around 5500-5600 km
      expect(distance).toBeGreaterThan(5400);
      expect(distance).toBeLessThan(5700);
    });
  });

  describe('edge cases', () => {
    it('should handle photos with minimal metadata', () => {
      const minimalPhoto: Photo = {
        id: 'minimal',
        url: 'https://example.com/minimal.jpg',
        title: 'Minimal Photo',
        year: 1950,
        coordinates: { latitude: 0, longitude: 0 },
        source: 'Test',
        metadata: {
          license: 'Public Domain',
          originalSource: 'Archive',
          dateCreated: new Date('1950-01-01')
        }
      };

      const feedback = service.generateFeedback(minimalPhoto, mockGuess);

      expect(feedback).toBeDefined();
      expect(feedback.photoContext.photographer).toBeUndefined();
      expect(feedback.photoContext.detailedDescription).toContain('1950');
      expect(feedback.photoContext.historicalContext).toBeDefined();
    });

    it('should handle extreme distances', () => {
      const antipodes1: Coordinates = { latitude: 40.7128, longitude: -74.0060 };
      const antipodes2: Coordinates = { latitude: -40.7128, longitude: 105.9940 };
      
      scoringService.calculateDistance.and.returnValue(20000); // Approximate antipodal distance

      const guess: Guess = { year: 1965, coordinates: antipodes2 };
      const feedback = service.generateFeedback(mockPhoto, guess);

      expect(feedback.locationAccuracy).toBe('poor');
      expect(feedback.performanceSummary).toContain('20000 km');
    });

    it('should handle very recent photos', () => {
      const recentPhoto = { ...mockPhoto, year: 2020 };
      
      const enhanced = service.enhancePhotoMetadata(recentPhoto);

      expect(enhanced.era).toBe('Digital Age');
      expect(enhanced.historicalContext).toContain('21st century');
    });
  });
});