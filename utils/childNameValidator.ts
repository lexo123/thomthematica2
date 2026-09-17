/**
 * Validates a child's name against the syntactic contract:
 *   GeorgianLetter (GeorgianLetter | Space | Hyphen)* GeorgianLetter
 *
 * Contract specifications:
 * 1. Every character must be one of:
 *    - A Mkhedruli Georgian letter (Unicode range U+10D0–U+10FF)
 *    - A single space (' ')
 *    - A hyphen ('-')
 * 2. The FIRST character must be a Georgian letter (not space/hyphen).
 * 3. The LAST character must be a Georgian letter (not space/hyphen).
 * 4. No two consecutive separator characters allowed — i.e. no "  ", "--", " -", "- " anywhere in the string.
 * 5. Digits, Latin characters, punctuation other than hyphen, and combining/diacritic marks are all disallowed.
 * 6. Empty string (after trim) is invalid.
 */
export function isValidChildName(name: string): boolean {
  if (!name) {
    return false;
  }

  // Iterate strictly by Unicode code point
  const chars = Array.from(name);
  if (chars.length < 2) {
    return false;
  }

  const isGeorgianLetter = (ch: string): boolean => {
    const cp = ch.codePointAt(0);
    return cp !== undefined && cp >= 0x10d0 && cp <= 0x10ff;
  };

  const isSeparator = (ch: string): boolean => ch === ' ' || ch === '-';

  // The FIRST character must be a Georgian letter (not space/hyphen)
  if (!isGeorgianLetter(chars[0])) {
    return false;
  }

  // The LAST character must be a Georgian letter (not space/hyphen)
  if (!isGeorgianLetter(chars[chars.length - 1])) {
    return false;
  }

  // Every character must be in the allowed set, with no consecutive separators
  let prevWasSeparator = false;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (isGeorgianLetter(ch)) {
      prevWasSeparator = false;
    } else if (isSeparator(ch)) {
      if (prevWasSeparator) {
        return false;
      }
      prevWasSeparator = true;
    } else {
      // Disallowed character (digits, Latin, other punctuation, diacritics, etc.)
      return false;
    }
  }

  return true;
}
