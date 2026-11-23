import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter,Route,Routes} from 'react-router-dom';
import {ComptePrive} from '../../../src/components/ComptePrive';
import {draft} from '../../../src/lib/journal';
import {connecter,renouveler,supabase} from './auth-fictif';
const en=new URLSearchParams(location.search).get('lang')==='en';
function Journal({id}:{id:string}){
 const [texte,setTexte]=useState(()=>draft.read('journal:libre',id));
 return <section><h2 data-testid="compte">{id}</h2><label>{en?'Draft':'Brouillon'}<textarea value={texte} onChange={e=>{setTexte(e.target.value);draft.write('journal:libre',e.target.value,id);}}/></label>
 <p data-testid="note">{localStorage.getItem('recette-journal:note:'+id)??''}</p></section>;
}
function App(){return <><h1>{en?'Browser test — fictional accounts':'Essai navigateur — comptes fictifs'}</h1>
 <p>Aucun compte Supabase, aucun réseau externe. Composants ComptePrive et nettoyage du projet.</p>
 <button onClick={()=>connecter('A')}>Compte A</button><button onClick={()=>connecter('B')}>Compte B</button>
 <button onClick={()=>void supabase.auth.signOut()}>Déconnexion</button><button onClick={renouveler}>Renouveler</button>
 <Routes><Route path="*" element={<ComptePrive enfants={id=><Journal id={id}/>}/>}/><Route path="/connexion" element={<p data-testid="ferme">Connexion requise</p>}/></Routes></>;}
createRoot(document.getElementById('root')!).render(<BrowserRouter><App/></BrowserRouter>);
