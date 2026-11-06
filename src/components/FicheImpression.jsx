import { Fragment } from 'react';
import { NB_NUANCES_FICHE, LARGEURS_IDENT, LARGEURS_PRODUITS, LARGEUR_PH } from '../utils/ficheImprimable';

/**
 * Fiche recette au format impression : une page A4 paysage, en niveaux de gris.
 *
 * Invisible à l'écran (classe .fiche-imp, voir index.css) ; à l'impression, elle
 * remplace la vue de la fiche. Le contenu vient de construireFiche() (utils/ficheImprimable.js),
 * le même que pour le PDF du bouton « Télécharger » (utils/fichePdf.js).
 * Les cases vides restent imprimées pour pouvoir compléter à la main.
 */

const pourcent = (x) => `${Math.round(x * 1000) / 10}%`;

const Libelle = ({ children }) => <span className="fi-l">{children} :</span>;

// Mêmes colonnes pour les deux tableaux de produits, pour qu'elles s'alignent
const ColonnesProduits = () => (
  <colgroup>
    {LARGEURS_PRODUITS.map((l, i) => <col key={i} style={{ width: pourcent(l) }} />)}
  </colgroup>
);

const LigneRecette = ({ ligne }) => {
  const classes = [
    ligne.gris ? 'fi-gris' : '',
    ['titre', 'sousTitre', 'colorimetrie'].includes(ligne.type) ? 'fi-section' : '',
    ligne.type === 'colorimetrie' ? 'fi-colorimetrie' : '',
  ].filter(Boolean).join(' ');

  switch (ligne.type) {
    case 'titre':
      return (
        <tr className={classes}>
          <th scope="col" className="fi-lib fi-titre">{ligne.label}</th>
          {ligne.valeurs.map((v, i) => (
            <th key={i} scope="col" colSpan={3} className="fi-c fi-num">{v}</th>
          ))}
        </tr>
      );
    case 'sousTitre':
      return (
        <tr className={classes}>
          <th scope="col" className="fi-lib fi-titre">{ligne.label}</th>
          {Array.from({ length: NB_NUANCES_FICHE }, (_, i) => (
            <Fragment key={i}>
              {ligne.sous.map((s, k) => (
                <th key={k} scope="col" className={`fi-sc ${k === 2 ? 'fi-sc-fin' : ''}`}>{s}</th>
              ))}
            </Fragment>
          ))}
        </tr>
      );
    case 'parts':
      return (
        <tr className={classes}>
          <th scope="row" className="fi-lib">{ligne.label}</th>
          {ligne.valeurs.map((cases, i) => (
            <td key={i} colSpan={3} className="fi-c">
              <span className="fi-cases">
                {cases.map((v, k) => <span key={k} className="fi-case">{v}</span>)}
              </span>
            </td>
          ))}
        </tr>
      );
    case 'triple':
      return (
        <tr className={classes}>
          <th scope="row" className="fi-lib">{ligne.label}</th>
          {ligne.valeurs.map((trois, i) => (
            <Fragment key={i}>
              {trois.map((v, k) => (
                <td key={k} className={`fi-c ${k === 2 ? 'fi-sc-fin' : ''}`}>{v}</td>
              ))}
            </Fragment>
          ))}
        </tr>
      );
    case 'colorimetrie':
      return (
        <tr className={classes}>
          <th scope="row" className="fi-lib">
            <span className="fi-titre">{ligne.label}</span> {ligne.lignes[0]}
            <br />
            {ligne.lignes[1]}
          </th>
          {ligne.valeurs.map(([a, b], i) => (
            <td key={i} colSpan={3} className="fi-c fi-petit">
              {a}
              <br />
              {b}
            </td>
          ))}
        </tr>
      );
    default:
      return (
        <tr className={classes}>
          <th scope="row" className="fi-lib">{ligne.label}</th>
          {ligne.valeurs.map((v, i) => (
            <td key={i} colSpan={3} className={`fi-c ${ligne.petit ? 'fi-petit' : ''}`}>{v}</td>
          ))}
        </tr>
      );
  }
};

