/** Logo WhatsApp (bulle verte et combiné blanc), pour les boutons « Continuer avec WhatsApp ». */
export function LogoWhatsApp({ taille = 20, blanc = false }: { taille?: number; blanc?: boolean }) {
  return <svg width={taille} height={taille} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path fill={blanc ? '#fff' : '#25D366'} d="M12 2.2a9.8 9.8 0 0 0-8.4 14.8L2.2 21.8l4.9-1.3A9.8 9.8 0 1 0 12 2.2z" />
    <path fill={blanc ? '#1f8a4c' : '#fff'} d="M17.1 14.3c-.3-.1-1.7-.8-1.9-.9-.3-.1-.5-.1-.7.1l-.9 1.1c-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.2-1.4-.8-.7-1.4-1.6-1.5-1.9-.2-.3 0-.4.1-.6l.4-.5.3-.5c.1-.2 0-.4 0-.5l-.9-2.1c-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3 2.4.9 2.9.8 3.4.7.5-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3z" />
  </svg>;
}
