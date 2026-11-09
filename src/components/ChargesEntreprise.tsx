import {useCallback, useEffect, useRef, useState} from 'react';
import {Link} from 'react-router-dom';
import {montantValidePourDevise} from '@/lib/devises';
import {chargerSuiviFinancier} from '@/lib/habitudes-finances-suivi';
import {
  chargerChargesEntreprise, creerBlocChargesEntreprise, creerChargeEntreprise,
  enregistrerPaiementCharge, type ChargeEntreprise, type DonneesChargesEntreprise,
} from '@/lib/habitudes-finance-charges';

export type EtatAccesCharges = 'verification' | 'indisponible' | 'a-regler' | 'reglees';
type EtatBloc = {type:'chargement' | 'erreur' | 'sans-acces'} |
  {type:'charge'; enrollmentId:string; donnees:DonneesChargesEntreprise};

const calendrier = new Intl.DateTimeFormat('sv-SE', {
  timeZone:'Africa/Kinshasa', year:'numeric', month:'2-digit', day:'2-digit',
});
const cents = (montant:string) => Math.round(Number(montant) * 100);
const paye = (charge:ChargeEntreprise) => charge.payments.reduce((total, p) => total + cents(p.amount), 0);
const reste = (charge:ChargeEntreprise) => Math.max(0, cents(charge.expected_amount) - paye(charge));

function montantSaisi(valeur:string, devise:string) {
  const montant = valeur.trim().replace(',', '.');
  return montantValidePourDevise(montant, devise) && Number(montant) > 0 ? montant : null;
}

function Chevron() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>;
}

