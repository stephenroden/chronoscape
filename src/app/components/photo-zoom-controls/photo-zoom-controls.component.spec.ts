import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BehaviorSubject } from 'rxjs';
import { PhotoZoomControlsComponent } from './photo-zoom-controls.component';
import { PhotoZoomService, PhotoZoomState } from '../../services/photo-zoom.service';

describe('PhotoZoomControlsComponent', () => {
  let component: PhotoZoomControlsComponent;
  let fixture: ComponentFixture<PhotoZoomControlsComponent>;
  let mockPhotoZoomService: jasmine.SpyObj<PhotoZoomService>;
  let zoomStateSubject: BehaviorSubject<PhotoZoomState>;

  const mockZoomState: PhotoZoomState = {
    zoomLevel: 1,
    position: { x: 0, y: 0 },
    minZoom: 1,
    maxZoom: 5,
    containerWidth: 800,
    containerHeight: 600,
    imageWidth: 1200,
    imageHeight: 900
  };

  beforeEach(async () => {
    zoomStateSubject = new BehaviorSubject<PhotoZoomState>(mockZoomState);
    
    mockPhotoZoomService = jasmine.createSpyObj('PhotoZoomService', [
      'zoomIn',
      'zoomOut',
      'reset',
      'canZoomIn',
      'canZoomOut'
    ], {
      zoomState$: zoomStateSubject.asObservable()
    });

    mockPhotoZoomService.canZoomIn.and.returnValue(true);
    mockPhotoZoomService.canZoomOut.and.returnValue(false);

    await TestBed.configureTestingModule({
      imports: [PhotoZoomControlsComponent],
      providers: [
        { provide: PhotoZoomService, useValue: mockPhotoZoomService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PhotoZoomControlsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      expect(component.currentZoomLevel).toBe(1);
      expect(component.canZoomIn).toBe(true);
      expect(component.canZoomOut).toBe(false);
      expect(component.disabled).toBe(false);
    });

    it('should subscribe to zoom state changes', () => {
      const newState: PhotoZoomState = {
        ...mockZoomState,
        zoomLevel: 2.5
      };
      
      mockPhotoZoomService.canZoomIn.and.returnValue(true);
      mockPhotoZoomService.canZoomOut.and.returnValue(true);
      
      zoomStateSubject.next(newState);
      
      expect(component.currentZoomLevel).toBe(2.5);
      expect(component.canZoomIn).toBe(true);
      expect(component.canZoomOut).toBe(true);
    });

    it('should round zoom level to one decimal place', () => {
      const newState: PhotoZoomState = {
        ...mockZoomState,
        zoomLevel: 2.3456789
      };
      
      zoomStateSubject.next(newState);
      
      expect(component.currentZoomLevel).toBe(2.3);
    });
  });

  describe('zoom in functionality', () => {
    it('should call zoom in service method when button clicked', () => {
      mockPhotoZoomService.zoomIn.and.returnValue(true);
      
      const zoomInButton = fixture.debugElement.query(By.css('.zoom-in'));
      zoomInButton.nativeElement.click();
      
      expect(mockPhotoZoomService.zoomIn).toHaveBeenCalled();
    });

    it('should emit zoom in event when button clicked', () => {
      spyOn(component.zoomIn, 'emit');
      mockPhotoZoomService.zoomIn.and.returnValue(true);
      
      component.onZoomIn();
      
      expect(component.zoomIn.emit).toHaveBeenCalled();
    });

    it('should disable zoom in button when cannot zoom in', () => {
      mockPhotoZoomService.canZoomIn.and.returnValue(false);
      component.canZoomIn = false;
      fixture.detectChanges();
      
      const zoomInButton = fixture.debugElement.query(By.css('.zoom-in'));
      expect(zoomInButton.nativeElement.disabled).toBe(true);
    });

    it('should not zoom in when disabled', () => {
      component.disabled = true;
      
      component.onZoomIn();
      
      expect(mockPhotoZoomService.zoomIn).not.toHaveBeenCalled();
    });

    it('should not zoom in when cannot zoom in', () => {
      component.canZoomIn = false;
      
      component.onZoomIn();
      
      expect(mockPhotoZoomService.zoomIn).not.toHaveBeenCalled();
    });
  });

  describe('zoom out functionality', () => {
    beforeEach(() => {
      mockPhotoZoomService.canZoomOut.and.returnValue(true);
      component.canZoomOut = true;
      fixture.detectChanges();
    });

    it('should call zoom out service method when button clicked', () => {
      mockPhotoZoomService.zoomOut.and.returnValue(true);
      
      const zoomOutButton = fixture.debugElement.query(By.css('.zoom-out'));
      zoomOutButton.nativeElement.click();
      
      expect(mockPhotoZoomService.zoomOut).toHaveBeenCalled();
    });

    it('should emit zoom out event when button clicked', () => {
      spyOn(component.zoomOut, 'emit');
      mockPhotoZoomService.zoomOut.and.returnValue(true);
      
      component.onZoomOut();
      
      expect(component.zoomOut.emit).toHaveBeenCalled();
    });

    it('should disable zoom out button when cannot zoom out', () => {
      mockPhotoZoomService.canZoomOut.and.returnValue(false);
      component.canZoomOut = false;
      fixture.detectChanges();
      
      const zoomOutButton = fixture.debugElement.query(By.css('.zoom-out'));
      expect(zoomOutButton.nativeElement.disabled).toBe(true);
    });

    it('should not zoom out when disabled', () => {
      component.disabled = true;
      
      component.onZoomOut();
      
      expect(mockPhotoZoomService.zoomOut).not.toHaveBeenCalled();
    });

    it('should not zoom out when cannot zoom out', () => {
      component.canZoomOut = false;
      
      component.onZoomOut();
      
      expect(mockPhotoZoomService.zoomOut).not.toHaveBeenCalled();
    });
  });

  describe('reset functionality', () => {
    it('should call reset service method when button clicked', () => {
      const resetButton = fixture.debugElement.query(By.css('.zoom-reset'));
      resetButton.nativeElement.click();
      
      expect(mockPhotoZoomService.reset).toHaveBeenCalled();
    });

    it('should emit reset event when button clicked', () => {
      spyOn(component.reset, 'emit');
      
      component.onReset();
      
      expect(component.reset.emit).toHaveBeenCalled();
    });

    it('should disable reset button when at minimum zoom', () => {
      component.currentZoomLevel = 1;
      fixture.detectChanges();
      
      const resetButton = fixture.debugElement.query(By.css('.zoom-reset'));
      expect(resetButton.nativeElement.disabled).toBe(true);
    });

    it('should enable reset button when zoomed in', () => {
      component.currentZoomLevel = 2;
      fixture.detectChanges();
      
      const resetButton = fixture.debugElement.query(By.css('.zoom-reset'));
      expect(resetButton.nativeElement.disabled).toBe(false);
    });

    it('should not reset when disabled', () => {
      component.disabled = true;
      
      component.onReset();
      
      expect(mockPhotoZoomService.reset).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels for buttons', () => {
      component.currentZoomLevel = 2;
      fixture.detectChanges();
      
      const zoomInButton = fixture.debugElement.query(By.css('.zoom-in'));
      const zoomOutButton = fixture.debugElement.query(By.css('.zoom-out'));
      const resetButton = fixture.debugElement.query(By.css('.zoom-reset'));
      
      expect(zoomInButton.nativeElement.getAttribute('aria-label')).toContain('Zoom in (current level: 2x)');
      expect(zoomOutButton.nativeElement.getAttribute('aria-label')).toContain('Zoom out (current level: 2x)');
      expect(resetButton.nativeElement.getAttribute('aria-label')).toContain('Reset zoom to original size (current level: 2x)');
    });

    it('should have toolbar role on container', () => {
      const container = fixture.debugElement.query(By.css('.zoom-controls'));
      expect(container.nativeElement.getAttribute('role')).toBe('toolbar');
      expect(container.nativeElement.getAttribute('aria-label')).toBe('Photo zoom controls');
    });

    it('should have live region for zoom level indicator', () => {
      const indicator = fixture.debugElement.query(By.css('.zoom-level-indicator'));
      expect(indicator.nativeElement.getAttribute('aria-live')).toBe('polite');
      expect(indicator.nativeElement.getAttribute('aria-label')).toBe('Current zoom level');
    });

    it('should have screen reader text for buttons', () => {
      const zoomInButton = fixture.debugElement.query(By.css('.zoom-in .sr-only'));
      const zoomOutButton = fixture.debugElement.query(By.css('.zoom-out .sr-only'));
      const resetButton = fixture.debugElement.query(By.css('.zoom-reset .sr-only'));
      
      expect(zoomInButton.nativeElement.textContent).toBe('Zoom in');
      expect(zoomOutButton.nativeElement.textContent).toBe('Zoom out');
      expect(resetButton.nativeElement.textContent).toBe('Reset zoom');
    });
  });

  describe('visual states', () => {
    it('should display current zoom level', () => {
      component.currentZoomLevel = 2.5;
      fixture.detectChanges();
      
      const indicator = fixture.debugElement.query(By.css('.zoom-level-indicator'));
      expect(indicator.nativeElement.textContent.trim()).toBe('2.5x');
    });

    it('should add disabled class when disabled', () => {
      component.disabled = true;
      fixture.detectChanges();
      
      const container = fixture.debugElement.query(By.css('.zoom-controls'));
      expect(container.nativeElement.classList).toContain('disabled');
    });

    it('should not add disabled class when enabled', () => {
      component.disabled = false;
      fixture.detectChanges();
      
      const container = fixture.debugElement.query(By.css('.zoom-controls'));
      expect(container.nativeElement.classList).not.toContain('disabled');
    });
  });

  describe('button states', () => {
    it('should update button states based on zoom capabilities', () => {
      // At max zoom
      mockPhotoZoomService.canZoomIn.and.returnValue(false);
      mockPhotoZoomService.canZoomOut.and.returnValue(true);
      
      const newState: PhotoZoomState = {
        ...mockZoomState,
        zoomLevel: 5
      };
      
      zoomStateSubject.next(newState);
      fixture.detectChanges();
      
      const zoomInButton = fixture.debugElement.query(By.css('.zoom-in'));
      const zoomOutButton = fixture.debugElement.query(By.css('.zoom-out'));
      
      expect(zoomInButton.nativeElement.disabled).toBe(true);
      expect(zoomOutButton.nativeElement.disabled).toBe(false);
    });

    it('should handle intermediate zoom levels', () => {
      mockPhotoZoomService.canZoomIn.and.returnValue(true);
      mockPhotoZoomService.canZoomOut.and.returnValue(true);
      
      const newState: PhotoZoomState = {
        ...mockZoomState,
        zoomLevel: 2.5
      };
      
      zoomStateSubject.next(newState);
      fixture.detectChanges();
      
      const zoomInButton = fixture.debugElement.query(By.css('.zoom-in'));
      const zoomOutButton = fixture.debugElement.query(By.css('.zoom-out'));
      const resetButton = fixture.debugElement.query(By.css('.zoom-reset'));
      
      expect(zoomInButton.nativeElement.disabled).toBe(false);
      expect(zoomOutButton.nativeElement.disabled).toBe(false);
      expect(resetButton.nativeElement.disabled).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should unsubscribe on destroy', () => {
      spyOn(component['subscriptions'], 'unsubscribe');
      
      component.ngOnDestroy();
      
      expect(component['subscriptions'].unsubscribe).toHaveBeenCalled();
    });
  });
});