/** Images et vidéos des annonces (décision de Dr Justin du 29/10/2026, seneve_051).
 *  Image : réduite sur l'appareil (JPEG, 1600 px au plus, 2 Mo au plus), déposée dans le stockage public « annonces »
 *  sous le nom <client_id>.jpg. Vidéo : un lien YouTube ou TikTok seulement, rien n'est hébergé chez SÉNEVÉ. */
import { supabase } from './supabase';

export const STOCKAGE_ANNONCES = 'annonces';
export const IMAGE_MAX_SOURCE = 20 * 1024 * 1024;
export const IMAGE_MAX_ENVOI = 2 * 1024 * 1024;
export class ImageInvalide extends Error {}

export type VideoAnnonce = { plateforme: 'youtube' | 'tiktok'; lien: string; integration: string | null; verticale: boolean; vignette: string | null };

// Mêmes règles que la base (seneve_051) : https seulement, domaines exacts, aucun espace.
const YOUTUBE = /^https:\/\/((www|m)\.)?youtube\.com\/(watch\?v=|shorts\/|live\/)([A-Za-z0-9_-]{11})([?&#][A-Za-z0-9_=&%.-]*)?$/;
const YOUTU_BE = /^https:\/\/youtu\.be\/([A-Za-z0-9_-]{11})([?#][A-Za-z0-9_=&%.-]*)?$/;
const TIKTOK = /^https:\/\/((www|m|vm|vt)\.)?tiktok\.com\/[A-Za-z0-9@._/-]+([?#][A-Za-z0-9_=&%.-]*)?$/;

/** Lien reconnu (YouTube ou TikTok) ou null. Un lien TikTok court (vm.tiktok.com) s'ouvre dans TikTok, sans lecteur intégré. */
export function analyserLienVideo(saisie: string | null | undefined): VideoAnnonce | null {
  const lien = (saisie ?? '').trim();
  if (!lien || lien.length > 500 || /\s/.test(lien)) return null;
  const yt = YOUTUBE.exec(lien), court = YOUTU_BE.exec(lien);
  if (yt || court) {
    const id = yt ? yt[4] : court![1];
    return { plateforme: 'youtube', lien, integration: `https://www.youtube-nocookie.com/embed/${id}`, verticale: yt?.[3] === 'shorts/', vignette: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` };
  }
  if (TIKTOK.test(lien)) {
    const id = /\/video\/(\d{8,25})(?:[/?#]|$)/.exec(lien)?.[1];
    return { plateforme: 'tiktok', lien, integration: id ? `https://www.tiktok.com/embed/v2/${id}` : null, verticale: true, vignette: null };
  }
  return null;
}

export function lienImageAnnonce(chemin: string): string {
  return supabase.storage.from(STOCKAGE_ANNONCES).getPublicUrl(chemin).data.publicUrl;
}

/** Réduit la photo choisie (sans ses métadonnées : lieu, appareil) avant l'envoi. */
export async function preparerImageAnnonce(fichier: File): Promise<Blob> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(fichier.type) || fichier.size === 0 || fichier.size > IMAGE_MAX_SOURCE) throw new ImageInvalide();
  const url = URL.createObjectURL(fichier);
  try {
    const image = new Image(); image.decoding = 'async'; image.src = url;
    await image.decode();
    const l = image.naturalWidth, h = image.naturalHeight;
    if (!l || !h || l * h > 60_000_000) throw new ImageInvalide();
    for (const [cote, qualite] of [[1600, .85], [1200, .78], [900, .7]] as const) {
      const r = Math.min(1, cote / Math.max(l, h));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(l * r)); canvas.height = Math.max(1, Math.round(h * r));
      const ctx = canvas.getContext('2d'); if (!ctx) throw new ImageInvalide();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', qualite));
      if (blob && blob.size > 0 && blob.size <= IMAGE_MAX_ENVOI) return blob;
    }
    throw new ImageInvalide();
  } catch (e) { if (e instanceof ImageInvalide) throw e; throw new ImageInvalide(); }
  finally { URL.revokeObjectURL(url); }
}

/** Dépose l'image sous <client_id>.jpg. Un nouvel essai avec le même identifiant retrouve le fichier déjà déposé. */
export async function envoyerImageAnnonce(clientId: string, image: Blob): Promise<string> {
  if (image.type !== 'image/jpeg' || image.size === 0 || image.size > IMAGE_MAX_ENVOI) throw new ImageInvalide();
  const chemin = `${clientId}.jpg`;
  const { error } = await supabase.storage.from(STOCKAGE_ANNONCES).upload(chemin, image, { contentType: 'image/jpeg', upsert: false, cacheControl: '31536000' });
  if (error) {
    const e = error as { statusCode?: string | number; message?: string };
    if (String(e.statusCode) === '409' || /exist|duplicate/i.test(e.message ?? '')) return chemin;
    throw error;
  }
  return chemin;
}
