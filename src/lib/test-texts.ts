/** Une racine du test. s = phrase-seuil (annexe 4), o = phrase d'ouverture du chapitre c (mot pour mot). */
export type Root = { n: string; p: string; a: string; j: number; s?: string; o?: string; c?: number };
// FR V4 (validée le 22/10/2026) : premier pas tiré de l'annexe 1 (jours 2, 8, 16, 4, 17, 9, 22), mot pour mot ;
// phrase-seuil avant chaque racine et phrase d'ouverture du chapitre, mot pour mot du livre.
const frenchRoots: Root[] = [
 {n:"Priorité au Royaume", p:"Cherche le Roi, et les miracles retrouveront leur juste place.", a:"Identifie une décision que tu dois prendre cette semaine. Prie spécifiquement dessus avant d'agir.", j:2,
  s:"Le vrai chrétien ne met pas Dieu dans son agenda — il met son agenda dans les mains de Dieu.", o:"Tant que Dieu n'est pas premier, tout le reste est en désordre — même ce qui semble réussir.", c:1},
 {n:"Dîme et offrande", p:"La dîme n'a jamais enrichi Dieu. Elle a toujours libéré l'homme.", a:"Calcule exactement ta dîme du mois en cours. Mets-la de côté aujourd'hui.", j:8,
  s:"Si Dieu ne règne pas sur ton portefeuille, Il ne règne pas vraiment sur ton cœur.", o:"La dîme n'a jamais enrichi Dieu. Elle a toujours libéré l'homme.", c:2},
 {n:"Travail et intégrité", p:"Dieu ne bénit pas l'inaction — Il bénit l'effort consacré.", a:"Identifie une pratique professionnelle à corriger. Prends la décision de la changer.", j:16,
  s:"La fidélité dans le petit prépare toujours la promotion dans le grand.", o:"Dieu ne fait pas pleuvoir des pains. Il bénit des mains.", c:3},
 {n:"Liberté face à l'argent", p:"Le problème n'a jamais été ce que tu as dans la poche. Le problème, c'est ce que la poche a mis dans ton cœur.", a:"Écris dans un carnet tout ce pour quoi tu es reconnaissant aujourd'hui. Minimum 10 choses.", j:4,
  s:"Mammon n'est pas seulement l'argent. C'est tout ce qui cherche à prendre la place de Dieu dans ta confiance.", o:"On ne déracine pas l'amour de l'argent en vidant ses poches, mais en remplissant son cœur d'un plus grand trésor.", c:4},
 {n:"Compassion et Tsedaka", p:"Dieu t'a béni précisément pour que tu sois un canal, pas un réservoir.", a:"Rends visite à une veuve, un orphelin ou une personne seule dans ton entourage.", j:17,
  s:"Tu cherchais Son visage dans tes prières. Il t'attendait dans le regard de la veuve d'à côté.", o:"La compassion n'est pas une œuvre que Dieu te demande. C'est un rendez-vous que le Roi te fixe.", c:5},
 {n:"Fidélité dans les petites choses", p:"Dieu n'examine pas tes rêves. Il examine tes habitudes.", a:"Écris tous tes revenus et toutes tes dépenses du mois dernier. Regarde où va ton argent sans te juger.", j:9,
  s:"Si Dieu peut te faire confiance avec un dollar, Il peut te faire confiance avec un million.", o:"Dieu n'examine pas tes rêves. Il examine tes habitudes.", c:6},
 {n:"Discernement", p:"L'urgence est la voix du monde. La paix est l'accent de Dieu.", a:"Face à une décision en cours : applique le test de la paix. Ne décide pas si la paix est absente.", j:22,
  s:"La voix de Dieu n'est pas la voix la plus forte dans ta vie. C'est la plus douce — mais c'est aussi la plus vraie.", o:"L'urgence est la voix du monde. La paix est l'accent de Dieu.", c:7}
];
/** FR V5 (validée par Dr Justin le 23/10/2026) : 3 questions par racine, toutes dans le même sens (« Tout à fait » = racine forte). */
const frenchQuestions = [
 "Je commence chaque journée par un temps de prière avant toute autre activité.",
 "Je consulte Dieu avant de prendre des décisions importantes.",
 "Ma relation avec Dieu ne dépend pas de ma situation financière du moment.",
 "Ma dîme est la première dépense que je règle dès que je reçois un revenu.",
 "Je donne avec joie et non par obligation ou par peur.",
 "Je crois que Dieu peut protéger et multiplier mes ressources.",
 "Est-ce que je travaille avec la même qualité quand personne ne me regarde ?",
 "Ma conscience est-elle nette de toute pratique malhonnête au travail ?",
 "Est-ce que je crois que Dieu peut ouvrir des portes que mes diplômes ne peuvent pas ouvrir ?",
 "Je garde ma paix intérieure même lorsque ma situation financière est difficile.",
 "Puis-je me réjouir sincèrement quand un frère prospère plus que moi ?",
 "Est-ce que ma vie reflète une simplicité intentionnelle ?",
 "Je prends régulièrement soin d'une personne isolée ou dans le besoin, selon mes possibilités.",
 "J'apporte une aide concrète aux personnes dans le besoin, par mes ressources, mon temps ou mes actions.",
 "Est-ce que je donne dans le secret, sans chercher la reconnaissance ?",
 "Est-ce que je tiens un carnet de dépenses qui me permet de voir où va mon argent ?",
 "Est-ce que je mets régulièrement de l'argent de côté en épargne ?",
 "Est-ce que j'accomplis les petites tâches avec le même sérieux que les grandes ?",
 "Lorsque je ressens une pression pour décider rapidement, je prends le temps de prier et de rechercher une paix durable avant d'agir.",
 "Avant de suivre une impression intérieure, je vérifie qu'elle est cohérente avec la Parole de Dieu.",
 "Avant une décision importante, je demande conseil à des personnes sages et compétentes."
];
/** Positions (de 0 à 20) des questions comptées à l'envers : score = 6 - réponse (aucune en V5). Même liste que regles.items_inverses en base. */
const frenchReversed: number[] = [];

