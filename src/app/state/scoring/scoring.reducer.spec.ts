import { scoringReducer, initialScoringState } from './scoring.reducer';
import * as ScoringActions from './scoring.actions';
import { Guess, Score } from '../../models/scoring.model';

describe('Scoring Reducer', () => {
  const mockGuess: Guess = {
    year: 1950,
    coordinates: { latitude: 40.7128, longitude: -74.0060 }
  };

  const mockScore: Score = {
    photoId: 'test-1',
    yearScore: 3000,
    locationScore: 2500,
    totalScore: 5500
  };

  const mockScore2: Score = {
    photoId: 'test-2',
    yearScore: 4000,
    locationScore: 1500,
    totalScore: 5500
  };

  describe('unknown action', () => {
    it('should return the previous state', () => {
      const action = {} as any;
      const result = scoringReducer(initialScoringState, action);

      expect(result).toBe(initialScoringState);
    });
  });

  describe('submitGuess action', () => {
    it('should set current guess', () => {
      const action = ScoringActions.submitGuess({ guess: mockGuess });
      const result = scoringReducer(initialScoringState, action);

      expect(result.currentGuess).toEqual(mockGuess);
    });
  });

  describe('setCurrentGuess action', () => {
    it('should set current guess', () => {
      const action = ScoringActions.setCurrentGuess({ guess: mockGuess });
      const result = scoringReducer(initialScoringState, action);

      expect(result.currentGuess).toEqual(mockGuess);
    });
  });

  describe('clearCurrentGuess action', () => {
    it('should clear current guess', () => {
      const state = {
        ...initialScoringState,
        currentGuess: mockGuess
      };

      const action = ScoringActions.clearCurrentGuess();
      const result = scoringReducer(state, action);

      expect(result.currentGuess).toBeNull();
    });
  });

  describe('addScore action', () => {
    it('should add new score and update total', () => {
      const action = ScoringActions.addScore({ score: mockScore });
      const result = scoringReducer(initialScoringState, action);

      expect(result.scores).toContain(mockScore);
      expect(result.totalScore).toBe(mockScore.totalScore);
    });

    it('should replace existing score for same photo', () => {
      const state = {
        ...initialScoringState,
        scores: [mockScore],
        totalScore: mockScore.totalScore
      };

      const updatedScore: Score = {
        ...mockScore,
        yearScore: 4500,
        locationScore: 3000,
        totalScore: 7500
      };

      const action = ScoringActions.addScore({ score: updatedScore });
      const result = scoringReducer(state, action);

      expect(result.scores.length).toBe(1);
      expect(result.scores[0]).toEqual(updatedScore);
      expect(result.totalScore).toBe(updatedScore.totalScore);
    });

    it('should add multiple scores and calculate correct total', () => {
      const state = {
        ...initialScoringState,
        scores: [mockScore],
        totalScore: mockScore.totalScore
      };

      const action = ScoringActions.addScore({ score: mockScore2 });
      const result = scoringReducer(state, action);

      expect(result.scores.length).toBe(2);
      expect(result.totalScore).toBe(mockScore.totalScore + mockScore2.totalScore);
    });
  });

  describe('updateTotalScore action', () => {
    it('should recalculate total score from all scores', () => {
      const state = {
        ...initialScoringState,
        scores: [mockScore, mockScore2],
        totalScore: 0 // Incorrect total
      };

      const action = ScoringActions.updateTotalScore();
      const result = scoringReducer(state, action);

      expect(result.totalScore).toBe(mockScore.totalScore + mockScore2.totalScore);
    });

    it('should set total to 0 when no scores exist', () => {
      const state = {
        ...initialScoringState,
        totalScore: 1000 // Incorrect total
      };

      const action = ScoringActions.updateTotalScore();
      const result = scoringReducer(state, action);

      expect(result.totalScore).toBe(0);
    });
  });

  describe('resetScores action', () => {
    it('should reset to initial state', () => {
      const state = {
        scores: [mockScore, mockScore2],
        totalScore: 11000,
        currentGuess: mockGuess
      };

      const action = ScoringActions.resetScores();
      const result = scoringReducer(state, action);

      expect(result).toEqual(initialScoringState);
    });
  });

  describe('removeScore action', () => {
    it('should remove score by photoId and update total', () => {
      const state = {
        ...initialScoringState,
        scores: [mockScore, mockScore2],
        totalScore: mockScore.totalScore + mockScore2.totalScore
      };

      const action = ScoringActions.removeScore({ photoId: 'test-1' });
      const result = scoringReducer(state, action);

      expect(result.scores.length).toBe(1);
      expect(result.scores[0]).toEqual(mockScore2);
      expect(result.totalScore).toBe(mockScore2.totalScore);
    });

    it('should handle removing non-existent score', () => {
      const state = {
        ...initialScoringState,
        scores: [mockScore],
        totalScore: mockScore.totalScore
      };

      const action = ScoringActions.removeScore({ photoId: 'non-existent' });
      const result = scoringReducer(state, action);

      expect(result.scores).toEqual([mockScore]);
      expect(result.totalScore).toBe(mockScore.totalScore);
    });
  });

  describe('validateGuess action', () => {
    it('should return unchanged state', () => {
      const action = ScoringActions.validateGuess({ guess: mockGuess });
      const result = scoringReducer(initialScoringState, action);

      expect(result).toBe(initialScoringState);
    });
  });

  describe('guessValidationSuccess action', () => {
    it('should set current guess', () => {
      const action = ScoringActions.guessValidationSuccess({ guess: mockGuess });
      const result = scoringReducer(initialScoringState, action);

      expect(result.currentGuess).toEqual(mockGuess);
    });
  });

  describe('guessValidationFailure action', () => {
    it('should clear current guess', () => {
      const state = {
        ...initialScoringState,
        currentGuess: mockGuess
      };

      const action = ScoringActions.guessValidationFailure({ error: 'Invalid guess' });
      const result = scoringReducer(state, action);

      expect(result.currentGuess).toBeNull();
    });
  });
});