import {AccesRecetteHabitudes} from '@/components/AccesRecetteHabitudes';
import {useSearchParams} from 'react-router-dom';
import {CadreHabitudes} from '@/components/CadreHabitudes';
import {useEnLigne} from '@/lib/hors-ligne';
import {rappelsLocauxDisponibles} from '@/lib/rappels-locaux';
import {habitudesActivees} from '@/lib/habitudes-configuration';
import {NotFound} from '@/routes/introuvable';
import '../styles-recette-habitudes.css';

/** Écran « Aujourd’hui » d’Habitudes & Défis sur le site réel (maquettes Stitch), pour le programme publié.
 * Les droits restent vérifiés par le serveur ; sans option de construction, la page n’existe pas. */
export function HabitudesAujourdhui(){
 const enLigne=useEnLigne(),[q]=useSearchParams(),en=q.get('lang')==='en';
 if(habitudesActivees()&&rappelsLocauxDisponibles()&&!enLigne)return <CadreHabitudes titre={en?'Today':'Aujourd’hui'} langue={en?'en':'fr'} actif="aujourdhui"><section className="px-hd-margin py-hd-space-lg"><h1 className="font-hd-headline-sm text-hd-headline-sm">Habitudes &amp; Défis</h1><p className="mt-3 text-hd-body-md">{en?'Your activities will load when the connection returns. You can check reminders stored on this phone in the offline panel above.':'Tes activités se chargeront au retour de la connexion. Tu peux vérifier les rappels enregistrés sur ce téléphone dans le panneau hors connexion ci-dessus.'}</p></section></CadreHabitudes>;
 return habitudesActivees()?<AccesRecetteHabitudes reel/>:<NotFound/>;
}
