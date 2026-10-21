import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { csvCodesLibres, type CodePlace, type Convention } from '@/lib/places';

function dateFr(iso: string) {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));
}

/** Places financées (administrateur) : conventions, codes à transmettre, nombre de places utilisées. Aucun nom de participant. */
export function ConventionsAdmin({compact=false}:{compact?:boolean}={}) {
  const [liste, setListe] = useState<Convention[] | null>(null);
  const [erreur, setErreur] = useState('');
  const [org, setOrg] = useState('');
  const [places, setPlaces] = useState('10');
  const [mois, setMois] = useState('1');
  const [jusquau, setJusquau] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState('');
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [codes, setCodes] = useState<CodePlace[] | null>(null);

  const charger = useCallback(async () => {
    try {
      const r = await supabase.rpc('staff_list_conventions');
      if (r.error) { setErreur('Impossible de charger les places financées pour le moment.'); return; }
      setListe((r.data ?? []) as Convention[]);
    } catch { setErreur('Impossible de charger les places financées pour le moment.'); }
  }, []);
  useEffect(() => { void charger(); }, [charger]);

  async function voirCodes(id: string) {
    if (ouverte === id) { setOuverte(null); setCodes(null); return; }
    setOuverte(id); setCodes(null);
    const r = await supabase.rpc('staff_codes_convention', { p_convention_id: id });
    setCodes(r.error ? [] : (r.data ?? []) as CodePlace[]);
  }

  async function creer(e: FormEvent) {
    e.preventDefault();
    const n = Number(places), m = Number(mois);
    if (!org.trim() || !jusquau || !(n >= 1 && n <= 5000) || !(m >= 1 && m <= 12)) return;
    setBusy(true); setErreur(''); setInfo('');
    const r = await supabase.rpc('staff_creer_convention', { p_organisation: org.trim(), p_nb_places: n, p_mois_par_place: m, p_valide_jusqu_au: jusquau, p_note: note.trim() || null });
    setBusy(false);
    if (r.error) { setErreur(r.error.message.includes('déjà passée') ? 'La date de validité est déjà passée.' : 'La convention n’a pas pu être créée. Réessaie.'); return; }
    const d = r.data as { convention_id: string; places: number };
    setInfo(`${d.places} codes créés pour ${org.trim()}.`);
    setOrg(''); setNote('');
    await charger();
    await voirCodes(d.convention_id);
  }

  async function clore(c: Convention) {
    if (!window.confirm(`Clore la convention « ${c.organisation} » ? Les ${c.libres} codes non utilisés ne marcheront plus. Les places déjà utilisées restent ouvertes.`)) return;
    setBusy(true); setErreur('');
    const r = await supabase.rpc('staff_fermer_convention', { p_convention_id: c.convention_id });
    setBusy(false);
    if (r.error) { setErreur('La convention n’a pas pu être close. Réessaie.'); return; }
    await charger();
    if (ouverte === c.convention_id) { setOuverte(null); setCodes(null); }
  }

  function telecharger(c: Convention) {
    if (!codes) return;
    const blob = new Blob([`﻿${csvCodesLibres(c.organisation, codes)}`], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `codes-seneve-${c.organisation.replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const outils=<>
    <p className="tag">Places financées</p>
    <p className="muted">Sénevé Continuité offert par une organisation. Chaque code ouvre une place pour une personne. L’organisation ne reçoit que le nombre de places utilisées : aucun nom, aucune progression.</p>
    {erreur && <p className="error" role="alert">{erreur}</p>}
    {!liste ? !erreur && <p className="muted">Chargement…</p>
      : liste.length === 0 ? <p className="muted">Aucune convention pour le moment.</p>
      : liste.map(c => <div key={c.convention_id} className="convention">
        <p><strong>{c.organisation}</strong>{c.etat === 'close' ? ' (close)' : ''}</p>
        <p>{c.utilisees} place{c.utilisees > 1 ? 's' : ''} utilisée{c.utilisees > 1 ? 's' : ''} sur {c.nb_places} · {c.mois_par_place} mois par place · codes valables jusqu’au {dateFr(c.valide_jusqu_au)}</p>
        {c.note && <p className="muted">{c.note}</p>}
        <div className="link-row">
          <button type="button" className="link" onClick={() => void voirCodes(c.convention_id)}>{ouverte === c.convention_id ? 'Masquer les codes' : 'Voir les codes'}</button>
          {c.etat === 'active' && <button type="button" className="link danger" disabled={busy} onClick={() => void clore(c)}>Clore</button>}
        </div>
        {ouverte === c.convention_id && (!codes ? <p className="muted">Chargement…</p> : <>
          {c.libres > 0 && <button type="button" className="btn-secondaire" onClick={() => telecharger(c)}>{(n => n > 1 ? `Télécharger les ${n} codes libres` : 'Télécharger le code libre')(codes.filter(k => k.etat === 'libre').length)}</button>}
          <ul className="bilan-list" aria-label={`Codes de ${c.organisation}`}>
            {codes.map(k => <li key={k.code}><code>{k.code}</code> — {k.etat === 'libre' ? 'libre' : k.etat === 'utilise' ? 'utilisé' : 'annulé'}</li>)}
          </ul>
        </>)}
      </div>)}
    <form onSubmit={creer}>
      <p><strong>Nouvelle convention</strong></p>
      <label className="field"><span>Organisation qui finance</span>
        <input value={org} onChange={e => setOrg(e.target.value)} maxLength={120} placeholder="ex. nom de l’église ou de l’association" />
      </label>
      <label className="field"><span>Nombre de places</span>
        <input type="number" min={1} max={5000} value={places} onChange={e => setPlaces(e.target.value)} />
      </label>
      <label className="field"><span>Mois de Sénevé Continuité par place</span>
        <input type="number" min={1} max={12} value={mois} onChange={e => setMois(e.target.value)} />
      </label>
      <label className="field"><span>Codes valables jusqu’au</span>
        <input type="date" value={jusquau} onChange={e => setJusquau(e.target.value)} />
      </label>
      <label className="field"><span>Note interne (facultative)</span>
        <input value={note} onChange={e => setNote(e.target.value)} maxLength={500} placeholder="ex. référence de la convention" />
      </label>
      <button type="submit" className="btn action-btn" disabled={busy || !org.trim() || !jusquau}>{busy ? 'Un instant…' : 'Créer les codes'}</button>
      {info && <p className="success" role="status">{info}</p>}
    </form>
</>;
  if(compact) return <section className="card intervention-places" id="places-admin" aria-label="Places financées"><h2>Gestion des places financées</h2><p className="tableau-note">Conventions Sénevé Continuité · aucun nom de participant.</p>{erreur&&<p role="alert">{erreur}</p>}{liste?<table><thead><tr><th>Organisation</th><th>Utilisées</th><th>Libres</th><th>État</th></tr></thead><tbody>{liste.map(c=><tr key={c.convention_id}><td>{c.organisation}<small>Jusqu’au {dateFr(c.valide_jusqu_au)}</small></td><td>{c.utilisees} / {c.nb_places}</td><td>{c.libres}</td><td>{c.etat==='active'?'Active':'Close'}</td></tr>)}</tbody></table>:!erreur&&<p>Chargement…</p>}{liste?.length===0&&<p>Aucune convention pour le moment.</p>}<details><summary>Gérer les conventions et les codes</summary>{outils}</details></section>;
  return <section className="card" id="places-admin" aria-label="Places financées">{outils}</section>;
}
