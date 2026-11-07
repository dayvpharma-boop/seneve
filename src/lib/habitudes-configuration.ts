/** Option de construction désactivée par défaut. Ne crée aucun droit serveur. */
export function habitudesActivees():boolean{return import.meta.env.VITE_HABITUDES_DEFIS==='true';}

/** Désactivation possible à la compilation, notamment pour revenir en arrière. */
export function suiviFinancierActive():boolean {
  return habitudesActivees() && import.meta.env.VITE_HABITUDES_FINANCES_SUIVI!=='false';
}
