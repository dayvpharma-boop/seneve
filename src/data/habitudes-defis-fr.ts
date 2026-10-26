/** Les quatre défis hebdomadaires et le bilan des jours 29–30, approuvés par Dr Justin Tshims le 26/10/2026
 * (« JE VALIDE », document « Habitudes & Défis — Relecture avant publication »). Texte repris sans changement de
 * editorial/habitudes-defis/defis-30-jours-fr-relecture.md. Lecture seule : aucune donnée n'est collectée.
 * Jours relatifs au mois (1 à 30) ; aux mois 2 à 6 ils reviennent avec la reprise des lectures. */
export type DefiHabitudes={du:number;au:number;titre:string;objectif?:string;texte:string;adapter?:string;relire?:string;questions?:string[]};
export const defisHabitudesFr:DefiHabitudes[]=[
 {du:1,au:7,titre:'Préparer un rendez-vous fidèle',objectif:'Choisir un rendez-vous quotidien réaliste et en observer la pratique.',
  texte:'Cette semaine, choisis parmi tes habitudes un rendez-vous que tu veux mieux préparer : prière, lecture ou gratitude. Vérifie son horaire et prévois ce qui peut t’aider à y entrer calmement. À chaque passage, déclare seulement ce que tu as réellement fait. Si tu le manques, prépare le suivant ; tu ne repars pas de zéro.',
  adapter:'Tu peux déplacer l’horaire, préparer ton support à l’avance ou demander de l’aide pour comprendre l’activité. Une réalisation partielle reste une information utile.',
  relire:'Qu’est-ce qui a facilité ce rendez-vous, et quel ajustement veux-tu garder ?'},
 {du:8,au:14,titre:'Prendre soin d’une responsabilité',objectif:'Mettre de l’attention et de l’honnêteté dans une responsabilité existante.',
  texte:'Choisis une responsabilité déjà présente dans ta vie : travail, étude, tâche familiale ou engagement personnel. Définis une étape concrète que tu peux raisonnablement mener cette semaine. Prends le temps de la préparer et de reconnaître ce qui est terminé ou encore en cours. Il ne s’agit pas d’accumuler des tâches pour obtenir un meilleur score.',
  adapter:'Si ton emploi du temps change, réduis l’étape ou explique ce qui n’a pas été possible. Ce défi ne conditionne pas ta valeur à un emploi, à un revenu ou à une performance.',
  relire:'Quelle attention nouvelle as-tu portée à cette responsabilité ?'},
 {du:15,au:21,titre:'Exercer une générosité attentive',objectif:'Réfléchir à une aide libre, respectueuse et adaptée à ses possibilités.',
  texte:'Observe un besoin autour de toi sans exposer la personne concernée. Si elle le souhaite et si tu le peux, propose une aide adaptée : écouter, rendre un service, consacrer du temps ou choisir un autre geste. Prends aussi un moment pour réfléchir à ce qui motive ta générosité. Aucun versement n’est demandé par ce défi.',
  adapter:'Tu peux choisir un geste non financier ou garder cette semaine comme un temps d’écoute et de réflexion. Ne note pas de nom, de montant ou de situation privée dans une déclaration de défi.',
  relire:'Qu’as-tu appris sur une manière respectueuse d’aider ?'},
 {du:22,au:28,titre:'Faire une place au discernement',objectif:'Prendre du recul avant une décision ordinaire.',
  texte:'Choisis une décision ordinaire sur laquelle tu peux prendre un peu de recul. Accorde-lui un temps de prière, distingue les faits connus de la pression ressentie et formule la question qui reste ouverte. Le parcours ne prétend pas recevoir une réponse divine à ta place. Il t’invite à exercer une attention plus paisible.',
  adapter:'Tu peux garder une question ouverte ou demander un éclairage approprié. Ce défi ne remplace pas une aide professionnelle pour une décision qui en nécessite une.',
  relire:'Qu’as-tu mieux compris en ralentissant ?'},
 {du:29,au:30,titre:'Choisir la suite avec clarté',
  texte:'Relis un apprentissage, une difficulté et une habitude que tu souhaites poursuivre. Choisis un prochain pas réaliste. Ce bilan ne déclenche ni renouvellement ni paiement.',
  questions:['Qu’aimerais-tu conserver ?','De quelle aide as-tu encore besoin ?','Quel prochain pas choisis-tu ?']},
];
/** Défi du jour de mois (1 à 30). */
export const defiDuJour=(jourDuMois:number)=>defisHabitudesFr.find(d=>jourDuMois>=d.du&&jourDuMois<=d.au);
