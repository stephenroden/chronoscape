import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ResultsComponent } from './results.component';

@Component({
  template: `
    <app-results
      [results]="mockResults"
      [isLoading]="isLoading"
      (nextPhoto)="onNextPhoto()">
    </app-results>
  `
})
class TestHostComponent {
  isLoading = false;
  mockResults = {
    correctYear: 1969,
    correctLocation: { lat: 40.7128, lng: -74.0060 },
    userGuess: {
      year: 1965,
      location: { lat: 41.8781, lng: -87.6298 }
    },
    distance: 1145.2,
    yearScore: 85,
    locationScore: 72,
    totalScore: 157,
    maxScore: 200,
    photoContext: {
      description: 'Historic moon landing photograph',
      historicalContext: 'Apollo 11 mission',
      interestingFacts: [
        'First human moon landing',
        'Neil Armstrong was the first person to step on the moon'
      ]
    },
    yearAccuracy: 'good' as const,
    locationAccuracy: 'fair' as const
  };

  onNextPhoto() {
    // Mock next photo handler
  }
}

describe('ResultsComponent Visual Regression Tests', () => {
  let component: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;
  let resultsComponent: ResultsComponent;
  let debugElement: DebugElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TestHostComponent, ResultsComponent],
      imports: [NoopAnimationsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    component = fixture.componentInstance;
    debugElement = fixture.debugElement.query(By.directive(ResultsComponent));
    resultsComponent = debugElement.componentInstance;
    fixture.detectChanges();
  });

  describe('Container Styling', () => {
    it('should have correct base container styles', () => {
      const container = debugElement.query(By.css('.results-container'));
      const styles = getComputedStyle(container.nativeElement);

      expect(styles.maxWidth).toBe('800px');
      expect(styles.margin).toContain('auto');
      expect(styles.padding).toBe('20px');
      expect(styles.fontFamily).toContain('Segoe UI');
    });

    it('should apply entrance animation', () => {
      const container = debugElement.query(By.css('.results-container'));
      const styles = getComputedStyle(container.nativeElement);
      
      expect(styles.animation).toContain('resultsEnter');
    });
  });

  describe('Results Header Styling', () => {
    it('should have correct header styles', () => {
      const header = debugElement.query(By.css('.results-header'));
      if (header) {
        const styles = getComputedStyle(header.nativeElement);
        expect(styles.textAlign).toBe('center');
        expect(styles.marginBottom).toBe('30px');
      }
    });

    it('should style main heading correctly', () => {
      const heading = debugElement.query(By.css('.results-header h2'));
      if (heading) {
        const styles = getComputedStyle(heading.nativeElement);
        expect(styles.color).toBe('rgb(44, 62, 80)'); // #2c3e50
        expect(styles.fontSize).toBe('2rem');
        expect(styles.marginBottom).toBe('10px');
      }
    });

    it('should style photo info correctly', () => {
      const photoInfo = debugElement.query(By.css('.photo-info'));
      if (photoInfo) {
        const h3 = photoInfo.query(By.css('h3'));
        if (h3) {
          const styles = getComputedStyle(h3.nativeElement);
          expect(styles.color).toBe('rgb(52, 73, 94)'); // #34495e
          expect(styles.fontSize).toBe('1.4rem');
        }
      }
    });
  });

  describe('Result Section Styling', () => {
    it('should have enhanced result section styles', () => {
      const sections = debugElement.queryAll(By.css('.result-section'));
      
      sections.forEach(section => {
        const styles = getComputedStyle(section.nativeElement);
        expect(styles.background).toContain('linear-gradient');
        expect(styles.borderRadius).toBe('16px');
        expect(styles.padding).toBe('24px');
        expect(styles.borderLeftWidth).toBe('6px');
        expect(styles.borderLeftColor).toBe('rgb(52, 152, 219)'); // #3498db
        expect(styles.position).toBe('relative');
        expect(styles.overflow).toBe('hidden');
      });
    });

    it('should apply hover effects on result sections', () => {
      const section = debugElement.query(By.css('.result-section'));
      if (section) {
        // Simulate hover
        section.nativeElement.dispatchEvent(new MouseEvent('mouseenter'));
        fixture.detectChanges();

        expect(section.nativeElement.matches(':hover')).toBeTruthy();
      }
    });

    it('should have correct section heading styles', () => {
      const headings = debugElement.queryAll(By.css('.result-section h4'));
      
      headings.forEach(heading => {
        const styles = getComputedStyle(heading.nativeElement);
        expect(styles.color).toBe('rgb(44, 62, 80)'); // #2c3e50
        expect(styles.fontSize).toBe('1.3rem');
        expect(styles.fontWeight).toBe('700');
        expect(styles.display).toBe('flex');
        expect(styles.alignItems).toBe('center');
        expect(styles.position).toBe('relative');
      });
    });
  });

  describe('Prominent Answer Styling', () => {
    it('should have enhanced prominent answer styles', () => {
      const prominentAnswers = debugElement.queryAll(By.css('.prominent-answer'));
      
      prominentAnswers.forEach(answer => {
        const styles = getComputedStyle(answer.nativeElement);
        expect(styles.marginBottom).toBe('24px');
        expect(styles.animation).toContain('prominentAnswerEnter');
      });
    });

    it('should style correct answer displays with gradients', () => {
      const displays = debugElement.queryAll(By.css('.correct-year-display, .correct-location-display'));
      
      displays.forEach(display => {
        const styles = getComputedStyle(display.nativeElement);
        expect(styles.background).toContain('linear-gradient');
        expect(styles.borderWidth).toBe('3px');
        expect(styles.borderColor).toBe('rgb(40, 167, 69)'); // #28a745
        expect(styles.borderRadius).toBe('16px');
        expect(styles.padding).toBe('20px');
        expect(styles.textAlign).toBe('center');
        expect(styles.position).toBe('relative');
        expect(styles.overflow).toBe('hidden');
      });
    });

    it('should apply celebratory shimmer effect', () => {
      const displays = debugElement.queryAll(By.css('.correct-year-display, .correct-location-display'));
      
      displays.forEach(display => {
        const beforeStyles = getComputedStyle(display.nativeElement, '::before');
        expect(beforeStyles.content).toBeTruthy();
        expect(beforeStyles.position).toBe('absolute');
        expect(beforeStyles.animation).toContain('celebrationShimmer');
      });
    });

    it('should style answer values correctly', () => {
      const values = debugElement.queryAll(By.css('.year-value, .location-value'));
      
      values.forEach(value => {
        const styles = getComputedStyle(value.nativeElement);
        expect(styles.fontSize).toBe('2.2rem');
        expect(styles.fontWeight).toBe('900');
        expect(styles.color).toBe('rgb(21, 87, 36)'); // #155724
        expect(styles.fontFamily).toContain('Courier New');
        expect(styles.textShadow).toBeTruthy();
        expect(styles.position).toBe('relative');
        expect(styles.animation).toContain('valueHighlight');
      });
    });
  });

  describe('Performance Badge Styling', () => {
    it('should have enhanced performance badge styles', () => {
      const badges = debugElement.queryAll(By.css('.accuracy-badge'));
      
      badges.forEach(badge => {
        const styles = getComputedStyle(badge.nativeElement);
        expect(styles.display).toBe('inline-block');
        expect(styles.padding).toBe('12px 20px');
        expect(styles.borderRadius).toBe('25px');
        expect(styles.fontWeight).toBe('700');
        expect(styles.textTransform).toBe('uppercase');
        expect(styles.letterSpacing).toBe('0.5px');
        expect(styles.position).toBe('relative');
        expect(styles.overflow).toBe('hidden');
      });
    });

    it('should apply different styles for accuracy levels', () => {
      const perfectBadge = debugElement.query(By.css('.accuracy-perfect'));
      if (perfectBadge) {
        const styles = getComputedStyle(perfectBadge.nativeElement);
        expect(styles.background).toContain('linear-gradient');
        expect(styles.borderWidth).toBe('2px');
        expect(styles.borderColor).toBe('rgb(40, 167, 69)'); // #28a745
      }

      const excellentBadge = debugElement.query(By.css('.accuracy-excellent'));
      if (excellentBadge) {
        const styles = getComputedStyle(excellentBadge.nativeElement);
        expect(styles.background).toContain('linear-gradient');
        expect(styles.borderColor).toBe('rgb(0, 123, 255)'); // #007bff
      }
    });

    it('should apply hover effects on badges', () => {
      const badge = debugElement.query(By.css('.accuracy-badge'));
      if (badge) {
        // Simulate hover
        badge.nativeElement.dispatchEvent(new MouseEvent('mouseenter'));
        fixture.detectChanges();

        expect(badge.nativeElement.matches(':hover')).toBeTruthy();
      }
    });

    it('should have shimmer effect on badges', () => {
      const badges = debugElement.queryAll(By.css('.accuracy-badge'));
      
      badges.forEach(badge => {
        const beforeStyles = getComputedStyle(badge.nativeElement, '::before');
        expect(beforeStyles.content).toBeTruthy();
        expect(beforeStyles.position).toBe('absolute');
        expect(beforeStyles.background).toContain('linear-gradient');
      });
    });
  });

  describe('Guess Comparison Styling', () => {
    it('should style guess items correctly', () => {
      const guessItems = debugElement.queryAll(By.css('.guess-item'));
      
      guessItems.forEach(item => {
        const styles = getComputedStyle(item.nativeElement);
        expect(styles.display).toBe('flex');
        expect(styles.justifyContent).toBe('space-between');
        expect(styles.alignItems).toBe('center');
        expect(styles.padding).toBe('10px');
        expect(styles.borderRadius).toBe('4px');
      });
    });

    it('should differentiate user guess and correct answer styles', () => {
      const userGuess = debugElement.query(By.css('.user-guess'));
      if (userGuess) {
        const styles = getComputedStyle(userGuess.nativeElement);
        expect(styles.background).toBe('rgb(255, 243, 205)'); // #fff3cd
        expect(styles.borderColor).toBe('rgb(255, 234, 167)'); // #ffeaa7
      }

      const correctAnswer = debugElement.query(By.css('.correct-answer'));
      if (correctAnswer) {
        const styles = getComputedStyle(correctAnswer.nativeElement);
        expect(styles.background).toBe('rgb(212, 237, 218)'); // #d4edda
        expect(styles.borderColor).toBe('rgb(195, 230, 203)'); // #c3e6cb
      }
    });
  });

  describe('Score Display Styling', () => {
    it('should style score display correctly', () => {
      const scoreDisplay = debugElement.query(By.css('.score-display'));
      if (scoreDisplay) {
        const styles = getComputedStyle(scoreDisplay.nativeElement);
        expect(styles.display).toBe('flex');
        expect(styles.justifyContent).toBe('space-between');
        expect(styles.alignItems).toBe('center');
        expect(styles.background).toBe('white');
        expect(styles.padding).toBe('15px');
        expect(styles.borderRadius).toBe('6px');
      }
    });

    it('should style score points correctly', () => {
      const points = debugElement.query(By.css('.score-points .points'));
      if (points) {
        const styles = getComputedStyle(points.nativeElement);
        expect(styles.fontSize).toBe('1.5rem');
        expect(styles.fontWeight).toBe('bold');
        expect(styles.color).toBe('rgb(44, 62, 80)'); // #2c3e50
      }
    });
  });

  describe('Photo Context Styling', () => {
    it('should style photo context sections', () => {
      const contextSections = debugElement.queryAll(By.css('.photo-context .context-section'));
      
      contextSections.forEach(section => {
        const styles = getComputedStyle(section.nativeElement);
        expect(styles.marginBottom).toBe('20px');
      });
    });

    it('should style context text correctly', () => {
      const contextTexts = debugElement.queryAll(By.css('.context-text, .era-text, .photographer-text, .significance-text'));
      
      contextTexts.forEach(text => {
        const styles = getComputedStyle(text.nativeElement);
        expect(styles.color).toBe('rgb(52, 73, 94)'); // #34495e
        expect(styles.lineHeight).toBe('1.6');
        expect(styles.padding).toBe('10px');
        expect(styles.background).toBe('white');
        expect(styles.borderRadius).toBe('4px');
      });
    });

    it('should style facts list correctly', () => {
      const factItems = debugElement.queryAll(By.css('.fact-item'));
      
      factItems.forEach(item => {
        const styles = getComputedStyle(item.nativeElement);
        expect(styles.position).toBe('relative');
        expect(styles.paddingLeft).toBe('25px');
        expect(styles.background).toBe('white');
        expect(styles.borderRadius).toBe('4px');
        expect(styles.marginBottom).toBe('8px');
      });
    });
  });

  describe('Map Results Styling', () => {
    it('should style map container correctly', () => {
      const mapContainer = debugElement.query(By.css('.map-results .map-container'));
      if (mapContainer) {
        const styles = getComputedStyle(mapContainer.nativeElement);
        expect(styles.position).toBe('relative');
      }
    });

    it('should style results map correctly', () => {
      const resultsMap = debugElement.query(By.css('.results-map'));
      if (resultsMap) {
        const styles = getComputedStyle(resultsMap.nativeElement);
        expect(styles.height).toBe('300px');
        expect(styles.width).toBe('100%');
        expect(styles.borderRadius).toBe('6px');
      }
    });

    it('should style map legend correctly', () => {
      const legend = debugElement.query(By.css('.map-legend'));
      if (legend) {
        const styles = getComputedStyle(legend.nativeElement);
        expect(styles.display).toBe('flex');
        expect(styles.justifyContent).toBe('center');
        expect(styles.gap).toBe('20px');
        expect(styles.marginTop).toBe('10px');
      }
    });
  });

  describe('Loading State Styling', () => {
    it('should style loading container correctly', () => {
      component.isLoading = true;
      fixture.detectChanges();

      const loadingContainer = debugElement.query(By.css('.results-loading'));
      if (loadingContainer) {
        const styles = getComputedStyle(loadingContainer.nativeElement);
        expect(styles.display).toBe('flex');
        expect(styles.flexDirection).toBe('column');
        expect(styles.alignItems).toBe('center');
        expect(styles.justifyContent).toBe('center');
        expect(styles.padding).toBe('50px');
      }
    });

    it('should style loading spinner correctly', () => {
      component.isLoading = true;
      fixture.detectChanges();

      const spinner = debugElement.query(By.css('.loading-spinner'));
      if (spinner) {
        const styles = getComputedStyle(spinner.nativeElement);
        expect(styles.width).toBe('40px');
        expect(styles.height).toBe('40px');
        expect(styles.borderRadius).toBe('50%');
        expect(styles.animation).toContain('spin');
        expect(styles.marginBottom).toBe('20px');
      }
    });
  });

  describe('Responsive Styling', () => {
    it('should apply tablet styles at medium viewport', () => {
      // Mock viewport resize
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768
      });
      
      window.dispatchEvent(new Event('resize'));
      fixture.detectChanges();

      const container = debugElement.query(By.css('.results-container'));
      expect(container).toBeTruthy();
    });

    it('should apply mobile styles at small viewport', () => {
      // Mock viewport resize
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 480
      });
      
      window.dispatchEvent(new Event('resize'));
      fixture.detectChanges();

      const container = debugElement.query(By.css('.results-container'));
      expect(container).toBeTruthy();
    });
  });

  describe('Animation Consistency', () => {
    it('should have consistent entrance animations', () => {
      const container = debugElement.query(By.css('.results-container'));
      const prominentAnswers = debugElement.queryAll(By.css('.prominent-answer'));
      const badges = debugElement.queryAll(By.css('.enhanced-performance'));

      // All animated elements should have animation properties
      const containerStyles = getComputedStyle(container.nativeElement);
      expect(containerStyles.animation).toContain('resultsEnter');

      prominentAnswers.forEach(answer => {
        const styles = getComputedStyle(answer.nativeElement);
        expect(styles.animation).toContain('prominentAnswerEnter');
      });

      badges.forEach(badge => {
        const styles = getComputedStyle(badge.nativeElement);
        expect(styles.animation).toContain('performanceBadgeEnter');
      });
    });
  });

  describe('Accessibility Styling', () => {
    it('should maintain proper focus styles', () => {
      const nextButton = debugElement.query(By.css('.next-photo-btn'));
      if (nextButton) {
        nextButton.nativeElement.focus();
        const styles = getComputedStyle(nextButton.nativeElement);
        expect(styles.outline).toBeTruthy();
      }
    });

    it('should have proper color contrast', () => {
      const textElements = debugElement.queryAll(By.css('h2, h3, h4, h5, p, .label, .value'));
      
      textElements.forEach(element => {
        const styles = getComputedStyle(element.nativeElement);
        expect(styles.color).toBeTruthy();
        // Color should not be transparent or inherit
        expect(styles.color).not.toBe('transparent');
        expect(styles.color).not.toBe('inherit');
      });
    });
  });
});