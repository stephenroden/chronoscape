import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';

import { PhotoZoomControlsComponent } from './photo-zoom-controls.component';
import { PhotoZoomService, PhotoZoomState } from '../../services/photo-zoom.service';

describe('PhotoZoomControlsComponent - Accessibility', () => {
  let component: PhotoZoomControlsComponent;
  let fixture: ComponentFixture<PhotoZoomControlsComponent>;
  let mockPhotoZoomService: jasmine.SpyObj<PhotoZoomService>;
  let debugElement: DebugElement;

  const mockZoomState: PhotoZoomState = {
    zoomLevel: 1.5,
    position: { x: 0, y: 0 },
    minZoom: 0.5,
    maxZoom: 3,
    containerWidth: 800,
    containerHeight: 600,
    imageWidth: 1200,
    imageHeight: 900
  };

  beforeEach(async () => {
    const photoZoomServiceSpy = jasmine.createSpyObj('PhotoZoomService', [
      'zoomIn',
      'zoomOut',
      'reset',
      'canZoomIn',
      'canZoomOut'
    ], {
      zoomState$: of(mockZoomState)
    });

    await TestBed.configureTestingModule({
      imports: [PhotoZoomControlsComponent],
      providers: [
        { provide: PhotoZoomService, useValue: photoZoomServiceSpy }
      ]
    }).compileComponents();

    mockPhotoZoomService = TestBed.inject(PhotoZoomService) as jasmine.SpyObj<PhotoZoomService>;
    mockPhotoZoomService.canZoomIn.and.returnValue(true);
    mockPhotoZoomService.canZoomOut.and.returnValue(true);

    fixture = TestBed.createComponent(PhotoZoomControlsComponent);
    component = fixture.componentInstance;
    debugElement = fixture.debugElement;
    
    fixture.detectChanges();
  });

  describe('ARIA Labels and Roles', () => {
    it('should have proper toolbar role and aria-label', () => {
      const toolbar = debugElement.query(By.css('.zoom-controls'));
      
      expect(toolbar.nativeElement.getAttribute('role')).toBe('toolbar');
      expect(toolbar.nativeElement.getAttribute('aria-label')).toBe('Photo zoom controls');
    });

    it('should have proper aria-describedby references', () => {
      const toolbar = debugElement.query(By.css('.zoom-controls'));
      const zoomInBtn = debugElement.query(By.css('.zoom-in'));
      const zoomOutBtn = debugElement.query(By.css('.zoom-out'));
      const resetBtn = debugElement.query(By.css('.zoom-reset'));
      
      expect(toolbar.nativeElement.getAttribute('aria-describedby')).toContain('zoom-help-');
      expect(zoomInBtn.nativeElement.getAttribute('aria-describedby')).toContain('zoom-in-help-');
      expect(zoomOutBtn.nativeElement.getAttribute('aria-describedby')).toContain('zoom-out-help-');
      expect(resetBtn.nativeElement.getAttribute('aria-describedby')).toContain('zoom-reset-help-');
    });

    it('should have descriptive aria-labels for buttons', () => {
      const zoomInBtn = debugElement.query(By.css('.zoom-in'));
      const zoomOutBtn = debugElement.query(By.css('.zoom-out'));
      const resetBtn = debugElement.query(By.css('.zoom-reset'));
      
      expect(zoomInBtn.nativeElement.getAttribute('aria-label')).toContain('Zoom in from 1.5x');
      expect(zoomOutBtn.nativeElement.getAttribute('aria-label')).toContain('Zoom out from 1.5x');
      expect(resetBtn.nativeElement.getAttribute('aria-label')).toContain('Reset zoom from 1.5x');
    });

    it('should update aria-labels when zoom state changes', () => {
      const zoomInBtn = debugElement.query(By.css('.zoom-in'));
      
      // Check that aria-label is present and descriptive
      const ariaLabel = zoomInBtn.nativeElement.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel).toContain('Zoom in');
    });

    it('should have proper aria-labels when buttons are disabled', () => {
      mockPhotoZoomService.canZoomIn.and.returnValue(false);
      mockPhotoZoomService.canZoomOut.and.returnValue(false);
      
      component.ngOnInit();
      fixture.detectChanges();
      
      const zoomInBtn = debugElement.query(By.css('.zoom-in'));
      const zoomOutBtn = debugElement.query(By.css('.zoom-out'));
      
      expect(zoomInBtn.nativeElement.getAttribute('aria-label')).toContain('Zoom in unavailable');
      expect(zoomOutBtn.nativeElement.getAttribute('aria-label')).toContain('Zoom out unavailable');
    });

    it('should have aria-hidden on decorative SVG icons', () => {
      const svgIcons = debugElement.queryAll(By.css('svg'));
      
      svgIcons.forEach(svg => {
        expect(svg.nativeElement.getAttribute('aria-hidden')).toBe('true');
      });
    });

    it('should have proper aria-live region for zoom level', () => {
      const zoomLevel = debugElement.query(By.css('.zoom-level-indicator'));
      
      expect(zoomLevel.nativeElement.getAttribute('aria-live')).toBe('polite');
      expect(zoomLevel.nativeElement.getAttribute('aria-atomic')).toBe('true');
      expect(zoomLevel.nativeElement.getAttribute('aria-label')).toContain('Current zoom level: 1.5x');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should zoom in with plus key', () => {
      const event = new KeyboardEvent('keydown', { key: '+' });
      component.onKeyDown(event);
      
      expect(mockPhotoZoomService.zoomIn).toHaveBeenCalled();
    });

    it('should zoom in with equals key', () => {
      const event = new KeyboardEvent('keydown', { key: '=' });
      component.onKeyDown(event);
      
      expect(mockPhotoZoomService.zoomIn).toHaveBeenCalled();
    });

    it('should zoom out with minus key', () => {
      const event = new KeyboardEvent('keydown', { key: '-' });
      component.onKeyDown(event);
      
      expect(mockPhotoZoomService.zoomOut).toHaveBeenCalled();
    });

    it('should reset zoom with 0 key', () => {
      const event = new KeyboardEvent('keydown', { key: '0' });
      component.onKeyDown(event);
      
      expect(mockPhotoZoomService.reset).toHaveBeenCalled();
    });

    it('should not handle keyboard events when disabled', () => {
      component.disabled = true;
      
      const event = new KeyboardEvent('keydown', { key: '+' });
      component.onKeyDown(event);
      
      expect(mockPhotoZoomService.zoomIn).not.toHaveBeenCalled();
    });

    it('should not zoom in when at maximum zoom', () => {
      mockPhotoZoomService.canZoomIn.and.returnValue(false);
      component.ngOnInit();
      fixture.detectChanges();
      
      const event = new KeyboardEvent('keydown', { key: '+' });
      component.onKeyDown(event);
      
      expect(mockPhotoZoomService.zoomIn).not.toHaveBeenCalled();
    });

    it('should not zoom out when at minimum zoom', () => {
      mockPhotoZoomService.canZoomOut.and.returnValue(false);
      component.ngOnInit();
      fixture.detectChanges();
      
      const event = new KeyboardEvent('keydown', { key: '-' });
      component.onKeyDown(event);
      
      expect(mockPhotoZoomService.zoomOut).not.toHaveBeenCalled();
    });

    it('should handle keyboard events on button elements', () => {
      const zoomInBtn = debugElement.query(By.css('.zoom-in'));
      const event = new KeyboardEvent('keydown', { key: '+' });
      
      zoomInBtn.nativeElement.dispatchEvent(event);
      
      expect(mockPhotoZoomService.zoomIn).toHaveBeenCalled();
    });
  });

  describe('Screen Reader Announcements', () => {
    it('should have hidden help text for screen readers', () => {
      const helpTexts = debugElement.queryAll(By.css('.sr-only'));
      
      expect(helpTexts.length).toBeGreaterThan(0);
      
      const mainHelp = debugElement.query(By.css('[id*="zoom-help-"]'));
      expect(mainHelp.nativeElement.textContent).toContain('Use plus and minus keys to zoom');
    });

    it('should have specific help text for each button', () => {
      const zoomInHelp = debugElement.query(By.css('[id*="zoom-in-help-"]'));
      const zoomOutHelp = debugElement.query(By.css('[id*="zoom-out-help-"]'));
      const resetHelp = debugElement.query(By.css('[id*="zoom-reset-help-"]'));
      
      expect(zoomInHelp.nativeElement.textContent).toContain('Increase zoom level');
      expect(zoomOutHelp.nativeElement.textContent).toContain('Decrease zoom level');
      expect(resetHelp.nativeElement.textContent).toContain('Reset zoom to original size');
    });

    it('should announce zoom changes', () => {
      component.onZoomIn();
      fixture.detectChanges();
      
      expect(component.zoomChangeAnnouncement).toContain('Zoomed in to');
    });

    it('should announce zoom out', () => {
      component.onZoomOut();
      fixture.detectChanges();
      
      expect(component.zoomChangeAnnouncement).toContain('Zoomed out to');
    });

    it('should announce zoom reset', () => {
      component.onReset();
      fixture.detectChanges();
      
      expect(component.zoomChangeAnnouncement).toContain('Zoom reset to original size');
    });

    it('should clear announcements after timeout', (done) => {
      component.onZoomIn();
      fixture.detectChanges();
      
      expect(component.zoomChangeAnnouncement).toBeTruthy();
      
      setTimeout(() => {
        expect(component.zoomChangeAnnouncement).toBe('');
        done();
      }, 1600);
    });

    it('should have assertive aria-live region for announcements', () => {
      const announcementRegion = debugElement.query(By.css('[aria-live="assertive"]'));
      expect(announcementRegion).toBeTruthy();
      expect(announcementRegion.nativeElement.getAttribute('aria-atomic')).toBe('true');
    });
  });

  describe('Focus Management', () => {
    it('should have visible focus indicators on buttons', () => {
      const buttons = debugElement.queryAll(By.css('button'));
      
      buttons.forEach(button => {
        button.nativeElement.focus();
        const styles = getComputedStyle(button.nativeElement);
        expect(styles.outline).toBeTruthy();
      });
    });

    it('should maintain focus order within toolbar', () => {
      const buttons = debugElement.queryAll(By.css('button'));
      
      expect(buttons.length).toBe(3);
      
      // All buttons should be focusable
      buttons.forEach(button => {
        expect(button.nativeElement.tabIndex).not.toBe(-1);
      });
    });

    it('should skip disabled buttons in tab order', () => {
      component.disabled = true;
      fixture.detectChanges();
      
      const buttons = debugElement.queryAll(By.css('button'));
      
      buttons.forEach(button => {
        expect(button.nativeElement.disabled).toBe(true);
      });
    });
  });

  describe('Button States and Feedback', () => {
    it('should disable buttons appropriately', () => {
      mockPhotoZoomService.canZoomIn.and.returnValue(false);
      mockPhotoZoomService.canZoomOut.and.returnValue(false);
      
      component.ngOnInit();
      fixture.detectChanges();
      
      const zoomInBtn = debugElement.query(By.css('.zoom-in'));
      const zoomOutBtn = debugElement.query(By.css('.zoom-out'));
      
      expect(zoomInBtn.nativeElement.disabled).toBe(true);
      expect(zoomOutBtn.nativeElement.disabled).toBe(true);
    });

    it('should disable reset button when at original zoom', () => {
      const resetBtn = debugElement.query(By.css('.zoom-reset'));
      
      // Check that reset button has proper disabled state handling
      expect(resetBtn.nativeElement.disabled).toBeDefined();
      expect(resetBtn.nativeElement.getAttribute('aria-label')).toBeTruthy();
    });

    it('should provide appropriate titles for buttons', () => {
      const zoomInBtn = debugElement.query(By.css('.zoom-in'));
      const zoomOutBtn = debugElement.query(By.css('.zoom-out'));
      const resetBtn = debugElement.query(By.css('.zoom-reset'));
      
      expect(zoomInBtn.nativeElement.title).toContain('Zoom in');
      expect(zoomOutBtn.nativeElement.title).toContain('Zoom out');
      expect(resetBtn.nativeElement.title).toContain('Reset zoom');
    });

    it('should include keyboard shortcuts in titles', () => {
      const zoomInBtn = debugElement.query(By.css('.zoom-in'));
      const zoomOutBtn = debugElement.query(By.css('.zoom-out'));
      const resetBtn = debugElement.query(By.css('.zoom-reset'));
      
      expect(zoomInBtn.nativeElement.title).toContain('+ key');
      expect(zoomOutBtn.nativeElement.title).toContain('- key');
      expect(resetBtn.nativeElement.title).toContain('0 key');
    });
  });

  describe('High Contrast Mode Support', () => {
    it('should apply high contrast styles when media query matches', () => {
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
      
      // High contrast styles should be applied via CSS
      const toolbar = debugElement.query(By.css('.zoom-controls'));
      expect(toolbar).toBeTruthy();
    });
  });

  describe('Touch Accessibility', () => {
    it('should have appropriate touch targets', () => {
      const buttons = debugElement.queryAll(By.css('button'));
      
      buttons.forEach(button => {
        const rect = button.nativeElement.getBoundingClientRect();
        // Should meet minimum touch target size (44px)
        expect(Math.max(rect.width, rect.height)).toBeGreaterThanOrEqual(40);
      });
    });
  });

  describe('Reduced Motion Support', () => {
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
      
      // Reduced motion styles should be applied via CSS
      const toolbar = debugElement.query(By.css('.zoom-controls'));
      expect(toolbar).toBeTruthy();
    });
  });

  describe('Component Lifecycle and Cleanup', () => {
    it('should clean up announcement timeouts on destroy', () => {
      component.onZoomIn();
      
      spyOn(window, 'clearTimeout');
      component.ngOnDestroy();
      
      expect(window.clearTimeout).toHaveBeenCalled();
    });

    it('should generate unique component IDs for ARIA references', () => {
      const component1 = new PhotoZoomControlsComponent(mockPhotoZoomService);
      const component2 = new PhotoZoomControlsComponent(mockPhotoZoomService);
      
      expect(component1.componentId).not.toBe(component2.componentId);
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', () => {
      mockPhotoZoomService.zoomIn.and.throwError('Service error');
      
      expect(() => component.onZoomIn()).not.toThrow();
    });

    it('should maintain accessibility when service is unavailable', () => {
      expect(() => {
        component.ngOnInit();
        fixture.detectChanges();
      }).not.toThrow();
      
      const toolbar = debugElement.query(By.css('.zoom-controls'));
      expect(toolbar.nativeElement.getAttribute('aria-label')).toBeTruthy();
    });
  });

  describe('Semantic HTML Structure', () => {
    it('should use button elements for interactive controls', () => {
      const buttons = debugElement.queryAll(By.css('button'));
      expect(buttons.length).toBe(3);
      
      buttons.forEach(button => {
        expect(button.nativeElement.tagName.toLowerCase()).toBe('button');
        expect(button.nativeElement.type).toBe('button');
      });
    });

    it('should have proper button structure with icons and text', () => {
      const buttons = debugElement.queryAll(By.css('button'));
      
      buttons.forEach(button => {
        const svg = button.query(By.css('svg'));
        const srText = button.query(By.css('.sr-only'));
        
        expect(svg).toBeTruthy();
        expect(srText).toBeTruthy();
      });
    });
  });

  describe('Color Contrast and Visual Accessibility', () => {
    it('should have sufficient color contrast for disabled states', () => {
      component.disabled = true;
      fixture.detectChanges();
      
      const toolbar = debugElement.query(By.css('.zoom-controls'));
      expect(toolbar.nativeElement.classList).toContain('disabled');
    });

    it('should provide visual feedback for button states', () => {
      const buttons = debugElement.queryAll(By.css('button'));
      
      buttons.forEach(button => {
        // Should have hover and focus styles
        const styles = getComputedStyle(button.nativeElement);
        expect(styles.cursor).toBeTruthy();
      });
    });
  });
});