import { GameState, PhotoState } from '../models/game-state.model';
import { ScoringState } from '../models/scoring.model';

/**
 * Root application state interface
 */
export interface AppState {
  game: GameState;
  photos: PhotoState;
  scoring: ScoringState;
}