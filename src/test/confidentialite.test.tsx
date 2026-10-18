import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { Confidentialite, DATE_POLITIQUE } from '@/routes/confidentialite';

afterEach(cleanup);

// Politique de confidentialité validée par Dr Justin Tshims le 18/10/2026.
describe('Politique de confidentialité', () => {
  it('nomme le responsable, le contact, la date et l’âge minimum', () => {
    render(<MemoryRouter><Confidentialite /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1, name: 'Politique de confidentialité' })).toBeInTheDocument();
    expect(screen.getByText(/Cabinet Bethesda du Dr Justin Tshims, à Kinshasa/)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'contact@drjustintshims.com' })[0]).toHaveAttribute('href', 'mailto:contact@drjustintshims.com');
    expect(screen.getByText(`Dernière mise à jour : ${DATE_POLITIQUE}`)).toBeInTheDocument();
    expect(screen.getByText(/au moins 18 ans/)).toBeInTheDocument();
    expect(document.title).toBe('Confidentialité — SÉNEVÉ');
  });
  it('présente le journal comme privé et le coach comme une IA', () => {
    render(<MemoryRouter><Confidentialite /></MemoryRouter>);
    expect(screen.getByText(/Tes notes sont privées/)).toBeInTheDocument();
    expect(screen.getByText(/Le coach est une intelligence artificielle, pas une personne/)).toBeInTheDocument();
    expect(screen.getByText('OpenAI')).toBeInTheDocument();
  });
});
