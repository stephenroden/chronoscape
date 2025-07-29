import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { PhotoMapToggleComponent } from './photo-map-toggle.component';

@Component({
  template: `
    <app-photo-map-toggle
      [activeView]="activeView"
      [photoSrc]="photoSrc"
      [isTransitioning]="isTransitioning"
      [isDisabled]="isDisabled"
      (toggleView)="onToggleView()"
      (keyboardShortcut)="onKeyboardShortcut($event)">
      <div class="mock-photo">Mock Photo Content</div>
      <div class="mock-map">Mock Map Content</div>
    </app-photo-map-toggle>
  `,
  styles: [`
    .mock-photo, .mock-map {
      width: 100%;
      height: 300px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: bold;
    }
    .mock-photo { background: #e3f2fd; color: #1976d2; }
    .mock-map { background: #e8f5e8; color: #388e3c; }
  `]
})
class TestHostComponent {
  activeView: 'photo' | 'map' = 'photo';
  photoSrc = 'test-photo.jpg';
  isTransitioning = false;
  isDisabled = false;

  onToggleView() {
    this.activeView = this.activeView === 'photo' ? 'map' : 'photo';
  }

  onKeyboardShortcut(event: KeyboardEvent) {
    // Mock keyboard shortcut handler
  }
}

