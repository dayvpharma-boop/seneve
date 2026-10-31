import {describe,expect,it} from 'vitest';
import {etapesJardin,joursCeMois,lundi,pasCetteSemaine,type Pas} from '@/lib/profil-pas';
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
  it('la tige demande sept jours différents ; l’arbre un parcours mené à son dernier jour', () => {
    const sept=Array.from({length:7},(_,i)=>pas('realisee',`2026-10-${String(20+i).padStart(2,'0')}T08:00:00Z`));
    const e=etapesJardin([...parcours,{id:'E2',debut:'2026-10-01',duree:14,termineLe:'2026-10-14'}],sept,maintenant);
    expect(e.map(x=>x.atteinte)).toEqual([true,true,true,true]);
    expect(e[2]?.le).toBe('2026-10-26');
    expect(e[3]?.le).toBe('2026-10-14');
  });
  it('six jours ne suffisent pas pour la tige', () => {
    const six=Array.from({length:6},(_,i)=>pas('realisee',`2026-10-${String(20+i).padStart(2,'0')}T08:00:00Z`));
    expect(etapesJardin(parcours,six,maintenant)[2]?.atteinte).toBe(false);
  });
});

describe('Graines partagées', () => {
  it('compteur local, qui ne fait que monter', () => { localStorage.clear(); expect(lireGraines()).toBe(0); compterGraine(); compterGraine(); expect(lireGraines()).toBe(2); });
});
