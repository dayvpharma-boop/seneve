/** Numéro WhatsApp du parcours SÉNEVÉ (même numéro que le bouton du Test des 7 Racines). */
export const WHATSAPP_NUMBER = '243844211119';

/** Message pré-écrit envoyé par le participant pour prouver qu'il maîtrise son WhatsApp. */
export function linkMessage(code: string): string {
  return `LIER ${code}`;
}

export function linkUrl(code: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(linkMessage(code))}`;
}

/** Affiche un numéro de façon partiellement masquée : +243 ••• ••• 119. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 6) return '•••';
  return `+${digits.slice(0, 3)} ••• ••• ${digits.slice(-3)}`;
}
