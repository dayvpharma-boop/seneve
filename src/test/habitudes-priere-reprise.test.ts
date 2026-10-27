import {beforeEach,expect,it} from 'vitest';
import {cleReperePriere,lireReperePriere,placerReperePriere,effacerReperesPriere} from '@/lib/habitudes-priere-reprise';
const compte='10000000-0000-4000-8000-000000000001',o={enrollment_id:'20000000-0000-4000-8000-000000000001',occurrence_id:'30000000-0000-4000-8000-000000000001',date_locale:'2026-10-27',version:1,requise:true};
beforeEach(()=>sessionStorage.clear());
it('isole le signet entre comptes, prières et dates sans stocker le texte',()=>{
 const cle=cleReperePriere(compte,o);placerReperePriere(cle,5,61);expect(sessionStorage.getItem(cle)).toBe('5');expect(lireReperePriere(cle,61)).toBe(5);
 for(const autre of [cleReperePriere('10000000-0000-4000-8000-000000000002',o),cleReperePriere(compte,{...o,occurrence_id:'30000000-0000-4000-8000-000000000002'}),cleReperePriere(compte,{...o,date_locale:'2026-10-28'})])expect(lireReperePriere(autre,61)).toBeNull();
});
it('ignore un signet corrompu ou hors du texte et refuse de le remplacer par un index invalide',()=>{
 const cle=cleReperePriere(compte,o);for(const valeur of ['-1','61','1.5','texte','999999999999999999999']){sessionStorage.setItem(cle,valeur);expect(lireReperePriere(cle,61)).toBeNull();}
 placerReperePriere(cle,0,61);expect(()=>placerReperePriere(cle,61,61)).toThrow();expect(lireReperePriere(cle,61)).toBe(0);
});
it('la déconnexion efface les signets sans effacer une déclaration en attente ou une autre donnée',()=>{
 const cle=cleReperePriere(compte,o);placerReperePriere(cle,5,61);sessionStorage.setItem('seneve:habitudes:saisie:v1:test','attente');sessionStorage.setItem('autre','conserver');effacerReperesPriere();expect(lireReperePriere(cle,61)).toBeNull();expect(sessionStorage.getItem('seneve:habitudes:saisie:v1:test')).toBe('attente');expect(sessionStorage.getItem('autre')).toBe('conserver');
});
