/** Coach IA : règles et textes de la page /coach. */

export const COACH_MAX = 1000;
export const COACH_WEBHOOK = 'https://n8n-zphq.srv1927839.hstgr.cloud/webhook/seneve-coach';

export type CoachMessage = { message_id: string; role: 'participant' | 'coach'; texte: string; etat: string; cree_le: string; question_id: string | null };

/** Une question attend encore sa réponse. */
export function enAttente(list: CoachMessage[]): boolean {
  return list.some(m => m.role === 'participant' && (m.etat === 'en_attente' || m.etat === 'en_traitement'));
}

/** Prévient n8n qu'une question attend (sans aucune donnée) ; n8n passe aussi chaque minute en secours. */
export function reveillerCoach(fetcher: typeof fetch = fetch): void {
  try { void fetcher(COACH_WEBHOOK, { method: 'POST', mode: 'no-cors', keepalive: true }).catch(() => undefined); } catch { /* le passage de secours répondra */ }
}

export const COACH_TEXTES = {
  fr: {
    locale: 'fr-FR',
    titre: 'Coach SÉNEVÉ',
    retour: 'Retour à mon espace',
    intro: 'Pose une question sur ta journée : comprendre un passage, appliquer l’action, reprendre après une pause.',
    avertissement: 'Le coach est une intelligence artificielle : il peut se tromper. Il s’appuie sur les contenus publiés de ton parcours et ne lit ton journal que pour les notes où tu l’as autorisé. Il ne remplace ni l’équipe ni une aide médicale ou d’urgence.',
    conservation: 'Tes échanges sont conservés jusqu’à ce que tu les effaces.',
    placeholder: 'Ta question…',
    envoyer: 'Envoyer',
    envoi: 'Envoi…',
    attente: 'Le coach prépare sa réponse…',
    echec: 'Le coach n’a pas pu répondre à ce message. Il ne compte pas dans ta limite du jour ; tu peux reposer ta question.',
    restants: (n: number, q: number) => `${n} message${n > 1 ? 's' : ''} sur ${q} restant${n > 1 ? 's' : ''} aujourd’hui.`,
    quota: 'Tu as utilisé tes messages du jour. Tu pourras reposer une question demain ; ton journal et ta journée restent accessibles.',
    erreurEnvoi: 'Message non envoyé. Vérifie ta connexion et réessaie.',
    trop: (n: number) => `${n} caractères au plus.`,
    vous: 'Toi',
    coach: 'Coach',
    effacer: 'Effacer toute la conversation',
    confirmer: 'Effacer définitivement tous tes échanges avec le coach ?',
    oui: 'Oui, effacer',
    non: 'Non',
    aucun: 'Aucun échange pour le moment.',
    sansParcours: 'Le coach t’accompagne pendant un parcours actif. Commence ou reprends un parcours depuis ton espace.',
    aide: 'Besoin de parler à une personne ?',
    aideLien: 'Demander de l’aide',
    chargement: 'Chargement…',
    erreurChargement: 'Impossible de charger le coach pour le moment.',
    reessayer: 'Réessayer',
  },
  en: {
    locale: 'en-GB',
    titre: 'SÉNEVÉ coach',
    retour: 'Back to my space',
    intro: 'Ask a question about your day: understand a passage, apply the action, start again after a break.',
    avertissement: 'The coach is an artificial intelligence: it can make mistakes. It relies on your journey’s published content and only reads the journal notes you have allowed. It does not replace the team, medical care or emergency services.',
    conservation: 'Your conversations are kept until you delete them.',
    placeholder: 'Your question…',
    envoyer: 'Send',
    envoi: 'Sending…',
    attente: 'The coach is preparing an answer…',
    echec: 'The coach could not answer this message. It does not count towards your daily limit; you can ask again.',
    restants: (n: number, q: number) => `${n} of ${q} message${q > 1 ? 's' : ''} left today.`,
    quota: 'You have used today’s messages. You can ask again tomorrow; your journal and today’s content stay available.',
    erreurEnvoi: 'Message not sent. Check your connection and try again.',
    trop: (n: number) => `${n} characters at most.`,
    vous: 'You',
    coach: 'Coach',
    effacer: 'Delete the whole conversation',
    confirmer: 'Permanently delete all your conversations with the coach?',
    oui: 'Yes, delete',
    non: 'No',
    aucun: 'No conversation yet.',
    sansParcours: 'The coach supports you during an active journey. Start or resume a journey from your space.',
    aide: 'Need to talk to a person?',
    aideLien: 'Ask for help',
    chargement: 'Loading…',
    erreurChargement: 'The coach cannot be loaded right now.',
    reessayer: 'Try again',
  },
} as const;

export function coachTextes(langue: string | null | undefined) {
  return COACH_TEXTES[langue === 'en' ? 'en' : 'fr'];
}
