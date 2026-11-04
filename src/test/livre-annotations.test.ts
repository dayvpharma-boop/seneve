import {beforeEach,expect,it} from 'vitest';
import {basculerSignet,cleCarnet,dansZone,ecrireCarnet,garderAnnotation,lireCarnet,zonesDepuisRectangles,type AnnotationLivre} from '@/lib/livre-annotations';
beforeEach(()=>localStorage.clear());
const cadre={left:100,top:200,width:400,height:600};
// Demande de Dr Justin (04/11/2026) : surligner, souligner, noter et marquer une page du livre, comme dans la Bible.
it('regroupe les rectangles d’une sélection par ligne, relatifs à la page',()=>{
 const z=zonesDepuisRectangles([{left:140,top:260,width:40,height:12},{left:182,top:261,width:60,height:12},{left:120,top:280,width:100,height:12},{left:0,top:0,width:0,height:0}],cadre);
 expect(z).toEqual([[0.1,0.1,0.255,0.02],[0.05,0.1333,0.25,0.02]]);
 expect(dansZone(0.2,0.11,z[0]!)).toBe(true);expect(dansZone(0.6,0.11,z[0]!)).toBe(false);
});
it('garde une annotation utile, l’efface quand il ne reste ni couleur, ni soulignement, ni note',()=>{
 const a:AnnotationLivre={id:'a',page:12,zones:[[0.1,0.1,0.3,0.02]],extrait:'Cherchez premièrement le Royaume',couleur:'or',modifie:''};
 let c=garderAnnotation({annotations:[],signets:[]},a);expect(c.annotations).toHaveLength(1);expect(c.annotations[0]!.modifie).not.toBe('');
 c=garderAnnotation(c,{...a,couleur:undefined,note:'  à relire  '});expect(c.annotations[0]!.note).toBe('à relire');
 c=garderAnnotation(c,{...a,couleur:undefined,note:'   '});expect(c.annotations).toHaveLength(0);
});
it('les marque-pages se posent, se retirent et restent sur le téléphone, par compte et par langue',()=>{
 let c=basculerSignet(basculerSignet({annotations:[],signets:[]},41),12);expect(c.signets).toEqual([12,41]);
 c=basculerSignet(c,41);expect(c.signets).toEqual([12]);
 ecrireCarnet(cleCarnet('u1','fr'),c);
 expect(lireCarnet(cleCarnet('u1','fr')).signets).toEqual([12]);
 expect(lireCarnet(cleCarnet('u1','en')).signets).toEqual([]);
 localStorage.setItem(cleCarnet('u2','fr'),'{abîmé');expect(lireCarnet(cleCarnet('u2','fr'))).toEqual({annotations:[],signets:[]});
});
