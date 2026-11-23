import {effacerBrouillons} from './journal';
import {effacerEspaces} from './hors-ligne';

/** Un seul observateur global : couvre aussi la déconnexion depuis un autre onglet.
 * Aucun appel Auth ou réseau dans le callback synchrone. */
export function creerNettoyageSession() {
  let precedent: string | null | undefined;
  return (evenement: string, session: {user: {id: string}} | null): void => {
    const compte = session?.user.id ?? null;
    if (evenement === 'SIGNED_OUT' || !compte || (precedent && precedent !== compte)) {
      effacerEspaces();
    } else {
      // Reprise de la même session : préserver sa saisie hors connexion et retirer les anciens comptes.
      effacerBrouillons(compte);
    }
    precedent = compte;
  };
}
