/** Carte « Et après ? » : étapes suivantes possibles, tirées du catalogue validé (aucun prix inventé, aucun achat automatique). */
export type Offre = { offre_id: string; produit: string; type_offre: string; langue: string; programme_id: string; prix: number | string | null; devise: string | null; lien_achat: string | null };

/** Programmes suivants selon le parcours terminé (chemin du cahier des charges : Découverte → livre → programmes 30 → 90). */
export function programmesSuivants(programmeId: string): string[] {
  const m = /_(FR|EN)_V\d+$/.exec(programmeId);
  if (!m) return [];
  const L = m[1];
  if (programmeId.startsWith('PROSPECT_LIVRE_7J_')) return [`ACHETEUR_LIVRE_14J_${L}_V1`];
  if (programmeId.startsWith('ACHETEUR_LIVRE_14J_')) return [`ACHETEUR_FORMATION30_30J_${L}_V1`, `ACHETEUR_ACCOMP30_30J_${L}_V1`];
  if (programmeId.startsWith('ACHETEUR_FORMATION30_') || programmeId.startsWith('ACHETEUR_ACCOMP30_')) return [`ACHETEUR_FORMATION90_90J_${L}_V1`, `ACHETEUR_ACCOMP90_90J_${L}_V1`];
  return [];
}

/** Offres à proposer : programmes suivants, sans ceux que la personne a déjà. */
export function offresSuivantes(programmeId: string, offres: Offre[], dejaInscrit: string[]): Offre[] {
  const suivants = programmesSuivants(programmeId).filter(p => !dejaInscrit.includes(p));
  return offres.filter(o => suivants.includes(o.programme_id))
    .sort((a, b) => suivants.indexOf(a.programme_id) - suivants.indexOf(b.programme_id) || Number(a.prix ?? 0) - Number(b.prix ?? 0));
}

export function prixAffiche(o: Offre, langue: string): string {
  if (o.prix === null || o.prix === undefined || o.prix === '') return '';
  const n = Number(o.prix);
  const devise = o.devise ?? '';
  return langue === 'en' ? `${devise} ${n.toFixed(2).replace(/\.00$/, '')}`.trim()
    : `${n.toFixed(2).replace(/\.00$/, '').replace('.', ',')} ${devise}`.trim();
}

export const SUITE_TEXTES = {
  fr: {
    titre: 'Et après ?',
    intro: 'Si tu veux continuer à marcher, voici les étapes possibles :',
    voir: 'Voir l’offre',
    bientot: 'Lien d’achat bientôt disponible.',
    libre: 'Aucun achat n’est obligatoire. Ton historique reste enregistré.',
  },
  en: {
    titre: 'What’s next?',
    intro: 'If you want to keep walking, here are the possible next steps:',
    voir: 'See the offer',
    bientot: 'Purchase link coming soon.',
    libre: 'No purchase is required. Your history stays saved.',
  },
} as const;
