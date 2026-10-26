import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
vi.mock('@/lib/supabase',()=>({supabase:{rpc:vi.fn()}}));
import {supabase} from '@/lib/supabase';
import {SemaineAvantInscription} from '@/components/SemaineAvantInscription';
import {InscriptionHabitudes} from '@/components/InscriptionHabitudes';
import type {PlanningInscription} from '@/lib/habitudes-inscription-api';
const planning:PlanningInscription=[{habit_key:'reveil',libelle:'Réveil',creneaux:[{creneau_id:'principal',heure_locale:'05:45',jours_iso:[1,2,3,4,5,6,7]}]},{habit_key:'culte_semaine',libelle:'Culte en semaine',creneaux:[{creneau_id:'premier',heure_locale:'17:45',jours_iso:[2]},{creneau_id:'second',heure_locale:'18:15',jours_iso:[6]}]}];
const props={planning,frequences:{reveil:7,culte_semaine:2},fuseau:'Africa/Kinshasa',langue:'fr'};
afterEach(()=>{cleanup();vi.clearAllMocks();});
function jour(nom:string){const summary=screen.getByText(new RegExp('^'+nom+' ·'));const details=summary.closest('details')!;details.open=true;return within(details);}
it('répartit les choix sur les sept jours et trie les heures sans aucun appel serveur',()=>{
 const r=render(<SemaineAvantInscription {...props}/>);r.container.querySelector('details')!.open=true;
 expect(jour('Mardi').getAllByRole('listitem').map(e=>e.textContent)).toEqual(['05:45Réveil','17:45Culte en semaine']);expect(jour('Samedi').getByText('18:15')).toBeVisible();expect(jour('Lundi').queryByText('Culte en semaine')).toBeNull();expect(supabase.rpc).not.toHaveBeenCalled();
});
it('signale une heure identique sans déplacer les rendez-vous ni imposer un blocage',()=>{
 const p:PlanningInscription=[...planning,{habit_key:'lecture_pro',libelle:'Lecture professionnelle',creneaux:[{creneau_id:'principal',heure_locale:'17:45',jours_iso:[2]}]}];const r=render(<SemaineAvantInscription {...props} planning={p} frequences={{...props.frequences,lecture_pro:1}}/>);r.container.querySelector('details')!.open=true;const mardi=jour('Mardi');expect(mardi.getByText(/Plusieurs rendez-vous à la même heure/)).toHaveTextContent('17:45');expect(mardi.getAllByText('17:45')).toHaveLength(2);expect(mardi.getAllByRole('listitem')).toHaveLength(3);expect(supabase.rpc).not.toHaveBeenCalled();
});
it('un planning incomplet ne présente pas une semaine partielle comme complète',()=>{
 const r=render(<SemaineAvantInscription {...props} planning={[{...planning[1]!,creneaux:[planning[1]!.creneaux[0]!]}]}/>);r.container.querySelector('details')!.open=true;expect(screen.getByText(/Termine les jours et les heures/)).toBeVisible();expect(screen.queryByText(/^Mardi ·/)).toBeNull();
});
it('traduit la semaine et précise le fuseau',()=>{
 const r=render(<SemaineAvantInscription {...props} langue="en"/>);r.container.querySelector('details')!.open=true;expect(screen.getByText('Typical week · Africa/Kinshasa')).toBeVisible();expect(screen.getByText('Tuesday · 2 appointments')).toBeVisible();
});
it('le récapitulatif suit immédiatement une modification du formulaire sans inscription',()=>{
 const r=render(<InscriptionHabitudes configuration={{compteId:'RECETTE',programmeId:'RECETTE',version:1,langue:'fr',offreId:'RECETTE',fuseau:'Africa/Kinshasa',planning}}/>);
 for(const d of r.container.querySelectorAll('details'))d.open=true;
 const champ=screen.getByLabelText('Culte en semaine — Mar');fireEvent.change(champ,{target:{value:'19:10'}});const mardi=jour('Mardi');expect(mardi.getByText('19:10')).toBeVisible();expect(mardi.queryByText('17:45')).toBeNull();expect(screen.getByRole('button',{name:'Commencer mes 30 jours gratuits'})).toBeDisabled();expect(supabase.rpc).not.toHaveBeenCalled();
});
