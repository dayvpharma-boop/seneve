import {IconeJourneeSuite} from './IconeJourneeSuite';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

// Médias publics (Découverte gratuite) : stockage SÉNEVÉ, lecture sans clé. Les médias protégés
// passeront plus tard par un accès contrôlé (cahier n°6) ; ils ne sont pas servis ici.
export const MEDIAS_URL = 'https://lclquncbhrmpwxgsthhk.supabase.co/storage/v1/object/public';

type Ressource = { titre: string | null; reference_stockage: string; content_id: string };

const TEXTES = {
  fr: { tag: 'Écouter', texte: 'Écoute l’enseignement du jour, à ton rythme.', voix: 'Voix de synthèse.', nonPris: 'Ton navigateur ne peut pas lire cet audio.', audioJour: 'Audio du jour', aucun: 'Aucun audio publié pour cette journée. Tu peux lire l’enseignement du jour.', indisponible: 'Lecture audio indisponible', vitesse: (v: number) => `Vitesse de lecture : ${v} fois` },
  en: { tag: 'Listen', texte: 'Listen to today’s teaching, at your own pace.', voix: 'Synthetic voice.', nonPris: 'Your browser cannot play this audio.', audioJour: 'Today’s audio', aucun: 'No audio has been published for this day. You can read today’s teaching.', indisponible: 'Audio not available', vitesse: (v: number) => `Playback speed: ${v} times` },
};

/** Audio publié et validé des contenus du jour. Rien si aucun audio n'est publié (jamais d'audio non validé). */
export function AudioCard({ contentIds, langue,maquette=false }: { contentIds: string[]; langue?: string;maquette?:boolean }) {
  const T = TEXTES[langue === 'en' ? 'en' : 'fr'];
  const [vitesse,setVitesse]=useState(1);
  const [audios, setAudios] = useState<Ressource[]>([]);
  const cle = contentIds.join(',');

  useEffect(() => {
    let annule = false;
    setAudios([]);
    if (!cle) return;
    void Promise.resolve(supabase.from('resources').select('titre, reference_stockage, content_id')
      .eq('type_media', 'audio').eq('etat', 'publie').eq('est_public', true).in('content_id', cle.split(',')))
      .then(r => { if (!annule && Array.isArray(r?.data)) setAudios(r.data as Ressource[]); })
      .catch(() => undefined);
    return () => { annule = true; };
  }, [cle]);

  if (!audios.length) return maquette?<section className="card audio-card" aria-label={T.audioJour}><p className="tag"><IconeJourneeSuite nom="headphones"/>{T.audioJour}</p><p>{T.aucun}</p><button className="btn-secondaire" type="button" disabled>{T.indisponible}</button></section>:null;
  return <section className="card audio-card" aria-label={T.tag}>
    <p className="tag"><IconeJourneeSuite nom="headphones"/>{maquette?T.audioJour:T.tag}</p>
    <p className="more">{T.texte}</p>
    {audios.map(a => <figure key={a.reference_stockage} className="audio-item">
      {a.titre && <figcaption>{a.titre}</figcaption>}
      <audio ref={el=>{if(el)el.playbackRate=vitesse;}} controls preload="none" src={`${MEDIAS_URL}/${a.reference_stockage}`}>{T.nonPris}</audio>
    </figure>)}
    <button className="jn-vitesse" type="button" aria-label={T.vitesse(vitesse)} onClick={()=>setVitesse(v=>v===1?1.25:v===1.25?1.5:v===1.5?2:1)}>{vitesse}x</button><p className="muted audio-note">{T.voix}</p>
  </section>;
}
