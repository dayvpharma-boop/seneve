/** « Invite un proche à faire le test » : un lien vers le Test des 7 Racines, marqué ?src=invitation
 *  pour que le tableau de bord compte les visites venues des invitations. Aucune donnée personnelle
 *  n'est transmise : ni nom, ni résultat, ni identifiant. */

export const SOURCE_INVITATION = 'invitation';
/** Version de l'aperçu WhatsApp : la changer oblige WhatsApp à relire l'image (il garde en mémoire l'aperçu de chaque adresse). */
export const VERSION_APERCU = '6';

/** Adresse du test à envoyer (avec la langue si anglais). */
export function lienInvitation(origine: string, base: string, langue: string): string {
  const chemin = base.endsWith('/') ? base : `${base}/`;
  // L'anglais passe par /en : cette page a son propre aperçu (titre, description, image en anglais).
  return `${origine}${chemin}${langue === 'en' ? 'en' : ''}?src=${SOURCE_INVITATION}&v=${VERSION_APERCU}`;
}

const TEXTES = {
  fr: {
    tag: 'Invite un proche',
    texte: 'Tu connais quelqu’un à qui ce test ferait du bien ? Envoie-lui le lien : c’est gratuit et sans compte.',
    envoyer: 'Envoyer l’invitation',
    copier: 'Copier le lien',
    copie: 'Lien copié',
    note: 'Aucune information sur toi ni sur ton résultat n’est transmise.',
    message: (lien: string) => `Je viens de faire le Test des 7 Racines, inspiré du livre « Arrête de mendier des miracles ». Il est gratuit et sans compte : ${lien}`,
    titre: 'Le Test des 7 Racines',
  },
  en: {
    tag: 'Invite someone',
    texte: 'Do you know someone this test could help? Send them the link: it is free and needs no account.',
    envoyer: 'Send the invitation',
    copier: 'Copy the link',
    copie: 'Link copied',
    note: 'No information about you or your result is shared.',
    message: (lien: string) => `I have just taken the 7 Roots Test, based on the book “Stop Begging for Miracles”. It is free and needs no account: ${lien}`,
    titre: 'The 7 Roots Test',
  },
};

export const invitationTextes = (langue?: string) => TEXTES[langue === 'en' ? 'en' : 'fr'];

/** Lien WhatsApp « choisir un contact » avec le message prérempli (sans numéro). */
export function lienWhatsAppInvitation(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/** « Graines partagées » du profil : invitations envoyées ou liens copiés depuis ce téléphone.
 *  Compteur local seulement : rien n'est envoyé à SÉNEVÉ, il ne suit ni le destinataire ni sa visite. */
const CLE_GRAINES = 'seneve:graines-partagees';
export const EVENEMENT_GRAINES = 'seneve:graines-partagees';
export function lireGraines(): number {
  try { const n = Number(localStorage.getItem(CLE_GRAINES)); return Number.isInteger(n) && n > 0 ? n : 0; } catch { return 0; }
}
export function compterGraine(): number {
  const n = lireGraines() + 1;
  try { localStorage.setItem(CLE_GRAINES, String(n)); } catch { /* stockage indisponible : rien n'est compté */ }
  window.dispatchEvent(new CustomEvent(EVENEMENT_GRAINES, { detail: n }));
  return n;
}
/** Partage du téléphone si disponible, sinon WhatsApp. Renvoie false si la personne a fermé le menu. */
export async function envoyerInvitation(langue?: string): Promise<boolean> {
  const T = invitationTextes(langue);
  const message = T.message(lienInvitation(window.location.origin, import.meta.env.BASE_URL, langue ?? 'fr'));
  const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
  if (nav.share) {
    try { await nav.share({ title: T.titre, text: message }); compterGraine(); return true; } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return false;
    }
  }
  window.open(lienWhatsAppInvitation(message), '_blank', 'noopener,noreferrer');
  compterGraine();
  return true;
}
