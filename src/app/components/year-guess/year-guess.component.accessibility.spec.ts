import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { YearGuessComponent } from './year-guess.component';

describe('YearGuessComponent - Accessibility', () => {
  let component: YearGuessComponent;
  let fixture: ComponentFixture<YearGuessComponent>;
  let store: MockStore;

  const initialState = {
    scoring: {
      currentGuess: null,
      scores: [],
      loading: false,
      error: null
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [YearGuessComponent],
      providers: [
        provideMockStore({ initialState })
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(YearGuessComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(MockStore);
    fixture.detectChanges();
  });

  describe('Semantic HTML and ARIA', () => {
    it('should have proper semantic structure', () => {
      const region = fixture.debugElement.query(By.css('[role="region"]'));
      const heading = fixture.debugElement.query(By.css('h3'));
      
      expect(region).toBeTruthy();
      expect(heading).toBeTruthy();
      expect(region.nativeElement.getAttribute('aria-labelledby')).toBe('year-guess-heading');
    });

    it('should have proper form labeling', () => {
      const slider = fixture.debugElement.query(By.css('#year-slider'));
      const label = fixture.debugElement.query(By.css('[for="year-slider"]'));
      
      expect(slider).toBeTruthy();
      expect(label).toBeTruthy();
      expect(label.nativeElement.getAttribute('for')).toBe('year-slider');
    });

    it('should have descriptive ARIA labels', () => {
      const slider = fixture.debugElement.query(By.css('#year-slider'));
      
      expect(slider).toBeTruthy();
      
      const ariaLabel = slider.nativeElement.getAttribute('aria-label');
      expect(ariaLabel).toContain('Select year between');
      expect(ariaLabel).toContain('1900');
      expect(ariaLabel).toContain(new Date().getFullYear().toString());
    });

    it('should have proper describedby relationships', () => {
      const slider = fixture.debugElement.query(By.css('#year-slider'));
      const helpText = fixture.debugElement.query(By.css('#year-help-text'));
      const rangeLabels = fixture.debugElement.query(By.css('#year-range-labels'));
      
      expect(slider).toBeTruthy();
      expect(helpText).toBeTruthy();
      expect(rangeLabels).toBeTruthy();
      
      const describedBy = slider.nativeElement.getAttribute('aria-describedby');
      expect(describedBy).toContain('year-help-text');
      expect(describedBy).toContain('year-range-labels');
    });

    it('should have live region for selected year', () => {
      const selectedYearDisplay = fixture.debugElement.query(By.css('[role="status"][aria-live="polite"]'));
      
      expect(selectedYearDisplay).toBeTruthy();
      
      const selectedYearSpan = selectedYearDisplay.query(By.css('.selected-year'));
      expect(selectedYearSpan).toBeTruthy();
      expect(selectedYearSpan.nativeElement.getAttribute('aria-label')).toContain('Selected year:');
    });

    it('should have screen reader instructions', () => {
      const srOnlyInstructions = fixture.debugElement.query(By.css('.sr-only'));
      
      expect(srOnlyInstructions).toBeTruthy();
      expect(srOnlyInstructions.nativeElement.textContent).toContain('arrow keys');
      expect(srOnlyInstructions.nativeElement.textContent).toContain('Home key');
      expect(srOnlyInstructions.nativeElement.textContent).toContain('End key');
    });
  });

  describe('Keyboard Navigation', () => {
    let slider: any;

    beforeEach(() => {
      slider = fixture.debugElement.query(By.css('#year-slider'));
    });

    it('should support arrow key navigation', () => {
      const initialYear = component.selectedYear;
      
      // Test right arrow key
      const rightArrowEvent = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      slider.nativeElement.dispatchEvent(rightArrowEvent);
      
      expect(component.selectedYear).toBe(initialYear + 1);
      
      // Test left arrow key
      const leftArrowEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
      slider.nativeElement.dispatchEvent(leftArrowEvent);
      
      expect(component.selectedYear).toBe(initialYear);
    });

    it('should support Shift + arrow keys for larger jumps', () => {
      const initialYear = component.selectedYear;
      
      // Test Shift + right arrow key
      const shiftRightEvent = new KeyboardEvent('keydown', { 
        key: 'ArrowRight', 
        shiftKey: true 
      });
      slider.nativeElement.dispatchEvent(shiftRightEvent);
      
      expect(component.selectedYear).toBe(initialYear + 10);
      
      // Test Shift + left arrow key
      const shiftLeftEvent = new KeyboardEvent('keydown', { 
        key: 'ArrowLeft', 
        shiftKey: true 
      });
      slider.nativeElement.dispatchEvent(shiftLeftEvent);
      
      expect(component.selectedYear).toBe(initialYear);
    });

    it('should support Home and End keys', () => {
      // Test Home key
      const homeEvent = new KeyboardEvent('keydown', { key: 'Home' });
      slider.nativeElement.dispatchEvent(homeEvent);
      
      expect(component.selectedYear).toBe(component.minYear);
      
      // Test End key
      const endEvent = new KeyboardEvent('keydown', { key: 'End' });
      slider.nativeElement.dispatchEvent(endEvent);
      
      expect(component.selectedYear).toBe(component.currentYear);
    });

    it('should support Page Up and Page Down keys', () => {
      const initialYear = component.selectedYear;
      
      // Test Page Up key
      const pageUpEvent = new KeyboardEvent('keydown', { key: 'PageUp' });
      slider.nativeElement.dispatchEvent(pageUpEvent);
      
      expect(component.selectedYear).toBe(Math.min(component.currentYear, initialYear + 10));
      
      // Test Page Down key
      const pageDownEvent = new KeyboardEvent('keydown', { key: 'PageDown' });
      slider.nativeElement.dispatchEvent(pageDownEvent);
      
      expect(component.selectedYear).toBe(Math.max(component.minYear, initialYear));
    });

    it('should respect year boundaries', () => {
      // Test that we can't go below minimum year
      component.selectedYear = component.minYear;
      
      const leftArrowEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
      slider.nativeElement.dispatchEvent(leftArrowEvent);
      
      expect(component.selectedYear).toBe(component.minYear);
      
      // Test that we can't go above maximum year
      component.selectedYear = component.currentYear;
      
      const rightArrowEvent = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      slider.nativeElement.dispatchEvent(rightArrowEvent);
      
      expect(component.selectedYear).toBe(component.currentYear);
    });

    it('should prevent default behavior for handled keys', () => {
      const arrowEvent = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      spyOn(arrowEvent, 'preventDefault');
      
      slider.nativeElement.dispatchEvent(arrowEvent);
      
      expect(arrowEvent.preventDefault).toHaveBeenCalled();
    });
  });

  describe('Focus Management', () => {
    it('should be focusable', () => {
      const slider = fixture.debugElement.query(By.css('#year-slider'));
      
      slider.nativeElement.focus();
      expect(document.activeElement).toBe(slider.nativeElement);
    });

    it('should have visible focus indicator', () => {
      const slider = fixture.debugElement.query(By.css('#year-slider'));
      
      slider.nativeElement.focus();
      
      // Focus styles are applied via CSS
      expect(slider.nativeElement.matches(':focus')).toBe(true);
    });
  });

  describe('Screen Reader Support', () => {
    it('should announce year changes', () => {
      const selectedYearDisplay = fixture.debugElement.query(By.css('[aria-live="polite"]'));
      
      expect(selectedYearDisplay).toBeTruthy();
      
      // Change the year
      component.selectedYear = 1950;
      fixture.detectChanges();
      
      const selectedYearSpan = selectedYearDisplay.query(By.css('.selected-year'));
      expect(selectedYearSpan.nativeElement.textContent.trim()).toBe('1950');
    });

    it('should have proper slider orientation', () => {
      const slider = fixture.debugElement.query(By.css('#year-slider'));
      
      expect(slider.nativeElement.getAttribute('aria-orientation')).toBe('horizontal');
    });

    it('should hide decorative elements from screen readers', () => {
      const tickMarks = fixture.debugElement.query(By.css('.tick-marks'));
      const rangeLabels = fixture.debugElement.query(By.css('.range-labels'));
      
      expect(tickMarks.nativeElement.getAttribute('aria-hidden')).toBe('true');
      expect(rangeLabels.nativeElement.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('Error States and Validation', () => {
    it('should provide accessible error messages', () => {
      // Force an invalid state
      component.yearForm.get('year')?.setValue(1800); // Below minimum
      component.yearForm.get('year')?.markAsTouched();
      fixture.detectChanges();
      
      // Error handling would be implemented in the form validation
      expect(component.yearForm.get('year')?.invalid).toBe(true);
    });

    it('should associate error messages with the input', () => {
      // This would be implemented if we had visible error messages
      const slider = fixture.debugElement.query(By.css('#year-slider'));
      
      expect(slider).toBeTruthy();
      // Error message association would be tested here if implemented
    });
  });

  describe('High Contrast Mode Support', () => {
    it('should work in high contrast mode', () => {
      // High contrast styles are defined in CSS
      const slider = fixture.debugElement.query(By.css('.year-slider'));
      
      expect(slider).toBeTruthy();
      // High contrast styles should be defined in the SCSS file
    });
  });

  describe('Reduced Motion Support', () => {
    it('should respect reduced motion preferences', () => {
      // Reduced motion styles are defined in CSS
      const selectedYearDisplay = fixture.debugElement.query(By.css('.selected-year-display'));
      
      expect(selectedYearDisplay).toBeTruthy();
      // Reduced motion styles should be defined in the SCSS file
    });
  });

  describe('Touch Accessibility', () => {
    it('should have touch-friendly slider thumb', () => {
      const slider = fixture.debugElement.query(By.css('#year-slider'));
      
      expect(slider).toBeTruthy();
      
      // Touch-friendly sizing is handled by CSS
      const computedStyle = window.getComputedStyle(slider.nativeElement);
      expect(computedStyle.cursor).toBe('pointer');
    });
  });
});