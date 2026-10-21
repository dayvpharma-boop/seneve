import {useEffect,useState,type ReactNode} from 'react';
import {Link} from 'react-router-dom';
import {supabase} from '@/lib/supabase';
import type {Bilan} from '@/lib/progres';
import {Icone} from '@/components/Icone';
import {IconeFin} from '@/components/IconeFin';
import {SuiteCard} from '@/components/SuiteCard';

type Note={texte:string;cree_le:string};
type Props={prenom:string;nom:string;enrollmentId:string;programmeId:string;langue:string;b:Bilan;cloture:boolean;dejaInscrit:string[];onglets?:ReactNode;reglages?:ReactNode;footer?:ReactNode};
export function FinParcours({prenom,nom,enrollmentId,programmeId,langue,b,cloture,dejaInscrit,onglets,reglages,footer}:Props){
 const en=langue==='en';
 const [journal,setJournal]=useState<{id:string;note:Note|null;erreur:boolean}|null>(null);
 useEffect(()=>{let actif=true;void Promise.resolve(supabase.from('journal_entries').select('texte,cree_le').eq('enrollment_id',enrollmentId).order('cree_le',{ascending:false}).limit(1).maybeSingle()).then(r=>{if(actif)setJournal({id:enrollmentId,note:r.error?null:r.data as Note|null,erreur:Boolean(r.error)});}).catch(()=>{if(actif)setJournal({id:enrollmentId,note:null,erreur:true});});return()=>{actif=false;};},[enrollmentId]);
 const note=journal?.id===enrollmentId?journal.note:null;
 const etats=en?{realisee:'Done',partielle:'Partly done',preparee:'Prepared',non_commencee:'Not recorded'}:{realisee:'Action réalisée',partielle:'Action faite en partie',preparee:'Action préparée',non_commencee:'Non enregistrée'};
 return <>
  <header className="fin-barre"><p><Icone nom="graine" taille={24}/><span>SÉNEVÉ</span></p><span className="fin-initiale" aria-hidden="true">{prenom.trim().charAt(0).toUpperCase()}</span></header>
  <header className="fin-intro"><p className="fin-badge"><IconeFin nom="spa" taille={15}/>{cloture&&!b.termine?(en?'Journey closed':'Parcours clôturé'):(en?`Journey completed · ${b.duree} days`:`Parcours terminé · ${b.duree} jours`)}</p><h1>{en?'Hello':'Bonjour'}{prenom?` ${prenom}`:''}</h1><p>{nom}</p></header>
  {onglets}
  <section className="fin-bilan" aria-label={en?'Journey review':'Bilan du parcours'}>
   <div className="fin-bilan-tete"><span>{en?'The mustard seed garden':'Le jardin du sénevé'}</span><span>{b.realisees}/{b.actionsOuvertes} {en?'actions completed':'actions réalisées'}</span></div>
   <h2>{cloture&&!b.termine?(en?'This journey is closed.':'Ce parcours est clôturé.'):(en?'You have reached the end of this journey.':'Ton parcours est arrivé à son terme.')}</h2>
   <figure className="fin-jardin"><img src={`${import.meta.env.BASE_URL}illustrations/fin-parcours-jardin.svg`} alt="" width={340} height={130}/><figcaption><span>{en?'Seed':'En terre'}</span><span>{en?'Sprout':'Germe'}</span><span>{en?'Roots':'Enraciné'}</span></figcaption></figure>
   <div className="fin-jours">{b.jours.map(j=><Link key={j.jour} to={`/espace?parcours=${enrollmentId}&jour=${j.jour}`} aria-label={`${en?'Day':'Jour'} ${j.jour} · ${j.etat?etats[j.etat]:(en?'No action':'Sans action')}`}><span className={`fin-case fin-${j.etat??'sans-action'}`}>{j.etat==='realisee'?<IconeFin nom={j.jour===b.duree?'verified':'check'} taille={16}/>:j.etat==='partielle'?<IconeFin nom="hourglass_bottom" taille={16}/>:j.etat==='preparee'?<span aria-hidden="true">◐</span>:<span aria-hidden="true">—</span>}</span><span>J{j.jour}</span></Link>)}</div>
   <p className="fin-legende"><span>{b.realisees} {en?'completed':b.realisees===1?'réalisée':'réalisées'}</span><span>{b.partielles} {en?'partly done':b.partielles===1?'faite en partie':'faites en partie'}</span>{b.preparees>0&&<span>{b.preparees} {en?'prepared':b.preparees===1?'préparée':'préparées'}</span>}</p>
   <p className="fin-mot">{en?'This review reflects what you recorded. It does not measure your faith or your worth.':'Ce bilan reprend ce que tu as enregistré. Il ne mesure ni ta foi ni ta valeur.'}</p>
   <Link className="fin-secondaire" to="/progres">{en?'See my journey':'Voir mon parcours'}<IconeFin nom="arrow_forward" taille={18}/></Link>
  </section>
  <SuiteCard programmeId={programmeId} langue={langue} dejaInscrit={dejaInscrit} maquette/>
  <section className="fin-journal"><h2><IconeFin nom="history_edu" taille={20}/>{en?'Your journey reflections':'Mémoire de ton parcours'}</h2><p>{en?'Saved notes are kept in your personal space. You choose which ones to share.':'Les notes enregistrées sont conservées dans ton espace. Tu choisis celles que tu partages.'}</p>{note&&<div className="fin-derniere"><span>{en?'Latest saved reflection':'Dernière réflexion enregistrée'}</span><p>{note.texte}</p></div>}<Link className="fin-secondaire" to="/journal"><IconeFin nom="menu_book" taille={18}/>{en?'Read your reflections':'Relire tes réflexions'}</Link></section>
  {reglages}{footer}
 </>;
}
