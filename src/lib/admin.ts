/** Interface administrateur : règles d'affichage partagées (page /admin). */

export type StaffRequest = {
  request_id: string; cree_le: string; modifie_le: string; etat: string; motif: string;
  extraits_partages: string | null; reponse: string | null; affecte_a: string | null; affecte_email: string | null;
  prenom: string | null; langue: string; programme_id: string | null; email: string | null; whatsapp: string | null;
  /** Échange daté : réponses enregistrées de l'équipe et réponses du participant (migration 042). */
  messages?: EchangeAide[] | null;
};
export type EchangeAide = { auteur: 'participant' | 'equipe'; texte: string; cree_le: string };
export type TeamMember = { auth_user_id: string; email: string; prenom: string | null; roles: string[] };

export const REPONSE_MAX = 4000;

/** États que l'équipe peut choisir ; « annulée » ne relève que du participant. */
export const ETATS_EQUIPE = [
  { value: 'recue', label: 'Reçue' },
  { value: 'affectee', label: 'Confiée' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'attente_participant', label: 'En attente du participant' },
  { value: 'resolue', label: 'Résolue' },
] as const;

export const ETAT_LIBELLE: Record<string, string> = {
  recue: 'Reçue', affectee: 'Confiée', en_cours: 'En cours',
  attente_participant: 'En attente du participant', resolue: 'Résolue', annulee: 'Annulée par le participant',
};

export type Filtre = 'a_traiter' | 'resolues' | 'annulees';

export function filtrer(list: StaffRequest[], filtre: Filtre): StaffRequest[] {
  return list.filter(r => filtre === 'resolues' ? r.etat === 'resolue'
    : filtre === 'annulees' ? r.etat === 'annulee'
    : r.etat !== 'resolue' && r.etat !== 'annulee');
}

/** Lien WhatsApp pour recontacter la personne (numéro vérifié uniquement). */
export function lienWhatsApp(numero: string): string {
  return `https://wa.me/${numero.replace(/\D/g, '')}`;
}

/** Message d'erreur lisible à partir de la réponse de la base. */
export function erreurAdmin(message: string | undefined): string {
  const m = message ?? '';
  for (const connu of [
    'Cette demande a été modifiée entre-temps. Recharge la page.',
    'Cette demande a été annulée par le participant.',
    'Aucun compte SÉNEVÉ avec cet e-mail. La personne doit d\'abord créer son compte.',
    'Il doit rester au moins un administrateur.',
    'Cette personne a encore des demandes en cours : confie-les d\'abord à quelqu\'un d\'autre.',
    'Cette personne ne fait pas partie de l\'équipe.',
    'La réponse dépasse 4000 caractères.',
  ]) if (m.includes(connu)) return connu;
  return 'L’opération n’a pas abouti. Vérifie ta connexion et réessaie.';
}
