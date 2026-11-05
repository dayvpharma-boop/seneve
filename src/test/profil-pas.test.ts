import {describe,expect,it} from 'vitest';
import {dureeReelle,etapesJardin,pratiqueGlobale,joursCeMois,lundi,pasCetteSemaine,type Pas} from '@/lib/profil-pas';
import {compterGraine,lireGraines} from '@/lib/invitation';

// Profil « Mes pas » validé le 31/10/2026 : uniquement ce qui a été déclaré, rien ne recule.
const pas=(etat:string,realisee_le:string|null):Pas=>({enrollment_id:'E1',etat,realisee_le});
const maintenant=new Date('2026-10-31T10:00:00Z'); // samedi 31 octobre, Kinshasa

describe('Mes pas', () => {
  it('la semaine commence le lundi', () => { expect(lundi('2026-10-31')).toBe('2026-10-26'); expect(lundi('2026-10-26')).toBe('2026-10-26'); });
  it('compte les actions réalisées ou en partie de la semaine, jamais celles non commencées', () => {
    const l=[pas('realisee','2026-10-26T06:00:00Z'),pas('partielle','2026-10-30T18:00:00Z'),pas('non_commencee',null),pas('realisee','2026-10-25T20:00:00Z'),pas('preparee','2026-10-29T08:00:00Z')];
    expect(pasCetteSemaine(l,maintenant)).toBe(2);
  });
  it('compte les jours distincts du mois en heure de Kinshasa', () => {
    const l=[pas('realisee','2026-10-02T06:00:00Z'),pas('realisee','2026-10-02T19:00:00Z'),pas('realisee','2026-09-30T23:30:00Z'),pas('realisee','2026-10-10T07:00:00Z')];
    // 30/09 23:30 UTC = 1er octobre 00:30 à Kinshasa.
    expect(joursCeMois(l,maintenant)).toBe(3);
  });
});

describe('Mon jardin', () => {
  const parcours=[{id:'E1',debut:'2026-10-20',duree:7,termineLe:null}];
  it('sans pas : seule la graine est semée', () => {
    expect(etapesJardin(parcours,[],maintenant).map(e=>e.atteinte)).toEqual([true,false,false,false]);
  });
  const sept=Array.from({length:7},(_,i)=>pas('realisee',`2026-10-${String(20+i).padStart(2,'0')}T08:00:00Z`));
  const termine=[{id:'E1',debut:'2026-10-20',duree:7,termineLe:'2026-10-26'}];
  it('parcours pratiqué chaque jour et terminé : tout le jardin pousse', () => {
    const e=etapesJardin(termine,sept,maintenant);
    expect(e.map(x=>x.atteinte)).toEqual([true,true,true,true]);
    expect(e.map(x=>x.le)).toEqual(['2026-10-20','2026-10-20','2026-10-26','2026-10-26']);
    expect(pratiqueGlobale(termine,sept,maintenant)).toEqual({pratiques:7,ouverts:7,pourcentage:100});
  });
  it('parcours terminé mais peu pratiqué : pas d’arbre', () => {
    const e=etapesJardin(termine,sept.slice(0,2),maintenant);
    expect(e.map(x=>x.atteinte)).toEqual([true,true,false,false]);
    expect(pratiqueGlobale(termine,sept.slice(0,2),maintenant).pourcentage).toBe(29);
  });
  it('tous les parcours comptent ensemble : un parcours non pratiqué fait baisser le pourcentage', () => {
    const deux=[...termine,{id:'E2',debut:'2026-10-01',duree:14,termineLe:'2026-10-14'}];
    // 7 jours pratiqués sur 21 ouverts = 33 % : ni tige ni arbre.
    expect(pratiqueGlobale(deux,sept,maintenant)).toEqual({pratiques:7,ouverts:21,pourcentage:33});
    expect(etapesJardin(deux,sept,maintenant).map(x=>x.atteinte)).toEqual([true,true,false,false]);
  });
  it('une étape atteinte ne recule pas quand un nouveau parcours commence', () => {
    const avecNouveau=[...termine,{id:'E3',debut:'2026-10-27',duree:30,termineLe:null}];
    expect(etapesJardin(avecNouveau,sept,maintenant).map(x=>x.atteinte)).toEqual([true,true,true,true]);
    expect(pratiqueGlobale(avecNouveau,sept,maintenant).pourcentage).toBe(58);
  });
  it('un pas hors des dates du parcours ne compte pas', () => {
    expect(pratiqueGlobale(termine,[pas('realisee','2026-10-29T08:00:00Z')],maintenant)).toEqual({pratiques:0,ouverts:7,pourcentage:0});
  });
  it('Habitudes & Défis prolongé mois par mois garde sa vraie date de fin', () => {
    expect(dureeReelle({debut:'2026-10-26',duree:30,fin:'2026-12-25'})).toBe(61);
    expect(dureeReelle({debut:'2026-10-13',duree:30,fin:'2026-11-11'})).toBe(30);
    expect(dureeReelle({debut:'2026-10-13',duree:14,fin:null})).toBe(14);
    expect(dureeReelle({debut:'2026-10-13',duree:14,fin:'pas une date'})).toBe(14);
  });
  it('six jours pratiqués ne suffisent pas pour la tige, même à 100 %', () => {
    expect(etapesJardin(parcours,sept.slice(0,6),maintenant)[2]?.atteinte).toBe(false);
  });
});

describe('Graines partagées', () => {
  it('compteur local, qui ne fait que monter', () => { localStorage.clear(); expect(lireGraines()).toBe(0); compterGraine(); compterGraine(); expect(lireGraines()).toBe(2); });
});
