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

/** Édition anglaise : titres et pages relevés dans « Stop Begging For Miracles EN LIVRE COMPLET.pdf » (sommaire et annexe 4). */
export const BOOK = {
 titre: 'Stop Begging for Miracles',
 sousTitre: 'Walk in the principles of the Kingdom and see God act',
 auteur: 'Dr Justin Tshims',
 chapitres: [
  {titre:'Seek First the Kingdom of God',page:9},
  {titre:'Tithes and Offerings: Your Financial Covenant with God',page:35},
  {titre:'Work: The Natural Channel of Divine Blessing',page:54},
  {titre:'The Love of Money: The Root of All Evil',page:74},
  {titre:'Helping Widows, Orphans, and the Poor: Living the Tsedakah',page:93},
  {titre:'Faithful in the Little Things',page:109},
  {titre:'Led by the Spirit, Not by Urgency',page:125},
 ],
} as const;

/** L’audio quotidien du parcours ne vaut pas publication du livre audio.
 * L’accès au livre intégral exige une livraison protégée distincte, encore absente.
 * Ne jamais fabriquer une URL à partir d’un paiement ou d’une inscription. */
export const FORMATS_LIVRE = [
 {id:'audio',icone:'headphones',titre:'Livre audio',etat:'preparation'},
 {id:'pdf',icone:'description',titre:'Livre numérique · PDF',etat:'preparation'},
] as const;
