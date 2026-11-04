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

/** Sommaire complet relevé dans les deux PDF du livre (page « Table des matières », 04/11/2026, demande de Dr Justin).
 * « page » : page imprimée ; dans le PDF, elle se trouve 3 pages plus loin (couverture, mentions, table des matières). */
export const DECALAGE_PAGES_PDF=3;
export const SOMMAIRE_LIVRE=[
 {titre:"Note de l’auteur",page:1},
 {titre:"Préface",page:2},
 {titre:"Introduction — Le problème que ce livre veut résoudre",page:4},
 {titre:"Prologue — L’homme qui mendiait des miracles",page:6},
 {titre:"Chapitre 1 — Chercher premièrement le Royaume de Dieu",page:9},
 {titre:"Chapitre 2 — La dîme et l’offrande : ton alliance financière avec Dieu",page:38},
 {titre:"Chapitre 3 — Le travail : canal naturel de la bénédiction divine",page:58},
 {titre:"Chapitre 4 — L’amour de l’argent : racine de tous les maux",page:79},
 {titre:"Chapitre 5 — Aider les veuves, les orphelins et les pauvres : vivre la Tsedaka",page:100},
 {titre:"Chapitre 6 — Fidélité dans les petites choses",page:117},
 {titre:"Chapitre 7 — Être conduit par l’Esprit, pas par l’urgence",page:134},
 {titre:"Conclusion générale",page:149},
 {titre:"Engagement solennel de consécration — page détachable",page:155},
 {titre:"Annexe 1 — 30 jours pour mettre Dieu en premier",page:156},
 {titre:"Annexe 2 — 50 versets bibliques sur la prospérité selon Dieu",page:160},
 {titre:"Annexe 3 — Plan de prière de 21 jours",page:167},
 {titre:"Annexe 4 — L’essentiel du Royaume en 35 phrases",page:171},
 {titre:"Mot de l’auteur",page:176},
] as const;
export const SOMMAIRE_BOOK=[
 {titre:"Author’s Note",page:1},
 {titre:"Preface",page:2},
 {titre:"Introduction — The problem this book seeks to solve",page:4},
 {titre:"Prologue — The Man Who Begged for Miracles",page:6},
 {titre:"Chapter 1 — Seek First the Kingdom of God",page:9},
 {titre:"Chapter 2 — Tithes and Offerings: Your Financial Covenant with God",page:35},
 {titre:"Chapter 3 — Work: The Natural Channel of Divine Blessing",page:54},
 {titre:"Chapter 4 — The Love of Money: The Root of All Evil",page:74},
 {titre:"Chapter 5 — Helping Widows, Orphans, and the Poor: Living the Tsedakah",page:93},
 {titre:"Chapter 6 — Faithful in the Little Things",page:109},
 {titre:"Chapter 7 — Led by the Spirit, Not by Urgency",page:125},
 {titre:"General Conclusion",page:139},
 {titre:"Solemn Covenant of Consecration — detachable page",page:145},
 {titre:"Appendix 1 — 30 Days to Put God First",page:146},
 {titre:"Appendix 2 — 50 Bible Verses on Prosperity According to God",page:150},
 {titre:"Appendix 3 — A 21-Day Prayer Plan",page:157},
 {titre:"Appendix 4 — The Essence of the Kingdom in 35 Phrases",page:160},
 {titre:"A Word from the Author",page:164},
] as const;
