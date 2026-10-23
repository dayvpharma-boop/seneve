import { Icone, type NomIcone } from '@/components/Icone';
import { IconeMaquette } from '@/components/IconeMaquette';
import { entreGuillemets } from '@/lib/parole';

type Contexte = 'journal' | 'aide' | 'coach' | 'progres' | 'test' | 'resultat' | 'journee';
const LIVRE = {
  fr: { titre: 'Arrête de mendier des miracles', pensee: 'Pensée du jour', citation: "La fidélité dans les petites choses ne concerne donc pas seulement l’argent. Elle concerne les personnes.", source: 'Dr Justin Tshims · Chapitre 6, p. 125' },
  en: { titre: 'Stop Begging for Miracles', pensee: 'Thought for the day', citation: 'Faithfulness in the little things, then, is not only about money. It is about people.', source: 'Dr Justin Tshims · Chapter 6, p. 117' },
};
const REPERES = {
  fr: {
    test: { titre: 'Commencer avec sincérité', texte: 'Réponds selon ta pratique actuelle, sans chercher la réponse idéale. Tu peux revenir à la question précédente. Consulter ton résultat ne demande pas de coordonnées et le partage reste facultatif.' },
    resultat: { titre: 'Des repères pour une première pratique', texte: 'Tes réponses donnent un point de départ pour agir. La Découverte de 7 jours présente un socle commun à tous : elle ne change pas automatiquement selon la racine proposée.' },
    journee: { titre: 'Comprendre, agir, faire le point', texte: 'Lis ou écoute l’enseignement, puis essaie l’action proposée. Indique ensuite si tu l’as préparée, réalisée en partie ou accomplie. Écouter seul ne valide pas l’action ; écrire dans ton journal reste facultatif.' },
    journal: { titre: 'Mémoire de ta pratique', texte: 'Ton brouillon reste sur cet appareil jusqu’à l’enregistrement. Tes notes enregistrées se retrouvent dans ton espace ; partager une note reste ton choix.' },
    aide: { titre: 'Écoute et partage choisi', texte: 'Consulte ici l’état de ta demande et, lorsqu’elle est disponible, la réponse de l’équipe. Tu choisis les extraits de journal que tu joins à ton message.' },
    coach: { titre: 'Comprendre pour mettre en pratique', texte: 'Une réponse sert à éclairer l’action publiée. Elle ne valide pas l’action à ta place. Si la réponse manque ou ne t’aide pas, tu peux écrire à l’équipe.' },
    progres: { titre: 'Une prochaine action, sans culpabiliser', texte: 'Tes actions préparées, partielles et réalisées restent distinctes. Après une interruption, retrouve une journée ouverte et choisis ton prochain pas.' },
  },
  en: {
    test: { titre: 'Begin honestly', texte: 'Answer according to your current practice rather than an ideal response. You can go back to the previous question. No contact details are required to see your result, and sharing remains optional.' },
    resultat: { titre: 'Guidance for a first step', texte: 'Your answers provide a starting point for action. The 7-day Discovery journey offers a common foundation for everyone; it does not automatically change according to the suggested root.' },
    journee: { titre: 'Understand, act and reflect', texte: 'Read or listen to the teaching, then try the suggested action. Record whether you have prepared it, partly completed it or completed it. Listening alone does not complete the action; writing in your journal remains optional.' },
    journal: { titre: 'A record of your practice', texte: 'Your draft stays on this device until you save it. Saved notes are available in your space; sharing a note remains your choice.' },
    aide: { titre: 'Support and sharing by choice', texte: 'Check the status of your request here and, when available, the team’s reply. You choose which journal excerpts to include in your message.' },
    coach: { titre: 'Understand and put into practice', texte: 'A reply helps explain the published action. It does not mark the action as complete for you. If a reply is missing or unhelpful, you can contact the team.' },
    progres: { titre: 'A next step, without guilt', texte: 'Prepared, partially completed and completed actions remain distinct. After a break, return to an open day and choose your next step.' },
  },
};
const ICONES: Record<Contexte, NomIcone> = { journal: 'cadenas', aide: 'aide', coach: 'coach', progres: 'graine', test: 'liste', resultat: 'graine', journee: 'livre' };
const langueLivre = (langue?: string | null) => langue === 'en' ? 'en' : 'fr';

/** Extrait vérifié dans les éditions FR (page PDF 128) et EN (page PDF 120). */
export function PenseeLivre({ langue, titre }: { langue?: string | null; titre?: string }) {
  const t = LIVRE[langueLivre(langue)];
  return <aside className="connexion-pensee" aria-label={titre ?? t.pensee}>
    <span className="connexion-pensee-icone" aria-hidden="true"><Icone nom="livre" taille={24} /></span>
    <div><p className="connexion-pensee-titre">{titre ?? t.pensee}</p><blockquote>{entreGuillemets(t.citation, langue)}</blockquote><cite className="pensee-source">{t.source}</cite></div>
  </aside>;
}

/** Adaptations des blocs de maquette selon les cahiers 02 et 09 ; aucune donnée de participant fictive. */
export function RepereParcours({ contexte, langue }: { contexte: Contexte; langue?: string | null }) {
  const t = REPERES[langueLivre(langue)][contexte];
  return <aside className="repere-parcours" aria-labelledby={`repere-${contexte}`}>
    {contexte === 'journal' ? <IconeMaquette nom="enhanced_encryption" taille={18} /> : <Icone nom={ICONES[contexte]} taille={22} />}
    <div><h2 id={`repere-${contexte}`}>{t.titre}</h2><p>{t.texte}</p></div>
  </aside>;
}
