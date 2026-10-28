import fs from 'node:fs';
import {expect,it} from 'vitest';
import {lecturesHabitudesFrMois6} from '@/data/habitudes-lectures-fr-mois-6';

// Les textes du site doivent rester identiques au document validé par Dr Justin le 28/10/2026.
const document=fs.readFileSync('editorial/habitudes-defis/mois-6-fr-relecture.md','utf8').replace(/\r\n/g,'\n');

it('contient exactement les jours 151 à 180, chacun complet',()=>{
 expect(lecturesHabitudesFrMois6.map(j=>j.jour)).toEqual(Array.from({length:30},(_,i)=>151+i));
 // Titres courts admis (« Dans un an ») ; les autres champs restent de vraies phrases.
 for(const j of lecturesHabitudesFrMois6){expect(j.titre.trim().length).toBeGreaterThan(5);for(const champ of [j.objectif,j.texte_pedagogique,j.question_reflexion])expect(champ.trim().length).toBeGreaterThan(10);}
});
it('reprend mot pour mot le document validé',()=>{
 for(const j of lecturesHabitudesFrMois6){
  expect(document).toContain(`## Jour ${j.jour} — ${j.titre}`);
  expect(document).toContain(`**Objectif :** ${j.objectif}`);
  expect(document).toContain(j.texte_pedagogique);
  expect(document).toContain(`**Pour réfléchir :** ${j.question_reflexion}`);
 }
});
it('n’emploie aucune formule interdite par le cahier (§ 10) ni promesse de richesse',()=>{
 const tout=lecturesHabitudesFrMois6.map(j=>Object.values(j).join(' ')).join(' ').toLowerCase();
 for(const interdit of ['perdu votre foi','perdu ta foi','dieu vous a puni','dieu t’a puni','sainteté est à zéro','payer pour être pardonné','tu deviendras riche','garantie'])expect(tout).not.toContain(interdit);
 // Tutoiement : aucun « vous » adressé au participant en dehors des citations bibliques.
 const horsCitations=tout.replace(/«[^»]*»/g,'');
 expect(horsCitations).not.toMatch(/\bvous\b/);
});
