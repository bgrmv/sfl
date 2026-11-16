import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  filterPlayerOptions,
  PlayerOption,
  PlayersAutocompleteComponent,
} from './players-autocomplete.component';

const OPTIONS: PlayerOption[] = [
  { id: '1', nickname: 'Bomber', number: 9, name: 'Ivan', selected: true },
  { id: '2', nickname: 'Wall', number: 1, surname: 'Petrov', selected: false },
];

describe('filterPlayerOptions', () => {
  it('returns all options for an empty query', () => {
    expect(filterPlayerOptions(OPTIONS, '  ')).toEqual(OPTIONS);
  });

  it('matches nickname, name, surname and number', () => {
    expect(filterPlayerOptions(OPTIONS, 'bomb').map(o => o.id)).toEqual(['1']);
    expect(filterPlayerOptions(OPTIONS, 'ivan').map(o => o.id)).toEqual(['1']);
    expect(filterPlayerOptions(OPTIONS, 'petr').map(o => o.id)).toEqual(['2']);
    expect(filterPlayerOptions(OPTIONS, '9').map(o => o.id)).toEqual(['1']);
  });
});

describe('PlayersAutocompleteComponent', () => {
  let component: PlayersAutocompleteComponent;
  let fixture: ComponentFixture<PlayersAutocompleteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlayersAutocompleteComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();

    fixture = TestBed.createComponent(PlayersAutocompleteComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('options', OPTIONS);
    fixture.detectChanges();
  });

  it('shows the selected options as chips and emits the removal', () => {
    const removed: string[] = [];
    component.removed.subscribe(id => removed.push(id));

    expect(fixture.nativeElement.querySelectorAll('mat-chip-row').length).toBe(
      1,
    );
    fixture.nativeElement
      .querySelector('mat-chip-row button[matChipRemove]')
      .click();

    expect(removed).toEqual(['1']);
  });
});
