export type ThemeImage = 'journal'|'parcours'|'lecture'|'coach'|'aide'|'profil'|'offres'|'securite'|'connexion'|'reglages'|'administration'|'reprise';
/** Visuel décoratif : le titre de la page fournit son sens dans la langue choisie. */
export function IllustrationPage({ theme }: { theme: ThemeImage }) {
  const base = `${import.meta.env.BASE_URL}illustrations/pages/${theme}-v1`;
  return <img className="page-illustration" src={`${base}-720.webp`} srcSet={`${base}-360.webp 360w, ${base}-720.webp 720w`} sizes="(max-width:600px) calc(100vw - 40px), 560px" width={720} height={480} alt="" decoding="async" loading="lazy" />;
}
