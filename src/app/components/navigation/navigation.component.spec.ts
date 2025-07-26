import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { of, Subject } from 'rxjs';
import { NavigationComponent } from './navigation.component';
import { GameStatus } from '../../models/game-state.model';

describe('NavigationComponent', () => {
  let component: NavigationComponent;
  let fixture: ComponentFixture<NavigationComponent>;
  let mockStore: jasmine.SpyObj<Store>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockActivatedRoute: jasmine.SpyObj<ActivatedRoute>;
  let routerEventsSubject: Subject<any>;

  beforeEach(async () => {
    const storeSpy = jasmine.createSpyObj('Store', ['select']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const activatedRouteSpy = jasmine.createSpyObj('ActivatedRoute', ['']);

    routerEventsSubject = new Subject();
    Object.defineProperty(routerSpy, 'events', {
      value: routerEventsSubject.asObservable()
    });
    Object.defineProperty(routerSpy, 'url', {
      value: '/',
      writable: true
    });

    await TestBed.configureTestingModule({
      imports: [NavigationComponent],
      providers: [
        { provide: Store, useValue: storeSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: activatedRouteSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NavigationComponent);
    component = fixture.componentInstance;
    mockStore = TestBed.inject(Store) as jasmine.SpyObj<Store>;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    mockActivatedRoute = TestBed.inject(ActivatedRoute) as jasmine.SpyObj<ActivatedRoute>;

    // Setup default store selectors
    mockStore.select.and.callFake((selector: any) => {
      if (selector.toString().includes('GameStatus')) {
        return of(GameStatus.NOT_STARTED);
      }
      if (selector.toString().includes('GameProgress')) {
        return of({ current: 1, total: 5, percentage: 20 });
      }
      return of(null);
    });

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should generate breadcrumbs for start screen', () => {
    const breadcrumbs = (component as any).generateBreadcrumbs('/');
    expect(breadcrumbs).toEqual([
      { label: 'Start', url: '/', active: true, disabled: false }
    ]);
  });

  it('should generate breadcrumbs for game screen', () => {
    const breadcrumbs = (component as any).generateBreadcrumbs('/game');
    expect(breadcrumbs).toEqual([
      { label: 'Start', url: '/', active: false, disabled: false },
      { label: 'Game', url: '/game', active: true, disabled: false }
    ]);
  });

  it('should generate breadcrumbs for results screen', () => {
    const breadcrumbs = (component as any).generateBreadcrumbs('/results');
    expect(breadcrumbs).toEqual([
      { label: 'Start', url: '/', active: false, disabled: false },
      { label: 'Game', url: '/game', active: false, disabled: true },
      { label: 'Results', url: '/results', active: true, disabled: false }
    ]);
  });

  it('should navigate to breadcrumb when not disabled or active', (done) => {
    const breadcrumb = { label: 'Game', url: '/game', active: false, disabled: false };
    
    component.navigateTo(breadcrumb);
    
    setTimeout(() => {
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/game']);
      done();
    }, 0);
  });

  it('should not navigate when breadcrumb is active', () => {
    const breadcrumb = { label: 'Game', url: '/game', active: true, disabled: false };
    
    component.navigateTo(breadcrumb);
    
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('should not navigate when breadcrumb is disabled', () => {
    const breadcrumb = { label: 'Game', url: '/game', active: false, disabled: true };
    
    component.navigateTo(breadcrumb);
    
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('should show confirmation when navigating away from active game', fakeAsync(() => {
    // Override the gameStatus$ observable directly
    (component as any).gameStatus$ = of(GameStatus.IN_PROGRESS);
    spyOn(window, 'confirm').and.returnValue(true);
    
    const breadcrumb = { label: 'Start', url: '/', active: false, disabled: false };
    
    component.navigateTo(breadcrumb);
    tick();
    
    expect(window.confirm).toHaveBeenCalledWith(
      'You have an active game in progress. Are you sure you want to leave? Your progress will be lost.'
    );
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
  }));

  it('should not navigate when user cancels confirmation', fakeAsync(() => {
    // Override the gameStatus$ observable directly
    (component as any).gameStatus$ = of(GameStatus.IN_PROGRESS);
    spyOn(window, 'confirm').and.returnValue(false);
    
    const breadcrumb = { label: 'Start', url: '/', active: false, disabled: false };
    
    component.navigateTo(breadcrumb);
    tick();
    
    expect(window.confirm).toHaveBeenCalled();
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  }));

  it('should get correct ARIA label for active breadcrumb', () => {
    const breadcrumb = { label: 'Game', url: '/game', active: true, disabled: false };
    
    const ariaLabel = component.getBreadcrumbAriaLabel(breadcrumb);
    
    expect(ariaLabel).toBe('Current page: Game');
  });

  it('should get correct ARIA label for disabled breadcrumb', () => {
    const breadcrumb = { label: 'Game', url: '/game', active: false, disabled: true };
    
    const ariaLabel = component.getBreadcrumbAriaLabel(breadcrumb);
    
    expect(ariaLabel).toBe('Game (unavailable)');
  });

  it('should get correct ARIA label for clickable breadcrumb', () => {
    const breadcrumb = { label: 'Start', url: '/', active: false, disabled: false };
    
    const ariaLabel = component.getBreadcrumbAriaLabel(breadcrumb);
    
    expect(ariaLabel).toBe('Navigate to Start');
  });

  it('should get correct CSS classes for breadcrumb states', () => {
    expect(component.getBreadcrumbClasses({ label: 'Test', url: '/', active: true, disabled: false }))
      .toBe('breadcrumb-item active');
    
    expect(component.getBreadcrumbClasses({ label: 'Test', url: '/', active: false, disabled: true }))
      .toBe('breadcrumb-item disabled');
    
    expect(component.getBreadcrumbClasses({ label: 'Test', url: '/', active: false, disabled: false }))
      .toBe('breadcrumb-item');
  });

  it('should format game progress correctly', () => {
    const progress = { current: 3, total: 5, percentage: 60 };
    
    const formatted = component.formatGameProgress(progress);
    
    expect(formatted).toBe('Photo 3 of 5');
  });

  it('should handle null progress', () => {
    const formatted = component.formatGameProgress(null);
    
    expect(formatted).toBe('');
  });
});