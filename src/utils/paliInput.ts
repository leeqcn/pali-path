// Pāli Diacritic Normalization & Velthuis ASCII Transliteration Helper
// Enables effortless searching with plain ASCII (e.g. "panna" -> "paññā", "sangha" -> "saṅgha")
// as well as live Velthuis shorthand ("aa" -> "ā", ".m" -> "ṃ", "~n" -> "ñ", ".t" -> "ṭ", etc.)

export const PALI_DIACRITIC_CHARS = ['ā', 'ī', 'ū', 'ṃ', 'ṅ', 'ñ', 'ṭ', 'ḍ', 'ṇ', 'ḷ'] as const;

/**
 * Strips Pāli diacritics to plain ASCII lowercase for fuzzy/diacritic-insensitive matching.
 * Also collapses double vowels so both "nibbana" and "nibbaana" match "nibbāna".
 */
export function normalizePaliAscii(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ā/g, 'a')
    .replace(/ī/g, 'i')
    .replace(/ū/g, 'u')
    .replace(/[ṃṁ]/g, 'm')
    .replace(/[ṅñṇ]/g, 'n')
    .replace(/ṭ/g, 't')
    .replace(/ḍ/g, 'd')
    .replace(/ḷ/g, 'l');
}

/**
 * Converts Velthuis ASCII input conventions into Unicode Pāli diacritics:
 * aa -> ā, ii -> ī, uu -> ū
 * .m -> ṃ, "n -> ṅ, ~n -> ñ
 * .t -> ṭ, .d -> ḍ, .n -> ṇ, .l -> ḷ
 */
export function convertVelthuisToPali(input: string): string {
  return input
    .replace(/aa/g, 'ā')
    .replace(/ii/g, 'ī')
    .replace(/uu/g, 'ū')
    .replace(/AA/g, 'Ā')
    .replace(/II/g, 'Ī')
    .replace(/UU/g, 'Ū')
    .replace(/\.m/g, 'ṃ')
    .replace(/\.M/g, 'Ṃ')
    .replace(/"n/g, 'ṅ')
    .replace(/~n/g, 'ñ')
    .replace(/\.t/g, 'ṭ')
    .replace(/\.d/g, 'ḍ')
    .replace(/\.n/g, 'ṇ')
    .replace(/\.l/g, 'ḷ');
}

/**
 * Checks if a Pāli word/root/meaning matches a user query using:
 * 1. Direct substring match
 * 2. Velthuis converted match
 * 3. Diacritic-insensitive ASCII match
 */
export function matchesPaliQuery(target: string, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;

  const targetLower = target.toLowerCase();
  if (targetLower.includes(q)) return true;

  const velthuisQ = convertVelthuisToPali(q).toLowerCase();
  if (targetLower.includes(velthuisQ)) return true;

  const asciiTarget = normalizePaliAscii(targetLower);
  const asciiQuery = normalizePaliAscii(velthuisQ);
  return asciiTarget.includes(asciiQuery);
}
