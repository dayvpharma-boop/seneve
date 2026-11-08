import {retourPrecedent} from '@/lib/retour-precedent';
import './bibliotheque-moderne.css';
import './fiche-livre.css';
import './livre-audio.css';
import './livre-pdf.css';
import {useEnLigne} from '@/lib/hors-ligne';
import {AvatarParticipant} from '@/components/AvatarParticipant';
import {IconeRayonnage} from '@/components/IconeRayonnage';
import {useEffect} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {IconeBibliotheque as I} from '@/components/IconeBibliotheque';
import {LIVRE,BOOK,FORMATS_LIVRE,SOMMAIRE_LIVRE,SOMMAIRE_BOOK,DECALAGE_PAGES_PDF} from '@/lib/livre';
import {Apparence} from '@/components/Apparence';
import {BarreNav} from '@/components/BarreNav';
import {LivreFormatAcces} from '@/components/LivreFormatAcces';

function Couverture({petite=false,en=false,ouvrage='livre'}:{petite?:boolean;en?:boolean;ouvrage?:'livre'|'habitudes'}){
 const L=en?BOOK:LIVRE;
 // Couvertures peintes de novembre 2026 (mêmes images que drjustintshims.com).
 const base=`${import.meta.env.BASE_URL}illustrations/couverture-${ouvrage}-${en?'en':'fr'}-v1-`;
 const alt=ouvrage==='habitudes'?(en?'Cover From seed to tree, Habits & Challenges 180 days, by Dr Justin Tshims':'Couverture De la graine à l’arbre, Habitudes & Défis 180 jours, par Dr Justin Tshims'):(en?`Cover of ${L.titre}, by ${L.auteur}`:`Couverture du livre ${L.titre}, par ${L.auteur}`);
 return <img className={`bl-couverture bl-couverture-image ${petite?'bl-petite':''}`} src={`${base}683.webp`} srcSet={`${base}200.webp 200w, ${base}683.webp 683w`} sizes={petite?'100px':'154px'} width={683} height={1024} alt={alt}/>;
}

