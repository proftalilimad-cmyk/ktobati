/** Normalize Arabic text: strip diacritics, unify alef/hamza/ya/ta-marbuta. */
export function normalizeAr(input: string): string {
  return input
    .replace(/[\u064B-\u0652\u0670]/g, '') // tashkeel
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\u0640/g, '') // tatweel
    .replace(/[«»"',.:؛؟!()\[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}
