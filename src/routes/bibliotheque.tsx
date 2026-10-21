import {useEffect} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {IconeBibliotheque as I} from '@/components/IconeBibliotheque';
import {LIVRE,FORMATS_LIVRE} from '@/lib/livre';
import {Apparence} from '@/components/Apparence';

function Couverture({petite=false}:{petite?:boolean}){
 return <div className={`bl-couverture ${petite?'bl-petite':''}`} role="img" aria-label={`${LIVRE.titre}, ${LIVRE.auteur}`}>
  <span className="bl-marque">SÉNEVÉ</span><I nom="spa" taille={36}/><strong>Arrête de<br/>mendier des<br/>miracles</strong><span className="bl-filet"/><small>{LIVRE.sousTitre}</small><span className="bl-auteur">{LIVRE.auteur}</span>
 </div>;
}

export function Bibliotheque({detail=false,format}:{detail?:boolean;format?:'audio'|'pdf'}){
 const[params,setParams]=useSearchParams();const filtre=params.get('format');const actif=filtre==='audio'||filtre==='pdf'?filtre:'tous';
 const en=params.get('lang')==='en';const lang=en?'en':'fr';const suffixe=en?'?lang=en':'';
 useEffect(()=>{document.title=`${en?'Library':'Bibliothèque'} — SÉNEVÉ`;document.documentElement.lang=lang;},[en,lang]);
 const formatNom=format==='audio'?(en?'Audiobook':'Livre audio'):(en?'Digital book · PDF':'Livre numérique · PDF');
 return <main className="bl-page">
  <header className="bl-header">
   {detail?<Link to={`/bibliotheque${suffixe}`} aria-label={en?'Back to library':'Revenir à la bibliothèque'}><I nom="arrow_back"/></Link>:<img src={`${import.meta.env.BASE_URL}icons/icon.svg`} alt=""/>}
   <div><span>SÉNEVÉ</span><strong>{detail?(en?'The book':'Le livre'):(en?'Library':'Bibliothèque')}</strong></div>
   <Link className="bl-profil" to={`/profil${suffixe}`} aria-label={en?'My profile':'Mon profil'}><I nom="person" taille={22}/></Link>
  </header>
  <div className="bl-contenu">
   {!detail?<>
    <div className="bl-intro"><p className="bl-label"><I nom="auto_stories" taille={18}/>{en?'The book and its formats':'Le livre et ses formats'}</p><h1>{en?'My library':'Ma bibliothèque'}</h1><p className="bl-soustitre">{en?'Read, listen, and walk a little further.':'Lire, écouter et avancer un peu plus loin.'}</p></div>
    <nav className="bl-filtres" aria-label={en?'Book formats':'Formats du livre'}>{(['tous','audio','pdf'] as const).map(f=><button key={f} type="button" aria-pressed={actif===f} onClick={()=>setParams(p=>{const n=new URLSearchParams(p);if(f==='tous')n.delete('format');else n.set('format',f);return n;})}>{f==='tous'?(en?'All titles (1)':'Tous les titres (1)'):f==='audio'?(en?'Audiobooks':'Livres audio'):(en?'Digital books':'Livres numériques')}</button>)}</nav>
    <article className="bl-card"><div className="bl-livre-identite"><Couverture petite/><div><span className="bl-label">{en?'French edition':'Édition française'}</span><h2>{LIVRE.titre}</h2><p>{LIVRE.auteur}</p><span className="bl-statut"><I nom="schedule" taille={16}/>{en?'Formats in preparation':'Formats en préparation'}</span></div></div>
     <div className="bl-liste-formats">{FORMATS_LIVRE.filter(f=>actif==='tous'||f.id===actif).map(f=><Link key={f.id} to={`/livre/${f.id}${suffixe}`}><I nom={f.icone}/><span><strong>{f.id==='audio'?(en?'Audiobook':'Livre audio'):(en?'Digital book · PDF':'Livre numérique · PDF')}</strong><small>{en?'In preparation':'En préparation'}</small></span><I nom="chevron_right"/></Link>)}</div>
     <Link className="bl-principal" to={`/livre${suffixe}`}>{en?'Discover the book':'Découvrir le livre'}<I nom="east" taille={20}/></Link>
    </article>
    <aside className="bl-acces"><I nom="lock"/><div><h2>{en?'My purchases and access':'Mes achats et accès'}</h2><p>{en?'View the access linked to your account.':'Retrouve les accès liés à ton compte.'}</p><Link to={`/acces${suffixe}`}>{en?'View my access':'Consulter mes accès'} →</Link></div></aside>
    <section className="bl-edition"><span className="bl-label"><I nom="translate" taille={18}/>{en?'Also in English':'Aussi en anglais'}</span><h2>Stop Begging for Miracles</h2><p>{en?'The English edition of the same book.':'L’édition anglaise du même livre.'}</p><Link to="/offres?lang=en">{en?'View the English offers':'Voir les offres en anglais'} →</Link></section>
   </>:<>
    <div className="bl-detail-cover"><Couverture/></div><div className="bl-detail-titre"><span className="bl-label">{en?'The principles of the Kingdom':'Les principes du Royaume'}</span><h1>{LIVRE.titre}</h1><p>{LIVRE.sousTitre}</p><strong>{LIVRE.auteur}</strong></div>
    {(format?FORMATS_LIVRE.filter(f=>f.id===format):FORMATS_LIVRE).map(f=><section className="bl-card bl-format" key={f.id}><div className="bl-format-titre"><I nom={f.icone} taille={30}/><h2>{format?formatNom:f.id==='audio'?(en?'Audiobook':'Livre audio'):(en?'Digital book · PDF':'Livre numérique · PDF')}</h2><span className="bl-statut">{en?'In preparation':'En préparation'}</span></div><p>{f.id==='audio'?(en?'The complete audiobook will be available once the narration, voice and recordings have been approved.':'Le livre audio sera proposé après validation du texte de narration, de la voix et des enregistrements.'):(en?'The PDF is not yet available in the app. If you have purchased the book, use the delivery link provided with your order.':'Le PDF n’est pas encore disponible dans l’application. Si tu as acheté le livre, utilise le lien de livraison reçu avec ta commande.')}</p><button className="bl-indisponible" disabled><I nom={f.id==='audio'?'headset_off':'description'}/>{f.id==='audio'?(en?'Audio not yet available':'Audio bientôt disponible'):(en?'PDF not yet available':'PDF bientôt disponible')}</button><Link to={`/aide?motif=${f.id==='audio'?'livre-audio':'livre-pdf'}`}>{en?'A question about this format?':'Une question sur ce format ?'} →</Link></section>)}
    <section className="bl-sommaire"><div><h2>{en?'Contents of the French edition':'Sommaire de l’enseignement'}</h2><span className="bl-statut">{en?'7 chapters':'7 chapitres'}</span></div><p>{en?'The seven chapters of the book':'Les sept chapitres du livre'}</p><ol>{LIVRE.chapitres.map((c,i)=><li key={c.page}><span className="bl-numero">{String(i+1).padStart(2,'0')}</span><div><h3>{c.titre}</h3><p>{en?'Printed page':'Page imprimée'} {c.page}</p></div><I nom={format==='audio'?'headset_off':'menu_book'} taille={20}/></li>)}</ol></section>
    <figure className="bl-citation"><I nom="format_quote" taille={42}/><blockquote>« Dieu n’examine pas tes rêves. Il examine tes habitudes. »</blockquote><figcaption>Dr Justin Tshims · Annexe 4</figcaption></figure>
   </>}
   <footer className="bl-footer"><I nom="spa" taille={28}/><strong>SÉNEVÉ · {en?'One step every day':'Un pas chaque jour'}</strong><Link to="/confidentialite">{en?'Privacy':'Confidentialité'}</Link><Apparence langue={lang}/></footer>
  </div>
  <nav className="bl-nav" aria-label={en?'Library navigation':'Navigation de la bibliothèque'}><Link to="/espace"><I nom="home"/>{en?'Today':'Aujourd’hui'}</Link><Link to={`/bibliotheque${suffixe}`} aria-current={!detail?'page':undefined}><I nom="auto_stories"/>{en?'Library':'Bibliothèque'}</Link><Link to="/journal"><I nom="history_edu"/>{en?'Journal':'Journal'}</Link><Link to="/aide"><I nom="help"/>{en?'Help':'Aide'}</Link></nav>
 </main>;
}
