import {MemoryRouter} from 'react-router-dom';
import {cleanup,fireEvent,render as renderBase,screen,waitFor,within} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const render=(ui:Parameters<typeof renderBase>[0])=>renderBase(ui,{wrapper:MemoryRouter});
const mock=vi.hoisted(()=>({charger:vi.fn()}));
vi.mock('@/lib/habitudes-jour-recette',()=>({chargerHistoriqueRecette:mock.charger}));
import {HistoriqueRecetteHabitudes} from '@/components/HistoriqueRecetteHabitudes';
const occurrence={occurrence_id:'A1',enrollment_id:'E1',version:1,date_locale:'2026-10-26',requise:true};
const jour={userId:'U1',date:'2026-10-26',jour:1,activites:[{occurrence,consigne:'Prière du matin',critere:null,heure:'06:00',etat:{...occurrence,etat:'partielle',aide_demandee:false,synchronisation:'synchronise'}}]};
beforeEach(()=>{mock.charger.mockReset().mockResolvedValue([jour]);});afterEach(cleanup);
const props={enrollmentId:'E1',participantId:'P1',dateLocale:'2026-10-26',langue:'fr',revision:0};
it('charge uniquement à l’ouverture volontaire et distingue les réalisations partielles',async()=>{
 render(<HistoriqueRecetteHabitudes {...props}/>);expect(mock.charger).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Voir mon historique et mes bilans'}));await screen.findByText('Mes bilans hebdomadaires');expect(within(screen.getByRole('region',{name:'Bilans hebdomadaires'})).getByText('Réalisées en partie')).toBeVisible();expect(screen.getByText('Réalisée en partie')).toBeInTheDocument();expect(within(screen.getByRole('region',{name:'Bilans mensuels'})).getByRole('link',{name:/journal/i})).toHaveAttribute('href','/seneve/journal?ecrire=1&depuis=habitudes&bilan=mois&periode=1&inscription=E1');expect(mock.charger).toHaveBeenCalledWith('E1','P1','2026-10-26');
});
it('actualise après une déclaration confirmée et retire les anciennes données pendant la lecture',async()=>{
 const vue=render(<HistoriqueRecetteHabitudes {...props}/>);fireEvent.click(screen.getByRole('button',{name:'Voir mon historique et mes bilans'}));await screen.findByText('Mes bilans hebdomadaires');mock.charger.mockResolvedValue([{...jour,activites:[{...jour.activites[0],etat:{...jour.activites[0]!.etat,etat:'realisee'}}]}]);vue.rerender(<HistoriqueRecetteHabitudes {...props} revision={1}/>);await waitFor(()=>expect(screen.getByText('Réalisée')).toBeInTheDocument());expect(mock.charger).toHaveBeenCalledTimes(2);
});
it('affiche un échec de lecture sans inventer de bilan et permet de réessayer',async()=>{
 mock.charger.mockRejectedValueOnce(Error('network'));render(<HistoriqueRecetteHabitudes {...props}/>);fireEvent.click(screen.getByRole('button',{name:'Voir mon historique et mes bilans'}));await screen.findByRole('alert');expect(screen.queryByText('Mes bilans hebdomadaires')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Réessayer la lecture'}));await screen.findByText('Mes bilans hebdomadaires');
});
it('retire immédiatement l’historique lors d’un changement de participant',async()=>{
 const vue=render(<HistoriqueRecetteHabitudes {...props}/>);fireEvent.click(screen.getByRole('button',{name:'Voir mon historique et mes bilans'}));await screen.findByText('Mes bilans hebdomadaires');mock.charger.mockReturnValue(new Promise(()=>{}));vue.rerender(<HistoriqueRecetteHabitudes {...props} participantId="P2"/>);expect(screen.queryByText('Prière du matin')).toBeNull();expect(screen.getByText('Chargement de l’historique…')).toBeVisible();
});
it('ouvre directement les bilans lorsque le journal demande le retour à l’historique',async()=>{
 const ancienne=window.location.href;
 try{window.history.replaceState(null,'','?historique=1#hd-historique');render(<HistoriqueRecetteHabitudes {...props}/>);await screen.findByText('Mon bilan du mois');expect(screen.getByRole('button',{name:'Fermer mon historique'})).toHaveAttribute('aria-expanded','true');expect(document.getElementById('hd-historique')).toBeInTheDocument();}finally{window.history.replaceState(null,'',ancienne);}
});
