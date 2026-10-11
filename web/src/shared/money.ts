/** Keep integer VND as text until the server validates and records it. */
export function isMoney(value: string, signed = false): boolean {
  return (signed ? /^-?\d{1,19}$/ : /^\d{1,19}$/).test(value);
}

export function formatMoney(value: string | number | null | undefined): string {
  const text = String(value ?? '0');
  if (!isMoney(text, true)) return '—';
  return new Intl.NumberFormat('vi-VN').format(BigInt(text)) + ' đ';
}

export function minMoney(left: string, right: string): string {
  if (!isMoney(left) || !isMoney(right)) throw new Error('Số tiền không hợp lệ');
  return (BigInt(left) < BigInt(right) ? BigInt(left) : BigInt(right)).toString();
}
