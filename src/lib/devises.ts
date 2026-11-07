/** Devises monétaires courantes proposées dans les suivis personnels. */
export const DEVISES_SUIVI = (`AED AFN ALL AMD AOA ARS AUD AWG AZN BAM BBD BDT BIF BMD BND BOB BRL BSD BTN BWP BYN BZD CAD CDF CHF CLP CNY COP CRC CUP CVE CZK DJF DKK DOP DZD EGP ERN ETB EUR FJD FKP GBP GEL GHS GIP GMD GNF GTQ GYD HKD HNL HTG HUF IDR ILS INR IQD IRR ISK JMD JPY KES KGS KHR KMF KPW KRW KYD KZT LAK LBP LKR LRD LSL MAD MDL MGA MKD MMK MNT MOP MRU MUR MVR MWK MXN MYR MZN NAD NGN NIO NOK NPR NZD PAB PEN PGK PHP PKR PLN PYG QAR RON RSD RUB RWF SAR SBD SCR SDG SEK SGD SHP SLE SOS SRD SSP STN SVC SYP SZL THB TJS TMT TOP TRY TTD TWD TZS UAH UGX USD UYU UZS VES VND VUV WST XAF XCD XCG XOF XPF YER ZAR ZMW ZWG`).split(' ');

export function decimalesDevise(devise:string):number {
  try { return new Intl.NumberFormat('en',{style:'currency',currency:devise}).resolvedOptions().maximumFractionDigits??2; }
  catch { return 2; }
}

export function montantValidePourDevise(valeur:string,devise:string):boolean {
  const precision=decimalesDevise(devise);
  const expression=precision===0?/^\d{1,10}$/:/^\d{1,10}(?:\.\d{1,2})?$/;
  return expression.test(valeur)&&Number.isFinite(Number(valeur));
}

export function nomDevise(devise:string,langue:'fr'|'en'):string {
  try { return new Intl.DisplayNames([langue==='fr'?'fr-FR':'en-US'],{type:'currency'}).of(devise)??devise; }
  catch { return devise; }
}

export function deviseAcceptee(devise:string):boolean {
  return DEVISES_SUIVI.includes(devise)&&decimalesDevise(devise)<=2;
}
