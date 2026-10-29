// SÉNEVÉ — Annonces de l'équipe sur le téléphone (demande de Dr Justin du 29/10/2026, seneve_052).
// Appelée tout de suite après une publication (par la base) et toutes les 5 minutes (envois du matin, nouveaux essais).
// La base choisit les envois dus (seneve.claim_push_annonces) : accord des rappels en vigueur, téléphone abonné,
// annonces non coupées par la personne, annonce non retirée, rien la nuit (21 h – 7 h, heure de la personne).
// Mêmes clés techniques que les rappels (push_config), lues sur le serveur seulement.
import { createClient } from 'npm:@supabase/supabase-js@2.58.0';
import webpush from 'npm:web-push@3.6.7';

type Appareil = { endpoint: string; p256dh: string; auth: string };
type Envoi = { envoi_id: string; annonce_id: string; titre: string; texte: string; langue: string; appareils: Appareil[] };

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  db: { schema: 'seneve' }, auth: { persistSession: false },
});

// Le texte affiché sur l'écran : début du message de l'annonce (public par nature), coupé proprement.
function extrait(texte: string, max = 160): string {
  const t = texte.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const coupe = t.slice(0, max - 1);
  const espace = coupe.lastIndexOf(' ');
  return (espace > max * 0.6 ? coupe.slice(0, espace) : coupe).replace(/[\s,;:.!?-]+$/, '') + '…';
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Méthode non permise', { status: 405 });
  try {
    const { data: k, error: ek } = await db.from('push_config').select('vapid_public, vapid_private, cle_appel').eq('id', 1).single();
    if (ek || !k) throw new Error('Configuration des notifications introuvable.');
    // Seule la base connaît cette clé d'appel.
    if (req.headers.get('x-seneve-cle') !== k.cle_appel) return new Response('Non autorisé', { status: 401 });
    // Les clés sont créées par l'envoi des rappels ; sans elles, rien n'est envoyé (aucun téléphone n'a pu s'abonner).
    if (!k.vapid_public || !k.vapid_private) return Response.json({ envoyes: 0, echecs: 0, note: 'clés absentes' });
    webpush.setVapidDetails('mailto:contact@drjustintshims.com', k.vapid_public, k.vapid_private);

    const { data, error } = await db.rpc('claim_push_annonces', { p_limite: 100 });
    if (error) throw error;
    let envoyes = 0, echecs = 0;
    for (const e of (data ?? []) as Envoi[]) {
      const en = e.langue === 'en';
      const message = JSON.stringify({
        title: e.titre || 'SÉNEVÉ',
        body: extrait(e.texte || ''),
        url: en ? '/seneve/notifications?lang=en' : '/seneve/notifications',
        tag: `seneve-annonce-${e.annonce_id}`,
      });
      const perimes: string[] = [];
      let accepte = false, derniereErreur = '';
      for (const a of e.appareils ?? []) {
        try {
          await webpush.sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, message, { TTL: 12 * 3600, urgency: 'normal' });
          accepte = true;
        } catch (err) {
          const code = (err as { statusCode?: number }).statusCode;
          // 404 ou 410 : l'abonnement n'existe plus (application désinstallée, autorisation retirée).
          if (code === 404 || code === 410) perimes.push(a.endpoint);
          derniereErreur = `${code ?? ''} ${(err as Error).message ?? err}`.trim().slice(0, 300);
        }
      }
      await db.rpc('finish_push_annonce', {
        p_envoi_id: e.envoi_id, p_ok: accepte,
        p_erreur: accepte ? null : (derniereErreur || 'aucun téléphone joignable'), p_endpoints_perimes: perimes,
      });
      if (accepte) envoyes++; else echecs++;
    }
    return Response.json({ envoyes, echecs });
  } catch (e) {
    return Response.json({ erreur: String((e as Error).message ?? e).slice(0, 300) }, { status: 500 });
  }
});
