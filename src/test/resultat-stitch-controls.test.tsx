import {useState} from 'react';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {ShareCard} from '@/components/ShareCard';
import {InviteCard} from '@/components/InviteCard';
import {LectureResultat,lireTailleResultat} from '@/components/LectureResultat';
import {texts} from '@/lib/test-texts';
import {drawCard,renderCard} from '@/lib/carte-partage';
vi.mock('@/lib/carte-partage',async(importOriginal)=>({
  ...await importOriginal<typeof import('@/lib/carte-partage')>(),
  renderCard:vi.fn(()=>Promise.resolve(new Blob(['image'],{type:'image/png'}))),
}));
beforeEach(()=>{
  vi.mocked(renderCard).mockReset().mockResolvedValue(new Blob(['image'],{type:'image/png'}));
  URL.createObjectURL=vi.fn(()=>'blob:resultat'); URL.revokeObjectURL=vi.fn();
  localStorage.clear();
});
afterEach(()=>{cleanup();vi.restoreAllMocks();localStorage.clear();});
const content=()=>vi.mocked(renderCard).mock.calls.at(-1)?.[1];

describe('Commandes de la maquette reliées au résultat',()=>{
  it.each(['fr','en'] as const)('choisit parmi sept racines, avec la bonne citation, sans changer le départ (%s)',async language=>{
    render(<ShareCard editorial stitch language={language} totals={[12,10,11,9,12,13,6]} startRoot={6}/>);
    const select=screen.getByLabelText(language==='fr'?'Racine mise en lumière':'Root in the image');
    expect(screen.getAllByRole('option')).toHaveLength(7);
    fireEvent.change(select,{target:{value:'0'}});
    await waitFor(()=>expect(content()?.focus?.name).toBe(texts[language].roots[0]!.n));
    expect(content()?.focus?.quote).toBe(texts[language].quote(texts[language].roots[0]!.o!));
    expect(content()?.start?.name).toBe(texts[language].roots[6]!.n);
    fireEvent.click(screen.getByRole('button',{name:language==='fr'?'Carré':'Square'}));
    await waitFor(()=>expect(vi.mocked(renderCard).mock.calls.at(-1)?.[0]).toBe('carre'));
  });
  it('suit une nouvelle racine de départ après un autre choix dans le test',async()=>{
    const totals=[12,10,11,6,12,13,6];
    const {rerender}=render(<ShareCard editorial stitch language="fr" totals={totals} startRoot={6}/>);
    fireEvent.change(screen.getByLabelText('Racine mise en lumière'),{target:{value:'1'}});
    rerender(<ShareCard editorial stitch language="fr" totals={totals} startRoot={3}/>);
    await waitFor(()=>expect(content()?.focus?.name).toBe(texts.fr.roots[3]!.n));
    expect(content()?.start?.name).toBe(texts.fr.roots[3]!.n);
  });
  it.each([[9,9,9,9,9,9,9],[12,13,14,12,15,13,12]])('ne fabrique pas de racine forte quand elle ne doit pas être distinguée (%j)',async(...totals)=>{
    render(<ShareCard editorial stitch language="fr" totals={totals} startRoot={4}/>);
    await waitFor(()=>expect(renderCard).toHaveBeenCalled());
    expect(content()?.strength).toBeUndefined();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });
  it('annonce une image indisponible si le dessin échoue, sans bouton de téléchargement trompeur',async()=>{
    vi.mocked(renderCard).mockRejectedValue(new Error('canvas indisponible'));
    render(<ShareCard editorial stitch language="fr" totals={[12,10,11,9,12,13,6]} startRoot={6}/>);
    expect(await screen.findByText(texts.fr.share.unavailable)).toBeVisible();
    expect(screen.queryByRole('button',{name:'Télécharger l’image'})).not.toBeInTheDocument();
  });
  it.each(['vertical','carre'] as const)('dessine le nom et la citation choisis, sans score (%s)',format=>{
    const written:string[]=[];
    const ctx=new Proxy({measureText:(s:string)=>({width:s.length*18}),fillText:(s:string)=>written.push(s)},{get:(obj,key)=>key in obj?obj[key as keyof typeof obj]:(()=>{})}) as unknown as CanvasRenderingContext2D;
    drawCard(ctx,format,{design:'editorial',brand:'SÉNEVÉ',title:'Le Test des 7 Racines',book:'D’après « Arrête de mendier des miracles »',question:'Et toi ?',address:'exemple.org/seneve/p',focus:{label:'Une racine à méditer',name:texts.fr.roots[0]!.n,quote:texts.fr.quote(texts.fr.roots[0]!.o!),source:'Livre, ouverture du chapitre 1'}});
    expect(written.join(' ')).toContain(texts.fr.roots[0]!.n);
    expect(written.join(' ')).toContain(texts.fr.roots[0]!.o);
    expect(written.join(' ')).not.toMatch(/\d+\s*\/\s*15/);
  });
  it('conserve la taille de lecture choisie et la retrouve après réouverture',async()=>{
    function Reglage(){const[value,setValue]=useState(lireTailleResultat);return <LectureResultat langue="fr" valeur={value} onChange={setValue}/>;}
    const {container,unmount}=render(<Reglage/>);
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    const details=container.querySelector('details')!;details.open=true;fireEvent(details,new Event('toggle'));
    fireEvent.click(await screen.findByRole('radio',{name:'Très grande'}));
    expect(lireTailleResultat()).toBe('tres-grand');
    unmount();const again=render(<Reglage/>);const reopened=again.container.querySelector('details')!;reopened.open=true;fireEvent(reopened,new Event('toggle'));
    expect(await screen.findByRole('radio',{name:'Très grande'})).toBeChecked();
  });
  it('signale un refus de copie du lien au lieu de confirmer une copie inexistante',async()=>{
    Object.defineProperty(navigator,'clipboard',{value:{writeText:vi.fn().mockRejectedValue(new Error('refus'))},configurable:true});
    render(<InviteCard langue="fr" resultat/>);
    fireEvent.click(screen.getByRole('button',{name:'Copier le lien'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('Le lien n’a pas pu être copié');
    expect(screen.queryByRole('button',{name:'Lien copié'})).not.toBeInTheDocument();
  });
});
