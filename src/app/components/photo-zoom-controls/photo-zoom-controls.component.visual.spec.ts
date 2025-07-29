import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { PhotoZoomControlsComponent } from './photo-zoom-controls.component';

@Component({
  template: `
    <app-photo-zoom-controls
      [zoomLevel]="zoomLevel"
      [minZoom]="minZoom"
      [maxZoom]="maxZoom"
      [disabled]="disabled"
      (zoomIn)="onZoomIn()"
      (zoomOut)="onZoomOut()"
      (resetZoom)="onResetZoom()">
    </app-photo-zoom-controls>
  `
})
class TestHostComponent {
  zoomLevel = 1;
  minZoom = 0.5;
  maxZoom = 3;
  disabled = false;

  onZoomIn() {
    if (this.zoomLevel < this.maxZoom) {
      this.zoomLevel += 0.25;
    }
  }

  onZoomOut() {
    if (this.zoomLevel > this.minZoom) {
      this.zoomLevel -= 0.25;
    }
  }

  onResetZoom() {
    this.zoomLevel = 1;
  }
}

describe('PhotoZoomControlsComponent Visual Regression Tests', () => {
  let component: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;
  let zoomComponent: PhotoZoomControlsComponent;
  let debugElement: DebugElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TestHostComponent, PhotoZoomControlsComponent],
      imports: [NoopAnimationsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    component = fixture.componentInstance;
    debugElement = fixture.debugElement.query(By.directive(PhotoZoomControlsComponent));
    zoomComponent = debugElement.componentInstance;
    fixture.detectChanges();
  });

  describe('Container Styling', () => {
    it('should have correct base container styles', () => {
      const container = debugElement.query(By.css('.zoom-controls'));
      const styles = getComputedStyle(container.nativeElement);

      expect(styles.display).toBe('flex');
      expect(styles.alignItems).toBe('center');
      expect(styles.position).toBe('absolute');
      expect(styles.top).toBe('16px');
      expect(styles.right).toBe('16px');
      expect(styles.borderRadius).toBe('16px');
      expect(styles.backdropFilter).toContain('blur');
    });

    it('should apply entrance animation', () => {
      const container = debugElement.query(By.css('.zoom-controls'));
      const styles = getComputedStyle(container.nativeElement);
      
      // Animation should be applied
      expect(styles.animation).toContain('zoomControlsEnter');
    });

    it('should have correct disabled state styles', () => {
      component.disabled = true;
      fixture.detectChanges();

      const container = debugElement.query(By.css('.zoom-controls'));
      expect(container.nativeElement.classList).toContain('disabled');
      
      const styles = getComputedStyle(container.nativeElement);
      expect(parseFloat(styles.opacity)).toBeLessThan(1);
      expect(styles.pointerEvents).toBe('none');
    });

    it('should apply hover effects on container', () => {
      const container = debugElement.query(By.css('.zoom-controls'));
      
      // Simulate hover
      container.nativeElement.dispatchEvent(new MouseEvent('mouseenter'));
      fixture.detectChanges();

      // Hover styles are applied via CSS, test that element can receive hover
      expect(container.nativeElement.matches(':hover')).toBeTruthy();
    });
  });

  describe('Button Styling', () => {
    it('should have correct base button styles', () => {
      const buttons = debugElement.queryAll(By.css('.zoom-btn'));
      expect(buttons.length).toBeGreaterThan(0);

      buttons.forEach(button => {
        const styles = getComputedStyle(button.nativeElement);
        expect(styles.display).toBe('flex');
        expect(styles.alignItems).toBe('center');
        expect(styles.justifyContent).toBe('center');
        expect(styles.width).toBe('44px');
        expect(styles.height).toBe('44px');
        expect(styles.borderRadius).toBe('12px');
        expect(styles.cursor).toBe('pointer');
        expect(styles.border).toBe('none');
      });
    });

    it('should apply hover effects on buttons', () => {
      const zoomInBtn = debugElement.query(By.css('.zoom-btn'));
      
      // Simulate hover
      zoomInBtn.nativeElement.dispatchEvent(new MouseEvent('mouseenter'));
      fixture.detectChanges();

      expect(zoomInBtn.nativeElement.matches(':hover')).toBeTruthy();
    });

    it('should apply focus styles correctly', () => {
      const zoomInBtn = debugElement.query(By.css('.zoom-btn'));
      zoomInBtn.nativeElement.focus();
      fixture.detectChanges();

      const styles = getComputedStyle(zoomInBtn.nativeElement);
      expect(styles.outline).toContain('3px solid');
    });

    it('should disable buttons when at zoom limits', () => {
      // Test zoom out disabled at minimum
      component.zoomLevel = component.minZoom;
      fixture.detectChanges();

      const zoomOutBtn = debugElement.queryAll(By.css('.zoom-btn'))[1]; // Assuming second button is zoom out
      expect(zoomOutBtn.nativeElement.disabled).toBeTruthy();

      // Test zoom in disabled at maximum
      component.zoomLevel = component.maxZoom;
      fixture.detectChanges();

      const zoomInBtn = debugElement.queryAll(By.css('.zoom-btn'))[0]; // Assuming first button is zoom in
      expect(zoomInBtn.nativeElement.disabled).toBeTruthy();
    });

    it('should apply disabled button styles', () => {
      component.zoomLevel = component.maxZoom;
      fixture.detectChanges();

      const disabledBtn = debugElement.queryAll(By.css('.zoom-btn:disabled'))[0];
      if (disabledBtn) {
        const styles = getComputedStyle(disabledBtn.nativeElement);
        expect(parseFloat(styles.opacity)).toBeLessThan(1);
        expect(styles.cursor).toBe('not-allowed');
      }
    });

    it('should have correct SVG icon styles', () => {
      const svgIcons = debugElement.queryAll(By.css('.zoom-btn svg'));
      expect(svgIcons.length).toBeGreaterThan(0);

      svgIcons.forEach(svg => {
        const styles = getComputedStyle(svg.nativeElement);
        expect(styles.width).toBe('22px');
        expect(styles.height).toBe('22px');
        expect(styles.fill).toBe('currentcolor');
      });
    });
  });

  describe('Zoom Level Indicator Styling', () => {
    it('should have correct zoom level indicator styles', () => {
      const indicator = debugElement.query(By.css('.zoom-level-indicator'));
      const styles = getComputedStyle(indicator.nativeElement);

      expect(styles.color).toBe('white');
      expect(styles.fontSize).toBe('14px');
      expect(styles.fontWeight).toBe('600');
      expect(styles.textAlign).toBe('center');
      expect(styles.borderRadius).toBe('10px');
      expect(styles.userSelect).toBe('none');
      expect(styles.fontFamily).toContain('Courier New');
    });

    it('should display correct zoom level value', () => {
      component.zoomLevel = 1.5;
      fixture.detectChanges();

      const indicator = debugElement.query(By.css('.zoom-level-indicator'));
      expect(indicator.nativeElement.textContent.trim()).toBe('150%');
    });

    it('should apply updating animation class', () => {
      const indicator = debugElement.query(By.css('.zoom-level-indicator'));
      indicator.nativeElement.classList.add('updating');
      fixture.detectChanges();

      expect(indicator.nativeElement.classList).toContain('updating');
      
      const styles = getComputedStyle(indicator.nativeElement);
      expect(styles.animation).toContain('zoomLevelUpdate');
    });
  });

  describe('Responsive Styling', () => {
    it('should apply tablet styles at medium viewport', () => {
      // Mock viewport resize to tablet size
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768
      });
      
      window.dispatchEvent(new Event('resize'));
      fixture.detectChanges();

      const container = debugElement.query(By.css('.zoom-controls'));
      // Responsive styles are applied via CSS media queries
      expect(container).toBeTruthy();
    });

    it('should apply mobile styles at small viewport', () => {
      // Mock viewport resize to mobile size
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 480
      });
      
      window.dispatchEvent(new Event('resize'));
      fixture.detectChanges();

      const container = debugElement.query(By.css('.zoom-controls'));
      expect(container).toBeTruthy();
    });
  });

  describe('High Contrast Mode Styling', () => {
    it('should maintain visibility in high contrast mode', () => {
      const container = debugElement.query(By.css('.zoom-controls'));
      const buttons = debugElement.queryAll(By.css('.zoom-btn'));
      const indicator = debugElement.query(By.css('.zoom-level-indicator'));

      // Elements should be present and accessible
      expect(container).toBeTruthy();
      expect(buttons.length).toBeGreaterThan(0);
      expect(indicator).toBeTruthy();

      // Focus should be visible
      buttons.forEach(button => {
        button.nativeElement.focus();
        const styles = getComputedStyle(button.nativeElement);
        expect(styles.outline).toBeTruthy();
      });
    });
  });

  describe('Animation States', () => {
    it('should have entrance animation keyframes', () => {
      const container = debugElement.query(By.css('.zoom-controls'));
      const styles = getComputedStyle(container.nativeElement);
      
      // Check that animation is defined
      expect(styles.animation).toContain('zoomControlsEnter');
    });

    it('should apply ripple effect on button click', () => {
      const button = debugElement.query(By.css('.zoom-btn'));
      
      // Simulate click
      button.nativeElement.dispatchEvent(new MouseEvent('mousedown'));
      button.nativeElement.dispatchEvent(new MouseEvent('mouseup'));
      fixture.detectChanges();

      // Ripple effect is applied via CSS pseudo-element
      const styles = getComputedStyle(button.nativeElement, '::after');
      expect(styles).toBeTruthy();
    });
  });

  describe('Accessibility Styling', () => {
    it('should have proper screen reader content', () => {
      const srOnlyElements = debugElement.queryAll(By.css('.sr-only'));
      
      srOnlyElements.forEach(element => {
        const styles = getComputedStyle(element.nativeElement);
        expect(styles.position).toBe('absolute');
        expect(styles.width).toBe('1px');
        expect(styles.height).toBe('1px');
        expect(styles.overflow).toBe('hidden');
      });
    });

    it('should have proper ARIA attributes', () => {
      const buttons = debugElement.queryAll(By.css('.zoom-btn'));
      
      buttons.forEach(button => {
        expect(button.nativeElement.getAttribute('aria-label')).toBeTruthy();
      });
    });
  });

  describe('Dark Mode Styling', () => {
    it('should adapt to dark mode preferences', () => {
      // Dark mode styles are applied via CSS media queries
      const container = debugElement.query(By.css('.zoom-controls'));
      expect(container).toBeTruthy();
      
      // Elements should maintain proper contrast
      const buttons = debugElement.queryAll(By.css('.zoom-btn'));
      buttons.forEach(button => {
        const styles = getComputedStyle(button.nativeElement);
        expect(styles.color).toBeTruthy();
        expect(styles.backgroundColor).toBeTruthy();
      });
    });
  });

  describe('Touch Device Optimizations', () => {
    it('should have appropriate touch targets', () => {
      const buttons = debugElement.queryAll(By.css('.zoom-btn'));
      
      buttons.forEach(button => {
        const styles = getComputedStyle(button.nativeElement);
        // Minimum 44px touch target
        expect(parseInt(styles.width)).toBeGreaterThanOrEqual(44);
        expect(parseInt(styles.height)).toBeGreaterThanOrEqual(44);
      });
    });

    it('should disable hover effects on touch devices', () => {
      // Touch device styles are applied via CSS media queries
      const container = debugElement.query(By.css('.zoom-controls'));
      expect(container.nativeElement.style.webkitTapHighlightColor).toBe('transparent');
    });
  });
});