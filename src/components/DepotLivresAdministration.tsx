import '@/routes/livre-pdf.css';
import {useCallback,useEffect,useState} from 'react';
import {supabase} from '@/lib/supabase';
import {COFFRE_LIVRES,cheminPdf,cheminPiste,nomPiste,pistesAudio,type LangueLivre} from '@/lib/livre-fichiers';

const TAILLE_MAX=50*1024*1024;
type Etat={pdf:Record<LangueLivre,boolean>;audio:Record<LangueLivre,string[]>};
/** Dépôt du livre PDF et du livre audio dans le coffre privé (administrateur seulement, règle seneve_061).
 * Les pistes audio sont rangées dans l'ordre alphabétique des fichiers choisis : 01.mp3, 02.mp3… */
export function DepotLivresAdministration(){
 const [etat,setEtat]=useState<Etat|null>(null),[occupe,setOccupe]=useState(''),[message,setMessage]=useState(''),[erreur,setErreur]=useState('');
 const charger=useCallback(async()=>{
  const pdf=async(lg:LangueLivre)=>{const r=await supabase.storage.from(COFFRE_LIVRES).list(`pdf/${lg}`);if(r.error)throw r.error;return (r.data??[]).some(f=>f.name==='livre.pdf');};
  try{const [pf,pe,af,ae]=await Promise.all([pdf('fr'),pdf('en'),pistesAudio('fr'),pistesAudio('en')]);setEtat({pdf:{fr:pf,en:pe},audio:{fr:af,en:ae}});}
  catch{setErreur('Le coffre des livres ne peut pas être lu avec ce compte.');}
 },[]);
 useEffect(()=>{void charger();},[charger]);
 async function deposerPdf(lg:LangueLivre,f:File|undefined){
  if(!f)return;setMessage('');setErreur('');
  if(f.type!=='application/pdf'||f.size>TAILLE_MAX){setErreur('Choisis un fichier PDF de 50 Mo au plus.');return;}
  setOccupe(`pdf-${lg}`);
  const r=await supabase.storage.from(COFFRE_LIVRES).upload(cheminPdf(lg),f,{upsert:true,contentType:'application/pdf'});
  setOccupe('');if(r.error){setErreur('Le PDF n’a pas été déposé. Réessaie.');return;}
  setMessage(`PDF ${lg==='fr'?'français':'anglais'} déposé.`);void charger();
 }
 async function deposerAudio(lg:LangueLivre,liste:FileList|null){
  const fichiers=[...(liste??[])].sort((a,b)=>a.name.localeCompare(b.name,'fr',{numeric:true}));
  if(!fichiers.length)return;setMessage('');setErreur('');
  if(fichiers.length>99||fichiers.some(f=>!['audio/mpeg','audio/mp3'].includes(f.type)||f.size>TAILLE_MAX)){setErreur('Choisis des fichiers MP3 de 50 Mo au plus chacun (99 au maximum).');return;}
  if(!window.confirm(`Remplacer toutes les pistes ${lg==='fr'?'françaises':'anglaises'} par ces ${fichiers.length} fichiers, dans cet ordre ?\n\n${fichiers.map((f,i)=>`${nomPiste(i+1)} ← ${f.name}`).join('\n')}`))return;
  setOccupe(`audio-${lg}`);
  try{
   const anciennes=await pistesAudio(lg);
   for(const [i,f] of fichiers.entries()){
    setMessage(`Dépôt ${i+1} sur ${fichiers.length}…`);
    const r=await supabase.storage.from(COFFRE_LIVRES).upload(cheminPiste(lg,nomPiste(i+1)),f,{upsert:true,contentType:'audio/mpeg'});
    if(r.error)throw r.error;
   }
   const enTrop=anciennes.filter(n=>Number(n.slice(0,2))>fichiers.length).map(n=>cheminPiste(lg,n));
   if(enTrop.length){const r=await supabase.storage.from(COFFRE_LIVRES).remove(enTrop);if(r.error)throw r.error;}
   setMessage(`${fichiers.length} pistes ${lg==='fr'?'françaises':'anglaises'} déposées.`);
  }catch{setErreur('Le dépôt s’est arrêté avant la fin. Les pistes déjà envoyées sont conservées ; recommence avec les mêmes fichiers.');setMessage('');}
  finally{setOccupe('');void charger();}
 }
 const langues:[LangueLivre,string][]=[['fr','Français'],['en','Anglais']];
 return <section className="edition-admin dl-depot" aria-label="Livre PDF et audio">
  <h2>Livre PDF et livre audio</h2>
  <p>Fichiers lisibles seulement par les acheteurs du format et de la langue (et par les administrateurs). Espace total du stockage : 1 Go, toutes données comprises.</p>
  {erreur&&<p role="alert">{erreur}</p>}{message&&<p role="status">{message}</p>}
  {!etat?<p role="status">Lecture du coffre…</p>:<div className="dl-grille">
   {langues.map(([lg,nom])=><fieldset key={lg} disabled={!!occupe}><legend>{nom}</legend>
    <p><strong>PDF :</strong> {etat.pdf[lg]?'déposé':'absent'}</p>
    <label>{etat.pdf[lg]?'Remplacer le PDF':'Déposer le PDF'}<input type="file" accept="application/pdf" onChange={e=>{void deposerPdf(lg,e.target.files?.[0]);e.target.value='';}}/></label>
    <p><strong>Audio :</strong> {etat.audio[lg].length?`${etat.audio[lg].length} pistes`:'aucune piste'}</p>
    <label>{etat.audio[lg].length?'Remplacer toutes les pistes':'Déposer les pistes (MP3)'}<input type="file" accept="audio/mpeg,.mp3" multiple onChange={e=>{void deposerAudio(lg,e.target.files);e.target.value='';}}/></label>
    {occupe.endsWith(lg)&&<p role="status">Envoi en cours…</p>}
   </fieldset>)}
  </div>}
 </section>;
}
