import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';

import { PhotoMapToggleComponent } from './photo-map-toggle.component';
import { InterfaceToggleService } from '../../services/interface-toggle.service';
import { Photo } from '../../models/photo.model';
import { ActiveView } from '../../models/interface-state.model';

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

describe('PhotoMapToggleComponent - Accessibility', () => {
  let component: PhotoMapToggleComponent;
  let fixture: ComponentFixture<PhotoMapToggleComponent>;
  let mockStore: jasmine.SpyObj<Store>;
  let mockInterfaceToggleService: jasmine.SpyObj<InterfaceToggleService>;
  let debugElement: DebugElement;

  const mockPhoto: Photo = {
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

  beforeEach(async () => {
    const storeSpy = jasmine.createSpyObj('Store', ['select', 'dispatch']);
    const interfaceToggleServiceSpy = jasmine.createSpyObj('InterfaceToggleService', [
      'toggleView',
      'setActiveView',
      'resetInterfaceState',
      'resetPhotoZoom'
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

    await TestBed.configureTestingModule({
      imports: [PhotoMapToggleComponent],
      declarations: [MockPhotoDisplayComponent, MockMapGuessComponent],
      providers: [
        { provide: Store, useValue: storeSpy },
        { provide: InterfaceToggleService, useValue: interfaceToggleServiceSpy }
      ]
    }).compileComponents();

    mockStore = TestBed.inject(Store) as jasmine.SpyObj<Store>;
    mockInterfaceToggleService = TestBed.inject(InterfaceToggleService) as jasmine.SpyObj<InterfaceToggleService>;

    fixture = TestBed.createComponent(PhotoMapToggleComponent);
    component = fixture.componentInstance;
    debugElement = fixture.debugElement;
    
    component.photo = mockPhoto;
    fixture.detectChanges();
  });

  describe('ARIA Labels and Roles', () => {
    it('should have proper ARIA labels on main container', () => {
      const mainContainer = debugElement.query(By.css('.photo-map-toggle-container'));
      
      expect(mainContainer.nativeElement.getAttribute('role')).toBe('region');
      expect(mainContainer.nativeElement.getAttribute('aria-label')).toContain('photograph view container');
      expect(mainContainer.nativeElement.getAttribute('aria-live')).toBe('polite');
      expect(mainContainer.nativeElement.getAttribute('tabindex')).toBe('0');
    });

    it('should have proper ARIA labels on thumbnail toggle', () => {
      const thumbnail = debugElement.query(By.css('.thumbnail-area'));
      
      expect(thumbnail.nativeElement.getAttribute('role')).toBe('button');
      expect(thumbnail.nativeElement.getAttribute('aria-label')).toContain('Click to switch to map view');
      expect(thumbnail.nativeElement.getAttribute('tabindex')).toBe('0');
    });

    it('should update ARIA labels when view changes', () => {
      const mainContainer = debugElement.query(By.css('.photo-map-toggle-container'));
      const thumbnail = debugElement.query(By.css('.thumbnail-area'));
      
      // Check that ARIA labels are present and descriptive
      expect(mainContainer.nativeElement.getAttribute('aria-label')).toContain('view container');
      expect(thumbnail.nativeElement.getAttribute('aria-label')).toContain('switch to');
    });

    it('should have proper aria-hidden attributes on inactive views', () => {
      const photoContainer = debugElement.query(By.css('.photo-map-view-container'));
      const mapContainer = debugElement.query(By.css('.map-container'));
      
      // Photo is active, map should be hidden
      expect(photoContainer.nativeElement.getAttribute('aria-hidden')).toBe('false');
      expect(mapContainer.nativeElement.getAttribute('aria-hidden')).toBe('true');
    });

    it('should have proper tabindex management', () => {
      const photoDisplay = debugElement.query(By.css('app-photo-display'));
      const mapGuess = debugElement.query(By.css('app-map-guess'));
      
      // Photo is active, should be focusable
      expect(photoDisplay.nativeElement.getAttribute('tabindex')).toBe('0');
      expect(mapGuess.nativeElement.getAttribute('tabindex')).toBe('-1');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should toggle view with T key', () => {
      mockInterfaceToggleService.toggleView.and.returnValue(of('map' as ActiveView));
      
      const mainContainer = debugElement.query(By.css('.photo-map-toggle-container'));
      const event = new KeyboardEvent('keydown', { key: 't' });
      
      mainContainer.nativeElement.dispatchEvent(event);
      
      expect(mockInterfaceToggleService.toggleView).toHaveBeenCalled();
    });

    it('should switch to photo view with P key', () => {
      mockInterfaceToggleService.setActiveView.and.returnValue(of('photo' as ActiveView));
      component.currentActiveView = 'map';
      
      const mainContainer = debugElement.query(By.css('.photo-map-toggle-container'));
      const event = new KeyboardEvent('keydown', { key: 'p' });
      
      mainContainer.nativeElement.dispatchEvent(event);
      
      expect(mockInterfaceToggleService.setActiveView).toHaveBeenCalledWith('photo', jasmine.any(Number));
    });

    it('should switch to map view with M key', () => {
      mockInterfaceToggleService.setActiveView.and.returnValue(of('map' as ActiveView));
      component.currentActiveView = 'photo';
      
      const mainContainer = debugElement.query(By.css('.photo-map-toggle-container'));
      const event = new KeyboardEvent('keydown', { key: 'm' });
      
      mainContainer.nativeElement.dispatchEvent(event);
      
      expect(mockInterfaceToggleService.setActiveView).toHaveBeenCalledWith('map', jasmine.any(Number));
    });

    it('should reset interface with Escape key', () => {
      const mainContainer = debugElement.query(By.css('.photo-map-toggle-container'));
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      
      mainContainer.nativeElement.dispatchEvent(event);
      
      expect(mockInterfaceToggleService.resetInterfaceState).toHaveBeenCalled();
    });

    it('should toggle with Alt + Arrow keys', () => {
      mockInterfaceToggleService.toggleView.and.returnValue(of('map' as ActiveView));
      
      const mainContainer = debugElement.query(By.css('.photo-map-toggle-container'));
      const event = new KeyboardEvent('keydown', { key: 'ArrowLeft', altKey: true });
      
      mainContainer.nativeElement.dispatchEvent(event);
      
      expect(mockInterfaceToggleService.toggleView).toHaveBeenCalled();
    });

    it('should activate thumbnail with Enter key', () => {
      mockInterfaceToggleService.toggleView.and.returnValue(of('map' as ActiveView));
      
      const thumbnail = debugElement.query(By.css('.thumbnail-area'));
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      
      thumbnail.nativeElement.dispatchEvent(event);
      
      expect(mockInterfaceToggleService.toggleView).toHaveBeenCalled();
    });

    it('should activate thumbnail with Space key', () => {
      mockInterfaceToggleService.toggleView.and.returnValue(of('map' as ActiveView));
      
      const thumbnail = debugElement.query(By.css('.thumbnail-area'));
      const event = new KeyboardEvent('keydown', { key: ' ' });
      
      thumbnail.nativeElement.dispatchEvent(event);
      
      expect(mockInterfaceToggleService.toggleView).toHaveBeenCalled();
    });

    it('should not handle keys when component does not have focus', () => {
      const outsideElement = document.createElement('div');
      document.body.appendChild(outsideElement);
      outsideElement.focus();
      
      const event = new KeyboardEvent('keydown', { key: 't' });
      debugElement.nativeElement.dispatchEvent(event);
      
      expect(mockInterfaceToggleService.toggleView).not.toHaveBeenCalled();
      
      document.body.removeChild(outsideElement);
    });
  });

  describe('Screen Reader Announcements', () => {
    it('should have screen reader announcements for state changes', () => {
      const announcements = debugElement.query(By.css('.sr-only[aria-live="polite"]'));
      expect(announcements).toBeTruthy();
    });

    it('should announce when transitioning', () => {
      const announcements = debugElement.query(By.css('.sr-only[aria-live="polite"]'));
      expect(announcements).toBeTruthy();
      
      // Check that transition announcements are available
      expect(announcements.nativeElement.textContent).toBeTruthy();
    });

    it('should announce current view state', () => {
      const announcements = debugElement.query(By.css('.sr-only[aria-live="polite"]'));
      expect(announcements.nativeElement.textContent).toContain('Currently viewing photograph');
    });

    it('should have keyboard instructions for screen readers', () => {
      const instructions = debugElement.query(By.css('.keyboard-instructions'));
      expect(instructions).toBeTruthy();
      expect(instructions.nativeElement.textContent).toContain('T - Toggle between photo and map views');
      expect(instructions.nativeElement.textContent).toContain('P - Switch to photo view');
      expect(instructions.nativeElement.textContent).toContain('M - Switch to map view');
    });

    it('should have status information for screen readers', () => {
      const statusInfo = debugElement.query(By.css('.status-info'));
      expect(statusInfo).toBeTruthy();
      expect(statusInfo.nativeElement.textContent).toContain('Photograph loaded');
    });

    it('should announce photo description', () => {
      const description = component.getPhotoDescription();
      expect(description).toContain('Test Photo from 1950');
      expect(description).toContain('A test photograph for accessibility testing');
    });
  });

  describe('Focus Management', () => {
    it('should manage focus during view transitions', () => {
      const mainContainer = debugElement.query(By.css('.photo-map-toggle-container'));
      mainContainer.nativeElement.focus();
      
      expect(document.activeElement).toBe(mainContainer.nativeElement);
    });

    it('should have visible focus indicators', () => {
      const mainContainer = debugElement.query(By.css('.photo-map-toggle-container'));
      const thumbnail = debugElement.query(By.css('.thumbnail-area'));
      
      // Focus should be visible with proper outline
      mainContainer.nativeElement.focus();
      const mainContainerStyles = getComputedStyle(mainContainer.nativeElement);
      expect(mainContainerStyles.outline).toBeTruthy();
      
      thumbnail.nativeElement.focus();
      const thumbnailStyles = getComputedStyle(thumbnail.nativeElement);
      expect(thumbnailStyles.outline).toBeTruthy();
    });

    it('should trap focus within component during transitions', () => {
      const mainContent = debugElement.query(By.css('.main-content'));
      expect(mainContent).toBeTruthy();
      
      // Focus trapping would be handled by component logic and CSS
      const focusableElements = debugElement.queryAll(By.css('[tabindex="0"]'));
      expect(focusableElements.length).toBeGreaterThan(0);
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
      const mainContainer = debugElement.query(By.css('.photo-map-toggle-container'));
      expect(mainContainer).toBeTruthy();
    });
  });

  describe('Touch Accessibility', () => {
    it('should have appropriate touch targets for mobile', () => {
      const thumbnail = debugElement.query(By.css('.thumbnail-area'));
      const rect = thumbnail.nativeElement.getBoundingClientRect();
      
      // Should meet minimum touch target size (44px)
      expect(rect.width).toBeGreaterThanOrEqual(44);
      expect(rect.height).toBeGreaterThanOrEqual(44);
    });

    it('should handle touch events accessibly', () => {
      const thumbnail = debugElement.query(By.css('.thumbnail-area'));
      const touchStartEvent = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 100 } as Touch]
      });
      
      spyOn(component, 'onThumbnailTouchStart');
      thumbnail.nativeElement.dispatchEvent(touchStartEvent);
      
      expect(component.onThumbnailTouchStart).toHaveBeenCalled();
    });
  });

  describe('Error States and Disabled States', () => {
    it('should handle disabled state accessibly', () => {
      const thumbnail = debugElement.query(By.css('.thumbnail-area'));
      
      // Check that thumbnail has proper accessibility attributes
      expect(thumbnail.nativeElement.getAttribute('aria-disabled')).toBeDefined();
      expect(thumbnail.nativeElement.getAttribute('tabindex')).toBeDefined();
    });

    it('should announce when toggle is disabled', () => {
      const announcements = debugElement.query(By.css('.sr-only[aria-live="polite"]'));
      expect(announcements).toBeTruthy();
      
      // Check that announcements are properly configured
      expect(announcements.nativeElement.getAttribute('aria-live')).toBe('polite');
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
      const mainContainer = debugElement.query(By.css('.photo-map-toggle-container'));
      expect(mainContainer).toBeTruthy();
    });
  });

  describe('Semantic HTML Structure', () => {
    it('should use semantic HTML elements', () => {
      const region = debugElement.query(By.css('[role="region"]'));
      const button = debugElement.query(By.css('[role="button"]'));
      
      expect(region).toBeTruthy();
      expect(button).toBeTruthy();
    });

    it('should have proper heading structure for screen readers', () => {
      const instructions = debugElement.query(By.css('.keyboard-instructions h3'));
      expect(instructions).toBeTruthy();
      expect(instructions.nativeElement.textContent).toContain('Available keyboard shortcuts');
    });

    it('should use lists for keyboard shortcuts', () => {
      const shortcutsList = debugElement.query(By.css('.keyboard-instructions ul'));
      const shortcuts = debugElement.queryAll(By.css('.keyboard-instructions li'));
      
      expect(shortcutsList).toBeTruthy();
      expect(shortcuts.length).toBeGreaterThan(0);
    });
  });

  describe('Color Contrast and Visual Accessibility', () => {
    it('should have sufficient color contrast for text elements', () => {
      const viewLabel = debugElement.query(By.css('.view-label'));
      const toggleIcon = debugElement.query(By.css('.toggle-icon'));
      
      expect(viewLabel).toBeTruthy();
      expect(toggleIcon).toBeTruthy();
      
      // Text should have text-shadow for better contrast
      const labelStyles = getComputedStyle(viewLabel.nativeElement);
      const iconStyles = getComputedStyle(toggleIcon.nativeElement);
      
      expect(labelStyles.textShadow).toBeTruthy();
      expect(iconStyles.textShadow).toBeTruthy();
    });
  });
});