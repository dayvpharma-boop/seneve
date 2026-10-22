/** Journal privé et demandes d'aide : règles et textes partagés par les pages /journal et /aide. */

export const NOTE_MAX = 5000;
export const MOTIF_MAX = 2000;

export type EtatAide = 'recue' | 'affectee' | 'en_cours' | 'attente_participant' | 'resolue' | 'annulee';

/** Une demande peut être annulée par le participant tant qu'elle n'est ni résolue ni déjà annulée. */
export function peutAnnuler(etat: string): boolean {
  return etat !== 'resolue' && etat !== 'annulee';
}

/** Texte prêt à enregistrer, ou null s'il est vide ou trop long. */
export function texteValide(texte: string, max: number): string | null {
  const t = texte.trim();
  return t.length >= 1 && t.length <= max ? t : null;
}

/** Brouillons isolés par compte. Les anciennes clés sans propriétaire restent intactes mais ne sont jamais attribuées à un compte. */
export const draft = {
  read(key: string, userId: string): string {
    if (!userId) return '';
    try { return window.localStorage.getItem(`seneve:compte:${encodeURIComponent(userId)}:${key}`) ?? ''; } catch { return ''; }
  },
  write(key: string, value: string, userId: string): void {
    if (!userId) return;
    const cle = `seneve:compte:${encodeURIComponent(userId)}:${key}`;
    try {
      if (value) window.localStorage.setItem(cle, value);
      else window.localStorage.removeItem(cle);
    } catch { /* stockage indisponible : le brouillon n'est simplement pas conservé */ }
  },
};