export function ChargesEntreprise({devise, langue, onEtat}:{
  devise:string; langue:string; onEtat:(etat:EtatAccesCharges, montantPaye:number)=>void;
}) {
  const en = langue === 'en';
  const l = (fr:string, english:string) => en ? english : fr;
  const locale = en ? 'en-US' : 'fr-FR';
  const date = calendrier.format(new Date());
  const mois = date.slice(0, 8) + '01';
  const [etat, setEtat] = useState<EtatBloc>({type:'chargement'});
  const [nom, setNom] = useState('');
  const [montant, setMontant] = useState('');
  const [paiements, setPaiements] = useState<Record<string,string>>({});
  const [operation, setOperation] = useState<string|null>(null);
  const [retour, setRetour] = useState<{texte:string; erreur?:boolean}|null>(null);
  const version = useRef(0);
  const ecritureEnCours = useRef(false);
  const demandes = useRef(new Map<string,string>());

  const charger = useCallback(async (enrollmentId?:string) => {
    const lecture = ++version.current;
    onEtat('verification', 0);
    try {
      const id = enrollmentId ?? (await chargerSuiviFinancier(null))?.enrollment_id;
      if (lecture !== version.current) return false;
      if (!id) {
        setEtat({type:'sans-acces'});
        onEtat('indisponible', 0);
        return false;
      }
      const donnees = await chargerChargesEntreprise(id, date, devise);
      if (lecture !== version.current) return false;
      if (!donnees) throw Error('Bloc mensuel non vérifiable');
      setEtat({type:'charge', enrollmentId:id, donnees});
      const soldes = !!donnees.active_block && donnees.charges.length > 0 && donnees.charges.every(c => reste(c) === 0);
      const montantPaye = donnees.charges.filter(c => c.currency === devise).reduce((total,c) => total + paye(c), 0);
      onEtat(soldes ? 'reglees' : 'a-regler', montantPaye / 100);
      return true;
    } catch {
      if (lecture === version.current) {
        setEtat({type:'erreur'});
        onEtat('indisponible', 0);
      }
      return false;
    }
  }, [date, devise, onEtat]);

  useEffect(() => {
    setEtat({type:'chargement'});
    setOperation(null);
    void charger();
    return () => { version.current++; };
  }, [charger]);

  async function modifier(
    cle:string, identite:string, action:(id:string, demande:string)=>Promise<unknown>,
    succes:string, echec:string, effacer?:()=>void,
  ) {
    if (etat.type !== 'charge' || ecritureEnCours.current) return;
    const lecture = version.current;
    const id = etat.enrollmentId;
    ecritureEnCours.current = true;
    setOperation(cle);
    setRetour(null);
    onEtat('verification', 0);
    try {
      const demande = demandes.current.get(identite) ?? crypto.randomUUID();
      demandes.current.set(identite, demande);
      await action(id, demande);
      demandes.current.delete(identite);
      if (lecture !== version.current) return;
      effacer?.();
      setRetour({texte:succes});
    } catch {
      if (lecture !== version.current) return;
      setRetour({texte:echec, erreur:true});
    } finally {
      if (lecture === version.current) {
        await charger(id);
        setOperation(null);
      }
      ecritureEnCours.current = false;
    }
  }

  const fmt = (valeur:number, monnaie:string) =>
    new Intl.NumberFormat(locale,{maximumFractionDigits:2}).format(valeur / 100) + ' ' + monnaie;
  const moisNom = (jour:string) =>
    new Intl.DateTimeFormat(locale,{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(jour + 'T12:00:00Z'));

  const donnees = etat.type === 'charge' ? etat.donnees : null;
  const bloc = donnees?.active_block;
  const charges = donnees?.charges ?? [];
  const monnaies = [...new Set([devise, ...charges.map(c => c.currency)])];
  const toutRegle = charges.length > 0 && charges.every(c => reste(c) === 0);
  const montantPrevu = montantSaisi(montant, devise);
  const bouton = 'rep-charges-action';
  const calendrierIcone = <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="4" y="6" width="16" height="14" rx="3"/><path d="M8 4v4m8-4v4M4 11h16m-12 4h2m4 0h2"/>
  </svg>;

  function ligne(c:ChargeEntreprise) {
    const restant = reste(c);
    const valeur = paiements[c.charge_id] ?? '';
    const montantPaye = montantSaisi(valeur, c.currency);
    const trop = montantPaye !== null && cents(montantPaye) > restant;
    const enCours = operation === c.charge_id;
    return <li key={c.charge_id} className="rep-charge-ligne">
      <div className="rep-charges-rangee">
        <div><strong>{c.label}</strong><p>{l('Payé','Paid')} {fmt(paye(c), c.currency)} / {fmt(cents(c.expected_amount), c.currency)}</p></div>
        <span className={'rep-charges-etiquette' + (restant === 0 ? ' is-regle' : '')}>
          {restant === 0 ? l('Réglé','Paid') : fmt(restant, c.currency)}
        </span>
      </div>
      {restant > 0 && <details className="rep-charges-pli">
        <summary>{l('Noter un paiement','Record a payment')}<Chevron/></summary>
        <form className="rep-charges-form" onSubmit={e => {
          e.preventDefault();
          if (!montantPaye || trop) return;
          void modifier(c.charge_id, c.charge_id + ':' + montantPaye,
            (id, demande) => enregistrerPaiementCharge(id, c.charge_id, montantPaye, date, demande),
            l('Paiement enregistré.','Payment recorded.'),
            l('Impossible de confirmer le paiement. Vérifie le solde avant de réessayer.','Could not confirm the payment. Check the balance before retrying.'),
            () => setPaiements(p => ({...p,[c.charge_id]:''})));
        }}>
          <label>{l('Montant payé','Amount paid')} · {c.currency}
            <input inputMode="decimal" autoComplete="off" maxLength={13} placeholder="0" value={valeur}
              onChange={e => setPaiements(p => ({...p,[c.charge_id]:e.target.value}))}/>
          </label>
          {trop && <p role="alert">{l('Le montant dépasse le reste à payer.','The amount exceeds the remaining balance.')}</p>}
          <button type="submit" className={bouton} disabled={!!operation || !montantPaye || trop}>
            {enCours ? l('Enregistrement…','Saving…') : l('Enregistrer le paiement','Save payment')}
          </button>
        </form>
      </details>}
    </li>;
  }

  return <section className="rep-charges hd-classique" aria-labelledby="charges-entreprise-titre">
    <div className="rep-charges-entete">
      <span className="rep-charges-icone">{calendrierIcone}</span>
      <div>
        <h2 id="charges-entreprise-titre">{l('Charges de l’entreprise','Business expenses')}</h2>
        <p>{l('À régler avant la répartition','Pay before allocating the remainder')}</p>
      </div>
    </div>
    <div className="rep-charges-carte" aria-busy={etat.type === 'chargement' || !!operation}>
      {etat.type === 'chargement' && <p role="status">{l('Vérification du bloc du mois…','Checking this month’s block…')}</p>}
      {etat.type === 'erreur' && <>
        <h3>{l('Chargement interrompu','Couldn’t load expenses')}</h3>
        <p role="alert">{l('Impossible de vérifier les charges du mois.','This month’s expenses could not be verified.')}</p>
        <button type="button" className={bouton} onClick={() => {
          setEtat({type:'chargement'});
          void charger();
        }}>{l('Réessayer','Try again')}</button>
      </>}
      {etat.type === 'sans-acces' && <>
        <p>{l('Connecte-toi avec un accès actif à Habitudes & Défis.','Sign in with active Habits & Challenges access.')}</p>
        <Link to={en ? '/connexion?lang=en&mode=signin&suite=habitudes' : '/connexion?mode=signin&suite=habitudes'} className={bouton}>
          {l('Se connecter','Sign in')}
        </Link>
      </>}
      {donnees && <>
        <div className="rep-charges-rangee">
          <div><p>{l('Bloc mensuel','Monthly block')}</p><h3 className="rep-charges-mois">{moisNom(mois)}</h3></div>
          {bloc && <span className={'rep-charges-etiquette' + (toutRegle ? ' is-regle' : '')}>
            {toutRegle ? l('Réglé','Paid') : l('En cours','In progress')}
          </span>}
        </div>
        {!bloc && <>
          <p>{l('Un seul bloc par mois pour le loyer, l’électricité, le transport et les autres charges.','One block per month for rent, electricity, transport and other expenses.')}</p>
          <button type="button" className={bouton} disabled={!!operation} onClick={() =>
            void modifier('bloc', mois, (id, demande) => creerBlocChargesEntreprise(id, mois, demande),
              l('Bloc du mois prêt.','This month’s block is ready.'), l('Impossible de confirmer la création du bloc.','Could not confirm block creation.'))
          }>{operation === 'bloc' ? l('Création…','Creating…') : l('Créer le bloc du mois','Create this month’s block')}</button>
        </>}
        {bloc && <>
          {charges.length > 0 ? <>
            {monnaies.filter(m => charges.some(c => c.currency === m)).map(m => {
              const groupe = charges.filter(c => c.currency === m);
              const total = groupe.reduce((n,c) => n + cents(c.expected_amount), 0);
              const verse = groupe.reduce((n,c) => n + paye(c), 0);
              const restant = groupe.reduce((n,c) => n + reste(c), 0);
              return <div key={m} className="rep-charges-bilan">
                <p>{l('Reste à payer','Remaining')}</p>
                <strong>{fmt(restant, m)}</strong>
                <progress value={Math.min(verse,total)} max={total} aria-label={l('Charges réglées en ','Paid expenses in ') + m}/>
                <p>{l('Payé','Paid')} {fmt(verse, m)} / {fmt(total, m)}</p>
              </div>;
            })}
            <ul className="rep-charges-liste">{charges.map(ligne)}</ul>
          </> : <p>{l('Ajoute une première rubrique pour préparer tes charges du mois.','Add your first expense for this month.')}</p>}
          <details className="rep-charges-pli rep-charges-ajout">
            <summary>{l('Ajouter une rubrique','Add an expense')}<Chevron/></summary>
            <form className="rep-charges-form" onSubmit={e => {
              e.preventDefault();
              if (!nom.trim() || !montantPrevu) return;
              const [annee, numero] = mois.split('-').map(Number);
              const fin = new Date(Date.UTC(annee, numero, 0)).toISOString().slice(0,10);
              void modifier('ajout', JSON.stringify([mois, devise, nom.trim(), montantPrevu]),
                (id, demande) => creerChargeEntreprise(id,{label:nom,amount:montantPrevu,currency:devise,start:mois,end:fin},demande),
                l('Rubrique ajoutée.','Expense added.'),
                l('Impossible de confirmer l’ajout de la rubrique.','Could not confirm that the expense was added.'),
                () => {setNom('');setMontant('');});
            }}>
              <label>{l('Nom de la charge','Expense name')}
                <input value={nom} maxLength={80} onChange={e => setNom(e.target.value)} placeholder={l('Ex. loyer','e.g. rent')}/>
              </label>
              <label>{l('Montant prévu','Expected amount')} · {devise}
                <input inputMode="decimal" autoComplete="off" maxLength={13} value={montant}
                  onChange={e => setMontant(e.target.value)} placeholder="0"/>
              </label>
              <button type="submit" className={bouton} disabled={!!operation || !nom.trim() || !montantPrevu}>
                {operation === 'ajout' ? l('Ajout…','Adding…') : l('Ajouter cette rubrique','Add this expense')}
              </button>
            </form>
          </details>
        </>}
      </>}
      {retour && <p role={retour.erreur ? 'alert' : 'status'} className="rep-charges-retour">{retour.texte}</p>}
    </div>
    {!!donnees?.archives.length && <details className="rep-charges-carte rep-charges-pli">
      <summary>{l('Archives','Archives')} <small>{donnees.archives.length}</small><Chevron/></summary>
      {donnees.archives.map(b => <details key={b.block_id} className="rep-charges-pli">
        <summary><span className="rep-charges-mois">{moisNom(b.month_start)}</span><Chevron/></summary>
        {b.charges.length ? <ul className="rep-charges-liste">{b.charges.map(ligne)}</ul> : <p>{l('Aucune charge.','No expenses.')}</p>}
      </details>)}
    </details>}
  </section>;
}
