// SÉNEVÉ — Crochet « Send SMS » de Supabase Auth (décision de Dr Justin du 21/11/2026).
// Supabase crée le code à 6 chiffres, gère son expiration, le nombre d'essais et les limites d'envoi ; il appelle
// cette fonction pour la remise du code. On le remet par WhatsApp avec le numéro Meta existant de SÉNEVÉ,
// au moyen d'un modèle de catégorie « Authentification » approuvé par Meta (bouton « Copier le code »).
//
// Sécurité :
// * L'appel n'est accepté que s'il est signé par Supabase Auth (Standard Webhooks, secret SEND_SMS_HOOK_SECRET).
// * Le code n'est jamais écrit dans les journaux. Le jeton Meta reste dans les secrets de la fonction.
// * Aucun consentement aux messages de programme n'est créé : seul le code est envoyé.
//
// Secrets à créer (Supabase → Edge Functions → Secrets) :
//   SEND_SMS_HOOK_SECRET   donné par Supabase en créant le crochet (« v1,whsec_… »)
//   META_WA_TOKEN          jeton d'accès permanent (utilisateur système) de l'application Meta
//   META_WA_PHONE_ID       identifiant du numéro WhatsApp (Phone number ID)
//   META_WA_MODELE_FR      nom du modèle d'authentification français (ex. seneve_code_fr)
//   META_WA_MODELE_EN      nom du modèle anglais (facultatif ; sinon le modèle français)
import { Webhook } from 'npm:standardwebhooks@1.0.0';

type Charge = { user: { phone?: string; user_metadata?: { langue?: string } }; sms: { otp: string } };

const erreur = (code: number, message: string) =>
  Response.json({ error: { http_code: code, message } }, { status: code });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return erreur(405, 'Méthode non permise');
  const corps = await req.text();
  const secret = (Deno.env.get('SEND_SMS_HOOK_SECRET') ?? '').replace('v1,whsec_', '');
  if (!secret) return erreur(500, 'Crochet non configuré');
  let charge: Charge;
  try {
    charge = new Webhook(secret).verify(corps, Object.fromEntries(req.headers)) as Charge;
  } catch {
    return erreur(401, 'Signature invalide');
  }

  const otp = charge?.sms?.otp ?? '';
  const numero = (charge?.user?.phone ?? '').replace(/^\+/, '');
  if (!/^[0-9]{6}$/.test(otp) || !/^[1-9][0-9]{7,14}$/.test(numero)) return erreur(400, 'Demande invalide');

  const jeton = Deno.env.get('META_WA_TOKEN');
  const telephone = Deno.env.get('META_WA_PHONE_ID');
  const en = charge.user.user_metadata?.langue === 'en';
  const modele = (en ? Deno.env.get('META_WA_MODELE_EN') : undefined) ?? Deno.env.get('META_WA_MODELE_FR');
  if (!jeton || !telephone || !modele) return erreur(500, 'Envoi WhatsApp non configuré');
  const langue = en && Deno.env.get('META_WA_MODELE_EN') ? 'en' : 'fr';

  const r = await fetch(`https://graph.facebook.com/v21.0/${telephone}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${jeton}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp', to: numero, type: 'template',
      template: {
        name: modele, language: { code: langue },
        components: [
          { type: 'body', parameters: [{ type: 'text', text: otp }] },
          { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: otp }] },
        ],
      },
    }),
  }).catch(() => null);

  if (!r || !r.ok) {
    // Journal sans le code ni le numéro complet.
    const detail = r ? (await r.text().catch(() => '')).replace(/[0-9]{6}/g, '******').slice(0, 300) : 'réseau';
    console.error(`Meta a refusé l'envoi du code (${r?.status ?? 'sans réponse'}) vers …${numero.slice(-3)} : ${detail}`);
    return erreur(502, 'Le code WhatsApp n’a pas pu être envoyé');
  }
  return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
});