export const JOURNAL_TEXTES = {
  fr: {
    locale: 'fr-FR',
    retour: 'Retour à mon espace',
    // Journal
    titreJournal: 'Mon journal',
    introJournal: 'Ton journal est privé. Tu choisis les notes autorisées au coach IA et les extraits transmis à l’équipe.',
    nouvelle: 'Nouvelle note',
    reponseA: 'En réponse à :',
    placeholderNote: 'Ce que tu as compris, vécu ou décidé aujourd’hui…',
    iaCase: 'Le coach IA peut lire cette note pour mieux m’accompagner',
    iaAide: 'Désactivé par défaut. Tu peux changer d’avis à tout moment, note par note.',
    enregistrer: 'Enregistrer la note',
    enregistrement: 'Enregistrement…',
    brouillon: 'Brouillon conservé sur cet appareil, pas encore enregistré.',
    enregistree: 'Note enregistrée.',
    erreurNote: 'Non enregistrée. Vérifie ta connexion et réessaie.',
    trop: (n: number) => `${n} caractères au plus.`,
    aucune: 'Aucune note pour le moment.',
    mesNotes: 'Mes notes',
    iaOui: 'Lisible par le coach IA',
    iaNon: 'Privée, même pour le coach IA',
    autoriserIa: 'Autoriser le coach IA',
    retirerIa: 'Retirer l’accès du coach IA',
    modifier: 'Modifier',
    annulerModif: 'Annuler',
    supprimer: 'Supprimer',
    confirmerSuppr: 'Supprimer définitivement cette note ?',
    oui: 'Oui, supprimer',
    non: 'Non',
    modifiee: 'modifiée',
    erreurAction: 'L’opération n’a pas abouti. Réessaie.',
    chargement: 'Chargement…',
    erreurChargement: 'Impossible de charger ton journal pour le moment.',
    reessayer: 'Réessayer',
    // Aide
    titreAide: 'Besoin d’aide ?',
    introAide: 'Explique ce qui te bloque. Une personne de l’équipe d’accompagnement SÉNEVÉ lira ta demande.',
    urgence: 'Si tu es en danger ou en détresse en ce moment, ne reste pas seul : contacte les services d’urgence de ton pays ou une personne de confiance près de toi.',
    motif: 'Ta demande',
    placeholderMotif: 'Par exemple : je n’arrive pas à faire l’action du jour 3…',
    parcours: 'Parcours concerné',
    aucunParcours: 'Aucun en particulier',
    partager: 'Joindre des notes de mon journal (facultatif)',
    partagerAide: 'Seules les notes que tu coches seront copiées dans ta demande et lues par l’équipe.',
    envoyer: 'Envoyer ma demande',
    envoi: 'Envoi…',
    envoyee: 'Demande envoyée. Tu peux suivre son état ci-dessous.',
    erreurEnvoi: 'Demande non envoyée. Vérifie ta connexion et réessaie.',
    tropDemandes: 'Trop de demandes aujourd’hui. Réessaie demain.',
    mesDemandes: 'Mes demandes',
    aucuneDemande: 'Aucune demande pour le moment.',
    reponse: 'Réponse de l’équipe :',
    notesJointes: 'Notes jointes :',
    annulerDemande: 'Annuler cette demande',
    // Confirmation avant l’annulation (maquette corrigée « Aide & Contact — Confirmation d’annulation »).
    confirmerAnnulTitre: 'Annuler cette demande ?',
    confirmerAnnulTexte: 'Si tu annules cette demande, l’équipe d’accompagnement ne la traitera plus. Tu pourras toujours créer une nouvelle demande plus tard si le problème persiste.',
    conserverDemande: 'Conserver ma demande',
    confirmerAnnul: 'Confirmer l’annulation',
    // Réponse du participant dans la même demande (maquette corrigée « Partage de notes & Réponse »).
    repondre: 'Répondre à l’équipe',
    taReponse: 'Ta réponse :',
    champReponse: 'Ta réponse à l’équipe',
    envoyerReponse: 'Envoyer ma réponse',
    annulerReponse: 'Annuler',
    reponseEnvoyee: 'Réponse envoyée. L’équipe va la lire.',
    rouvrir: 'Ta demande sera rouverte et l’équipe la relira.',
    etats: {
      recue: 'Reçue',
      affectee: 'Confiée à un accompagnateur',
      en_cours: 'En cours',
      attente_participant: 'En attente de ta réponse',
      resolue: 'Résolue',
      annulee: 'Annulée',
    } as Record<string, string>,
    // Espace
    carteTitre: 'Journal, coach et aide',
    carteTexte: 'Note ce que tu vis en privé, pose une question au coach ou demande de l’aide à l’équipe.',
    parlerCoach: 'Parler au coach',
    mesProgres: 'Mes progrès',
    ouvrirJournal: 'Ouvrir mon journal',
    demanderAide: 'Demander de l’aide',
    repondreJournal: 'Répondre dans mon journal',
  },
  en: {
    locale: 'en-GB',
    retour: 'Back to my space',
    titreJournal: 'My journal',
    introJournal: 'Your journal is private. You choose which notes the AI coach may use and which excerpts to send to the team.',
    nouvelle: 'New note',
    reponseA: 'Replying to:',
    placeholderNote: 'What you understood, lived or decided today…',
    iaCase: 'The AI coach may read this note to support me better',
    iaAide: 'Off by default. You can change your mind at any time, note by note.',
    enregistrer: 'Save note',
    enregistrement: 'Saving…',
    brouillon: 'Draft kept on this device, not saved yet.',
    enregistree: 'Note saved.',
    erreurNote: 'Not saved. Check your connection and try again.',
    trop: (n: number) => `${n} characters at most.`,
    aucune: 'No notes yet.',
    mesNotes: 'My notes',
    iaOui: 'Readable by the AI coach',
    iaNon: 'Private, even from the AI coach',
    autoriserIa: 'Allow the AI coach',
    retirerIa: 'Remove AI coach access',
    modifier: 'Edit',
    annulerModif: 'Cancel',
    supprimer: 'Delete',
    confirmerSuppr: 'Delete this note permanently?',
    oui: 'Yes, delete',
    non: 'No',
    modifiee: 'edited',
    erreurAction: 'That did not work. Please try again.',
    chargement: 'Loading…',
    erreurChargement: 'Your journal cannot be loaded right now.',
    reessayer: 'Try again',
    titreAide: 'Need help?',
    introAide: 'Explain what is holding you back. A member of the SÉNEVÉ support team will read your request.',
    urgence: 'If you are in danger or distress right now, do not stay alone: contact your local emergency services or someone you trust nearby.',
    motif: 'Your request',
    placeholderMotif: 'For example: I can’t manage the action for day 3…',
    parcours: 'Journey concerned',
    aucunParcours: 'None in particular',
    partager: 'Attach notes from my journal (optional)',
    partagerAide: 'Only the notes you tick will be copied into your request and read by the team.',
    envoyer: 'Send my request',
    envoi: 'Sending…',
    envoyee: 'Request sent. You can follow its status below.',
    erreurEnvoi: 'Request not sent. Check your connection and try again.',
    tropDemandes: 'Too many requests today. Please try again tomorrow.',
    mesDemandes: 'My requests',
    aucuneDemande: 'No requests yet.',
    reponse: 'Team reply:',
    notesJointes: 'Attached notes:',
    annulerDemande: 'Cancel this request',
    confirmerAnnulTitre: 'Cancel this request?',
    confirmerAnnulTexte: 'If you cancel this request, the support team will no longer handle it. You can always create a new request later if the problem continues.',
    conserverDemande: 'Keep my request',
    confirmerAnnul: 'Confirm cancellation',
    repondre: 'Reply to the team',
    taReponse: 'Your reply:',
    champReponse: 'Your reply to the team',
    envoyerReponse: 'Send my reply',
    annulerReponse: 'Cancel',
    reponseEnvoyee: 'Reply sent. The team will read it.',
    rouvrir: 'Your request will be reopened and the team will read it again.',
    etats: {
      recue: 'Received',
      affectee: 'Assigned to a companion',
      en_cours: 'In progress',
      attente_participant: 'Waiting for your reply',
      resolue: 'Resolved',
      annulee: 'Cancelled',
    } as Record<string, string>,
    carteTitre: 'Journal, coach and help',
    carteTexte: 'Write down what you are living privately, ask the coach a question or ask the team for help.',
    parlerCoach: 'Talk to the coach',
    mesProgres: 'My progress',
    ouvrirJournal: 'Open my journal',
    demanderAide: 'Ask for help',
    repondreJournal: 'Answer in my journal',
  },
} as const;

export function journalTextes(langue: string | null | undefined) {
  return JOURNAL_TEXTES[langue === 'en' ? 'en' : 'fr'];
}

export function formatDateHeure(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { timeZone: 'Africa/Kinshasa', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}
