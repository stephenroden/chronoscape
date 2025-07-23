import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Subject, takeUntil } from 'rxjs';
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
  private destroy$ = new Subject<void>();

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
        }
      });
    
    // Initialize with default year guess
    this.onYearChange();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSliderChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const year = parseInt(target.value, 10);
    
    this.selectedYear = year;
    this.yearForm.patchValue({ year });
    
    if (validateYearGuess(year)) {
      // Dispatch action to update current guess with year
      // We'll use a placeholder for coordinates since this component only handles year
      this.store.dispatch(setCurrentGuess({
        guess: {
          year,
          coordinates: { latitude: 0, longitude: 0 } // Placeholder, will be updated by map component
        }
      }));
    }
  }

  onYearChange(): void {
    const yearValue = this.yearForm.get('year')?.value;
    
    if (yearValue && this.yearForm.get('year')?.valid) {
      const year = parseInt(yearValue, 10);
      
      if (validateYearGuess(year)) {
        // Dispatch action to update current guess with year
        // We'll use a placeholder for coordinates since this component only handles year
        this.store.dispatch(setCurrentGuess({
          guess: {
            year,
            coordinates: { latitude: 0, longitude: 0 } // Placeholder, will be updated by map component
          }
        }));
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
}