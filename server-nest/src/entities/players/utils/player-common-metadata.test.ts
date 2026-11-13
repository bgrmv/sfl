import { getMaxRepeatedCountHelper } from './player-common-metadata';

describe('player-career-metadata', () => {
  describe('getMaxRepeatedCountHelper', () => {
    const array = [
      -1, 0, 1, -1, -1, 0, 1, -1, 0, 0, 0, 1, -1, 0, 1, 1, 1, 1, -1, 0, 1, -1,
      0, 1, -1,
    ];

    it('should get max repeated count of number', () => {
      expect(getMaxRepeatedCountHelper(array, -1)).toBe(2);
      expect(getMaxRepeatedCountHelper(array, 0)).toBe(3);
      expect(getMaxRepeatedCountHelper(array, 1)).toBe(4);
    });
  });
});
