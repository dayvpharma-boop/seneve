import type {ReactNode} from 'react';
import type {Dashboard} from './PilotageAdmin';
import type {StaffRequest} from '@/lib/admin';
import {IconeRegistre as M} from './IconeRegistre';

/** Carte de la maquette mobile ; seuls les indicateurs reçus du service sont affichés. */
export function CarteParticipantRegistre({r,requests,ouverte,choisi,choisir,children}:{r:Dashboard['relances'][number];requests:StaffRequest[];ouverte:boolean;choisi:boolean;choisir:(v:boolean)=>void;children:ReactNode}) {
 const demandes=requests.filter(d=>r.email&&d.email?.toLowerCase()===r.email.toLowerCase()&&d.etat!=='annulee'&&d.etat!=='resolue');
 const progression=r.duree?Math.min(100,Math.max(0,r.jour/r.duree*100)):0;
 return <details className="ar-participant rf-carte-source" open={ouverte}>
  <summary>
   <div className="rf-carte-identite"><b className="ar-avatar">{r.prenom?.split(/\s+/).map(v=>v[0]).slice(0,2).join('').toUpperCase()||'—'}</b><div><div><strong>{r.prenom||'Sans prénom'}</strong><small>En cours</small></div><p>{r.programme||r.programme_id}</p></div><div className="rf-carte-jour"><b>J{r.jour}<small>/{r.duree}</small></b><span>{r.jours_sans_activite} j sans activité</span></div></div>
   <div className="rf-carte-avance"><div><span>Jour atteint</span><strong>{r.jour} sur {r.duree}</strong></div><span className="rf-carte-jauge" aria-label={`Jour ${r.jour} sur ${r.duree}`}><i style={{width:progression+'%'}}/></span></div>
   {demandes.length>0&&<div className="rf-carte-signal"><span><M nom="chat" taille={18}/>{demandes.length} demande{demandes.length>1?'s':''} d’aide en cours</span><b>À traiter</b></div>}
   <span className="rf-carte-ouvrir"><span className="rf-libelle-ferme">Ouvrir la fiche participant</span><span className="rf-libelle-ouvert">Fiche ouverte</span><M nom="expand_more" taille={18}/></span>
  </summary>
  {children}
  <label className="rf-choisir"><input type="checkbox" aria-label={'Sélectionner '+(r.prenom||r.enrollment_id)} checked={choisi} onChange={e=>choisir(e.target.checked)}/>Sélectionner ce participant</label>
 </details>;
}
