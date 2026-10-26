import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {SimulateurDime} from '@/components/SimulateurDime';
afterEach(()=>{cleanup();vi.restoreAllMocks();});
function ouvrir(){const r=render(<SimulateurDime langue="fr"/>);r.container.querySelector('details')!.open=true;return r;}
function situation(value:string){fireEvent.change(screen.getByLabelText('Situation'),{target:{value}});}
function saisir(label:string,value:string){fireEvent.change(screen.getByLabelText(label),{target:{value}});}
it('affiche la formule de l’exemple commerce, sans stockage ni appel réseau',()=>{
 const stockage=vi.spyOn(Storage.prototype,'setItem'),reseau=vi.spyOn(globalThis,'fetch');ouvrir();situation('commerce');saisir('Période','semaine');saisir('Ventes encaissées','1000');saisir('Coût des marchandises','650');saisir('Charges professionnelles admissibles','150');fireEvent.click(screen.getByRole('button',{name:'Simuler'}));
 expect(screen.getByText('Dîme simulée : 200 × 10 % = 20')).toBeInTheDocument();expect(stockage).not.toHaveBeenCalled();expect(reseau).not.toHaveBeenCalled();
});
it('un prêt, une offrande ou un cas particulier ne produit pas de pourcentage automatique',()=>{
 ouvrir();for(const value of ['pret','offrande','particulier']){situation(value);expect(screen.getByRole('status')).toBeInTheDocument();expect(screen.queryByRole('button',{name:'Simuler'})).toBeNull();expect(document.querySelector('input')).toBeNull();}
});
it('efface les montants et le résultat à la demande et au changement de situation',()=>{
 ouvrir();situation('don');saisir('Période','autre');saisir('Don d’argent reçu','100');fireEvent.click(screen.getByRole('button',{name:'Simuler'}));expect(document.querySelector('output')).not.toBeNull();fireEvent.click(screen.getByRole('button',{name:'Effacer les montants'}));expect(screen.getByLabelText('Don d’argent reçu')).toHaveValue('');expect(document.querySelector('output')).toBeNull();saisir('Don d’argent reçu','200');situation('salaire');expect(screen.getByLabelText('Salaire reçu')).toHaveValue('');
});
it('ne calcule pas si la période manque, même avec un submit direct',()=>{
 const r=ouvrir();situation('don');saisir('Don d’argent reçu','100');fireEvent.submit(r.container.querySelector('form')!);expect(screen.getByRole('alert')).toBeInTheDocument();expect(document.querySelector('output')).toBeNull();
});
it('ne propose pas de déduction de dettes ou de dépenses personnelles',()=>{
 ouvrir();situation('salaire');expect(screen.getByText(/ne sont pas déduits/)).toBeInTheDocument();expect(document.querySelectorAll('input')).toHaveLength(2);
});
it('ne conserve pas les montants après démontage',()=>{
 const r=ouvrir();situation('don');saisir('Don d’argent reçu','123');r.unmount();ouvrir();situation('don');expect(screen.getByLabelText('Don d’argent reçu')).toHaveValue('');
});
