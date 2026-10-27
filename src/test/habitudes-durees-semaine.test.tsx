import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const mock=vi.hoisted(()=>({charger:vi.fn()}));
vi.mock('@/lib/habitudes-lectures-api',()=>({chargerDetailsLectures:mock.charger}));
vi.mock('@/lib/supabase',()=>({supabase:{rpc:vi.fn()}}));
import {DureesSemaineHabitudes} from '@/components/DureesSemaineHabitudes';
const jour=(n:number)=>({userId:'U1',date:`2026-10-${25+n}`,jour:n,activites:[{habit_key:'lecture_pro',occurrence:{occurrence_id:'A'+n,enrollment_id:'E1',version:1,date_locale:`2026-10-${25+n}`,requise:true},consigne:'Lecture professionnelle',critere:null,heure:'08:00'}]});
beforeEach(()=>{mock.charger.mockReset().mockImplementation(async(_t,_e,ids)=>[{activity_id:ids[0],minutes:ids[0]==='A1'?20:30,titre:'Titre privé'}]);});afterEach(cleanup);
it('additionne les dernières durées des seuls jours fournis à la demande, sans afficher les titres',async()=>{
 render(<DureesSemaineHabitudes jours={[jour(1),jour(2)]} langue="fr"/>);expect(mock.charger).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button'));expect(await screen.findByText('50 min · temps déclaré')).toBeVisible();expect(mock.charger).toHaveBeenCalledTimes(2);expect(screen.queryByText('Titre privé')).toBeNull();expect(screen.getByText(/Une durée absente/)).toBeVisible();
});
it('ne montre aucun total incomplet si un jour échoue et permet de réessayer',async()=>{
 mock.charger.mockRejectedValueOnce(Error('offline'));render(<DureesSemaineHabitudes jours={[jour(1),jour(2)]} langue="fr"/>);fireEvent.click(screen.getByRole('button'));await screen.findByRole('alert');expect(screen.queryByText(/50 min/)).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Réessayer le total'}));expect(await screen.findByText('50 min · temps déclaré')).toBeVisible();
});
it('distingue l’absence de durée et retire le résultat au changement de compte',async()=>{
 mock.charger.mockResolvedValue([]);const vue=render(<DureesSemaineHabitudes jours={[jour(1)]} langue="fr"/>);fireEvent.click(screen.getByRole('button'));await screen.findByText('Aucune durée déclarée pour ces journées.');mock.charger.mockReturnValue(new Promise(()=>{}));vue.rerender(<DureesSemaineHabitudes jours={[{...jour(1),userId:'U2'}]} langue="fr"/>);expect(screen.queryByText('0 min · temps déclaré')).toBeNull();expect(screen.getByRole('status')).toBeVisible();
});
it('refuse de compter deux fois la même activité',async()=>{
 render(<DureesSemaineHabitudes jours={[jour(1),jour(1)]} langue="fr"/>);fireEvent.click(screen.getByRole('button'));await screen.findByRole('alert');expect(mock.charger).not.toHaveBeenCalled();
});
