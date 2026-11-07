import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {SimulateurEpargne} from '@/components/SimulateurEpargne';
afterEach(()=>{cleanup();vi.restoreAllMocks();});
const saisir=(label:string,value:string)=>fireEvent.change(screen.getByLabelText(label),{target:{value}});

it('calcule pendant la saisie, sans stockage ni appel réseau',()=>{
 const stockage=vi.spyOn(Storage.prototype,'setItem'),reseau=vi.spyOn(globalThis,'fetch');
 render(<SimulateurEpargne langue="fr" replie={false}/>);
 saisir('Ventes encaissées','1000');saisir('Coût des marchandises','400');saisir('Charges du commerce','100');
 const r=document.querySelector('.sim-ios-resultat')!;
 expect(r.textContent).toContain('500');expect(r.textContent).toContain('50');expect(r.textContent).toContain('100');
 expect(r.textContent).toContain('Il te reste 350');
 expect(stockage).not.toHaveBeenCalled();expect(reseau).not.toHaveBeenCalled();
});
it('garde les pourcentages dans les limites : 5 à 10 % et 0 à 30 %',()=>{
 render(<SimulateurEpargne langue="fr" replie={false}/>);
 const plusJoie=screen.getByRole('button',{name:'Augmenter : Réserve de joie'});expect(plusJoie).toBeDisabled();
 for(let i=0;i<10;i++)fireEvent.click(screen.getByRole('button',{name:'Baisser : Réserve de joie'}));
 expect(screen.getByRole('button',{name:'Baisser : Réserve de joie'})).toBeDisabled();
 for(let i=0;i<10;i++)fireEvent.click(screen.getByRole('button',{name:'Augmenter : Pour investir'}));
 expect(screen.getByRole('button',{name:'Augmenter : Pour investir'})).toBeDisabled();
 saisir('Ventes encaissées','100');
 const r=document.querySelector('.sim-ios-resultat')!.textContent!;expect(r).toContain('5 %');expect(r).toContain('30 %');
});
it('signale un montant mal écrit et efface tout à la demande',()=>{
 render(<SimulateurEpargne langue="fr" replie={false}/>);
 saisir('Ventes encaissées','abc');expect(screen.getByRole('alert')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Effacer les montants'}));
 expect(screen.getByLabelText('Ventes encaissées')).toHaveValue('');expect(screen.queryByRole('alert')).toBeNull();
});
it('le salarié n’a pas de ligne pour les marchandises',()=>{
 render(<SimulateurEpargne langue="fr" replie={false}/>);
 fireEvent.click(screen.getByRole('radio',{name:'Salarié'}));
 expect(screen.queryByLabelText('Coût des marchandises')).toBeNull();saisir('Salaire reçu','500');saisir('Charges de travail','70');
 expect(document.querySelector('.sim-ios-resultat')!.textContent).toContain('Il te reste 301 pour ta vie.');
});
it('la journée propose « Épargne » sous « Ma dîme » et un raccourci vers le simulateur',async()=>{
 const {MonEpargneHabitudes}=await import('@/components/MaDimeHabitudes');
 const {raccourcisHabitudes}=await import('@/components/RaccourcisHabitudes');
 render(<MonEpargneHabitudes langue="fr"/>);
 const volet=document.getElementById('hd-epargne')!;expect(volet.tagName).toBe('DETAILS');expect(volet.querySelector('summary')!.textContent).toContain('Épargne');
 expect(volet.querySelector('#hd-epargne-recu')).not.toBeNull();
 // Un seul raccourci d'épargne : le simulateur seul, ou « Mon épargne » qui le contient.
 const cles=raccourcisHabitudes(false,'E',false).map(x=>x.cle);
 expect(cles.filter(c=>c==='simulateur-epargne'||c==='epargne')).toHaveLength(1);
 const r=raccourcisHabitudes(true,'E',false).find(x=>x.cle==='simulateur-epargne'||x.cle==='epargne')!;
 expect(r.vers).toMatch(/^\/habitudes\/(simulateur-epargne|epargne)\?lang=en$/);
 expect(raccourcisHabitudes(false,'E',false,true).some(x=>x.cle==='simulateur-epargne')).toBe(false);
});
