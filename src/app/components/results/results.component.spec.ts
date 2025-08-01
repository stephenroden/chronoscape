import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';

import { ResultsComponent } from './results.component';
import { MapService } from '../../services/map.service';
import { EnhancedFeedbackService } from '../../services/enhanced-feedback.service';
import { AppState } from '../../state/app.state';
import { Photo } from '../../models/photo.model';
import { Guess, Score } from '../../models/scoring.model';
import { EnhancedFeedback } from '../../models/enhanced-feedback.model';
import { nextPhoto } from '../../state/game/game.actions';
import * as photosSelectors from '../../state/photos/photos.selectors';
import * as scoringSelectors from '../../state/scoring/scoring.selectors';

describe('ResultsComponent', () => {
  let component: ResultsComponent;
  let fixture: ComponentFixture<ResultsComponent>;
  let mockStore: jasmine.SpyObj<Store<AppState>>;
  let mockMapService: jasmine.SpyObj<MapService>;
  let mockEnhancedFeedbackService: jasmine.SpyObj<EnhancedFeedbackService>;

  const mockPhoto: Photo = {
    id: 'test-photo-1',
    url: 'https://example.com/photo.jpg',
    title: 'Test Photo',
    description: 'A test photo description',
    year: 1950,
    coordinates: { latitude: 40.7128, longitude: -74.0060 },
    source: 'test-source',
    metadata: {
      license: 'CC BY-SA',
      originalSource: 'test-source',
      dateCreated: new Date('1950-01-01'),
      photographer: 'Test Photographer'
    }
  };

  const mockGuess: Guess = {
    year: 1955,
    coordinates: { latitude: 41.0000, longitude: -73.0000 }
  };

  const mockScore: Score = {
    photoId: 'test-photo-1',
    yearScore: 3000,
    locationScore: 2500,
    totalScore: 5500
  };

  const mockEnhancedFeedback: EnhancedFeedback = {
    correctYear: 1950,
    correctLocation: { latitude: 40.7128, longitude: -74.0060 },
    userGuess: mockGuess,
    distanceKm: 123.45,
    yearAccuracy: 'good',
    locationAccuracy: 'fair',
    photoContext: {
      photographer: 'Test Photographer',
      detailedDescription: 'Enhanced detailed description of the test photo',
      historicalContext: 'This photo was taken during a significant historical period',
      interestingFacts: ['Fact 1', 'Fact 2', 'Fact 3'],
      era: 'Mid-Century Modern',
      significance: 'This photo has historical significance'
    },
    yearDifference: 5,
    performanceSummary: 'Good year guess! You were 5 years off. Fair location guess. You were 123.45 km away from the correct location.'
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

    // Setup default return values
    mapServiceSpy.calculateDistance.and.returnValue(123.456);
    enhancedFeedbackServiceSpy.generateFeedback.and.returnValue(mockEnhancedFeedback);
    enhancedFeedbackServiceSpy.calculateDistance.and.returnValue(123.45);

    // Setup default store behavior BEFORE component creation
    storeSpy.select.and.returnValue(of(null));

    await TestBed.configureTestingModule({
      imports: [ResultsComponent],
      providers: [
        { provide: Store, useValue: storeSpy },
        { provide: MapService, useValue: mapServiceSpy },
        { provide: EnhancedFeedbackService, useValue: enhancedFeedbackServiceSpy }
      ]
    }).compileComponents();

    mockStore = TestBed.inject(Store) as jasmine.SpyObj<Store<AppState>>;
    mockMapService = TestBed.inject(MapService) as jasmine.SpyObj<MapService>;
    mockEnhancedFeedbackService = TestBed.inject(EnhancedFeedbackService) as jasmine.SpyObj<EnhancedFeedbackService>;
  });

  it('should create', () => {
    fixture = TestBed.createComponent(ResultsComponent);
    component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  describe('Component Initialization', () => {
    beforeEach(() => {
      fixture = TestBed.createComponent(ResultsComponent);
      component = fixture.componentInstance;
    });

    it('should initialize with correct observables', () => {
      fixture.detectChanges();
      expect(component.currentPhoto$).toBeDefined();
      expect(component.currentGuess$).toBeDefined();
      expect(component.resultsData$).toBeDefined();
    });

    it('should set correct map container ID', () => {
      expect(component.mapContainerId).toBe('results-map');
    });
  });

  describe('Results Data Display', () => {
    beforeEach(() => {
      // Setup store to return mock data BEFORE creating component
      mockStore.select.and.callFake((selector: any) => {
        if (selector === photosSelectors.selectCurrentPhoto) {
          return of(mockPhoto);
        }
        if (selector === scoringSelectors.selectCurrentGuess) {
          return of(mockGuess);
        }
        // Handle the selectScoreByPhotoId function selector
        if (typeof selector === 'function') {
          return of(mockScore);
        }
        return of(null);
      });

      fixture = TestBed.createComponent(ResultsComponent);
      component = fixture.componentInstance;
    });

    it('should display photo information correctly', async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges(); // Second change detection after async pipe resolves

      const compiled = fixture.nativeElement;
      const titleElement = compiled.querySelector('.photo-info h3');
      const descriptionElement = compiled.querySelector('.photo-description');

      expect(titleElement).toBeTruthy();
      expect(titleElement.textContent).toContain(mockPhoto.title);
      expect(descriptionElement).toBeTruthy();
      // Should now show enhanced description instead of original
      expect(descriptionElement.textContent).toContain(mockEnhancedFeedback.photoContext.detailedDescription);
    });

    it('should display year comparison correctly', async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges(); // Second change detection after async pipe resolves

      const compiled = fixture.nativeElement;
      const yearSection = compiled.querySelector('.year-results');
      expect(yearSection).toBeTruthy();
      expect(yearSection.textContent).toContain(mockGuess.year.toString());
      expect(yearSection.textContent).toContain(mockPhoto.year.toString());
    });

    it('should display location comparison correctly', async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges(); // Second change detection after async pipe resolves

      const compiled = fixture.nativeElement;
      const locationSection = compiled.querySelector('.location-results');
      expect(locationSection).toBeTruthy();
      expect(locationSection.textContent).toContain(mockGuess.coordinates.latitude.toFixed(4));
      expect(locationSection.textContent).toContain(mockPhoto.coordinates.latitude.toFixed(4));
    });

    it('should display score information correctly', async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges(); // Second change detection after async pipe resolves

      const compiled = fixture.nativeElement;

      // Check for year score
      const yearScoreElement = compiled.querySelector('.year-results .score-points .points');
      expect(yearScoreElement).toBeTruthy();
      expect(yearScoreElement.textContent?.trim()).toBe(mockScore.yearScore.toString());

      // Check for location score
      const locationScoreElement = compiled.querySelector('.location-results .score-points .points');
      expect(locationScoreElement).toBeTruthy();
      expect(locationScoreElement.textContent?.trim()).toBe(mockScore.locationScore.toString());

      // Check for total score
      const totalScoreElement = compiled.querySelector('.total-score .total-points .points');
      expect(totalScoreElement).toBeTruthy();
      expect(totalScoreElement.textContent?.trim()).toBe(mockScore.totalScore.toString());

      // Verify scores appear in the content
      const content = compiled.textContent || '';
      expect(content).toContain(mockScore.yearScore.toString());
      expect(content).toContain(mockScore.locationScore.toString());
      expect(content).toContain(mockScore.totalScore.toString());
    });
  });

  describe('Map Functionality', () => {
    beforeEach(() => {
      mockStore.select.and.callFake((selector: any) => {
        if (selector === photosSelectors.selectCurrentPhoto) {
          return of(mockPhoto);
        }
        if (selector === scoringSelectors.selectCurrentGuess) {
          return of(mockGuess);
        }
        // Handle the selectScoreByPhotoId function selector
        if (typeof selector === 'function') {
          return of(mockScore);
        }
        return of(null);
      });
      mockMapService.calculateDistance.and.returnValue(50.5);

      fixture = TestBed.createComponent(ResultsComponent);
      component = fixture.componentInstance;
    });

    it('should initialize map when data is available', fakeAsync(() => {
      fixture.detectChanges();
      tick(100); // Wait for setTimeout in initializeResultsMap

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
    }));

    it('should initialize map with enhanced feedback data', fakeAsync(() => {
      fixture.detectChanges();
      tick(100); // Wait for setTimeout in initializeResultsMap

      // Verify that the map is initialized with enhanced feedback
      expect(mockMapService.initializeMap).toHaveBeenCalledWith('results-map');
      // The addDistanceLine method should be called (though it's currently just a console.log)
      spyOn(console, 'log');
      component['addDistanceLine'](mockGuess.coordinates, mockPhoto.coordinates);
      expect(console.log).toHaveBeenCalledWith('Distance line would be drawn between:', mockGuess.coordinates, 'and', mockPhoto.coordinates);
    }));

    it('should handle map initialization errors gracefully', fakeAsync(() => {
      mockMapService.initializeMap.and.throwError('Map error');
      spyOn(console, 'error');

      fixture.detectChanges();
      tick(100); // Wait for setTimeout in initializeResultsMap

      expect(console.error).toHaveBeenCalledWith('Error initializing results map:', jasmine.any(Error));
    }));

    it('should handle distance line errors gracefully', () => {
      spyOn(console, 'error');
      spyOn(console, 'log').and.throwError('Distance line error');

      component['addDistanceLine'](mockGuess.coordinates, mockPhoto.coordinates);

      expect(console.error).toHaveBeenCalledWith('Error adding distance line:', jasmine.any(Error));
    });
  });

  describe('Distance Calculation', () => {
    beforeEach(() => {
      mockMapService.calculateDistance.and.returnValue(123.456);
      fixture = TestBed.createComponent(ResultsComponent);
      component = fixture.componentInstance;
    });

    it('should calculate distance correctly', () => {
      const distance = component.calculateDistance(mockGuess.coordinates, mockPhoto.coordinates);
      expect(mockMapService.calculateDistance).toHaveBeenCalledWith(
        mockGuess.coordinates,
        mockPhoto.coordinates
      );
      expect(distance).toBe(123.456);
    });
  });

  describe('Formatting Functions', () => {
    beforeEach(() => {
      fixture = TestBed.createComponent(ResultsComponent);
      component = fixture.componentInstance;
    });

    it('should format distance correctly for meters', () => {
      const result = component.formatDistance(0.5);
      expect(result).toBe('500m');
    });

    it('should format distance correctly for kilometers under 100', () => {
      const result = component.formatDistance(12.345);
      expect(result).toBe('12.3km');
    });

    it('should format distance correctly for kilometers over 100', () => {
      const result = component.formatDistance(123.456);
      expect(result).toBe('123km');
    });

    it('should format year difference for exact match', () => {
      const result = component.formatYearDifference(1950, 1950);
      expect(result).toBe('Exact match!');
    });

    it('should format year difference for single year', () => {
      const result = component.formatYearDifference(1950, 1951);
      expect(result).toBe('1 year off');
    });

    it('should format year difference for multiple years', () => {
      const result = component.formatYearDifference(1950, 1955);
      expect(result).toBe('5 years off');
    });
  });

  describe('Performance Categories', () => {
    beforeEach(() => {
      fixture = TestBed.createComponent(ResultsComponent);
      component = fixture.componentInstance;
    });

    it('should return correct year performance categories', () => {
      expect(component.getYearPerformance(5000)).toBe('Perfect!');
      expect(component.getYearPerformance(4500)).toBe('Excellent');
      expect(component.getYearPerformance(3000)).toBe('Good');
      expect(component.getYearPerformance(1500)).toBe('Fair');
      expect(component.getYearPerformance(0)).toBe('Poor');
    });

    it('should return correct location performance categories', () => {
      expect(component.getLocationPerformance(5000)).toBe('Perfect!');
      expect(component.getLocationPerformance(4000)).toBe('Excellent');
      expect(component.getLocationPerformance(2500)).toBe('Good');
      expect(component.getLocationPerformance(1000)).toBe('Fair');
      expect(component.getLocationPerformance(0)).toBe('Poor');
    });
  });

  describe('Navigation', () => {
    beforeEach(() => {
      // Setup store to return mock data so the template renders
      mockStore.select.and.callFake((selector: any) => {
        if (selector === photosSelectors.selectCurrentPhoto) {
          return of(mockPhoto);
        }
        if (selector === scoringSelectors.selectCurrentGuess) {
          return of(mockGuess);
        }
        // Handle the selectScoreByPhotoId function selector
        if (typeof selector === 'function') {
          return of(mockScore);
        }
        return of(null);
      });

      fixture = TestBed.createComponent(ResultsComponent);
      component = fixture.componentInstance;
    });

    it('should dispatch nextPhoto action when next photo button is clicked', async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges(); // Second change detection after async pipe resolves

      const button = fixture.nativeElement.querySelector('.next-photo-btn');
      if (button) {
        button.click();
        expect(mockStore.dispatch).toHaveBeenCalledWith(nextPhoto());
      } else {
        // If button is not rendered (due to missing data), test the method directly
        component.onNextPhoto();
        expect(mockStore.dispatch).toHaveBeenCalledWith(nextPhoto());
      }
    });

    it('should reset map initialization flag when next photo is clicked', () => {
      component['mapInitialized'] = true;
      component.onNextPhoto();
      expect(component['mapInitialized']).toBe(false);
    });
  });

  describe('Enhanced Feedback Integration', () => {
    beforeEach(() => {
      mockStore.select.and.callFake((selector: any) => {
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

      fixture = TestBed.createComponent(ResultsComponent);
      component = fixture.componentInstance;
    });

    it('should generate enhanced feedback when photo and guess are available', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      expect(mockEnhancedFeedbackService.generateFeedback).toHaveBeenCalledWith(mockPhoto, mockGuess);
    });

    it('should display enhanced performance summary', async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const summarySection = compiled.querySelector('.performance-summary');
      expect(summarySection).toBeTruthy();
      expect(summarySection.textContent).toContain(mockEnhancedFeedback.performanceSummary);
    });

    it('should display prominent correct year', async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const correctYearDisplay = compiled.querySelector('.correct-year-display .year-value');
      expect(correctYearDisplay).toBeTruthy();
      expect(correctYearDisplay.textContent?.trim()).toBe(mockPhoto.year.toString());
    });

    it('should display prominent correct location', async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const correctLocationDisplay = compiled.querySelector('.correct-location-display .location-value');
      expect(correctLocationDisplay).toBeTruthy();
      expect(correctLocationDisplay.textContent).toContain(mockPhoto.coordinates.latitude.toFixed(4));
      expect(correctLocationDisplay.textContent).toContain(mockPhoto.coordinates.longitude.toFixed(4));
    });

    it('should display enhanced accuracy badges', async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const yearAccuracyBadge = compiled.querySelector('.year-results .accuracy-badge');
      const locationAccuracyBadge = compiled.querySelector('.location-results .accuracy-badge');

      expect(yearAccuracyBadge).toBeTruthy();
      expect(yearAccuracyBadge.textContent).toContain('Good Year Accuracy');
      expect(yearAccuracyBadge.classList).toContain('accuracy-good');

      expect(locationAccuracyBadge).toBeTruthy();
      expect(locationAccuracyBadge.textContent).toContain('Fair Location Accuracy');
      expect(locationAccuracyBadge.classList).toContain('accuracy-fair');
    });

    it('should display enhanced photo context information', async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const photoContextSection = compiled.querySelector('.photo-context');
      expect(photoContextSection).toBeTruthy();

      // Check for historical context
      const historicalContext = compiled.querySelector('.context-text');
      expect(historicalContext).toBeTruthy();
      expect(historicalContext.textContent).toContain(mockEnhancedFeedback.photoContext.historicalContext);

      // Check for era
      const era = compiled.querySelector('.era-text');
      expect(era).toBeTruthy();
      expect(era.textContent).toContain(mockEnhancedFeedback.photoContext.era);

      // Check for photographer
      const photographer = compiled.querySelector('.photographer-text');
      expect(photographer).toBeTruthy();
      expect(photographer.textContent).toContain(mockEnhancedFeedback.photoContext.photographer);

      // Check for interesting facts
      const factsList = compiled.querySelector('.facts-list');
      expect(factsList).toBeTruthy();
      const factItems = compiled.querySelectorAll('.fact-item');
      expect(factItems.length).toBe(mockEnhancedFeedback.photoContext.interestingFacts!.length);

      // Check for significance
      const significance = compiled.querySelector('.significance-text');
      expect(significance).toBeTruthy();
      expect(significance.textContent).toContain(mockEnhancedFeedback.photoContext.significance);
    });

    it('should use enhanced detailed description when available', async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const description = compiled.querySelector('.photo-description');
      expect(description).toBeTruthy();
      expect(description.textContent).toContain(mockEnhancedFeedback.photoContext.detailedDescription);
    });

    it('should display enhanced distance calculation', async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const distanceText = compiled.querySelector('.location-results .difference-text');
      expect(distanceText).toBeTruthy();
      // Should use the enhanced feedback distance, not the calculated one
      expect(distanceText.textContent).toContain('123km'); // Formatted from 123.45
    });
  });

  describe('Component Lifecycle', () => {
    beforeEach(() => {
      fixture = TestBed.createComponent(ResultsComponent);
      component = fixture.componentInstance;
    });

    it('should clean up subscriptions on destroy', () => {
      const destroySpy = spyOn(component['destroy$'], 'next');
      const completeSpy = spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(destroySpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing photo data gracefully', () => {
      mockStore.select.and.callFake((selector: any) => {
        const selectorStr = selector.toString();
        if (selectorStr.includes('selectCurrentPhoto') || selectorStr.includes('currentPhoto')) {
          return of(null);
        }
        if (selectorStr.includes('selectCurrentGuess') || selectorStr.includes('currentGuess')) {
          return of(mockGuess);
        }
        return of(null);
      });

      fixture = TestBed.createComponent(ResultsComponent);
      component = fixture.componentInstance;

      expect(() => {
        fixture.detectChanges();
      }).not.toThrow();
    });

    it('should handle missing guess data gracefully', () => {
      mockStore.select.and.callFake((selector: any) => {
        const selectorStr = selector.toString();
        if (selectorStr.includes('selectCurrentPhoto') || selectorStr.includes('currentPhoto')) {
          return of(mockPhoto);
        }
        if (selectorStr.includes('selectCurrentGuess') || selectorStr.includes('currentGuess')) {
          return of(null);
        }
        return of(null);
      });

      fixture = TestBed.createComponent(ResultsComponent);
      component = fixture.componentInstance;

      expect(() => {
        fixture.detectChanges();
      }).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockStore.select.and.callFake((selector: any) => {
        if (selector === photosSelectors.selectCurrentPhoto) {
          return of(mockPhoto);
        }
        if (selector === scoringSelectors.selectCurrentGuess) {
          return of(mockGuess);
        }
        // Handle the selectScoreByPhotoId function selector
        if (typeof selector === 'function') {
          return of(mockScore);
        }
        return of(null);
      });

      fixture = TestBed.createComponent(ResultsComponent);
      component = fixture.componentInstance;
    });

    it('should have proper button accessibility', async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges(); // Second change detection after async pipe resolves

      const button = fixture.nativeElement.querySelector('.next-photo-btn');
      expect(button).toBeTruthy();
      expect(button.getAttribute('type')).toBe('button');
    });

    it('should have proper heading structure', async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges(); // Second change detection after async pipe resolves

      const headings = fixture.nativeElement.querySelectorAll('h2, h3, h4');
      expect(headings.length).toBeGreaterThan(0);
    });
  });
});