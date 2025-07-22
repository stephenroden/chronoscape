import * as ScoringActions from './scoring.actions';
import { Guess, Score } from '../../models/scoring.model';

describe('Scoring Actions', () => {
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

  describe('submitGuess', () => {
    it('should create an action with guess payload', () => {
      const action = ScoringActions.submitGuess({ guess: mockGuess });
      
      expect(action.type).toBe('[Scoring] Submit Guess');
      expect(action.guess).toEqual(mockGuess);
    });
  });

  describe('setCurrentGuess', () => {
    it('should create an action with guess payload', () => {
      const action = ScoringActions.setCurrentGuess({ guess: mockGuess });
      
      expect(action.type).toBe('[Scoring] Set Current Guess');
      expect(action.guess).toEqual(mockGuess);
    });
  });

  describe('clearCurrentGuess', () => {
    it('should create an action', () => {
      const action = ScoringActions.clearCurrentGuess();
      expect(action.type).toBe('[Scoring] Clear Current Guess');
    });
  });

  describe('calculateScore', () => {
    it('should create an action with calculation payload', () => {
      const photoId = 'test-1';
      const actualYear = 1955;
      const actualCoordinates = { latitude: 41.0, longitude: -75.0 };
      
      const action = ScoringActions.calculateScore({ 
        photoId, 
        guess: mockGuess, 
        actualYear, 
        actualCoordinates 
      });
      
      expect(action.type).toBe('[Scoring] Calculate Score');
      expect(action.photoId).toBe(photoId);
      expect(action.guess).toEqual(mockGuess);
      expect(action.actualYear).toBe(actualYear);
      expect(action.actualCoordinates).toEqual(actualCoordinates);
    });
  });

  describe('addScore', () => {
    it('should create an action with score payload', () => {
      const action = ScoringActions.addScore({ score: mockScore });
      
      expect(action.type).toBe('[Scoring] Add Score');
      expect(action.score).toEqual(mockScore);
    });
  });

  describe('updateTotalScore', () => {
    it('should create an action', () => {
      const action = ScoringActions.updateTotalScore();
      expect(action.type).toBe('[Scoring] Update Total Score');
    });
  });

  describe('resetScores', () => {
    it('should create an action', () => {
      const action = ScoringActions.resetScores();
      expect(action.type).toBe('[Scoring] Reset Scores');
    });
  });

  describe('removeScore', () => {
    it('should create an action with photoId payload', () => {
      const photoId = 'test-1';
      const action = ScoringActions.removeScore({ photoId });
      
      expect(action.type).toBe('[Scoring] Remove Score');
      expect(action.photoId).toBe(photoId);
    });
  });

  describe('validateGuess', () => {
    it('should create an action with guess payload', () => {
      const action = ScoringActions.validateGuess({ guess: mockGuess });
      
      expect(action.type).toBe('[Scoring] Validate Guess');
      expect(action.guess).toEqual(mockGuess);
    });
  });

  describe('guessValidationSuccess', () => {
    it('should create an action with guess payload', () => {
      const action = ScoringActions.guessValidationSuccess({ guess: mockGuess });
      
      expect(action.type).toBe('[Scoring] Guess Validation Success');
      expect(action.guess).toEqual(mockGuess);
    });
  });

  describe('guessValidationFailure', () => {
    it('should create an action with error payload', () => {
      const error = 'Invalid guess';
      const action = ScoringActions.guessValidationFailure({ error });
      
      expect(action.type).toBe('[Scoring] Guess Validation Failure');
      expect(action.error).toBe(error);
    });
  });
});