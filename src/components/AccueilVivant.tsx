/** Une respiration visuelle dans l'espace privé, sans donnée ni appel réseau supplémentaire. */
export function AccueilVivant({ langue = 'fr' }: { langue?: string }) {
  const en = langue === 'en';
  const base = `${import.meta.env.BASE_URL}illustrations/seneve-pousse-photo-v1`;
  return <aside className="accueil-vivant" aria-label={en ? 'A moment for yourself' : 'Un moment pour toi'}>
    <div className="accueil-vivant-texte">
      <span className="accueil-vivant-repere"><i aria-hidden="true" />{en ? 'YOUR DAILY SPACE' : 'TON RENDEZ-VOUS QUOTIDIEN'}</span>
      <p className="accueil-vivant-titre">{en ? 'One small step.' : 'Un petit pas.'}<br /><em>{en ? 'Room to grow.' : 'De quoi grandir.'}</em></p>
      <p className="accueil-vivant-note">{en ? 'Read, put into practice, and take a moment to reflect. At your own pace.' : 'Lis, mets en pratique et prends un temps pour toi. À ton rythme.'}</p>
    </div>
    <img src={`${base}-720.webp`} srcSet={`${base}-360.webp 360w, ${base}-720.webp 720w`} sizes="(max-width: 600px) 44vw, 300px" width={720} height={314} alt="" decoding="async" />
  </aside>;
}
