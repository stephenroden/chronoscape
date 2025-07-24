import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { 
  selectAllScores, 
  selectTotalScore, 
  selectScoreBreakdown,
  selectTotalYearScore,
  selectTotalLocationScore 
} from '../../state/scoring/scoring.selectors';
import { selectGameDuration } from '../../state/game/game.selectors';
import { resetGame } from '../../state/game/game.actions';
import { resetScores } from '../../state/scoring/scoring.actions';
import { Score } from '../../models/scoring.model';

export interface PerformanceCategory {
  name: string;
  description: string;
  color: string;
}

export interface ScoreBreakdown {
  total: number;
  year: number;
  location: number;
  average: number;
  maxPossible: number;
}

@Component({
  selector: 'app-score-summary',
  imports: [CommonModule],
  templateUrl: './score-summary.html',
  styleUrl: './score-summary.scss'
})
export class ScoreSummary implements OnInit {
  scores$: Observable<Score[]>;
  totalScore$: Observable<number>;
  scoreBreakdown$: Observable<ScoreBreakdown>;
  gameDuration$: Observable<number | null>;
  performanceCategory$: Observable<PerformanceCategory>;

  constructor(private store: Store) {
    this.scores$ = this.store.select(selectAllScores);
    this.totalScore$ = this.store.select(selectTotalScore);
    this.scoreBreakdown$ = this.store.select(selectScoreBreakdown);
    this.gameDuration$ = this.store.select(selectGameDuration);
    
    this.performanceCategory$ = this.totalScore$.pipe(
      map(score => this.getPerformanceCategory(score))
    );
  }

  ngOnInit(): void {}

  /**
   * Determines performance category based on total score
   * @param totalScore - The total score achieved
   * @returns Performance category with name, description, and color
   */
  getPerformanceCategory(totalScore: number): PerformanceCategory {
    const percentage = (totalScore / 50000) * 100;

    if (percentage >= 90) {
      return {
        name: 'History & Geography Master',
        description: 'Outstanding knowledge of world history and geography!',
        color: '#FFD700' // Gold
      };
    } else if (percentage >= 80) {
      return {
        name: 'Expert Explorer',
        description: 'Excellent grasp of historical events and locations.',
        color: '#C0C0C0' // Silver
      };
    } else if (percentage >= 70) {
      return {
        name: 'Skilled Scholar',
        description: 'Good understanding of history and geography.',
        color: '#CD7F32' // Bronze
      };
    } else if (percentage >= 60) {
      return {
        name: 'Competent Chronicler',
        description: 'Decent knowledge with room for improvement.',
        color: '#4CAF50' // Green
      };
    } else if (percentage >= 40) {
      return {
        name: 'Aspiring Adventurer',
        description: 'Keep exploring to improve your skills!',
        color: '#2196F3' // Blue
      };
    } else if (percentage >= 20) {
      return {
        name: 'Curious Beginner',
        description: 'Everyone starts somewhere - keep learning!',
        color: '#FF9800' // Orange
      };
    } else {
      return {
        name: 'Time Traveler in Training',
        description: 'Practice makes perfect - try again!',
        color: '#F44336' // Red
      };
    }
  }

  /**
   * Formats duration from milliseconds to readable string
   * @param duration - Duration in milliseconds
   * @returns Formatted duration string
   */
  formatDuration(duration: number | null): string {
    if (!duration) return 'Unknown';
    
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  }

  /**
   * Calculates percentage of maximum possible score
   * @param score - Current score
   * @param maxPossible - Maximum possible score
   * @returns Percentage as number
   */
  getScorePercentage(score: number, maxPossible: number): number {
    if (maxPossible === 0) return 0;
    return Math.round((score / maxPossible) * 100);
  }

  /**
   * Starts a new game by resetting all game and scoring state
   */
  startNewGame(): void {
    this.store.dispatch(resetGame());
    this.store.dispatch(resetScores());
  }
}
