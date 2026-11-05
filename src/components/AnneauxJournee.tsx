/** Anneaux de la journée, façon app Forme (style iPhone validé par Dr Justin le 04/11/2026) :
 * la journée (actions faites), le mois du parcours (jour sur 30) et la semaine (jour sur 7). */
export function AnneauxJournee({realisees,total,jour,en}:{realisees:number;total:number;jour:number;en:boolean}){
 const l=(fr:string,english:string)=>en?english:fr;
 const jourMois=((jour-1)%30)+1,jourSemaine=((jour-1)%7)+1,semaine=Math.ceil(jourMois/7);
 const anneaux=[{r:44,part:total?realisees/total:0,classe:'journee'},{r:30,part:jourMois/30,classe:'mois'},{r:16,part:jourSemaine/7,classe:'semaine'}];
 const reste=Math.max(0,total-realisees);
 const titre=!total||realisees===0?l('Ta journée commence','Your day begins'):reste===0?l('Journée complète','Day complete'):realisees/total>=.5?l('Belle journée','Good day'):l('Un pas après l’autre','One step at a time');
 const phrase=!total?l('Tes activités arrivent.','Your activities are on their way.'):reste===0?l(`Les ${total} actions sont faites. Tu peux te reposer.`,`All ${total} actions are done. You can rest now.`)
  :l(`${realisees} action${realisees>1?'s':''} sur ${total} faite${realisees>1?'s':''}. Encore ${reste}, et ta journée est complète.`,`${realisees} of ${total} actions done. ${reste} more and your day is complete.`);
 return <section className="ios-anneaux" aria-label={l('Ma progression','My progress')}>
  <svg viewBox="0 0 104 104" width="104" height="104" aria-hidden="true">
   {anneaux.map(a=>{const c=2*Math.PI*a.r;return <g key={a.classe} className={`ios-anneau-${a.classe}`}><circle className="ios-anneau-fond" cx="52" cy="52" r={a.r}/><circle className="ios-anneau-trait" cx="52" cy="52" r={a.r} strokeDasharray={c} strokeDashoffset={c*(1-Math.min(1,a.part))}/></g>;})}
  </svg>
  <div><h2>{titre}</h2><p>{phrase}</p>
   <ul><li className="ios-anneau-journee">{l('Journée','Day')} · {realisees}/{total}</li><li className="ios-anneau-mois">{l(`Mois · jour ${jourMois} sur 30`,`Month · day ${jourMois} of 30`)}</li><li className="ios-anneau-semaine">{l(`Semaine ${semaine} · jour ${jourSemaine} sur 7`,`Week ${semaine} · day ${jourSemaine} of 7`)}</li></ul>
  </div>
 </section>;
}
