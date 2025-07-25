import { Photo } from './photo.model';

/**
 * Possible game status values
 */
export enum GameStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ERROR = 'error'
}

/**
 * Main game state tracking current progress
 */
export interface GameState {
  currentPhotoIndex: number;
  totalPhotos: number;
  gameStatus: GameStatus;
  startTime: Date;
  endTime?: Date;
  error?: string | null;
  loading?: boolean;
}

/**
 * State for managing photos in the game
 */
export interface PhotoState {
  photos: Photo[];
  currentPhoto: Photo | null;
  loading: boolean;
  error: string | null;
}

/**
 * Validates game state to ensure it's in a consistent state
 * @param gameState - The game state to validate
 * @returns true if game state is valid, false otherwise
 */
export function validateGameState(gameState: GameState): boolean {
  if (!gameState || typeof gameState !== 'object') {
    return false;
  }

  // Validate currentPhotoIndex
  if (typeof gameState.currentPhotoIndex !== 'number' || 
      gameState.currentPhotoIndex < 0 || 
      !Number.isInteger(gameState.currentPhotoIndex)) {
    return false;
  }

  // Validate totalPhotos
  if (typeof gameState.totalPhotos !== 'number' || 
      gameState.totalPhotos <= 0 || 
      !Number.isInteger(gameState.totalPhotos)) {
    return false;
  }

  // Current photo index should not exceed total photos
  if (gameState.currentPhotoIndex >= gameState.totalPhotos) {
    return false;
  }

  // Validate game status
  const validStatuses = [
    GameStatus.NOT_STARTED,
    GameStatus.IN_PROGRESS,
    GameStatus.COMPLETED,
    GameStatus.ERROR
  ];
  if (!validStatuses.includes(gameState.gameStatus)) {
    return false;
  }

  // Validate start time
  if (!gameState.startTime || !(gameState.startTime instanceof Date)) {
    return false;
  }

  // If end time exists, validate it and ensure it's after start time
  if (gameState.endTime) {
    if (!(gameState.endTime instanceof Date)) {
      return false;
    }
    if (gameState.endTime <= gameState.startTime) {
      return false;
    }
  }

  // If game is completed, end time should be set
  if (gameState.gameStatus === GameStatus.COMPLETED && !gameState.endTime) {
    return false;
  }

  return true;
}

/**
 * Validates photo state to ensure consistency
 * @param photoState - The photo state to validate
 * @returns true if photo state is valid, false otherwise
 */
export function validatePhotoState(photoState: PhotoState): boolean {
  if (!photoState || typeof photoState !== 'object') {
    return false;
  }

  // Validate photos array
  if (!Array.isArray(photoState.photos)) {
    return false;
  }

  // Validate loading flag
  if (typeof photoState.loading !== 'boolean') {
    return false;
  }

  // Validate error (can be null or string)
  if (photoState.error !== null && typeof photoState.error !== 'string') {
    return false;
  }

  // Current photo can be null or a Photo object
  if (photoState.currentPhoto !== null && 
      (typeof photoState.currentPhoto !== 'object' || Array.isArray(photoState.currentPhoto))) {
    return false;
  }

  return true;
}