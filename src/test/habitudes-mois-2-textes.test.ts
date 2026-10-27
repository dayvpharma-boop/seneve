import fs from 'node:fs';
import {expect,it} from 'vitest';
import {lecturesHabitudesFrMois2} from '@/data/habitudes-lectures-fr-mois-2';

// Les textes du site doivent rester identiques au document validé par Dr Justin le 27/10/2026.
const document=fs.readFileSync('editorial/habitudes-defis/mois-2-fr-relecture.md','utf8').replace(/\r\n/g,'\n');

it('contient exactement les jours 31 à 60, chacun complet',()=>{
 expect(lecturesHabitudesFrMois2.map(j=>j.jour)).toEqual(Array.from({length:30},(_,i)=>31+i));
 for(const j of lecturesHabitudesFrMois2)for(const champ of [j.titre,j.objectif,j.texte_pedagogique,j.question_reflexion])expect(champ.trim().length).toBeGreaterThan(10);
});
it('reprend mot pour mot le document validé',()=>{
 for(const j of lecturesHabitudesFrMois2){
  expect(document).toContain(`## Jour ${j.jour} — ${j.titre}`);
  expect(document).toContain(`**Objectif :** ${j.objectif}`);
  expect(document).toContain(j.texte_pedagogique);
  expect(document).toContain(`**Pour réfléchir :** ${j.question_reflexion}`);
 }
});
it('n’emploie aucune formule interdite par le cahier (§ 10) ni promesse de richesse',()=>{
 const tout=lecturesHabitudesFrMois2.map(j=>Object.values(j).join(' ')).join(' ').toLowerCase();
 for(const interdit of ['perdu votre foi','perdu ta foi','dieu vous a puni','dieu t’a puni','sainteté est à zéro','payer pour être pardonné','tu deviendras riche','garantie'])expect(tout).not.toContain(interdit);
 // Tutoiement : aucun « vous » adressé au participant en dehors des citations bibliques.
 const horsCitations=tout.replace(/«[^»]*»/g,'');
 expect(horsCitations).not.toMatch(/\bvous\b/);
});
