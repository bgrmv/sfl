import { NilToDashPipe } from './nil-to-dash.pipe';

describe('NilToDashPipe', () => {
  it('turns null and undefined into a dash, keeps the rest (zero too)', () => {
    const pipe = new NilToDashPipe();
    expect(pipe.transform(null)).toBe('—');
    expect(pipe.transform(undefined)).toBe('—');
    expect(pipe.transform(0)).toBe(0);
    expect(pipe.transform('x')).toBe('x');
  });

  it('create an instance', () => {
    const pipe = new NilToDashPipe();
    expect(pipe).toBeTruthy();
  });
});
