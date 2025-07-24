import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { CommonModule } from '@angular/common';

import { ScoreSummary, PerformanceCategory } from './score-summary';
import { Score } from '../../models/scoring.model';
import { resetGame } from '../../state/game/game.actions';
import { resetScores } from '../../state/scoring/scoring.actions';

describe('ScoreSummary', () => {
  let component: ScoreSummary;
  let fixture: ComponentFixture<ScoreSummary>;
  let mockStore: jasmine.SpyObj<Store>;

  const mockScores: Score[] = [
    { photoId: '1', yearScore: 4500, locationScore: 3200, totalScore: 7700 },
    { photoId: '2', yearScore: 2800, locationScore: 4100, totalScore: 6900 },
    { photoId: '3', yearScore: 3600, locationScore: 2900, totalScore: 6500 },
    { photoId: '4', yearScore: 4200, locationScore: 3800, totalScore: 8000 },
    { photoId: '5', yearScore: 1900, locationScore: 2400, totalScore: 4300 }
  ];

  const mockScoreBreakdown = {
    total: 33400,
    year: 17000,
    location: 16400,
    average: 6680,
    maxPossible: 50000
  };

  beforeEach(async () => {
    const storeSpy = jasmine.createSpyObj('Store', ['select', 'dispatch']);

    await TestBed.configureTestingModule({
      imports: [CommonModule, ScoreSummary],
      providers: [
        { provide: Store, useValue: storeSpy }
      ]
    }).compileComponents();

    mockStore = TestBed.inject(Store) as jasmine.SpyObj<Store>;

    // Setup default store selectors
    mockStore.select.and.callFake((selector: any) => {
      return of(mockScoreBreakdown.total); // Default return for all selectors
    });

    fixture = TestBed.createComponent(ScoreSummary);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Performance Category Logic', () => {
    it('should return "History & Geography Master" for scores >= 90%', () => {
      const category = component.getPerformanceCategory(45000); // 90%
      expect(category.name).toBe('History & Geography Master');
      expect(category.description).toBe('Outstanding knowledge of world history and geography!');
      expect(category.color).toBe('#FFD700');
    });

    it('should return "Expert Explorer" for scores >= 80%', () => {
      const category = component.getPerformanceCategory(40000); // 80%
      expect(category.name).toBe('Expert Explorer');
      expect(category.description).toBe('Excellent grasp of historical events and locations.');
      expect(category.color).toBe('#C0C0C0');
    });

    it('should return "Skilled Scholar" for scores >= 70%', () => {
      const category = component.getPerformanceCategory(35000); // 70%
      expect(category.name).toBe('Skilled Scholar');
      expect(category.description).toBe('Good understanding of history and geography.');
      expect(category.color).toBe('#CD7F32');
    });

    it('should return "Competent Chronicler" for scores >= 60%', () => {
      const category = component.getPerformanceCategory(30000); // 60%
      expect(category.name).toBe('Competent Chronicler');
      expect(category.description).toBe('Decent knowledge with room for improvement.');
      expect(category.color).toBe('#4CAF50');
    });

    it('should return "Aspiring Adventurer" for scores >= 40%', () => {
      const category = component.getPerformanceCategory(20000); // 40%
      expect(category.name).toBe('Aspiring Adventurer');
      expect(category.description).toBe('Keep exploring to improve your skills!');
      expect(category.color).toBe('#2196F3');
    });

    it('should return "Curious Beginner" for scores >= 20%', () => {
      const category = component.getPerformanceCategory(10000); // 20%
      expect(category.name).toBe('Curious Beginner');
      expect(category.description).toBe('Everyone starts somewhere - keep learning!');
      expect(category.color).toBe('#FF9800');
    });

    it('should return "Time Traveler in Training" for scores < 20%', () => {
      const category = component.getPerformanceCategory(5000); // 10%
      expect(category.name).toBe('Time Traveler in Training');
      expect(category.description).toBe('Practice makes perfect - try again!');
      expect(category.color).toBe('#F44336');
    });

    it('should handle edge case of 0 score', () => {
      const category = component.getPerformanceCategory(0);
      expect(category.name).toBe('Time Traveler in Training');
    });

    it('should handle edge case of maximum score', () => {
      const category = component.getPerformanceCategory(50000);
      expect(category.name).toBe('History & Geography Master');
    });
  });

  describe('Duration Formatting', () => {
    it('should format duration in minutes and seconds', () => {
      const formatted = component.formatDuration(125000); // 2 minutes 5 seconds
      expect(formatted).toBe('2m 5s');
    });

    it('should format duration in seconds only', () => {
      const formatted = component.formatDuration(45000); // 45 seconds
      expect(formatted).toBe('45s');
    });

    it('should handle null duration', () => {
      const formatted = component.formatDuration(null);
      expect(formatted).toBe('Unknown');
    });

    it('should handle zero duration', () => {
      const formatted = component.formatDuration(0);
      expect(formatted).toBe('0s');
    });

    it('should handle exactly 1 minute', () => {
      const formatted = component.formatDuration(60000);
      expect(formatted).toBe('1m 0s');
    });

    it('should handle large durations', () => {
      const formatted = component.formatDuration(3665000); // 61 minutes 5 seconds
      expect(formatted).toBe('61m 5s');
    });
  });

  describe('Score Percentage Calculation', () => {
    it('should calculate correct percentage', () => {
      const percentage = component.getScorePercentage(25000, 50000);
      expect(percentage).toBe(50);
    });

    it('should handle zero max possible score', () => {
      const percentage = component.getScorePercentage(1000, 0);
      expect(percentage).toBe(0);
    });

    it('should handle zero current score', () => {
      const percentage = component.getScorePercentage(0, 50000);
      expect(percentage).toBe(0);
    });

    it('should handle 100% score', () => {
      const percentage = component.getScorePercentage(50000, 50000);
      expect(percentage).toBe(100);
    });

    it('should round to nearest integer', () => {
      const percentage = component.getScorePercentage(33333, 50000);
      expect(percentage).toBe(67); // 66.666 rounded to 67
    });
  });

  describe('New Game Functionality', () => {
    it('should dispatch resetGame and resetScores actions', () => {
      component.startNewGame();

      expect(mockStore.dispatch).toHaveBeenCalledWith(resetGame());
      expect(mockStore.dispatch).toHaveBeenCalledWith(resetScores());
      expect(mockStore.dispatch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Component Initialization', () => {
    it('should initialize observables correctly', () => {
      expect(component.scores$).toBeDefined();
      expect(component.totalScore$).toBeDefined();
      expect(component.scoreBreakdown$).toBeDefined();
      expect(component.gameDuration$).toBeDefined();
      expect(component.performanceCategory$).toBeDefined();
    });

    it('should set up performance category observable based on total score', (done) => {
      // Mock a specific total score
      mockStore.select.and.callFake((selector: any) => {
        if (selector.toString().includes('selectTotalScore')) {
          return of(40000); // 80% - Expert Explorer
        }
        return of(null);
      });

      // Recreate component to pick up new mock
      fixture = TestBed.createComponent(ScoreSummary);
      component = fixture.componentInstance;

      component.performanceCategory$.subscribe(category => {
        expect(category.name).toBe('Expert Explorer');
        done();
      });
    });
  });

  describe('Template Integration', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should display game complete header', () => {
      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('h1').textContent).toContain('Game Complete!');
    });

    it('should display performance badge', () => {
      const compiled = fixture.nativeElement;
      const badge = compiled.querySelector('.performance-badge');
      expect(badge).toBeTruthy();
    });

    it('should display total score', () => {
      const compiled = fixture.nativeElement;
      const scoreDisplay = compiled.querySelector('.score-display .score-number');
      expect(scoreDisplay.textContent).toContain('33,400');
    });

    it('should display score breakdown', () => {
      const compiled = fixture.nativeElement;
      const breakdown = compiled.querySelector('.score-breakdown');
      expect(breakdown).toBeTruthy();
    });

    it('should display detailed scores for each photo', () => {
      const compiled = fixture.nativeElement;
      const scoreItems = compiled.querySelectorAll('.score-item');
      expect(scoreItems.length).toBe(5);
    });

    it('should display new game button', () => {
      const compiled = fixture.nativeElement;
      const newGameBtn = compiled.querySelector('.new-game-btn');
      expect(newGameBtn).toBeTruthy();
      expect(newGameBtn.textContent).toContain('New Game');
    });

    it('should call startNewGame when new game button is clicked', () => {
      spyOn(component, 'startNewGame');
      const compiled = fixture.nativeElement;
      const newGameBtn = compiled.querySelector('.new-game-btn');
      
      newGameBtn.click();
      
      expect(component.startNewGame).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty scores array', () => {
      mockStore.select.and.callFake((selector: any) => {
        if (selector.toString().includes('selectAllScores')) {
          return of([]);
        }
        if (selector.toString().includes('selectTotalScore')) {
          return of(0);
        }
        if (selector.toString().includes('selectScoreBreakdown')) {
          return of({
            total: 0,
            year: 0,
            location: 0,
            average: 0,
            maxPossible: 0
          });
        }
        return of(null);
      });

      fixture = TestBed.createComponent(ScoreSummary);
      component = fixture.componentInstance;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const scoreItems = compiled.querySelectorAll('.score-item');
      expect(scoreItems.length).toBe(0);
    });

    it('should handle null game duration', () => {
      mockStore.select.and.callFake((selector: any) => {
        if (selector.toString().includes('selectGameDuration')) {
          return of(null);
        }
        return of(mockScoreBreakdown);
      });

      fixture = TestBed.createComponent(ScoreSummary);
      component = fixture.componentInstance;

      expect(component.formatDuration(null)).toBe('Unknown');
    });
  });
});