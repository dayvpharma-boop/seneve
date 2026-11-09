import {useCallback, useEffect, useRef, useState} from 'react';
import {Link} from 'react-router-dom';
import {montantValidePourDevise} from '@/lib/devises';
import {
  chargerChargesEntreprise, creerBlocChargesEntreprise, creerChargeEntreprise,
  enregistrerEncaissementEntreprise, retirerChargeEntreprise, type ChargeEntreprise, type DonneesChargesEntreprise,
} from '@/lib/habitudes-finance-charges';

export type EtatAccesCharges = 'verification' | 'indisponible' | 'a-regler' | 'reglees';
type EtatBloc = {type:'chargement' | 'erreur' | 'sans-acces'} |
  {type:'charge'; donnees:DonneesChargesEntreprise};

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

export function ChargesEntreprise({devise, langue, onEtat, saisie, apresEncaissement}:{
  devise:string; langue:string; onEtat:(etat:EtatAccesCharges, disponible:string, dimeRestante?:string)=>void;
  saisie:{recu:string; marchandises:string; frais:string};
  apresEncaissement:()=>void;
}) {
  const en = langue === 'en';
  const l = (fr:string, english:string) => en ? english : fr;
  const locale = en ? 'en-US' : 'fr-FR';
  const date = calendrier.format(new Date());
  const mois = date.slice(0, 8) + '01';
  const [etat, setEtat] = useState<EtatBloc>({type:'chargement'});
  const [nom, setNom] = useState('');
  const [montant, setMontant] = useState('');
  const [aRetirer, setARetirer] = useState<string|null>(null);
  const [operation, setOperation] = useState<string|null>(null);
  const [retour, setRetour] = useState<{texte:string; vente:boolean; erreur?:boolean}|null>(null);
  const version = useRef(0);
  const ecritureEnCours = useRef(false);
  const demandes = useRef(new Map<string,string>());

  const charger = useCallback(async () => {
    const lecture = ++version.current;
    onEtat('verification', '0');
    try {
      const donnees = await chargerChargesEntreprise(null, date, devise);
      if (lecture !== version.current) return false;
      if (!donnees) {
        setEtat({type:'sans-acces'});
        onEtat('indisponible', '0');
        return false;
      }
      setEtat({type:'charge', donnees});
      const soldes = !!donnees.active_block && donnees.charges.every(c => reste(c) === 0);
      onEtat(soldes ? 'reglees' : 'a-regler', donnees.available_amount, donnees.tithe_due);
      return true;
    } catch (erreur) {
      if (lecture === version.current) {
        const code = typeof erreur === 'object' && erreur !== null && 'code' in erreur ? erreur.code : null;
        setEtat({type:code === '42501' || code === 'PGRST301' ? 'sans-acces' : 'erreur'});
        onEtat('indisponible', '0');
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

  async function modifier<T>(
    cle:string, identite:string, action:(id:string, demande:string)=>Promise<T>,
    succes:string|((resultat:T)=>string), echec:string, effacer?:()=>void,
  ) {
    if (etat.type !== 'charge' || ecritureEnCours.current) return;
    const lecture = version.current;
    const id = etat.donnees.enrollment_id;
    ecritureEnCours.current = true;
    setOperation(cle);
    setRetour(null);
    onEtat('verification', '0');
    try {
      const demande = demandes.current.get(identite) ?? crypto.randomUUID();
      demandes.current.set(identite, demande);
      const resultat = await action(id, demande);
      demandes.current.delete(identite);
      if (lecture !== version.current) return;
      effacer?.();
      setRetour({texte:typeof succes === 'function' ? succes(resultat) : succes, vente:cle === 'vente'});
    } catch {
      if (lecture !== version.current) return;
      setRetour({texte:echec, vente:cle === 'vente', erreur:true});
    } finally {
      if (lecture === version.current) {
        await charger();
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
  const toutRegle = charges.every(c => reste(c) === 0);
  const montantPrevu = montantSaisi(montant, devise);
  const bouton = 'rep-charges-action';
  const normaliser = (valeur:string) => valeur.trim().replace(',', '.');
  const recu = normaliser(saisie.recu);
  const marchandises = normaliser(saisie.marchandises) || '0';
  const frais = normaliser(saisie.frais) || '0';
  const venteValide = Number(recu)>0 && [recu,marchandises,frais].every(v => montantValidePourDevise(v,devise));
  const net = venteValide ? Math.max(0,cents(recu)-cents(marchandises)-cents(frais)) : 0;
  const couverture = Math.min(net, charges.filter(c => c.currency === devise).reduce((total,c) => total+reste(c),0));

  const calendrierIcone = <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="4" y="6" width="16" height="14" rx="3"/><path d="M8 4v4m8-4v4M4 11h16m-12 4h2m4 0h2"/>
  </svg>;

  function ligne(c:ChargeEntreprise) {
    const restant = reste(c);
    return <li key={c.charge_id} className="rep-charge-ligne">
      <div className="rep-charges-rangee">
        <div><strong>{c.label}</strong><p>{l('Couvert','Covered')} {fmt(paye(c), c.currency)} / {fmt(cents(c.expected_amount), c.currency)}</p></div>
        <span className={'rep-charges-etiquette' + (restant === 0 ? ' is-regle' : '')}>
          {restant === 0 ? l('Couvert','Covered') : fmt(restant, c.currency)}
        </span>
      </div>
      {aRetirer === c.charge_id ? <div className="rep-charges-form">
        <p>{l('Retirer cette charge ? Les écritures déjà enregistrées sont conservées.','Remove this expense? Previously recorded entries are kept.')}</p>
        <button type="button" className={bouton} disabled={!!operation} onClick={() =>
          void modifier('retrait', 'retrait:'+c.charge_id, id => retirerChargeEntreprise(id,c.charge_id),
            l('Charge retirée.','Expense removed.'),l('Impossible de retirer cette charge.','Could not remove this expense.'),
            () => setARetirer(null))
        }>{l('Confirmer la suppression','Confirm removal')}</button>
        <button type="button" className="rep-charge-retirer" onClick={() => setARetirer(null)}>
          {l('Annuler','Cancel')}
        </button>
      </div> : <button type="button" className="rep-charge-retirer" aria-label={l('Supprimer ','Remove ')+c.label}
        disabled={!!operation} onClick={() => setARetirer(c.charge_id)}>
        {l('Supprimer','Remove')}
      </button>}
    </li>;
  }

  return <>
    <div className="rep-validation rep-encaissement hd-classique">
      {venteValide && <div className="rep-encaissement-calcul">
        <p>{l('Après les frais','After costs')} <strong>{fmt(net,devise)}</strong></p>
        {bloc && <>
          <p>{l('Vers les charges du mois','Towards monthly expenses')} <strong>{fmt(couverture,devise)}</strong></p>
          <p>{l('Reste de cette vente','Remaining from this sale')} <strong>{fmt(net-couverture,devise)}</strong></p>
        </>}
      </div>}
      <button type="button" className="rep-bouton" disabled={!bloc || !venteValide || !!operation} onClick={() =>
        void modifier('vente', JSON.stringify([mois,devise,recu,marchandises,frais]),
          (id,demande) => enregistrerEncaissementEntreprise(id,devise,mois,{recu,marchandises,frais},demande),
          resultat => l(
            `Vente enregistrée. ${fmt(cents(resultat.couvert),devise)} affectés aux charges, ${fmt(cents(resultat.reste),devise)} restants.`,
            `Sale recorded. ${fmt(cents(resultat.couvert),devise)} assigned to expenses, ${fmt(cents(resultat.reste),devise)} remaining.`),
          l('Encaissement non confirmé. Vérifie le solde et réessaie.','Receipt not confirmed. Check the balance and try again.'),
          apresEncaissement)
      }>{operation === 'vente' ? l('Enregistrement…','Saving…') : l('Enregistrer l’encaissement','Record receipt')}</button>
      {retour?.vente ? <p role={retour.erreur ? 'alert' : 'status'}>{retour.texte}</p> : <p>
        {saisie.recu.trim() && !venteValide
          ? l('Vérifie les montants dans la devise choisie.','Check the amounts for the selected currency.')
          : donnees && !bloc ? l('Crée le bloc du mois ci-dessous pour enregistrer ta première vente.','Create this month’s block below to record your first sale.')
          : l('Le loyer puis les autres charges sont couverts en priorité, dans la devise de la vente.','Rent and then other expenses are covered first, in the sale currency.')}
      </p>}
    </div>
    <section className="rep-charges hd-classique" aria-labelledby="charges-entreprise-titre">
    <div className="rep-charges-entete">
      <span className="rep-charges-icone">{calendrierIcone}</span>
      <div>
        <h2 id="charges-entreprise-titre">{l('Charges de l’entreprise','Business expenses')}</h2>
        <p>{l('Couvertes par tes encaissements','Covered by your receipts')}</p>
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
            {toutRegle ? l('Couvert','Covered') : l('En cours','In progress')}
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
                <p>{l('Couvert','Covered')} {fmt(verse, m)} / {fmt(total, m)}</p>
              </div>;
            })}
            <ul className="rep-charges-liste">{charges.map(ligne)}</ul>
          </> : <p>{l('Aucune charge dans ce bloc. Ajoute une rubrique si tu as des frais mensuels.','There are no expenses in this block. Add an expense if you have monthly costs.')}</p>}
          <details className="rep-charges-pli rep-charges-ajout">
            <summary>{l('Ajouter une rubrique','Add an expense')}<Chevron/></summary>
            <form className="rep-charges-form" onSubmit={e => {
              e.preventDefault();
              if (!nom.trim() || !montantPrevu) return;
              const debut = new Date(mois + 'T12:00:00Z');
              const fin = new Date(Date.UTC(debut.getUTCFullYear(), debut.getUTCMonth() + 1, 0)).toISOString().slice(0,10);
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
      {retour && !retour.vente && <p role={retour.erreur ? 'alert' : 'status'} className="rep-charges-retour">{retour.texte}</p>}
    </div>
    {!!donnees?.archives.length && <details className="rep-charges-carte rep-charges-pli">
      <summary>{l('Archives','Archives')} <small>{donnees.archives.length}</small><Chevron/></summary>
      {donnees.archives.map(b => <details key={b.block_id} className="rep-charges-pli">
        <summary><span className="rep-charges-mois">{moisNom(b.month_start)}</span><Chevron/></summary>
        {b.charges.length ? <ul className="rep-charges-liste">{b.charges.map(ligne)}</ul> : <p>{l('Aucune charge.','No expenses.')}</p>}
      </details>)}
    </details>}
    </section>
  </>;
}
