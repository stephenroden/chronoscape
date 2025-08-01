import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, filter, map, startWith, combineLatest } from 'rxjs';
import { AppState } from '../../state/app.state';
import { GameStatus } from '../../models/game-state.model';
import * as GameSelectors from '../../state/game/game.selectors';
import * as GameActions from '../../state/game/game.actions';
import * as ScoringActions from '../../state/scoring/scoring.actions';
import * as PhotosActions from '../../state/photos/photos.actions';
import * as InterfaceActions from '../../state/interface/interface.actions';

/**
 * Interface for breadcrumb items
 */
interface BreadcrumbItem {
  label: string;
  url: string;
  active: boolean;
  disabled?: boolean;
}

/**
 * Navigation component that provides breadcrumb navigation and game progress indicators.
 * Shows current location in the game flow and allows navigation between screens.
 */
@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss']
})
export class NavigationComponent implements OnInit {
  // Game state observables
  gameStatus$: Observable<GameStatus>;
  gameProgress$: Observable<{ current: number; total: number; percentage: number }>;
  
  // Navigation state
  breadcrumbs$: Observable<BreadcrumbItem[]>;
  currentRoute$: Observable<string>;
  shouldShowProgress$: Observable<boolean>;
  
  // Dropdown state
  isDropdownOpen = false;

  constructor(
    private store: Store<AppState>,
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {
    this.gameStatus$ = this.store.select(GameSelectors.selectGameStatus);
    this.gameProgress$ = this.store.select(GameSelectors.selectGameProgress);
    
    // Track current route
    this.currentRoute$ = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map((event: NavigationEnd) => event.url),
      startWith(this.router.url)
    );
    
    // Generate breadcrumbs based on current route and game state
    this.breadcrumbs$ = this.currentRoute$.pipe(
      map(url => this.generateBreadcrumbs(url))
    );
    
    // Determine when to show progress indicator
    this.shouldShowProgress$ = combineLatest([
      this.gameProgress$,
      this.currentRoute$
    ]).pipe(
      map(([progress, route]) => !!progress && route === '/game')
    );
  }

  ngOnInit(): void {
    // Component initialization logic if needed
  }

  /**
   * Generates breadcrumb items based on current URL and game state
   */
  private generateBreadcrumbs(url: string): BreadcrumbItem[] {
    const breadcrumbs: BreadcrumbItem[] = [];
    
    // Always include home/start
    breadcrumbs.push({
      label: 'Start',
      url: '/',
      active: url === '/',
      disabled: false
    });
    
    // Add game breadcrumb if on game or results page
    if (url === '/game' || url === '/results') {
      breadcrumbs.push({
        label: 'Game',
        url: '/game',
        active: url === '/game',
        disabled: url === '/results' // Disable if on results to prevent going back
      });
    }
    
    // Add results breadcrumb if on results page
    if (url === '/results') {
      breadcrumbs.push({
        label: 'Results',
        url: '/results',
        active: true,
        disabled: false
      });
    }
    
    return breadcrumbs;
  }

  /**
   * Navigates to the specified route if not disabled
   */
  navigateTo(breadcrumb: BreadcrumbItem): void {
    if (!breadcrumb.disabled && !breadcrumb.active) {
      // Check if navigation should be confirmed for active games
      if (breadcrumb.url === '/') {
        this.gameStatus$.pipe(
          map(status => status === GameStatus.IN_PROGRESS)
        ).subscribe(inProgress => {
          if (inProgress) {
            if (confirm('You have an active game in progress. Are you sure you want to leave? Your progress will be lost.')) {
              this.router.navigate([breadcrumb.url]);
            }
          } else {
            this.router.navigate([breadcrumb.url]);
          }
        });
      } else {
        this.router.navigate([breadcrumb.url]);
      }
    }
  }

  /**
   * Gets the appropriate ARIA label for breadcrumb navigation
   */
  getBreadcrumbAriaLabel(breadcrumb: BreadcrumbItem): string {
    if (breadcrumb.active) {
      return `Current page: ${breadcrumb.label}`;
    }
    if (breadcrumb.disabled) {
      return `${breadcrumb.label} (unavailable)`;
    }
    return `Navigate to ${breadcrumb.label}`;
  }

  /**
   * Gets CSS classes for breadcrumb items
   */
  getBreadcrumbClasses(breadcrumb: BreadcrumbItem): string {
    const classes = ['breadcrumb-item'];
    
    if (breadcrumb.active) {
      classes.push('active');
    }
    if (breadcrumb.disabled) {
      classes.push('disabled');
    }
    
    return classes.join(' ');
  }

  /**
   * Formats the game progress for display
   */
  formatGameProgress(progress: { current: number; total: number; percentage: number } | null): string {
    if (!progress) return '';
    
    return `Photo ${progress.current} of ${progress.total}`;
  }

  /**
   * Formats the game progress for mobile display (simplified format)
   */
  formatGameProgressMobile(progress: { current: number; total: number; percentage: number } | null): string {
    if (!progress) return '';
    return `${progress.current} / ${progress.total}`;
  }

  /**
   * Toggle dropdown menu open/closed
   */
  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  /**
   * Close dropdown menu
   */
  closeDropdown(): void {
    this.isDropdownOpen = false;
  }

  /**
   * Start a new game
   */
  startNewGame(): void {
    console.log('[NavigationComponent] Starting new game');
    this.closeDropdown();
    
    // Reset all game state completely
    this.store.dispatch(GameActions.resetGame());
    this.store.dispatch(ScoringActions.resetScores());
    this.store.dispatch(ScoringActions.clearCurrentGuess());
    this.store.dispatch(PhotosActions.clearPhotos());
    this.store.dispatch(InterfaceActions.resetInterfaceState());
    
    this.router.navigate(['/']);
  }



  /**
   * Close dropdown when clicking outside
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const dropdownContainer = target.closest('.dropdown-container');
    
    // If click is outside dropdown container, close the dropdown
    if (!dropdownContainer && this.isDropdownOpen) {
      this.closeDropdown();
    }
  }
}