import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Fausse base : lectures par table, et enregistrement de chaque écriture et appel de fonction.
const tables: Record<string, unknown[]> = {};
const writes: { table: string; op: string; value: unknown }[] = [];
const rpcs: { name: string; args: Record<string, unknown> }[] = [];
let rpcError: { message: string } | null = null;
let insertErrors: ({ code: string; message: string } | null)[] = [];
let authId: string | null = 'U1';
const authListeners = new Set<(event: string, session: { user: { id: string } } | null) => void>();
function changerCompte(id: string | null) {
  authId = id;
  act(() => { for (const f of authListeners) f(id ? 'SIGNED_IN' : 'SIGNED_OUT', id ? { user: { id } } : null); });
}

function builder(table: string) {
  const rows = () => tables[table] ?? [];
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'neq', 'in', 'order', 'range']) b[m] = () => b;
  b['maybeSingle'] = () => Promise.resolve({ data: rows()[0] ?? null, error: null });
  b['then'] = (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => Promise.resolve({ data: rows(), error: null }).then(ok, ko);
  b['insert'] = (value: unknown) => { writes.push({ table, op: 'insert', value }); return Promise.resolve({ error: insertErrors.shift() ?? null }); };
  b['update'] = (value: unknown) => { writes.push({ table, op: 'update', value }); return { eq: () => Promise.resolve({ error: null }) }; };
  b['delete'] = () => { writes.push({ table, op: 'delete', value: null }); return { eq: () => Promise.resolve({ error: null }) }; };
  return b;
}
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: authId ? { user: { id: authId, user_metadata: { prenom: 'Marie' } } } : null } }),
      onAuthStateChange: (f: (event: string, session: { user: { id: string } } | null) => void) => { authListeners.add(f); return { data: { subscription: { unsubscribe: () => authListeners.delete(f) } } }; },
      signOut: () => Promise.resolve({}),
    },
    rpc: (name: string, args: Record<string, unknown>) => {
      rpcs.push({ name, args });
      if (name === 'ensure_participant') return Promise.resolve({ data: 'P1', error: null });
      if (name === 'request_help' && rpcError) return Promise.resolve({ data: null, error: rpcError });
      return Promise.resolve({ data: { etat: 'recue' }, error: null });
    },
    from: (t: string) => builder(t),
  },
  siteUrl: (p: string) => p,
}));

import { Journal } from '@/routes/journal';
import { Aide } from '@/routes/aide';
import { draft, peutAnnuler, texteValide } from '@/lib/journal';

function at(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/journal" element={<Journal />} /><Route path="/aide" element={<Aide />} /><Route path="/espace" element={<p>espace</p>} /><Route path="/connexion" element={<p>Connexion requise</p>} />
  </Routes></MemoryRouter>);
}

beforeEach(() => {
  for (const k of Object.keys(tables)) delete tables[k];
  writes.length = 0; rpcs.length = 0; rpcError = null; insertErrors = [];
  window.localStorage.clear();
  authId = 'U1'; authListeners.clear();
  tables['participants'] = [{ prenom: 'Marie', langue: 'fr' }];
  tables['journal_entries'] = [];
  tables['help_requests'] = [];
  tables['enrollments'] = [];
});
afterEach(() => cleanup());

describe('règles', () => {
  it('texte vide ou trop long refusé', () => {
    expect(texteValide('   ', 10)).toBeNull();
    expect(texteValide('a'.repeat(11), 10)).toBeNull();
    expect(texteValide('  bonjour ', 10)).toBe('bonjour');
  });
  it('annulation possible tant que la demande n’est pas close', () => {
    expect(peutAnnuler('recue')).toBe(true);
    expect(peutAnnuler('attente_participant')).toBe(true);
    expect(peutAnnuler('resolue')).toBe(false);
    expect(peutAnnuler('annulee')).toBe(false);
  });
});

