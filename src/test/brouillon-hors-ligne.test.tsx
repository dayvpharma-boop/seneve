import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { BrouillonHorsLigne } from '@/components/BrouillonHorsLigne';
import { draft } from '@/lib/journal';

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });
const ouvrir = () => render(<MemoryRouter><BrouillonHorsLigne activite="Q3" lien="/journal?activite=Q3" question="Ma réflexion ?" langue="fr" /></MemoryRouter>);
it('conserve la réflexion dans le même brouillon que le Journal et la retrouve à la réouverture', () => {
 const vue = ouvrir();
 fireEvent.change(screen.getByLabelText('Ma réflexion ?'), { target: { value: 'Un geste discret aujourd’hui.' } });
 fireEvent.click(screen.getByRole('button', { name: 'Conserver le brouillon' }));
 expect(draft.read('journal:Q3')).toBe('Un geste discret aujourd’hui.');
 expect(screen.getByRole('status')).toHaveTextContent('Pas encore enregistré dans ton journal');
 vue.unmount(); ouvrir();
 expect(screen.getByLabelText('Ma réflexion ?')).toHaveValue('Un geste discret aujourd’hui.');
});
it('signale le refus du stockage sans afficher une fausse sauvegarde et laisse le texte disponible', () => {
 vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Stockage refusé'); });
 ouvrir();
 fireEvent.change(screen.getByLabelText('Ma réflexion ?'), { target: { value: 'Texte à préserver.' } });
 fireEvent.click(screen.getByRole('button', { name: 'Conserver le brouillon' }));
 expect(screen.getByRole('status')).toHaveTextContent('Brouillon non conservé');
 expect(screen.getByLabelText('Ma réflexion ?')).toHaveValue('Texte à préserver.');
 expect(screen.queryByText('Un brouillon est disponible sur cet appareil.')).not.toBeInTheDocument();
});
