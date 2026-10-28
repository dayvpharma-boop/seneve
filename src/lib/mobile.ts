/** Identifie le binaire embarqué, indépendamment du réseau et des plugins disponibles. */
export const constructionMobile=()=>import.meta.env.VITE_SENEVE_MOBILE==='1';
export const VERSION_MOBILE='0.3-test';
