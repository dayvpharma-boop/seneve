import {AccesRecetteHabitudes} from '@/components/AccesRecetteHabitudes';
import {habitudesActivees} from '@/lib/habitudes-configuration';
import {NotFound} from '@/routes/introuvable';
import '../styles-recette-habitudes.css';

/** Écran « Aujourd’hui » d’Habitudes & Défis sur le site réel (maquettes Stitch), pour le programme publié.
 * Les droits restent vérifiés par le serveur ; sans option de construction, la page n’existe pas. */
export function HabitudesAujourdhui(){
 return habitudesActivees()?<AccesRecetteHabitudes reel/>:<NotFound/>;
}
