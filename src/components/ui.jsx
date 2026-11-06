// Classes et petits composants partagés du nouveau design (beige / vert / brun).
import { useEffect, useRef } from 'react';
import { useT } from '../i18n';

export const cls = {
  page: 'max-w-6xl mx-auto px-6 pt-10 pb-24',
  h1: 'font-serif font-normal text-5xl tracking-tight text-encre',
  h2: 'font-serif font-normal text-3xl text-encre',
  h3: 'font-serif font-normal text-2xl text-encre',
  label: 'text-sm font-medium text-encre-700',
  labelPetit: 'text-[13px] font-medium text-encre-700',
  muted: 'text-encre-500',
  input:
    'h-11 px-3 rounded-[10px] border border-lin-600 bg-lin text-encre text-[15px] focus:outline-none focus:ring-2 focus:ring-sauge focus:bg-white',
  inputMono:
    'h-11 px-3 rounded-[10px] border border-lin-600 bg-lin text-encre text-[15px] font-mono focus:outline-none focus:ring-2 focus:ring-sauge focus:bg-white',
  inputCellule:
    'sans-fleches w-full min-w-0 h-10 px-1.5 rounded-[10px] border border-lin-600 bg-lin text-encre text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-sauge focus:bg-white',
  calcule:
    'h-10 flex items-center justify-center rounded-[10px] bg-lin-300 text-encre-700 text-sm font-mono',
  btnPrimaire:
    'inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-sauge text-lin-50 text-[15px] font-medium hover:bg-sauge-fonce disabled:opacity-60 disabled:cursor-not-allowed',
  btnSecondaire:
    'inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl border border-lin-600 bg-lin-50 text-encre text-[15px] font-medium hover:border-sauge',
  btnDanger:
    'inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl border border-lin-600 bg-lin-50 text-alerte-texte text-[15px] font-medium hover:bg-alerte-fond hover:border-alerte-texte disabled:opacity-60 disabled:cursor-not-allowed',
  carte: 'rounded-[20px] border border-lin-500 bg-lin-50',
  tableau: 'overflow-x-auto rounded-[20px] border border-lin-500 bg-lin-50',
  erreur: 'rounded-[10px] bg-alerte-fond text-alerte-texte text-sm px-4 py-3',
};

export const Logo = ({ className = '' }) => (
  <span className={`flex items-center gap-2.5 ${className}`}>
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
      <circle cx="11" cy="14" r="9" fill="#C9A77A" />
      <circle cx="17" cy="14" r="9" fill="#6E8456" fillOpacity="0.85" />
    </svg>
    <span className="font-serif text-[22px] font-medium text-encre">Tinctilab</span>
  </span>
);

// Fond d'un aperçu couleur : la couleur si elle est connue (Lab renseigné),
// sinon un fond neutre hachuré qui signale « pas de mesure ».
export const fondCouleur = (hex) =>
  hex
    ? { backgroundColor: hex }
    : { backgroundImage: 'repeating-linear-gradient(135deg, #EDE6D9 0 6px, #F7F3EC 6px 12px)' };

// Petit carré de couleur + numéro, utilisé dans les en-têtes de tableaux
export const PastilleNuance = ({ hex, numero }) => (
  <span className="inline-flex items-center gap-2">
    <span className="w-4 h-4 rounded-[5px] border border-black/5" style={fondCouleur(hex)} />
    {numero}
  </span>
);

export const Chargement = ({ texte }) => {
  const t = useT();
  return <div className="py-16 text-center text-encre-500">{texte || t('commun.chargement')}</div>;
};

export const Message = ({ children, erreur = false }) => (
  <div className={`max-w-6xl mx-auto px-6 py-16 text-center ${erreur ? 'text-alerte-texte' : 'text-encre-500'}`}>
    {children}
  </div>
);

// Fenêtre d'alerte (pop-up) : un titre, un message et un bouton pour fermer.
// Se ferme avec le bouton, la touche Échap ou un clic sur le fond.
export const FenetreAlerte = ({ titre, children, onFermer, libelleBouton }) => {
  const t = useT();
  const bouton = useRef(null);

  useEffect(() => {
    bouton.current?.focus();
    const surTouche = (e) => {
      if (e.key === 'Escape') onFermer();
    };
    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  }, [onFermer]);

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center p-4 bg-encre/40"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onFermer();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="fenetre-alerte-titre"
        aria-describedby="fenetre-alerte-message"
        className="w-full max-w-md rounded-[20px] border border-lin-500 bg-lin-50 p-7 shadow-xl flex flex-col gap-5"
      >
        <h2 id="fenetre-alerte-titre" className={`m-0 ${cls.h3}`}>{titre}</h2>
        <p id="fenetre-alerte-message" className="m-0 text-[15px] leading-relaxed text-encre-700">{children}</p>
        <div className="flex justify-end">
          <button ref={bouton} type="button" onClick={onFermer} className={cls.btnPrimaire}>
            {libelleBouton || t('commun.compris')}
          </button>
        </div>
      </div>
    </div>
  );
};

export const Icone = {
  Chevron: (p) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" {...p}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  ),
  Droite: (p) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" {...p}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  ),
  Plus: (p) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" {...p}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  Loupe: (p) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  ),
  Grille: (p) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...p}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  Crayon: (p) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...p}>
      <path d="M4 20h4L19 9l-4-4L4 16z" />
    </svg>
  ),
  Imprimante: (p) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...p}>
      <path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M8 14h8v7H8z" />
    </svg>
  ),
  Corbeille: (p) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" {...p}>
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
    </svg>
  ),
  Telecharger: (p) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
    </svg>
  ),
  Dupliquer: (p) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true" {...p}>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
    </svg>
  ),
  Valider: (p) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" {...p}>
      <path d="m5 12 5 5 9-10" />
    </svg>
  ),
};
