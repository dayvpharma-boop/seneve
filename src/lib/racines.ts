import { texts, type Language } from './test-texts';
export const R = texts.fr.roots;
export const Q = texts.fr.questions;
export function categorie(total: number, language: Language = 'fr') {
  if (total <= 6) return texts[language].categories[0];
  if (total <= 11) return texts[language].categories[1];
  return texts[language].categories[2];
}
export function compute(a: (number | null)[]) {
  if(a.some(x => x === null)) return null;
  const t = R.map((_,k) => Number(a[3*k])+Number(a[3*k+1])+Number(a[3*k+2]));
  const mx = Math.max(...t), mn = Math.min(...t);
  const idx = (v: number) => t.map((x,k) => x===v?k:-1).filter(k => k>=0);
  return { t, same: mx===mn, fortes: idx(mx), faibles: idx(mn) };
}
