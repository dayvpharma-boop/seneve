/** Logo SÉNEVÉ affiché à côté du nom dans les en-têtes : l'arbre doré sur noir (logo validé le 12/11/2026).
 *  Même fichier que l'icône de l'app (icon.svg, 9 feuilles), pour qu'un seul logo existe dans l'app (demande de
 *  Dr Justin du 12/11 : la version simplifiée à 5 feuilles reste seulement pour l'onglet du navigateur). */
export function LogoSeneve({ taille = 22, className = '' }: { taille?: number; className?: string }) {
  return <img className={`logo-seneve ${className}`.trim()} src={`${import.meta.env.BASE_URL}icons/icon.svg`} alt="" aria-hidden="true"
    width={taille} height={taille} style={{ width: taille, height: taille, borderRadius: '22%', flex: 'none', display: 'inline-block', verticalAlign: 'middle' }} />;
}
