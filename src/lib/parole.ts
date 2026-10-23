// « Parole du jour » : citation exacte du livre (validée par Dr Justin), et image à partager
// dessinée dans le navigateur, aux couleurs SÉNEVÉ. Aucune donnée personnelle sur l'image.
import { CARD_SIZES, IVOIRE, IVOIRE_DOUX, NOIR, OR, seed, spaced, wrap } from './carte-partage';

export type Parole = { texte: string; reference_livre: string };

const TEXTES = {
  fr: {
    tag: 'Parole du jour',
    livre: '« Arrête de mendier des miracles »',
    auteur: 'Dr Justin Tshims',
    partager: 'Partager en image',
    telecharger: 'Télécharger l’image',
    creation: 'Création de l’image…',
    indisponible: 'L’image n’a pas pu être créée sur cet appareil.',
    invitation: 'Fais le Test des 7 Racines',
    fichier: 'seneve-parole-du-jour',
  },
  en: {
    tag: 'Word for today',
    livre: '“Stop Begging for Miracles”',
    auteur: 'Dr. Justin Tshims',
    partager: 'Share as an image',
    telecharger: 'Download the image',
    creation: 'Creating the image…',
    indisponible: 'The image could not be created on this device.',
    invitation: 'Take the 7 Roots Test',
    fichier: 'seneve-word-for-today',
  },
};
export const paroleTextes = (langue?: string) => TEXTES[langue === 'en' ? 'en' : 'fr'];

/** Adresse affichée sur l'image : le test, avec la provenance « parole » pour le tableau de bord. */
export function adresseParole(host: string, base: string, langue: string): string {
  const chemin = base.endsWith('/') ? base : `${base}/`;
  return `${host}${chemin}?${langue === 'en' ? 'lang=en&' : ''}src=parole`;
}

/** Guillemets selon la langue : « … » en français, “…” en anglais. */
export const entreGuillemets = (texte: string, langue?: string | null) => langue === 'en' ? `“${texte}”` : `« ${texte} »`;

export type ContenuImage = { citation: string; reference: string; livre: string; auteur: string; invitation: string; adresse: string; langue?: string };

/** Dessine l'image verticale (1080 × 1920) : graine, citation entre guillemets, source, invitation au test. */
export function drawParole(ctx: CanvasRenderingContext2D, c: ContenuImage) {
  const { w, h } = CARD_SIZES.vertical;
  const maxW = w - 220;
  ctx.fillStyle = NOIR; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = OR; ctx.globalAlpha = 0.6; ctx.lineWidth = 4;
  ctx.strokeRect(44, 44, w - 88, h - 88);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = OR; ctx.font = '600 46px Lora, serif';
  spaced(ctx, 'SÉNEVÉ', w / 2, 230, 20);
  seed(ctx, w / 2, 420, 2.2);

  // Citation : la taille diminue jusqu'à tenir dans l'espace disponible.
  const haut = 640, bas = h - 620;
  let taille = 84;
  let lignes: string[] = [];
  for (;;) {
    ctx.font = `italic 500 ${taille}px Lora, serif`;
    lignes = wrap(ctx, entreGuillemets(c.citation, c.langue), maxW);
    if (lignes.length * taille * 1.3 <= bas - haut || taille <= 44) break;
    taille -= 4;
  }
  let y = haut + (bas - haut - lignes.length * taille * 1.3) / 2 + taille;
  ctx.fillStyle = IVOIRE;
  for (const l of lignes) { ctx.fillText(l, w / 2, y); y += taille * 1.3; }

  y = bas + 70;
  ctx.strokeStyle = OR; ctx.globalAlpha = 0.6; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(w / 2 - 90, y - 50); ctx.lineTo(w / 2 + 90, y - 50); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = IVOIRE; ctx.font = '600 42px Lora, serif';
  ctx.fillText(c.auteur, w / 2, y);
  ctx.fillStyle = IVOIRE_DOUX; ctx.font = 'italic 500 36px Lora, serif';
  for (const l of wrap(ctx, `${c.livre} — ${c.reference}`, maxW)) { y += 52; ctx.fillText(l, w / 2, y); }

  const pied = h - 210;
  ctx.fillStyle = IVOIRE; ctx.font = 'italic 500 50px Lora, serif';
  ctx.fillText(c.invitation, w / 2, pied);
  ctx.fillStyle = OR;
  let s = 40; ctx.font = `600 ${s}px Poppins, sans-serif`;
  while (s > 20 && ctx.measureText(c.adresse).width > maxW) { s -= 1; ctx.font = `600 ${s}px Poppins, sans-serif`; }
  ctx.fillText(c.adresse, w / 2, pied + 70);
}

/** Crée l'image PNG, ou null si le navigateur ne sait pas dessiner. */
export async function renderParole(c: ContenuImage): Promise<Blob | null> {
  const { w, h } = CARD_SIZES.vertical;
  try { await Promise.all([document.fonts?.load('italic 500 40px Lora'), document.fonts?.load('600 40px Lora'), document.fonts?.load('600 30px Poppins')]); } catch { /* polices de secours */ }
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  drawParole(ctx, c);
  return new Promise(resolve => canvas.toBlob(b => resolve(b), 'image/png'));
}
