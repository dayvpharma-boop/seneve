/** Logo SÉNEVÉ affiché à côté du nom dans les en-têtes : l'arbre doré sur noir (logo validé le 12/11/2026),
 *  dans sa version simplifiée à 5 feuilles (favicon.svg), nette de 16 à 32 px, la même que l'icône d'onglet. */
export function LogoSeneve({ taille = 22, className = '' }: { taille?: number; className?: string }) {
  return <img className={`logo-seneve ${className}`.trim()} src={`${import.meta.env.BASE_URL}icons/favicon.svg`} alt="" aria-hidden="true"
    width={taille} height={taille} style={{ width: taille, height: taille, borderRadius: '22%', flex: 'none', display: 'inline-block', verticalAlign: 'middle' }} />;
}
