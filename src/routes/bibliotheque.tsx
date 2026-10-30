import './bibliotheque-moderne.css';
import './fiche-livre.css';
import './livre-audio.css';
import './livre-pdf.css';
import {useEnLigne} from '@/lib/hors-ligne';
import { IllustrationPage } from '@/components/IllustrationPage';
import {AvatarParticipant} from '@/components/AvatarParticipant';
import {IconeRayonnage} from '@/components/IconeRayonnage';
import {useEffect} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {IconeBibliotheque as I} from '@/components/IconeBibliotheque';
import {LIVRE,BOOK,FORMATS_LIVRE} from '@/lib/livre';
import {Apparence} from '@/components/Apparence';
import {BarreNav} from '@/components/BarreNav';

function Couverture({petite=false,en=false}:{petite?:boolean;en?:boolean}){
 const L=en?BOOK:LIVRE;
 return <div className={`bl-couverture ${petite?'bl-petite':''}`} role="img" aria-label={`${L.titre}, ${L.auteur}`}>
  <span className="bl-marque">SÉNEVÉ</span><I nom="spa" taille={36}/><strong>{en?<>Stop<br/>Begging for<br/>Miracles</>:<>Arrête de<br/>mendier des<br/>miracles</>}</strong><span className="bl-filet"/><small>{L.sousTitre}</small><span className="bl-auteur">{L.auteur}</span>
 </div>;
}

