import type {DefiHabitudes} from './habitudes-defis-fr';
/** Version anglaise des quatre défis hebdomadaires et du bilan des jours 29–30, validée par Dr Justin Tshims le 28/10/2026
 * (« C'est bon »). Texte repris sans changement de editorial/habitudes-defis/mois-1-en-relecture.md. Lecture seule. */
export const defisHabitudesEn:DefiHabitudes[]=[
 {du:1,au:7,titre:'Prepare a faithful appointment',objectif:'Choose a realistic daily appointment and observe how you practice it.',
  texte:'This week, choose among your habits one appointment you want to prepare better: prayer, reading or gratitude. Check its time and plan what can help you enter into it calmly. Each time, declare only what you actually did. If you miss it, prepare the next one; you are not starting from zero.',
  adapter:'You can move the time, prepare your material in advance or ask for help to understand the activity. Partial completion is still useful information.',
  relire:'What made this appointment easier, and which adjustment do you want to keep?'},
 {du:8,au:14,titre:'Take care of a responsibility',objectif:'Bring attention and honesty to an existing responsibility.',
  texte:'Choose a responsibility already present in your life: work, study, a family task or a personal commitment. Define one concrete step you can reasonably carry out this week. Take time to prepare it and to recognize what is finished or still in progress. This is not about piling up tasks to get a better score.',
  adapter:'If your schedule changes, make the step smaller or explain what was not possible. This challenge does not make your worth depend on a job, an income or a performance.',
  relire:'What new attention have you given to this responsibility?'},
 {du:15,au:21,titre:'Practice attentive generosity',objectif:'Reflect on help that is free, respectful and suited to your means.',
  texte:'Notice a need around you without exposing the person concerned. If they wish it and if you can, offer suitable help: listening, doing a favor, giving time or choosing another gesture. Also take a moment to reflect on what motivates your generosity. This challenge asks for no payment.',
  adapter:'You can choose a non-financial gesture or keep this week as a time of listening and reflection. Do not write a name, an amount or a private situation in a challenge declaration.',
  relire:'What have you learned about a respectful way of helping?'},
 {du:22,au:28,titre:'Make room for discernment',objectif:'Step back before an ordinary decision.',
  texte:'Choose an ordinary decision you can step back from a little. Give it a time of prayer, separate the known facts from the pressure you feel, and put into words the question that remains open. The program does not claim to receive a divine answer in your place. It invites you to practice a more peaceful attention.',
  adapter:'You can keep a question open or ask for appropriate advice. This challenge does not replace professional help for a decision that needs it.',
  relire:'What have you understood better by slowing down?'},
 {du:29,au:30,titre:'Choose what comes next with clarity',
  texte:'Read over one thing you learned, one difficulty and one habit you want to continue. Choose a realistic next step. This review triggers neither renewal nor payment.',
  questions:['What would you like to keep?','What help do you still need?','Which next step do you choose?']},
];
/** Défi du jour de mois (1 à 30), en anglais. */
export const defiDuJourEn=(jourDuMois:number)=>defisHabitudesEn.find(d=>jourDuMois>=d.du&&jourDuMois<=d.au);
