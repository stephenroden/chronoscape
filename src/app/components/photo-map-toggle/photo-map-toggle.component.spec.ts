import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Component, DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { Store } from '@ngrx/store';
import { of, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

import { PhotoMapToggleComponent } from './photo-map-toggle.component';
import { InterfaceToggleService } from '../../services/interface-toggle.service';
import { PhotoDisplayComponent } from '../photo-display/photo-display.component';
import { MapGuessComponent } from '../map-guess/map-guess.component';
import { Photo } from '../../models/photo.model';
import { ActiveView, PhotoZoomState, MapState, defaultPhotoZoomState, defaultMapState } from '../../models/interface-state.model';

// Mock components
@Component({
  selector: 'app-photo-display',
  template: '<div class="mock-photo-display">Photo Display Mock</div>',
  standalone: true,
  inputs: ['photo', 'showMetadata', 'enableZoom']
})
class MockPhotoDisplayComponent {
  photo: Photo | null = null;
  showMetadata = false;
  enableZoom = true;
}

@Component({
  selector: 'app-map-guess',
  template: '<div class="mock-map-guess">Map Guess Mock</div>',
  standalone: true
})
class MockMapGuessComponent {}

describe('PhotoMapToggleComponent', () => {
  let component: PhotoMapToggleComponent;
  let fixture: ComponentFixture<PhotoMapToggleComponent>;
  let mockStore: jasmine.SpyObj<Store>;
  let mockInterfaceToggleService: jasmine.SpyObj<InterfaceToggleService>;

  // BehaviorSubjects for mocking observables
  let activeViewSubject: BehaviorSubject<ActiveView>;
  let transitionInProgressSubject: BehaviorSubject<boolean>;
  let canToggleSubject: BehaviorSubject<boolean>;
  let photoZoomStateSubject: BehaviorSubject<PhotoZoomState>;
  let mapStateSubject: BehaviorSubject<MapState>;

  const mockPhoto: Photo = {
    id: '1',
    url: 'https://example.com/photo.jpg',
    title: 'Test Photo',
    year: 1950,
    coordinates: { latitude: 40.7128, longitude: -74.0060 },
    description: 'A test photo',
    source: 'Test Source',
    metadata: {
      license: 'CC BY 4.0',
      originalSource: 'Test Archive',
      dateCreated: new Date('1950-01-01')
    }
  };

  beforeEach(async () => {
    // Initialize BehaviorSubjects
    activeViewSubject = new BehaviorSubject<ActiveView>('photo');
    transitionInProgressSubject = new BehaviorSubject<boolean>(false);
    canToggleSubject = new BehaviorSubject<boolean>(true);
    photoZoomStateSubject = new BehaviorSubject<PhotoZoomState>(defaultPhotoZoomState);
    mapStateSubject = new BehaviorSubject<MapState>(defaultMapState);

    // Create spies
    mockStore = jasmine.createSpyObj('Store', ['select', 'dispatch']);
    mockInterfaceToggleService = jasmine.createSpyObj('InterfaceToggleService', [
      'toggleView',
      'setActiveView',
      'resetInterfaceState'
    ], {
      activeView$: activeViewSubject.asObservable(),
      isPhotoActive$: activeViewSubject.asObservable().pipe(map(view => view === 'photo')),
      isMapActive$: activeViewSubject.asObservable().pipe(map(view => view === 'map')),
      inactiveView$: activeViewSubject.asObservable().pipe(map(view => view === 'photo' ? 'map' : 'photo')),
      transitionInProgress$: transitionInProgressSubject.asObservable(),
      canToggle$: canToggleSubject.asObservable(),
      photoZoomState$: photoZoomStateSubject.asObservable(),
      mapState$: mapStateSubject.asObservable()
    });

    // Setup service method returns
    mockInterfaceToggleService.toggleView.and.returnValue(of('map'));
    mockInterfaceToggleService.setActiveView.and.returnValue(of('photo'));

    await TestBed.configureTestingModule({
      imports: [PhotoMapToggleComponent],
      providers: [
        { provide: Store, useValue: mockStore },
        { provide: InterfaceToggleService, useValue: mockInterfaceToggleService }
      ]
    })
    .overrideComponent(PhotoMapToggleComponent, {
      remove: { imports: [PhotoDisplayComponent, MapGuessComponent] },
      add: { imports: [MockPhotoDisplayComponent, MockMapGuessComponent] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(PhotoMapToggleComponent);
    component = fixture.componentInstance;
    component.photo = mockPhoto;
    fixture.detectChanges();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default values', () => {
      expect(component.currentActiveView).toBe('photo');
      expect(component.currentInactiveView).toBe('map');
      expect(component.isTransitioning).toBe(false);
      expect(component.canToggleView).toBe(true);
      expect(component.enableZoom).toBe(true);
      expect(component.transitionDuration).toBe(300);
    });

    it('should setup subscriptions on init', () => {
      expect(component.activeView$).toBeDefined();
      expect(component.transitionInProgress$).toBeDefined();
      expect(component.canToggle$).toBeDefined();
      expect(component.photoZoomState$).toBeDefined();
      expect(component.mapState$).toBeDefined();
    });

    it('should initialize thumbnails', () => {
      expect(component.thumbnailData).toEqual({
        view: 'map',
        isActive: false
      });
    });
  });

  describe('View Toggle Functionality', () => {
    it('should toggle view when toggle button is clicked', fakeAsync(() => {
      const toggleButton = fixture.debugElement.query(By.css('.thumbnail-area'));
      toggleButton.nativeElement.click();
      tick();

      expect(mockInterfaceToggleService.toggleView).toHaveBeenCalledWith(300);
    }));

    it('should not toggle when transition is in progress', () => {
      transitionInProgressSubject.next(true);
      fixture.detectChanges();

      component.onToggleClick();

      expect(mockInterfaceToggleService.toggleView).not.toHaveBeenCalled();
    });

    it('should not toggle when toggle is disabled', () => {
      canToggleSubject.next(false);
      fixture.detectChanges();

      component.onToggleClick();

      expect(mockInterfaceToggleService.toggleView).not.toHaveBeenCalled();
    });

    it('should update active view when service emits change', () => {
      activeViewSubject.next('map');
      fixture.detectChanges();

      expect(component.currentActiveView).toBe('map');
      expect(component.currentInactiveView).toBe('photo');
    });

    it('should emit viewToggled event when view changes', () => {
      spyOn(component.viewToggled, 'emit');
      
      activeViewSubject.next('map');
      fixture.detectChanges();

      expect(component.viewToggled.emit).toHaveBeenCalledWith('map');
    });
  });

  describe('Thumbnail Functionality', () => {
    it('should display thumbnail for inactive view', () => {
      const thumbnail = fixture.debugElement.query(By.css('.thumbnail-area'));
      expect(thumbnail).toBeTruthy();
      
      const viewLabel = fixture.debugElement.query(By.css('.view-label'));
      expect(viewLabel.nativeElement.textContent.trim()).toBe('Map');
    });

    it('should update thumbnail when view changes', () => {
      activeViewSubject.next('map');
      fixture.detectChanges();

      const viewLabel = fixture.debugElement.query(By.css('.view-label'));
      expect(viewLabel.nativeElement.textContent.trim()).toBe('Photo');
    });

    it('should show photo thumbnail image when available', () => {
      // Set up the component to show photo thumbnail
      activeViewSubject.next('map'); // Make map active so photo is inactive
      fixture.detectChanges();
      
      component.photo = mockPhoto;
      component.currentInactiveView = 'photo';
      component['updatePhotoThumbnail']();

      expect(component.getThumbnailImageSrc()).toBe(mockPhoto.url);
    });

    it('should show map thumbnail placeholder', () => {
      component.currentInactiveView = 'map';
      fixture.detectChanges();

      const thumbnailSrc = component.getThumbnailImageSrc();
      expect(thumbnailSrc).toContain('data:image/svg+xml');
    });

    it('should handle thumbnail click', () => {
      spyOn(component, 'onThumbnailClick').and.callThrough();
      
      const thumbnail = fixture.debugElement.query(By.css('.thumbnail-area'));
      thumbnail.nativeElement.click();

      expect(component.onThumbnailClick).toHaveBeenCalled();
      expect(mockInterfaceToggleService.toggleView).toHaveBeenCalled();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should toggle view on "t" key press', () => {
      spyOn(component, 'onToggleClick').and.callThrough();
      
      // Mock the component having focus
      spyOn(component['elementRef'].nativeElement, 'contains').and.returnValue(true);
      
      const event = new KeyboardEvent('keydown', { key: 't' });
      component.onKeyDown(event);

      expect(component.onToggleClick).toHaveBeenCalled();
    });

    it('should switch to photo view on "p" key press', () => {
      component.currentActiveView = 'map';
      
      // Mock the component having focus
      spyOn(component['elementRef'].nativeElement, 'contains').and.returnValue(true);
      
      const event = new KeyboardEvent('keydown', { key: 'p' });
      spyOn(event, 'preventDefault');
      component.onKeyDown(event);

      expect(mockInterfaceToggleService.setActiveView).toHaveBeenCalledWith('photo', 300);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should switch to map view on "m" key press', () => {
      component.currentActiveView = 'photo';
      
      // Mock the component having focus
      spyOn(component['elementRef'].nativeElement, 'contains').and.returnValue(true);
      
      const event = new KeyboardEvent('keydown', { key: 'm' });
      spyOn(event, 'preventDefault');
      component.onKeyDown(event);

      expect(mockInterfaceToggleService.setActiveView).toHaveBeenCalledWith('map', 300);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should reset interface on "Escape" key press', () => {
      // Mock the component having focus
      spyOn(component['elementRef'].nativeElement, 'contains').and.returnValue(true);
      
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      spyOn(event, 'preventDefault');
      component.onKeyDown(event);

      expect(mockInterfaceToggleService.resetInterfaceState).toHaveBeenCalled();
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should handle Enter key on thumbnail', () => {
      const thumbnailElement = fixture.debugElement.query(By.css('.thumbnail-area')).nativeElement;
      spyOn(component, 'onThumbnailClick').and.callThrough();
      
      // Mock the component having focus and thumbnail container containing the target
      spyOn(component['elementRef'].nativeElement, 'contains').and.returnValue(true);
      spyOn(component.thumbnailContainer.nativeElement, 'contains').and.returnValue(true);
      
      // Mock the event target
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      Object.defineProperty(event, 'target', { value: thumbnailElement });
      
      component.onKeyDown(event);

      expect(component.onThumbnailClick).toHaveBeenCalled();
    });

    it('should not handle keys when component does not have focus', () => {
      // Mock document.activeElement to be outside component
      const outsideElement = document.createElement('div');
      Object.defineProperty(document, 'activeElement', {
        value: outsideElement,
        configurable: true
      });
      spyOn(component, 'onToggleClick');
      
      const event = new KeyboardEvent('keydown', { key: 't' });
      component.onKeyDown(event);

      expect(component.onToggleClick).not.toHaveBeenCalled();
    });
  });

  describe('CSS Classes and Styling', () => {
    it('should return correct main container classes', () => {
      const classes = component.getMainContainerClasses();
      expect(classes).toContain('photo-map-toggle-container');
      expect(classes).toContain('active-photo');
    });

    it('should add transitioning class during transition', () => {
      transitionInProgressSubject.next(true);
      fixture.detectChanges();

      const classes = component.getMainContainerClasses();
      expect(classes).toContain('transitioning');
    });

    it('should return correct thumbnail classes', () => {
      const classes = component.getThumbnailClasses();
      expect(classes).toContain('thumbnail-container');
      expect(classes).toContain('thumbnail-map');
    });

    it('should return correct active view classes', () => {
      const classes = component.getActiveViewClasses();
      expect(classes).toContain('active-view');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      const mainContainer = fixture.debugElement.query(By.css('.photo-map-toggle-container'));
      expect(mainContainer.nativeElement.getAttribute('aria-label')).toContain('photograph view container');
      expect(mainContainer.nativeElement.getAttribute('role')).toBe('region');
    });

    it('should have proper thumbnail ARIA label', () => {
      const ariaLabel = component.getThumbnailAriaLabel();
      expect(ariaLabel).toContain('Currently viewing photograph');
      expect(ariaLabel).toContain('Click to switch to map view');
    });

    it('should have proper thumbnail alt text', () => {
      const altText = component.getThumbnailAltText();
      expect(altText).toBe('Switch to map view');
    });

    it('should set aria-hidden correctly for inactive views', () => {
      const photoContainer = fixture.debugElement.query(By.css('.photo-container'));
      const mapContainer = fixture.debugElement.query(By.css('.map-container'));

      expect(photoContainer.nativeElement.getAttribute('aria-hidden')).toBe('false');
      expect(mapContainer.nativeElement.getAttribute('aria-hidden')).toBe('true');
    });

    it('should update aria-hidden when view changes', () => {
      activeViewSubject.next('map');
      fixture.detectChanges();

      const photoContainer = fixture.debugElement.query(By.css('.photo-container'));
      const mapContainer = fixture.debugElement.query(By.css('.map-container'));

      expect(photoContainer.nativeElement.getAttribute('aria-hidden')).toBe('true');
      expect(mapContainer.nativeElement.getAttribute('aria-hidden')).toBe('false');
    });

    it('should have keyboard instructions for screen readers', () => {
      const instructions = fixture.debugElement.query(By.css('.keyboard-instructions'));
      expect(instructions).toBeTruthy();
      expect(instructions.nativeElement.textContent).toContain('Press T to toggle');
    });

    it('should announce transition state', () => {
      transitionInProgressSubject.next(true);
      fixture.detectChanges();

      const liveRegion = fixture.debugElement.query(By.css('[aria-live="polite"]'));
      const spans = liveRegion.queryAll(By.css('span'));
      const transitionSpan = spans.find(span => span.nativeElement.textContent.includes('Switching views'));
      expect(transitionSpan.nativeElement.textContent.trim()).toBe('Switching views...');
    });

    it('should set tabindex correctly based on active view', () => {
      const photoDisplay = fixture.debugElement.query(By.css('app-photo-display'));
      const mapGuess = fixture.debugElement.query(By.css('app-map-guess'));

      expect(photoDisplay.nativeElement.getAttribute('tabindex')).toBe('0');
      expect(mapGuess.nativeElement.getAttribute('tabindex')).toBe('-1');
    });
  });

  describe('State Management', () => {
    it('should emit photoZoomChanged when zoom state changes', () => {
      spyOn(component.photoZoomChanged, 'emit');
      
      const newZoomState: PhotoZoomState = {
        ...defaultPhotoZoomState,
        zoomLevel: 2
      };
      
      photoZoomStateSubject.next(newZoomState);
      fixture.detectChanges();

      expect(component.photoZoomChanged.emit).toHaveBeenCalledWith(newZoomState);
    });

    it('should emit mapStateChanged when map state changes', () => {
      spyOn(component.mapStateChanged, 'emit');
      
      const newMapState: MapState = {
        ...defaultMapState,
        zoomLevel: 5
      };
      
      mapStateSubject.next(newMapState);
      fixture.detectChanges();

      expect(component.mapStateChanged.emit).toHaveBeenCalledWith(newMapState);
    });

    it('should handle transition state changes', () => {
      transitionInProgressSubject.next(true);
      fixture.detectChanges();

      expect(component.isTransitioning).toBe(true);
      expect(component.canPerformToggle).toBe(false);
    });

    it('should handle toggle capability changes', () => {
      canToggleSubject.next(false);
      fixture.detectChanges();

      expect(component.canToggleView).toBe(false);
      expect(component.canPerformToggle).toBe(false);
    });
  });

  describe('Component Properties', () => {
    it('should have correct isPhotoActive getter', () => {
      expect(component.isPhotoActive).toBe(true);
      
      activeViewSubject.next('map');
      fixture.detectChanges();
      
      expect(component.isPhotoActive).toBe(false);
    });

    it('should have correct isMapActive getter', () => {
      expect(component.isMapActive).toBe(false);
      
      activeViewSubject.next('map');
      fixture.detectChanges();
      
      expect(component.isMapActive).toBe(true);
    });

    it('should return correct transition duration', () => {
      component.transitionDuration = 500;
      expect(component.transitionDurationMs).toBe('500ms');
    });

    it('should calculate canPerformToggle correctly', () => {
      expect(component.canPerformToggle).toBe(true);
      
      transitionInProgressSubject.next(true);
      fixture.detectChanges();
      
      expect(component.canPerformToggle).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing photo gracefully', () => {
      // Set up to show photo thumbnail but with no photo
      activeViewSubject.next('map'); // Make map active so photo is inactive
      fixture.detectChanges();
      
      component.photo = null;
      component.currentInactiveView = 'photo';
      component.thumbnailImageSrc = null; // Clear the thumbnail image
      component['updatePhotoThumbnail']();

      expect(component.getThumbnailImageSrc()).toBeNull();
    });

    it('should handle service errors gracefully', () => {
      mockInterfaceToggleService.toggleView.and.returnValue(of('photo'));
      
      expect(() => component.onToggleClick()).not.toThrow();
    });

    it('should handle invalid thumbnail data', () => {
      component.thumbnailData = null;
      
      expect(component.getThumbnailImageSrc()).toBeNull();
      expect(component.getThumbnailAltText()).toBe('Thumbnail');
      expect(component.getThumbnailAriaLabel()).toBe('Toggle view');
    });
  });

  describe('Component Cleanup', () => {
    it('should unsubscribe on destroy', () => {
      spyOn(component['destroy$'], 'next');
      spyOn(component['destroy$'], 'complete');
      
      component.ngOnDestroy();
      
      expect(component['destroy$'].next).toHaveBeenCalled();
      expect(component['destroy$'].complete).toHaveBeenCalled();
    });
  });
});