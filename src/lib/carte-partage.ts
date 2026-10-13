// Image à partager après le Test des 7 Racines, dessinée dans le navigateur (aucune donnée envoyée).
// Elle ne montre jamais de note chiffrée : seulement le nom des racines.

export type CardFormat = 'vertical' | 'carre';
export const CARD_SIZES: Record<CardFormat, { w: number; h: number }> = {
  vertical: { w: 1080, h: 1920 }, // Stories, Reels, TikTok, Shorts, statuts
  carre: { w: 1080, h: 1080 },    // publications Facebook, Instagram, LinkedIn, X, Telegram
};
const NOIR = '#0A0907', OR = '#C9A84C', IVOIRE = '#F4EEDF', IVOIRE_DOUX = 'rgba(244,238,223,0.72)';

export interface CardContent {
  brand: string;          // SÉNEVÉ
  title: string;          // Le Test des 7 Racines
  book: string;           // D'après « Arrête de mendier des miracles »
  strength?: { label: string; name: string }; // Mon point d'appui : …
  start?: { label: string; name: string };    // Je commence par : …
  question: string;       // Et toi, quelle est ta racine ?
  address: string;        // adresse du test, sans https://
}

/** Libellé de la racine la plus solide selon son total (3 à 15), ou null si toutes sont à développer. */
export function strengthKind(total: number): 'appui' | 'solide' | null {
  if (total >= 12) return 'appui';
  if (total >= 7) return 'solide';
  return null;
}

/** Adresse affichée sur l'image : le test, marqué « partage » pour compter les visiteurs venus des images. */
export function shareAddress(host: string, base: string, language: 'fr' | 'en'): string {
  const path = base.endsWith('/') ? base : `${base}/`;
  return `${host}${path}?src=partage${language === 'en' ? '&lang=en' : ''}`;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function spaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number) {
  // Lettres espacées, centrées sur x (letterSpacing n'existe pas partout).
  const chars = [...text];
  const width = chars.reduce((sum, c) => sum + ctx.measureText(c).width, 0) + spacing * (chars.length - 1);
  let cx = x - width / 2;
  ctx.textAlign = 'left';
  for (const c of chars) { ctx.fillText(c, cx, y); cx += ctx.measureText(c).width + spacing; }
  ctx.textAlign = 'center';
}

/** Petite graine de sénevé et ses sept racines, à la couleur or. */
function seed(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  ctx.save();
  ctx.strokeStyle = OR; ctx.fillStyle = OR; ctx.lineCap = 'round';
  ctx.lineWidth = 3 * s;
  ctx.beginPath(); ctx.moveTo(cx, cy - 10 * s); ctx.quadraticCurveTo(cx + 4 * s, cy - 40 * s, cx + 20 * s, cy - 56 * s); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(cx + 26 * s, cy - 60 * s, 12 * s, 6 * s, -0.7, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx, cy, 14 * s, 11 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 2.2 * s;
  for (let k = 0; k < 7; k++) {
    const a = (k - 3) / 3; // -1 à 1
    ctx.beginPath();
    ctx.moveTo(cx + a * 6 * s, cy + 8 * s);
    ctx.quadraticCurveTo(cx + a * 30 * s, cy + 40 * s, cx + a * 70 * s, cy + (70 - Math.abs(a) * 22) * s);
    ctx.stroke();
  }
  ctx.restore();
}

/** Dessine l'image complète sur un canvas déjà dimensionné. */
export function drawCard(ctx: CanvasRenderingContext2D, format: CardFormat, c: CardContent) {
  const { w, h } = CARD_SIZES[format];
  const tall = format === 'vertical';
  const k = tall ? 1 : 0.8; // taille des textes
  const maxW = w - 200;
  ctx.fillStyle = NOIR; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = OR; ctx.globalAlpha = 0.55; ctx.lineWidth = 3;
  ctx.strokeRect(48, 48, w - 96, h - 96);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';

  // En-tête
  let y = tall ? 230 : 150;
  ctx.fillStyle = OR; ctx.font = `600 ${Math.round(34 * k)}px Lora, serif`;
  spaced(ctx, c.brand, w / 2, y, 14 * k);
  y += 70 * k;
  ctx.fillStyle = IVOIRE; ctx.font = `600 ${Math.round(54 * k)}px Lora, serif`;
  ctx.fillText(c.title, w / 2, y);
  y += 52 * k;
  ctx.fillStyle = IVOIRE_DOUX; ctx.font = `italic 500 ${Math.round(30 * k)}px Lora, serif`;
  for (const line of wrap(ctx, c.book, maxW)) { ctx.fillText(line, w / 2, y); y += 40 * k; }

  // Corps : une ou deux racines, centrées dans l'espace libre
  const blocks = [c.strength, c.start].filter((b): b is { label: string; name: string } => Boolean(b));
  const nameSize = Math.round((blocks.length > 1 ? 84 : 104) * k);
  const blockH = (b: { name: string }) => {
    ctx.font = `600 ${nameSize}px Lora, serif`;
    return 56 * k + wrap(ctx, b.name, maxW).length * nameSize * 1.15;
  };
  const gap = 70 * k;
  const bodyH = blocks.reduce((s, b) => s + blockH(b), 0) + gap * (blocks.length - 1);
  const top = y + (tall ? 170 : 60);
  const bottom = h - (tall ? 380 : 230);
  if (tall) seed(ctx, w / 2, y + 85, 1.1);
  y = top + Math.max(0, (bottom - top - bodyH) / 2);
  blocks.forEach((b, i) => {
    if (i > 0) {
      ctx.strokeStyle = OR; ctx.globalAlpha = 0.5; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(w / 2 - 70, y - gap / 2); ctx.lineTo(w / 2 + 70, y - gap / 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = OR; ctx.font = `600 ${Math.round(30 * k)}px Poppins, sans-serif`;
    spaced(ctx, b.label.toUpperCase(), w / 2, y + 30 * k, 6 * k);
    y += 56 * k;
    ctx.fillStyle = IVOIRE; ctx.font = `600 ${nameSize}px Lora, serif`;
    for (const line of wrap(ctx, b.name, maxW)) { y += nameSize; ctx.fillText(line, w / 2, y); y += nameSize * 0.15; }
    y += gap;
  });

  // Pied : invitation et adresse
  const fy = h - (tall ? 250 : 150);
  ctx.fillStyle = IVOIRE; ctx.font = `italic 500 ${Math.round(50 * k)}px Lora, serif`;
  ctx.fillText(c.question, w / 2, fy);
  ctx.fillStyle = OR;
  let size = Math.round(32 * k);
  ctx.font = `500 ${size}px Poppins, sans-serif`;
  while (size > 18 && ctx.measureText(c.address).width > maxW) { size -= 1; ctx.font = `500 ${size}px Poppins, sans-serif`; }
  ctx.fillText(c.address, w / 2, fy + 70 * k);
}

/** Crée l'image PNG, ou null si le navigateur ne sait pas dessiner. */
export async function renderCard(format: CardFormat, content: CardContent): Promise<Blob | null> {
  const { w, h } = CARD_SIZES[format];
  try {
    await Promise.all([
      document.fonts?.load('600 40px Lora'), document.fonts?.load('italic 500 40px Lora'),
      document.fonts?.load('600 30px Poppins'), document.fonts?.load('500 30px Poppins'),
    ]);
  } catch { /* polices de secours */ }
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  drawCard(ctx, format, content);
  return new Promise(resolve => canvas.toBlob(b => resolve(b), 'image/png'));
}
