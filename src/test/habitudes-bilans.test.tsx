import {cleanup,render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,expect,it} from 'vitest';
import {semainesHabitudes} from '@/lib/habitudes-bilans';
import {BilansHebdomadairesHabitudes} from '@/components/BilansHebdomadairesHabitudes';
import type {JourHabitudesLecture} from '@/lib/habitudes-lecture';
const jour=(n:number,acts:JourHabitudesLecture['activites']):JourHabitudesLecture=>({jour:n,date_locale:'2026-10-25',activites:acts,bilan:{} as JourHabitudesLecture['bilan']});
const action=(id:string,etat:'realisee'|'partielle'|'preparee'|'non_commencee',extra={})=>({id,consigne:'Fixture',requise:true,etat,aide:false,confirmee:true,...extra});
afterEach(cleanup);
it('regroupe jours 1–7 puis 8–14 sans définir les mois',()=>{
 const s=semainesHabitudes([jour(8,[action('b','realisee')]),jour(7,[action('a','preparee')])]);expect(s.map(x=>[x.numero,x.de,x.a])).toEqual([[1,1,7],[2,8,14]]);expect(s[0]!.preparees).toBe(1);expect(s[1]!.realisees).toBe(1);
});
it('une prière réalisée ne termine pas les trois',()=>{
 const [s]=semainesHabitudes([jour(1,[action('matin','realisee'),action('midi','non_commencee',{confirmee:false}),action('soir','non_commencee',{confirmee:false})])]);expect(s).toMatchObject({total:3,realisees:1,journeesCompletes:0});
});
it('une action locale et une aide locale ne sont pas confirmées',()=>{
 const [s]=semainesHabitudes([jour(1,[action('a','realisee',{confirmee:false,aide:true})])]);expect(s).toMatchObject({realisees:0,aides:0,enAttente:1,journeesCompletes:0});
});
it('l’aide confirmée reste indépendante et une facultative ne bloque pas la journée',()=>{
 const [s]=semainesHabitudes([jour(1,[action('a','realisee',{aide:true}),action('b','non_commencee',{requise:false})])]);expect(s).toMatchObject({aides:1,realisees:1,journeesCompletes:1});
});
it('une journée sans activité requise n’est pas déclarée complète',()=>{
 expect(semainesHabitudes([jour(1,[action('a','realisee',{requise:false})])])[0]!.journeesCompletes).toBe(0);
});
it('ne présente pas un bilan vide comme une réussite',()=>{
 render(<MemoryRouter><BilansHebdomadairesHabitudes jours={[]} langue="fr"/></MemoryRouter>);expect(screen.queryByRole('region')).toBeNull();
});
it('propose un bilan personnel via le journal de la bonne inscription',()=>{
 render(<MemoryRouter><BilansHebdomadairesHabitudes jours={[jour(1,[action('a','partielle',{aide:true})])]} langue="fr" inscription="E1"/></MemoryRouter>);
 expect(screen.getByText(/ne mesurent ni ta foi/)).toBeInTheDocument();document.querySelector('details')!.open=true;expect(screen.getByRole('link',{name:'Écrire dans mon journal'})).toHaveAttribute('href','/journal?inscription=E1');expect(screen.getByText('Qu’ai-je appris ?')).toBeInTheDocument();expect(document.querySelector('textarea,input')).toBeNull();
});
it('propose le journal anglais sans enregistrer de réponse',()=>{
 render(<MemoryRouter><BilansHebdomadairesHabitudes jours={[jour(1,[action('a','preparee')])]} langue="en" inscription="E2"/></MemoryRouter>);document.querySelector('details')!.open=true;expect(screen.getByRole('link',{name:'Write in my journal'})).toHaveAttribute('href','/journal?inscription=E2&lang=en');
});
