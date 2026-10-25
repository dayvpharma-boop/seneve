import {expect,it} from 'vitest';
import {simulerDime} from '@/lib/habitudes-dime';
it('reproduit les trois exemples chiffrés du cahier',()=>{
 expect(simulerDime('commerce','1000','650','150')).toMatchObject({base:'200',dime:'20'});
 expect(simulerDime('salaire','500','','70')).toMatchObject({base:'430',dime:'43'});
 expect(simulerDime('don','100','','')).toMatchObject({base:'100',dime:'10'});
});
it('ne calcule jamais une dîme négative',()=>{
 expect(simulerDime('commerce','100','100','20')).toMatchObject({solde:'-20',base:'0',dime:'0'});
 expect(simulerDime('salaire','0','','0').dime).toBe('0');
});
it('conserve les décimales exactes sans arrondi implicite',()=>{
 expect(simulerDime('don','0,01','','').dime).toBe('0.001');
 expect(simulerDime('commerce','1 000,50','650,25','150,20')).toMatchObject({base:'200.05',dime:'20.005'});
});
it('ne soustrait pas les champs étrangers au type de revenu',()=>{
 expect(simulerDime('don','100','999','999').dime).toBe('10');expect(simulerDime('salaire','500','999','70').dime).toBe('43');
});
it.each(['','-1','NaN','Infinity','1e3','12,3.4','0.0000001'])('refuse un montant invalide %s',valeur=>{
 expect(()=>simulerDime('don',valeur,'','')).toThrow();
});
it('exige les coûts professionnels explicitement saisis pour le commerce',()=>{
 expect(()=>simulerDime('commerce','100','','0')).toThrow();
});
it('ne crée aucune règle pour les cas non tranchés',()=>{
 expect(()=>simulerDime('pret' as never,'100','','')).toThrow();
});
