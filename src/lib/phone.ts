/** Yemen local mobile/landline numbers receive +967; explicit international codes are preserved. */
export function normalizePhone(value: string): string {
  const digits = value.replace(/[٠-٩۰-۹]/g, char => {
    const code = char.charCodeAt(0);
    return String(code >= 0x6f0 ? code - 0x6f0 : code - 0x660);
  }).replace(/[^0-9+]/g, '');
  if (!digits) return '';
  let normalized: string;
  if (digits.startsWith('+')) normalized = '+' + digits.slice(1).replace(/\D/g, '');
  else if (digits.startsWith('00')) normalized = '+' + digits.slice(2).replace(/\D/g, '');
  else {
    const numbers = digits.replace(/\D/g, '');
    normalized = numbers.startsWith('967') ? '+' + numbers : '+967' + numbers.replace(/^0+/, '');
  }
  // A domestic trunk zero is not dialled after Yemen's international code.
  return normalized.replace(/^\+9670+(?=\d)/, '+967');
}
export const whatsappDigits = (value: string) => normalizePhone(value).replace(/\D/g, '');
