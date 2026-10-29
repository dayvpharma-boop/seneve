import {afterEach,expect,it,vi} from 'vitest';
import {retirerHabitudesDuCache} from '@/lib/habitudes-cache';
import {enregistrerEspace,lireEspace} from '@/lib/hors-ligne';
const key='seneve:espace:v1:U1';
const data=()=>({prenom:'Fixture',habitudes:['HD'],fuseauHabitudes:'UTC',parcours:[{enrollment_id:'HD',programme_id:'P_HD',version:1,langue:'fr'},{enrollment_id:'L',programme_id:'P_L',version:1,langue:'fr'}],contents:[{content_id:'CH',programme_id:'P_HD',version:1,langue:'fr',texte:'TEXTE_HD_PRIVE'},{content_id:'CL',programme_id:'P_L',version:1,langue:'fr',texte:'Texte conservé'},{content_id:'CX',programme_id:'P_L',version:2,langue:'fr',texte:'Autre version'}],activities:[{activity_id:'AH',content_id:'CH'},{activity_id:'AL',content_id:'CL'},{activity_id:'AX',content_id:'CX'}],states:[{enrollment_id:'HD',activity_id:'AH',etat:'realisee'},{enrollment_id:'L',activity_id:'AL',etat:'preparee'},{enrollment_id:'L',activity_id:'AX',etat:'realisee'}]});
afterEach(()=>{localStorage.clear();vi.restoreAllMocks();});
it('retire les contenus, activités et états HD en gardant la ligne du parcours HD (décision du 29/10/2026)',()=>{
 const source=data(),r=retirerHabitudesDuCache(source)!;expect(r.parcours.map(p=>p.enrollment_id)).toEqual(['HD','L']);expect(r.contents.map(c=>c.content_id)).toEqual(['CL']);expect(r.activities.map(a=>a.activity_id)).toEqual(['AL']);expect(r.states).toHaveLength(1);expect(r.habitudes).toEqual(['HD']);expect(source.parcours).toHaveLength(2);
});
it('un espace seulement HD garde la ligne du parcours, sans texte ni état HD',()=>{
 const d=data();d.parcours=d.parcours.slice(0,1);localStorage.setItem(key,'ancienne copie');enregistrerEspace('U1',d);const raw=localStorage.getItem(key)!;expect(raw).not.toContain('TEXTE_HD_PRIVE');expect(raw).not.toContain('AH');expect(lireEspace<ReturnType<typeof data>>('U1')!.donnees.parcours.map(p=>p.enrollment_id)).toEqual(['HD']);
});
it('enregistre la copie des autres parcours sans le texte ni les états HD',()=>{
 enregistrerEspace('U1',data());const raw=localStorage.getItem(key)!;expect(raw).not.toContain('TEXTE_HD_PRIVE');expect(raw).not.toContain('"AH"');expect(lireEspace<ReturnType<typeof data>>('U1')!.donnees.parcours).toHaveLength(2);
});
it('nettoie une ancienne copie connue à la lecture sans modifier son horodatage',()=>{
 localStorage.setItem(key,JSON.stringify({le:'2026-10-01T10:00:00Z',donnees:data()}));const r=lireEspace<ReturnType<typeof data>>('U1')!;expect(r.le).toBe('2026-10-01T10:00:00Z');expect(r.donnees.parcours).toHaveLength(2);expect(r.donnees.contents.map(c=>c.content_id)).toEqual(['CL']);expect(localStorage.getItem(key)).not.toContain('TEXTE_HD_PRIVE');
});
it('une ancienne copie HD seule est réduite à la ligne du parcours, sans texte HD',()=>{
 const d=data();d.parcours=d.parcours.slice(0,1);localStorage.setItem(key,JSON.stringify({le:'date',donnees:d}));const r=lireEspace<ReturnType<typeof data>>('U1')!;expect(r.donnees.parcours.map(p=>p.enrollment_id)).toEqual(['HD']);expect(r.donnees.contents).toEqual([]);expect(localStorage.getItem(key)).not.toContain('TEXTE_HD_PRIVE');
});
it('une copie déjà réduite n’est pas réécrite à la lecture',()=>{
 const r=retirerHabitudesDuCache(data())!;expect(retirerHabitudesDuCache(r)).toBe(r);
});
it('ne modifie pas les copies sans inscription HD identifiée',()=>{
 const d={...data(),habitudes:[]};expect(retirerHabitudesDuCache(d)).toBe(d);
});
it('ne restitue pas une copie HD si la suppression est refusée',()=>{
 localStorage.setItem(key,JSON.stringify({le:'date',donnees:data()}));vi.spyOn(Storage.prototype,'removeItem').mockImplementation(()=>{throw Error('refus');});expect(lireEspace('U1')).toBeNull();
});
it('une copie HD mal formée ne passe pas dans le cache',()=>{
 expect(retirerHabitudesDuCache({habitudes:['HD'],parcours:[]})).toBeNull();
});

it('supprime une ancienne copie lorsque la classification des parcours a échoué',()=>{
 localStorage.setItem(key,'ancienne copie');enregistrerEspace('U1',{...data(),habitudes:[],classificationCacheVerifiee:false});expect(localStorage.getItem(key)).toBeNull();
});
