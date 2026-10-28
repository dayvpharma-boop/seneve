import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it} from 'vitest';
import {bilansMensuels,BilansMensuelsHabitudes} from '@/components/BilansMensuelsHabitudes';
import type {JourHabitudesLecture} from '@/lib/habitudes-lecture';
const jour=(n:number,etat:'realisee'|'partielle'='realisee',confirmee=true):JourHabitudesLecture=>({jour:n,date_locale:'2026-10-27',bilan:{} as JourHabitudesLecture['bilan'],activites:[{id:'A'+n,consigne:'Lecture',requise:true,etat,aide:false,confirmee}]});
afterEach(cleanup);
it('sépare les mois pédagogiques et conserve le dernier jour dans le sixième mois',()=>{
 expect(bilansMensuels([jour(30),jour(31),jour(180),jour(181)]).map(m=>[m.mois,m.de,m.a,m.jours,m.realisees])).toEqual([[1,1,30,1,1],[2,31,60,1,1],[6,151,181,2,2]]);
});
it('ne compte pas deux fois un jour et ne valide pas une réalisation non confirmée',()=>{
 expect(bilansMensuels([jour(1),jour(1),jour(2,'partielle'),jour(3,'realisee',false)])[0]).toMatchObject({jours:3,total:3,realisees:1,partielles:1,enAttente:1,journeesCompletes:1});
});
it('présente le mois en cours comme provisoire et propose une réflexion sans enregistrer de réponse',()=>{
 render(<BilansMensuelsHabitudes jours={[jour(1),jour(2,'partielle')]} langue="fr" inscription="E1"/>);expect(screen.getByText('1 / 2')).toBeVisible();expect(screen.getByText(/Bilan provisoire/)).toBeVisible();fireEvent.click(screen.getByText('Prendre un temps pour mon bilan du mois'));expect(screen.getByText('Qu’est-ce qui s’est bien passé ce mois-ci ?')).toBeVisible();expect(screen.getByRole('link',{name:'Écrire dans mon journal'}).getAttribute('href')).toMatch(/journal\?ecrire=1&depuis=habitudes&bilan=mois&periode=1&inscription=E1$/);expect(document.querySelector('textarea,input')).toBeNull();
});
it('ne crée pas un bilan vide et signale un mois entièrement disponible sans compter les jours futurs',()=>{
 const vue=render(<BilansMensuelsHabitudes jours={[]} langue="fr"/>);expect(screen.queryByRole('region')).toBeNull();vue.rerender(<BilansMensuelsHabitudes jours={Array.from({length:30},(_,i)=>jour(i+1))} langue="fr"/>);expect(screen.queryByText(/Bilan provisoire/)).toBeNull();expect(screen.getByText('30 / 30')).toBeVisible();
});
it('présente les textes anglais et le lien de journal dans la même langue',()=>{
 render(<BilansMensuelsHabitudes jours={[jour(31)]} langue="en" inscription="E2"/>);expect(screen.getByText('Month 2')).toBeVisible();fireEvent.click(screen.getByText('Reflect on my month'));expect(screen.getByRole('link',{name:'Write in my journal'}).getAttribute('href')).toMatch(/inscription=E2&lang=en$/);
});
