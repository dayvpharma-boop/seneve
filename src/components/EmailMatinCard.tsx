import {IconeJourneeSuite} from './IconeJourneeSuite';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Etat = { actif: boolean; concerne: boolean; email: string | null };

export const EMAIL_MATIN_TEXTES = {
  fr: {
    titre: 'E-mail du matin',
    texte: 'Chaque matin, à partir de 7 h, un e-mail te dit que ta journée est ouverte, avec un lien pour la commencer.',
    case: 'Oui, je veux recevoir un e-mail chaque matin',
    adresse: (e: string) => `Adresse : ${e}`,
    actif: 'Activé. Tu peux l’arrêter à tout moment en décochant la case.',
    inactif: 'Désactivé. Tu ne reçois aucun e-mail du matin.',
    erreur: 'Ton choix n’a pas été enregistré. Vérifie ta connexion et réessaie.',
  },
  en: {
    titre: 'Morning e-mail',
    texte: 'Every morning, from 7 am, an e-mail tells you that your day is open, with a link to start it.',
    case: 'Yes, I want to receive an e-mail every morning',
    adresse: (e: string) => `Address: ${e}`,
    actif: 'On. You can stop it at any time by unticking the box.',
    inactif: 'Off. You receive no morning e-mail.',
    erreur: 'Your choice was not saved. Check your connection and try again.',
  },
} as const;

/** Choix de l'e-mail du matin, pour les parcours commencés sur le site (pas ceux suivis sur WhatsApp). */
export function EmailMatinCard({ langue,maquette=false }: { langue: string;maquette?:boolean }) {
  const T = EMAIL_MATIN_TEXTES[langue === 'en' ? 'en' : 'fr'];
  const [etat, setEtat] = useState<Etat | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    void Promise.resolve(supabase.rpc('email_matin_etat')).then(r => {
      if (!r?.error && r?.data) setEtat(r.data as Etat);
    }).catch(() => undefined);
  }, []);

  async function changer(actif: boolean) {
    if (busy) return;
    setBusy(true); setError(false);
    const { data, error } = await supabase.rpc('email_matin_choisir', { p_actif: actif });
    setBusy(false);
    if (error || !data) { setError(true); return; }
    setEtat(data as Etat);
  }

  if (!etat || !etat.concerne) return maquette?<div className="card"><p className="tag">{T.titre}</p><p>{etat?'Cet e-mail n’est pas proposé pour le parcours actuellement suivi.':'Vérification de ton choix d’e-mail du matin…'}</p></div>:null;
  return <div className="card" id="email-matin">
    <p className="tag">{T.titre}{maquette&&<span className="rn-statut">{etat.actif?'Actif':'Désactivé'}</span>}</p>
    <p>{maquette?'Chaque matin, à partir de 7 h, un e-mail te dit que ta journée est ouverte.':T.texte}</p>
    <label className="share-check">
      <input type="checkbox" checked={etat.actif} disabled={busy} onChange={e => void changer(e.target.checked)} />
      <span>{T.case}{maquette&&<small className="rn-email-etat" role="status">{etat.actif?'Activé. Tu peux l’arrêter à tout moment.':T.inactif}</small>}</span>
    </label>
    {etat.email && <p className="muted rn-email-adresse">{maquette&&<IconeJourneeSuite nom="alternate_email" taille={16}/>} {T.adresse(maquette?etat.email.replace(/^(.{4})[^@]*@/,'$1***@'):etat.email)}</p>}
    {!maquette&&<p className="muted" role="status">{etat.actif ? T.actif : T.inactif}</p>}
    {error && <p className="error" role="alert">{T.erreur}</p>}
  </div>;
}
