import {GRAIN_PARTAGE,VERIFIED_PARTAGE} from './grain-partage';
// Image à partager après le Test des 7 Racines, dessinée dans le navigateur (aucune donnée envoyée).
// Elle ne montre jamais de note chiffrée : seulement le nom des racines.

export type CardFormat = 'vertical' | 'carre';
export const CARD_SIZES: Record<CardFormat, { w: number; h: number }> = {
  vertical: { w: 1080, h: 1920 }, // Stories, Reels, TikTok, Shorts, statuts
  carre: { w: 1080, h: 1080 },    // publications Facebook, Instagram, LinkedIn, X, Telegram
};
export const NOIR = '#0A0907', OR = '#C9A84C', IVOIRE = '#F4EEDF', IVOIRE_DOUX = 'rgba(244,238,223,0.72)';

export interface CardContent {
  design?: 'editorial';
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

/** Adresse courte affichée sur l'image : /p ouvre le test avec la provenance « partage ». */
export function shareAddress(host: string, base: string, language: 'fr' | 'en'): string {
  const path = base.endsWith('/') ? base : `${base}/`;
  return `${host}${path}p${language === 'en' ? '?lang=en' : ''}`;
}

export function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
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

export function spaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number) {
  // Lettres espacées, centrées sur x (letterSpacing n'existe pas partout).
  const chars = [...text];
  const width = chars.reduce((sum, c) => sum + ctx.measureText(c).width, 0) + spacing * (chars.length - 1);
  let cx = x - width / 2;
  ctx.textAlign = 'left';
  for (const c of chars) { ctx.fillText(c, cx, y); cx += ctx.measureText(c).width + spacing; }
  ctx.textAlign = 'center';
}

