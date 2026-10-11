import { describe, expect, it } from 'vitest';
import { formatMoney, isMoney, minMoney } from './money';

describe('integer VND', () => {
  it('preserves values above the JavaScript safe integer limit', () => {
    expect(formatMoney('9999999999999999999')).toBe('9.999.999.999.999.999.999 đ');
    expect(formatMoney('-9007199254740993')).toBe('-9.007.199.254.740.993 đ');
  });
  it('rejects decimal, exponent and formatted input before sending a command', () => {
    for (const value of ['1.5', '1e6', '1,000', '', '12345678901234567890', '-10'])
      expect(isMoney(value)).toBe(false);
    expect(isMoney('-10', true)).toBe(true);
    expect(isMoney('9007199254740993')).toBe(true);
  });
  it('chooses an offset amount without rounding large balances', () => {
    expect(minMoney('9007199254740993', '9007199254740994')).toBe('9007199254740993');
  });
});
