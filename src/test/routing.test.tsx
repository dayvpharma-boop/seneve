import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { TestPage } from '@/routes/index';

function at(url: string) {
  render(<MemoryRouter initialEntries={[url]}><Routes><Route path="/" element={<TestPage />} /></Routes></MemoryRouter>);
}
describe('Adresse du test', () => {
  afterEach(cleanup);
  it('affiche le test en français par défaut', () => {
    at('/');
    expect(screen.getByRole('button', { name: 'Commencer' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'English' })).toHaveAttribute('href', '/?lang=en');
    expect(document.documentElement.lang).toBe('fr');
  });
  it('affiche le test en anglais avec ?lang=en', () => {
    at('/?lang=en');
    expect(screen.getByRole('button', { name: 'Start' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Français' })).toHaveAttribute('href', '/?lang=fr');
    expect(document.documentElement.lang).toBe('en');
    expect(document.title).toBe('The 7 Roots Test — SÉNEVÉ');
  });
  it('/en ouvre le test en anglais (adresse partagée avec son aperçu anglais)', () => {
    render(<MemoryRouter initialEntries={['/en?src=invitation']}><Routes><Route path="/en" element={<TestPage defaultLanguage="en" />} /></Routes></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'Start' })).toBeVisible();
    expect(document.documentElement.lang).toBe('en');
  });
});
