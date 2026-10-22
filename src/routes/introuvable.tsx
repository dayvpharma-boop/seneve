import {useEffect} from 'react';
import {Link,useNavigate,useSearchParams} from 'react-router-dom';
import {IconeConfidentialite} from '@/components/IconeConfidentialite';
import {IconeAdministration} from '@/components/IconeAdministration';
import {Icone} from '@/components/Icone';

const TEXTES = {
  fr: { titre: 'Page introuvable', retour: 'Revenir en arrière', espace: 'Mon espace', etiquette: '404 · Chemin inexploré', texte: 'Cette page n’existe pas ou a été déplacée.', citation: '« Même un pas de côté peut ramener à l’essentiel. »', recentrer: 'Un temps pour se recentrer', alt: 'Une cour paisible éclairée par la lumière du matin', legende: 'Un temps de pause dans la marche quotidienne.', test: 'Revenir au Test des 7 Racines', accueil: 'Revenir à l’accueil', aide: 'Besoin d’aide ? Écrire à l’équipe', pied: 'SÉNEVÉ · Un pas chaque jour' },
  en: { titre: 'Page not found', retour: 'Go back', espace: 'My space', etiquette: '404 · Unexplored path', texte: 'This page does not exist or has been moved.', citation: '“Even a step aside can lead back to what matters.”', recentrer: 'A time to refocus', alt: 'A peaceful courtyard lit by the morning light', legende: 'A pause in the daily walk.', test: 'Back to the 7 Roots Test', accueil: 'Back to the home page', aide: 'Need help? Write to the team', pied: 'SÉNEVÉ · One step every day' },
} as const;

export function NotFound(){
  const navigate=useNavigate();
  const [params]=useSearchParams();
  // ?lang=en, sinon la langue du navigateur : un lien cassé n'indique pas la langue de la personne.
  const en=params.get('lang')==='en'||(!params.get('lang')&&typeof navigator!=='undefined'&&/^en\b/i.test(navigator.language||''));
  const T=TEXTES[en?'en':'fr'];
  const suffixe=en?'?lang=en':'';
  useEffect(()=>{document.title=`${T.titre} — SÉNEVÉ`;document.documentElement.lang=en?'en':'fr';},[T,en]);
  return <main className="introuvable-maquette">
    <header><button type="button" aria-label={T.retour} onClick={()=>window.history.state?.idx>0?navigate(-1):navigate('/')}><IconeConfidentialite nom="arrow_back" taille={20}/></button><div><span><Icone nom="graine"/> SÉNEVÉ</span><small>{T.titre}</small></div><Link to="/espace" aria-label={T.espace} className="introuvable-profil"><IconeConfidentialite nom="person" taille={18}/></Link></header>
    <p className="introuvable-folio">Folio 404</p>
    <section className="introuvable-centre"><div className="introuvable-embleme"><img src={`${import.meta.env.BASE_URL}illustrations/page-introuvable-graine.svg`} alt=""/></div><p className="introuvable-etiquette">{T.etiquette}</p><h1>{T.titre}</h1><p>{T.texte}</p>
    <blockquote><p>{T.citation}</p><footer><span>{T.recentrer}</span><IconeAdministration nom="auto_stories" taille={16}/></footer></blockquote></section>
    <figure><img src={`${import.meta.env.BASE_URL}illustrations/page-introuvable-cour.jpg`} alt={T.alt}/><figcaption>{T.legende}</figcaption></figure>
    <div className="introuvable-actions"><Link to={en?'/p?lang=en':'/p'} className="introuvable-principal">{T.test}<IconeAdministration nom="east" taille={20}/></Link><Link to={`/${suffixe}`} className="introuvable-accueil"><IconeAdministration nom="home" taille={18}/>{T.accueil}</Link><a href="mailto:contact@drjustintshims.com"><IconeConfidentialite nom="mail" taille={16}/>{T.aide}</a></div>
    <footer className="introuvable-signature">{T.pied}</footer>
  </main>;
}
