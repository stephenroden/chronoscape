import { Coordinates, validateCoordinates } from './coordinates.model';

/**
 * Metadata associated with a photograph
 */
export interface PhotoMetadata {
  photographer?: string;
  license: string;
  originalSource: string;
  dateCreated: Date;
}

/**
 * Represents a historical photograph with all required game data
 */
export interface Photo {
  id: string;
  url: string;
  title: string;
  description?: string;
  year: number;
  coordinates: Coordinates;
  source: string;
  metadata: PhotoMetadata;
}

/**
 * Validates photo metadata to ensure it meets game requirements
 * @param photo - The photo to validate
 * @returns true if photo metadata is valid, false otherwise
 */
export function validatePhotoMetadata(photo: Photo): boolean {
  if (!photo || typeof photo !== 'object') {
    return false;
  }

  // Validate required string fields
  if (!photo.id || typeof photo.id !== 'string' || photo.id.trim().length === 0) {
    return false;
  }

  if (!photo.url || typeof photo.url !== 'string' || photo.url.trim().length === 0) {
    return false;
  }

  if (!photo.title || typeof photo.title !== 'string' || photo.title.trim().length === 0) {
    return false;
  }

  if (!photo.source || typeof photo.source !== 'string' || photo.source.trim().length === 0) {
    return false;
  }

  // Validate year (must be 1900 or later, not in the future)
  const currentYear = new Date().getFullYear();
  if (typeof photo.year !== 'number' || photo.year < 1900 || photo.year > currentYear) {
    return false;
  }

  // Validate coordinates using existing validation function
  if (!photo.coordinates || !validateCoordinates(photo.coordinates)) {
    return false;
  }

  // Validate metadata
  if (!photo.metadata || typeof photo.metadata !== 'object') {
    return false;
  }

  if (!photo.metadata.license || typeof photo.metadata.license !== 'string') {
    return false;
  }

  if (!photo.metadata.originalSource || typeof photo.metadata.originalSource !== 'string') {
    return false;
  }

  if (!photo.metadata.dateCreated || !(photo.metadata.dateCreated instanceof Date)) {
    return false;
  }

  // Optional description validation
  if (photo.description !== undefined && typeof photo.description !== 'string') {
    return false;
  }

  // Optional photographer validation
  if (photo.metadata.photographer !== undefined && typeof photo.metadata.photographer !== 'string') {
    return false;
  }

  return true;
}

