import { GameState, PhotoState } from '../models/game-state.model';
import { ScoringState } from '../models/scoring.model';
import { InterfaceState } from '../models/interface-state.model';

/**
 * Root application state interface
 */
export interface AppState {
  game: GameState;
  photos: PhotoState;
  scoring: ScoringState;
  interface: InterfaceState;
}