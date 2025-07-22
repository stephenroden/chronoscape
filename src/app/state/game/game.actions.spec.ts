import * as GameActions from './game.actions';

describe('Game Actions', () => {
  describe('startGame', () => {
    it('should create an action', () => {
      const action = GameActions.startGame();
      expect(action.type).toBe('[Game] Start Game');
    });
  });

  describe('nextPhoto', () => {
    it('should create an action', () => {
      const action = GameActions.nextPhoto();
      expect(action.type).toBe('[Game] Next Photo');
    });
  });

  describe('endGame', () => {
    it('should create an action', () => {
      const action = GameActions.endGame();
      expect(action.type).toBe('[Game] End Game');
    });
  });

  describe('resetGame', () => {
    it('should create an action', () => {
      const action = GameActions.resetGame();
      expect(action.type).toBe('[Game] Reset Game');
    });
  });

  describe('setGameError', () => {
    it('should create an action with error payload', () => {
      const error = 'Test error message';
      const action = GameActions.setGameError({ error });
      
      expect(action.type).toBe('[Game] Set Game Error');
      expect(action.error).toBe(error);
    });
  });

  describe('clearGameError', () => {
    it('should create an action', () => {
      const action = GameActions.clearGameError();
      expect(action.type).toBe('[Game] Clear Game Error');
    });
  });
});