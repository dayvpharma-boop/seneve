import {afterEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,cleanup,within} from '@testing-library/react';
import {MemoryRouter,Route,Routes} from 'react-router-dom';
import {Bibliotheque} from '@/routes/bibliotheque';
import {LIVRE} from '@/lib/livre';
// 04/11/2026 : PDF et audio réservés aux acheteurs ; ici, un compte sans achat.
vi.mock('@/lib/livre-fichiers',async orig=>({...(await orig<typeof import('@/lib/livre-fichiers')>()),chargerMesLivres:async()=>({pdf_fr:false,pdf_en:false,audio_fr:false,audio_en:false}),lienLivre:vi.fn(),pistesAudio:vi.fn()}));
vi.mock('@/lib/supabase',()=>({supabase:{auth:{getSession:async()=>({data:{session:null}})}}}));
afterEach(cleanup);
function afficher(chemin='/bibliotheque'){return render(<MemoryRouter initialEntries={[chemin]}><Routes><Route path="/bibliotheque" element={<Bibliotheque/>}/><Route path="/livre" element={<Bibliotheque detail/>}/><Route path="/livre/audio" element={<Bibliotheque detail format="audio"/>}/><Route path="/livre/pdf" element={<Bibliotheque detail format="pdf"/>}/></Routes></MemoryRouter>);}
it('le catalogue reste consultable sans compte et ne prétend pas à un achat',()=>{afficher();expect(screen.getByRole('heading',{name:'Ma bibliothèque'})).toBeTruthy();expect(screen.queryByText(/acheté|acquis|accès actif/i)).toBeNull();expect(screen.getByRole('link',{name:'Consulter mes accès'}).getAttribute('href')).toBe('/acces');});
it('les filtres changent réellement les formats présentés et gardent la langue',()=>{afficher('/bibliotheque?lang=en');fireEvent.click(screen.getByRole('button',{name:'Audio'}));expect(screen.getByRole('link',{name:/Audiobook For buyers/}).getAttribute('href')).toBe('/livre/audio?lang=en');expect(screen.queryByRole('link',{name:/Digital book · PDF For buyers/})).toBeNull();fireEvent.click(screen.getByRole('button',{name:'PDF'}));expect(screen.queryByRole('link',{name:/Audiobook For buyers/})).toBeNull();expect(screen.getByRole('button',{name:'PDF'}).getAttribute('aria-pressed')).toBe('true');});
it('le détail présente le sommaire complet, chaque partie ouvrant le livre à sa page',()=>{const{container}=afficher('/livre');expect(within(screen.getByRole('heading',{name:'Sommaire de l’enseignement'}).closest('section')!).getAllByRole('listitem')).toHaveLength(18);for(const c of LIVRE.chapitres)expect(screen.getByRole('heading',{name:new RegExp(`— ${c.titre}$`)})).toBeTruthy();expect(screen.getByRole('link',{name:/Chapitre 2 — La dîme/})).toHaveAttribute('href','/livre/pdf?page=41');expect(screen.getByRole('link',{name:/Annexe 4/})).toHaveAttribute('href','/livre/pdf?page=174');expect(container.querySelector('audio,iframe,object')).toBeNull();expect(screen.getByRole('link',{name:'Écouter le livre'})).toHaveAttribute('href','/livre/audio');expect(screen.getByRole('link',{name:'Lire le livre'})).toHaveAttribute('href','/livre/pdf');expect(screen.queryByText(/vos achats|acquis|abonnement confirmé/i)).toBeNull();});
it('sans achat, le PDF ne propose ni lien public intégral ni téléchargement',async()=>{const{container}=afficher('/livre/pdf');expect(await screen.findByRole('heading',{name:'Réservé aux acheteurs'})).toBeTruthy();expect(container.querySelector('[download],iframe,object')).toBeNull();expect(container.querySelector('a[href$=".pdf"]')).toBeNull();expect(screen.getByRole('link',{name:'Une question sur ce format ? →'}).getAttribute('href')).toBe('/aide?motif=livre-pdf');});
it('sans achat, le livre audio ne propose aucun lecteur',async()=>{const{container}=afficher('/livre/audio');expect(await screen.findByRole('heading',{name:'Réservé aux acheteurs'})).toBeTruthy();expect(screen.queryByRole('button',{name:/pause|lecture|écouter/i})).toBeNull();expect(container.querySelector('audio')).toBeNull();expect(screen.queryByRole('textbox')).toBeNull();});
it('le lien du catalogue ouvre le détail approuvé',()=>{afficher();fireEvent.click(screen.getByRole('link',{name:/Découvrir le livre/}));expect(screen.getByRole('heading',{name:'Sommaire de l’enseignement'})).toBeTruthy();expect(screen.getByRole('link',{name:'Revenir à la bibliothèque'})).toBeTruthy();});
it('les anglophones voient l’édition anglaise et ses vrais chapitres',()=>{afficher('/livre?lang=en');expect(screen.getByRole('heading',{level:1,name:'Stop Begging for Miracles'})).toBeTruthy();const sommaire=within(screen.getByRole('heading',{name:'Contents'}).closest('section')!);expect(sommaire.getAllByRole('listitem')).toHaveLength(18);expect(sommaire.getByText('Chapter 1 — Seek First the Kingdom of God')).toBeTruthy();expect(sommaire.getByText('Chapter 7 — Led by the Spirit, Not by Urgency')).toBeTruthy();expect(sommaire.getByRole('link',{name:/Chapter 2 — Tithes/})).toHaveAttribute('href','/livre/pdf?page=38&lang=en');expect(screen.getByText('“God does not examine your dreams. He examines your habits.”')).toBeTruthy();expect(screen.queryByText(LIVRE.titre)).toBeNull();});

