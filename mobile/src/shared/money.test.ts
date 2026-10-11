import { formatMoney, isMoney, minMoney } from './money';

test('19-digit VND remains exact', () => {
  expect(formatMoney('9999999999999999999')).toBe('9.999.999.999.999.999.999 đ');
  expect(isMoney('1.5')).toBe(false);
  expect(isMoney('1e6')).toBe(false);
  expect(isMoney('-10')).toBe(false);
  expect(isMoney('-10', true)).toBe(true);
  expect(minMoney('9007199254740993', '9007199254740994')).toBe('9007199254740993');
});
