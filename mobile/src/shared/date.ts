export function todayInVietnam(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en', {timeZone:'Asia/Ho_Chi_Minh', year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const value = (type: string) => parts.find(part=>part.type===type)!.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}
