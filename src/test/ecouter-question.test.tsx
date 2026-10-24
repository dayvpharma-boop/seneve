import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabase: { rpc } }));
import { Index } from '@/routes/index';
import { audioQuestionUrl } from '@/components/EcouterQuestion';

type FauxAudio = { src: string; play: ReturnType<typeof vi.fn>; pause: ReturnType<typeof vi.fn>; currentTime: number; ecouteurs: Record<string, () => void> };
let audios: FauxAudio[] = [];

beforeEach(() => {
  rpc.mockReset();
  audios = [];
  vi.stubGlobal('Audio', vi.fn(function (this: FauxAudio, src: string) {
    const a: FauxAudio = { src, currentTime: 0, ecouteurs: {}, play: vi.fn(() => Promise.resolve()), pause: vi.fn() };
    Object.assign(a, { addEventListener: (nom: string, f: () => void) => { a.ecouteurs[nom] = f; } });
    audios.push(a);
    return a;
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });

it('adresse des audios : stockage public, numérotée de 01 à 21', () => {
  expect(audioQuestionUrl('test/fr/v5', 0)).toBe('https://lclquncbhrmpwxgsthhk.supabase.co/storage/v1/object/public/medias-publics/test/fr/v5/question-01.mp3');
  expect(audioQuestionUrl('test/fr/v5', 20)).toMatch(/question-21\.mp3$/);
});

it('FR : le son ne part que sur appui, s’arrête au second appui et change avec la question', () => {
  vi.useFakeTimers();
  render(<Index />);
  fireEvent.click(screen.getByRole('button', { name: 'Commencer' }));
  const bouton = screen.getByRole('button', { name: 'Écouter la question' });
  expect(audios).toHaveLength(0);
  fireEvent.click(bouton);
  expect(audios[0]?.src).toMatch(/question-01\.mp3$/);
  expect(audios[0]?.play).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Arrêter l’écoute' })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Arrêter l’écoute' }));
  expect(audios[0]?.pause).toHaveBeenCalled();
  // Répondre passe à la question 2 : l'audio en cours est coupé, le suivant pointe vers la question 2.
  fireEvent.click(screen.getByRole('button', { name: 'Écouter la question' }));
  fireEvent.click(screen.getByRole('button', { name: /^3 sur 5/ }));
  act(() => { vi.advanceTimersByTime(400); });
  expect(audios[0]?.pause.mock.calls.length).toBeGreaterThanOrEqual(2);
  fireEvent.click(screen.getByRole('button', { name: 'Écouter la question' }));
  expect(audios[1]?.src).toMatch(/question-02\.mp3$/);
});

it('FR : message clair si l’audio ne peut pas être lu', async () => {
  render(<Index />);
  fireEvent.click(screen.getByRole('button', { name: 'Commencer' }));
  fireEvent.click(screen.getByRole('button', { name: 'Écouter la question' }));
  act(() => { audios[0]?.ecouteurs.error?.(); });
  expect(await screen.findByRole('status')).toHaveTextContent('Audio indisponible pour le moment. Tu peux lire la question.');
});

it('EN : bouton anglais, audios du dossier anglais V3', () => {
  render(<Index language="en" />);
  fireEvent.click(screen.getByRole('button', { name: 'Start' }));
  fireEvent.click(screen.getByRole('button', { name: 'Listen to the question' }));
  expect(audios[0]?.src).toMatch(/medias-publics\/test\/en\/v3\/question-01\.mp3$/);
  expect(screen.getByRole('button', { name: 'Stop listening' })).toHaveAttribute('aria-pressed', 'true');
  act(() => { audios[0]?.ecouteurs.error?.(); });
  expect(screen.getByRole('status')).toHaveTextContent('Audio unavailable for now. You can read the question.');
});