it('sans réseau, le catalogue et les filtres restent consultables sans activer de lecteur',()=>{
 Object.defineProperty(navigator,'onLine',{configurable:true,value:false});
 try{const {container}=afficher('/bibliotheque?lang=en');expect(screen.getByRole('status')).toHaveTextContent('Offline library');fireEvent.click(screen.getByRole('button',{name:'PDF'}));expect(screen.getByRole('link',{name:/Digital book · PDF For buyers/})).toHaveAttribute('href','/livre/pdf?lang=en');expect(container.querySelector('audio,iframe')).toBeNull();expect(screen.queryByText(/purchased|active access/i)).toBeNull();}finally{Object.defineProperty(navigator,'onLine',{configurable:true,value:true});}
});

it('la page audio anglaise conserve l’aide et les sept chapitres sans annoncer un droit de lecture',async()=>{
 const {container}=afficher('/livre/audio?lang=en');
 expect(document.title).toBe('Audiobook · Stop Begging for Miracles — SÉNEVÉ');
 expect(screen.getByRole('link',{name:'Back to library'})).toHaveAttribute('href','/bibliotheque?lang=en');
 expect(screen.getByRole('link',{name:'A question about this format? →'})).toHaveAttribute('href','/aide?motif=livre-audio&lang=en');
 expect(await screen.findByRole('heading',{name:'For buyers only'})).toBeTruthy();
 expect(screen.getAllByRole('heading',{level:3})).toHaveLength(18);
 expect(container.querySelector('audio,[download]')).toBeNull();
 expect(screen.queryByText(/access confirmed|activity completed/i)).toBeNull();
});

it('le PDF anglais réservé aux acheteurs invite à l’achat sans exposer de fichier',async()=>{
 const {container}=afficher('/livre/pdf?lang=en');
 expect(document.title).toBe('Digital book · PDF · Stop Begging for Miracles — SÉNEVÉ');
 expect(await screen.findByRole('heading',{name:'For buyers only'})).toBeTruthy();
 expect(screen.getByRole('link',{name:/View the offers/})).toHaveAttribute('href','/offres?lang=en');
 expect(screen.getByRole('link',{name:'A question about this format? →'})).toHaveAttribute('href','/aide?motif=livre-pdf&lang=en');
 expect(container.querySelector('iframe,object,embed,[download],a[href$=".pdf"]')).toBeNull();
 expect(screen.queryByRole('button',{name:/open pdf|resume reading/i})).toBeNull();
});

it('la couverture peinte du livre suit la langue, en petit dans le catalogue comme dans la fiche',()=>{
 afficher();expect(screen.getByRole('img',{name:'Couverture du livre Arrête de mendier des miracles, par Dr Justin Tshims'})).toHaveAttribute('src',expect.stringContaining('illustrations/couverture-livre-fr-v1-683.webp'));cleanup();
 afficher('/livre?lang=en');expect(screen.getByRole('img',{name:/^Cover of Stop Begging for Miracles/})).toHaveAttribute('srcset',expect.stringContaining('couverture-livre-en-v1-200.webp 200w'));
});
it('Habitudes & Défis apparaît dans la bibliothèque comme le livre, dans la langue choisie',()=>{
 afficher();expect(screen.getByRole('heading',{name:'De la graine à l’arbre'})).toBeTruthy();expect(screen.getByRole('img',{name:/^Couverture De la graine à l’arbre/})).toHaveAttribute('src',expect.stringContaining('illustrations/couverture-habitudes-fr-v1-683.webp'));expect(screen.getByRole('link',{name:/Découvrir le parcours/})).toHaveAttribute('href','/habitudes');
 fireEvent.click(screen.getByRole('button',{name:'Audio'}));expect(screen.queryByRole('heading',{name:'De la graine à l’arbre'})).toBeNull();cleanup();
 afficher('/bibliotheque?lang=en');expect(screen.getByRole('heading',{name:'From seed to tree'})).toBeTruthy();expect(screen.getByRole('link',{name:/Discover the journey/})).toHaveAttribute('href','/habitudes?lang=en');
});
