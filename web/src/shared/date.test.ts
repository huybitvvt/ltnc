import { expect, test } from 'vitest';
import { todayInVietnam } from './date';
test('date inputs use Vietnam calendar rather than UTC',()=>{
  expect(todayInVietnam(new Date('2026-10-10T18:00:00Z'))).toBe('2026-10-11');
  expect(todayInVietnam(new Date('2026-01-31T18:00:00Z'))).toBe('2026-02-01');
});
