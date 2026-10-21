import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {afterEach,it,expect,vi} from 'vitest';
import {RegistresAdministration} from '@/components/RegistresAdministration';
import type {Dashboard} from '@/components/PilotageAdmin';
import type {StaffRequest} from '@/lib/admin';
afterEach(cleanup);
const r=(id:string,prenom:string,affecte_a:string,etat='recue'):StaffRequest=>({request_id:id,prenom,affecte_a,etat,cree_le:'2026-10-01T08:00:00Z',modifie_le:'v1',motif:'Lecture inaccessible',extraits_partages:null,reponse:null,affecte_email:null,langue:'fr',programme_id:null,email:null,whatsapp:null});
const vide:Dashboard={actualise_le:'2026-10-21T08:00:00Z',periode_jours:7,equipe_exclue:0,participants:0,nouveaux:0,nouveaux_avant:0,actifs:0,actifs_avant:0,parcours_en_cours:0,parcours_termines:0,aide_attente:0,aide_attente_48h:0,entree:{visites_test:0,visites_test_avant:0,tests_termines:0,tests_termines_avant:0,decouvertes:0,decouvertes_avant:0,achats:0,achats_avant:0,sources:[]},pratique:{actions_realisees:0,actions_realisees_avant:0,actions_partielles:0,aides_bouton:0,nouveaux_total:0,nouveaux_premiere_action:0},coach:{questions:0,echecs:0,en_attente:0},relances_total:0,achats_attente:0,relances:[],achats:[],incidents:[]};
const base={mobile:false,admin:true,authId:'U1',requests:[r('R1','Marie','U1'),r('R2','Luc','U2'),r('R3','Paul','U1','annulee')],data:null,erreur:'',busy:false,refresh:vi.fn(),detail:(r:StaffRequest)=><p>Fiche {r.prenom}</p>,ouvrirDemandes:vi.fn(),communications:vi.fn(),exporter:vi.fn()};
it('filtre les demandes par attribution, recherche et état sans modifier les dossiers',()=>{
 render(<RegistresAdministration {...base} page="demandes"/>);
 expect(screen.getByText('Marie')).toBeInTheDocument();expect(screen.getByText('Luc')).toBeInTheDocument();fireEvent.click(screen.getByLabelText('Mes attributions uniquement'));expect(screen.queryByText('Luc')).not.toBeInTheDocument();
 fireEvent.change(screen.getByRole('searchbox'),{target:{value:'inexistant'}});expect(screen.getByText('Aucune demande ici.')).toBeInTheDocument();
 fireEvent.change(screen.getByRole('searchbox'),{target:{value:''}});fireEvent.click(screen.getByRole('tab',{name:/Annulées/}));expect(screen.getByText('Paul')).toBeInTheDocument();expect(screen.queryByText('Marie')).not.toBeInTheDocument();
});
it('le registre participants annonce sa portée et filtre les parcours réellement fournis',()=>{
 const data:Dashboard={...vide,achats:[],participants:12,actifs:5,relances_total:1,relances:[{enrollment_id:'E1',prenom:'Marie',programme_id:'P1',programme:'Découverte',jour:4,duree:7,jours_sans_activite:5,derniere_activite:'2026-10-15T08:00:00Z',email:'m@example.invalid',langue:'fr',whatsapp:null}]};
 render(<RegistresAdministration {...base} page="participants" data={data}/>);expect(screen.getByText(/ne constitue pas l’annuaire complet/)).toBeInTheDocument();expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow','4');
 fireEvent.change(screen.getByLabelText('Dernière activité'),{target:{value:'7'}});expect(screen.getByText('Aucun parcours selon ces filtres.')).toBeInTheDocument();expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
});
it('les achats ne proposent pas de délivrance ou de révocation fictive et ouvrent le traitement existant',()=>{
 const ouvrir=vi.fn();const data:Dashboard={...vide,relances:[],achats:[{payment_event_id:'A1',id_evenement:'V1',offre_id:'OFFRE',statut_traitement:'en_attente_compte',recu_le:'2026-10-16T08:00:00Z'}]};
 render(<RegistresAdministration {...base} page="achats" data={data} ouvrirDemandes={ouvrir}/>);expect(screen.getByRole('button',{name:'Délivrer les droits'})).toBeDisabled();expect(screen.getByRole('button',{name:'Confirmer la révocation'})).toBeDisabled();fireEvent.click(screen.getByRole('button',{name:'Traiter une demande d’accès'}));expect(ouvrir).toHaveBeenCalledOnce();
 fireEvent.click(screen.getByRole('tab',{name:/À examiner/}));expect(screen.getByText('Aucun achat selon ces filtres.')).toBeInTheDocument();expect(screen.queryByText('Fiche achat V1')).not.toBeInTheDocument();
});
import {csvRegistre,pageRegistre} from '@/lib/registres';
it('exporte seulement les champs opérationnels et neutralise les formules CSV',()=>{
 const request={...r('=FORMULE','Prénom confidentiel','U1'),email:'secret@example.invalid',motif:'réflexion intime',extraits_partages:'note privée',reponse:'réponse privée'};
 const csv=csvRegistre('demandes',[request]);
 expect(csv).toContain("'=FORMULE");
 for(const secret of ['Prénom confidentiel','secret@example.invalid','réflexion intime','note privée','réponse privée'])expect(csv).not.toContain(secret);
 expect(pageRegistre([1,2,3],9,2)).toEqual({courante:2,pages:2,rows:[3]});
});
it('recherche sur mobile, filtre la langue, trie et réinitialise la pagination des demandes',()=>{
 const requests=Array.from({length:12},(_,i)=>({...r('R'+i,'Participant '+i,'U1'),langue:i===11?'en':'fr',cree_le:`2026-10-${String(i+1).padStart(2,'0')}T08:00:00Z`}));
 render(<RegistresAdministration {...base} page="demandes" mobile requests={requests}/>);
 fireEvent.click(screen.getByRole('button',{name:'Suivants'}));expect(screen.getByText('Page 2 sur 2')).toBeInTheDocument();
 fireEvent.click(screen.getByText('Outils du registre'));fireEvent.change(screen.getByLabelText('Langue'),{target:{value:'en'}});expect(screen.getByText('Participant 11')).toBeInTheDocument();expect(screen.getByText('Page 1 sur 1')).toBeInTheDocument();
 fireEvent.change(screen.getByRole('searchbox'),{target:{value:'introuvable'}});expect(screen.getByText('Aucune demande ici.')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Réinitialiser les filtres'}));expect(screen.getByText('Participant 0')).toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('Trier la liste'),{target:{value:'recent'}});expect(screen.getByText('Participant 11')).toBeInTheDocument();
});
it('sélectionne les participants de la page et ouvre leur demande exacte',()=>{
 const ouvrir=vi.fn();const data:Dashboard={...vide,relances_total:1,relances:[{enrollment_id:'E1',prenom:'Marie',programme_id:'P1',programme:'Découverte',jour:4,duree:7,jours_sans_activite:5,derniere_activite:'2026-10-15T08:00:00Z',email:'m@example.invalid',langue:'fr',whatsapp:'+24312345678'}]};
 render(<RegistresAdministration {...base} page="participants" mobile data={data} requests={[{...r('TICKET_MARIE','Marie','U1'),email:'m@example.invalid'}]} ouvrirDemandes={ouvrir}/>);
 fireEvent.click(screen.getByText('Outils du registre'));expect(screen.getByRole('button',{name:'Exporter la sélection'})).toBeDisabled();fireEvent.click(screen.getByLabelText('Sélectionner cette page'));expect(screen.getByRole('button',{name:'Exporter la sélection'})).toBeEnabled();
 fireEvent.click(screen.getByRole('button',{name:'Voir la demande'}));expect(ouvrir).toHaveBeenCalledWith('TICKET_MARIE');
 expect(screen.getByRole('link',{name:'Contacter par e-mail'})).toHaveAttribute('href','mailto:m@example.invalid');expect(screen.getByRole('link',{name:'Contacter sur WhatsApp'})).toHaveAttribute('href','https://wa.me/24312345678');
 fireEvent.click(screen.getByRole('button',{name:'Désélectionner'}));expect(screen.getByRole('button',{name:'Exporter la sélection'})).toBeDisabled();
});
