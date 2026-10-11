import { todayInVietnam } from './date';
test('Vietnam calendar across the UTC date boundary',()=>{
  expect(todayInVietnam(new Date('2026-10-10T18:00:00Z'))).toBe('2026-10-11');
});
