import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Subject, takeUntil, take } from 'rxjs';
import { CommonModule } from '@angular/common';

import { AppState } from '../../state/app.state';
import { setCurrentGuess } from '../../state/scoring/scoring.actions';
import { validateYearGuess } from '../../models/scoring.model';
import { selectCurrentGuess } from '../../state/scoring/scoring.selectors';

@Component({
  selector: 'app-year-guess',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './year-guess.component.html',
  styleUrls: ['./year-guess.component.scss']
})
export class YearGuessComponent implements OnInit, OnDestroy {
  yearForm: FormGroup;
  currentYear = new Date().getFullYear();
  minYear = 1900;
  selectedYear: number;
  yearChangeAnnouncement = '';
  private destroy$ = new Subject<void>();
  private announcementTimeout: any;

  constructor(
    private fb: FormBuilder,
    private store: Store<AppState>
  ) {
    // Set default year to middle of range for better UX
    this.selectedYear = Math.floor((this.minYear + this.currentYear) / 2);
    
    this.yearForm = this.fb.group({
      year: [this.selectedYear, [
        Validators.required,
        Validators.min(this.minYear),
        Validators.max(this.currentYear)
      ]]
    });
  }

  ngOnInit(): void {
    // Subscribe to current guess to populate form if year is already set
    this.store.select(selectCurrentGuess)
      .pipe(takeUntil(this.destroy$))
      .subscribe(guess => {
        if (guess?.year && this.selectedYear !== guess.year) {
          this.selectedYear = guess.year;
          this.yearForm.patchValue({ year: guess.year });
        } else if (guess?.year === 1966 && this.selectedYear !== 1966) {
          // Handle reset to 1966 (requirement 5.1)
          this.selectedYear = 1966;
          this.yearForm.patchValue({ year: 1966 });
        }
      });
    
    // Initialize with default year guess
    this.onYearChange();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    if (this.announcementTimeout) {
      clearTimeout(this.announcementTimeout);
    }
  }

  onSliderChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const year = parseInt(target.value, 10);
    
    this.selectedYear = year;
    this.yearForm.patchValue({ year });
    
