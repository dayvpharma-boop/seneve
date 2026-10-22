import { useState } from 'react';
import { Link } from 'react-router-dom';
import { draft, NOTE_MAX } from '@/lib/journal';
import { IconeJournee } from '@/components/IconeJournee';

/** Même brouillon que le Journal ; aucun envoi ou file de synchronisation. */
export function BrouillonHorsLigne({ userId, activite, lien, question, langue }: { userId: string; activite: string; lien: string; question: string; langue: string }) {
 const en = langue === 'en';
 const cle = `journal:${activite}`;
 const [texte, setTexte] = useState(() => draft.read(cle, userId));
 const [message, setMessage] = useState('');
 const garder = () => {
  draft.write(cle, texte, userId);
  setMessage(draft.read(cle, userId) === texte ? (en ? 'Draft kept on this device. Not saved to your journal yet.' : 'Brouillon conservé sur cet appareil. Pas encore enregistré dans ton journal.') : (en ? 'Draft not kept. Leave this page open and copy your text.' : 'Brouillon non conservé. Garde cette page ouverte et copie ton texte.'));
 };
 return <div className="offline-journal">
  <div className="offline-journal-entete"><IconeJournee nom="edit_note" taille={20} /><span>{en ? 'Draft on this device' : 'Brouillon sur cet appareil'}</span></div>
  <p>{en ? 'You can write now. Save your note to your journal when you are connected again.' : 'Tu peux écrire maintenant. Enregistre ensuite ta note dans le journal quand la connexion sera revenue.'}</p>
  <div className="offline-saisie"><label htmlFor="brouillon-offline">{question}</label><textarea id="brouillon-offline" value={texte} maxLength={NOTE_MAX} rows={4} placeholder={en ? 'Write freely here…' : 'Écris ici en toute liberté…'} onChange={e => { setTexte(e.target.value); setMessage(''); draft.write(cle, e.target.value, userId); }} /><button type="button" onClick={garder} disabled={!texte.trim()}><IconeJournee nom="save" taille={16} />{en ? 'Keep draft' : 'Conserver le brouillon'}</button></div>
  {message && <p role="status">{message}</p>}
  {texte.trim() && draft.read(cle, userId) === texte && <p className="offline-brouillon-note"><IconeJournee nom="inventory_2" taille={18} />{en ? 'A draft is available on this device.' : 'Un brouillon est disponible sur cet appareil.'}</p>}
  <Link className="offline-journal-lien" to={lien}>{en ? 'Open my journal' : 'Ouvrir mon journal'}</Link>
 </div>;
}
