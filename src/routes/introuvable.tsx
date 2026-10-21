import {useEffect} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import {IconeConfidentialite} from '@/components/IconeConfidentialite';
import {IconeAdministration} from '@/components/IconeAdministration';
import {Icone} from '@/components/Icone';

export function NotFound(){
  const navigate=useNavigate();
  useEffect(()=>{document.title='Page introuvable — SÉNEVÉ';document.documentElement.lang='fr';},[]);
  return <main className="introuvable-maquette">
    <header><button type="button" aria-label="Revenir en arrière" onClick={()=>window.history.state?.idx>0?navigate(-1):navigate('/')}><IconeConfidentialite nom="arrow_back" taille={20}/></button><div><span><Icone nom="graine"/> SÉNEVÉ</span><small>Page introuvable</small></div><Link to="/espace" aria-label="Mon espace" className="introuvable-profil"><IconeConfidentialite nom="person" taille={18}/></Link></header>
    <p className="introuvable-folio">Folio 404</p>
    <section className="introuvable-centre"><div className="introuvable-embleme"><img src={`${import.meta.env.BASE_URL}illustrations/page-introuvable-graine.svg`} alt=""/></div><p className="introuvable-etiquette">404 · Chemin inexploré</p><h1>Page introuvable</h1><p>Cette page n’existe pas ou a été déplacée.</p>
    <blockquote><p>« Même un pas de côté peut ramener à l’essentiel. »</p><footer><span>Un temps pour se recentrer</span><IconeAdministration nom="auto_stories" taille={16}/></footer></blockquote></section>
    <figure><img src={`${import.meta.env.BASE_URL}illustrations/page-introuvable-cour.jpg`} alt="Une cour paisible éclairée par la lumière du matin"/><figcaption>Un temps de pause dans la marche quotidienne.</figcaption></figure>
    <div className="introuvable-actions"><Link to="/p" className="introuvable-principal">Revenir au Test des 7 Racines<IconeAdministration nom="east" taille={20}/></Link><Link to="/" className="introuvable-accueil"><IconeAdministration nom="home" taille={18}/>Revenir à l’accueil</Link><a href="mailto:contact@drjustintshims.com"><IconeConfidentialite nom="mail" taille={16}/>Besoin d’aide ? Écrire à l’équipe</a></div>
    <footer className="introuvable-signature">SÉNEVÉ · Un pas chaque jour</footer>
  </main>;
}
