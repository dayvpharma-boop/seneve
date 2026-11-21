import { supabase } from './supabase';
import { WHATSAPP_NUMBER } from './liaison';

/** Activation uniquement après configuration et recette du fournisseur WhatsApp dans Supabase Auth. */
export function connexionWhatsAppActivee(): boolean {
  return import.meta.env.VITE_WHATSAPP_AUTH_ENABLED === 'true';
}

/** Mot envoyé par la personne pour recevoir son code (WHATSAPP BASE lui répond dans la conversation qu'elle ouvre). */
export const MOT_CODE = 'CODE';

/** Ouvre WhatsApp sur le numéro de SÉNEVÉ avec « CODE » déjà écrit. */
export function lienDemandeCode(): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(MOT_CODE)}`;
}

export function normaliserTelephone(valeur: string): string | null {
  const numero = valeur.trim().replace(/[\s().-]/g, '');
  const international = numero.startsWith('00') ? '+' + numero.slice(2) : numero;
  return /^\+[1-9][0-9]{7,14}$/.test(international) ? international : null;
}

export async function demanderCodeWhatsApp(phone: string, creation: boolean, prenom: string, langue: 'fr' | 'en') {
  // Le serveur gère l'expiration, le nombre de tentatives et l'unicité du code.
  // Canal « sms » pour Supabase : le crochet « Send SMS » (fonction envoyer-code-whatsapp) dépose le code ;
  // la personne envoie ensuite « CODE » au WhatsApp de SÉNEVÉ, qui lui répond avec. Aucun SMS n'est envoyé.
  // Aucune session n'est créée par cet appel. Aucun consentement marketing n'est enregistré.
  return supabase.auth.signInWithOtp({
    phone,
    options: { channel: 'sms', shouldCreateUser: creation,
      ...(creation ? { data: { prenom: prenom.trim(), langue } } : {}) },
  });
}

export async function verifierCodeWhatsApp(phone: string, token: string) {
  return supabase.auth.verifyOtp({ phone, token, type: 'sms' });
}

export function erreurWhatsApp(message: string | undefined, en: boolean): string {
  const m = (message ?? '').toLowerCase();
  if (/rate.limit|too many|for security|only request/.test(m)) return en ? 'Too many attempts. Please wait before trying again.' : 'Trop de tentatives. Patiente avant de réessayer.';
  if (/signups not allowed|otp_disabled|user not found/.test(m)) return en ? 'No account uses this number yet. Choose “Create an account”.' : 'Aucun compte n’utilise encore ce numéro. Choisis « Créer un compte ».';
  if (/expired|invalid.*otp|token.*invalid/.test(m)) return en ? 'Invalid or expired code. Request a new code.' : 'Code incorrect ou expiré. Demande un nouveau code.';
  if (/network|fetch/.test(m)) return en ? 'Check your connection and try again.' : 'Vérifie ta connexion et réessaie.';
  return en ? 'WhatsApp sign-in is unavailable. Try again later or use email.' : 'La connexion WhatsApp est indisponible. Réessaie plus tard ou utilise ton e-mail.';
}
