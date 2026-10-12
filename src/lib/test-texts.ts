const frenchRoots = [
 {n:"Priorité au Royaume", p:"Cherche le Roi, et les miracles retrouveront leur juste place.", a:"Commence ta journée avec 15 minutes de silence avant ton téléphone. Lis Matthieu 6:25-34.", j:1},
 {n:"Dîme et offrande", p:"La dîme n'a jamais enrichi Dieu. Elle a toujours libéré l'homme.", a:"Relis Malachie 3:10-12. Prie sur la promesse divine de protection financière.", j:12},
 {n:"Travail et intégrité", p:"Dieu ne bénit pas l'inaction — Il bénit l'effort consacré.", a:"Accomplis une tâche ordinaire avec une excellence inhabituelle — comme si Dieu l'observait directement.", j:20},
 {n:"Liberté face à l'argent", p:"Le problème n'a jamais été ce que tu as dans la poche. Le problème, c'est ce que la poche a mis dans ton cœur.", a:"Écris dans un carnet tout ce pour quoi tu es reconnaissant aujourd'hui. Minimum 10 choses.", j:4},
 {n:"Compassion et Tsedaka", p:"Dieu t'a béni précisément pour que tu sois un canal, pas un réservoir.", a:"Rends visite à une veuve, un orphelin ou une personne seule dans ton entourage.", j:17},
 {n:"Fidélité dans les petites choses", p:"Dieu n'examine pas tes rêves. Il examine tes habitudes.", a:"Relis Luc 16:10-13. Médite sur ce que signifie la fidélité dans les petites choses pour toi.", j:6},
 {n:"Discernement", p:"L'urgence est la voix du monde. La paix est l'accent de Dieu.", a:"Face à une décision en cours : applique le test de la paix. Ne décide pas si la paix est absente.", j:22}
];
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
 "Est-ce que je prie avec la même ferveur dans l'abondance que dans le manque ?",
 "Puis-je me réjouir sincèrement quand un frère prospère plus que moi ?",
 "Est-ce que ma vie reflète une simplicité intentionnelle ?",
 "Est-ce que j'ai dans mon entourage une veuve ou une personne seule que je visite régulièrement ?",
 "Est-ce que je donne aux pauvres de manière concrète et régulière ?",
 "Est-ce que je donne dans le secret, sans chercher la reconnaissance ?",
 "Est-ce que je tiens un carnet de dépenses qui me permet de voir où va mon argent ?",
 "Est-ce que je mets régulièrement de l'argent de côté en épargne ?",
 "Est-ce que j'accomplis les petites tâches avec le même sérieux que les grandes ?",
 "Est-ce que je reconnais la différence entre la pression de l'urgence et la paix de l'Esprit ?",
 "Est-ce que j'obéis aux petites impressions de l'Esprit au quotidien ?",
 "Est-ce que j'applique le test de la paix avant de m'engager ?"
];

