import {expect,it,vi} from 'vitest';
import {dureeHabitudes,lectureReprise,moisHabitudes} from '@/lib/habitudes-calendrier';
import {lignesPaginees,parPaquets} from '@/lib/lignes-paginees';

it('reprend les 30 lectures chaque mois',()=>{
 expect([1,30,31,60,61,180,181].map(lectureReprise)).toEqual([1,30,1,30,1,30,1]);
 expect([1,30,31,61,151,180].map(moisHabitudes)).toEqual([1,1,2,3,6,6]);
});
it('la durée suit la fin prévue tenue par le serveur, sinon celle du programme',()=>{
 expect(dureeHabitudes('2026-10-26','2026-12-25',30)).toBe(61);
 expect(dureeHabitudes('2026-10-26',null,30)).toBe(30);
 expect(dureeHabitudes('2026-10-26','date',30)).toBe(30);
});
it('lit toutes les pages au-delà de 1 000 lignes',async()=>{
 const lignes=Array.from({length:2896},(_,i)=>i);
 const requete=vi.fn(async(de:number,a:number)=>({data:lignes.slice(de,a+1),error:null}));
 expect(await lignesPaginees<number>(requete)).toHaveLength(2896);expect(requete).toHaveBeenCalledTimes(3);
 await expect(lignesPaginees(async()=>({data:null,error:new Error('x')}))).rejects.toThrow('x');
 const lus=await parPaquets(Array.from({length:250},(_,i)=>String(i)),async p=>[p.length]);expect(lus).toEqual([100,100,50]);
});
