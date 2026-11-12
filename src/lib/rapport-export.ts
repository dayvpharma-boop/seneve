import type {Rapport} from '@/lib/rapport-financier';

/** Export du rapport en document Word (.doc) : un HTML que Word, Pages et Google Docs ouvrent directement,
 * sans bibliothèque supplémentaire et sans connexion. (12/11/2026) */
const echapper=(t:string)=>t.replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]!));

export function rapportEnHtml(r:Rapport,o:{titre:string;periode:string;genereLe:string;nombre:(c:number)=>string;en:boolean}){
 const l=(fr:string,en:string)=>o.en?en:fr,n=(c:number)=>`${o.nombre(c)} ${r.devise}`,s=(c:number)=>`${c>0?'+ ':c<0?'− ':''}${o.nombre(Math.abs(c))}`;
 const tr=(cells:string[],gras=false)=>`<tr>${cells.map((x,i)=>`<td style="padding:5px 8px;border-bottom:1px solid #e5e5ea;${i>0?'text-align:right;white-space:nowrap;':''}${gras?'font-weight:bold;':''}">${x}</td>`).join('')}</tr>`;
 const th=(cells:string[],gauche=1)=>`<tr>${cells.map((x,i)=>`<th style="padding:6px 8px;background:#f2f2f7;border-bottom:1px solid #c7c7cc;font-size:10pt;${i>=gauche?'text-align:right;':'text-align:left;'}">${x}</th>`).join('')}</tr>`;
 const table=(contenu:string)=>`<table width="100%" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:10.5pt;margin:4px 0 14px">${contenu}</table>`;
 const h2=(t:string)=>`<h2 style="font-size:13pt;margin:18px 0 6px;color:#25235f">${echapper(t)}</h2>`;
 const R=r.resume;
 let html=`<h1 style="font-size:18pt;margin:0 0 2px">${echapper(o.titre)}</h1><p style="margin:0 0 4px;font-size:11pt">${echapper(o.periode)} · ${r.devise}</p><p style="margin:0 0 12px;font-size:9pt;color:#6e6e73">${echapper(l(`Créé le ${o.genereLe}. Ce rapport reprend uniquement ce que tu as enregistré dans SÉNEVÉ.`,`Created on ${o.genereLe}. This report only uses what you recorded in SÉNEVÉ.`))}</p>`;
 html+=h2(l('Résumé','Summary'))+table([
  tr([l('Encaissé (montant exact reçu)','Received (exact amount)'),n(R.encaisse)],true),
  ...(R.benefice!==null?[tr([l('Bénéfice de l’activité','Business profit'),n(R.benefice)])]:[]),
  tr([l('Réparti dans les caisses et objectifs','Allocated to counters and goals'),n(R.reparti)]),
  tr([l('Donné','Given'),n(R.donne)]),tr([l('Dépensé','Spent'),n(R.depense)]),tr([l('Investi','Invested'),n(R.investi)]),tr([l('Autre','Other'),n(R.autre)]),
  tr([l('Remboursé sur les dettes','Repaid on debts'),n(R.dettes)]),
  ...(R.depensesHorsCaisse?[tr([l('Dépenses notées hors caisse','Expenses not from a counter'),n(R.depensesHorsCaisse)])]:[]),
  ...(R.pasReparti!==null?[tr([l('Pas encore réparti (à ce jour)','Not yet allocated (today)'),n(R.pasReparti)])]:[]),
 ].join(''));
 if(r.activite){const a=r.activite;html+=h2(l('Activité','Business'))+table([tr([l('Ventes encaissées','Sales received'),n(a.ventes)]),tr([l('Coût des marchandises','Cost of goods'),'− '+n(a.marchandises)]),tr([l('Autres frais','Other costs'),'− '+n(a.frais)]),tr([l('Charges du mois payées','Monthly costs paid'),'− '+n(a.charges)]),tr([a.benefice<0?l('Perte','Loss'):l('Bénéfice','Profit'),n(a.benefice)],true),...(a.marge!==null?[tr([l('Marge','Margin'),`${a.marge} %`])]:[])].join(''));}
 if(r.caisses.length)html+=h2(l('Caisses et objectifs','Counters and goals'))+table(th([l('Caisse','Counter'),l('Entrées','In'),l('Sorties','Out'),l('Solde à la fin','Balance at end')])+r.caisses.map(x=>tr([`${echapper(x.nom)}<br><span style="font-size:9pt;color:#6e6e73">${echapper(x.sous)}</span>`,o.nombre(x.entrees),o.nombre(x.sorties),o.nombre(x.soldeFin)])).join(''));
 if(r.depensesParCategorie.length)html+=h2(l('Dépenses par catégorie','Expenses by category'))+table(th([l('Catégorie','Category'),l('Montant','Amount'),'%'])+r.depensesParCategorie.map(x=>tr([echapper(x.nom),o.nombre(x.centimes),`${x.pct} %`])).join('')+tr([l('Total','Total'),o.nombre(r.depensesParCategorie.reduce((t,x)=>t+x.centimes,0)),'100 %'],true));
 if(r.dettes.length)html+=h2(l('Dettes','Debts'))+table(th([l('Dette','Debt'),l('Remboursé','Repaid'),l('Reste à rembourser','Left to repay')])+r.dettes.map(x=>tr([echapper(x.nom),o.nombre(x.rembourse),o.nombre(x.reste)])).join(''));
 html+=h2(l('Détail des opérations','Operations in detail'))+(r.operations.length?table(th([l('Date','Date'),l('Caisse','Counter'),l('Opération','Operation'),l('Montant','Amount')],3)+r.operations.map(x=>`<tr><td style="padding:5px 8px;border-bottom:1px solid #e5e5ea;white-space:nowrap">${x.date.split('-').reverse().join('/')}${x.heure?` ${x.heure}`:''}</td><td style="padding:5px 8px;border-bottom:1px solid #e5e5ea">${echapper(x.caisse)}</td><td style="padding:5px 8px;border-bottom:1px solid #e5e5ea">${echapper(x.libelle)}${x.note?`<br><span style="font-size:9pt;color:#6e6e73">${echapper(x.note)}</span>`:''}</td><td style="padding:5px 8px;border-bottom:1px solid #e5e5ea;text-align:right;white-space:nowrap;color:${x.centimes<0?'#c00':'#1b7a3d'}">${s(x.centimes)}</td></tr>`).join('')):`<p style="font-size:10.5pt">${l('Aucune opération sur cette période.','No operation in this period.')}</p>`);
 return html;
}

export function telechargerWord(html:string,titre:string,nomFichier:string){
 const doc=`<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${echapper(titre)}</title><style>@page{size:21cm 29.7cm;margin:2cm}body{font-family:Calibri,Arial,sans-serif;color:#1d1d1f}</style></head><body>${html}</body></html>`;
 const blob=new Blob(['﻿',doc],{type:'application/msword'});
 const url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download=nomFichier;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),4000);
}
