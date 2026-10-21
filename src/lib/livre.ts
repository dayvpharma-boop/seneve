/** Métadonnées vérifiées dans le livre fourni par l’auteur. Aucun fichier intégral public. */
export const LIVRE = {
 titre: 'Arrête de mendier des miracles',
 sousTitre: 'Marche dans les principes du Royaume et vois Dieu agir',
 auteur: 'Dr Justin Tshims',
 chapitres: [
  {titre:'Chercher premièrement le Royaume de Dieu',page:9},
  {titre:'La dîme et l’offrande : ton alliance financière avec Dieu',page:38},
  {titre:'Le travail : canal naturel de la bénédiction divine',page:58},
  {titre:'L’amour de l’argent : racine de tous les maux',page:79},
  {titre:'Aider les veuves, les orphelins et les pauvres : vivre la Tsedaka',page:100},
  {titre:'Fidélité dans les petites choses',page:117},
  {titre:'Être conduit par l’Esprit, pas par l’urgence',page:134},
 ],
} as const;

/** L’audio quotidien du parcours ne vaut pas publication du livre audio.
 * L’accès au livre intégral exige une livraison protégée distincte, encore absente.
 * Ne jamais fabriquer une URL à partir d’un paiement ou d’une inscription. */
export const FORMATS_LIVRE = [
 {id:'audio',icone:'headphones',titre:'Livre audio',etat:'preparation'},
 {id:'pdf',icone:'description',titre:'Livre numérique · PDF',etat:'preparation'},
] as const;
