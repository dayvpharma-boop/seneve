import {render,screen} from '@testing-library/react';
import {expect,it} from 'vitest';
import {CalendrierHabitudes,etatJourHabitudes} from '@/components/CalendrierHabitudes';
const act=(id:string,etat:'realisee'|'non_commencee'|'partielle')=>({id,consigne:id,requise:true,etat,aide:false,confirmee:etat!=='non_commencee'});
const bil={total:2,realisees:0,partielles:0,preparees:0,non_commencees:2,aides:0,en_attente:0,requises:2,requises_realisees:0,journee:'non_commencee' as const};
const jour=(j:number,etats:('realisee'|'non_commencee'|'partielle')[])=>({jour:j,date_locale:`2026-10-${25+j}`,bilan:bil,activites:etats.map((e,i)=>act(`${j}-${i}`,e))});
it('classe chaque journée : complète, commencée, rien, à venir',()=>{
 expect(etatJourHabitudes(jour(1,['realisee','realisee']))).toBe('complete');
 expect(etatJourHabitudes(jour(2,['realisee','non_commencee']))).toBe('commencee');
 expect(etatJourHabitudes(jour(3,['partielle','non_commencee']))).toBe('commencee');
 expect(etatJourHabitudes(jour(4,['non_commencee']))).toBe('aucune');
 expect(etatJourHabitudes(undefined)).toBe('a_venir');
});
it('affiche le mois en cours, les jours ouverts et les chiffres enregistrés',()=>{
 const b={joursOuverts:3,duree:61,termine:false,pasCommence:false,realisees:0,partielles:0,preparees:0,aides:0,actionsOuvertes:0,jours:[],prochain:null};
 render(<CalendrierHabitudes langue="fr" b={b} jours={[jour(1,['realisee','realisee']),jour(2,['realisee','non_commencee']),jour(3,['non_commencee','non_commencee'])]}/>);
 expect(screen.getByRole('heading',{name:'Mon calendrier'})).toBeInTheDocument();expect(screen.getByText('Activités réalisées').previousSibling).toHaveTextContent('3');
 expect(screen.getAllByRole('listitem').filter(li=>li.classList.contains('day-tile'))).toHaveLength(30);
 expect(screen.getByLabelText('Jour 1 : toutes les activités réalisées')).toHaveClass('is-done');
 expect(screen.getByLabelText('Jour 2 : commencée')).toHaveClass('is-partial');
 expect(screen.getByLabelText('Jour 3 : rien d’enregistré (aujourd’hui)')).toHaveClass('is-today');
 expect(screen.getByLabelText('Jour 4 : pas encore ouvert')).toHaveClass('is-locked');
 expect(screen.getByText('1 / 3')).toBeInTheDocument();
});