export function Bibliotheque({detail=false,format}:{detail?:boolean;format?:'audio'|'pdf'}){
 const enLigne=useEnLigne();
 const[params,setParams]=useSearchParams();const filtre=params.get('format');const actif=filtre==='audio'||filtre==='pdf'?filtre:'tous';
 const en=params.get('lang')==='en';const lang=en?'en':'fr';const L=en?BOOK:LIVRE;const suffixe=en?'?lang=en':'';
 useEffect(()=>{document.title=`${format?(format==='audio'?(en?'Audiobook':'Livre audio'):(en?'Digital book · PDF':'Livre numérique · PDF'))+' · '+L.titre:detail?L.titre:(en?'Library':'Bibliothèque')} — SÉNEVÉ`;document.documentElement.lang=lang;},[detail,format,L.titre,en,lang]);
 const formatNom=format==='audio'?(en?'Audiobook':'Livre audio'):(en?'Digital book · PDF':'Livre numérique · PDF');
 return <main className={detail?`bl-page ios bl-fiche${format==='audio'?' bl-audio':format==='pdf'?' bl-pdf':''}`:'bl-page ios'}>
  <header className="bl-header">
   {detail?<Link onClick={retourPrecedent} to={`/bibliotheque${suffixe}`} aria-label={en?'Back to library':'Revenir à la bibliothèque'}><I nom="arrow_back"/></Link>:<img src={`${import.meta.env.BASE_URL}icons/icon.svg`} alt=""/>}
   <div><span>SÉNEVÉ</span><strong>{format?(format==='audio'?(en?'Audiobook':'Livre audio'):(en?'Digital book · PDF':'Livre numérique · PDF')):detail?(en?'The book':'Le livre'):(en?'Library':'Bibliothèque')}</strong></div>
   <Link className="bl-profil" to={`/profil${suffixe}`} aria-label={en?'My profile':'Mon profil'}><AvatarParticipant><I nom="person" taille={22}/></AvatarParticipant></Link>
  </header>
  <div className="bl-contenu">
   {!enLigne&&<aside className="bl-hors-ligne" role="status"><I nom="lock" taille={20}/><div><strong>{detail?(en?'Book details offline':'Fiche du livre hors connexion'):(en?'Offline library':'Bibliothèque hors connexion')}</strong><p>{en?'You can view this previously loaded page. Reconnect to check your access or send a request for help.':'Tu peux consulter cette page déjà chargée. Reconnecte-toi pour vérifier tes accès ou envoyer une demande d’aide.'}</p></div></aside>}
   {!detail?<>
    <div className="bl-intro"><p className="bl-label"><IconeRayonnage taille={18}/>{en?'The book and its formats':'Le livre et ses formats'}</p><h1>{en?'My library':'Ma bibliothèque'}</h1><p className="bl-soustitre">{en?'Read, listen, and walk a little further.':'Lire, écouter et avancer un peu plus loin.'}</p></div>
    <nav className="bl-filtres" aria-label={en?'Book formats':'Formats du livre'}>{(['tous','audio','pdf'] as const).map(f=><button key={f} type="button" aria-pressed={actif===f} onClick={()=>setParams(p=>{const n=new URLSearchParams(p);if(f==='tous')n.delete('format');else n.set('format',f);return n;})}>{f==='tous'?(en?'All':'Tous'):f==='audio'?'Audio':'PDF'}</button>)}</nav>
    <div className="bl-rayonnage"><div className="bl-ouvrages"><article className="bl-card bl-livre-carte"><div className="bl-livre-identite"><Couverture petite en={en}/><div><span className="bl-label">{en?'English edition':'Édition française'}</span><h2>{L.titre}</h2><p>{L.auteur}</p><span className="bl-statut"><I nom="lock" taille={16}/>{en?'PDF and audio for buyers':'PDF et audio pour les acheteurs'}</span></div></div>
     <div className="bl-liste-formats">{FORMATS_LIVRE.filter(f=>actif==='tous'||f.id===actif).map(f=><Link key={f.id} to={`/livre/${f.id}${suffixe}`}><I nom={f.icone}/><span><strong>{f.id==='audio'?(en?'Audiobook':'Livre audio'):(en?'Digital book · PDF':'Livre numérique · PDF')}</strong><small>{en?'For buyers':'Pour les acheteurs'}</small></span><I nom="chevron_right"/></Link>)}</div>
     <Link className="bl-principal" to={`/livre${suffixe}`}>{en?'Discover the book':'Découvrir le livre'}<I nom="east" taille={20}/></Link>
    </article>
    {/* Habitudes & Défis présenté comme le livre (demande du 02/11/2026) ; les filtres Audio et PDF ne concernent que le livre. */}
    {actif==='tous'&&<article className="bl-card bl-livre-carte bl-hd-carte"><div className="bl-livre-identite"><Couverture petite en={en} ouvrage="habitudes"/><div><span className="bl-label">{en?'Habits & Challenges · 180 days':'Habitudes & Défis · 180 jours'}</span><h2>{en?'From seed to tree':'De la graine à l’arbre'}</h2><p>{en?'Every small, faithful habit becomes a great tree.':'Chaque petite habitude fidèle devient un grand arbre.'}</p><span className="bl-statut"><I nom="spa" taille={16}/>{en?'30 days free':'30 jours gratuits'}</span></div></div>
     <Link className="bl-principal" to={`/habitudes${suffixe}`}>{en?'Discover the journey':'Découvrir le parcours'}<I nom="east" taille={20}/></Link>
    </article>}</div>
    <div className="bl-complements">
    {/* « Parcours & offres » déplacé du bas de l'espace vers la bibliothèque (demande du 24/10/2026). */}
    <aside className="bl-acces bl-parcours"><img className="bl-formation-image" src={`${import.meta.env.BASE_URL}illustrations/formation-groupe-v2-720.webp`} srcSet={`${import.meta.env.BASE_URL}illustrations/formation-groupe-v2-720.webp 720w, ${import.meta.env.BASE_URL}illustrations/formation-groupe-v2-1440.webp 1440w`} sizes="(max-width:560px) calc(100vw - 12px), 720px" width={1440} height={626} alt={en?'An instructor guiding a small group of adult learners with books and notebooks':'Un formateur accompagne un groupe d’adultes avec des livres et des carnets'} loading="lazy" decoding="async"/><IconeRayonnage taille={24}/><div><h2>{en?'Journeys & offers':'Parcours & offres'}</h2><p>{en?'Paths of spiritual practice, at the pace of your daily life.':'Des chemins d’enracinement intérieur, au rythme de ton quotidien.'}</p><Link className="bl-acces-bouton" to={`/offres${suffixe}`}><IconeRayonnage taille={20}/><span>{en?'View the journeys and offers':'Voir les parcours et offres'}</span><I nom="east" taille={20}/></Link></div></aside>
    <aside className="bl-acces"><I nom="lock"/><div><h2>{en?'My purchases and access':'Mes achats et accès'}</h2><p>{en?'View the access linked to your account.':'Retrouve les accès liés à ton compte.'}</p><Link className="bl-acces-bouton" to={`/acces${suffixe}`}><I nom="lock" taille={20}/><span>{en?'View my access':'Consulter mes accès'}</span><I nom="east" taille={20}/></Link></div></aside>
    <section className="bl-edition"><span className="bl-label"><I nom="translate" taille={18}/>{en?'Also in French':'Aussi en anglais'}</span><h2>{en?LIVRE.titre:BOOK.titre}</h2><p>{en?'The French edition of the same book.':'L’édition anglaise du même livre.'}</p><Link to={en?'/offres?lang=fr':'/offres?lang=en'}>{en?'View the French offers':'Voir les offres en anglais'} →</Link></section></div></div>
   </>:<>
    <section className="bl-fiche-identite" aria-label={en?'Book details':'Fiche du livre'}><div className="bl-detail-cover"><Couverture en={en}/></div><div className="bl-detail-titre"><span className="bl-label">{format==='audio'?<><I nom="headphones" taille={16}/>{en?'Audiobook · English edition':'Livre audio · Édition française'}</>:format==='pdf'?<><I nom="description" taille={16}/>{en?'PDF · English edition':'PDF · Édition française'}</>:(en?'The principles of the Kingdom':'Les principes du Royaume')}</span><h1>{L.titre}</h1><p>{L.sousTitre}</p><strong>{L.auteur}</strong></div></section>
    <div className="bl-fiche-formats" aria-label={en?'Book formats':'Formats du livre'}>
    {format&&enLigne&&<LivreFormatAcces format={format} langue={lang}/>}
    {format&&<p className="lf-aide"><Link to={`/aide?motif=${format==='audio'?'livre-audio':'livre-pdf'}${en?'&lang=en':''}`}>{en?'A question about this format?':'Une question sur ce format ?'} →</Link></p>}
    {(format?[]:FORMATS_LIVRE).map(f=><section className="bl-card bl-format" key={f.id}><div className="bl-format-titre"><I nom={f.icone} taille={30}/><h2>{f.id==='audio'?(en?'Audiobook':'Livre audio'):(en?'Digital book · PDF':'Livre numérique · PDF')}</h2><span className="bl-statut">{en?'For buyers':'Pour les acheteurs'}</span></div><p>{f.id==='audio'?(en?'Once purchased, listen to the book right here, part by part, at your own pace.':'Une fois acheté, écoute le livre ici même, partie par partie, à ton rythme.'):(en?'Once purchased, read the book right here, page by page.':'Une fois acheté, lis le livre ici même, page par page.')}</p><Link className="bl-principal" to={`/livre/${f.id}${suffixe}`}><I nom={f.id==='audio'?'headphones':'description'}/>{f.id==='audio'?(en?'Listen to the book':'Écouter le livre'):(en?'Read the book':'Lire le livre')}</Link><Link to={`/aide?motif=${f.id==='audio'?'livre-audio':'livre-pdf'}${en?'&lang=en':''}`}>{en?'A question about this format?':'Une question sur ce format ?'} →</Link></section>)}</div>
    {/* Sommaire complet (04/11/2026) : chaque partie ouvre le livre PDF à sa page ; le serveur garde la lecture réservée aux acheteurs. */}<section className="bl-sommaire"><div><h2>{en?'Contents':'Sommaire de l’enseignement'}</h2><span className="bl-statut">{en?'7 chapters · 4 appendices':'7 chapitres · 4 annexes'}</span></div><p>{format==='audio'?(en?'The full table of contents of the book.':'Le sommaire complet du livre.'):(en?'Tap a part to open the book at that page.':'Touche une partie pour ouvrir le livre à cette page.')}</p><ol>{(en?SOMMAIRE_BOOK:SOMMAIRE_LIVRE).map((c,i)=>{const contenu=<><span className="bl-numero">{String(i+1).padStart(2,'0')}</span><div><h3>{c.titre}</h3><p>{en?'Printed page':'Page imprimée'} {c.page}</p></div><I nom={format==='audio'?'headphones':'menu_book'} taille={20}/></>;return <li key={c.page}>{format==='audio'?contenu:<Link className="bl-sommaire-lien" to={`/livre/pdf?page=${c.page+DECALAGE_PAGES_PDF}${en?'&lang=en':''}`} aria-label={en?`Open the book: ${c.titre}, page ${c.page}`:`Ouvrir le livre : ${c.titre}, page ${c.page}`}>{contenu}</Link>}</li>;})}</ol></section>
    {!format&&<figure className="bl-citation"><I nom="format_quote" taille={42}/><blockquote>{en?'“God does not examine your dreams. He examines your habits.”':'« Dieu n’examine pas tes rêves. Il examine tes habitudes. »'}</blockquote><figcaption>Dr Justin Tshims · {en?'Appendix 4':'Annexe 4'}</figcaption></figure>}
   </>}
   <footer className="bl-footer"><I nom="spa" taille={28}/><strong>SÉNEVÉ · {en?'One step every day':'Un pas chaque jour'}</strong><Link to={`/confidentialite${suffixe}`}>{en?'Privacy':'Confidentialité'}</Link><Apparence langue={lang}/></footer>
  </div>
  <BarreNav langue={lang} maquette iconesJournee/>
 </main>;
}
