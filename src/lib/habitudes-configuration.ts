/** Option de construction désactivée par défaut. Ne crée aucun droit serveur. */
export function habitudesActivees():boolean{return import.meta.env.VITE_HABITUDES_DEFIS==='true';}
/** Inscription publique : ouverte avec le module, sauf construction qui la ferme (site réel avant ouverture). */
export function inscriptionHabitudesOuverte():boolean{return habitudesActivees()&&import.meta.env.VITE_HABITUDES_INSCRIPTION!=='fermee';}
