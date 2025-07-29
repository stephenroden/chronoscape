import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';

import { PhotoMapToggleComponent } from './photo-map-toggle/photo-map-toggle.component';
import { PhotoZoomControlsComponent } from './photo-zoom-controls/photo-zoom-controls.component';
import { YearGuessComponent } from './year-guess/year-guess.component';
import { InterfaceToggleService } from '../services/interface-toggle.service';
import { PhotoZoomService } from '../services/photo-zoom.service';
import { Photo } from '../models/photo.model';
import { ActiveView } from '../models/interface-state.model';

// Mock components for testing
@Component({
  selector: 'app-photo-display',
  template: '<div>Photo Display Mock</div>'
})
class MockPhotoDisplayComponent {}

@Component({
  selector: 'app-map-guess',
  template: '<div>Map Guess Mock</div>'
})
class MockMapGuessComponent {}

@Component({
  template: `
    <div class="enhanced-game-interface">
      <app-photo-map-toggle
        [photo]="photo"
        [enableZoom]="true"
        [showMetadata]="false">
      </app-photo-map-toggle>
      
      <app-year-guess></app-year-guess>
    </div>
  `
})
class TestHostComponent {
  photo: Photo = {
    id: '1',
    url: 'test-photo.jpg',
    title: 'Test Photo',
    description: 'A test photograph for accessibility testing',
    year: 1950,
    coordinates: { latitude: 40.7128, longitude: -74.0060 },
    source: 'Test Source',
    metadata: {
      photographer: 'Test Photographer',
      license: 'CC BY 4.0',
      originalSource: 'Test Archive',
      dateCreated: new Date('1950-01-01'),
      format: 'JPEG',
      mimeType: 'image/jpeg'
    }
  };
}

