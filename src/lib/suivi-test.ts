import { chargerSupabase } from './supabase-differe';
import { TEST_VERSIONS, type Language } from './test-texts';

// Suivi anonyme du Test des 7 Racines : ouvertures par source et tests terminés.
// Aucune donnée personnelle. Une panne réseau ne bloque jamais le test : les erreurs sont ignorées.

/** Source lue dans l'adresse (?src=tt) : minuscules, lettres, chiffres, - et _, 32 caractères au plus. */
export function cleanSource(value: string | null | undefined): string | null {
  const s = (value ?? '').trim().toLowerCase();
  return /^[a-z0-9_-]{1,32}$/.test(s) ? s : null;
}

export async function recordVisit(source: string | null, language: Language): Promise<void> {
  try {
    await (await chargerSupabase()).rpc('record_test_visit', { p_source: source, p_langue: language });
  } catch { /* le test continue sans suivi */ }
}

/** Enregistre un test terminé et renvoie son identifiant, ou null si l'envoi a échoué. */
export async function submitResult(answers: number[], source: string | null, language: Language): Promise<string | null> {
  try {
    const { data, error } = await (await chargerSupabase()).rpc('submit_test_result_versioned', { p_langue: language, p_reponses: answers, p_source: source, p_version: TEST_VERSIONS[language] });
    if (error || !data) return null;
    const id = (data as { result_id?: unknown }).result_id;
    return typeof id === 'string' ? id : null;
  } catch { return null; }
}

/** Enregistre la racine choisie en cas d'égalité (index 0 à 6 sur la page, 1 à 7 dans la base). */
export async function chooseRoot(resultId: string, rootIndex: number): Promise<void> {
  try {
    await (await chargerSupabase()).rpc('choose_test_root', { p_result_id: resultId, p_racine: rootIndex + 1 });
  } catch { /* sans effet sur l'affichage */ }
}
