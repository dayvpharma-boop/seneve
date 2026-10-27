import {createRoot} from 'react-dom/client';
import {BrowserRouter,Link,Navigate,Route,Routes,useSearchParams} from 'react-router-dom';
import {Connexion} from '@/routes/connexion';
import {HabitudesInscription} from '@/routes/habitudes-inscription';
import {Confidentialite} from '@/routes/confidentialite';
import {AccesRecetteHabitudes} from '@/components/AccesRecetteHabitudes';
import {RappelsCard} from '@/components/RappelsCard';
import {RappelsHabitudes} from '@/components/RappelsHabitudes';
import '@fontsource/poppins/latin-400.css';
import '@fontsource/poppins/latin-500.css';
import '@fontsource/lora/latin-400.css';
import '@fontsource/outfit/latin-400.css';
import '@fontsource/literata/latin-400.css';
import './styles.css';
import './styles-maquettes.css';
import './styles-auth-maquette.css';
import './styles-offres-acces.css';
import './styles-recette-habitudes.css';
import './styles-habitudes-stitch.css';
import '@fontsource/literata/latin-500.css';
import '@fontsource/literata/latin-600.css';
import '@fontsource/literata/latin-400-italic.css';
import './styles-habitudes-polices.css';
import './styles-journee-nouvelle.css';

/** Entrée séparée, réservée à la recette de connexion et de préinscription TEST. */
export function RecetteHabitudes(){
 const [q]=useSearchParams(),en=q.get('lang')==='en',langue=en?'en':'fr';
 const lien=`/habitudes/inscription?lang=${langue}`;
 return <div className="recette-hd"><aside className="recette-hd-note" role="note"><strong>{en?'SÉNEVÉ — TEST VERSION':'SÉNEVÉ — VERSION DE TEST'}</strong><p>{en?'Connected to seneve-test. Use a dedicated test account. This page checks sign-in, enrollment and access.':'Connectée à seneve-test. Utilise un compte réservé aux essais. Cette page sert à vérifier la connexion, l’inscription et les accès.'}</p><Link to={lien}>{en?'Resume the enrollment test':'Reprendre le test d’inscription'}</Link></aside><Routes>
  <Route path="/" element={<Navigate to={lien} replace/>}/>
  <Route path="/connexion" element={<Connexion/>}/>
  <Route path="/habitudes/inscription" element={<HabitudesInscription/>}/>
  <Route path="/confidentialite" element={<Confidentialite/>}/>
  <Route path="/acces" element={<AccesRecetteHabitudes/>}/>
  {/* Essai réel des rappels d'habitudes : notifications de ce téléphone, puis choix des habitudes. */}
  <Route path="/rappels" element={<main className="rn-page journee-nouvelle"><div className="rn-contenu"><h1>{en?'Habit reminders (test)':'Rappels d’habitudes (essai)'}</h1>
   <p>{en?'1. Turn on reminders on this phone. 2. Turn on habit reminders and choose the habits.':'1. Active les rappels sur ce téléphone. 2. Active les rappels d’habitudes et choisis les habitudes.'}</p>
   {/* Sur iPhone, l'icône de l'écran d'accueil garde sa propre connexion : la page doit y mener. */}
   <p><Link to={`/connexion?lang=${langue}`}>{en?'Sign in to the test account':'Me connecter au compte de test'}</Link></p>
   <section className="rn-section"><RappelsCard langue={langue}/></section><RappelsHabitudes langue={langue}/>
   <p><Link to={`/acces?lang=${langue}`}>{en?'My access and my day':'Mon accès et ma journée'}</Link></p></div></main>}/>
  {/* Après la connexion (qui mène à /espace) : retour à la page de l'essai des rappels. */}
  <Route path="/espace" element={<Navigate to={`/rappels?lang=${langue}`} replace/>}/>
  <Route path="*" element={<main className="wrap"><h1>{en?'Outside this test':'Hors du périmètre de cet essai'}</h1><p>{en?'Only sign-in, enrollment and access are available in this test version.':'Seuls la connexion, l’inscription et les accès sont disponibles dans cette version de test.'}</p><Link to={lien}>{en?'Back to enrollment':'Revenir à l’inscription'}</Link></main>}/>
 </Routes></div>;
}

const testValide=import.meta.env.VITE_SUPABASE_URL==='https://rlojnuaajeubzlwofwhn.supabase.co'&&import.meta.env.VITE_HABITUDES_DEFIS==='true';
if(!testValide)throw new Error('Recette HD : configuration TEST obligatoire');
// Service worker de notifications de cette version de test seulement (portée /recette-hd/, sans cache).
if('serviceWorker' in navigator)void navigator.serviceWorker.register(import.meta.env.BASE_URL+'sw.js',{scope:import.meta.env.BASE_URL}).catch(()=>undefined);
createRoot(document.getElementById('root')!).render(<BrowserRouter basename={import.meta.env.BASE_URL}><RecetteHabitudes/></BrowserRouter>);
