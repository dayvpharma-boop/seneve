import type {FormEvent} from 'react';
import {ETATS_EQUIPE,ETAT_LIBELLE,lienWhatsApp,type StaffRequest,type TeamMember} from '@/lib/admin';
import {formatDateHeure} from '@/lib/journal';
import {IconeRegistre as M} from './IconeRegistre';
import {IconeConfidentialite as C} from './IconeConfidentialite';
import {IconePilotage as P} from './IconePilotage';
import {EchangesDemande} from './EchangesDemande';
import {SuppressionCompte} from './SuppressionCompte';
type Props={request:StaffRequest;admin:boolean;team:TeamMember[];etat:string;reponse:string;affecte:string;busy:boolean;error:string;trop:boolean;etatChange:(s:string)=>void;reponseChange:(s:string)=>void;affecteChange:(s:string)=>void;annuler:()=>void;save:(e:FormEvent)=>void;supprime?:()=>Promise<void>};
export function FormulaireDemandeFidele(p:Props){const r=p.request;return <article className="fd-fiche admin-demande" id={'demande-'+encodeURIComponent(r.request_id)}>
 <header className="fd-identite"><b className="fd-avatar">{r.prenom?.slice(0,2).toUpperCase()||'—'}</b><div><h2>{r.prenom||'Sans prénom'}</h2><p>{r.langue==='en'?'Anglais':'Français'} · <M nom="event" taille={14}/> {formatDateHeure(r.cree_le,'fr-FR')}</p></div><span className="fd-badge">{ETAT_LIBELLE[r.etat]||r.etat}</span></header>
 <div className="fd-message"><span>Message reçu</span><p>« {r.motif} »</p></div>
 <EchangesDemande messages={r.messages}/>
 <details className="fd-notes"><summary><M nom="attachment" taille={18}/>Notes jointes par le participant ({r.extraits_partages?1:0})<M nom="expand_more" taille={18}/></summary><p>{r.extraits_partages||'Aucune note jointe à cette demande.'}</p></details>
 <div className="fd-contacts">{r.email?<a href={'mailto:'+r.email}><C nom="mail" taille={18}/><span>{r.email}</span></a>:<span><C nom="mail" taille={18}/>Aucun e-mail relié</span>}{r.whatsapp?<a href={lienWhatsApp(r.whatsapp)} target="_blank" rel="noopener noreferrer" aria-label={r.whatsapp}><M nom="chat" taille={18}/>WhatsApp vérifié</a>:<span><M nom="chat" taille={18}/>Aucun WhatsApp relié</span>}</div>
 {r.programme_id&&<p className="fd-parcours">Parcours : {r.programme_id}</p>}
 {p.admin&&r.email&&p.supprime&&<SuppressionCompte email={r.email} onSupprime={p.supprime}/>}
 {r.etat==='annulee'?<p className="fd-retire"><M nom="info" taille={18}/>Le participant a annulé cette demande : elle n’est plus modifiable.</p>:<form onSubmit={p.save}>
 {p.admin&&<label className="fd-field"><span>Confier à</span><div className="fd-select"><select value={p.affecte} onChange={e=>p.affecteChange(e.target.value)}><option value="">Personne pour l’instant</option>{p.team.map(m=><option key={m.auth_user_id} value={m.auth_user_id}>{m.prenom?m.prenom+' — ':''}{m.email}</option>)}</select><M nom="expand_more"/></div></label>}
 <label className="fd-field fd-reponse"><span>Réponse visible par le participant dans son espace <small><M nom="visibility" taille={13}/>Public participant</small></span><textarea rows={4} value={p.reponse} onChange={e=>p.reponseChange(e.target.value)} placeholder="Écris ici avec bienveillance et clarté…"/></label>
 <fieldset className="fd-etats"><legend>Nouveau statut du ticket</legend><div>{['en_cours','attente_participant','resolue'].map(id=><label key={id} className={p.etat===id?'fd-choisi':''}><input type="radio" name={'etat-'+r.request_id} value={id} checked={p.etat===id} onChange={()=>p.etatChange(id)}/><i/>{ETAT_LIBELLE[id]}</label>)}</div><label className="fd-etat-complet">État<select value={p.etat} onChange={e=>p.etatChange(e.target.value)}>{ETATS_EQUIPE.map(e=><option value={e.value} key={e.value}>{e.label}</option>)}</select></label></fieldset>
 <p className="fd-info"><M nom="info" taille={16}/><span>{p.etat==='resolue'?'En passant à « Résolue », la personne recevra un e-mail avec ta réponse (si son compte a une adresse e-mail).':'La personne n’est prévenue par e-mail qu’au passage à « Résolue ». Avant cela, écris-lui par e-mail ou WhatsApp si besoin.'}</span></p>
 <div className="fd-actions"><button type="button" onClick={p.annuler}>Ignorer les changements</button><button type="submit" disabled={p.busy||p.trop} aria-label="Enregistrer"><P nom="send" taille={18}/>{p.busy?'Enregistrement…':'Enregistrer la réponse'}</button></div>{p.trop&&<p role="alert">4 000 caractères au plus.</p>}{p.error&&<p role="alert">{p.error}</p>}
 </form>}
 </article>;}
