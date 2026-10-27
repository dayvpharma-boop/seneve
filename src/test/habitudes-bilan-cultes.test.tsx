import {cleanup,render,screen} from '@testing-library/react';
import {afterEach,expect,it} from 'vitest';
import {bilanCultes} from '@/lib/habitudes-bilan-cultes';
import {BilansHebdomadairesHabitudes} from '@/components/BilansHebdomadairesHabitudes';
import type {JourHabitudesLecture} from '@/lib/habitudes-lecture';
const activite=(id:string,habit_key:string,etat:'realisee'|'partielle'|'preparee'|'non_commencee',confirmee=true)=>({id,habit_key,consigne:'Culte',etat,confirmee,requise:true,aide:false});
const jour=(n:number,activites:JourHabitudesLecture['activites']):JourHabitudesLecture=>({jour:n,date_locale:'2026-10-27',bilan:{} as JourHabitudesLecture['bilan'],activites});
afterEach(cleanup);
it('compte uniquement les cultes identifiés et confirmés, sans transformer une partie en participation complète',()=>{
 expect(bilanCultes([jour(1,[activite('A','culte_semaine','realisee'),activite('B','culte_semaine','partielle'),activite('C','culte_dimanche','preparee'),activite('D','culte_dimanche','realisee',false),activite('E','lecture_pro','realisee')])])).toEqual({jours:1,realisees:1,partielles:1});
});
it('ne déduit pas un culte depuis un simple libellé et distingue une journée sans culte',()=>{
 expect(bilanCultes([jour(1,[{id:'A',consigne:'Culte',etat:'realisee',confirmee:true,requise:true,aide:false}])])).toBeNull();expect(bilanCultes([jour(1,[activite('A','bible_matin','realisee')])])).toEqual({jours:1,realisees:0,partielles:0});
});
it('sépare les semaines du parcours et explique les journées observées',()=>{
 render(<BilansHebdomadairesHabitudes jours={[jour(7,[activite('A','culte_semaine','partielle')]),jour(8,[activite('B','culte_dimanche','realisee')])]} langue="fr"/>);expect(screen.getByText('0 participation réalisée · 1 en partie')).toBeVisible();expect(screen.getByText('1 participation réalisée · 0 en partie')).toBeVisible();expect(screen.getAllByText(/Les rendez-vous prévus sont exclus/)).toHaveLength(2);
});
