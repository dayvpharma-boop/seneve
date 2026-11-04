import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {MemoryRouter} from 'react-router-dom';
const m=vi.hoisted(()=>({droits:vi.fn(),lien:vi.fn(),pistes:vi.fn(),upload:vi.fn(),remove:vi.fn(),list:vi.fn()}));
vi.mock('@/lib/livre-fichiers',async orig=>({...(await orig<typeof import('@/lib/livre-fichiers')>()),chargerMesLivres:m.droits,lienLivre:m.lien,pistesAudio:m.pistes}));
vi.mock('@/lib/supabase',()=>({supabase:{auth:{getSession:async()=>({data:{session:{user:{id:'u1'}}}})},storage:{from:()=>({upload:m.upload,remove:m.remove,list:m.list})}}}));
vi.mock('@/components/LecteurPdfLivre',()=>({LecteurPdfLivre:({url,pageDemandee}:{url:string;pageDemandee?:number})=><p>lecteur pdf {url} page {pageDemandee??'retenue'}</p>}));
import {LivreFormatAcces} from '@/components/LivreFormatAcces';
import {DepotLivresAdministration} from '@/components/DepotLivresAdministration';
const aucun={pdf_fr:false,pdf_en:false,audio_fr:false,audio_en:false};
beforeEach(()=>{Object.values(m).forEach(f=>f.mockReset());m.lien.mockImplementation(async(c:string)=>'https://coffre/'+c);});
afterEach(cleanup);
const afficher=(format:'pdf'|'audio',langue:'fr'|'en',chemin='/')=>render(<MemoryRouter initialEntries={[chemin]}><LivreFormatAcces format={format} langue={langue}/></MemoryRouter>);

// Décision de Dr Justin du 04/11/2026 : le livre PDF et le livre audio, seulement pour les acheteurs.
it('sans achat : aucun lien demandé, invitation à acheter avec la même adresse e-mail',async()=>{
 m.droits.mockResolvedValue(aucun);afficher('pdf','fr');
 expect(await screen.findByRole('heading',{name:'Réservé aux acheteurs'})).toBeInTheDocument();
 expect(screen.getByRole('link',{name:/Voir les offres/})).toHaveAttribute('href','/offres');
 expect(m.lien).not.toHaveBeenCalled();
});
it('acheteur du PDF français : le livre s’ouvre dans l’application',async()=>{
 m.droits.mockResolvedValue({...aucun,pdf_fr:true});afficher('pdf','fr');
 expect(await screen.findByText('lecteur pdf https://coffre/pdf/fr/livre.pdf page retenue')).toBeInTheDocument();
 expect(m.lien).toHaveBeenCalledWith('pdf/fr/livre.pdf',3600);
});
it('depuis le sommaire, le livre s’ouvre à la page choisie',async()=>{
 m.droits.mockResolvedValue({...aucun,pdf_fr:true});afficher('pdf','fr','/livre/pdf?page=41');
 expect(await screen.findByText('lecteur pdf https://coffre/pdf/fr/livre.pdf page 41')).toBeInTheDocument();
});
it('acheteur de l’édition française qui regarde l’anglaise : lien vers son édition',async()=>{
 m.droits.mockResolvedValue({...aucun,pdf_fr:true});afficher('pdf','en');
 expect(await screen.findByRole('link',{name:/open it/})).toHaveAttribute('href','/livre/pdf');
});
it('acheteur de l’audio : pistes dans l’ordre, la suivante se lance à la fin',async()=>{
 m.droits.mockResolvedValue({...aucun,audio_fr:true});m.pistes.mockResolvedValue(['01.mp3','02.mp3']);
 const r=afficher('audio','fr');
 expect(await screen.findByRole('button',{name:/Partie 2/})).toBeInTheDocument();
 await waitFor(()=>expect(r.container.querySelector('audio')).toHaveAttribute('src','https://coffre/audio/fr/01.mp3'));
 fireEvent.ended(r.container.querySelector('audio')!);
 await waitFor(()=>expect(r.container.querySelector('audio')).toHaveAttribute('src','https://coffre/audio/fr/02.mp3'));
});
it('dépôt administrateur : les MP3 sont rangés dans l’ordre des noms, les pistes en trop retirées',async()=>{
 m.list.mockResolvedValue({data:[],error:null});m.pistes.mockResolvedValue(['01.mp3','02.mp3','03.mp3']);m.upload.mockResolvedValue({error:null});m.remove.mockResolvedValue({error:null});
 vi.spyOn(window,'confirm').mockReturnValue(true);
 render(<DepotLivresAdministration/>);
 const champ=(await screen.findAllByLabelText(/Remplacer toutes les pistes/))[0]!;
 const f=(n:string)=>new File(['x'],n,{type:'audio/mpeg'});
 fireEvent.change(champ,{target:{files:[f('Chapitre 10.mp3'),f('Chapitre 2.mp3')]}});
 await screen.findByText('2 pistes françaises déposées.');
 expect(m.upload.mock.calls.map(c=>[c[0],(c[1] as File).name])).toEqual([['audio/fr/01.mp3','Chapitre 2.mp3'],['audio/fr/02.mp3','Chapitre 10.mp3']]);
 expect(m.remove).toHaveBeenCalledWith(['audio/fr/03.mp3']);
});
