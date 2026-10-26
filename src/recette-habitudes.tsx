import {createRoot} from 'react-dom/client';
import {BrowserRouter,Link,Navigate,Route,Routes,useSearchParams} from 'react-router-dom';
import {Connexion} from '@/routes/connexion';
import {HabitudesInscription} from '@/routes/habitudes-inscription';
import {Confidentialite} from '@/routes/confidentialite';
import {AccesRecetteHabitudes} from '@/components/AccesRecetteHabitudes';
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
  <Route path="*" element={<main className="wrap"><h1>{en?'Outside this test':'Hors du périmètre de cet essai'}</h1><p>{en?'Only sign-in, enrollment and access are available in this test version.':'Seuls la connexion, l’inscription et les accès sont disponibles dans cette version de test.'}</p><Link to={lien}>{en?'Back to enrollment':'Revenir à l’inscription'}</Link></main>}/>
 </Routes></div>;
}

const testValide=import.meta.env.VITE_SUPABASE_URL==='https://rlojnuaajeubzlwofwhn.supabase.co'&&import.meta.env.VITE_HABITUDES_DEFIS==='true';
if(!testValide)throw new Error('Recette HD : configuration TEST obligatoire');
createRoot(document.getElementById('root')!).render(<BrowserRouter basename={import.meta.env.BASE_URL}><RecetteHabitudes/></BrowserRouter>);