export type Language = 'fr' | 'en';
export function languageFrom(value: unknown): Language { return value === 'en' ? 'en' : 'fr'; }
const englishRoots = [
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
 "I consult God before making important decisions.",
 "My relationship with God does not depend on my financial situation of the moment.",
 "My tithe is the first expense I settle as soon as I receive income.",
 "I give with joy and not out of obligation or fear.",
 "I believe that God can protect and multiply my resources.",
 "Do I work with the same quality when no one is watching?",
 "Is my conscience clear of any dishonest practice at work?",
 "Do I believe that God can open doors my diplomas cannot open?",
 "Do I pray with the same fervor in abundance as in lack?",
 "Can I sincerely rejoice when a brother prospers more than I do?",
 "Does my life reflect an intentional simplicity?",
 "Do I have in my circle a widow or a lonely person whom I visit regularly?",
 "Do I give to the poor in a concrete and regular way?",
 "Do I give in secret, without seeking recognition?",
 "Do I keep an expense notebook that lets me see where my money goes?",
 "Do I regularly set money aside in savings?",
 "Do I carry out small tasks with the same seriousness as big ones?",
 "Do I recognize the difference between the pressure of urgency and the peace of the Spirit?",
 "Do I obey the small impressions of the Spirit day to day?",
 "Do I apply the test of peace before committing?"
];
export const texts = {
 fr: {
  roots: frenchRoots, questions: frenchQuestions,
  tabTitle: 'Test des 7 Racines — SÉNEVÉ', brand: 'Sénevé', homeTitle: 'Le Test des 7 Racines',
  intro: '21 questions courtes, tirées du livre « Arrête de mendier des miracles ».',
  discover: 'À la fin, tu découvres :', discoveries: ['tes sept racines avec leur score ;', 'la racine par laquelle commencer ;', 'une première action simple.'],
  instruction: "Réponds honnêtement de 1 à 5 (1 = jamais, 5 = toujours). Aucun compte, aucun numéro demandé. Ce test t'oriente vers une pratique ; il ne mesure ni ta foi ni ta valeur.",
  start: 'Commencer', languageLink: 'English', rootCount: (x:number) => `Racine ${x} sur 7`, questionCount: (x:number) => `Question ${x} sur 21`,
  never: '1 = jamais', always: '5 = toujours', answerGroup: 'Ta réponse, de 1 jamais à 5 toujours',
  answerLabel: (n:number) => `${n} sur 5${n===1 ? ' (jamais)' : n===5 ? ' (toujours)' : ''}`,
  back: '← Question précédente', resultBrand: 'Ton résultat', resultTitle: "Tes racines aujourd'hui", summary: 'Selon tes réponses d’aujourd’hui',
  categories: ['Racine à développer', 'Racine à consolider', 'Point d’appui à entretenir'],
  allOne: 'Les sept racines sont à développer selon tes réponses. Choisis celle par laquelle tu souhaites commencer.',
  allSupport: 'Les sept racines sont des points d’appui selon tes réponses. Choisis celle que tu souhaites approfondir.',
  equal: 'Les sept racines sont au même niveau selon tes réponses. Choisis celle par laquelle tu souhaites commencer.',
  minimumTie: 'Plusieurs racines sont au même niveau selon tes réponses. Choisis celle par laquelle tu souhaites commencer.',
  suggested: 'Nous te proposons de commencer par', choose: 'Choisis une racine', chosen: 'La racine que tu as choisie',
  quote: (p:string) => `« ${p} »`, quoteSource: 'Phrase du livre, annexe 4', firstAction: 'Ta première action',
  actionSource: (day:number,name:string) => `Livre, annexe 1, jour ${day} · ${name}`,
  further: 'Aller plus loin', furtherText: 'Reçois gratuitement le parcours Découverte de 7 jours sur WhatsApp. Tu écris toi-même le premier message et tu peux arrêter à tout moment en envoyant STOP.',
  whatsappButton: 'Continuer sur WhatsApp', whatsappMessage: 'Bonjour, je viens de faire le Test des 7 Racines. Je souhaite découvrir le parcours gratuit de 7 jours.',
  final: 'Ce résultat repose sur tes réponses du moment. Il propose une orientation pédagogique ; il ne mesure ni ta foi ni ta valeur personnelle.', again: 'Refaire le test'
 },
 en: {
  roots: englishRoots, questions: englishQuestions,
  tabTitle: 'The 7 Roots Test — SÉNEVÉ', brand: 'SÉNEVÉ', homeTitle: 'The 7 Roots Test',
  intro: '21 short questions, drawn from the book “Stop Begging for Miracles”.',
  discover: 'At the end, you discover:', discoveries: ['your seven roots with their score;', 'the root to start with;', 'a simple first action.'],
  instruction: 'Answer honestly from 1 to 5 (1 = never, 5 = always). No account, no phone number required. This test points you toward a practice; it measures neither your faith nor your worth.',
  start: 'Start', languageLink: 'Français', rootCount: (x:number) => `Root ${x} of 7`, questionCount: (x:number) => `Question ${x} of 21`,
  never: '1 = never', always: '5 = always', answerGroup: 'Your answer, from 1 never to 5 always',
  answerLabel: (n:number) => `${n} out of 5${n===1 ? ' (never)' : n===5 ? ' (always)' : ''}`,
  back: '← Previous question', resultBrand: 'Your result', resultTitle: 'Your roots today', summary: 'According to your answers today',
  categories: ['Root to develop', 'Root to strengthen', 'Strength to maintain'],
  allOne: 'According to your answers, all seven roots are to be developed. Choose the one you want to start with.',
  allSupport: 'According to your answers, all seven roots are strengths. Choose the one you want to deepen.',
  equal: 'According to your answers, all seven roots are at the same level. Choose the one you want to start with.',
  minimumTie: 'According to your answers, several roots are at the same level. Choose the one you want to start with.',
  suggested: 'We suggest you start with', choose: 'Choose a root', chosen: 'The root you chose',
  quote: (p:string) => `“${p}”`, quoteSource: 'Phrase from the book, Appendix 4', firstAction: 'Your first action',
  actionSource: (day:number,name:string) => `Book, Appendix 1, Day ${day} · ${name}`,
  further: 'Go further', furtherText: 'Receive the free 7-day Discovery journey on WhatsApp. You write the first message yourself and you can stop at any time by sending STOP.',
  whatsappButton: 'Continue on WhatsApp', whatsappMessage: 'Hello, I have just taken the 7 Roots Test. I would like to discover the free 7-day journey.',
  final: 'This result is based on your answers at this moment. It offers educational guidance; it measures neither your faith nor your personal worth.', again: 'Take the test again'
 }
};
export const whatsappUrls = {
 fr: `https://wa.me/243844211119?text=${encodeURIComponent(texts.fr.whatsappMessage)}`,
 en: `https://wa.me/243844211119?text=${encodeURIComponent(texts.en.whatsappMessage)}`
};
