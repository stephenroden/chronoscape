import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { AppState } from '../../state/app.state';
import * as PhotosActions from '../../state/photos/photos.actions';
import * as GameActions from '../../state/game/game.actions';
import * as PhotosSelectors from '../../state/photos/photos.selectors';
import * as GameSelectors from '../../state/game/game.selectors';

/**
 * Category selection component that allows users to choose their preferred photo theme.
 * Provides a dedicated page for category selection with detailed descriptions and visual cards.
 */
@Component({
  selector: 'app-category-selection',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './category-selection.component.html',
  styleUrls: ['./category-selection.component.scss']
})
export class CategorySelectionComponent {
  // Loading state observables
  photosLoading$: Observable<boolean>;
  gameLoading$: Observable<boolean>;
  photosError$: Observable<string | null>;
  gameError$: Observable<string | null>;

  // Category selection
  selectedCategory: 'architecture' | 'landmarks' | 'events' | 'all' | null = null;

  // Available categories with detailed descriptions
  categories = [
    {
      id: 'all' as const,
      name: 'Mixed Collection',
      description: 'A diverse mix of historical photos from all categories for maximum variety',
      detailedDescription: 'Perfect for players who want unpredictability and a broad range of historical content. Each game will feature a mix of architectural landmarks, historical events, and famous monuments from different time periods and locations.',
      icon: '🌍',
      examples: ['Historic buildings', 'Famous landmarks', 'Street scenes', 'Cultural events']
    },
    {
      id: 'architecture' as const,
      name: 'Architecture',
      description: 'Historic buildings, bridges, and architectural landmarks',
      detailedDescription: 'Focus on architectural marvels throughout history. These photos feature distinctive building styles, engineering achievements, and structural landmarks that provide clear visual cues about time periods and geographic regions.',
      icon: '🏛️',
      examples: ['Gothic cathedrals', 'Art Deco buildings', 'Historic bridges', 'Ancient temples']
    },
    {
      id: 'landmarks' as const,
      name: 'Landmarks',
      description: 'Famous monuments, statues, and tourist attractions',
      detailedDescription: 'Iconic monuments and landmarks that have shaped history and culture. These well-documented sites often have precise historical records and distinctive features that make them excellent for guessing games.',
      icon: '🗽',
      examples: ['National monuments', 'Historic statues', 'Archaeological sites', 'Memorial structures']
    },
    {
      id: 'events' as const,
      name: 'Historical Events',
      description: 'Street scenes, festivals, and historical moments',
      detailedDescription: 'Capture the essence of different eras through photographs of people, celebrations, and daily life. These images showcase fashion, transportation, and cultural activities that define specific time periods.',
      icon: '📸',
      examples: ['Street photography', 'Cultural festivals', 'Historical parades', 'Transportation scenes']
    }
  ];

  constructor(
    private store: Store<AppState>,
    private router: Router
  ) {
    this.photosLoading$ = this.store.select(PhotosSelectors.selectPhotosLoading);
    this.gameLoading$ = this.store.select(GameSelectors.selectGameLoading);
    this.photosError$ = this.store.select(PhotosSelectors.selectPhotosError);
    this.gameError$ = this.store.select(GameSelectors.selectGameError);
  }

  /**
   * Selects a photo category and immediately starts the game
   */
  selectCategory(category: 'architecture' | 'landmarks' | 'events' | 'all'): void {
    this.selectedCategory = category;
    this.startGameWithCategory();
  }

  /**
   * Gets the currently selected category info
   */
  getSelectedCategoryInfo() {
    return this.selectedCategory ? this.categories.find(cat => cat.id === this.selectedCategory) : null;
  }

  /**
   * Starts the game with the selected category
   */
  startGameWithCategory(): void {
    // Load curated photos from high-quality Wikipedia categories with fresh photos
    if (this.selectedCategory !== null) {
      this.store.dispatch(PhotosActions.loadCuratedPhotos({
        category: this.selectedCategory,
        forceRefresh: true
      }));

      // Start the game which will set status to IN_PROGRESS
      this.store.dispatch(GameActions.startGame());

      // Navigate to the game play screen
      this.router.navigate(['/game']);
    }
  }



  /**
   * Retries loading photos when there's an error
   */
  retryLoadPhotos(): void {
    if (this.selectedCategory !== null) {
        // Try curated photos first
      this.store.dispatch(PhotosActions.loadCuratedPhotos({
        category: this.selectedCategory,
        forceRefresh: true
      }));
    }
  }

  /**
   * Fallback to regular random photos if curated photos fail
   */
  fallbackToRandomPhotos(): void {
    this.store.dispatch(PhotosActions.loadPhotosWithOptions({ forceRefresh: true }));
  }

  /**
   * Clears any game errors and allows retry
   */
  clearGameError(): void {
    this.store.dispatch(GameActions.clearGameError());
  }

  /**
   * Gets user-friendly error message for display
   */
  getErrorMessage(error: string | null): string {
    if (!error) return '';

    // Provide more user-friendly messages for common errors
    if (error.includes('Network connection failed')) {
      return 'Unable to connect to the internet. Please check your connection and try again.';
    }
    if (error.includes('No suitable photos found')) {
      return 'Unable to find photos for the game. Please try again in a moment.';
    }
    if (error.includes('Too many requests')) {
      return 'Please wait a moment before trying again.';
    }

    return error;
  }

  /**
   * Determines if an error is retryable
   */
  isRetryableError(error: string | null): boolean {
    if (!error) return false;

    // Network and temporary errors are retryable
    return error.includes('Network connection failed') ||
      error.includes('Server error occurred') ||
      error.includes('Too many requests') ||
      error.includes('No suitable photos found');
  }

  /**
   * TrackBy function for category list performance
   */
  trackByCategory(index: number, category: any): string {
    return category.id;
  }
}