const FicheImpression = ({ fiche }) => (
  <div className="fiche-imp" aria-hidden="true">
    {/* Format de page : uniquement quand une fiche est affichée */}
    <style>{'@page { size: A4 landscape; margin: 8mm 9mm 16mm 9mm; }'}</style>

    <div className="fi-haut">
      <span className="fi-marque">{fiche.marque}</span>
      <span className="fi-bain">
        {fiche.bain[0]}
        <span className="fi-sep" />
        {fiche.bain[1]}
      </span>
    </div>

    {/* ===== Ligne d'identification ===== */}
    <table className="fi-table fi-cadre fi-ident">
      <colgroup>
        {LARGEURS_IDENT.map((l, i) => <col key={i} style={{ width: pourcent(l) }} />)}
      </colgroup>
      <tbody>
        <tr>
          {fiche.ident.map((c) => (
            <td key={c.label}>
              <Libelle>{c.label}</Libelle> {c.gras ? <b>{c.valeur}</b> : c.valeur}
            </td>
          ))}
        </tr>
      </tbody>
    </table>

    {/* ===== Informations générales (gauche) et produits (droite) ===== */}
    <div className="fi-milieu">
      <table className="fi-table fi-cadre fi-infos">
        <colgroup>
          <col />
          <col style={{ width: pourcent(LARGEUR_PH) }} />
        </colgroup>
        <tbody>
          {fiche.infos.map((ligne, i) => (
            <tr key={i} className={ligne.haute ? 'fi-haute' : ''}>
              {ligne.cases.length === 2 ? (
                ligne.cases.map((c) => (
                  <td key={c.label}><Libelle>{c.label}</Libelle> {c.valeur}</td>
                ))
              ) : (
                <td colSpan={2}>
                  <div className={`fi-boite ${ligne.cases[0].petit ? 'fi-petit' : ''}`}>
                    <Libelle>{ligne.cases[0].label}</Libelle> <span className="fi-libre">{ligne.cases[0].valeur}</span>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="fi-produits">
        <table className="fi-table fi-cadre" style={{ flexGrow: fiche.colorants.lignes.length + 1 }}>
          <ColonnesProduits />
          <thead>
            <tr>{fiche.colorants.entetes.map((e) => <th key={e}>{e}</th>)}</tr>
          </thead>
          <tbody>
            {fiche.colorants.lignes.map((l, i) => (
              <tr key={i} className={i % 2 === 0 ? 'fi-gris' : ''}>
                {l.map((v, k) => <td key={k} className={k >= 3 ? 'fi-c' : ''}>{v}</td>)}
              </tr>
            ))}
          </tbody>
        </table>

        <table className="fi-table fi-cadre" style={{ flexGrow: fiche.sels.lignes.length + 1 }}>
          <ColonnesProduits />
          <thead>
            <tr>
              {fiche.sels.entetes.map((e, k) => <th key={e} colSpan={k === 3 ? 2 : 1}>{e}</th>)}
            </tr>
          </thead>
          <tbody>
            {fiche.sels.lignes.map((l, i) => (
              <tr key={i} className={i % 2 === 0 ? 'fi-gris' : ''}>
                {l.map((v, k) => (
                  <td key={k} colSpan={k === 3 ? 2 : 1} className={k === 3 ? 'fi-c' : ''}>{v}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    {/* ===== Tableau des nuances ===== */}
    <table className="fi-table fi-cadre fi-recette">
      <colgroup>
        <col className="fi-col-lib" />
        {Array.from({ length: NB_NUANCES_FICHE * 3 }, (_, i) => <col key={i} />)}
      </colgroup>
      <tbody>
        {fiche.recette.map((ligne, i) => <LigneRecette key={i} ligne={ligne} />)}
      </tbody>
    </table>
  </div>
);

export default FicheImpression;
