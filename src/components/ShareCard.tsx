import { IconeResultat } from '@/components/IconeResultat';
import { useEffect, useState } from 'react';
import { texts, type Language } from '@/lib/test-texts';
import { renderCard, shareAddress, strengthKind, type CardContent, type CardFormat } from '@/lib/carte-partage';

interface Props {
  editorial?: boolean;
  language: Language;
  totals: number[];        // totaux des sept racines (3 à 15)
  startRoot: number | null; // racine par laquelle la personne commence (index 0 à 6)
}

/** Carte « Partager » du résultat : crée une image sans aucune note, à publier sur n'importe quel réseau. */
export function ShareCard({ language, totals, startRoot, editorial=false }: Props) {
  const t = texts[language].share;
  const roots = texts[language].roots;
  const max = Math.max(...totals);
  const kind = strengthKind(max);
  const strongest = totals.map((v, k) => (v === max ? k : -1)).filter(k => k >= 0);

  const [open, setOpen] = useState(editorial);
  const [withStrength,setWithStrength]=useState(true);
  const [format, setFormat] = useState<CardFormat>('vertical');
  const [strength, setStrength] = useState<number | null>(strongest[0] ?? null);
  const [withStart, setWithStart] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [state, setState] = useState<'idle' | 'making' | 'ready' | 'unavailable'>('idle');

  // Sans point d'appui (toutes les racines à développer), l'image montre la racine par laquelle on commence.
  const showStart = editorial ? startRoot !== null : kind === null ? startRoot !== null : withStart && startRoot !== null && startRoot !== strength;
  const strengthName = kind && strength !== null && (!editorial || withStrength) ? roots[strength]?.n : undefined;
  const startName = showStart && startRoot !== null ? roots[startRoot]?.n : undefined;
  const ready = Boolean(strengthName || startName);

  useEffect(() => {
    if (!open || !ready) return;
    let cancelled = false;
    setState('making');setBlob(null);
    const content: CardContent = {
      design: editorial?'editorial':undefined,
      brand: t.card.brand, title: t.card.title, book: t.card.book, question: t.card.question,
      address: shareAddress(window.location.host, import.meta.env.BASE_URL, language),
      strength: strengthName && kind ? { label: t.card[kind], name: strengthName } : undefined,
      start: startName ? { label: t.card.start, name: startName } : undefined,
    };
    void renderCard(format, content).then(b => {
      if (cancelled) return;
      setBlob(b);
      setState(b ? 'ready' : 'unavailable');
    });
    return () => { cancelled = true; };
  }, [open, ready, format, strengthName, startName, kind, language, t, editorial]);

  useEffect(() => {
    if (!blob) { setPreview(null); return; }
    const url = URL.createObjectURL(blob);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  const fileName = `${t.fileName}-${format}.png`;
  async function share() {
    if (!blob) return;
    const file = new File([blob], fileName, { type: 'image/png' });
    const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
    if (nav.share && nav.canShare?.({ files: [file] })) {
      try { await nav.share({ files: [file], title: t.card.title }); return; } catch (e) {
        if ((e as DOMException)?.name === 'AbortError') return; // la personne a fermé le menu
      }
    }
    download();
  }
  function download() {
    if (!preview) return;
    const a = document.createElement('a');
    a.href = preview; a.download = fileName;
    document.body.appendChild(a); a.click(); a.remove();
  }

  if (!ready && kind === null && startRoot === null) return null;

  return <div className={`card share-card ${editorial?'share-editorial':''}`}>
    <p className="tag"><IconeResultat nom="share" taille={20}/>{t.tag}</p>
    <p className="more">{t.text}</p>
    {!open && <button type="button" className="btn" onClick={() => setOpen(true)}>{t.create}</button>}
    {open && <>
      {kind && strongest.length > 1 && <>
        <p className="note share-label">{t.chooseStrength}</p>
        <div className="share-options">
          {strongest.map(k => <button type="button" key={k} className="root-choice" aria-pressed={strength === k} onClick={() => setStrength(k)}>{roots[k]?.n}</button>)}
        </div>
      </>}
      {!editorial && kind && startRoot !== null && startRoot !== strength && <label className="share-check">
        <input type="checkbox" checked={withStart} onChange={e => setWithStart(e.target.checked)} />
        <span>{t.addStart(roots[startRoot]?.n ?? '')}</span>
      </label>}
      {editorial && kind && <label className="share-check share-strength"><span>{language==='en'?'Show my strongest root':'Afficher ma racine d’appui'}</span><input type="checkbox" checked={withStrength} onChange={e=>setWithStrength(e.target.checked)}/></label>}
      <p className="note share-label">{t.formats}</p>
      <div className="tabs" role="group" aria-label={t.formats}>
        <button type="button" className="tab" aria-pressed={format === 'vertical'} onClick={() => setFormat('vertical')}><IconeResultat nom="stay_current_portrait" taille={18}/>{t.vertical}<span className="tab-hint">{t.verticalHint}</span></button>
        <button type="button" className="tab" aria-pressed={format === 'carre'} onClick={() => setFormat('carre')}><IconeResultat nom="crop_square" taille={18}/>{t.square}<span className="tab-hint">{t.squareHint}</span></button>
      </div>
      {state === 'making' && <p className="note" aria-live="polite">{t.making}</p>}
      {state === 'unavailable' && <p className="note" aria-live="polite">{t.unavailable}</p>}
      {preview && <img className={`share-preview share-preview-${format}`} src={preview} alt={t.preview} />}
      {state === 'ready' && <div className="share-actions">
        <button type="button" className="btn" onClick={() => void share()}><IconeResultat nom="share" taille={18}/>{t.shareButton}</button>
        <button type="button" className="link" onClick={download}><IconeResultat nom="download" taille={18}/>{t.download}</button>
      </div>}
      {editorial&&<p className="share-confidentialite"><IconeResultat nom="lock" taille={14}/>{language==='en'?'No personal data, scores or journal entries appear in this image.':'Aucune donnée personnelle, aucun score ni réflexion ne figure sur l’image.'}</p>}
    </>}
  </div>;
}