describe('modèles de demande d’aide et langue', () => {
  it.each(['Mon message personnel', ''])('changer de langue conserve la saisie personnalisée %j, même vide', async saisie => {
    render(<MemoryRouter initialEntries={['/aide?lang=en&motif=adresse-email']}>
      <Link to="/aide?lang=fr&motif=adresse-email">Français</Link><Aide />
    </MemoryRouter>);
    const champ = await screen.findByRole('textbox');
    fireEvent.change(champ, { target: { value: saisie } });
    fireEvent.click(screen.getByRole('link', { name: 'Français' }));
    expect(await screen.findByRole('heading', { name: 'Aide & Contact' })).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue(saisie);
    expect(draft.read('aide', 'U1')).toBe(saisie);
  });
  it.each([
    ['suppression-compte', 'I would like to request the deletion of my SÉNEVÉ account.'],
    ['adresse-email', 'I would like to change my account’s email address.'],
    ['export-donnees', 'I would like to receive a copy of all my personal data.'],
  ])('le modèle %s est en anglais quand la page le demande', async (motif, texte) => {
    at(`/aide?lang=en&motif=${motif}`);
    expect(await screen.findByRole('textbox')).toHaveValue(texte);
    expect(rpcs.some(x => x.name === 'request_help')).toBe(false);
  });
  it('le modèle suit le profil anglais chargé après le premier rendu', async () => {
    tables['participants'] = [{ prenom: 'Mary', langue: 'en' }];
    at('/aide?motif=suppression-compte');
    await waitFor(() => expect(screen.getByRole('textbox')).toHaveValue('I would like to request the deletion of my SÉNEVÉ account.'));
  });
  it('le français explicite prime sur le profil anglais', async () => {
    tables['participants'] = [{ prenom: 'Mary', langue: 'en' }];
    at('/aide?lang=fr&motif=adresse-email');
    expect(await screen.findByRole('textbox')).toHaveValue('Je souhaite modifier l’adresse e-mail de mon compte.');
  });
  it('un brouillon personnel reste intact malgré un modèle proposé en anglais', async () => {
    draft.write('aide', 'Mon message déjà commencé', 'U1');
    at('/aide?lang=en&motif=suppression-compte');
    expect(await screen.findByRole('textbox')).toHaveValue('Mon message déjà commencé');
  });
  it('un motif inconnu ne préremplit pas le message', async () => {
    at('/aide?lang=en&motif=constructor');
    expect(await screen.findByRole('textbox')).toHaveValue('');
  });
  it('envoyer une demande vide le modèle et ne le réinsère pas au rechargement des demandes', async () => {
    at('/aide?lang=en&motif=adresse-email');
    await screen.findByRole('textbox');
    fireEvent.submit(document.querySelector('.aide-form')!);
    await waitFor(() => expect(rpcs.some(x => x.name === 'request_help')).toBe(true));
    await waitFor(() => expect(screen.getByRole('textbox')).toHaveValue(''));
  });
});

