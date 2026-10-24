import { useEffect, useRef, useState } from 'react';
import { IconeJourneeSuite } from './IconeJourneeSuite';
import { MEDIAS_URL } from './AudioCard';

/** Adresse publique de l'audio d'une question (n = 0 à 20) dans le dossier de la version du test. */
export function audioQuestionUrl(dossier: string, n: number): string {
  return `${MEDIAS_URL}/medias-publics/${dossier}/question-${String(n + 1).padStart(2, '0')}.mp3`;
}

const LIBELLES = {
  fr: { ecouter: 'Écouter la question', arreter: 'Arrêter l’écoute', erreur: 'Audio indisponible pour le moment. Tu peux lire la question.' },
  en: { ecouter: 'Listen to the question', arreter: 'Stop listening', erreur: 'Audio unavailable for now. You can read the question.' },
};

/**
 * Bouton « Écouter la question » (décision du 24/10/2026, voix « Justin pasteur » validée par Dr Justin).
 * Le son ne démarre que sur appui ; il s'arrête quand la question change ou quand l'écran se ferme.
 */
export function EcouterQuestion({ dossier, n, langue = 'fr' }: { dossier: string; n: number; langue?: 'fr' | 'en' }) {
  const L = LIBELLES[langue];
  const audio = useRef<HTMLAudioElement | null>(null);
  const [etat, setEtat] = useState<'pret' | 'lecture' | 'erreur'>('pret');

  useEffect(() => {
    setEtat('pret');
    return () => { audio.current?.pause(); audio.current = null; };
  }, [dossier, n]);

  const basculer = () => {
    if (etat === 'lecture') { audio.current?.pause(); if (audio.current) audio.current.currentTime = 0; setEtat('pret'); return; }
    if (typeof Audio === 'undefined') { setEtat('erreur'); return; }
    if (!audio.current) {
      const a = new Audio(audioQuestionUrl(dossier, n));
      a.addEventListener('ended', () => setEtat('pret'));
      a.addEventListener('error', () => setEtat('erreur'));
      audio.current = a;
    }
    audio.current.currentTime = 0;
    setEtat('lecture');
    void Promise.resolve(audio.current.play()).catch(() => setEtat('erreur'));
  };

  return <div className="ecouter-question">
    <button type="button" className="ecouter-bouton" aria-pressed={etat === 'lecture'} onClick={basculer}>
      <IconeJourneeSuite nom={etat === 'lecture' ? 'volume_up' : 'headphones'} taille={20} />
      {etat === 'lecture' ? L.arreter : L.ecouter}
    </button>
    {etat === 'erreur' && <span className="ecouter-erreur" role="status">{L.erreur}</span>}
  </div>;
}
