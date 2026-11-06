import {describe,expect,it} from 'vitest';
import {MOIS_HABITUDES,moisHabitudes} from '@/lib/habitudes-periodes';

// Demande de Dr Justin (06/11/2026) : « Jour 12 · Mois 1 sur 6 » au lieu de « Jour 12 / 61 ».
describe('compteur de mois Habitudes & Défis',()=>{
 it('donne le mois en cours sur les 6 du parcours',()=>{
  expect(MOIS_HABITUDES).toBe(6);
  expect(moisHabitudes(1)).toBe(1);
  expect(moisHabitudes(12)).toBe(1);
  expect(moisHabitudes(30)).toBe(1);
  expect(moisHabitudes(31)).toBe(2);
  expect(moisHabitudes(61)).toBe(3);
  expect(moisHabitudes(180)).toBe(6);
  expect(moisHabitudes(400)).toBe(6);
  expect(moisHabitudes(0)).toBe(1);
 });
});
