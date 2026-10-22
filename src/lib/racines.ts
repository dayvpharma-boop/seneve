import { texts, type Language } from './test-texts';
export const R = texts.fr.roots;
export const Q = texts.fr.questions;
export function categorie(total: number, language: Language = 'fr') {
  if (total <= 6) return texts[language].categories[0];
  if (total <= 11) return texts[language].categories[1];
  return texts[language].categories[2];
}
/** Totaux par racine. `reversed` liste les positions (0 à 20) comptées à l'envers : score = 6 - réponse (FR V4).
 * Même calcul que seneve.submit_test_result_versioned en base. */
export function compute(a: (number | null)[], reversed: readonly number[] = []) {
  if(a.some(x => x === null)) return null;
  const v = a.map((x, k) => reversed.includes(k) ? 6 - Number(x) : Number(x));
  const t = R.map((_,k) => (v[3*k] ?? 0)+(v[3*k+1] ?? 0)+(v[3*k+2] ?? 0));
  const mx = Math.max(...t), mn = Math.min(...t);
  const idx = (x: number) => t.map((y,k) => y===x?k:-1).filter(k => k>=0);
  return { t, same: mx===mn, fortes: idx(mx), faibles: idx(mn) };
}
