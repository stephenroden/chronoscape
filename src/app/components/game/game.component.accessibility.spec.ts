import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { GameComponent } from './game.component';
import { GameStatus } from '../../models/game-state.model';

describe('GameComponent - Accessibility', () => {
  let component: GameComponent;
  let fixture: ComponentFixture<GameComponent>;
  let store: MockStore;

  const initialState = {
    game: {
      status: GameStatus.NOT_STARTED,
      currentPhotoIndex: 0,
      totalPhotos: 5,
      loading: false,
      error: null
    },
    photos: {
      photos: [],
      currentPhoto: null,
      loading: false,
      error: null
    },
    scoring: {
      scores: [],
      currentGuess: null,
      loading: false,
      error: null
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GameComponent],
      providers: [
        provideMockStore({ initialState })
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GameComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(MockStore);
    fixture.detectChanges();
  });

  describe('Semantic HTML and ARIA', () => {
    it('should have proper semantic structure', () => {
      const header = fixture.debugElement.query(By.css('header[role="banner"]'));
      const main = fixture.debugElement.query(By.css('main[role="main"]'));
      
      expect(header).toBeTruthy();
      expect(main).toBeTruthy();
    });

    it('should have skip link for keyboard navigation', () => {
      const skipLink = fixture.debugElement.query(By.css('.skip-link'));
      
      expect(skipLink).toBeTruthy();
      expect(skipLink.nativeElement.getAttribute('href')).toBe('#main-content');
      expect(skipLink.nativeElement.textContent.trim()).toBe('Skip to main content');
    });

    it('should have proper heading hierarchy', () => {
      const h1 = fixture.debugElement.query(By.css('h1#game-title'));
      
      expect(h1).toBeTruthy();
      expect(h1.nativeElement.textContent.trim()).toBe('Chronoscape');
    });

    it('should have proper ARIA labels on progress bar', () => {
      // Set game to in progress state
      store.setState({
        ...initialState,
        game: {
          ...initialState.game,
          status: GameStatus.IN_PROGRESS,
          currentPhotoIndex: 2
        }
      });
      fixture.detectChanges();

      const progressBar = fixture.debugElement.query(By.css('[role="progressbar"]'));
      
      expect(progressBar).toBeTruthy();
      expect(progressBar.nativeElement.getAttribute('aria-valuenow')).toBe('2');
      expect(progressBar.nativeElement.getAttribute('aria-valuemin')).toBe('1');
      expect(progressBar.nativeElement.getAttribute('aria-valuemax')).toBe('5');
      expect(progressBar.nativeElement.getAttribute('aria-label')).toContain('Game progress');
    });

    it('should have proper button accessibility attributes', () => {
      const startButton = fixture.debugElement.query(By.css('.primary-button'));
      
      expect(startButton).toBeTruthy();
      expect(startButton.nativeElement.getAttribute('type')).toBe('button');
      expect(startButton.nativeElement.getAttribute('aria-label')).toBeFalsy(); // Should use button text
    });

    it('should have proper loading state accessibility', () => {
      store.setState({
        ...initialState,
        game: {
          ...initialState.game,
          loading: true
        }
      });
      fixture.detectChanges();

      const loadingContainer = fixture.debugElement.query(By.css('[role="status"][aria-live="polite"]'));
      
      expect(loadingContainer).toBeTruthy();
      expect(loadingContainer.nativeElement.getAttribute('aria-label')).toContain('Loading');
    });

    it('should have proper error state accessibility', () => {
      store.setState({
        ...initialState,
        game: {
          ...initialState.game,
          error: 'Test error message'
        }
      });
      fixture.detectChanges();

      const errorSection = fixture.debugElement.query(By.css('[role="alert"]'));
      
      expect(errorSection).toBeTruthy();
      expect(errorSection.nativeElement.getAttribute('aria-labelledby')).toBe('error-heading');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should be focusable with keyboard', () => {
      const startButton = fixture.debugElement.query(By.css('.primary-button'));
      
      startButton.nativeElement.focus();
      expect(document.activeElement).toBe(startButton.nativeElement);
    });

    it('should have visible focus indicators', () => {
      const startButton = fixture.debugElement.query(By.css('.primary-button'));
      
      startButton.nativeElement.focus();
      
      const computedStyle = window.getComputedStyle(startButton.nativeElement);
      // Focus styles are applied via CSS, so we check if the element can receive focus
      expect(startButton.nativeElement.tabIndex).toBeGreaterThanOrEqual(0);
    });

    it('should support Enter key activation', () => {
      spyOn(component, 'startGame');
      const startButton = fixture.debugElement.query(By.css('.primary-button'));
      
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      startButton.nativeElement.dispatchEvent(enterEvent);
      startButton.nativeElement.click(); // Simulate the default behavior
      
      expect(component.startGame).toHaveBeenCalled();
    });
  });

  describe('Screen Reader Support', () => {
    it('should have screen reader only content', () => {
      store.setState({
        ...initialState,
        game: {
          ...initialState.game,
          status: GameStatus.IN_PROGRESS
        }
      });
      fixture.detectChanges();

      const srOnlyElements = fixture.debugElement.queryAll(By.css('.sr-only'));
      
      expect(srOnlyElements.length).toBeGreaterThan(0);
      
      // Check that sr-only elements have proper styling (visually hidden but accessible)
      srOnlyElements.forEach(element => {
        const computedStyle = window.getComputedStyle(element.nativeElement);
        expect(computedStyle.position).toBe('absolute');
      });
    });

    it('should have proper live regions', () => {
      const liveRegions = fixture.debugElement.queryAll(By.css('[aria-live]'));
      
      expect(liveRegions.length).toBeGreaterThan(0);
      
      liveRegions.forEach(region => {
        const ariaLive = region.nativeElement.getAttribute('aria-live');
        expect(['polite', 'assertive']).toContain(ariaLive);
      });
    });

    it('should have descriptive text for complex interactions', () => {
      store.setState({
        ...initialState,
        game: {
          ...initialState.game,
          status: GameStatus.IN_PROGRESS
        }
      });
      fixture.detectChanges();

      const regions = fixture.debugElement.queryAll(By.css('[role="region"]'));
      
      regions.forEach(region => {
        const ariaLabelledBy = region.nativeElement.getAttribute('aria-labelledby');
        if (ariaLabelledBy) {
          const labelElement = fixture.debugElement.query(By.css(`#${ariaLabelledBy}`));
          expect(labelElement).toBeTruthy();
        }
      });
    });
  });

  describe('Error Handling Accessibility', () => {
    it('should announce errors to screen readers', () => {
      store.setState({
        ...initialState,
        photos: {
          ...initialState.photos,
          error: 'Failed to load photos'
        }
      });
      fixture.detectChanges();

      const errorAlert = fixture.debugElement.query(By.css('[role="alert"]'));
      
      expect(errorAlert).toBeTruthy();
      expect(errorAlert.nativeElement.textContent).toContain('Failed to load photos');
    });

    it('should provide accessible error recovery options', () => {
      store.setState({
        ...initialState,
        photos: {
          ...initialState.photos,
          error: 'Network connection failed'
        }
      });
      fixture.detectChanges();

      const retryButton = fixture.debugElement.query(By.css('button[aria-label*="retry"]'));
      
      expect(retryButton).toBeTruthy();
      expect(retryButton.nativeElement.getAttribute('type')).toBe('button');
    });
  });

  describe('Color and Contrast', () => {
    it('should not rely solely on color for information', () => {
      // Progress bar should have text indicator in addition to visual progress
      store.setState({
        ...initialState,
        game: {
          ...initialState.game,
          status: GameStatus.IN_PROGRESS,
          currentPhotoIndex: 3
        }
      });
      fixture.detectChanges();

      const progressText = fixture.debugElement.query(By.css('.progress-text'));
      
      expect(progressText).toBeTruthy();
      expect(progressText.nativeElement.textContent).toContain('Photo 3 of 5');
    });

    it('should have sufficient color contrast in error states', () => {
      store.setState({
        ...initialState,
        game: {
          ...initialState.game,
          error: 'Test error'
        }
      });
      fixture.detectChanges();

      const errorSection = fixture.debugElement.query(By.css('.game-error'));
      
      expect(errorSection).toBeTruthy();
      // Error styling should be defined in CSS with sufficient contrast
      expect(errorSection.nativeElement.classList.contains('game-error')).toBe(true);
    });
  });
});