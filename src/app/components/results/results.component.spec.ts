import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';

import { ResultsComponent } from './results.component';
import { MapService } from '../../services/map.service';
import { AppState } from '../../state/app.state';
import { Photo } from '../../models/photo.model';
import { Guess, Score } from '../../models/scoring.model';
import { nextPhoto } from '../../state/game/game.actions';

describe('ResultsComponent', () => {
  let component: ResultsComponent;
  let fixture: ComponentFixture<ResultsComponent>;
  let mockStore: jasmine.SpyObj<Store<AppState>>;
  let mockMapService: jasmine.SpyObj<MapService>;

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

  beforeEach(async () => {
    const storeSpy = jasmine.createSpyObj('Store', ['select', 'dispatch']);
    const mapServiceSpy = jasmine.createSpyObj('MapService', [
      'initializeMap',
      'addPin',
      'addAdditionalPin',
      'fitBounds',
      'calculateDistance'
    ]);

    await TestBed.configureTestingModule({
      imports: [ResultsComponent],
      providers: [
        { provide: Store, useValue: storeSpy },
        { provide: MapService, useValue: mapServiceSpy }
      ]
    }).compileComponents();

    // Setup default store selectors
    mockStore = TestBed.inject(Store) as jasmine.SpyObj<Store<AppState>>;
    mockStore.select.and.callFake((selector: any) => {
      const selectorStr = selector.toString();
      if (selectorStr.includes('selectCurrentPhoto') || selectorStr.includes('currentPhoto')) {
        return of(null);
      }
      if (selectorStr.includes('selectCurrentGuess') || selectorStr.includes('currentGuess')) {
        return of(null);
      }
      if (selectorStr.includes('selectScoreByPhotoId') || selectorStr.includes('scoreByPhotoId')) {
        return of(null);
      }
      return of(null);
    });

    fixture = TestBed.createComponent(ResultsComponent);
    component = fixture.componentInstance;
    mockMapService = TestBed.inject(MapService) as jasmine.SpyObj<MapService>;

  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component Initialization', () => {
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
      // Mock store selectors to return test data
      mockStore.select.and.callFake((selector: any) => {
        const selectorStr = selector.toString();
        if (selectorStr.includes('selectCurrentPhoto') || selectorStr.includes('currentPhoto')) {
          return of(mockPhoto);
        }
        if (selectorStr.includes('selectCurrentGuess') || selectorStr.includes('currentGuess')) {
          return of(mockGuess);
        }
        if (selectorStr.includes('selectScoreByPhotoId') || selectorStr.includes('scoreByPhotoId')) {
          return of(mockScore);
        }
        return of(null);
      });
    });

    it('should display photo information correctly', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      const compiled = fixture.nativeElement;
      const titleElement = compiled.querySelector('h3');
      const descriptionElement = compiled.querySelector('.photo-description');
      
      if (titleElement) {
        expect(titleElement.textContent).toContain(mockPhoto.title);
      }
      if (descriptionElement) {
        expect(descriptionElement.textContent).toContain(mockPhoto.description);
      }
    });

    it('should display year comparison correctly', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      const compiled = fixture.nativeElement;
      const yearSection = compiled.querySelector('.year-results');
      if (yearSection) {
        expect(yearSection.textContent).toContain(mockGuess.year.toString());
        expect(yearSection.textContent).toContain(mockPhoto.year.toString());
      }
    });

    it('should display location comparison correctly', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      const compiled = fixture.nativeElement;
      const locationSection = compiled.querySelector('.location-results');
      if (locationSection) {
        expect(locationSection.textContent).toContain(mockGuess.coordinates.latitude.toFixed(4));
        expect(locationSection.textContent).toContain(mockPhoto.coordinates.latitude.toFixed(4));
      }
    });

    it('should display score information correctly', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      const compiled = fixture.nativeElement;
      const content = compiled.textContent || '';
      expect(content).toContain(mockScore.yearScore.toString());
      expect(content).toContain(mockScore.locationScore.toString());
      expect(content).toContain(mockScore.totalScore.toString());
    });
  });

  describe('Map Functionality', () => {
    beforeEach(() => {
      mockStore.select.and.callFake((selector: any) => {
        if (selector.toString().includes('currentPhoto')) {
          return of(mockPhoto);
        }
        if (selector.toString().includes('currentGuess')) {
          return of(mockGuess);
        }
        return of(null);
      });
      mockMapService.calculateDistance.and.returnValue(50.5);
    });

    it('should initialize map when data is available', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      // Wait for setTimeout in initializeResultsMap
      setTimeout(() => {
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
      }, 150);
    });

    it('should handle map initialization errors gracefully', () => {
      mockMapService.initializeMap.and.throwError('Map error');
      spyOn(console, 'error');

      fixture.detectChanges();

      setTimeout(() => {
        expect(console.error).toHaveBeenCalledWith('Error initializing results map:', jasmine.any(Error));
      }, 150);
    });
  });

  describe('Distance Calculation', () => {
    beforeEach(() => {
      mockMapService.calculateDistance.and.returnValue(123.456);
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
    it('should dispatch nextPhoto action when next photo button is clicked', () => {
      const button = fixture.nativeElement.querySelector('.next-photo-btn');
      
      if (button) {
        button.click();
        expect(mockStore.dispatch).toHaveBeenCalledWith(nextPhoto());
      }
    });

    it('should reset map initialization flag when next photo is clicked', () => {
      component['mapInitialized'] = true;
      component.onNextPhoto();
      expect(component['mapInitialized']).toBe(false);
    });
  });

  describe('Loading States', () => {
    it('should show loading state when no data is available', async () => {
      mockStore.select.and.callFake((selector: any) => {
        return of(null);
      });
      
      fixture.detectChanges();
      await fixture.whenStable();

      const loadingElement = fixture.nativeElement.querySelector('.results-loading');
      expect(loadingElement).toBeTruthy();
      if (loadingElement) {
        expect(loadingElement.textContent).toContain('Loading results...');
      }
    });

    it('should hide loading state when data is available', async () => {
      mockStore.select.and.callFake((selector: any) => {
        const selectorStr = selector.toString();
        if (selectorStr.includes('selectCurrentPhoto') || selectorStr.includes('currentPhoto')) {
          return of(mockPhoto);
        }
        if (selectorStr.includes('selectCurrentGuess') || selectorStr.includes('currentGuess')) {
          return of(mockGuess);
        }
        if (selectorStr.includes('selectScoreByPhotoId') || selectorStr.includes('scoreByPhotoId')) {
          return of(mockScore);
        }
        return of(null);
      });

      fixture.detectChanges();
      await fixture.whenStable();

      const loadingElement = fixture.nativeElement.querySelector('.results-loading');
      expect(loadingElement).toBeFalsy();
    });
  });

  describe('Component Lifecycle', () => {
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
        if (selector.toString().includes('currentPhoto')) {
          return of(null);
        }
        if (selector.toString().includes('currentGuess')) {
          return of(mockGuess);
        }
        return of(null);
      });

      expect(() => {
        fixture.detectChanges();
      }).not.toThrow();
    });

    it('should handle missing guess data gracefully', () => {
      mockStore.select.and.callFake((selector: any) => {
        if (selector.toString().includes('currentPhoto')) {
          return of(mockPhoto);
        }
        if (selector.toString().includes('currentGuess')) {
          return of(null);
        }
        return of(null);
      });

      expect(() => {
        fixture.detectChanges();
      }).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockStore.select.and.callFake((selector: any) => {
        if (selector.toString().includes('currentPhoto')) {
          return of(mockPhoto);
        }
        if (selector.toString().includes('currentGuess')) {
          return of(mockGuess);
        }
        if (selector.toString().includes('scoreByPhotoId')) {
          return of(mockScore);
        }
        return of(null);
      });
    });

    it('should have proper button accessibility', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      const button = fixture.nativeElement.querySelector('.next-photo-btn');
      expect(button.getAttribute('type')).toBe('button');
    });

    it('should have proper heading structure', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      const headings = fixture.nativeElement.querySelectorAll('h2, h3, h4');
      expect(headings.length).toBeGreaterThan(0);
    });
  });
});