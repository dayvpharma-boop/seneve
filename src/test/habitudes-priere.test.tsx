import {cleReperePriere,lireReperePriere} from '@/lib/habitudes-priere-reprise';
import {act,cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {LecteurPriereHabitudes} from '@/components/LecteurPriereHabitudes';
const uid='10000000-0000-4000-8000-000000000001',eid='20000000-0000-4000-8000-000000000001',aid='30000000-0000-4000-8000-000000000001';
const occurrence={occurrence_id:aid,enrollment_id:eid,version:1,date_locale:'2026-10-27',requise:true};
const activite={habit_key:'priere_matin',occurrence,consigne:'Prière du matin',critere:null,heure:'06:00'};
const ok=(args:Record<string,string>)=>({data:{event_id:args.p_client_event_id,etat:args.p_etat,aide_demandee:false,repetition:false},error:null});
const rpc=vi.fn(),onConfirme=vi.fn(),onFermer=vi.fn();
function ouvrir(a=activite){render(<LecteurPriereHabitudes activite={a} userId={uid} langue="fr" transport={{rpc}} onConfirme={onConfirme} onFermer={onFermer}/>);return screen.getByRole('dialog');}
beforeEach(()=>{sessionStorage.clear();rpc.mockReset().mockImplementation((_nom,args)=>Promise.resolve(ok(args)));onConfirme.mockReset();onFermer.mockReset();});
afterEach(()=>{cleanup();vi.restoreAllMocks();});
it('ouvre le texte intégral sans déclarer une prière, avec la taille réglable et le journal privé',()=>{
 const d=ouvrir();expect(within(d).getByText('Fin de la Amidah')).toBeVisible();expect(within(d).getByText(/À Pourim, continuez ici/)).toBeVisible();
 const texte=within(d).getByRole('article',{name:'Texte intégral de l’Amidah'});
 expect(texte).toHaveStyle({fontSize:'21px'});fireEvent.click(within(d).getByRole('button',{name:'Augmenter la taille du texte'}));expect(texte).toHaveStyle({fontSize:'23px'});
 expect(within(d).getByRole('link',{name:'Avec mes mots'})).toHaveAttribute('href',expect.stringContaining('journal?ecrire=1&lang=fr'));
 expect(rpc).not.toHaveBeenCalled();fireEvent.click(within(d).getByRole('button',{name:'Revenir à ma journée'}));expect(onFermer).toHaveBeenCalledOnce();expect(onConfirme).not.toHaveBeenCalled();
});
it('un double appui attend une confirmation et vise uniquement la prière ouverte',async()=>{
 let finir!:(r:ReturnType<typeof ok>)=>void;rpc.mockImplementationOnce(()=>new Promise(r=>{finir=r;}));const d=ouvrir({...activite,habit_key:'priere_midi',consigne:'Prière de midi',heure:'13:10',occurrence:{...occurrence,occurrence_id:'30000000-0000-4000-8000-000000000002'}});
 const b=within(d).getByRole('button',{name:'J’ai prié'});fireEvent.click(b);fireEvent.click(b);expect(rpc).toHaveBeenCalledOnce();expect(b).toBeDisabled();expect(onConfirme).not.toHaveBeenCalled();expect(within(d).queryByText('Prière déclarée · Synchronisée')).toBeNull();
 expect(rpc.mock.calls[0]![1]).toMatchObject({p_activity_id:'30000000-0000-4000-8000-000000000002',p_enrollment_id:eid});
 await act(async()=>finir(ok(rpc.mock.calls[0]![1])));expect(await within(d).findByText('Prière déclarée · Synchronisée')).toBeVisible();expect(within(d).getByRole('button',{name:'Prière déclarée'})).toBeDisabled();expect(onConfirme.mock.calls[0]![0].occurrence_id).not.toBe(aid);
});
it('après une coupure réseau la nouvelle tentative garde le même événement',async()=>{
 rpc.mockRejectedValueOnce(Error('network'));const d=ouvrir();fireEvent.click(within(d).getByRole('button',{name:'J’ai prié'}));await within(d).findByRole('alert');expect(onConfirme).not.toHaveBeenCalled();const id=rpc.mock.calls[0]![1].p_client_event_id;
 fireEvent.click(within(d).getByRole('button',{name:'Réessayer la déclaration'}));await within(d).findByText('Prière déclarée · Synchronisée');expect(rpc.mock.calls[1]![1].p_client_event_id).toBe(id);expect(onConfirme).toHaveBeenCalledOnce();
});
it('un refus du serveur ne devient jamais une prière déclarée',async()=>{
 rpc.mockResolvedValue({data:null,error:{code:'42501',message:'Access denied'}});const d=ouvrir();fireEvent.click(within(d).getByRole('button',{name:'J’ai prié'}));await within(d).findByRole('alert');expect(within(d).queryByText('Prière déclarée · Synchronisée')).toBeNull();expect(onConfirme).not.toHaveBeenCalled();
});

it('retrouve un repère à la réouverture, rejoint le bon passage et ne déclare rien',()=>{
 let d=ouvrir();const article=within(d).getByRole('article',{name:'Texte intégral de l’Amidah'});
 const passages=Array.from(article.querySelectorAll('p'));
 passages.forEach((p,i)=>vi.spyOn(p,'getBoundingClientRect').mockReturnValue({top:i<5?-40:20+i*30,bottom:i<5?-10:100+i*30,height:30} as DOMRect));
 fireEvent.click(within(d).getByRole('button',{name:'Placer un repère ici'}));expect(lireReperePriere(cleReperePriere(uid,occurrence),61)).toBe(5);expect(within(d).getByRole('button',{name:'Reprendre'})).toBeEnabled();expect(rpc).not.toHaveBeenCalled();
 cleanup();d=ouvrir();const texte=within(d).getByRole('article',{name:'Texte intégral de l’Amidah'}),scroll=vi.fn();
 Object.defineProperty(texte.parentElement!,'scrollTo',{value:scroll,configurable:true});
 fireEvent.click(within(d).getByRole('button',{name:'Reprendre'}));expect(scroll).toHaveBeenCalled();expect(document.activeElement).toBe(texte.querySelector('[data-amidah-paragraphe="5"]'));expect(rpc).not.toHaveBeenCalled();expect(onConfirme).not.toHaveBeenCalled();
 fireEvent.click(within(d).getByRole('button',{name:'Effacer le repère'}));expect(within(d).getByRole('button',{name:'Reprendre'})).toBeDisabled();expect(lireReperePriere(cleReperePriere(uid,occurrence),61)).toBeNull();
});
it('un échec de stockage n’annonce pas un repère conservé',()=>{
 const d=ouvrir();vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw Error('quota');});
 fireEvent.click(within(d).getByRole('button',{name:'Placer un repère ici'}));expect(within(d).getByText('Le repère n’a pas pu être conservé. Réessaie.')).toBeVisible();expect(within(d).getByRole('button',{name:'Reprendre'})).toBeDisabled();expect(rpc).not.toHaveBeenCalled();
});
it('en anglais, ouvre l’Amidah anglaise validée et permet de passer au français sans perdre le repère',()=>{
 render(<LecteurPriereHabitudes activite={{...activite,consigne:'Morning prayer'}} userId={uid} langue="en" transport={{rpc}} onConfirme={onConfirme} onFermer={onFermer}/>);
 const d=screen.getByRole('dialog');
 const texte=within(d).getByRole('article',{name:'Full text of the Amidah'});
 expect(texte).toHaveAttribute('lang','en');expect(within(d).getByText('End of the Amidah')).toBeVisible();expect(within(d).getByText(/On Purim, continue here/)).toBeVisible();
 expect(within(d).getByRole('button',{name:'English'})).toHaveAttribute('aria-pressed','true');
 fireEvent.click(within(d).getByRole('button',{name:'Français'}));
 expect(within(d).getByText('Fin de la Amidah')).toBeVisible();expect(texte).toHaveAttribute('lang','fr');
 expect(texte.querySelectorAll('[data-amidah-paragraphe]')).toHaveLength(61);expect(rpc).not.toHaveBeenCalled();
});