    if (validateYearGuess(year)) {
      // Get the current guess to preserve existing coordinates
      this.store.select(selectCurrentGuess).pipe(take(1)).subscribe(currentGuess => {
        this.store.dispatch(setCurrentGuess({
          guess: {
            year,
            coordinates: currentGuess?.coordinates || { latitude: 0, longitude: 0 }
          }
        }));
      });
    }
  }

  onYearChange(): void {
    const yearValue = this.yearForm.get('year')?.value;
    
    if (yearValue && this.yearForm.get('year')?.valid) {
      const year = parseInt(yearValue, 10);
      
      if (validateYearGuess(year)) {
        // Get the current guess to preserve existing coordinates
        this.store.select(selectCurrentGuess).pipe(take(1)).subscribe(currentGuess => {
          this.store.dispatch(setCurrentGuess({
            guess: {
              year,
              coordinates: currentGuess?.coordinates || { latitude: 0, longitude: 0 }
            }
          }));
        });
      }
    }
  }

  onSubmit(): void {
    if (this.yearForm.valid) {
      this.onYearChange();
    } else {
      // Mark all fields as touched to show validation errors
      this.yearForm.markAllAsTouched();
    }
  }

  get yearControl() {
    return this.yearForm.get('year');
  }

  get yearRange(): number {
    return this.currentYear - this.minYear;
  }

  get yearPercentage(): number {
    return ((this.selectedYear - this.minYear) / this.yearRange) * 100;
  }

  // Helper methods for slider tick marks
  getDecadeMarks(): number[] {
    const marks: number[] = [];
    const startDecade = Math.ceil(this.minYear / 10) * 10;
    
    for (let year = startDecade; year <= this.currentYear; year += 10) {
      marks.push(year);
    }
    
    return marks;
  }

  getDecadePosition(year: number): number {
    return ((year - this.minYear) / this.yearRange) * 100;
  }

  get isYearValid(): boolean {
    const control = this.yearControl;
    return control ? control.valid && control.touched : false;
  }

  get showYearError(): boolean {
    const control = this.yearControl;
    return control ? control.invalid && control.touched : false;
  }

  /**
   * Enhanced keyboard navigation for the year slider
   * Supports arrow keys, Shift+arrow for larger jumps, Home/End keys, and accessibility shortcuts
   */
  onKeyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLInputElement;
    let newYear = this.selectedYear;
    let handled = false;
    let announcement = '';

    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        const leftStep = event.shiftKey ? 10 : 1;
        newYear = Math.max(this.minYear, this.selectedYear - leftStep);
        announcement = `Year decreased to ${newYear}`;
        handled = true;
        break;
        
      case 'ArrowRight':
      case 'ArrowUp':
        const rightStep = event.shiftKey ? 10 : 1;
        newYear = Math.min(this.currentYear, this.selectedYear + rightStep);
        announcement = `Year increased to ${newYear}`;
        handled = true;
        break;
        
      case 'Home':
        newYear = this.minYear;
        announcement = `Year set to minimum: ${newYear}`;
        handled = true;
        break;
        
      case 'End':
        newYear = this.currentYear;
        announcement = `Year set to maximum: ${newYear}`;
        handled = true;
        break;
        
      case 'PageUp':
        newYear = Math.min(this.currentYear, this.selectedYear + 10);
        announcement = `Year increased by 10 to ${newYear}`;
        handled = true;
        break;
        
      case 'PageDown':
        newYear = Math.max(this.minYear, this.selectedYear - 10);
        announcement = `Year decreased by 10 to ${newYear}`;
        handled = true;
        break;
        
      case '+':
      case '=':
        newYear = Math.min(this.currentYear, this.selectedYear + 1);
        announcement = `Year increased to ${newYear}`;
        handled = true;
        break;
        
      case '-':
        newYear = Math.max(this.minYear, this.selectedYear - 1);
        announcement = `Year decreased to ${newYear}`;
        handled = true;
        break;
        
      case 'h':
      case 'H':
        if (event.ctrlKey || event.metaKey) {
          this.announceKeyboardShortcuts();
          handled = true;
        }
        break;
        
      case '?':
        this.announceKeyboardShortcuts();
        handled = true;
        break;
    }

    if (handled) {
      event.preventDefault();
      event.stopPropagation();
      
      if (newYear !== this.selectedYear) {
        this.selectedYear = newYear;
        target.value = newYear.toString();
        this.yearForm.patchValue({ year: newYear });
        
        // Announce the change
        this.announceYearChange(announcement);
        
        // Update the store with the new year
        if (validateYearGuess(newYear)) {
          // Get the current guess to preserve existing coordinates
          this.store.select(selectCurrentGuess).pipe(take(1)).subscribe(currentGuess => {
            this.store.dispatch(setCurrentGuess({
              guess: {
                year: newYear,
                coordinates: currentGuess?.coordinates || { latitude: 0, longitude: 0 }
              }
            }));
          });
        }
      }
    }
  }

  /**
   * Announce keyboard shortcuts to screen readers
   */
  private announceKeyboardShortcuts(): void {
    const shortcuts = [
      'Year slider keyboard shortcuts:',
      'Arrow keys: Adjust by 1 year',
      'Shift + arrows: Adjust by 10 years',
      'Page Up/Down: Adjust by 10 years',
      'Plus/Minus: Fine adjustment',
      'Home: Go to 1900',
      `End: Go to ${this.currentYear}`,
      'Question mark: Show this help'
    ].join('. ');
    
    this.announceToScreenReader(shortcuts);
  }

  /**
   * Announce year changes to screen readers
   */
  private announceYearChange(message: string): void {
    this.yearChangeAnnouncement = message;
    
    // Clear previous timeout
    if (this.announcementTimeout) {
      clearTimeout(this.announcementTimeout);
    }
    
    // Clear announcement after a short delay
    this.announcementTimeout = setTimeout(() => {
      this.yearChangeAnnouncement = '';
    }, 1500);
  }

  /**
   * Announce message to screen readers
   */
  private announceToScreenReader(message: string): void {
    // Create a temporary element for screen reader announcements
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // Remove after announcement
    setTimeout(() => {
      if (document.body.contains(announcement)) {
        document.body.removeChild(announcement);
      }
    }, 1000);
  }

  /**
   * Get contextual information about a year for screen readers
   */
  getYearContext(year: number): string {
    if (year < 1920) {
      return 'Early 20th century period.';
    } else if (year < 1940) {
      return 'Inter-war period.';
    } else if (year < 1950) {
      return 'World War II era.';
    } else if (year < 1970) {
      return 'Post-war period.';
    } else if (year < 1990) {
      return 'Late 20th century.';
    } else if (year < 2010) {
      return 'Turn of the millennium.';
    } else {
      return 'Modern era.';
    }
  }
}