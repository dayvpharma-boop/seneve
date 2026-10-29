import { Link } from 'react-router-dom';
import { IconeJournee } from '@/components/IconeJournee';
import { IconeEdition } from '@/components/IconeEdition';
import type { EntreeFile } from '@/lib/file-actions';

/** Maquette Stitch n° 6 (28/10/2026) : état réel de la sauvegarde d'une action notée sans réseau. */
export function EtatSauvegarde({ entree, recu, echecLocal, langue, enrollmentId, reessayer }: { entree: EntreeFile | null; recu: boolean; echecLocal: boolean; langue: string; enrollmentId: string; reessayer: () => void }) {
  const en = langue === 'en';
  const choix = entree ? (entree.choix === 'realisee' ? (en ? 'action done' : 'action réalisée') : entree.choix === 'partielle' ? (en ? 'partly done' : 'réalisée en partie') : (en ? 'prepared' : 'préparée')) : '';
  const etat = echecLocal ? 'refuse-local' : recu ? 'recu' : entree?.statut === 'appareil' && typeof navigator !== 'undefined' && navigator.onLine !== false ? 'attente' : entree?.statut ?? 'attente';
  const v: Record<string, { cls: string; icone: 'offline_pin' | 'schedule' | 'sync' | 'check_circle' | 'error'; titre: string; phrase?: string }> = {
    appareil: { cls: 'is-appareil', icone: 'offline_pin', titre: en ? 'Saved on this device' : 'Enregistré sur cet appareil', phrase: en ? 'Not sent to SÉNEVÉ yet.' : 'Pas encore envoyé à SÉNEVÉ.' },
    attente: { cls: 'is-attente', icone: 'schedule', titre: en ? 'Waiting for connection' : 'En attente de connexion', phrase: en ? 'Will be sent when the network is back.' : 'Sera envoyé au retour du réseau.' },
    envoi: { cls: 'is-envoi', icone: 'sync', titre: en ? 'Sending…' : 'Envoi en cours…' },
    recu: { cls: 'is-recu', icone: 'check_circle', titre: en ? 'Saved' : 'Enregistré', phrase: en ? 'Received by SÉNEVÉ.' : 'Reçu par SÉNEVÉ.' },
    refuse: { cls: 'is-refuse', icone: 'error', titre: en ? 'Not saved' : 'Non enregistré', phrase: en ? 'Your access needs to be checked. Try again or ask for help.' : 'Ton accès doit être vérifié. Réessaie ou demande de l’aide.' },
    'refuse-local': { cls: 'is-refuse', icone: 'error', titre: en ? 'Not saved' : 'Non enregistré', phrase: en ? 'This device could not keep your action. Try again when you are back online.' : 'Cet appareil n’a pas pu garder ton action. Réessaie quand la connexion sera revenue.' },
  };
  const x = v[etat] ?? v.attente!;
  return <div className={`etat-sauvegarde ${x.cls}`} role="status">
    {choix && <p className="etat-choix">{en ? 'Your choice: ' : 'Ton choix : '}{choix}</p>}
    <span className="etat-badge"><IconeSauvegarde nom={x.icone} />{x.titre}</span>
    {x.phrase && <p>{x.phrase}</p>}
    {etat === 'refuse' && <p className="etat-liens"><button type="button" className="link" onClick={reessayer}>{en ? 'Try again' : 'Réessayer'}</button><Link to={`/aide?inscription=${enrollmentId}`}>{en ? 'Ask for help' : 'Demander de l’aide'}</Link></p>}
  </div>;
}

/** Icônes officielles déjà présentes dans le site (pas de nouveau tracé) : « offline_pin » tient lieu de téléphone. */
function IconeSauvegarde({ nom }: { nom: 'offline_pin' | 'schedule' | 'sync' | 'check_circle' | 'error' }) {
  return nom === 'error' ? <IconeEdition nom="error" taille={18} /> : <IconeJournee nom={nom} taille={18} />;
}
