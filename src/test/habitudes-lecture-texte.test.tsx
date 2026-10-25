import {cleanup,render,screen} from '@testing-library/react';
import {afterEach,expect,it} from 'vitest';
import {LectureTexteHabitude} from '@/components/LectureTexteHabitude';
afterEach(cleanup);
it('conserve le texte intégral, y compris les indications et sa fin',()=>{
 const texte='Début fictif.\n\nIndication fournie par la source.\nFin fictive.';
 render(<LectureTexteHabitude titre="Lecture fictive" texte={texte} langue="fr"/>);
 expect(document.querySelector('article')!.textContent).toBe(texte);expect(screen.getByText('Ouvrir la lecture')).toBeInTheDocument();expect(document.querySelectorAll('button')).toHaveLength(0);
});
it('échappe les balises sans exécuter le texte publié',()=>{
 const texte='<script>interdit()</script><img src=x onerror=interdit()>';
 render(<LectureTexteHabitude titre="Fixture" texte={texte} langue="fr"/>);expect(document.querySelector('article')!.textContent).toBe(texte);expect(document.querySelector('article script,article img')).toBeNull();
});
it('ne présente pas un texte vide comme une lecture disponible',()=>{
 render(<LectureTexteHabitude titre="Fixture" texte="   " langue="fr"/>);expect(document.querySelector('details')).toBeNull();
});
it('traduit seulement la commande d’ouverture',()=>{
 render(<LectureTexteHabitude titre="Titre officiel" texte="Texte officiel inchangé." langue="en"/>);expect(screen.getByText('Open the reading')).toBeInTheDocument();expect(document.querySelector('article')!.textContent).toBe('Texte officiel inchangé.');
});
