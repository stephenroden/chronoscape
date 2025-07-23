import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';

import { YearGuessComponent } from './year-guess.component';
import { setCurrentGuess } from '../../state/scoring/scoring.actions';
import { AppState } from '../../state/app.state';
import { Guess } from '../../models/scoring.model';

describe('YearGuessComponent', () => {
  let component: YearGuessComponent;
  let fixture: ComponentFixture<YearGuessComponent>;
  let mockStore: jasmine.SpyObj<Store<AppState>>;

  const mockGuess: Guess = {
    year: 1950,
    coordinates: { latitude: 40.7128, longitude: -74.0060 }
  };

  beforeEach(async () => {
    const storeSpy = jasmine.createSpyObj('Store', ['select', 'dispatch']);

    await TestBed.configureTestingModule({
      imports: [YearGuessComponent, ReactiveFormsModule],
      providers: [
        { provide: Store, useValue: storeSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(YearGuessComponent);
    component = fixture.componentInstance;
    mockStore = TestBed.inject(Store) as jasmine.SpyObj<Store<AppState>>;
    
    // Setup default store behavior
    mockStore.select.and.returnValue(of(null));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Initialization', () => {
    it('should initialize form with default year field', () => {
      fixture.detectChanges();
      
      expect(component.yearForm).toBeDefined();
      expect(component.yearForm.get('year')?.value).toBeGreaterThanOrEqual(1900);
      expect(component.yearForm.get('year')?.value).toBeLessThanOrEqual(component.currentYear);
    });

    it('should set current year and min year correctly', () => {
      const currentYear = new Date().getFullYear();
      
      fixture.detectChanges();
      
      expect(component.currentYear).toBe(currentYear);
      expect(component.minYear).toBe(1900);
    });

    it('should initialize selectedYear to middle of range', () => {
      const expectedYear = Math.floor((1900 + component.currentYear) / 2);
      
      fixture.detectChanges();
      
      expect(component.selectedYear).toBe(expectedYear);
    });

    it('should populate form when current guess exists', () => {
      mockStore.select.and.returnValue(of(mockGuess));
      
      fixture.detectChanges();
      
      expect(component.selectedYear).toBe(1950);
      expect(component.yearForm.get('year')?.value).toBe(1950);
    });
  });

  describe('Form Validation', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should validate minimum year (1900)', () => {
      const yearControl = component.yearForm.get('year');
      
      yearControl?.setValue(1899);
      yearControl?.markAsTouched();
      
      expect(yearControl?.hasError('min')).toBeTruthy();
    });

    it('should validate maximum year (current year)', () => {
      const yearControl = component.yearForm.get('year');
      const futureYear = new Date().getFullYear() + 1;
      
      yearControl?.setValue(futureYear);
      yearControl?.markAsTouched();
      
      expect(yearControl?.hasError('max')).toBeTruthy();
    });

    it('should accept valid year within range', () => {
      const yearControl = component.yearForm.get('year');
      
      yearControl?.setValue(1950);
      yearControl?.markAsTouched();
      
      expect(yearControl?.valid).toBeTruthy();
    });
  });

  describe('Slider Change Handling', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should dispatch setCurrentGuess action when slider value changes', () => {
      const mockEvent = {
        target: { value: '1950' }
      } as any;
      
      component.onSliderChange(mockEvent);
      
      expect(component.selectedYear).toBe(1950);
      expect(mockStore.dispatch).toHaveBeenCalledWith(
        setCurrentGuess({
          guess: {
            year: 1950,
            coordinates: { latitude: 0, longitude: 0 }
          }
        })
      );
    });

    it('should update selectedYear when slider changes', () => {
      const mockEvent = {
        target: { value: '1975' }
      } as any;
      
      component.onSliderChange(mockEvent);
      
      expect(component.selectedYear).toBe(1975);
      expect(component.yearForm.get('year')?.value).toBe(1975);
    });

    it('should dispatch setCurrentGuess action when valid year is set programmatically', () => {
      const yearControl = component.yearForm.get('year');
      yearControl?.setValue(1950);
      
      component.onYearChange();
      
      expect(mockStore.dispatch).toHaveBeenCalledWith(
        setCurrentGuess({
          guess: {
            year: 1950,
            coordinates: { latitude: 0, longitude: 0 }
          }
        })
      );
    });
  });

  describe('Form Submission', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should call onYearChange when form is valid and submitted', () => {
      spyOn(component, 'onYearChange');
      const yearControl = component.yearForm.get('year');
      yearControl?.setValue('1950');
      
      component.onSubmit();
      
      expect(component.onYearChange).toHaveBeenCalled();
    });

    it('should mark all fields as touched when form is invalid and submitted', () => {
      const yearControl = component.yearForm.get('year');
      yearControl?.setValue(''); // Invalid empty value
      
      component.onSubmit();
      
      expect(yearControl?.touched).toBeTruthy();
    });
  });

  describe('Getters and Helper Methods', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should return year control', () => {
      expect(component.yearControl).toBe(component.yearForm.get('year'));
    });

    it('should calculate year range correctly', () => {
      const expectedRange = component.currentYear - 1900;
      expect(component.yearRange).toBe(expectedRange);
    });

    it('should calculate year percentage correctly', () => {
      component.selectedYear = 1950;
      const expectedPercentage = ((1950 - 1900) / component.yearRange) * 100;
      expect(component.yearPercentage).toBe(expectedPercentage);
    });

    it('should generate decade marks', () => {
      const decadeMarks = component.getDecadeMarks();
      
      expect(decadeMarks.length).toBeGreaterThan(0);
      expect(decadeMarks[0]).toBeGreaterThanOrEqual(1900);
      expect(decadeMarks[decadeMarks.length - 1]).toBeLessThanOrEqual(component.currentYear);
      
      // Check that marks are in increments of 10
      for (let i = 1; i < decadeMarks.length; i++) {
        expect(decadeMarks[i] - decadeMarks[i - 1]).toBe(10);
      }
    });

    it('should calculate decade position correctly', () => {
      const position = component.getDecadePosition(1950);
      const expectedPosition = ((1950 - 1900) / component.yearRange) * 100;
      expect(position).toBe(expectedPosition);
    });
  });

  describe('Component Lifecycle', () => {
    it('should subscribe to current guess on init', () => {
      fixture.detectChanges(); // This triggers ngOnInit
      expect(mockStore.select).toHaveBeenCalled();
    });

    it('should unsubscribe on destroy', () => {
      spyOn(component['destroy$'], 'next');
      spyOn(component['destroy$'], 'complete');
      
      component.ngOnDestroy();
      
      expect(component['destroy$'].next).toHaveBeenCalled();
      expect(component['destroy$'].complete).toHaveBeenCalled();
    });
  });

  describe('Template Integration', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should render year slider', () => {
      const slider = fixture.nativeElement.querySelector('#year-slider');
      expect(slider).toBeTruthy();
      expect(slider.type).toBe('range');
      expect(slider.min).toBe('1900');
      expect(slider.max).toBe(component.currentYear.toString());
    });

    it('should display selected year', () => {
      component.selectedYear = 1950;
      fixture.detectChanges();
      
      const selectedYearDisplay = fixture.nativeElement.querySelector('.selected-year');
      expect(selectedYearDisplay).toBeTruthy();
      expect(selectedYearDisplay.textContent.trim()).toBe('1950');
    });

    it('should display range labels', () => {
      const minLabel = fixture.nativeElement.querySelector('.min-label');
      const maxLabel = fixture.nativeElement.querySelector('.max-label');
      
      expect(minLabel).toBeTruthy();
      expect(maxLabel).toBeTruthy();
      expect(minLabel.textContent.trim()).toBe('1900');
      expect(maxLabel.textContent.trim()).toBe(component.currentYear.toString());
    });

    it('should render tick marks for decades', () => {
      const tickMarks = fixture.nativeElement.querySelectorAll('.tick-mark');
      expect(tickMarks.length).toBeGreaterThan(0);
      
      const firstTickLabel = tickMarks[0].querySelector('.tick-label');
      expect(firstTickLabel).toBeTruthy();
      expect(parseInt(firstTickLabel.textContent)).toBeGreaterThanOrEqual(1900);
    });

    it('should display help text', () => {
      const helpText = fixture.nativeElement.querySelector('.help-text');
      expect(helpText).toBeTruthy();
      expect(helpText.textContent).toContain('Drag the slider to select a year between 1900 and');
    });

    it('should trigger onSliderChange when slider value changes', () => {
      spyOn(component, 'onSliderChange');
      const slider = fixture.nativeElement.querySelector('#year-slider');
      
      slider.value = '1950';
      slider.dispatchEvent(new Event('input'));
      
      expect(component.onSliderChange).toHaveBeenCalled();
    });

    it('should update slider value when selectedYear changes', () => {
      component.selectedYear = 1975;
      fixture.detectChanges();
      
      const slider = fixture.nativeElement.querySelector('#year-slider');
      expect(slider.value).toBe('1975');
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should have proper label association', () => {
      const label = fixture.nativeElement.querySelector('label[for="year-slider"]');
      const slider = fixture.nativeElement.querySelector('#year-slider');
      
      expect(label).toBeTruthy();
      expect(slider).toBeTruthy();
    });

    it('should have aria-label for slider', () => {
      const slider = fixture.nativeElement.querySelector('#year-slider[aria-label]');
      expect(slider).toBeTruthy();
      expect(slider.getAttribute('aria-label')).toContain('Select year between 1900 and');
    });

    it('should have proper slider attributes for accessibility', () => {
      const slider = fixture.nativeElement.querySelector('#year-slider');
      
      expect(slider.getAttribute('min')).toBe('1900');
      expect(slider.getAttribute('max')).toBe(component.currentYear.toString());
      expect(slider.getAttribute('step')).toBe('1');
    });
  });
});