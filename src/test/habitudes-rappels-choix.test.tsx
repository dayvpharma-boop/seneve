import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
// Serveur simulé : mêmes règles que seneve_private.hd_rappels_* (toutes cochées par défaut, accord push requis).
const HABITUDES=[['priere_matin','Prière du matin'],['priere_midi','Prière de midi'],['culte_semaine','Culte en semaine']] as const;
const mock=vi.hoisted(()=>({appels:[] as Record<string,unknown>[],inscrit:true,push:true,actif:false,coupees:[] as string[],refus:false,panneLecture:0}));
const etat=()=>mock.inscrit?{inscrit:true,push_pret:mock.push,actif:mock.actif,habitudes:HABITUDES.map(([k,l])=>({habit_key:k,libelle:l,recu:!mock.coupees.includes(k)}))}:{inscrit:false};
vi.mock('@/lib/supabase',()=>({supabase:{rpc:async(nom:string,args:Record<string,unknown>)=>{
 if(nom!=='hd_rappels_regler'&&mock.panneLecture>0){mock.panneLecture--;throw new TypeError('Failed to fetch');}
 if(nom==='hd_rappels_regler'){mock.appels.push(args);if(mock.refus)return {data:null,error:{code:'22023'}};mock.actif=args.p_actif as boolean;mock.coupees=args.p_habitudes_coupees as string[];}
 return {data:etat(),error:null};
}}}));
import {RappelsHabitudes} from '@/components/RappelsHabitudes';
beforeEach(()=>{Object.assign(mock,{appels:[],inscrit:true,push:true,actif:false,coupees:[],refus:false,panneLecture:0});});
afterEach(cleanup);
const ouvrir=(langue='fr')=>render(<MemoryRouter><RappelsHabitudes langue={langue}/></MemoryRouter>);

it('sans notifications sur le téléphone : renvoie vers leur activation, sans interrupteur',async()=>{
 mock.push=false;ouvrir();
 expect(await screen.findByRole('link',{name:'Activer les notifications'})).toHaveAttribute('href','/profil#notifications');
 expect(screen.queryByRole('switch')).toBeNull();
});
it('à l’activation, toutes les habitudes sont rappelées par défaut',async()=>{
 ouvrir();fireEvent.click(await screen.findByRole('switch',{name:'Recevoir les rappels de mes habitudes'}));
 await screen.findByText('Rappels d’habitudes activés.');
 expect(mock.appels).toEqual([{p_actif:true,p_habitudes_coupees:[]}]);
 for(const [,libelle] of HABITUDES)expect(screen.getByRole('checkbox',{name:libelle})).toBeChecked();
});
it('décocher une habitude la retire, la recocher la rétablit',async()=>{
 mock.actif=true;ouvrir();
 fireEvent.click(await screen.findByRole('checkbox',{name:'Prière de midi'}));
 await screen.findByText('Plus de rappel : Prière de midi.');
 expect(mock.appels.at(-1)).toEqual({p_actif:true,p_habitudes_coupees:['priere_midi']});
 expect(screen.getByRole('checkbox',{name:'Prière de midi'})).not.toBeChecked();
 fireEvent.click(screen.getByRole('checkbox',{name:'Prière de midi'}));
 await screen.findByText('Rappel rétabli : Prière de midi.');
 expect(mock.appels.at(-1)).toEqual({p_actif:true,p_habitudes_coupees:[]});
});
it('arrêter garde les choix pour une prochaine activation',async()=>{
 mock.actif=true;mock.coupees=['culte_semaine'];ouvrir();
 fireEvent.click(await screen.findByRole('switch'));
 await screen.findByText('Rappels d’habitudes arrêtés.');
 expect(mock.appels.at(-1)).toEqual({p_actif:false,p_habitudes_coupees:['culte_semaine']});
 expect(screen.queryByRole('checkbox',{name:'Prière de midi'})).toBeNull();
});
it('un refus du serveur est annoncé sans changer l’affichage',async()=>{
 mock.actif=true;mock.refus=true;ouvrir();
 fireEvent.click(await screen.findByRole('checkbox',{name:'Prière du matin'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('n’a pas pu être enregistré');
 expect(screen.getByRole('checkbox',{name:'Prière du matin'})).toBeChecked();
});
it('n’affiche rien sans inscription Habitudes & Défis',async()=>{
 mock.inscrit=false;const r=ouvrir();
 await waitFor(()=>expect(r.container.querySelector('.hd-rappels')).toBeNull());
});
it('existe en anglais',async()=>{
 ouvrir('en');expect(await screen.findByRole('switch',{name:'Get reminders for my habits'})).not.toBeChecked();
 expect(screen.getByRole('heading',{name:'My habit reminders'})).toBeVisible();
});

it('un échec de lecture (sans réseau) le dit et permet de réessayer, sans parler d’enregistrement',async()=>{
 mock.panneLecture=1;
 render(<MemoryRouter><RappelsHabitudes langue="fr"/></MemoryRouter>);
 expect(await screen.findByText('Tes rappels d’habitudes ne peuvent pas être affichés. Vérifie ta connexion, puis réessaie.')).toBeInTheDocument();
 expect(screen.queryByText('Le réglage n’a pas pu être enregistré. Réessaie dans un instant.')).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Réessayer'}));
 await waitFor(()=>expect(screen.queryByText('Tes rappels d’habitudes ne peuvent pas être affichés. Vérifie ta connexion, puis réessaie.')).not.toBeInTheDocument());
 expect(mock.appels).toHaveLength(0);
});