/** Petite graine de sénevé et ses sept racines, à la couleur or. */
export function seed(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
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
  if(c.design==='editorial'){drawEditorial(ctx,format,c);return;}
  const { w, h } = CARD_SIZES[format];
  const tall = format === 'vertical';
  // Tailles : le vertical est lu en plein écran, le carré dans un fil d'actualité.
  const m = tall
    ? { top: 250, brand: 46, title: 80, book: 40, seed: 2.6, label: 40, name: 128, name2: 100, question: 64, address: 44, foot: 250 }
    : { top: 150, brand: 34, title: 60, book: 30, seed: 0, label: 32, name: 100, name2: 68, question: 48, address: 34, foot: 140 };
  const maxW = w - 180;
  ctx.fillStyle = NOIR; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = OR; ctx.globalAlpha = 0.6; ctx.lineWidth = 4;
  ctx.strokeRect(44, 44, w - 88, h - 88);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';

  // En-tête
  let y = m.top;
  ctx.fillStyle = OR; ctx.font = `600 ${m.brand}px Lora, serif`;
  spaced(ctx, c.brand, w / 2, y, m.brand * 0.45);
  y += m.title * 1.25;
  ctx.fillStyle = IVOIRE; ctx.font = `600 ${m.title}px Lora, serif`;
  for (const line of wrap(ctx, c.title, maxW)) { ctx.fillText(line, w / 2, y); y += m.title * 1.15; }
  y += m.book * 0.1;
  ctx.fillStyle = IVOIRE_DOUX; ctx.font = `italic 500 ${m.book}px Lora, serif`;
  for (const line of wrap(ctx, c.book, maxW)) { ctx.fillText(line, w / 2, y); y += m.book * 1.35; }

  // Corps : une ou deux racines. Avec deux racines, la graine est plus petite.
  const blocks = [c.strength, c.start].filter((b): b is { label: string; name: string } => Boolean(b));
  const seedScale = blocks.length > 1 ? m.seed * 0.6 : m.seed;
  // Graine et ses sept racines (vertical seulement)
  if (seedScale) {
    const cy = y + 66 * seedScale + 20;
    seed(ctx, w / 2, cy, seedScale);
    y = cy + 70 * seedScale;
  }
  const labelGap = m.label * 1.9;
  const between = m.label * 2.2;
  const footTop = h - m.foot - m.question * 1.2;
  let nameSize = blocks.length > 1 ? m.name2 : m.name;
  let lines: string[][] = [];
  let bodyH = 0;
  // Réduit le nom des racines jusqu'à ce que tout tienne sans toucher le pied.
  for (;;) {
    ctx.font = `600 ${nameSize}px Lora, serif`;
    lines = blocks.map(b => wrap(ctx, b.name, maxW));
    bodyH = lines.reduce((sum, l) => sum + labelGap + l.length * nameSize * 1.12, 0) + between * (blocks.length - 1);
    if (bodyH <= footTop - y - 2 * m.label || nameSize <= 48) break;
    nameSize -= 4;
  }
  y += Math.max(m.label, (footTop - y - bodyH) / 2);
  blocks.forEach((b, i) => {
    if (i > 0) {
      ctx.strokeStyle = OR; ctx.globalAlpha = 0.6; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(w / 2 - 90, y - between / 2); ctx.lineTo(w / 2 + 90, y - between / 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = OR; ctx.font = `600 ${m.label}px Poppins, sans-serif`;
    spaced(ctx, b.label.toUpperCase(), w / 2, y + m.label, m.label * 0.18);
    y += labelGap;
    ctx.fillStyle = IVOIRE; ctx.font = `600 ${nameSize}px Lora, serif`;
    for (const line of lines[i] ?? []) { y += nameSize * 0.95; ctx.fillText(line, w / 2, y); y += nameSize * 0.17; }
    y += between;
  });

  // Pied : invitation et adresse
  const fy = h - m.foot;
  ctx.fillStyle = IVOIRE; ctx.font = `italic 500 ${m.question}px Lora, serif`;
  ctx.fillText(c.question, w / 2, fy);
  ctx.fillStyle = OR;
  let size = m.address;
  ctx.font = `600 ${size}px Poppins, sans-serif`;
  while (size > 20 && ctx.measureText(c.address).width > maxW) { size -= 1; ctx.font = `600 ${size}px Poppins, sans-serif`; }
  ctx.fillText(c.address, w / 2, fy + m.question * 1.35);
}

/** Crée l'image PNG, ou null si le navigateur ne sait pas dessiner. */
export async function renderCard(format: CardFormat, content: CardContent): Promise<Blob | null> {
  const { w, h } = CARD_SIZES[format];
  try {
    await Promise.all([
      document.fonts?.load('600 40px Outfit'), document.fonts?.load('600 40px Lora'), document.fonts?.load('italic 500 40px Lora'),
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

/** Version noir et or de la maquette reçue, sans score ni données personnelles. */
function drawEditorial(ctx:CanvasRenderingContext2D,format:CardFormat,c:CardContent){
 const {w,h}=CARD_SIZES[format];const tall=format==='vertical';const gold='#E6C687',ink='#0E0D0B';ctx.fillStyle=ink;ctx.fillRect(0,0,w,h);ctx.strokeStyle='rgba(230,198,135,.28)';ctx.lineWidth=4;ctx.strokeRect(2,2,w-4,h-4);ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.fillStyle=gold;if(typeof Path2D!=='undefined'){ctx.save();ctx.translate(w/2-50,(tall?155:105)-50);ctx.scale(100/960,100/960);ctx.translate(0,960);ctx.fill(new Path2D(GRAIN_PARTAGE));ctx.restore();}else{seed(ctx,w/2,tall?155:105,.52);}
 ctx.font='600 42px Outfit, sans-serif';spaced(ctx,c.brand,w/2,tall?260:190,8);
 ctx.fillStyle='#ccc6bd';ctx.font='400 38px Outfit, sans-serif';ctx.fillText(c.title.toUpperCase(),w/2,tall?325:245);
 const main=c.start??c.strength;if(main){ctx.fillStyle=gold;ctx.font='500 38px Outfit, sans-serif';ctx.fillText(main.label.toUpperCase(),w/2,tall?820:490);let size=tall?72:64;ctx.font=`600 ${size}px Outfit, sans-serif`;let lines=wrap(ctx,main.name,w-180);while(lines.length>3&&size>44){size-=4;ctx.font=`600 ${size}px Outfit, sans-serif`;lines=wrap(ctx,main.name,w-180);}ctx.fillStyle='#fff';lines.forEach((line,i)=>ctx.fillText(line,w/2,(tall?935:590)+i*size*1.3));
 if(c.start&&c.strength){const y=(tall?935:590)+lines.length*size*1.3+40;const label=`${c.strength.label} : ${c.strength.name}`;let fs=42;ctx.font=`500 ${fs}px Outfit, sans-serif`;while(fs>28&&ctx.measureText(label).width>w-300){fs-=2;ctx.font=`500 ${fs}px Outfit, sans-serif`;}const bw=Math.min(w-150,ctx.measureText(label).width+130),x=(w-bw)/2,top=y-30,bh=88,rad=44;ctx.beginPath();ctx.moveTo(x+rad,top);ctx.lineTo(x+bw-rad,top);ctx.quadraticCurveTo(x+bw,top,x+bw,top+rad);ctx.lineTo(x+bw,top+bh-rad);ctx.quadraticCurveTo(x+bw,top+bh,x+bw-rad,top+bh);ctx.lineTo(x+rad,top+bh);ctx.quadraticCurveTo(x,top+bh,x,top+bh-rad);ctx.lineTo(x,top+rad);ctx.quadraticCurveTo(x,top,x+rad,top);ctx.fillStyle='rgba(230,198,135,.12)';ctx.fill();ctx.strokeStyle='rgba(230,198,135,.25)';ctx.lineWidth=2;ctx.stroke();if(typeof Path2D!=='undefined'){ctx.save();ctx.translate(x+28,top+22);ctx.scale(44/960,44/960);ctx.translate(0,960);ctx.fillStyle=gold;ctx.fill(new Path2D(VERIFIED_PARTAGE));ctx.restore();}ctx.fillStyle='#fff9ea';ctx.fillText(label,w/2+20,top+bh/2);}}

 ctx.strokeStyle='rgba(230,198,135,.15)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(80,h-190);ctx.lineTo(w-80,h-190);ctx.stroke();ctx.fillStyle=gold;let size=42;ctx.font=`500 ${size}px Outfit, sans-serif`;while(size>16&&ctx.measureText(c.address).width>w-150){size--;ctx.font=`500 ${size}px Outfit, sans-serif`;}ctx.fillText(c.address,w/2,h-115);
}
