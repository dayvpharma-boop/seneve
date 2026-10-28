import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const mock=vi.hoisted(()=>({charger:vi.fn()}));
vi.mock('@/lib/habitudes-lectures-api',()=>({chargerDetailsLectures:mock.charger}));
vi.mock('@/lib/supabase',()=>({supabase:{rpc:vi.fn()}}));
import {LecturesHistoriqueHabitudes} from '@/components/LecturesHistoriqueHabitudes';
const occurrence={occurrence_id:'A1',enrollment_id:'E1',version:1,date_locale:'2026-10-26',requise:true};
const jour={userId:'U1',date:'2026-10-26',jour:1,activites:[{habit_key:'lecture_pro',occurrence,consigne:'Lecture professionnelle',critere:null,heure:'08:00'}]};
beforeEach(()=>{mock.charger.mockReset().mockResolvedValue([{activity_id:'A1',minutes:20,titre:'Mon livre'}]);});afterEach(cleanup);
it('lit seulement à la demande et affiche les valeurs enregistrées',async()=>{
 render(<LecturesHistoriqueHabitudes jour={jour} langue="fr"/>);expect(mock.charger).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Voir mes durées de lecture'}));expect(await screen.findByText('20 min · Mon livre')).toBeVisible();expect(mock.charger).toHaveBeenCalledWith(expect.anything(),'E1',['A1']);
});
it('distingue une durée absente d’une lecture impossible et propose un nouvel essai',async()=>{
 mock.charger.mockRejectedValueOnce(Error('offline')).mockResolvedValueOnce([]);render(<LecturesHistoriqueHabitudes jour={jour} langue="fr"/>);fireEvent.click(screen.getByRole('button'));await screen.findByRole('alert');expect(screen.queryByText('Aucune durée déclarée')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Réessayer'}));expect(await screen.findByText('Aucune durée déclarée')).toBeVisible();
});
it('retire immédiatement le titre privé au changement de compte et ignore la réponse ancienne',async()=>{
 const vue=render(<LecturesHistoriqueHabitudes jour={jour} langue="fr"/>);fireEvent.click(screen.getByRole('button'));await screen.findByText('20 min · Mon livre');mock.charger.mockReturnValue(new Promise(()=>{}));vue.rerender(<LecturesHistoriqueHabitudes jour={{...jour,userId:'U2'}} langue="fr"/>);expect(screen.queryByText('20 min · Mon livre')).toBeNull();await waitFor(()=>expect(screen.getByRole('status')).toBeVisible());
});
