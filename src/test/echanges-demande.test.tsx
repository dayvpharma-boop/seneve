import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { EchangesDemande } from '@/components/EchangesDemande';

afterEach(cleanup);

it('l’équipe voit l’échange dans l’ordre, avec qui a écrit', () => {
  render(<EchangesDemande messages={[
    { auteur: 'equipe', texte: 'Quel téléphone utilises-tu ?', cree_le: '2026-10-12T09:00:00Z' },
    { auteur: 'participant', texte: 'Un Samsung A14.', cree_le: '2026-10-12T10:00:00Z' },
  ]} />);
  expect(screen.getByRole('region', { name: 'Échanges avec le participant' })).toBeInTheDocument();
  const qui = screen.getAllByText(/^Réponse (de l’équipe|du participant)/).map(e => e.textContent?.split(' · ')[0]);
  expect(qui).toEqual(['Réponse de l’équipe', 'Réponse du participant']);
  expect(screen.getByText('Un Samsung A14.')).toBeInTheDocument();
});

it('sans échange, rien n’est affiché', () => {
  const { container } = render(<EchangesDemande messages={[]} />);
  expect(container).toBeEmptyDOMElement();
});
