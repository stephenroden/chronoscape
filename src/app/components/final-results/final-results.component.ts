import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { AppState } from '../../state/app.state';
import { Score } from '../../models/scoring.model';
import * as GameActions from '../../state/game/game.actions';
import * as ScoringActions from '../../state/scoring/scoring.actions';
import * as PhotosActions from '../../state/photos/photos.actions';
import * as InterfaceActions from '../../state/interface/interface.actions';
import * as ScoringSelectors from '../../state/scoring/scoring.selectors';
import * as GameSelectors from '../../state/game/game.selectors';

/**
 * Final results component that displays the complete game summary.
 * Shows total score, breakdown per photo, and performance categorization.
 * Requirement 6.1, 6.2, 6.3, 6.4, 6.5: Display final score summary with breakdown and new game option.
 */
@Component({
  selector: 'app-final-results',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './final-results.component.html',
  styleUrls: ['./final-results.component.scss']
})
export class FinalResultsComponent implements OnInit {
  // Scoring state observables
  totalScore$: Observable<number>;
  scores$: Observable<Score[]>;
  scoringLoading$: Observable<boolean>;
  scoringError$: Observable<string | null>;
  
  // Game state observables
  gameCompleted$: Observable<boolean>;
  gameError$: Observable<string | null>;

  constructor(
    private store: Store<AppState>,
    private router: Router
  ) {
    this.totalScore$ = this.store.select(ScoringSelectors.selectTotalScore);
    this.scores$ = this.store.select(ScoringSelectors.selectAllScores);
    this.scoringLoading$ = this.store.select(ScoringSelectors.selectScoringLoading);
    this.scoringError$ = this.store.select(ScoringSelectors.selectScoringError);
    this.gameCompleted$ = this.store.select(GameSelectors.selectIsGameCompleted);
    this.gameError$ = this.store.select(GameSelectors.selectGameError);
  }

  ngOnInit(): void {
    // If game is not completed, redirect to start screen
    this.gameCompleted$.subscribe(completed => {
      if (!completed) {
        this.router.navigate(['/']);
      }
    });
  }

  /**
   * Starts a new game by resetting state and navigating to start screen.
   * Requirement 6.4: Provide option to start new game from final results.
   */
  startNewGame(): void {
    // Reset all game state completely
    this.store.dispatch(GameActions.resetGame());
    this.store.dispatch(ScoringActions.resetScores());
    this.store.dispatch(ScoringActions.clearCurrentGuess());
    this.store.dispatch(PhotosActions.clearCurrentPhoto());
    this.store.dispatch(InterfaceActions.resetInterfaceState());
    
    this.router.navigate(['/']);
  }

  /**
   * Navigates back to the game screen (for debugging/testing)
   */
  backToGame(): void {
    this.router.navigate(['/game']);
  }

  /**
   * Gets performance category based on total score.
   * Requirement 6.5: Show performance categories.
   */
  getPerformanceCategory(totalScore: number): { title: string; description: string; class: string } {
    if (totalScore >= 45000) {
      return {
        title: 'History & Geography Master',
        description: 'Outstanding knowledge of world history and geography!',
        class: 'master'
      };
    } else if (totalScore >= 35000) {
      return {
        title: 'Expert Explorer',
        description: 'Excellent understanding of historical events and locations.',
        class: 'expert'
      };
    } else if (totalScore >= 25000) {
      return {
        title: 'Knowledgeable Navigator',
        description: 'Good grasp of history and geography fundamentals.',
        class: 'good'
      };
    } else if (totalScore >= 15000) {
      return {
        title: 'Curious Learner',
        description: 'Keep exploring to improve your historical knowledge!',
        class: 'learning'
      };
    } else {
      return {
        title: 'Beginning Explorer',
        description: 'Great start! Practice will help you improve.',
        class: 'beginner'
      };
    }
  }

  /**
   * Gets the percentage score out of maximum possible (50,000)
   */
  getScorePercentage(totalScore: number): number {
    return Math.round((totalScore / 50000) * 100);
  }

  /**
   * Gets user-friendly error message for display
   */
  getErrorMessage(error: string | null): string {
    if (!error) return '';
    
    if (error.includes('Score calculation failed')) {
      return 'Unable to calculate your final score. Please try starting a new game.';
    }
    
    return error;
  }

  /**
   * Formats score with thousands separator
   */
  formatScore(score: number): string {
    return score.toLocaleString();
  }

  /**
   * Gets the breakdown of year vs location performance
   */
  getScoreBreakdown(scores: Score[]): { yearTotal: number; locationTotal: number; yearAvg: number; locationAvg: number } {
    if (!scores || scores.length === 0) {
      return { yearTotal: 0, locationTotal: 0, yearAvg: 0, locationAvg: 0 };
    }

    const yearTotal = scores.reduce((sum, score) => sum + score.yearScore, 0);
    const locationTotal = scores.reduce((sum, score) => sum + score.locationScore, 0);
    
    return {
      yearTotal,
      locationTotal,
      yearAvg: Math.round(yearTotal / scores.length),
      locationAvg: Math.round(locationTotal / scores.length)
    };
  }
}