import { jardinTextes, stadeJardin, type Stade } from '@/lib/jardin';

/** Feuille en goutte, orientée par un angle (degrés), partant de (x, y). */
function Feuille({ x, y, angle, taille }: { x: number; y: number; angle: number; taille: number }) {
  return <path transform={`translate(${x} ${y}) rotate(${angle}) scale(${taille})`} d="M0 0 C 4 -3 10 -3 14 0 C 10 3 4 3 0 0 Z" fill="var(--brand)" />;
}

/** Illustration du stade : couleurs du thème, donc lisible en clair comme en sombre. */
function Plante({ stade }: { stade: Stade }) {
  const sol = 96;
  return <svg viewBox="0 0 120 110" width="120" height="110" aria-hidden="true" focusable="false">
    <ellipse cx="60" cy={sol + 4} rx="46" ry="8" fill="var(--hill-light)" />
    <ellipse cx="60" cy={sol + 3} rx="30" ry="5" fill="var(--hill-deep)" opacity=".55" />
    {stade === 0 && <ellipse cx="60" cy={sol} rx="5" ry="3.5" fill="var(--gold)" />}
    {stade >= 1 && stade <= 3 && <>
      <path d={`M60 ${sol} C 59 ${sol - 10} 61 ${sol - 18 - stade * 10} 60 ${sol - 14 - stade * 12}`} stroke="var(--brand)" strokeWidth="3" fill="none" strokeLinecap="round" />
      <Feuille x={60} y={sol - 12 - stade * 12} angle={-150} taille={0.9 + stade * 0.15} />
      <Feuille x={60} y={sol - 12 - stade * 12} angle={-30} taille={0.9 + stade * 0.15} />
      {stade >= 2 && <><Feuille x={60} y={sol - 20} angle={-160} taille={1.1} /><Feuille x={60} y={sol - 26} angle={-20} taille={1.1} /></>}
      {stade >= 3 && <><Feuille x={60} y={sol - 38} angle={-165} taille={1.3} /><Feuille x={60} y={sol - 44} angle={-15} taille={1.3} /></>}
    </>}
    {stade === 4 && <>
      <path d={`M60 ${sol} L 60 ${sol - 30}`} stroke="var(--gold)" strokeWidth="5" strokeLinecap="round" />
      <path d={`M60 ${sol - 22} L 48 ${sol - 34} M60 ${sol - 26} L 72 ${sol - 38}`} stroke="var(--gold)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="60" cy={sol - 48} r="20" fill="var(--brand)" />
      <circle cx="44" cy={sol - 38} r="12" fill="var(--brand)" opacity=".85" />
      <circle cx="76" cy={sol - 40} r="13" fill="var(--brand)" opacity=".85" />
    </>}
    {stade === 5 && <>
      <path d={`M60 ${sol} L 60 ${sol - 36}`} stroke="var(--gold)" strokeWidth="7" strokeLinecap="round" />
      <path d={`M60 ${sol - 26} L 44 ${sol - 44} M60 ${sol - 30} L 78 ${sol - 48}`} stroke="var(--gold)" strokeWidth="4" strokeLinecap="round" />
      <circle cx="60" cy={sol - 62} r="26" fill="var(--brand)" />
      <circle cx="36" cy={sol - 50} r="17" fill="var(--brand)" opacity=".9" />
      <circle cx="84" cy={sol - 52} r="18" fill="var(--brand)" opacity=".9" />
      <circle cx="60" cy={sol - 84} r="14" fill="var(--brand)" opacity=".9" />
      {[[48, 58], [70, 66], [58, 74], [38, 48], [82, 50]].map(([x, y], k) => <circle key={k} cx={x} cy={sol - y!} r="2.6" fill="var(--sun)" />)}
    </>}
  </svg>;
}

/** Le jardin du sénevé : la plante grandit avec les actions réalisées et ne fane jamais. */
export function JardinCard({ realisees, total, langue }: { realisees: number; total: number; langue?: string }) {
  const T = jardinTextes(langue);
  const stade = stadeJardin(realisees, total);
  return <section className="card jardin-card" aria-label={T.titre}>
    <div className="jardin-illus" role="img" aria-label={T.illustration(stade)}><Plante stade={stade} /></div>
    <div className="jardin-texte">
      <p className="tag">{T.titre}</p>
      <p className="jardin-message">{T.stades[stade]}</p>
      {total > 0 && <p className="jardin-compte">{T.compte(realisees, total)}</p>}
      <p className="muted jardin-note">{T.note}</p>
    </div>
  </section>;
}
