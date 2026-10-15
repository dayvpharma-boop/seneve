/** Illustrations des moments du jour (matin, midi, soir) : collines, soleil ou lune, jeune pousse.
 *  Couleurs lues dans les variables du thème, donc correctes en clair comme en sombre. Purement décoratives. */
import type { ReactNode } from 'react';

export type Periode = 'matin' | 'midi' | 'soir';

export function Scene({ periode, largeur = 280, hauteur = 110, className }: { periode: Periode; largeur?: number; hauteur?: number; className?: string }) {
  const w = largeur, h = hauteur;
  const svg = (contenu: ReactNode) => <svg className={className} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">{contenu}</svg>;
  if (periode === 'matin') {
    const rayons = [[-0.94, 0.34], [-0.64, 0.77], [0, 1], [0.64, 0.77], [0.94, 0.34]] as const;
    return svg(<>
      <rect width={w} height={h} fill="var(--sky-dawn)" />
      <rect y={h * 0.5} width={w} height={h * 0.5} fill="var(--sky-low)" opacity=".6" />
      <circle cx={w * 0.56} cy={h * 0.8} r={h * 0.36} fill="var(--sun)" opacity=".9" />
      <g stroke="var(--sun)" strokeWidth="3" strokeLinecap="round" opacity=".7">
        {rayons.map(([c, s], k) => <line key={k} x1={w * 0.56 + h * 0.5 * c} y1={h * 0.8 - h * 0.5 * s} x2={w * 0.56 + h * 0.62 * c} y2={h * 0.8 - h * 0.62 * s} />)}
      </g>
      <path d={`M0 ${h * 0.8} Q ${w * 0.25} ${h * 0.5} ${w * 0.55} ${h * 0.82} T ${w} ${h * 0.72} V ${h} H 0 Z`} fill="var(--hill-light)" />
      <path d={`M0 ${h * 0.93} Q ${w * 0.35} ${h * 0.7} ${w * 0.7} ${h * 0.96} T ${w} ${h * 0.9} V ${h} H 0 Z`} fill="var(--hill-deep)" />
      <g transform={`translate(${w * 0.22} ${h * 0.74})`} stroke="var(--hill-deep)" strokeWidth="2.5" strokeLinecap="round" fill="var(--hill-deep)">
        <line x1="0" y1="0" x2="0" y2="-15" />
        <path d="M0 -9 C -9 -11 -11 -18 -11 -20 C -4 -20 0 -15 0 -9Z" />
        <path d="M0 -12 C 8 -14 10 -22 10 -24 C 3 -24 0 -18 0 -12Z" />
      </g>
    </>);
  }
  if (periode === 'midi') return svg(<>
    <rect width={w} height={h} fill="var(--sky-dawn)" />
    <circle cx={w * 0.5} cy={h * 0.32} r={h * 0.17} fill="var(--sun)" />
    <path d={`M0 ${h * 0.8} Q ${w * 0.3} ${h * 0.6} ${w * 0.6} ${h * 0.82} T ${w} ${h * 0.76} V ${h} H 0 Z`} fill="var(--hill-light)" />
    <path d={`M0 ${h * 0.94} Q ${w * 0.4} ${h * 0.78} ${w * 0.8} ${h * 0.96} T ${w} ${h * 0.92} V ${h} H 0 Z`} fill="var(--hill-deep)" />
  </>);
  const etoiles = [[0.15, 0.2], [0.3, 0.35], [0.45, 0.15], [0.8, 0.4], [0.88, 0.18], [0.22, 0.5]] as const;
  return svg(<>
    <rect width={w} height={h} fill="var(--night)" />
    <path d={`M${w * 0.62} ${h * 0.18} a ${h * 0.16} ${h * 0.16} 0 1 0 ${h * 0.12} ${h * 0.3} a ${h * 0.13} ${h * 0.13} 0 1 1 -${h * 0.12} -${h * 0.3}z`} fill="var(--star)" />
    {etoiles.map(([x, y], k) => <circle key={k} cx={x * w} cy={y * h} r="1.6" fill="var(--star)" opacity=".8" />)}
    <path d={`M0 ${h * 0.85} Q ${w * 0.35} ${h * 0.68} ${w * 0.7} ${h * 0.88} T ${w} ${h * 0.82} V ${h} H 0 Z`} fill="var(--hill-deep)" />
  </>);
}
