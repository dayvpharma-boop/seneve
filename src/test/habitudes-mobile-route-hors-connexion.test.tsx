import {cleanup,render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const m=vi.hoisted(()=>({natif:true,online:false,active:true}));
vi.mock('@/components/AccesRecetteHabitudes',()=>({AccesRecetteHabitudes:()=> <p>ACTIVITES_EN_LIGNE</p>}));
vi.mock('@/components/CadreHabitudes',()=>({CadreHabitudes:({children}:{children:import('react').ReactNode})=> <main>{children}</main>}));
vi.mock('@/lib/habitudes-configuration',()=>({habitudesActivees:()=>m.active}));
vi.mock('@/lib/rappels-locaux',()=>({rappelsLocauxDisponibles:()=>m.natif}));
vi.mock('@/lib/hors-ligne',()=>({useEnLigne:()=>m.online}));
vi.mock('@/routes/introuvable',()=>({NotFound:()=> <p>INTROUVABLE</p>}));
import {HabitudesAujourdhui} from '@/routes/habitudes-aujourdhui';
beforeEach(()=>{m.natif=true;m.online=false;m.active=true;});afterEach(cleanup);
it('conserve un écran HD identifiable hors ligne sans monter les activités protégées',()=>{render(<MemoryRouter><HabitudesAujourdhui/></MemoryRouter>);expect(screen.getByRole('heading',{name:'Habitudes & Défis'})).toBeVisible();expect(screen.queryByText('ACTIVITES_EN_LIGNE')).toBeNull();expect(screen.getByText(/au retour de la connexion/)).toBeVisible();});
it('remonte les activités à la reconnexion',()=>{const v=render(<MemoryRouter><HabitudesAujourdhui/></MemoryRouter>);m.online=true;v.rerender(<MemoryRouter><HabitudesAujourdhui/></MemoryRouter>);expect(screen.getByText('ACTIVITES_EN_LIGNE')).toBeVisible();});
it('ne change pas le comportement du site ni le garde de construction',()=>{m.natif=false;const v=render(<MemoryRouter><HabitudesAujourdhui/></MemoryRouter>);expect(screen.getByText('ACTIVITES_EN_LIGNE')).toBeVisible();m.active=false;v.rerender(<MemoryRouter><HabitudesAujourdhui/></MemoryRouter>);expect(screen.getByText('INTROUVABLE')).toBeVisible();});

