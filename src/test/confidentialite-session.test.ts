import {beforeEach, expect, it} from 'vitest';
import {creerNettoyageSession} from '@/lib/confidentialite-session';
import {draft, effacerBrouillons} from '@/lib/journal';
import {effacerEspaces} from '@/lib/hors-ligne';

beforeEach(() => localStorage.clear());
const session = (id: string) => ({user: {id}});
it('la déconnexion efface tous les brouillons et les anciennes clés sans toucher aux préférences ni à Auth', () => {
  draft.write('journal:libre', 'Privé A', 'A');
  draft.write('aide', 'Privé B', 'B');
  for (const k of ['seneve:journal:libre', 'seneve:aide', 'seneve:aide:sujet']) localStorage.setItem(k, 'Ancien');
  localStorage.setItem('seneve:apparence', 'sombre');
  localStorage.setItem('sb-test-auth-token', 'session');
  effacerEspaces();
  expect(draft.read('journal:libre', 'A')).toBe('');
  expect(draft.read('aide', 'B')).toBe('');
  expect(Object.keys(localStorage).sort()).toEqual(['sb-test-auth-token', 'seneve:apparence']);
});
it('la reprise et le renouvellement de la même session préservent son brouillon hors connexion', () => {
  const nettoyer = creerNettoyageSession();
  draft.write('journal:libre', 'En cours', 'A');
  draft.write('aide', 'Ancien compte', 'B');
  nettoyer('INITIAL_SESSION', session('A'));
  nettoyer('TOKEN_REFRESHED', session('A'));
  expect(draft.read('journal:libre', 'A')).toBe('En cours');
  expect(draft.read('aide', 'B')).toBe('');
});
it('un changement de compte ou une déconnexion dans un autre onglet efface les textes locaux', () => {
  const nettoyer = creerNettoyageSession();
  nettoyer('SIGNED_IN', session('A'));
  draft.write('journal:libre', 'Privé A', 'A');
  nettoyer('SIGNED_IN', session('B'));
  expect(draft.read('journal:libre', 'A')).toBe('');
  draft.write('journal:libre', 'Privé B', 'B');
  nettoyer('SIGNED_OUT', null);
  expect(draft.read('journal:libre', 'B')).toBe('');
});
it('ne conserve aucun brouillon si la session initiale est absente', () => {
  draft.write('journal:libre', 'Ancien', 'A');
  creerNettoyageSession()('INITIAL_SESSION', null);
  expect(localStorage.length).toBe(0);
});
it('le préfixe du compte conservé est délimité et encodé', () => {
  draft.write('journal:libre', 'A', 'A');
  draft.write('journal:libre', 'AB', 'AB');
  effacerBrouillons('A');
  expect(draft.read('journal:libre', 'AB')).toBe('');
  expect(draft.read('journal:libre', 'A')).toBe('A');
});
