import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import {Apparence} from '@/components/Apparence';
import {appliquerApparence,lireApparence,suivreApparence} from '@/lib/apparence';
beforeEach(()=>localStorage.clear());afterEach(()=>{cleanup();delete document.documentElement.dataset.apparence;vi.restoreAllMocks();});
it('le mode sombre explicite prime sur un téléphone clair et se conserve',()=>{render(<Apparence/>);fireEvent.click(screen.getByLabelText('Sombre'));expect(document.documentElement.dataset.apparence).toBe('sombre');expect(lireApparence()).toBe('sombre');expect(document.documentElement.style.colorScheme).toBe('dark');});
it('le mode clair explicite prime sur un téléphone sombre',()=>{vi.spyOn(window,'matchMedia').mockReturnValue({matches:true} as MediaQueryList);appliquerApparence('clair');expect(document.documentElement.dataset.apparence).toBe('clair');});
it('le mode appareil suit ses changements et retire ses écouteurs',()=>{let fn=()=>{};let sombre=false;const retirer=vi.fn();vi.spyOn(window,'matchMedia').mockImplementation(()=>({get matches(){return sombre;},addEventListener:(_e:string,f:()=>void)=>{fn=f;},removeEventListener:retirer}) as unknown as MediaQueryList);const stop=suivreApparence();expect(document.documentElement.dataset.apparence).toBe('clair');sombre=true;fn();expect(document.documentElement.dataset.apparence).toBe('sombre');stop();expect(retirer).toHaveBeenCalled();});
it('la barre du haut d’Android suit l’apparence, y compris un changement du téléphone (03/11/2026)',()=>{const meta=document.createElement('meta');meta.name='theme-color';meta.content='#F5F7FE';document.head.append(meta);let fn=()=>{};let sombre=true;vi.spyOn(window,'matchMedia').mockImplementation(()=>({get matches(){return sombre;},addEventListener:(_e:string,f:()=>void)=>{fn=f;},removeEventListener:()=>{}}) as unknown as MediaQueryList);const stop=suivreApparence();expect(meta.content).toBe('#121212');sombre=false;fn();expect(meta.content).toBe('#F5F7FE');appliquerApparence('sombre');expect(meta.content).toBe('#121212');stop();meta.remove();});
it('un choix inconnu revient au réglage de l’appareil',()=>{localStorage.setItem('seneve:apparence','inconnu');expect(lireApparence()).toBe('systeme');});
it('le menu se referme après chaque sélection et peut être rouvert',async()=>{
  const {container}=render(<Apparence compact/>);
  const menu=container.querySelector('details')!;
  const bouton=menu.querySelector('summary')!;
  expect(screen.queryAllByRole('radio')).toHaveLength(0);
  for(const [nom,valeur] of [['Sombre','sombre'],['Clair','clair'],['Clair','clair']] as const){
    fireEvent.click(bouton);
    await waitFor(()=>expect(screen.getAllByRole('radio')).toHaveLength(3));
    fireEvent.click(screen.getByLabelText(nom));
    expect(lireApparence()).toBe(valeur);
    expect(document.documentElement.dataset.apparence).toBe(valeur);
    expect(menu.open).toBe(false);
    expect(document.activeElement).toBe(bouton);
    await waitFor(()=>expect(screen.queryAllByRole('radio')).toHaveLength(0));
  }
});
