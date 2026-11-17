import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RATING_SYSTEM_KEY, RatingSystemStore } from './rating-system.store';

describe('RatingSystemStore', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('starts with the ancient system: the old rating stays the default', () => {
    expect(TestBed.inject(RatingSystemStore).system()).toBe('Ancient');
  });

  it('keeps the choice for the next visit', () => {
    TestBed.inject(RatingSystemStore).choose('Positional');
    expect(localStorage.getItem(RATING_SYSTEM_KEY)).toBe('Positional');

    TestBed.resetTestingModule();
    expect(TestBed.inject(RatingSystemStore).system()).toBe('Positional');
  });

  it('ignores a stored value it does not know', () => {
    localStorage.setItem(RATING_SYSTEM_KEY, 'Hacked');
    expect(TestBed.inject(RatingSystemStore).system()).toBe('Ancient');
  });

  it('works when the storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const store = TestBed.inject(RatingSystemStore);
    store.choose('Positional');
    expect(store.system()).toBe('Positional');
  });
});
