import { METADATA_DEFAULT } from './metadata.js';
import { compareMetadata } from './metadata-compare.js';

const clone = () => structuredClone(METADATA_DEFAULT) as any;

describe('compareMetadata', () => {
  it('finds nothing when the metadata is equal', () => {
    expect(compareMetadata(clone(), clone())).toEqual([]);
  });

  it('names the changed number', () => {
    const stored = clone();
    stored.totalGoals = 5;

    expect(compareMetadata(stored, clone())).toEqual([
      { field: 'totalGoals', stored: 5, calculated: 0 },
    ]);
  });

  it('goes into the rating systems', () => {
    const stored = clone();
    stored.positionalRatingSystem.totalPoints = 7;

    expect(compareMetadata(stored, clone())).toEqual([
      { field: 'positionalRatingSystem.totalPoints', stored: 7, calculated: 0 },
    ]);
  });

  it('reports a missing field as null', () => {
    const stored = clone();
    delete stored.totalGoalsByAuto;

    expect(compareMetadata(stored, clone())).toEqual([
      { field: 'totalGoalsByAuto', stored: null, calculated: 0 },
    ]);
  });

  it('reports a stored key the calculation does not have', () => {
    const calculated = clone();
    delete calculated.totalPoints;

    expect(compareMetadata(clone(), calculated)).toEqual([
      { field: 'totalPoints', stored: 0, calculated: null },
    ]);
  });

  it('summarizes a list instead of printing it', () => {
    const stored = clone();
    stored.gamesIds = ['a', 'b'];
    const calculated = clone();
    calculated.gamesIds = ['a', 'c', 'd'];

    expect(compareMetadata(stored, calculated)).toEqual([
      {
        field: 'gamesIds',
        stored: { length: 2, firstDifferenceAt: 1 },
        calculated: { length: 3, firstDifferenceAt: 1 },
      },
    ]);
  });

  it('reports a season that was never stored', () => {
    expect(compareMetadata(undefined, clone())).not.toEqual([]);
  });
});
