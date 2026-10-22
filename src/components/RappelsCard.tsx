import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { MOMENTS, PAR_DEFAUT, RefusNotifications, abonnementActuel, abonner, clesAbonnement, fuseauTelephone, heuresPossibles, possibilite, type Moment, type Moments } from '@/lib/rappels';

type Etat = { actif: boolean; cet_appareil: boolean; appareils: number; moments: Moments; fuseau: string; cle_publique: string | null };

// Textes des rappels présentés à Dr Justin le 22/10/2026 (« Rappels sur ce téléphone »).
export const RAPPELS_TEXTES = {
  fr: {
    titre: 'Rappels sur ce téléphone',
    moments: { matin: 'Matin', midi: 'Midi', soir: 'Soir' } as Record<Moment, string>,
    heure: (m: string) => `Heure du rappel : ${m}`,
    recevoir: 'Recevoir mes rappels', arreter: 'Arrêter les rappels', patienter: 'Un instant…',
    actifs: 'Rappels activés sur ce téléphone.',
    autreTelephone: 'Rappels activés sur un autre téléphone. Tu peux aussi les recevoir sur celui-ci.',
    note: 'Les rappels peuvent arriver en retard ou ne pas arriver ; ton parcours reste toujours disponible ici.',
    iphone: 'Sur iPhone, ajoute d’abord SÉNEVÉ à ton écran d’accueil (bouton Partager, puis « Sur l’écran d’accueil »), puis ouvre SÉNEVÉ depuis cette icône.',
    impossible: 'Ce navigateur ne permet pas de recevoir les rappels.',
    bientot: 'Les rappels seront disponibles dans quelques minutes. Réessaie plus tard.',
    refus: 'Les notifications sont bloquées pour SÉNEVÉ. Autorise-les dans les réglages de ton navigateur, puis réessaie.',
    erreur: 'Ton choix n’a pas été enregistré. Vérifie ta connexion et réessaie.',
  },
  en: {
    titre: 'Reminders on this phone',
    moments: { matin: 'Morning', midi: 'Midday', soir: 'Evening' } as Record<Moment, string>,
    heure: (m: string) => `Reminder time: ${m}`,
    recevoir: 'Get my reminders', arreter: 'Stop reminders', patienter: 'Just a moment…',
    actifs: 'Reminders are on for this phone.',
    autreTelephone: 'Reminders are on for another phone. You can also get them on this one.',
    note: 'Reminders may arrive late or not at all; your journey is always available here.',
    iphone: 'On iPhone, first add SÉNEVÉ to your Home Screen (Share button, then “Add to Home Screen”), then open SÉNEVÉ from that icon.',
    impossible: 'This browser cannot receive reminders.',
    bientot: 'Reminders will be available in a few minutes. Please try again later.',
    refus: 'Notifications are blocked for SÉNEVÉ. Allow them in your browser settings, then try again.',
    erreur: 'Your choice was not saved. Check your connection and try again.',
  },
} as const;

