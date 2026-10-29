/** Accès aux réglages existants : aucun abonnement ni changement automatique. */
export function AccesRappelsWebHabitudes({enrollmentId,langue}:{enrollmentId:string;langue:string}){
 const en=langue==='en',l=(fr:string,english:string)=>en?english:fr;
 const base=import.meta.env.BASE_URL;
 const lien='min-h-[44px] px-3 py-2 rounded-xl bg-hd-surface-container text-hd-secondary underline underline-offset-4 flex items-center';
 return <section aria-label={l('Mes rappels','My reminders')} className="rounded-2xl bg-hd-surface-container-lowest p-hd-space-md mb-hd-space-lg flex flex-col gap-3">
  <h2 className="font-hd-headline-sm text-hd-headline-sm">{l('Mes rappels','My reminders')}</h2>
  <p className="font-hd-body-sm text-hd-body-sm">{l('Retrouve ici les réglages des rappels sur ce téléphone et les rendez-vous à ajouter au calendrier.','Find reminder settings for this phone and appointments to add to your calendar here.')}</p>
  <nav aria-label={l('Réglages des rappels','Reminder settings')} className="flex flex-col gap-2">
   <a className={lien} href={base+'profil?lang='+langue+'#notifications'}>{l('Activer les notifications sur ce téléphone','Turn on notifications on this phone')}</a>
   <a className={lien} href={base+'reglages?parcours='+encodeURIComponent(enrollmentId)+'&lang='+langue+'#rappels-habitudes'}>{l('Choisir mes rappels d’habitudes et leurs horaires','Choose my habit reminders and their times')}</a>
   <a className={lien} href="#hd-calendrier">{l('Ajouter mes rendez-vous au calendrier','Add my appointments to my calendar')}</a>
  </nav>
  <p className="font-hd-body-sm text-hd-body-sm">{l('Les notifications web nécessitent Internet. Pour les alertes du calendrier, importe les rendez-vous puis vérifie les alertes dans ton calendrier. Choisis une seule méthode pour les mêmes rendez-vous afin d’éviter les doublons.','Web notifications need Internet. For calendar alerts, import the appointments and check alerts in your calendar. Choose one method for the same appointments to avoid duplicates.')}</p>
 </section>;
}

