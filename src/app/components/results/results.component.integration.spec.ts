import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';

import { ResultsComponent } from './results.component';
import { MapService } from '../../services/map.service';
import { EnhancedFeedbackService } from '../../services/enhanced-feedback.service';
import { ScoringService } from '../../services/scoring.service';
import { AppState } from '../../state/app.state';
import { Photo } from '../../models/photo.model';
import { Guess, Score } from '../../models/scoring.model';
import { EnhancedFeedback } from '../../models/enhanced-feedback.model';
import * as photosSelectors from '../../state/photos/photos.selectors';
import * as scoringSelectors from '../../state/scoring/scoring.selectors';

describe('ResultsComponent Integration', () => {
  let component: ResultsComponent;
  let fixture: ComponentFixture<ResultsComponent>;
  let mockStore: jasmine.SpyObj<Store<AppState>>;
  let mockMapService: jasmine.SpyObj<MapService>;
  let mockEnhancedFeedbackService: jasmine.SpyObj<EnhancedFeedbackService>;
  let mockScoringService: jasmine.SpyObj<ScoringService>;

  const mockPhoto: Photo = {
    id: 'integration-test-photo',
    url: 'https://example.com/integration-photo.jpg',
    title: 'Integration Test Photo',
    description: 'A photo for integration testing',
    year: 1965,
    coordinates: { latitude: 51.5074, longitude: -0.1278 }, // London
    source: 'integration-test',
    metadata: {
      license: 'CC BY-SA',
      originalSource: 'integration-test',
      dateCreated: new Date('1965-06-15'),
      photographer: 'Integration Test Photographer'
    }
  };

  const mockGuess: Guess = {
    year: 1970,
    coordinates: { latitude: 48.8566, longitude: 2.3522 } // Paris
  };

  const mockScore: Score = {
    photoId: 'integration-test-photo',
    yearScore: 2500,
    locationScore: 1800,
    totalScore: 4300
  };

  const mockEnhancedFeedback: EnhancedFeedback = {
    correctYear: 1965,
    correctLocation: { latitude: 51.5074, longitude: -0.1278 },
    userGuess: mockGuess,
    distanceKm: 344.0,
    yearAccuracy: 'good',
    locationAccuracy: 'fair',
    photoContext: {
      photographer: 'Integration Test Photographer',
      detailedDescription: 'This integration test photo captures London in 1965, during the height of the Swinging Sixties.',
      historicalContext: 'This photograph from the 1960s represents the Cultural Revolution era, marked by significant movements in civil rights, technology, and popular culture.',
      interestingFacts: [
        'In 1965, the world was experiencing rapid cultural and technological change.',
        'Color photography was becoming more widely available and affordable.',
        'This photograph was taken at coordinates 51.5074, -0.1278.'
      ],
      era: 'Cultural Revolution',
      significance: 'This photograph serves as a historical document, preserving a moment from 1965 and providing insight into the visual culture and daily life of that era.'
    },
    yearDifference: 5,
    performanceSummary: 'Good year guess! You were 5 years off. Fair location guess. You were 344.0 km away from the correct location.'
  };

  beforeEach(async () => {
    const storeSpy = jasmine.createSpyObj('Store', ['select', 'dispatch']);
    const mapServiceSpy = jasmine.createSpyObj('MapService', [
      'initializeMap',
      'addPin',
      'addAdditionalPin',
      'fitBounds',
      'calculateDistance'
    ]);
    const enhancedFeedbackServiceSpy = jasmine.createSpyObj('EnhancedFeedbackService', [
      'generateFeedback',
      'calculateDistance'
    ]);
    const scoringServiceSpy = jasmine.createSpyObj('ScoringService', [
      'calculateDistance'
    ]);

    // Setup service return values
    mapServiceSpy.calculateDistance.and.returnValue(344.0);
    enhancedFeedbackServiceSpy.generateFeedback.and.returnValue(mockEnhancedFeedback);
    enhancedFeedbackServiceSpy.calculateDistance.and.returnValue(344.0);
    scoringServiceSpy.calculateDistance.and.returnValue(344.0);

    // Setup store to return complete data set
    storeSpy.select.and.callFake((selector: any) => {
      if (selector === photosSelectors.selectCurrentPhoto) {
        return of(mockPhoto);
      }
      if (selector === scoringSelectors.selectCurrentGuess) {
        return of(mockGuess);
      }
      if (typeof selector === 'function') {
        return of(mockScore);
      }
      return of(null);
    });

    await TestBed.configureTestingModule({
      imports: [ResultsComponent],
      providers: [
        { provide: Store, useValue: storeSpy },
        { provide: MapService, useValue: mapServiceSpy },
        { provide: EnhancedFeedbackService, useValue: enhancedFeedbackServiceSpy },
        { provide: ScoringService, useValue: scoringServiceSpy }
      ]
    }).compileComponents();

    mockStore = TestBed.inject(Store) as jasmine.SpyObj<Store<AppState>>;
    mockMapService = TestBed.inject(MapService) as jasmine.SpyObj<MapService>;
    mockEnhancedFeedbackService = TestBed.inject(EnhancedFeedbackService) as jasmine.SpyObj<EnhancedFeedbackService>;
    mockScoringService = TestBed.inject(ScoringService) as jasmine.SpyObj<ScoringService>;

    fixture = TestBed.createComponent(ResultsComponent);
    component = fixture.componentInstance;
  });

  it('should create and display complete enhanced results', fakeAsync(() => {
    fixture.detectChanges();
    tick(100); // Wait for setTimeout in initializeResultsMap
    fixture.detectChanges();

    expect(component).toBeTruthy();

    const compiled = fixture.nativeElement;

    // Verify enhanced feedback service was called
    expect(mockEnhancedFeedbackService.generateFeedback).toHaveBeenCalledWith(mockPhoto, mockGuess);

    // Verify map initialization
    expect(mockMapService.initializeMap).toHaveBeenCalledWith('results-map');
    expect(mockMapService.addPin).toHaveBeenCalledWith(
      mockGuess.coordinates,
      { color: 'red', label: 'Your Guess' }
    );
    expect(mockMapService.addAdditionalPin).toHaveBeenCalledWith(
      mockPhoto.coordinates,
      { color: 'green', label: 'Correct Location' }
    );
    expect(mockMapService.fitBounds).toHaveBeenCalledWith([
      mockGuess.coordinates,
      mockPhoto.coordinates
    ]);

    // Verify all major sections are present
    expect(compiled.querySelector('.performance-summary')).toBeTruthy();
    expect(compiled.querySelector('.year-results')).toBeTruthy();
    expect(compiled.querySelector('.location-results')).toBeTruthy();
    expect(compiled.querySelector('.photo-context')).toBeTruthy();
    expect(compiled.querySelector('.total-score')).toBeTruthy();
    expect(compiled.querySelector('.map-results')).toBeTruthy();

    // Verify enhanced content is displayed
    expect(compiled.textContent).toContain(mockEnhancedFeedback.performanceSummary);
    expect(compiled.textContent).toContain(mockEnhancedFeedback.photoContext.detailedDescription);
    expect(compiled.textContent).toContain(mockEnhancedFeedback.photoContext.historicalContext);
    expect(compiled.textContent).toContain(mockEnhancedFeedback.photoContext.era);
    expect(compiled.textContent).toContain(mockEnhancedFeedback.photoContext.photographer);
    expect(compiled.textContent).toContain(mockEnhancedFeedback.photoContext.significance);

    // Verify interesting facts are displayed
    mockEnhancedFeedback.photoContext.interestingFacts!.forEach(fact => {
      expect(compiled.textContent).toContain(fact);
    });

    // Verify prominent answers are displayed
    expect(compiled.querySelector('.correct-year-display .year-value')?.textContent?.trim()).toBe('1965');
    expect(compiled.querySelector('.correct-location-display .location-value')?.textContent).toContain('51.5074');
    expect(compiled.querySelector('.correct-location-display .location-value')?.textContent).toContain('-0.1278');

    // Verify accuracy badges
    expect(compiled.querySelector('.year-results .accuracy-good')).toBeTruthy();
    expect(compiled.querySelector('.location-results .accuracy-fair')).toBeTruthy();
  }));

  it('should handle complete game workflow integration', fakeAsync(() => {
    // Simulate the complete workflow
    fixture.detectChanges();
    tick(100); // Wait for setTimeout in initializeResultsMap
    fixture.detectChanges();

    // Verify map initialization with enhanced data
    expect(mockMapService.initializeMap).toHaveBeenCalledWith('results-map');
    expect(mockMapService.addPin).toHaveBeenCalledWith(
      mockGuess.coordinates,
      { color: 'red', label: 'Your Guess' }
    );
    expect(mockMapService.addAdditionalPin).toHaveBeenCalledWith(
      mockPhoto.coordinates,
      { color: 'green', label: 'Correct Location' }
    );
    expect(mockMapService.fitBounds).toHaveBeenCalledWith([
      mockGuess.coordinates,
      mockPhoto.coordinates
    ]);

    // Test next photo functionality
    const nextButton = fixture.nativeElement.querySelector('.next-photo-btn');
    expect(nextButton).toBeTruthy();

    nextButton.click();
    expect(mockStore.dispatch).toHaveBeenCalled();
  }));

  it('should gracefully handle missing enhanced feedback', async () => {
    // Setup service to return null enhanced feedback
    mockEnhancedFeedbackService.generateFeedback.and.returnValue(null as any);

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement;

    // Should still display basic results
    expect(compiled.querySelector('.year-results')).toBeTruthy();
    expect(compiled.querySelector('.location-results')).toBeTruthy();
    expect(compiled.querySelector('.total-score')).toBeTruthy();

    // Should not display enhanced sections
    expect(compiled.querySelector('.performance-summary')).toBeFalsy();
    expect(compiled.querySelector('.photo-context')).toBeFalsy();
  });

  it('should display fallback content when enhanced data is unavailable', async () => {
    // Setup enhanced feedback with minimal data
    const minimalFeedback: EnhancedFeedback = {
      correctYear: 1965,
      correctLocation: { latitude: 51.5074, longitude: -0.1278 },
      userGuess: mockGuess,
      distanceKm: 344.0,
      yearAccuracy: 'good',
      locationAccuracy: 'fair',
      photoContext: {}, // Empty context
      yearDifference: 5,
      performanceSummary: 'Basic performance summary'
    };

    mockEnhancedFeedbackService.generateFeedback.and.returnValue(minimalFeedback);

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement;

    // Should display performance summary
    expect(compiled.textContent).toContain('Basic performance summary');

    // Should not display empty context sections
    expect(compiled.querySelector('.context-section')).toBeFalsy();

    // Should still display core functionality
    expect(compiled.querySelector('.prominent-answer')).toBeTruthy();
    expect(compiled.querySelector('.accuracy-badge')).toBeTruthy();
  });
});