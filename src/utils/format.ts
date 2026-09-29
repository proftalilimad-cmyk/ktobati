/** Convert Western digits in a string/number to Arabic-Indic digits. */
const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

export function toArabicDigits(value: string | number): string {
  return String(value).replace(/[0-9]/g, (d) => arabicDigits[Number(d)]);
}

export function formatWords(words?: number): string | null {
  if (!words) return null;
  return `${toArabicDigits(words.toLocaleString('en-US'))} كلمة`;
}

export function formatCount(n: number, singular: string, dual: string, plural: string): string {
  if (n === 1) return `${singular}`;
  if (n === 2) return dual;
  if (n >= 3 && n <= 10) return `${toArabicDigits(n)} ${plural}`;
  return `${toArabicDigits(n)} ${singular}`;
}

export function bookCountLabel(n: number): string {
  if (n === 0) return 'لا كتب';
  if (n === 1) return 'كتاب واحد';
  if (n === 2) return 'كتابان';
  if (n >= 3 && n <= 10) return `${toArabicDigits(n)} كتب`;
  return `${toArabicDigits(n)} كتابًا`;
}

export function chapterCountLabel(n: number): string {
  if (n === 1) return 'فصل واحد';
  if (n === 2) return 'فصلان';
  if (n >= 3 && n <= 10) return `${toArabicDigits(n)} فصول`;
  return `${toArabicDigits(n)} فصلًا`;
}
