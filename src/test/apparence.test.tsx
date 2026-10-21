import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {Apparence} from '@/components/Apparence';
import {appliquerApparence,lireApparence,suivreApparence} from '@/lib/apparence';
beforeEach(()=>localStorage.clear());afterEach(()=>{cleanup();delete document.documentElement.dataset.apparence;vi.restoreAllMocks();});
it('le mode sombre explicite prime sur un téléphone clair et se conserve',()=>{render(<Apparence/>);fireEvent.click(screen.getByLabelText('Sombre'));expect(document.documentElement.dataset.apparence).toBe('sombre');expect(lireApparence()).toBe('sombre');expect(document.documentElement.style.colorScheme).toBe('dark');});
it('le mode clair explicite prime sur un téléphone sombre',()=>{vi.spyOn(window,'matchMedia').mockReturnValue({matches:true} as MediaQueryList);appliquerApparence('clair');expect(document.documentElement.dataset.apparence).toBe('clair');});
it('le mode appareil suit ses changements et retire ses écouteurs',()=>{let fn=()=>{};let sombre=false;const retirer=vi.fn();vi.spyOn(window,'matchMedia').mockImplementation(()=>({get matches(){return sombre;},addEventListener:(_e:string,f:()=>void)=>{fn=f;},removeEventListener:retirer}) as unknown as MediaQueryList);const stop=suivreApparence();expect(document.documentElement.dataset.apparence).toBe('clair');sombre=true;fn();expect(document.documentElement.dataset.apparence).toBe('sombre');stop();expect(retirer).toHaveBeenCalled();});
it('un choix inconnu revient au réglage de l’appareil',()=>{localStorage.setItem('seneve:apparence','inconnu');expect(lireApparence()).toBe('systeme');});