describe('Mon journal', () => {
  it.each([['matin','fr','Gratitude du matin','Revenir à ma journée'],['soir','en','Evening gratitude','Back to my day']])('gratitude %s : contexte %s, note privée et aucune déclaration HD',async(moment,langue,titre,retour)=>{
    draft.write('journal:libre','Mon brouillon libre','U1');
    at(`/journal?ecrire=1&depuis=habitudes&gratitude=${moment}&lang=${langue}`);
    const champ=await screen.findByRole('textbox');
    expect(screen.getByRole('region',{name:titre})).toBeInTheDocument();
    expect(screen.getByRole('link',{name:new RegExp(retour!)})).toHaveAttribute('href',langue==='en'?'/habitudes/aujourdhui?lang=en':'/habitudes/aujourdhui');
    expect(champ).toHaveValue('');expect(writes).toHaveLength(0);
    fireEvent.change(champ,{target:{value:'Merci pour cette journée'}});
    expect(draft.read(`journal:gratitude_${moment}`,'U1')).toBe('Merci pour cette journée');
    expect(draft.read('journal:libre','U1')).toBe('Mon brouillon libre');
    expect(draft.read(`journal:gratitude_${moment==='matin'?'soir':'matin'}`,'U1')).toBe('');
    fireEvent.click(screen.getByRole('button',{name:langue==='en'?'Save note':'Enregistrer la note'}));
    await waitFor(()=>expect(screen.getByRole('textbox')).toHaveValue(''));
    expect(writes).toHaveLength(1);expect(writes[0]!.value).toMatchObject({texte:'Merci pour cette journée',usage_ia_autorise:false,enrollment_id:null,activity_id:null});
    expect(rpcs.every(x=>x.name==='ensure_participant')).toBe(true);
    expect(draft.read('journal:libre','U1')).toBe('Mon brouillon libre');
  });
  it.each(['depuis=habitudes&gratitude=inconnu','gratitude=matin','depuis=habitudes&gratitude=matin&inscription=E1'])('ignore un contexte gratitude invalide : %s',async(query)=>{
    draft.write('journal:libre','Brouillon libre','U1');
    at(`/journal?${query}`);
    expect(await screen.findByRole('textbox')).toHaveValue('Brouillon libre');
    expect(screen.queryByRole('region',{name:/Gratitude/})).toBeNull();
    expect(screen.queryByRole('link',{name:/Revenir à ma journée/})).toBeNull();expect(writes).toHaveLength(0);
  });
  it('isole les brouillons de deux comptes et restaure celui du premier après reconnexion', async () => {
    at('/journal');
    const champ = await screen.findByPlaceholderText(/Ce que tu as compris/);
    fireEvent.change(champ, { target: { value: 'Réflexion privée de Marie' } });
    changerCompte('U2');
    expect(await screen.findByPlaceholderText(/Ce que tu as compris/)).toHaveValue('');
    fireEvent.change(screen.getByPlaceholderText(/Ce que tu as compris/), { target: { value: 'Texte du second compte' } });
    changerCompte('U1');
    expect(await screen.findByPlaceholderText(/Ce que tu as compris/)).toHaveValue('Réflexion privée de Marie');
    expect(draft.read('journal:libre', 'U2')).toBe('Texte du second compte');
    expect(writes).toHaveLength(0);
  });

  it('ne récupère jamais un ancien brouillon sans propriétaire et le conserve intact', async () => {
    localStorage.setItem('seneve:journal:libre', 'Ancien texte sans compte identifié');
    at('/journal');
    expect(await screen.findByPlaceholderText(/Ce que tu as compris/)).toHaveValue('');
    expect(localStorage.getItem('seneve:journal:libre')).toBe('Ancien texte sans compte identifié');
    changerCompte(null);
    expect(await screen.findByText('Connexion requise')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('ajoute une citation biblique au seul brouillon du compte courant', async () => {
    draft.write('journal:libre', 'Mon début de réflexion', 'U1');
    draft.write('journal:libre', 'Autre compte', 'U2');
    const citation = 'Le juste vivra par la foi. — Romains 1:17';
    render(<MemoryRouter initialEntries={[{ pathname: '/journal', state: { citationBiblique: citation } }]}><Routes><Route path="/journal" element={<Journal />} /></Routes></MemoryRouter>);
    expect(await screen.findByPlaceholderText(/Ce que tu as compris/)).toHaveValue(`Mon début de réflexion\n\n${citation}\n\n`);
    expect(draft.read('journal:libre', 'U2')).toBe('Autre compte');
  });

  it('isole aussi le texte et le sujet des demandes d’aide', async () => {
    at('/aide');
    fireEvent.change(await screen.findByPlaceholderText(/Par exemple/), { target: { value: 'Demande privée de Marie' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mon achat' }));
    changerCompte('U2');
    expect(await screen.findByPlaceholderText(/Par exemple/)).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Mon parcours' })).toHaveAttribute('aria-pressed', 'true');
    changerCompte('U1');
    expect(await screen.findByPlaceholderText(/Par exemple/)).toHaveValue('Demande privée de Marie');
    expect(screen.getByRole('button', { name: 'Mon achat' })).toHaveAttribute('aria-pressed', 'true');
  });
  it('note privée par défaut : le coach IA n’y a pas accès sans accord', async () => {
    at('/journal');
    expect(await screen.findByText(/Ton journal est privé/)).toBeInTheDocument();
    const box = screen.getByRole('checkbox', { name: /Le coach IA peut lire cette note/ });
    expect(box).not.toBeChecked();
    fireEvent.change(screen.getByPlaceholderText(/Ce que tu as compris/), { target: { value: '  Ma note  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer la note' }));
    expect(await screen.findByText('Note enregistrée.')).toBeInTheDocument();
    const w = writes.find(x => x.op === 'insert')!.value as Record<string, unknown>;
    expect(w).toMatchObject({ participant_id: 'P1', texte: 'Ma note', usage_ia_autorise: false, enrollment_id: null, activity_id: null });
  });

  it('nouvelle tentative après échec : même identifiant, aucune note en double', async () => {
    insertErrors = [{ code: '08006', message: 'network' }, null];
    at('/journal?ecrire=1');
    fireEvent.change(await screen.findByPlaceholderText(/Ce que tu as compris/), { target: { value: 'Note' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer la note' }));
    expect(await screen.findByText(/Non enregistrée/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer la note' }));
    expect(await screen.findByText('Note enregistrée.')).toBeInTheDocument();
    const ids = writes.filter(x => x.op === 'insert').map(x => (x.value as { entry_id: string }).entry_id);
    expect(ids).toHaveLength(2);
    expect(ids[0]).toBe(ids[1]);
  });

  it('réponse à la question du jour : la note est liée à l’activité', async () => {
    tables['activities'] = [{ consigne: 'Qu’as-tu appris ?' }];
    at('/journal?inscription=E1&activite=A1');
    expect(await screen.findByText('Qu’as-tu appris ?')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(/Ce que tu as compris/), { target: { value: 'Réponse' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer la note' }));
    await screen.findByText('Note enregistrée.');
    expect(writes[0]!.value).toMatchObject({ enrollment_id: 'E1', activity_id: 'A1' });
  });

  it('le brouillon reste sur l’appareil tant qu’il n’est pas enregistré', async () => {
    at('/journal');
    await screen.findByPlaceholderText(/Ce que tu as compris/);
    fireEvent.change(await screen.findByPlaceholderText(/Ce que tu as compris/), { target: { value: 'en cours' } });
    expect(screen.getByText(/Brouillon conservé sur cet appareil/)).toBeInTheDocument();
    cleanup();
    at('/journal');
    expect(await screen.findByDisplayValue('en cours')).toBeInTheDocument();
    expect(writes).toHaveLength(0);
  });

  it('l’accès du coach IA se change note par note ; suppression après confirmation', async () => {
    tables['journal_entries'] = [{ entry_id: 'N1', texte: 'Ancienne note', usage_ia_autorise: false, cree_le: '2026-10-12T08:00:00Z', modifie_le: '2026-10-12T08:00:00Z', activity_id: null }];
    at('/journal');
    expect(await screen.findByText('Privée, même pour le coach IA')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Autoriser le coach IA' }));
    await waitFor(() => expect(writes).toContainEqual({ table: 'journal_entries', op: 'update', value: { usage_ia_autorise: true } }));
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }));
    expect(writes.some(x => x.op === 'delete')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Oui, supprimer' }));
    await waitFor(() => expect(writes.some(x => x.op === 'delete')).toBe(true));
  });
});

describe('Mon journal — style de l’écran « Aujourd’hui »', () => {
  it('« Journal » : le formulaire et les réflexions sont disponibles ensemble', async () => {
    tables['journal_entries'] = [{ entry_id: 'N1', texte: 'Ancienne note', usage_ia_autorise: false, cree_le: '2026-10-12T08:00:00Z', modifie_le: '2026-10-12T08:00:00Z', activity_id: null }];
    at('/journal');
    expect(await screen.findByText('Ancienne note')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ce que tu as compris/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Journal' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByPlaceholderText(/Ce que tu as compris/)).toBeInTheDocument();
  });

  it('« Écrire » (barre du bas) : le champ est ouvert et prêt', async () => {
    at('/journal?ecrire=1');
    // Le curseur se place une fois le journal chargé : attendre ce moment (le test échouait parfois sur GitHub).
    const champ = await screen.findByPlaceholderText(/Ce que tu as compris/);
    await waitFor(() => expect(champ).toHaveFocus());
    expect(screen.queryByRole('button', { name: 'Nouvelle note' })).not.toBeInTheDocument();
  });

  it('de « Écrire » à « Journal » : l’éditeur reste disponible', async () => {
    at('/journal?ecrire=1');
    await screen.findByPlaceholderText(/Ce que tu as compris/);
    fireEvent.click(screen.getByRole('link', { name: 'Journal' }));
    expect(screen.getByPlaceholderText(/Ce que tu as compris/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ce que tu as compris/)).toBeInTheDocument();
  });

  it('de « Écrire » à « Journal » avec un texte en cours : le formulaire reste ouvert', async () => {
    at('/journal?ecrire=1');
    fireEvent.change(await screen.findByPlaceholderText(/Ce que tu as compris/), { target: { value: 'en cours' } });
    fireEvent.click(screen.getByRole('link', { name: 'Journal' }));
    expect(await screen.findByDisplayValue('en cours')).toBeInTheDocument();
  });

  it('aucune note : message d’attente', async () => {
    at('/journal');
    expect(await screen.findByText('Tu n’as encore rien écrit. Ta première réflexion apparaîtra ici.')).toBeInTheDocument();
  });
});

describe('Besoin d’aide', () => {
  it('message de sécurité visible, sans délai de réponse promis', async () => {
    at('/aide');
    expect(await screen.findByText(/contacte les services d’urgence/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\d+\s*(h|heures|minutes|jours)\b/i);
  });

  it('seules les notes cochées sont jointes ; nouvel envoi = même identifiant', async () => {
    tables['journal_entries'] = [
      { entry_id: 'N1', texte: 'Note un', cree_le: '2026-10-12T08:00:00Z' },
      { entry_id: 'N2', texte: 'Note deux', cree_le: '2026-10-11T08:00:00Z' },
    ];
    rpcError = { message: 'Failed to fetch' };
    at('/aide');
    fireEvent.change(await screen.findByPlaceholderText(/Par exemple/), { target: { value: 'Je bloque' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /Note deux/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer ma demande' }));
    expect(await screen.findByText(/Demande non envoyée/)).toBeInTheDocument();
    rpcError = null;
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer ma demande' }));
    expect(await screen.findByText(/Demande envoyée/)).toBeInTheDocument();
    const calls = rpcs.filter(x => x.name === 'request_help');
    expect(calls).toHaveLength(2);
    expect(calls[0]!.args['p_client_request_id']).toBe(calls[1]!.args['p_client_request_id']);
    expect(calls[1]!.args).toMatchObject({ p_motif: 'Sujet : Mon parcours\n\nJe bloque', p_entry_ids: ['N2'], p_enrollment_id: null });
  });

  it('le sujet sélectionné est transmis avec le message, sans confirmation en cas d’échec', async () => {
    rpcError={message:'network'};
    at('/aide');
    fireEvent.click(await screen.findByRole('button',{name:'Mon achat'}));
    expect(screen.getByRole('button',{name:'Mon achat'})).toHaveAttribute('aria-pressed','true');
    fireEvent.change(screen.getByPlaceholderText(/Par exemple/),{target:{value:'Mon accès au livre ne fonctionne pas.'}});
    fireEvent.click(screen.getByRole('button',{name:'Envoyer ma demande'}));
    await screen.findByText(/Demande non envoyée/);
    expect(screen.queryByText(/Demande envoyée\./)).not.toBeInTheDocument();
    expect(rpcs.find(x=>x.name==='request_help')?.args).toMatchObject({p_motif:'Sujet : Mon achat\n\nMon accès au livre ne fonctionne pas.'});
  });

  it('suivi des demandes : état, réponse et annulation', async () => {
    tables['help_requests'] = [
      { request_id: 'R1', motif: 'Première', etat: 'resolue', reponse: 'Voici une piste.', extraits_partages: null, cree_le: '2026-10-10T08:00:00Z' },
      { request_id: 'R2', motif: 'Seconde', etat: 'recue', reponse: null, extraits_partages: null, cree_le: '2026-10-12T08:00:00Z' },
    ];
    at('/aide');
    expect(await screen.findByText('Résolue')).toBeInTheDocument();
    expect(screen.getByText('Voici une piste.')).toBeInTheDocument();
    const cancels = screen.getAllByRole('button', { name: 'Annuler cette demande' });
    expect(cancels).toHaveLength(1);
    // L'annulation se confirme : « Conserver » ne change rien.
    fireEvent.click(cancels[0]!);
    expect(screen.getByText('Annuler cette demande ?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Conserver ma demande' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Conserver ma demande' }));
    expect(screen.queryByText('Annuler cette demande ?')).not.toBeInTheDocument();
    expect(rpcs.some(x => x.name === 'cancel_help_request')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Annuler cette demande' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer l’annulation' }));
    await waitFor(() => expect(rpcs).toContainEqual({ name: 'cancel_help_request', args: { p_request_id: 'R2' } }));
  });

  it('répondre à l’équipe dans la même demande, seulement après une réponse de l’équipe', async () => {
    tables['help_requests'] = [
      { request_id: 'R1', motif: 'Mon audio ne s’ouvre pas.', etat: 'attente_participant', reponse: 'Quel téléphone utilises-tu ?', extraits_partages: null, cree_le: '2026-10-12T08:00:00Z' },
      { request_id: 'R2', motif: 'Sans réponse encore', etat: 'recue', reponse: null, extraits_partages: null, cree_le: '2026-10-13T08:00:00Z' },
    ];
    tables['help_messages'] = [
      { request_id: 'R1', auteur: 'equipe', texte: 'Quel téléphone utilises-tu ?', cree_le: '2026-10-12T09:00:00Z' },
      { request_id: 'R1', auteur: 'participant', texte: 'Un Android.', cree_le: '2026-10-12T10:00:00Z' },
    ];
    at('/aide');
    expect(await screen.findByText('Quel téléphone utilises-tu ?')).toBeInTheDocument();
    expect(screen.getByText('Un Android.')).toBeInTheDocument();
    expect(screen.getByText('Ta réponse :')).toBeInTheDocument();
    // Une seule demande a reçu une réponse de l'équipe : un seul bouton.
    const boutons = screen.getAllByRole('button', { name: 'Répondre à l’équipe' });
    expect(boutons).toHaveLength(1);
    fireEvent.click(boutons[0]!);
    const champ = screen.getByLabelText('Ta réponse à l’équipe');
    expect(champ).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Envoyer ma réponse' })).toBeDisabled();
    fireEvent.change(champ, { target: { value: '  Un Samsung A14.  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer ma réponse' }));
    expect(await screen.findByText('Réponse envoyée. L’équipe va la lire.')).toBeInTheDocument();
    const appel = rpcs.find(x => x.name === 'reply_help_request');
    expect(appel?.args).toMatchObject({ p_request_id: 'R1', p_texte: 'Un Samsung A14.' });
    expect(typeof appel?.args['p_client_message_id']).toBe('string');
  });

  it('une demande résolue prévient que la réponse la rouvrira ; une demande annulée ne propose pas de répondre', async () => {
    tables['help_requests'] = [
      { request_id: 'R1', motif: 'Résolue', etat: 'resolue', reponse: 'Voici une piste.', extraits_partages: null, cree_le: '2026-10-12T08:00:00Z' },
      { request_id: 'R2', motif: 'Annulée', etat: 'annulee', reponse: 'Réponse avant annulation', extraits_partages: null, cree_le: '2026-10-13T08:00:00Z' },
    ];
    tables['help_messages'] = [];
    at('/aide');
    expect(await screen.findByText('Voici une piste.')).toBeInTheDocument();
    const boutons = screen.getAllByRole('button', { name: 'Répondre à l’équipe' });
    expect(boutons).toHaveLength(1);
    fireEvent.click(boutons[0]!);
    expect(screen.getByText('Ta demande sera rouverte et l’équipe la relira.')).toBeInTheDocument();
  });

  it('style de l’écran « Aujourd’hui » : urgence en évidence, coach accessible, barre du bas sans entrée active', async () => {
    at('/aide');
    expect(await screen.findByRole('note')).toHaveClass('aide-urgence');
    expect(screen.getByRole('link', { name: 'Parler au coach' })).toHaveAttribute('href', '/coach');
    // Depuis les maquettes Bible (22/10/2026), l'aide s'ouvre depuis le profil : la barre du bas n'a plus d'entrée « Aide ».
    const nav = screen.getByRole('navigation', { name: 'Navigation principale' });
    expect(within(nav).queryByRole('link', { name: 'Aide' })).toBeNull();
    expect(within(nav).queryByRole('link', { current: 'page' })).toBeNull();
    expect(screen.getByText('Aucune demande pour le moment.')).toBeInTheDocument();
  });

  it('participant anglophone : page en anglais', async () => {
    tables['participants'] = [{ prenom: 'Mary', langue: 'en' }];
    at('/aide');
    expect(await screen.findByRole('heading', { name: 'Help & Contact' })).toBeInTheDocument();
  });

  it('?lang=en (barre du bas anglaise) : aide et journal en anglais, même pour un compte français', async () => {
    at('/aide?lang=en');
    expect(await screen.findByRole('heading', { name: 'Help & Contact' })).toBeInTheDocument();
    cleanup();
    at('/journal?lang=en');
    expect(await screen.findByRole('heading', { name: 'Previous reflections' })).toBeInTheDocument();
  });

  it('lien depuis un parcours anglais (?inscription) : journal et aide en anglais, même pour un compte français', async () => {
    tables['enrollments'] = [{ enrollment_id: 'E1', programme_id: 'PROSPECT_LIVRE_7J_EN_V1', langue: 'en' }];
    at('/journal?inscription=E1&activite=A1');
    expect(await screen.findByRole('heading', { name: 'Previous reflections' })).toBeInTheDocument();
    cleanup();
    at('/aide?inscription=E1');
    expect(await screen.findByRole('heading', { name: 'Help & Contact' })).toBeInTheDocument();
  });
});