export type Language = 'fr' | 'en';
/** Version réellement affichée : FR V4 (validée le 22/10/2026) ; EN reste en V3 jusqu'à la relecture de sa traduction. */
export const TEST_VERSIONS: Record<Language, number> = { fr: 5, en: 3 };
export function languageFrom(value: unknown): Language { return value === 'en' ? 'en' : 'fr'; }
const englishRoots: Root[] = [
 {n:"Kingdom First", p:"Seek the King, and the miracles will return to their rightful place.", a:"Begin your day with 15 minutes of silence before your phone. Read Matthew 6:25-34.", j:1},
 {n:"Tithe and Offering", p:"The tithe has never enriched God. It has always set man free.", a:"Reread Malachi 3:10-12. Pray over the divine promise of financial protection.", j:12},
 {n:"Work and Integrity", p:"God does not bless inaction — He blesses consecrated effort.", a:"Carry out an ordinary task with unusual excellence — as if God were watching it directly.", j:20},
 {n:"Freedom from the Love of Money", p:"The problem has never been what you have in your pocket. The problem is what the pocket has put into your heart.", a:"Write in a notebook everything you are thankful for today. At least 10 things.", j:4},
 {n:"Compassion and Tzedakah", p:"God has blessed you precisely so that you may be a channel, not a reservoir.", a:"Visit a widow, an orphan, or a lonely person in your circle.", j:17},
 {n:"Faithfulness in the Little Things", p:"God does not examine your dreams. He examines your habits.", a:"Reread Luke 16:10-13. Meditate on what faithfulness in the little things means for you.", j:6},
 {n:"Discernment", p:"Urgency is the voice of the world. Peace is the accent of God.", a:"Facing a current decision: apply the test of peace. Do not decide if peace is absent.", j:22}
];
const englishQuestions = [
 "I begin each day with a time of prayer before any other activity.",
 "I consult God before making important professional decisions.",
 "My relationship with God does not depend on my financial situation of the moment.",
 "My tithe is the first expense I settle as soon as I receive income.",
 "I give with joy and not out of obligation or fear.",
 "When I give, I do so with trust rather than out of fear.",
 "Do I work with the same quality when my boss is not there?",
 "In my daily activities, I choose honesty, even when no one can check.",
 "I take practical steps to move forward, rather than waiting for opportunities to come on their own.",
 "Do I pray with the same fervor in abundance as in lack?",
 "Can I sincerely rejoice when a brother prospers more than I do?",
 "Does my life reflect an intentional simplicity?",
 "I check on a lonely person or someone in difficulty and offer help suited to my means.",
 "Do I give to the poor in a concrete and regular way?",
 "Do I give in secret, without seeking recognition?",
 "Do I keep an expense notebook that lets me see where my money goes?",
 "I keep my small everyday commitments, even when they seem unimportant.",
 "Do I carry out small tasks with the same seriousness as big ones?",
 "Do I recognize the difference between the pressure of urgency and the peace of the Spirit?",
 "Do I obey the small impressions of the Spirit day to day?",
 "Do I apply the test of peace before committing?"
];
export const texts = {
 fr: {
  roots: frenchRoots, questions: frenchQuestions, reversed: frenchReversed,
  /** Question d'ouverture du test, mot pour mot (livre, chapitre 1). */
  opening: { text: 'Qui est vraiment premier dans ta vie ? Ne réponds pas trop vite.', source: 'Livre, chapitre 1' } as { text: string; source: string } | null,
  tabTitle: 'Test des 7 Racines — SÉNEVÉ', brand: 'Sénevé', homeTitle: 'Le Test des 7 Racines',
  //   = espace insécable : garde « Arrête… », « 5 = toujours » et « ; » / « : » sur la même ligne que le mot voisin.
  intro: '21 questions courtes, tirées du livre « Arrête de mendier des miracles ».',
  discover: 'À la fin, tu découvres :', discoveries: ['tes sept racines avec leur score ;', 'la racine par laquelle commencer ;', 'une première action simple.'],
  instruction: "Pour chaque phrase, dis honnêtement si elle te ressemble, de 1 (pas du tout) à 5 (tout à fait). Aucun compte, aucun numéro demandé. Ce test t'oriente vers une pratique ; il ne mesure ni ta foi ni ta valeur.",
  reassurance: ['Sans compte', '21 questions', 'Retour possible'], tapHint: 'Choisis un chiffre : la question suivante s’affiche aussitôt.',
  seeResult: 'Voir mon résultat', shareToggle: 'Partager mon résultat en image',
  remaining: (n:number) => `${n} question${n > 1 ? 's' : ''} restante${n > 1 ? 's' : ''}`,
  remainingInRoot: (n:number) => `${n} question${n > 1 ? 's' : ''} restante${n > 1 ? 's' : ''} dans cette racine`,
  privacyTest: 'Tes réponses restent confidentielles. Aucun nom ni e-mail n’est demandé. À la fin du test, tes réponses et ton résultat sont enregistrés pour des statistiques anonymes.',
  privacyLink: 'Confidentialité',
  start: 'Commencer', languageLink: 'English', rootCount: (x:number) => `Racine ${x} sur 7`, questionCount: (x:number) => `Question ${x} sur 21`,
  never: '1 = pas du tout', always: '5 = tout à fait', answerGroup: 'Cela te ressemble ? De 1 pas du tout à 5 tout à fait',
  scaleTitle: 'Cela me ressemble…', scaleHint: 'De 1 à 5',
  answerOptions: ['Pas du tout', 'Un peu', 'À moitié', 'Beaucoup', 'Tout à fait'],
  answerLabel: (n:number) => `${n} sur 5 (${['pas du tout', 'un peu', 'à moitié', 'beaucoup', 'tout à fait'][n - 1]})`,
  thresholdSource: 'Livre, annexe 4',
  openingSource: (chapter:number) => `Livre, ouverture du chapitre ${chapter}`,
  /** Audios des 21 questions (voix « Justin pasteur », validés le 24/10/2026) : dossier dans medias-publics. */
  audioQuestions: 'test/fr/v5' as string | null,
  /** Question du manteau retirée le 24/10/2026 (Dr Justin Tshims) : posée avant que la personne ait lu le livre. */
  mantle: null as { question: string; hint: string; label: string; resultTitle: string; source: string; kept: string } | null,
  back: '← Question précédente', resultBrand: 'Bilan de ton introspection', resultTitle: "Tes racines aujourd'hui", rootsTitle: 'Tes 7 racines', summary: 'Selon tes réponses d’aujourd’hui · chaque racine sur 15',
  categories: ['Racine à développer', 'Racine à consolider', 'Point d’appui à entretenir'],
  allOne: 'Les sept racines sont à développer selon tes réponses. Choisis celle par laquelle tu souhaites commencer.',
  allSupport: 'Les sept racines sont des points d’appui selon tes réponses. Choisis celle que tu souhaites approfondir.',
  equal: 'Les sept racines sont au même niveau selon tes réponses. Choisis celle par laquelle tu souhaites commencer.',
  minimumTie: 'Plusieurs racines sont au même niveau selon tes réponses. Choisis celle par laquelle tu souhaites commencer.',
  suggested: 'Nous te proposons de commencer par', choose: 'Choisis une racine', chosen: 'La racine que tu as choisie',
  strength: { appui: 'Ton point d’appui', solide: 'Ta racine la plus solide', appuiPlusieurs: 'Tes points d’appui', solidePlusieurs: 'Tes racines les plus solides' },
  resultHelp: {
   suggested: 'Selon tes réponses, cette racine a le total le plus bas. Nous te la proposons comme point de départ pour pratiquer.',
   chosen: 'Tu as choisi cette racine parmi celles proposées. Elle devient ton point de départ pour pratiquer.',
   method: 'Comment lire tes résultats ?',
   calculation: 'Chaque racine additionne trois réponses de 1 à 5, soit un total de 3 à 15. La première phrase de chaque racine décrit une difficulté : pour elle, « tout à fait » compte 1 et « pas du tout » compte 5.',
   bands: 'De 3 à 6 : racine à développer. De 7 à 11 : racine à consolider. De 12 à 15 : point d’appui à entretenir.',
   close: 'Un petit écart entre deux totaux n’est pas un classement définitif. Ces repères t’aident à choisir une première pratique ; ils ne mesurent ni ta foi ni ta valeur.',
   strengthOne: 'C’est le total le plus élevé de cette tentative. Tu peux t’appuyer sur cette pratique pour avancer dans la racine que tu souhaites travailler.',
   strengthMany: 'Ce sont les totaux les plus élevés de cette tentative. Tu peux t’appuyer sur ces pratiques pour avancer dans la racine que tu souhaites travailler.',
  },
  quote: (p:string) => `« ${p} »`, quoteSource: 'Phrase du livre, annexe 4', firstAction: 'Ta première action',
  actionSource: (day:number,name:string) => `Livre, annexe 1, jour ${day} · ${name}`,
  further: 'Aller plus loin', furtherText: 'Reçois gratuitement le parcours Découverte de 7 jours sur WhatsApp. Tu écris toi-même le premier message et tu peux arrêter à tout moment en envoyant STOP.',
  espaceTexte: 'Tu préfères le suivre ici, sur le site\u00A0? Crée ton espace gratuit avec ton adresse e-\u2060mail.', espaceBouton: 'Créer mon espace',
  whatsappButton: 'Continuer sur WhatsApp', whatsappMessage: 'Bonjour, je viens de faire le Test des 7 Racines. Je souhaite découvrir le parcours gratuit de 7 jours.',
  final: 'Ce résultat repose sur tes réponses du moment. Il propose une orientation pédagogique ; il ne mesure ni ta foi ni ta valeur personnelle.', again: 'Refaire le test',
  share: {
   tag: 'Partager', text: 'Crée une image de ton résultat pour tes réseaux. Elle montre seulement le nom de tes racines, jamais tes notes.',
   create: 'Créer mon image', formats: 'Format de l’image', vertical: 'Vertical', verticalHint: 'Stories, Reels, TikTok, Shorts, statuts', square: 'Carré', squareHint: 'Publications Facebook, Instagram, LinkedIn, X',
   chooseStrength: 'Plusieurs racines sont aussi solides. Choisis celle à montrer :',
   addStart: (name: string) => `Ajouter aussi : je commence par ${name}`,
   preview: 'Aperçu de ton image', making: 'Préparation de l’image…', unavailable: 'Ton navigateur ne permet pas de créer l’image.',
   shareButton: 'Partager l’image', download: 'Télécharger l’image', fileName: 'mes-racines-seneve',
   card: { brand: 'SÉNEVÉ', title: 'Le Test des 7 Racines', book: 'D’après « Arrête de mendier des miracles »', appui: 'Mon point d’appui', solide: 'Ma racine la plus solide', start: 'Je commence par', question: 'Et toi, quelle est ta racine ?' }
  }
 },
 en: {
  roots: englishRoots, questions: englishQuestions, reversed: [] as number[],
  opening: null as { text: string; source: string } | null,
  tabTitle: 'The 7 Roots Test — SÉNEVÉ', brand: 'SÉNEVÉ', homeTitle: 'The 7 Roots Test',
  intro: '21 short questions, drawn from the book “Stop Begging for Miracles”.',
  discover: 'At the end, you discover:', discoveries: ['your seven roots with their score;', 'the root to start with;', 'a simple first action.'],
  instruction: 'Answer honestly from 1 to 5 (1 = never, 5 = always). No account, no phone number required. This test points you toward a practice; it measures neither your faith nor your worth.',
  reassurance: ['No account', '21 questions', 'You can go back'], tapHint: 'Choose a number: the next question appears right away.',
  seeResult: 'See my result', shareToggle: 'Share my result as an image',
  remaining: (n:number) => `${n} question${n > 1 ? 's' : ''} remaining`,
  remainingInRoot: (n:number) => `${n} question${n > 1 ? 's' : ''} remaining in this root`,
  privacyTest: 'Your answers remain confidential. No name or email is requested. At the end of the test, your answers and result are recorded for anonymous statistics.',
  privacyLink: 'Privacy details',
  start: 'Start', languageLink: 'Français', rootCount: (x:number) => `Root ${x} of 7`, questionCount: (x:number) => `Question ${x} of 21`,
  never: '1 = never', always: '5 = always', answerGroup: 'Your answer, from 1 never to 5 always',
  scaleTitle: 'Choose your answer', scaleHint: 'Scale from 1 to 5',
  answerOptions: ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'],
  answerLabel: (n:number) => `${n} out of 5 (${['never', 'rarely', 'sometimes', 'often', 'always'][n - 1]})`,
  thresholdSource: 'Book, Appendix 4',
  openingSource: (chapter:number) => `Book, opening of Chapter ${chapter}`,
  /** Audios des 21 questions EN V3 (voix « Justin pasteur », validés le 24/10/2026). */
  audioQuestions: 'test/en/v3' as string | null,
  mantle: null as { question: string; hint: string; label: string; resultTitle: string; source: string; kept: string } | null,
  back: '← Previous question', resultBrand: 'Your self-review', resultTitle: 'Your roots today', rootsTitle: 'Your 7 roots', summary: 'According to your answers today · each root out of 15',
  categories: ['Root to develop', 'Root to strengthen', 'Strength to maintain'],
  allOne: 'According to your answers, all seven roots are to be developed. Choose the one you want to start with.',
  allSupport: 'According to your answers, all seven roots are strengths. Choose the one you want to deepen.',
  equal: 'According to your answers, all seven roots are at the same level. Choose the one you want to start with.',
  minimumTie: 'According to your answers, several roots are at the same level. Choose the one you want to start with.',
  suggested: 'We suggest you start with', choose: 'Choose a root', chosen: 'The root you chose',
  strength: { appui: 'Your anchor', solide: 'Your strongest root', appuiPlusieurs: 'Your anchors', solidePlusieurs: 'Your strongest roots' },
  resultHelp: {
   suggested: 'According to your answers, this root has the lowest total. We suggest it as a starting point for practice.',
   chosen: 'You chose this root from the options offered. It becomes your starting point for practice.',
   method: 'How should I read my results?',
   calculation: 'Each root adds up three answers from 1 to 5, giving a total from 3 to 15.',
   bands: 'From 3 to 6: root to develop. From 7 to 11: root to strengthen. From 12 to 15: strength to maintain.',
   close: 'A small gap between two totals is not a definitive ranking. These guides help you choose a first practice; they measure neither your faith nor your worth.',
   strengthOne: 'This is the highest total in this attempt. You can draw on this practice as you work on the root you want to develop.',
   strengthMany: 'These are the highest totals in this attempt. You can draw on these practices as you work on the root you want to develop.',
  },
  quote: (p:string) => `“${p}”`, quoteSource: 'Phrase from the book, Appendix 4', firstAction: 'Your first action',
  actionSource: (day:number,name:string) => `Book, Appendix 1, Day ${day} · ${name}`,
  further: 'Go further', furtherText: 'Receive the free 7-day Discovery journey on WhatsApp. You write the first message yourself and you can stop at any time by sending STOP.',
  espaceTexte: 'Prefer to follow it here, on the website? Create your free space with your email address.', espaceBouton: 'Create my space',
  whatsappButton: 'Continue on WhatsApp', whatsappMessage: 'Hello, I have just taken the 7 Roots Test. I would like to discover the free 7-day journey.',
  final: 'This result is based on your answers at this moment. It offers educational guidance; it measures neither your faith nor your personal worth.', again: 'Take the test again',
  share: {
   tag: 'Share', text: 'Create an image of your result for your social networks. It only shows the names of your roots, never your scores.',
   create: 'Create my image', formats: 'Image format', vertical: 'Vertical', verticalHint: 'Stories, Reels, TikTok, Shorts, statuses', square: 'Square', squareHint: 'Facebook, Instagram, LinkedIn, X posts',
   chooseStrength: 'Several roots are equally strong. Choose the one to show:',
   addStart: (name: string) => `Also add: I am starting with ${name}`,
   preview: 'Preview of your image', making: 'Preparing the image…', unavailable: 'Your browser cannot create the image.',
   shareButton: 'Share the image', download: 'Download the image', fileName: 'my-roots-seneve',
   card: { brand: 'SÉNEVÉ', title: 'The 7 Roots Test', book: 'From “Stop Begging for Miracles”', appui: 'My anchor', solide: 'My strongest root', start: 'I am starting with', question: 'And you, what is your root?' }
  }
 }
};
export const whatsappUrls = {
 fr: `https://wa.me/243844211119?text=${encodeURIComponent(texts.fr.whatsappMessage)}`,
 en: `https://wa.me/243844211119?text=${encodeURIComponent(texts.en.whatsappMessage)}`
};
