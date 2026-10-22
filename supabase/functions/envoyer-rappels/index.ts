// SÉNEVÉ — Envoi des rappels sur le téléphone (notifications web), appelé toutes les 15 minutes par la base.
// Les rappels dus sont choisis par la base (seneve.claim_push_reminders) : accord en vigueur, parcours actif,
// heure choisie par la personne, un seul rappel par moment et par jour, pas de rattrapage.
// Les clés techniques (VAPID) sont créées ici à la première exécution et restent dans la base : elles ne
// passent jamais par l'écran ni par un message.
import { createClient } from 'npm:@supabase/supabase-js@2.58.0';
import webpush from 'npm:web-push@3.6.7';

// Textes montrés sur l'écran du téléphone : rien de privé (cahier n°11).
const TEXTES: Record<'fr' | 'en', Record<'matin' | 'midi' | 'soir', string>> = {
  fr: {
    matin: 'Ta graine du jour t’attend. Un enseignement, une action : quelques minutes suffisent.',
    midi: 'Où en est ton action du jour ? Même un petit pas compte.',
    soir: 'Avant de dormir, prends un instant pour noter ta journée.',
  },
  en: {
    matin: 'Today’s seed is waiting. One teaching, one action: a few minutes are enough.',
    midi: 'How is today’s action going? Even a small step counts.',
    soir: 'Before you sleep, take a moment to note your day.',
  },
};
const LIEN = '/seneve/espace';

type Appareil = { endpoint: string; p256dh: string; auth: string };
type Rappel = { communication_id: string; moment: string; langue: string; appareils: Appareil[] };

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  db: { schema: 'seneve' }, auth: { persistSession: false },
});

async function cles(): Promise<{ publique: string; privee: string; appel: string }> {
  const { data, error } = await db.from('push_config').select('vapid_public, vapid_private, cle_appel').eq('id', 1).single();
  if (error || !data) throw new Error('Configuration des rappels introuvable.');
  if (data.vapid_public && data.vapid_private) return { publique: data.vapid_public, privee: data.vapid_private, appel: data.cle_appel };
  // Première exécution : création des clés, une seule fois même si deux appels arrivent ensemble.
  const k = webpush.generateVAPIDKeys();
  await db.from('push_config').update({ vapid_public: k.publicKey, vapid_private: k.privateKey, modifie_le: new Date().toISOString() })
    .eq('id', 1).is('vapid_public', null);
  const relu = await db.from('push_config').select('vapid_public, vapid_private, cle_appel').eq('id', 1).single();
  if (relu.error || !relu.data?.vapid_public) throw new Error('Clés des rappels non enregistrées.');
  return { publique: relu.data.vapid_public, privee: relu.data.vapid_private, appel: relu.data.cle_appel };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Méthode non permise', { status: 405 });
  try {
    const k = await cles();
    // Seule la base (tâche programmée) connaît cette clé d'appel.
    if (req.headers.get('x-seneve-cle') !== k.appel) return new Response('Non autorisé', { status: 401 });
    webpush.setVapidDetails('mailto:contact@drjustintshims.com', k.publique, k.privee);

    const { data, error } = await db.rpc('claim_push_reminders', { p_limite: 100 });
    if (error) throw error;
    let envoyes = 0, echecs = 0;
    for (const r of (data ?? []) as Rappel[]) {
      const langue = r.langue === 'en' ? 'en' : 'fr';
      const moment = (['matin', 'midi', 'soir'] as const).find(m => m === r.moment) ?? 'matin';
      const message = JSON.stringify({ title: 'SÉNEVÉ', body: TEXTES[langue][moment], url: LIEN, tag: `seneve-${moment}` });
      const perimes: string[] = [];
      let accepte = false, derniereErreur = '';
      for (const a of r.appareils ?? []) {
        try {
          await webpush.sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, message, { TTL: 4 * 3600, urgency: 'normal' });
          accepte = true;
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode;
          // 404 ou 410 : l'abonnement n'existe plus (application désinstallée, autorisation retirée).
          if (code === 404 || code === 410) perimes.push(a.endpoint);
          derniereErreur = `${code ?? ''} ${(e as Error).message ?? e}`.trim().slice(0, 300);
        }
      }
      await db.rpc('finish_push_reminder', {
        p_communication_id: r.communication_id, p_ok: accepte,
        p_erreur: accepte ? null : (derniereErreur || 'aucun téléphone joignable'), p_endpoints_perimes: perimes,
      });
      if (accepte) envoyes++; else echecs++;
    }
    return Response.json({ envoyes, echecs });
  } catch (e) {
    return Response.json({ erreur: String((e as Error).message ?? e).slice(0, 300) }, { status: 500 });
  }
});
