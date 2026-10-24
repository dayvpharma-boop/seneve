import type { Periode } from './Scene';

const PHOTOS: Record<Periode, string> = {
  matin: 'lecture-aube-photo-v1',
  midi: 'lecture-midi-photo-v1',
  soir: 'lecture-soir-photo-v1',
};

/** Photo décorative du moment : les titres voisins donnent déjà l’information dans la langue du parcours. */
export function ImageMoment({ periode }: { periode: Periode }) {
  const base = `${import.meta.env.BASE_URL}illustrations/${PHOTOS[periode]}`;
  return <img className="illustration-lecture" src={`${base}-720.webp`} srcSet={`${base}-360.webp 360w, ${base}-720.webp 720w`} sizes="(max-width:600px) calc(100vw - 60px), 540px" width={720} height={360} alt="" decoding="async" loading="lazy" />;
}
