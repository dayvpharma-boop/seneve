// SÉNEVÉ — Crochet « Send SMS » de Supabase Auth.
// Supabase crée le code à 6 chiffres, gère son expiration, le nombre d'essais et les limites d'envoi ; il appelle
// cette fonction pour la remise du code. Aucun SMS n'est jamais envoyé.
//
// Deux modes :
// * « message entrant » (par défaut, décision de Dr Justin du 21/11/2026) : le code est DÉPOSÉ dans
//   seneve.codes_connexion_whatsapp. La personne envoie « CODE » au WhatsApp de SÉNEVÉ et WHATSAPP BASE (n8n) lui
//   répond avec son code, dans la conversation qu'elle a ouverte. Aucun modèle Meta, aucune vérification d'entreprise.
// * « modèle Meta » (plus tard, une fois l'entreprise vérifiée par Meta) : si META_WA_MODE = "modele", le code part
//   avec le modèle « Authentification » approuvé (bouton « Copier le code »).
//
// Sécurité :
// * L'appel n'est accepté que s'il est signé par Supabase Auth (Standard Webhooks, secret SEND_SMS_HOOK_SECRET).
// * Le code n'est jamais écrit dans les journaux. Seul le numéro demandé peut le recevoir (expéditeur vérifié par Meta).
// * Aucun consentement aux messages de programme n'est créé : seul le code est remis.
//
// Secrets (Supabase → Edge Functions → Secrets) :
//   SEND_SMS_HOOK_SECRET   donné par Supabase en créant le crochet (« v1,whsec_… »)  — obligatoire
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY                                           — fournis par Supabase
//   Mode modèle seulement : META_WA_MODE=modele, META_WA_TOKEN, META_WA_PHONE_ID, META_WA_MODELE_FR, META_WA_MODELE_EN
import { Webhook } from 'npm:standardwebhooks@1.0.0';

type Charge = { user: { phone?: string; user_metadata?: { langue?: string } }; sms: { otp: string } };

const erreur = (code: number, message: string) =>
  Response.json({ error: { http_code: code, message } }, { status: code });
const ok = () => new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });

async function deposer(numero: string, otp: string, langue: 'fr' | 'en'): Promise<boolean> {
  const url = Deno.env.get('SUPABASE_URL');
  const cle = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !cle) return false;
  const r = await fetch(`${url}/rest/v1/rpc/deposer_code_connexion`, {
    method: 'POST',
    headers: { apikey: cle, Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json', 'Content-Profile': 'seneve' },
    body: JSON.stringify({ p_telephone: '+' + numero, p_code: otp, p_langue: langue }),
  }).catch(() => null);
  if (!r || !r.ok) console.error(`Dépôt du code refusé (${r?.status ?? 'sans réponse'}) pour …${numero.slice(-3)}`);
  return !!r && r.ok;
}

async function envoyerModele(numero: string, otp: string, en: boolean): Promise<boolean> {
  const jeton = Deno.env.get('META_WA_TOKEN');
  const telephone = Deno.env.get('META_WA_PHONE_ID');
  const modele = (en ? Deno.env.get('META_WA_MODELE_EN') : undefined) ?? Deno.env.get('META_WA_MODELE_FR');
  if (!jeton || !telephone || !modele) return false;
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
    const detail = r ? (await r.text().catch(() => '')).replace(/[0-9]{6}/g, '******').slice(0, 300) : 'réseau';
    console.error(`Meta a refusé l'envoi du code (${r?.status ?? 'sans réponse'}) vers …${numero.slice(-3)} : ${detail}`);
  }
  return !!r && r.ok;
}

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
  const en = charge.user.user_metadata?.langue === 'en';

  const remis = Deno.env.get('META_WA_MODE') === 'modele'
    ? await envoyerModele(numero, otp, en)
    : await deposer(numero, otp, en ? 'en' : 'fr');
  return remis ? ok() : erreur(502, 'Le code WhatsApp n’a pas pu être préparé');
});
