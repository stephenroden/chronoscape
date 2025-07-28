import { 
  validateEnhancedPhotoMetadata, 
  validateEnhancedFeedback,
  EnhancedPhotoMetadata,
  EnhancedFeedback,
  YearAccuracy,
  LocationAccuracy
} from './enhanced-feedback.model';
import { Coordinates } from './coordinates.model';
import { Guess } from './scoring.model';

describe('Enhanced Feedback Model Validation', () => {
  
  describe('validateEnhancedPhotoMetadata', () => {
    it('should validate empty metadata object', () => {
      const metadata: EnhancedPhotoMetadata = {};
      expect(validateEnhancedPhotoMetadata(metadata)).toBe(true);
    });

    it('should validate complete metadata object', () => {
      const metadata: EnhancedPhotoMetadata = {
        photographer: 'John Doe',
        historicalContext: 'This was during the Great Depression',
        interestingFacts: ['Fact 1', 'Fact 2'],
        detailedDescription: 'A detailed description',
        era: 'Great Depression Era',
        significance: 'Historically significant'
      };
      expect(validateEnhancedPhotoMetadata(metadata)).toBe(true);
    });

    it('should reject null or undefined metadata', () => {
      expect(validateEnhancedPhotoMetadata(null as any)).toBe(false);
      expect(validateEnhancedPhotoMetadata(undefined as any)).toBe(false);
    });

    it('should reject non-object metadata', () => {
      expect(validateEnhancedPhotoMetadata('string' as any)).toBe(false);
      expect(validateEnhancedPhotoMetadata(123 as any)).toBe(false);
      expect(validateEnhancedPhotoMetadata([] as any)).toBe(false);
    });

    it('should reject invalid photographer field', () => {
      const metadata = { photographer: 123 } as any;
      expect(validateEnhancedPhotoMetadata(metadata)).toBe(false);
    });

    it('should reject invalid historicalContext field', () => {
      const metadata = { historicalContext: true } as any;
      expect(validateEnhancedPhotoMetadata(metadata)).toBe(false);
    });

    it('should reject invalid detailedDescription field', () => {
      const metadata = { detailedDescription: [] } as any;
      expect(validateEnhancedPhotoMetadata(metadata)).toBe(false);
    });

    it('should reject invalid era field', () => {
      const metadata = { era: 123 } as any;
      expect(validateEnhancedPhotoMetadata(metadata)).toBe(false);
    });

    it('should reject invalid significance field', () => {
      const metadata = { significance: {} } as any;
      expect(validateEnhancedPhotoMetadata(metadata)).toBe(false);
    });

    it('should reject invalid interestingFacts field', () => {
      const metadata1 = { interestingFacts: 'not an array' } as any;
      expect(validateEnhancedPhotoMetadata(metadata1)).toBe(false);

      const metadata2 = { interestingFacts: [123, 'valid string'] } as any;
      expect(validateEnhancedPhotoMetadata(metadata2)).toBe(false);
    });

    it('should accept valid interestingFacts array', () => {
      const metadata = { interestingFacts: ['Fact 1', 'Fact 2', 'Fact 3'] };
      expect(validateEnhancedPhotoMetadata(metadata)).toBe(true);
    });

    it('should accept empty interestingFacts array', () => {
      const metadata = { interestingFacts: [] };
      expect(validateEnhancedPhotoMetadata(metadata)).toBe(true);
    });
  });

  describe('validateEnhancedFeedback', () => {
    const validCoordinates: Coordinates = { latitude: 40.7128, longitude: -74.0060 };
    const validGuess: Guess = { year: 1965, coordinates: validCoordinates };
    const validMetadata: EnhancedPhotoMetadata = {
      photographer: 'Test Photographer',
      historicalContext: 'Test context'
    };

    const validFeedback: EnhancedFeedback = {
      correctYear: 1965,
      correctLocation: validCoordinates,
      userGuess: validGuess,
      distanceKm: 5.2,
      yearAccuracy: 'good' as YearAccuracy,
      locationAccuracy: 'excellent' as LocationAccuracy,
      photoContext: validMetadata,
      yearDifference: 2,
      performanceSummary: 'Good performance overall'
    };

    it('should validate complete valid feedback', () => {
      expect(validateEnhancedFeedback(validFeedback)).toBe(true);
    });

    it('should reject null or undefined feedback', () => {
      expect(validateEnhancedFeedback(null as any)).toBe(false);
      expect(validateEnhancedFeedback(undefined as any)).toBe(false);
    });

    it('should reject non-object feedback', () => {
      expect(validateEnhancedFeedback('string' as any)).toBe(false);
      expect(validateEnhancedFeedback(123 as any)).toBe(false);
    });

    it('should reject invalid correctYear', () => {
      const feedback1 = { ...validFeedback, correctYear: 'not a number' } as any;
      expect(validateEnhancedFeedback(feedback1)).toBe(false);

      const feedback2 = { ...validFeedback, correctYear: 1800 }; // Too early
      expect(validateEnhancedFeedback(feedback2)).toBe(false);

      const feedback3 = { ...validFeedback, correctYear: 2050 }; // Future year
      expect(validateEnhancedFeedback(feedback3)).toBe(false);
    });

    it('should accept valid correctYear range', () => {
      const feedback1 = { ...validFeedback, correctYear: 1900 };
      expect(validateEnhancedFeedback(feedback1)).toBe(true);

      const currentYear = new Date().getFullYear();
      const feedback2 = { ...validFeedback, correctYear: currentYear };
      expect(validateEnhancedFeedback(feedback2)).toBe(true);
    });

    it('should reject invalid correctLocation', () => {
      const feedback1 = { ...validFeedback, correctLocation: null } as any;
      expect(validateEnhancedFeedback(feedback1)).toBe(false);

      const feedback2 = { ...validFeedback, correctLocation: { latitude: 'invalid' } } as any;
      expect(validateEnhancedFeedback(feedback2)).toBe(false);

      const feedback3 = { ...validFeedback, correctLocation: { latitude: 40.7128 } } as any; // Missing longitude
      expect(validateEnhancedFeedback(feedback3)).toBe(false);
    });

    it('should reject invalid userGuess', () => {
      const feedback1 = { ...validFeedback, userGuess: null } as any;
      expect(validateEnhancedFeedback(feedback1)).toBe(false);

      const feedback2 = { ...validFeedback, userGuess: { year: 'invalid' } } as any;
      expect(validateEnhancedFeedback(feedback2)).toBe(false);

      const feedback3 = { ...validFeedback, userGuess: { year: 1965 } } as any; // Missing coordinates
      expect(validateEnhancedFeedback(feedback3)).toBe(false);
    });

    it('should reject invalid distanceKm', () => {
      const feedback1 = { ...validFeedback, distanceKm: 'not a number' } as any;
      expect(validateEnhancedFeedback(feedback1)).toBe(false);

      const feedback2 = { ...validFeedback, distanceKm: -5 }; // Negative distance
      expect(validateEnhancedFeedback(feedback2)).toBe(false);
    });

    it('should accept valid distanceKm values', () => {
      const feedback1 = { ...validFeedback, distanceKm: 0 };
      expect(validateEnhancedFeedback(feedback1)).toBe(true);

      const feedback2 = { ...validFeedback, distanceKm: 1000.5 };
      expect(validateEnhancedFeedback(feedback2)).toBe(true);
    });

    it('should reject invalid yearDifference', () => {
      const feedback = { ...validFeedback, yearDifference: 'not a number' } as any;
      expect(validateEnhancedFeedback(feedback)).toBe(false);
    });

    it('should accept valid yearDifference values', () => {
      const feedback1 = { ...validFeedback, yearDifference: 0 };
      expect(validateEnhancedFeedback(feedback1)).toBe(true);

      const feedback2 = { ...validFeedback, yearDifference: -5 }; // Negative is valid
      expect(validateEnhancedFeedback(feedback2)).toBe(true);

      const feedback3 = { ...validFeedback, yearDifference: 10 };
      expect(validateEnhancedFeedback(feedback3)).toBe(true);
    });

    it('should reject invalid yearAccuracy', () => {
      const feedback1 = { ...validFeedback, yearAccuracy: 'invalid' } as any;
      expect(validateEnhancedFeedback(feedback1)).toBe(false);

      const feedback2 = { ...validFeedback, yearAccuracy: 123 } as any;
      expect(validateEnhancedFeedback(feedback2)).toBe(false);
    });

    it('should accept all valid yearAccuracy values', () => {
      const validYearAccuracies: YearAccuracy[] = ['perfect', 'excellent', 'good', 'fair', 'poor'];
      
      validYearAccuracies.forEach(accuracy => {
        const feedback = { ...validFeedback, yearAccuracy: accuracy };
        expect(validateEnhancedFeedback(feedback)).toBe(true);
      });
    });

    it('should reject invalid locationAccuracy', () => {
      const feedback1 = { ...validFeedback, locationAccuracy: 'invalid' } as any;
      expect(validateEnhancedFeedback(feedback1)).toBe(false);

      const feedback2 = { ...validFeedback, locationAccuracy: 123 } as any;
      expect(validateEnhancedFeedback(feedback2)).toBe(false);
    });

    it('should accept all valid locationAccuracy values', () => {
      const validLocationAccuracies: LocationAccuracy[] = ['excellent', 'good', 'fair', 'poor'];
      
      validLocationAccuracies.forEach(accuracy => {
        const feedback = { ...validFeedback, locationAccuracy: accuracy };
        expect(validateEnhancedFeedback(feedback)).toBe(true);
      });
    });

    it('should reject invalid performanceSummary', () => {
      const feedback1 = { ...validFeedback, performanceSummary: 123 } as any;
      expect(validateEnhancedFeedback(feedback1)).toBe(false);

      const feedback2 = { ...validFeedback, performanceSummary: null } as any;
      expect(validateEnhancedFeedback(feedback2)).toBe(false);
    });

    it('should accept valid performanceSummary', () => {
      const feedback1 = { ...validFeedback, performanceSummary: '' }; // Empty string is valid
      expect(validateEnhancedFeedback(feedback1)).toBe(true);

      const feedback2 = { ...validFeedback, performanceSummary: 'Great performance!' };
      expect(validateEnhancedFeedback(feedback2)).toBe(true);
    });

    it('should reject invalid photoContext', () => {
      const feedback1 = { ...validFeedback, photoContext: null } as any;
      expect(validateEnhancedFeedback(feedback1)).toBe(false);

      const feedback2 = { ...validFeedback, photoContext: { photographer: 123 } } as any;
      expect(validateEnhancedFeedback(feedback2)).toBe(false);
    });

    it('should accept valid photoContext', () => {
      const feedback1 = { ...validFeedback, photoContext: {} }; // Empty metadata is valid
      expect(validateEnhancedFeedback(feedback1)).toBe(true);

      const feedback2 = { ...validFeedback, photoContext: validMetadata };
      expect(validateEnhancedFeedback(feedback2)).toBe(true);
    });
  });
});