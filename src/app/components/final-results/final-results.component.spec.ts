import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { FinalResultsComponent } from './final-results.component';
import { Score } from '../../models/scoring.model';
import * as GameActions from '../../state/game/game.actions';

describe('FinalResultsComponent', () => {
  let component: FinalResultsComponent;
  let fixture: ComponentFixture<FinalResultsComponent>;
  let mockStore: jasmine.SpyObj<Store>;
  let mockRouter: jasmine.SpyObj<Router>;

  const mockScores: Score[] = [
    { photoId: '1', yearScore: 4500, locationScore: 3000, totalScore: 7500 },
    { photoId: '2', yearScore: 5000, locationScore: 4000, totalScore: 9000 },
    { photoId: '3', yearScore: 3000, locationScore: 2500, totalScore: 5500 },
    { photoId: '4', yearScore: 4000, locationScore: 3500, totalScore: 7500 },
    { photoId: '5', yearScore: 2500, locationScore: 2000, totalScore: 4500 }
  ];

  beforeEach(async () => {
    const storeSpy = jasmine.createSpyObj('Store', ['select', 'dispatch']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    // Setup default store selectors before component creation
    storeSpy.select.and.callFake((selector: any) => {
      if (selector.toString().includes('TotalScore')) {
        return of(34000);
      }
      if (selector.toString().includes('Scores')) {
        return of(mockScores);
      }
      if (selector.toString().includes('IsGameCompleted')) {
        return of(true);
      }
      return of(false);
    });

    await TestBed.configureTestingModule({
      imports: [FinalResultsComponent],
      providers: [
        { provide: Store, useValue: storeSpy },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FinalResultsComponent);
    component = fixture.componentInstance;
    mockStore = TestBed.inject(Store) as jasmine.SpyObj<Store>;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should redirect to start screen if game is not completed', () => {
    mockStore.select.and.callFake((selector: any) => {
      if (selector.toString().includes('IsGameCompleted')) {
        return of(false);
      }
      return of(null);
    });

    component.ngOnInit();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should start new game and navigate to start screen', () => {
    component.startNewGame();

    expect(mockStore.dispatch).toHaveBeenCalledWith(GameActions.resetGame());
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should navigate back to game screen', () => {
    component.backToGame();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/game']);
  });

  it('should get correct performance category for master level', () => {
    const category = component.getPerformanceCategory(45000);

    expect(category.title).toBe('History & Geography Master');
    expect(category.class).toBe('master');
  });

  it('should get correct performance category for expert level', () => {
    const category = component.getPerformanceCategory(35000);

    expect(category.title).toBe('Expert Explorer');
    expect(category.class).toBe('expert');
  });

  it('should get correct performance category for good level', () => {
    const category = component.getPerformanceCategory(25000);

    expect(category.title).toBe('Knowledgeable Navigator');
    expect(category.class).toBe('good');
  });

  it('should get correct performance category for learning level', () => {
    const category = component.getPerformanceCategory(15000);

    expect(category.title).toBe('Curious Learner');
    expect(category.class).toBe('learning');
  });

  it('should get correct performance category for beginner level', () => {
    const category = component.getPerformanceCategory(5000);

    expect(category.title).toBe('Beginning Explorer');
    expect(category.class).toBe('beginner');
  });

  it('should calculate score percentage correctly', () => {
    expect(component.getScorePercentage(25000)).toBe(50);
    expect(component.getScorePercentage(37500)).toBe(75);
    expect(component.getScorePercentage(50000)).toBe(100);
  });

  it('should format score with thousands separator', () => {
    expect(component.formatScore(1234)).toBe('1,234');
    expect(component.formatScore(12345)).toBe('12,345');
    expect(component.formatScore(123456)).toBe('123,456');
  });

  it('should calculate score breakdown correctly', () => {
    const breakdown = component.getScoreBreakdown(mockScores);

    expect(breakdown.yearTotal).toBe(19000);
    expect(breakdown.locationTotal).toBe(15000);
    expect(breakdown.yearAvg).toBe(3800);
    expect(breakdown.locationAvg).toBe(3000);
  });

  it('should handle empty scores array', () => {
    const breakdown = component.getScoreBreakdown([]);

    expect(breakdown.yearTotal).toBe(0);
    expect(breakdown.locationTotal).toBe(0);
    expect(breakdown.yearAvg).toBe(0);
    expect(breakdown.locationAvg).toBe(0);
  });

  it('should handle null scores', () => {
    const breakdown = component.getScoreBreakdown(null as any);

    expect(breakdown.yearTotal).toBe(0);
    expect(breakdown.locationTotal).toBe(0);
    expect(breakdown.yearAvg).toBe(0);
    expect(breakdown.locationAvg).toBe(0);
  });

  it('should return user-friendly error message for score calculation error', () => {
    const error = 'Score calculation failed';
    
    const message = component.getErrorMessage(error);
    
    expect(message).toBe('Unable to calculate your final score. Please try starting a new game.');
  });

  it('should return original error message for unknown errors', () => {
    const error = 'Unknown error occurred';
    
    const message = component.getErrorMessage(error);
    
    expect(message).toBe('Unknown error occurred');
  });

  it('should return empty string for null error', () => {
    const message = component.getErrorMessage(null);
    
    expect(message).toBe('');
  });

  it('should display total score correctly', () => {
    fixture.detectChanges();

    const scoreDisplay = fixture.nativeElement.querySelector('.score-number');
    expect(scoreDisplay.textContent.trim()).toBe('34,000');
  });

  it('should display performance category', () => {
    fixture.detectChanges();

    const performanceCategory = fixture.nativeElement.querySelector('.performance-category h3');
    expect(performanceCategory.textContent).toBe('Expert Explorer');
  });

  it('should display score breakdown', () => {
    fixture.detectChanges();

    const breakdownItems = fixture.nativeElement.querySelectorAll('.breakdown-item');
    expect(breakdownItems.length).toBe(2);
    
    const yearBreakdown = breakdownItems[0];
    expect(yearBreakdown.textContent).toContain('Year Accuracy');
    expect(yearBreakdown.textContent).toContain('19,000');
    
    const locationBreakdown = breakdownItems[1];
    expect(locationBreakdown.textContent).toContain('Location Accuracy');
    expect(locationBreakdown.textContent).toContain('15,000');
  });

  it('should display per-photo scores', () => {
    fixture.detectChanges();

    const photoScoreItems = fixture.nativeElement.querySelectorAll('.photo-score-item');
    expect(photoScoreItems.length).toBe(5);
    
    const firstPhoto = photoScoreItems[0];
    expect(firstPhoto.textContent).toContain('Photo 1');
    expect(firstPhoto.textContent).toContain('4,500');
    expect(firstPhoto.textContent).toContain('3,000');
    expect(firstPhoto.textContent).toContain('7,500');
  });
});