/** Rappels sur ce téléphone : désactivés par défaut, la personne choisit ses moments et ses heures. */
export function RappelsCard({ langue }: { langue: string }) {
  const T = RAPPELS_TEXTES[langue === 'en' ? 'en' : 'fr'];
  const [poss] = useState(() => possibilite());
  const [etat, setEtat] = useState<Etat | null>(null);
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [choix, setChoix] = useState<Moments>({ matin: PAR_DEFAUT.matin, midi: null, soir: null });
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState('');

  function appliquer(e: Etat) { setEtat(e); setChoix({ matin: null, midi: null, soir: null, ...e.moments }); }

  useEffect(() => {
    let annule = false;
    void (async () => {
      try {
        const sub = await abonnementActuel().catch(() => null);
        const { data, error } = await supabase.rpc('rappels_etat', { p_endpoint: sub?.endpoint ?? null });
        if (annule || error || !data) return;
        setEndpoint(sub?.endpoint ?? null); appliquer(data as Etat);
      } catch { /* la carte reste masquée */ }
    })();
    return () => { annule = true; };
  }, []);

  const moments = (): Record<Moment, string | null> => ({ matin: choix.matin ?? null, midi: choix.midi ?? null, soir: choix.soir ?? null });
  const unMoment = MOMENTS.some(m => choix[m]);

  async function recevoir() {
    if (!etat || busy) return;
    if (!etat.cle_publique) { setErreur(T.bientot); return; }
    setBusy(true); setErreur('');
    try {
      const sub = await abonner(etat.cle_publique);
      const k = clesAbonnement(sub);
      const { data, error } = await supabase.rpc('rappels_activer', { p_endpoint: k.endpoint, p_p256dh: k.p256dh, p_auth: k.auth, p_moments: moments(), p_fuseau: fuseauTelephone() });
      if (error || !data) throw error ?? new Error('refus');
      setEndpoint(k.endpoint); appliquer(data as Etat);
    } catch (e) { setErreur(e instanceof RefusNotifications ? T.refus : T.erreur); }
    finally { setBusy(false); }
  }

  async function regler(suivant: Moments) {
    setChoix(suivant);
    if (!etat?.actif || !MOMENTS.some(m => suivant[m])) return;
    setErreur('');
    const { data, error } = await supabase.rpc('rappels_regler', { p_moments: { matin: suivant.matin ?? null, midi: suivant.midi ?? null, soir: suivant.soir ?? null }, p_endpoint: endpoint });
    if (error || !data) { setErreur(T.erreur); return; }
    appliquer(data as Etat);
  }

  async function arreter() {
    if (busy) return;
    setBusy(true); setErreur('');
    try {
      const { data, error } = await supabase.rpc('rappels_arreter');
      if (error || !data) throw error ?? new Error('refus');
      const sub = await abonnementActuel().catch(() => null);
      await sub?.unsubscribe().catch(() => undefined);
      setEndpoint(null); appliquer(data as Etat);
    } catch { setErreur(T.erreur); }
    finally { setBusy(false); }
  }

  if (!etat) return null;
  const actifIci = etat.actif && etat.cet_appareil;
  return <div className="card rappels-carte" id="rappels">
    <p className="rappels-titre">{T.titre}</p>
    {poss === 'iphone-ecran-accueil' ? <p className="muted">{T.iphone}</p>
      : poss === 'non' ? <p className="muted">{T.impossible}</p>
      : <>
        <fieldset className="rappels-moments" disabled={busy}>
          <legend className="sr-only">{T.titre}</legend>
          {MOMENTS.map(m => <div key={m} className="rappels-moment">
            <label><input type="checkbox" checked={Boolean(choix[m])} onChange={e => void regler({ ...choix, [m]: e.target.checked ? PAR_DEFAUT[m] : null })} /><span>{T.moments[m]}</span></label>
            {choix[m] && <select aria-label={T.heure(T.moments[m])} value={choix[m] ?? ''} onChange={e => void regler({ ...choix, [m]: e.target.value })}>
              {heuresPossibles(m).map(h => <option key={h} value={h}>{h.replace(':', ' h ')}</option>)}
            </select>}
          </div>)}
        </fieldset>
        {actifIci ? <p className="muted" role="status">{T.actifs}</p> : etat.actif && <p className="muted" role="status">{T.autreTelephone}</p>}
        {!actifIci && <button type="button" className="btn" disabled={busy || !unMoment} onClick={() => void recevoir()}>{busy ? T.patienter : T.recevoir}</button>}
        {etat.actif && <button type="button" className="link rappels-arreter" disabled={busy} onClick={() => void arreter()}>{T.arreter}</button>}
      </>}
    <p className="muted rappels-note">{T.note}</p>
    {erreur && <p className="error" role="alert">{erreur}</p>}
  </div>;
}