export function Bibliotheque({detail=false,format}:{detail?:boolean;format?:'audio'|'pdf'}){
 const enLigne=useEnLigne();
 const[params,setParams]=useSearchParams();const filtre=params.get('format');const actif=filtre==='audio'||filtre==='pdf'?filtre:'tous';
 const en=params.get('lang')==='en';const lang=en?'en':'fr';const L=en?BOOK:LIVRE;const suffixe=en?'?lang=en':'';
 useEffect(()=>{document.title=`${format?(format==='audio'?(en?'Audiobook':'Livre audio'):(en?'Digital book · PDF':'Livre numérique · PDF'))+' · '+L.titre:detail?L.titre:(en?'Library':'Bibliothèque')} — SÉNEVÉ`;document.documentElement.lang=lang;},[detail,format,L.titre,en,lang]);
 const formatNom=format==='audio'?(en?'Audiobook':'Livre audio'):(en?'Digital book · PDF':'Livre numérique · PDF');
 return <main className={detail?`bl-page bl-fiche${format==='audio'?' bl-audio':format==='pdf'?' bl-pdf':''}`:'bl-page'}>
  <header className="bl-header">
   {detail?<Link to={`/bibliotheque${suffixe}`} aria-label={en?'Back to library':'Revenir à la bibliothèque'}><I nom="arrow_back"/></Link>:<img src={`${import.meta.env.BASE_URL}icons/icon.svg`} alt=""/>}
   <div><span>SÉNEVÉ</span><strong>{format?(format==='audio'?(en?'Audiobook':'Livre audio'):(en?'Digital book · PDF':'Livre numérique · PDF')):detail?(en?'The book':'Le livre'):(en?'Library':'Bibliothèque')}</strong></div>
   <Link className="bl-profil" to={`/profil${suffixe}`} aria-label={en?'My profile':'Mon profil'}><AvatarParticipant><I nom="person" taille={22}/></AvatarParticipant></Link>
  </header>
  <div className="bl-contenu">
   {!enLigne&&<aside className="bl-hors-ligne" role="status"><I nom="lock" taille={20}/><div><strong>{detail?(en?'Book details offline':'Fiche du livre hors connexion'):(en?'Offline library':'Bibliothèque hors connexion')}</strong><p>{en?'You can view this previously loaded page. Reconnect to check your access or send a request for help.':'Tu peux consulter cette page déjà chargée. Reconnecte-toi pour vérifier tes accès ou envoyer une demande d’aide.'}</p></div></aside>}
   {!detail?<>
    <div className="bl-intro"><p className="bl-label"><IconeRayonnage taille={18}/>{en?'The book and its formats':'Le livre et ses formats'}</p><h1>{en?'My library':'Ma bibliothèque'}</h1><p className="bl-soustitre">{en?'Read, listen, and walk a little further.':'Lire, écouter et avancer un peu plus loin.'}</p></div>
    <IllustrationPage theme="bibliotheque" langue={lang} photoAvantTexte />
    <nav className="bl-filtres" aria-label={en?'Book formats':'Formats du livre'}>{(['tous','audio','pdf'] as const).map(f=><button key={f} type="button" aria-pressed={actif===f} onClick={()=>setParams(p=>{const n=new URLSearchParams(p);if(f==='tous')n.delete('format');else n.set('format',f);return n;})}>{f==='tous'?(en?'All':'Tous'):f==='audio'?'Audio':'PDF'}</button>)}</nav>
    <div className="bl-rayonnage"><article className="bl-card bl-livre-carte"><div className="bl-livre-identite"><Couverture petite en={en}/><div><span className="bl-label">{en?'English edition':'Édition française'}</span><h2>{L.titre}</h2><p>{L.auteur}</p><span className="bl-statut"><I nom="schedule" taille={16}/>{en?'Formats in preparation':'Formats en préparation'}</span></div></div>
     <div className="bl-liste-formats">{FORMATS_LIVRE.filter(f=>actif==='tous'||f.id===actif).map(f=><Link key={f.id} to={`/livre/${f.id}${suffixe}`}><I nom={f.icone}/><span><strong>{f.id==='audio'?(en?'Audiobook':'Livre audio'):(en?'Digital book · PDF':'Livre numérique · PDF')}</strong><small>{en?'In preparation':'En préparation'}</small></span><I nom="chevron_right"/></Link>)}</div>
     <Link className="bl-principal" to={`/livre${suffixe}`}>{en?'Discover the book':'Découvrir le livre'}<I nom="east" taille={20}/></Link>
    </article>
    <div className="bl-complements">
    {/* « Parcours & offres » déplacé du bas de l'espace vers la bibliothèque (demande du 24/10/2026). */}
    <aside className="bl-acces bl-parcours"><img className="bl-formation-image" src={`${import.meta.env.BASE_URL}illustrations/formation-groupe-v1-720.webp`} srcSet={`${import.meta.env.BASE_URL}illustrations/formation-groupe-v1-360.webp 360w, ${import.meta.env.BASE_URL}illustrations/formation-groupe-v1-720.webp 720w`} sizes="(max-width:560px) calc(100vw - 72px), 448px" width={720} height={314} alt={en?'An instructor guiding a small group of adult learners with books and notebooks':'Un formateur accompagne un groupe d’adultes avec des livres et des carnets'} loading="lazy" decoding="async"/><IconeRayonnage taille={24}/><div><h2>{en?'Journeys & offers':'Parcours & offres'}</h2><p>{en?'Paths of spiritual practice, at the pace of your daily life.':'Des chemins d’enracinement intérieur, au rythme de ton quotidien.'}</p><Link className="bl-acces-bouton" to={`/offres${suffixe}`}><IconeRayonnage taille={20}/><span>{en?'View the journeys and offers':'Voir les parcours et offres'}</span><I nom="east" taille={20}/></Link></div></aside>
    <aside className="bl-acces"><I nom="lock"/><div><h2>{en?'My purchases and access':'Mes achats et accès'}</h2><p>{en?'View the access linked to your account.':'Retrouve les accès liés à ton compte.'}</p><Link className="bl-acces-bouton" to={`/acces${suffixe}`}><I nom="lock" taille={20}/><span>{en?'View my access':'Consulter mes accès'}</span><I nom="east" taille={20}/></Link></div></aside>
    <section className="bl-edition"><span className="bl-label"><I nom="translate" taille={18}/>{en?'Also in French':'Aussi en anglais'}</span><h2>{en?LIVRE.titre:BOOK.titre}</h2><p>{en?'The French edition of the same book.':'L’édition anglaise du même livre.'}</p><Link to={en?'/offres?lang=fr':'/offres?lang=en'}>{en?'View the French offers':'Voir les offres en anglais'} →</Link></section></div></div>
   </>:<>
    <section className="bl-fiche-identite" aria-label={en?'Book details':'Fiche du livre'}><div className="bl-detail-cover"><Couverture en={en}/></div><div className="bl-detail-titre"><span className="bl-label">{format==='audio'?<><I nom="headphones" taille={16}/>{en?'Audiobook · English edition':'Livre audio · Édition française'}</>:format==='pdf'?<><I nom="description" taille={16}/>{en?'PDF · English edition':'PDF · Édition française'}</>:(en?'The principles of the Kingdom':'Les principes du Royaume')}</span><h1>{L.titre}</h1><p>{L.sousTitre}</p><strong>{L.auteur}</strong></div></section>
    <div className="bl-fiche-formats" aria-label={en?'Book formats':'Formats du livre'}>
    {(format?FORMATS_LIVRE.filter(f=>f.id===format):FORMATS_LIVRE).map(f=><section className="bl-card bl-format" key={f.id}><div className="bl-format-titre"><I nom={f.icone} taille={30}/><h2>{format?formatNom:f.id==='audio'?(en?'Audiobook':'Livre audio'):(en?'Digital book · PDF':'Livre numérique · PDF')}</h2><span className="bl-statut">{en?'In preparation':'En préparation'}</span></div><p>{f.id==='audio'?(en?'The complete audiobook will be available once the narration, voice and recordings have been approved.':'Le livre audio sera proposé après validation du texte de narration, de la voix et des enregistrements.'):(format==='pdf'?(en?'The PDF is not yet available in the app.':'Le PDF n’est pas encore disponible dans l’application.'):(en?'The PDF is not yet available in the app. If you have purchased the book, use the delivery link provided with your order.':'Le PDF n’est pas encore disponible dans l’application. Si tu as acheté le livre, utilise le lien de livraison reçu avec ta commande.'))}</p><button className="bl-indisponible" disabled><I nom={f.id==='audio'?'headset_off':'description'}/>{f.id==='audio'?(en?'Audio not yet available':'Audio bientôt disponible'):(en?'PDF not yet available':'PDF bientôt disponible')}</button><Link to={`/aide?motif=${f.id==='audio'?'livre-audio':'livre-pdf'}${en?'&lang=en':''}`}>{en?'A question about this format?':'Une question sur ce format ?'} →</Link></section>)}</div>
    {format==='pdf'&&<aside className="bl-pdf-livraison"><I nom="description" taille={22}/><div><h2>{en?'Delivery after an order':'Livraison après une commande'}</h2><p>{en?'If you have purchased the book, use the delivery link provided with your order. This is separate from opening the PDF in the app.':'Si tu as acheté le livre, utilise le lien de livraison reçu avec ta commande. Ce lien est distinct de l’ouverture du PDF dans l’application.'}</p></div></aside>}
    <section className="bl-sommaire"><div><h2>{en?'Contents':'Sommaire de l’enseignement'}</h2><span className="bl-statut">{en?'7 chapters':'7 chapitres'}</span></div><p>{format==='audio'?(en?'The book’s chapters. Recordings are not yet available here.':'Les chapitres du livre. Les enregistrements ne sont pas encore disponibles ici.'):(en?'The seven chapters of the book':'Les sept chapitres du livre')}</p><ol>{L.chapitres.map((c,i)=><li key={c.page}><span className="bl-numero">{String(i+1).padStart(2,'0')}</span><div><h3>{c.titre}</h3><p>{en?'Printed page':'Page imprimée'} {c.page}</p></div><I nom={format==='audio'?'headset_off':'menu_book'} taille={20}/></li>)}</ol></section>
    {!format&&<figure className="bl-citation"><I nom="format_quote" taille={42}/><blockquote>{en?'“God does not examine your dreams. He examines your habits.”':'« Dieu n’examine pas tes rêves. Il examine tes habitudes. »'}</blockquote><figcaption>Dr Justin Tshims · {en?'Appendix 4':'Annexe 4'}</figcaption></figure>}
   </>}
   <footer className="bl-footer"><I nom="spa" taille={28}/><strong>SÉNEVÉ · {en?'One step every day':'Un pas chaque jour'}</strong><Link to={`/confidentialite${suffixe}`}>{en?'Privacy':'Confidentialité'}</Link><Apparence langue={lang}/></footer>
  </div>
  <BarreNav langue={lang} maquette iconesJournee/>
 </main>;
}