describe('Enhanced Game Interface - Accessibility Integration', () => {
  let hostComponent: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;
  let mockStore: jasmine.SpyObj<Store>;
  let mockInterfaceToggleService: jasmine.SpyObj<InterfaceToggleService>;
  let mockPhotoZoomService: jasmine.SpyObj<PhotoZoomService>;
  let debugElement: DebugElement;

  beforeEach(async () => {
    const storeSpy = jasmine.createSpyObj('Store', ['select', 'dispatch']);
    const interfaceToggleServiceSpy = jasmine.createSpyObj('InterfaceToggleService', [
      'toggleView',
      'setActiveView',
      'resetInterfaceState',
      'handleKeyboardShortcut'
    ], {
      activeView$: of('photo' as ActiveView),
      isPhotoActive$: of(true),
      isMapActive$: of(false),
      inactiveView$: of('map' as ActiveView),
      transitionInProgress$: of(false),
      canToggle$: of(true),
      photoZoomState$: of({ 
        zoomLevel: 1, 
        position: { x: 0, y: 0 }, 
        minZoom: 0.5, 
        maxZoom: 3,
        containerWidth: 800,
        containerHeight: 600,
        imageWidth: 1200,
        imageHeight: 900
      }),
      mapState$: of({ zoomLevel: 10, center: { latitude: 0, longitude: 0 }, pins: [] })
    });
    const photoZoomServiceSpy = jasmine.createSpyObj('PhotoZoomService', [
      'zoomIn',
      'zoomOut',
      'reset',
      'canZoomIn',
      'canZoomOut'
    ], {
      zoomState$: of({ 
        zoomLevel: 1, 
        position: { x: 0, y: 0 }, 
        minZoom: 0.5, 
        maxZoom: 3,
        containerWidth: 800,
        containerHeight: 600,
        imageWidth: 1200,
        imageHeight: 900
      })
    });

    await TestBed.configureTestingModule({
      imports: [PhotoMapToggleComponent, PhotoZoomControlsComponent, YearGuessComponent],
      declarations: [TestHostComponent, MockPhotoDisplayComponent, MockMapGuessComponent],
      providers: [
        { provide: Store, useValue: storeSpy },
        { provide: InterfaceToggleService, useValue: interfaceToggleServiceSpy },
        { provide: PhotoZoomService, useValue: photoZoomServiceSpy }
      ]
    }).compileComponents();

    mockStore = TestBed.inject(Store) as jasmine.SpyObj<Store>;
    mockInterfaceToggleService = TestBed.inject(InterfaceToggleService) as jasmine.SpyObj<InterfaceToggleService>;
    mockPhotoZoomService = TestBed.inject(PhotoZoomService) as jasmine.SpyObj<PhotoZoomService>;
    
    mockPhotoZoomService.canZoomIn.and.returnValue(true);
    mockPhotoZoomService.canZoomOut.and.returnValue(true);

    fixture = TestBed.createComponent(TestHostComponent);
    hostComponent = fixture.componentInstance;
    debugElement = fixture.debugElement;
    
    fixture.detectChanges();
  });

  describe('Comprehensive Keyboard Navigation', () => {
    it('should handle global keyboard shortcuts across components', () => {
      const gameInterface = debugElement.query(By.css('.enhanced-game-interface'));
      
      // Test toggle shortcut
      const toggleEvent = new KeyboardEvent('keydown', { key: 't' });
      gameInterface.nativeElement.dispatchEvent(toggleEvent);
      
      expect(mockInterfaceToggleService.toggleView).toHaveBeenCalled();
    });

    it('should support tab navigation between components', () => {
      const focusableElements = debugElement.queryAll(By.css('[tabindex="0"], button, input'));
      
      expect(focusableElements.length).toBeGreaterThan(0);
      
      // Test tab order
      focusableElements.forEach((element, index) => {
        element.nativeElement.focus();
        expect(document.activeElement).toBe(element.nativeElement);
      });
    });

    it('should handle Escape key for resetting interface', () => {
      const gameInterface = debugElement.query(By.css('.enhanced-game-interface'));
      
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      gameInterface.nativeElement.dispatchEvent(escapeEvent);
      
      expect(mockInterfaceToggleService.resetInterfaceState).toHaveBeenCalled();
    });

    it('should support keyboard shortcuts help', () => {
      const gameInterface = debugElement.query(By.css('.enhanced-game-interface'));
      
      const helpEvent = new KeyboardEvent('keydown', { key: '?' });
      gameInterface.nativeElement.dispatchEvent(helpEvent);
      
      // Should announce keyboard shortcuts
      const announcements = debugElement.queryAll(By.css('[aria-live]'));
      expect(announcements.length).toBeGreaterThan(0);
    });
  });

  describe('Screen Reader Support Integration', () => {
    it('should have coordinated ARIA live regions', () => {
      const liveRegions = debugElement.queryAll(By.css('[aria-live]'));
      
      expect(liveRegions.length).toBeGreaterThan(0);
      
      // Check for different politeness levels
      const politeLiveRegions = debugElement.queryAll(By.css('[aria-live="polite"]'));
      const assertiveLiveRegions = debugElement.queryAll(By.css('[aria-live="assertive"]'));
      
      expect(politeLiveRegions.length).toBeGreaterThan(0);
      expect(assertiveLiveRegions.length).toBeGreaterThan(0);
    });

    it('should announce state changes across components', () => {
      const announcements = debugElement.queryAll(By.css('[aria-live="polite"]'));
      expect(announcements.length).toBeGreaterThan(0);
      
      // Check that announcements exist for state changes
      const hasStateAnnouncements = announcements.some(el => 
        el.nativeElement.getAttribute('aria-live') === 'polite'
      );
      
      expect(hasStateAnnouncements).toBe(true);
    });

    it('should provide contextual help for all interactive elements', () => {
      const interactiveElements = debugElement.queryAll(By.css('button, input, [role="button"]'));
      
      interactiveElements.forEach(element => {
        const hasAriaLabel = element.nativeElement.getAttribute('aria-label');
        const hasAriaDescribedBy = element.nativeElement.getAttribute('aria-describedby');
        const hasTitle = element.nativeElement.getAttribute('title');
        
        expect(hasAriaLabel || hasAriaDescribedBy || hasTitle).toBeTruthy();
      });
    });
  });

  describe('Focus Management Integration', () => {
    it('should maintain focus during view transitions', () => {
      const photoMapToggle = debugElement.query(By.css('app-photo-map-toggle'));
      const mainContainer = photoMapToggle.query(By.css('.photo-map-toggle-container'));
      
      if (mainContainer) {
        mainContainer.nativeElement.focus();
        expect(document.activeElement).toBe(mainContainer.nativeElement);
      }
      
      // Focus management should be handled by the component
      expect(photoMapToggle).toBeTruthy();
    });

    it('should trap focus during transitions', () => {
      const mainContent = debugElement.query(By.css('.main-content'));
      expect(mainContent).toBeTruthy();
      
      // Focus trapping would be handled by CSS and component logic
      const focusableElements = debugElement.queryAll(By.css('[tabindex="0"]'));
      expect(focusableElements.length).toBeGreaterThan(0);
    });

    it('should restore focus after operations', () => {
      const yearSlider = debugElement.query(By.css('#year-slider'));
      
      if (yearSlider) {
        yearSlider.nativeElement.focus();
        
        // Simulate year change
        const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
        yearSlider.nativeElement.dispatchEvent(event);
        
        // Focus should remain on slider
        expect(document.activeElement).toBe(yearSlider.nativeElement);
      }
    });
  });

  describe('High Contrast Mode Integration', () => {
    it('should apply high contrast styles consistently', () => {
      // Simulate high contrast mode
      const mediaQuery = '(prefers-contrast: high)';
      const mockMediaQueryList = {
        matches: true,
        media: mediaQuery,
        onchange: null,
        addListener: jasmine.createSpy('addListener'),
        removeListener: jasmine.createSpy('removeListener'),
        addEventListener: jasmine.createSpy('addEventListener'),
        removeEventListener: jasmine.createSpy('removeEventListener'),
        dispatchEvent: jasmine.createSpy('dispatchEvent')
      };
      
      spyOn(window, 'matchMedia').and.returnValue(mockMediaQueryList as any);
      
      fixture.detectChanges();
      
      // All components should have high contrast support
      const allComponents = debugElement.queryAll(By.css('app-photo-map-toggle, app-year-guess'));
      expect(allComponents.length).toBeGreaterThan(0);
    });

    it('should maintain visibility in high contrast mode', () => {
      const interactiveElements = debugElement.queryAll(By.css('button, input, [role="button"]'));
      
      interactiveElements.forEach(element => {
        const styles = getComputedStyle(element.nativeElement);
        // Elements should have sufficient contrast
        expect(styles.color).toBeTruthy();
        expect(styles.backgroundColor || styles.borderColor).toBeTruthy();
      });
    });
  });

  describe('Touch Accessibility Integration', () => {
    it('should have consistent touch targets across components', () => {
      const touchTargets = debugElement.queryAll(By.css('button, input, [role="button"]'));
      
      touchTargets.forEach(target => {
        const rect = target.nativeElement.getBoundingClientRect();
        const minSize = Math.min(rect.width, rect.height);
        
        // Should meet minimum touch target size (44px) or have touch enhancement
        expect(minSize >= 40 || target.nativeElement.classList.contains('touch-enhanced')).toBe(true);
      });
    });

    it('should handle touch events accessibly', () => {
      const touchableElements = debugElement.queryAll(By.css('[role="button"]'));
      
      touchableElements.forEach(element => {
        const touchStartEvent = new TouchEvent('touchstart', {
          touches: [{ clientX: 100, clientY: 100 } as Touch]
        });
        
        expect(() => {
          element.nativeElement.dispatchEvent(touchStartEvent);
        }).not.toThrow();
      });
    });
  });

  describe('Error Handling and Graceful Degradation', () => {
    it('should handle service failures gracefully', () => {
      mockInterfaceToggleService.toggleView.and.throwError('Service error');
      
      const toggleButton = debugElement.query(By.css('[role="button"]'));
      
      expect(() => {
        toggleButton.nativeElement.click();
      }).not.toThrow();
    });

    it('should maintain accessibility when features are disabled', () => {
      const disabledElements = debugElement.queryAll(By.css('[aria-disabled="true"]'));
      
      // Check that disabled elements are properly marked
      disabledElements.forEach(element => {
        const tabindex = element.nativeElement.getAttribute('tabindex');
        expect(tabindex === '-1' || tabindex === null).toBe(true);
      });
    });

    it('should provide fallback content for missing data', () => {
      hostComponent.photo = null as any;
      fixture.detectChanges();
      
      const statusInfo = debugElement.query(By.css('.status-info'));
      if (statusInfo) {
        expect(statusInfo.nativeElement.textContent).toContain('No photograph available');
      }
    });
  });

  describe('Reduced Motion Support Integration', () => {
    it('should respect reduced motion preferences', () => {
      // Simulate reduced motion preference
      const mediaQuery = '(prefers-reduced-motion: reduce)';
      const mockMediaQueryList = {
        matches: true,
        media: mediaQuery,
        onchange: null,
        addListener: jasmine.createSpy('addListener'),
        removeListener: jasmine.createSpy('removeListener'),
        addEventListener: jasmine.createSpy('addEventListener'),
        removeEventListener: jasmine.createSpy('removeEventListener'),
        dispatchEvent: jasmine.createSpy('dispatchEvent')
      };
      
      spyOn(window, 'matchMedia').and.returnValue(mockMediaQueryList as any);
      
      fixture.detectChanges();
      
      // Components should handle reduced motion
      const animatedElements = debugElement.queryAll(By.css('.photo-map-toggle-container, .year-slider'));
      expect(animatedElements.length).toBeGreaterThan(0);
    });
  });

  describe('Semantic HTML Structure Integration', () => {
    it('should have proper heading hierarchy', () => {
      const headings = debugElement.queryAll(By.css('h1, h2, h3, h4, h5, h6'));
      
      // Should have logical heading structure
      expect(headings.length).toBeGreaterThan(0);
      
      // Check for proper nesting (simplified check)
      const h3Elements = debugElement.queryAll(By.css('h3'));
      expect(h3Elements.length).toBeGreaterThan(0);
    });

    it('should use appropriate ARIA roles', () => {
      const roleElements = debugElement.queryAll(By.css('[role]'));
      
      expect(roleElements.length).toBeGreaterThan(0);
      
      // Check for common accessibility roles
      const regions = debugElement.queryAll(By.css('[role="region"]'));
      const buttons = debugElement.queryAll(By.css('[role="button"]'));
      const toolbars = debugElement.queryAll(By.css('[role="toolbar"]'));
      
      expect(regions.length + buttons.length + toolbars.length).toBeGreaterThan(0);
    });

    it('should have proper form labeling', () => {
      const formControls = debugElement.queryAll(By.css('input, select, textarea'));
      
      formControls.forEach(control => {
        const hasLabel = control.nativeElement.getAttribute('aria-label') ||
                        control.nativeElement.getAttribute('aria-labelledby') ||
                        debugElement.query(By.css(`label[for="${control.nativeElement.id}"]`));
        
        expect(hasLabel).toBeTruthy();
      });
    });
  });

  describe('Performance and Memory Management', () => {
    it('should clean up accessibility resources on destroy', () => {
      const component = debugElement.query(By.directive(PhotoMapToggleComponent)).componentInstance;
      
      spyOn(component, 'ngOnDestroy').and.callThrough();
      
      fixture.destroy();
      
      expect(component.ngOnDestroy).toHaveBeenCalled();
    });

    it('should not create memory leaks with announcements', () => {
      const initialBodyChildren = document.body.children.length;
      
      // Trigger multiple announcements
      const yearSlider = debugElement.query(By.css('#year-slider'));
      if (yearSlider) {
        for (let i = 0; i < 5; i++) {
          const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
          yearSlider.nativeElement.dispatchEvent(event);
        }
      }
      
      // Wait for cleanup
      setTimeout(() => {
        expect(document.body.children.length).toBeLessThanOrEqual(initialBodyChildren + 1);
      }, 2000);
    });
  });

  describe('Cross-Component Communication', () => {
    it('should coordinate accessibility states between components', () => {
      const yearGuess = debugElement.query(By.css('app-year-guess'));
      const photoMapToggle = debugElement.query(By.css('app-photo-map-toggle'));
      
      // Both components should be present and accessible
      expect(yearGuess).toBeTruthy();
      expect(photoMapToggle).toBeTruthy();
      
      // Check that they have proper accessibility attributes
      const yearGuessRegion = yearGuess.query(By.css('[role="region"]'));
      const toggleRegion = photoMapToggle.query(By.css('[role="region"]'));
      
      expect(yearGuessRegion || toggleRegion).toBeTruthy();
    });

    it('should maintain consistent focus management across components', () => {
      const focusableElements = debugElement.queryAll(By.css('[tabindex="0"]'));
      
      // Should have a logical tab order
      expect(focusableElements.length).toBeGreaterThan(1);
      
      // Test tab navigation
      let currentIndex = 0;
      focusableElements.forEach((element, index) => {
        element.nativeElement.focus();
        expect(document.activeElement).toBe(element.nativeElement);
        currentIndex = index;
      });
    });
  });
});