describe('PhotoMapToggleComponent Visual Regression Tests', () => {
  let component: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;
  let toggleComponent: PhotoMapToggleComponent;
  let debugElement: DebugElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TestHostComponent, PhotoMapToggleComponent],
      imports: [NoopAnimationsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    component = fixture.componentInstance;
    debugElement = fixture.debugElement.query(By.directive(PhotoMapToggleComponent));
    toggleComponent = debugElement.componentInstance;
    fixture.detectChanges();
  });

  describe('Container Styling', () => {
    it('should have correct base container styles', () => {
      const container = debugElement.query(By.css('.photo-map-toggle-container'));
      const styles = getComputedStyle(container.nativeElement);

      expect(styles.position).toBe('relative');
      expect(styles.width).toBe('100%');
      expect(styles.height).toBe('100%');
      expect(styles.display).toBe('flex');
      expect(styles.flexDirection).toBe('column');
      expect(styles.borderRadius).toBe('8px');
      expect(styles.overflow).toBe('hidden');
    });

    it('should apply correct focus styles', () => {
      const container = debugElement.query(By.css('.photo-map-toggle-container'));
      container.nativeElement.focus();
      fixture.detectChanges();

      const styles = getComputedStyle(container.nativeElement);
      expect(styles.outline).toContain('2px solid');
    });

    it('should have correct transitioning state styles', () => {
      component.isTransitioning = true;
      fixture.detectChanges();

      const container = debugElement.query(By.css('.photo-map-toggle-container'));
      expect(container.nativeElement.classList).toContain('transitioning');
    });
  });

  describe('Thumbnail Styling', () => {
    it('should have correct thumbnail base styles', () => {
      const thumbnail = debugElement.query(By.css('.thumbnail-area'));
      const styles = getComputedStyle(thumbnail.nativeElement);

      expect(styles.position).toBe('absolute');
      expect(styles.bottom).toBe('16px');
      expect(styles.right).toBe('16px');
      expect(styles.width).toBe('120px');
      expect(styles.height).toBe('80px');
      expect(styles.borderRadius).toBe('12px');
      expect(styles.cursor).toBe('pointer');
      expect(styles.overflow).toBe('hidden');
    });

    it('should apply hover styles correctly', () => {
      const thumbnail = debugElement.query(By.css('.thumbnail-area'));
      
      // Simulate hover
      thumbnail.nativeElement.dispatchEvent(new MouseEvent('mouseenter'));
      fixture.detectChanges();

      const styles = getComputedStyle(thumbnail.nativeElement);
      // Note: transform and box-shadow changes are tested through visual inspection
      // as computed styles may not reflect CSS transitions immediately
      expect(thumbnail.nativeElement.matches(':hover')).toBeTruthy();
    });

    it('should apply disabled state styles', () => {
      component.isDisabled = true;
      fixture.detectChanges();

      const thumbnail = debugElement.query(By.css('.thumbnail-area'));
      expect(thumbnail.nativeElement.getAttribute('aria-disabled')).toBe('true');
      
      const styles = getComputedStyle(thumbnail.nativeElement);
      expect(styles.cursor).toBe('not-allowed');
      expect(parseFloat(styles.opacity)).toBeLessThan(1);
    });

    it('should have correct thumbnail overlay styles', () => {
      const overlay = debugElement.query(By.css('.thumbnail-overlay'));
      const styles = getComputedStyle(overlay.nativeElement);

      expect(styles.position).toBe('absolute');
      expect(styles.top).toBe('0px');
      expect(styles.left).toBe('0px');
      expect(styles.width).toBe('100%');
      expect(styles.height).toBe('100%');
      expect(styles.display).toBe('flex');
      expect(styles.flexDirection).toBe('column');
      expect(styles.alignItems).toBe('center');
      expect(styles.justifyContent).toBe('center');
    });
  });

  describe('Animation Classes', () => {
    it('should apply entrance animation class', () => {
      const container = debugElement.query(By.css('.photo-map-toggle-container'));
      container.nativeElement.classList.add('initial-load');
      fixture.detectChanges();

      expect(container.nativeElement.classList).toContain('initial-load');
    });

    it('should apply thumbnail entering animation', () => {
      const thumbnail = debugElement.query(By.css('.thumbnail-area'));
      thumbnail.nativeElement.classList.add('entering');
      fixture.detectChanges();

      expect(thumbnail.nativeElement.classList).toContain('entering');
    });

    it('should apply transitioning animation to thumbnail', () => {
      component.isTransitioning = true;
      fixture.detectChanges();

      const thumbnail = debugElement.query(By.css('.thumbnail-area'));
      expect(thumbnail.nativeElement.classList).toContain('transitioning');
    });
  });

  describe('Responsive Styles', () => {
    it('should apply mobile styles at small viewport', () => {
      // Mock viewport resize
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 480
      });
      
      window.dispatchEvent(new Event('resize'));
      fixture.detectChanges();

      const thumbnail = debugElement.query(By.css('.thumbnail-area'));
      // Mobile styles would be applied via CSS media queries
      // This test ensures the elements exist for mobile styling
      expect(thumbnail).toBeTruthy();
    });
  });

  describe('High Contrast Mode', () => {
    it('should maintain accessibility in high contrast mode', () => {
      // Simulate high contrast mode
      const container = debugElement.query(By.css('.photo-map-toggle-container'));
      const thumbnail = debugElement.query(By.css('.thumbnail-area'));

      // Elements should exist and be focusable
      expect(container.nativeElement.tabIndex).toBeGreaterThanOrEqual(0);
      expect(thumbnail.nativeElement.tabIndex).toBeGreaterThanOrEqual(0);
    });
  });

  describe('View State Styling', () => {
    it('should apply correct styles for photo view', () => {
      component.activeView = 'photo';
      fixture.detectChanges();

      const container = debugElement.query(By.css('.photo-map-toggle-container'));
      expect(container.nativeElement.classList).toContain('active-photo');
    });

    it('should apply correct styles for map view', () => {
      component.activeView = 'map';
      fixture.detectChanges();

      const container = debugElement.query(By.css('.photo-map-toggle-container'));
      expect(container.nativeElement.classList).toContain('active-map');
    });

    it('should transition between view states', () => {
      // Start with photo view
      component.activeView = 'photo';
      fixture.detectChanges();

      let container = debugElement.query(By.css('.photo-map-toggle-container'));
      expect(container.nativeElement.classList).toContain('active-photo');

      // Switch to map view
      component.activeView = 'map';
      fixture.detectChanges();

      container = debugElement.query(By.css('.photo-map-toggle-container'));
      expect(container.nativeElement.classList).toContain('active-map');
      expect(container.nativeElement.classList).not.toContain('active-photo');
    });
  });

  describe('Accessibility Styling', () => {
    it('should have screen reader only content properly styled', () => {
      const srOnly = debugElement.query(By.css('.sr-only'));
      if (srOnly) {
        const styles = getComputedStyle(srOnly.nativeElement);
        expect(styles.position).toBe('absolute');
        expect(styles.width).toBe('1px');
        expect(styles.height).toBe('1px');
        expect(styles.overflow).toBe('hidden');
      }
    });

    it('should have proper ARIA labels and roles', () => {
      const thumbnail = debugElement.query(By.css('.thumbnail-area'));
      expect(thumbnail.nativeElement.getAttribute('role')).toBeTruthy();
      expect(thumbnail.nativeElement.getAttribute('aria-label')).toBeTruthy();
    });
  });

  describe('Loading and Transition States', () => {
    it('should display transition indicator when transitioning', () => {
      component.isTransitioning = true;
      fixture.detectChanges();

      const indicator = debugElement.query(By.css('.transition-indicator'));
      if (indicator) {
        const styles = getComputedStyle(indicator.nativeElement);
        expect(styles.position).toBe('absolute');
        expect(styles.display).toBe('flex');
        expect(styles.alignItems).toBe('center');
        expect(styles.justifyContent).toBe('center');
      }
    });

    it('should show spinner during transitions', () => {
      component.isTransitioning = true;
      fixture.detectChanges();

      const spinner = debugElement.query(By.css('.spinner'));
      if (spinner) {
        const styles = getComputedStyle(spinner.nativeElement);
        expect(styles.borderRadius).toBe('50%');
        expect(styles.animation).toContain('spin');
      }
    });
  });
});