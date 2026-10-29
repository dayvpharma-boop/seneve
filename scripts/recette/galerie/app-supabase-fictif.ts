/** Aperçu de l'application entière avec un compte fictif (recette visuelle locale). Jamais importé par le site publié. */
const en = new URLSearchParams(location.search).get('lang') === 'en', langue = en ? 'en' : 'fr';
const p = en ? 'PROSPECT_LIVRE_7J_EN_V1' : 'PROSPECT_LIVRE_7J_FR_V1';
const debut = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
const tables: Record<string, unknown[]> = {
  participants: [{ participant_id: 'APERCU', prenom: 'Justin', langue, fuseau: 'Africa/Kinshasa', preferences: {} }],
  enrollments: [{ enrollment_id: 'APERCU', programme_id: p, version: 1, langue, date_debut: debut, etat: 'active' }],
  programmes: [{ programme_id: p, nom: en ? 'Discovery — 7 days' : 'Découverte — 7 jours', duree_jours: 7 }],
  contents: Array.from({ length: 7 }, (_, i) => ({ content_id: `C${i + 1}`, programme_id: p, version: 1, langue, jour: i + 1, numero_message: 1, theme: en ? 'Example teaching' : 'Enseignement d’exemple', texte_officiel: en ? 'Example text for visual checks.' : 'Texte d’exemple pour la vérification visuelle.', reference_livre: null, explication: null })),
  activities: [{ activity_id: 'A2', content_id: 'C2', type_activite: 'action', consigne: en ? 'Take a moment to reflect.' : 'Prends un moment pour réfléchir.', obligatoire: true }],
  goals: [{ goal_id: 'G1', texte: en ? 'Set aside the tithe every week' : 'Mettre de côté la dîme chaque semaine', racine: 2, confirme_le: '2026-10-20T10:00:00Z' }],
  journal_entries: [], help_requests: [], channel_links: [],
};
const rpc: Record<string, unknown> = {
  ensure_participant: 'APERCU', staff_me: { admin: true, roles: ['admin'] },
  mes_notifications: { vu_jusqu_a: null, non_lues: 2, elements: [
    { type: 'annonce', id: 'A1', date: new Date().toISOString(), titre: en ? 'Special service' : 'Culte spécial', texte: en ? 'Join us on Sunday.' : 'Rejoins-nous dimanche.', langue, nouveau: true, image: null, video: null },
    { type: 'rappel_moment', id: 'R1', date: new Date(Date.now() - 3600e3).toISOString(), moment: 'matin', nouveau: true },
  ] },
  rappels_etat: { actif: true, cet_appareil: false, appareils: 1, moments: { matin: '07:30', midi: null, soir: '19:30' }, fuseau: 'Africa/Kinshasa', annonces: true, cle_publique: 'CLE' },
  email_matin_etat: { concerne: true, actif: false, email: 'justin@exemple.com' },
};
function builder(table: string) {
  const b: any = {};
  for (const m of ['select', 'eq', 'neq', 'in', 'is', 'order', 'range', 'limit', 'gte', 'lte', 'gt', 'lt', 'not', 'or', 'filter', 'match', 'insert', 'update', 'upsert', 'delete']) b[m] = () => b;
  b.maybeSingle = async () => ({ data: tables[table]?.[0] ?? null, error: null });
  b.single = async () => ({ data: tables[table]?.[0] ?? null, error: null });
  b.then = (ok: any, ko: any) => Promise.resolve({ data: tables[table] ?? [], error: null }).then(ok, ko);
  return b;
}
const session = { user: { id: 'APERCU', email: 'justin@exemple.com', user_metadata: { prenom: 'Justin', langue } }, access_token: 'apercu' };
export const supabase: any = {
  from: builder,
  rpc: async (nom: string) => ({ data: rpc[nom] ?? null, error: null }),
  auth: { getSession: async () => ({ data: { session }, error: null }), getUser: async () => ({ data: { user: session.user }, error: null }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }), signOut: async () => ({ error: null }) },
  storage: { from: () => ({ download: async () => ({ data: null, error: { statusCode: '404' } }), upload: async () => ({ error: null }), remove: async () => ({ error: null }), getPublicUrl: (x: string) => ({ data: { publicUrl: x } }) }) },
  functions: { invoke: async () => ({ data: null, error: { message: 'aperçu hors réseau' } }) },
  channel: () => ({ on() { return this; }, subscribe() { return this; } }), removeChannel() {},
};
export function siteUrl(path: string): string { return path; }
