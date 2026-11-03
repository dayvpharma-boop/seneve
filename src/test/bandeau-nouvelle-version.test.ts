import {afterEach,expect,it,vi} from 'vitest';
import {afficherNouvelleVersion} from '@/lib/hors-ligne';
afterEach(()=>{document.getElementById('seneve-nouvelle-version')?.remove();vi.useRealTimers();});

it('propose d’actualiser, puis « Plus tard » ferme le bandeau sans le faire revenir',()=>{
 vi.useFakeTimers();
 afficherNouvelleVersion();
 const bandeau=document.getElementById('seneve-nouvelle-version')!;
 expect(bandeau.textContent).toContain('Nouvelle version prête.');
 expect([...bandeau.querySelectorAll('button')].map(b=>b.textContent)).toContain('Actualiser');
 (bandeau.querySelector('[aria-label="Plus tard"]') as HTMLButtonElement).click();
 expect(bandeau.classList.contains('seneve-maj-sort')).toBe(true);
 vi.advanceTimersByTime(300);
 expect(document.getElementById('seneve-nouvelle-version')).toBeNull();
 afficherNouvelleVersion();
 expect(document.getElementById('seneve-nouvelle-version')).toBeNull();
});
