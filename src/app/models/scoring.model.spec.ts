import { 
  Guess, 
  Score, 
  ScoringState, 
  validateYearGuess, 
  validateGuess, 
  validateScore, 
  validateScoringState 
} from './scoring.model';

describe('Scoring Model', () => {
  let validGuess: Guess;
  let validScore: Score;
  let validScoringState: ScoringState;

  beforeEach(() => {
    validGuess = {
      year: 1950,
      coordinates: { latitude: 40.7128, longitude: -74.0060 }
    };

    validScore = {
      photoId: 'photo-123',
      yearScore: 3000,
      locationScore: 2500,
      totalScore: 5500
    };

    validScoringState = {
      scores: [validScore],
      totalScore: 5500,
      currentGuess: validGuess,
      loading: false,
      error: null
    };
  });

  describe('validateYearGuess', () => {
    it('should return true for valid years', () => {
      const currentYear = new Date().getFullYear();
      const validYears = [1900, 1950, 2000, currentYear];
      
      validYears.forEach(year => {
        expect(validateYearGuess(year)).toBe(true);
      });
    });

    it('should return false for years before 1900', () => {
      const invalidYears = [1899, 1800, 1000, 0];
      
      invalidYears.forEach(year => {
        expect(validateYearGuess(year)).toBe(false);
      });
    });

    it('should return false for future years', () => {
      const futureYear = new Date().getFullYear() + 1;
      expect(validateYearGuess(futureYear)).toBe(false);
    });

    it('should return false for non-integer years', () => {
      const invalidYears = [1950.5, 1999.9];
      
      invalidYears.forEach(year => {
        expect(validateYearGuess(year)).toBe(false);
      });
    });

    it('should return false for non-numeric years', () => {
      const invalidYears = ['1950', null, undefined, true, {}, []];
      
      invalidYears.forEach(year => {
        expect(validateYearGuess(year as any)).toBe(false);
      });
    });
  });

  describe('validateGuess', () => {
    it('should return true for valid guess', () => {
      expect(validateGuess(validGuess)).toBe(true);
    });

    it('should return false for null or undefined input', () => {
      expect(validateGuess(null as any)).toBe(false);
      expect(validateGuess(undefined as any)).toBe(false);
    });

    it('should return false for non-object input', () => {
      const invalidInputs = ['string', 123, true, []];
      
      invalidInputs.forEach(input => {
        expect(validateGuess(input as any)).toBe(false);
      });
    });

    it('should return false for invalid year', () => {
      const invalidGuesses = [
        { ...validGuess, year: 1899 },
        { ...validGuess, year: new Date().getFullYear() + 1 },
        { ...validGuess, year: 'invalid' as any },
        { ...validGuess, year: null as any }
      ];
      
      invalidGuesses.forEach(guess => {
        expect(validateGuess(guess)).toBe(false);
      });
    });

    it('should return false for invalid coordinates', () => {
      const invalidGuesses = [
        { ...validGuess, coordinates: null as any },
        { ...validGuess, coordinates: { latitude: 91, longitude: 0 } },
        { ...validGuess, coordinates: { latitude: 0, longitude: 181 } },
        { ...validGuess, coordinates: { latitude: 'invalid', longitude: 0 } as any }
      ];
      
      invalidGuesses.forEach(guess => {
        expect(validateGuess(guess)).toBe(false);
      });
    });
  });

  describe('validateScore', () => {
    it('should return true for valid score', () => {
      expect(validateScore(validScore)).toBe(true);
    });

    it('should return true for score with zero points', () => {
      const zeroScore: Score = {
        photoId: 'photo-123',
        yearScore: 0,
        locationScore: 0,
        totalScore: 0
      };

      expect(validateScore(zeroScore)).toBe(true);
    });

    it('should return true for maximum score', () => {
      const maxScore: Score = {
        photoId: 'photo-123',
        yearScore: 5000,
        locationScore: 5000,
        totalScore: 10000
      };

      expect(validateScore(maxScore)).toBe(true);
    });

    it('should return false for null or undefined input', () => {
      expect(validateScore(null as any)).toBe(false);
      expect(validateScore(undefined as any)).toBe(false);
    });

    it('should return false for non-object input', () => {
      const invalidInputs = ['string', 123, true, []];
      
      invalidInputs.forEach(input => {
        expect(validateScore(input as any)).toBe(false);
      });
    });

    describe('photoId validation', () => {
      it('should return false for invalid photoId', () => {
        const invalidPhotoIds = [null, undefined, '', '   ', 123, true, {}];
        
        invalidPhotoIds.forEach(photoId => {
          const score = { ...validScore, photoId };
          expect(validateScore(score as any)).toBe(false);
        });
      });
    });

    describe('yearScore validation', () => {
      it('should return false for invalid yearScore values', () => {
        const invalidYearScores = [-1, 5001, 1.5, 'string', null, undefined, true];
        
        invalidYearScores.forEach(yearScore => {
          const score = { ...validScore, yearScore };
          expect(validateScore(score as any)).toBe(false);
        });
      });
    });

    describe('locationScore validation', () => {
      it('should return false for invalid locationScore values', () => {
        const invalidLocationScores = [-1, 5001, 1.5, 'string', null, undefined, true];
        
        invalidLocationScores.forEach(locationScore => {
          const score = { ...validScore, locationScore };
          expect(validateScore(score as any)).toBe(false);
        });
      });
    });

    describe('totalScore validation', () => {
      it('should return false when totalScore does not equal sum of year and location scores', () => {
        const invalidTotalScores = [
          { ...validScore, totalScore: 5000 }, // should be 5500
          { ...validScore, totalScore: 6000 }, // should be 5500
          { ...validScore, totalScore: 0 }     // should be 5500
        ];
        
        invalidTotalScores.forEach(score => {
          expect(validateScore(score)).toBe(false);
        });
      });
    });
  });

  describe('validateScoringState', () => {
    it('should return true for valid scoring state', () => {
      expect(validateScoringState(validScoringState)).toBe(true);
    });

    it('should return true for scoring state with null currentGuess', () => {
      const scoringState = { ...validScoringState, currentGuess: null };
      expect(validateScoringState(scoringState)).toBe(true);
    });

    it('should return true for scoring state with empty scores array', () => {
      const scoringState: ScoringState = {
        scores: [],
        totalScore: 0,
        currentGuess: null,
        loading: false,
        error: null
      };

      expect(validateScoringState(scoringState)).toBe(true);
    });

    it('should return true for scoring state with multiple scores', () => {
      const score2: Score = {
        photoId: 'photo-456',
        yearScore: 4500,
        locationScore: 1000,
        totalScore: 5500
      };

      const scoringState: ScoringState = {
        scores: [validScore, score2],
        totalScore: 11000,
        currentGuess: null,
        loading: false,
        error: null
      };

      expect(validateScoringState(scoringState)).toBe(true);
    });

    it('should return false for null or undefined input', () => {
      expect(validateScoringState(null as any)).toBe(false);
      expect(validateScoringState(undefined as any)).toBe(false);
    });

    it('should return false for non-object input', () => {
      const invalidInputs = ['string', 123, true, []];
      
      invalidInputs.forEach(input => {
        expect(validateScoringState(input as any)).toBe(false);
      });
    });

    describe('scores array validation', () => {
      it('should return false for non-array scores', () => {
        const invalidScores = ['string', 123, true, {}, null, undefined];
        
        invalidScores.forEach(scores => {
          const scoringState = { ...validScoringState, scores };
          expect(validateScoringState(scoringState as any)).toBe(false);
        });
      });

      it('should return false for array containing invalid scores', () => {
        const invalidScore = { ...validScore, yearScore: -1 };
        const scoringState = { 
          ...validScoringState, 
          scores: [validScore, invalidScore] 
        };

        expect(validateScoringState(scoringState)).toBe(false);
      });
    });

    describe('totalScore validation', () => {
      it('should return false for invalid totalScore types', () => {
        const invalidTotalScores = ['string', null, undefined, true, {}, []];
        
        invalidTotalScores.forEach(totalScore => {
          const scoringState = { ...validScoringState, totalScore };
          expect(validateScoringState(scoringState as any)).toBe(false);
        });
      });

      it('should return false for negative totalScore', () => {
        const scoringState = { ...validScoringState, totalScore: -1 };
        expect(validateScoringState(scoringState)).toBe(false);
      });

      it('should return false for non-integer totalScore', () => {
        const scoringState = { ...validScoringState, totalScore: 5500.5 };
        expect(validateScoringState(scoringState)).toBe(false);
      });

      it('should return false when totalScore does not match sum of individual scores', () => {
        const scoringState = { ...validScoringState, totalScore: 6000 }; // should be 5500
        expect(validateScoringState(scoringState)).toBe(false);
      });
    });

    describe('currentGuess validation', () => {
      it('should return false for invalid currentGuess when not null', () => {
        const invalidGuesses = [
          'string',
          123,
          true,
          [],
          { year: 1899, coordinates: { latitude: 0, longitude: 0 } }, // invalid year
          { year: 1950, coordinates: { latitude: 91, longitude: 0 } }  // invalid coordinates
        ];
        
        invalidGuesses.forEach(currentGuess => {
          const scoringState = { ...validScoringState, currentGuess };
          expect(validateScoringState(scoringState as any)).toBe(false);
        });
      });
    });
  });
});