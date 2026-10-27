import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
// Serveur simulé : mêmes règles que seneve_private.hd_changer_fuseau (tout passe au fuseau choisi, heures inchangées).
const mock=vi.hoisted(()=>({fuseau:'Africa/Kinshasa',telephone:'America/New_York',appels:[] as unknown[],refus:false,inscrit:true}));
const etat=()=>mock.inscrit?{inscrit:true,push_pret:true,actif:true,habitudes:[],fuseau:mock.fuseau}:{inscrit:false};
vi.mock('@/lib/supabase',()=>({supabase:{rpc:async(nom:string,args:Record<string,unknown>)=>{
 if(nom==='hd_changer_fuseau'){mock.appels.push(args);if(mock.refus)return {data:null,error:{code:'22023'}};mock.fuseau=args.p_fuseau as string;}
 return {data:etat(),error:null};
}}}));
vi.mock('@/lib/rappels',async(orig)=>({...(await orig<typeof import('@/lib/rappels')>()),fuseauTelephone:()=>mock.telephone}));
import {FuseauVoyage,memeHeure,nomVille} from '@/components/FuseauVoyage';
beforeEach(()=>{Object.assign(mock,{fuseau:'Africa/Kinshasa',telephone:'America/New_York',appels:[],refus:false,inscrit:true});localStorage.clear();});
afterEach(cleanup);

it('nomme la ville de chaque fuseau',()=>{
 expect(nomVille('America/New_York')).toBe('New York');expect(nomVille('Africa/Kinshasa')).toBe('Kinshasa');expect(nomVille('Europe/Paris')).toBe('Paris');
});
it('en voyage, propose de garder les horaires à l’heure d’ici, sans rien changer avant la réponse',async()=>{
 render(<FuseauVoyage langue="fr"/>);
 expect(await screen.findByRole('heading',{name:'Tu as changé de fuseau horaire'})).toBeVisible();
 expect(screen.getByText(/Ton téléphone est à l’heure de New York/)).toHaveTextContent('Tes horaires d’habitudes suivent encore l’heure de Kinshasa');
 expect(mock.appels).toEqual([]);
});
it('« oui » passe tout à l’heure d’ici et le confirme',async()=>{
 render(<FuseauVoyage langue="fr"/>);
 fireEvent.click(await screen.findByRole('button',{name:'Oui, à l’heure d’ici'}));
 expect(await screen.findByRole('status')).toHaveTextContent('Tes habitudes suivent maintenant l’heure de New York, aux mêmes heures qu’avant.');
 expect(mock.appels).toEqual([{p_fuseau:'America/New_York'}]);
});
it('« non » garde l’heure d’avant et ne repose pas la question sur ce téléphone',async()=>{
 const r=render(<FuseauVoyage langue="fr"/>);
 fireEvent.click(await screen.findByRole('button',{name:'Non, garder l’heure de Kinshasa'}));
 expect(r.container.querySelector('.hd-fuseau')).toBeNull();expect(mock.appels).toEqual([]);
 cleanup();const r2=render(<FuseauVoyage langue="fr"/>);
 await new Promise(t=>setTimeout(t,20));expect(r2.container.querySelector('.hd-fuseau')).toBeNull();
});
it('Lagos et Kinshasa ont la même heure toute l’année ; pas Paris, à cause de l’heure d’été',()=>{
 const octobre=Date.parse('2026-10-27T12:00:00Z');
 expect(memeHeure('Africa/Lagos','Africa/Kinshasa',octobre)).toBe(true);
 expect(memeHeure('Europe/Paris','Africa/Kinshasa',octobre)).toBe(false);
 expect(memeHeure('America/New_York','Africa/Kinshasa',octobre)).toBe(false);
});
it('aucune question quand le téléphone donne un autre nom pour la même heure',async()=>{
 mock.telephone='Africa/Lagos';const r=render(<FuseauVoyage langue="fr"/>);
 await new Promise(t=>setTimeout(t,20));expect(r.container.querySelector('.hd-fuseau')).toBeNull();
});
it('rien quand le téléphone est déjà à l’heure des horaires, ou sans inscription',async()=>{
 mock.telephone='Africa/Kinshasa';const r=render(<FuseauVoyage langue="fr"/>);
 await new Promise(t=>setTimeout(t,20));expect(r.container.querySelector('.hd-fuseau')).toBeNull();
 cleanup();mock.telephone='Europe/Paris';mock.inscrit=false;const r2=render(<FuseauVoyage langue="fr"/>);
 await new Promise(t=>setTimeout(t,20));expect(r2.container.querySelector('.hd-fuseau')).toBeNull();
});
it('un refus du serveur est annoncé et la question reste posée',async()=>{
 mock.refus=true;render(<FuseauVoyage langue="fr"/>);
 fireEvent.click(await screen.findByRole('button',{name:'Oui, à l’heure d’ici'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('n’a pas pu être enregistré');
 await waitFor(()=>expect(screen.getByRole('button',{name:'Oui, à l’heure d’ici'})).toBeEnabled());
});
it('existe en anglais',async()=>{
 render(<FuseauVoyage langue="en"/>);
 expect(await screen.findByRole('heading',{name:'You are in a different time zone'})).toBeVisible();
 expect(screen.getByRole('button',{name:'No, keep Kinshasa time'})).toBeVisible();
});
