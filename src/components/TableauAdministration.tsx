import {csvAdministration} from '@/lib/export-administration';
import {IconeResultat} from './IconeResultat';
import {useState} from 'react';
import type {Dashboard} from './PilotageAdmin';
import {IconeAdministration as I} from './IconeAdministration';
import {IconeConfidentialite} from './IconeConfidentialite';
import {formatDateHeure} from '@/lib/journal';
import {lienWhatsApp} from '@/lib/admin';

const evolution=(n:number,avant:number)=>n===avant?'Stable':`${n>avant?'+':''}${n-avant} vs période précédente`;
const part=(n:number,base:number)=>base>0?`${Math.round(n/base*100)} %`:null;
export function TableauAdministration({data:d,jours,busy,failed,refresh,periode}:{data:Dashboard|null;jours:number;busy:boolean;failed:boolean;refresh:()=>void;periode:(n:number)=>void}){
 const [suivi,setSuivi]=useState('relances');
 const p=d?.periode_jours??jours;
 function exporter(){if(!d)return;const url=URL.createObjectURL(new Blob([csvAdministration(d)],{type:'text/csv;charset=utf-8'}));const lien=document.createElement('a');lien.href=url;lien.download=`seneve-indicateurs-${p}jours-${d.actualise_le.slice(0,10)}.csv`;lien.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);}

 return <section id="pilotage" className="tableau-administration" aria-labelledby="tableau-admin-titre" aria-busy={busy}>
  <div className="tableau-entete"><div><p className="tableau-surtitre">Administration · Vue opérationnelle</p><h2 id="tableau-admin-titre">Tableau de bord</h2></div><div className="tableau-periode" role="group" aria-label="Période des indicateurs">{[7,30].map(n=><button type="button" key={n} aria-pressed={jours===n} disabled={busy} onClick={()=>periode(n)}>{n} jours</button>)}</div></div>
  {failed&&<div className="tableau-panne" role="alert"><I nom="cloud_sync"/><div><strong>{d?'Derniers chiffres conservés':'Indicateurs indisponibles'}</strong><p>{d?`Données du ${formatDateHeure(d.actualise_le,'fr-FR')}. L’actualisation a échoué.`:'Les chiffres n’ont pas pu être chargés.'}</p></div><button type="button" disabled={busy} onClick={refresh}><I nom="refresh" taille={18}/>Réessayer</button></div>}
  {!failed&&<div className="tableau-actualisation"><span>{d?`Mis à jour le ${formatDateHeure(d.actualise_le,'fr-FR')}`:'Chargement des indicateurs…'}</span><button type="button" disabled={busy} onClick={refresh}><I nom="refresh" taille={18}/>{busy?'Actualisation…':'Actualiser'}</button></div>}
  {d&&<div className="tableau-export"><button type="button" disabled={busy} onClick={exporter}><IconeResultat nom="download" taille={18}/>Exporter les métriques</button></div>}
  <p className="tableau-prive"><I nom="shield_with_heart"/><span>Journaux privés : seules les notes choisies par le participant et jointes à une demande d’aide sont accessibles.</span></p>
  {d&&<>
   <h3>À traiter en priorité</h3><div className="tableau-priorites" role="region" aria-label="Priorités immédiates">{([
    ['Urgent > 48 h',`${d.aide_attente_48h} demande${d.aide_attente_48h>1?'s':''} d’aide ouverte${d.aide_attente_48h>1?'s':''}`,'Demandes en attente depuis plus de 48 heures.','#demandes-admin','Traiter les demandes'],
    ['Accès en attente',`${d.achats_attente} achat${d.achats_attente>1?'s':''} sans accès ouvert`,'Ventes vérifiées à examiner.','#achats-admin','Examiner les achats'],
    ['Coach',`${d.coach.en_attente} question${d.coach.en_attente>1?'s':''} en attente`,'Sans réponse depuis plus de 10 minutes.','#pratique-admin','Voir les indicateurs'],
    ['Incidents',`${d.incidents.reduce((s,i)=>s+Number(i.nombre),0)} incident(s) enregistré(s)`,'Signalements remontés dans SÉNEVÉ.','#incidents-admin','Voir les incidents'],
   ] as const).map(([badge,titre,texte,lien,action],i)=><article key={badge}><span className={'tableau-badge '+(i===0?'urgent':'')}>{badge}</span><h4>{titre}</h4><p>{texte}</p><a aria-label={action} className={i===0?'principal':''} href={lien} onClick={()=>{if(lien==='#incidents-admin')setSuivi('incidents');if(lien==='#achats-admin')setSuivi('achats');}}>{action}<I nom="east" taille={18}/></a></article>)}</div>
   <h3>Vue d’ensemble <small>Comparée aux {p} jours précédents</small></h3><dl className="tableau-kpi">{([
    ['person_add','Nouveaux participants',d.nouveaux,d.nouveaux_avant],['groups','Participants actifs',d.actifs,d.actifs_avant],['auto_stories','Actions réalisées',d.pratique.actions_realisees,d.pratique.actions_realisees_avant],
   ] as const).map(([icone,label,valeur,avant])=><div key={label}><I nom={icone}/><dt>{label}</dt><dd>{valeur.toLocaleString('fr-FR')}</dd><p>{evolution(valeur,avant)}</p></div>)}</dl>
   <p className="tableau-note">Actif = au moins une action déclarée sur la période. Une lecture seule n’est pas comptée.</p>
   <div className="tableau-analyse"><section className="tableau-bloc"><h3>Parcours d’entrée</h3><p className="tableau-note">Indicateurs sur {p} jours</p><ol className="tableau-entonnoir">{([
    ['Visites du test',d.entree.visites_test,null],['Tests terminés',d.entree.tests_termines,part(d.entree.tests_termines,d.entree.visites_test)],['Découvertes commencées',d.entree.decouvertes,part(d.entree.decouvertes,d.entree.tests_termines)],['Achats vérifiés',d.entree.achats,part(d.entree.achats,d.entree.decouvertes)],
   ] as const).map(([label,n,taux],i)=><li key={label}><span>{i+1}. {label}</span><strong>{n.toLocaleString('fr-FR')}</strong>{taux&&<small>{taux} de l’étape précédente</small>}<div className="tableau-barre" aria-hidden="true"><span style={{width:`${d.entree.visites_test>0?Math.min(100,n/d.entree.visites_test*100):0}%`}}/></div></li>)}</ol>
    <p className="tableau-note">Le test peut être passé sans compte : ces étapes ne suivent pas nécessairement les mêmes personnes.</p>
    <h4>Canaux de provenance</h4>{d.entree.sources.length?<ul className="tableau-sources">{d.entree.sources.map(s=><li key={s.source}><span>{s.source}</span><strong>{s.visites} visite(s)</strong></li>)}</ul>:<p>Aucune provenance enregistrée.</p>}
   </section><section id="pratique-admin" className="tableau-bloc"><h3>Pratique <I nom="self_improvement"/></h3><p className="tableau-note">Déclarations des participants · {p} jours</p><dl className="tableau-pratique"><div><dt>Actions réalisées</dt><dd>{d.pratique.actions_realisees}</dd></div><div><dt>En partie</dt><dd>{d.pratique.actions_partielles}</dd></div><div><dt>« J’ai besoin d’aide »</dt><dd>{d.pratique.aides_bouton}</dd></div><div><dt>Première action des nouveaux</dt><dd>{d.pratique.nouveaux_premiere_action} / {d.pratique.nouveaux_total}</dd></div><div><dt>Questions au coach</dt><dd>{d.coach.questions}</dd></div><div><dt>Réponses du coach en échec</dt><dd>{d.coach.echecs}</dd></div></dl><p className="tableau-note">Ces chiffres décrivent les actions déclarées, sans évaluer la foi ni révéler le contenu du journal.</p></section></div>
   <nav className="tableau-onglets" aria-label="Registres de suivi">{([['relances','Relances'],['incidents','Incidents'],['achats','Accès en attente']] as const).map(([id,texte])=><button type="button" key={id} aria-pressed={suivi===id} onClick={()=>setSuivi(id)}>{texte}</button>)}</nav>
   <div className={'tableau-registres suivi-'+suivi}>
    <section id="relances-admin" className="tableau-bloc"><h3><I nom="history_toggle_off"/>À recontacter ({d.relances_total})</h3><p className="tableau-note">Parcours en cours sans activité déclarée depuis 3 jours. Les lectures seules ne sont pas mesurées. Jusqu’à 50 parcours.</p>{d.relances.length?<ul>{d.relances.map(r=><li key={r.enrollment_id}><strong>{r.prenom||'Sans prénom'}</strong><p>{r.programme||r.programme_id} · jour {r.jour} sur {r.duree}</p><p className="tableau-note">Sans activité depuis {r.jours_sans_activite} jours · {formatDateHeure(r.derniere_activite,'fr-FR')}</p><div className="tableau-contacts">{r.email&&<a href={'mailto:'+r.email}>Contacter par e-mail</a>}{r.whatsapp&&<a href={lienWhatsApp(r.whatsapp)} target="_blank" rel="noopener noreferrer">Contacter sur WhatsApp</a>}{!r.email&&!r.whatsapp&&<span>Aucun contact disponible</span>}</div></li>)}</ul>:<p>Aucun parcours à relancer selon ce critère.</p>}</section>
    <section id="incidents-admin" className="tableau-bloc"><h3><I nom="troubleshoot"/>Incidents enregistrés</h3><p className="tableau-note">Communications en erreur, incertaines ou expirées sur la période ; traitements en erreur ou à examiner, tous âges.</p>{d.incidents.length?<ul>{d.incidents.map(i=><li key={i.source+i.categorie+i.etat}><strong>{i.categorie}</strong><p>{i.source} · {i.etat} : {i.nombre}</p></li>)}</ul>:<p>Aucun incident enregistré selon ces critères.</p>}</section>
    <section id="achats-admin" className="tableau-bloc"><h3><I nom="lock_open"/>Achats sans accès ouvert</h3><p className="tableau-note">Ventes à signature vérifiée, reçues, en attente de compte ou à examiner. Les accès révoqués sont exclus. Jusqu’à 50 ventes.</p>{d.achats.length?<ul>{d.achats.map(a=><li key={a.payment_event_id}><strong>{a.id_evenement}</strong><p>{a.offre_id||'Offre à identifier'} · {a.statut_traitement}</p><p className="tableau-note">{formatDateHeure(a.recu_le,'fr-FR')}</p></li>)}</ul>:<p>Aucun achat en attente selon ces critères.</p>}</section>
   </div>
   <details className="tableau-details"><summary>Autres indicateurs et périmètre</summary><dl className="tableau-pratique"><div><dt>Participants</dt><dd>{d.participants}</dd></div><div><dt>Parcours en cours</dt><dd>{d.parcours_en_cours}</dd></div><div><dt>Parcours terminés</dt><dd>{d.parcours_termines}</dd></div><div><dt>Demandes d’aide ouvertes</dt><dd>{d.aide_attente}</dd></div></dl><p>{d.equipe_exclue} compte(s) de l’équipe exclus des chiffres. « Terminé » décrit le statut du parcours, pas la réalisation de toutes ses actions.</p></details>
  </>}
 </section>;
}
