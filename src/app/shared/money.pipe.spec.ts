import { describe, expect, it } from 'vitest';
import { MoneyPipe } from './money.pipe';

describe('MoneyPipe', () => {
  const pipe = new MoneyPipe();

  it('formatea con símbolo y dos decimales como el diseño', () => {
    expect(pipe.transform(6.5)).toBe('$6.50');
    expect(pipe.transform(14)).toBe('$14.00');
    expect(pipe.transform(0)).toBe('$0.00');
  });
});
