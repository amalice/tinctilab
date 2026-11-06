import React, { useState, useEffect, Fragment } from 'react';
import { supabase } from '../supabaseClient';
import { formaterDate, CHAMPS_RECETTE, CHAMPS_COULEUR, extraire, TABLE_RECETTES } from '../utils/recettes';
import { labVersLch, labComplet, hexNuance } from '../utils/couleurs';
import { useNavigate } from 'react-router-dom';
import { cls, Icone, PastilleNuance, Chargement, Message, fondCouleur } from './ui';
import FicheImpression from './FicheImpression';
import { construireFiche } from '../utils/ficheImprimable';
import { useLangue, useNombre } from '../i18n';

const RecetteView = ({ projetId, projetNom, recetteId, onEdit, peutModifier = false, peutSupprimer = false }) => {
  const [recette, setRecette] = useState(null);
  const [couleurs, setCouleurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [suppression, setSuppression] = useState(false);
  const [erreurSuppression, setErreurSuppression] = useState('');
  const [telechargement, setTelechargement] = useState(false);
  const navigate = useNavigate();
  const { t, langue } = useLangue();
  const aff = useNombre(); // virgule ou point décimal selon la langue

  useEffect(() => {
    const fetchRecette = async () => {
      setLoading(true);
      setError('');
      try {
        const { data, error } = await supabase
          .from(TABLE_RECETTES)
          .select('*')
          .eq('projet_id', projetId)
          .eq('recette_id', recetteId)
          .order('couleur_numero', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          setRecette(extraire(data[0], CHAMPS_RECETTE));

          setCouleurs(data.map((row) => {
            const nuance = extraire(row, CHAMPS_COULEUR);
            // Fiche enregistrée avant l'ajout du LCh : on le calcule depuis le Lab
            if ((nuance.couleur_lch_c === null || nuance.couleur_lch_h === null)
              && labComplet(nuance.couleur_lab_l, nuance.couleur_lab_a, nuance.couleur_lab_b)) {
              const [, C, h] = labVersLch(nuance.couleur_lab_l, nuance.couleur_lab_a, nuance.couleur_lab_b);
              nuance.couleur_lch_c = C;
              nuance.couleur_lch_h = h;
            }
            return nuance;
          }));
        } else {
          setError(t('fiche.introuvable'));
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (recetteId && projetId) fetchRecette();
    else if (!projetId) {
      setError(t('commun.selectionnezProjet'));
      setLoading(false);
    }
  }, [recetteId, projetId]);

  const getRapportDeBainValue = () => {
    if (!recette?.rapport_de_bain) return 0;
    const match = String(recette.rapport_de_bain).match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  };

  const calculateValeurDeLaPart = (profondeurTon) => {
    if (!recette.nb_parts_totales || profondeurTon === undefined || profondeurTon === null) {
      return '0,00';
    }
    const valeur = (parseFloat(profondeurTon) / parseFloat(recette.nb_parts_totales)).toFixed(4);
    return valeur.replace('.', ',');
  };

  const calculateVolumeDuBain = (poidsTissu) => {
    const rapportValue = getRapportDeBainValue();
    return rapportValue ? (poidsTissu * rapportValue).toFixed(1).replace('.', ',') : '0,0';
  };

  const calculatePourcentColorant = (couleur, colorantIndex) => {
    const nbParts = couleur[`nb_part_colorant_${colorantIndex}`] ?? 0;
    const profondeurTon = couleur.profondeur_ton ?? 0;
    const nbPartsTotales = recette.nb_parts_totales ?? 0;
  
    if (nbPartsTotales === 0) return 0;
    return (nbParts * profondeurTon / nbPartsTotales).toFixed(1);
  };  

  const calculateQuantiteColorant = (couleur, colorantIndex) => {
    const dilution = recette[`colorant_${colorantIndex}_dilution`];
    const qtePoudre = recette[`colorant_${colorantIndex}_qte_poudre`];
    const nbParts = couleur[`nb_part_colorant_${colorantIndex}`];
    const poids = couleur.poids_tissu;
    const nbPartsTotales = recette.nb_parts_totales;

    const quantite = (dilution * couleur.profondeur_ton * nbParts * poids) / (qtePoudre * nbPartsTotales);
    return quantite.toFixed(3).replace('.', ',');
  };

  // Quantité de mordant = poids du tissu × % / 100 × dilution de la solution mère
  // (même convention que les colorants : % exprimé par rapport au poids du tissu).
  const calculateQuantiteMordant = (couleur, mordantIndex) => {
    const pourcentage = parseFloat(couleur[`pourcent_mordant_${mordantIndex}`]) || 0;
    const poids = parseFloat(couleur.poids_tissu) || 0;
    const dilution = parseFloat(recette[`mordant_${mordantIndex}_dilution`]) || 1;
    return (poids * pourcentage / 100 * dilution).toFixed(3).replace('.', ',');
  };

  const calculateVolumeEauInitial = (volumeDuBain, quantites) => {
    const totalQuantites = quantites.reduce((sum, qte) => sum + parseFloat(qte.replace(',', '.')) || 0, 0);
    return (parseFloat(volumeDuBain.replace(',', '.')) - totalQuantites).toFixed(1).replace('.', ',');
  };

  const getUnite = (Index,mordantOuColorant) => {
    return Number(recette[`${mordantOuColorant}_${Index}_dilution`]) === 1 ? "g" : "ml";
  };

  // Suppression de la fiche (Administrateurs et Teinturiers du projet ; vérifié aussi côté Supabase)
  const supprimerFiche = async () => {
    if (!window.confirm(t('fiche.confirmerSuppression', { n: recette.numero_fiche }))) return;
    setSuppression(true);
    setErreurSuppression('');
    const { error } = await supabase.rpc('supprimer_fiche', {
      p_projet_id: projetId,
      p_recette_id: recetteId,
    });
    setSuppression(false);
    if (error) {
      console.error(error);
      setErreurSuppression(t('fiche.erreurSuppression', { message: error.message }));
      return;
    }
    navigate('/nuancier');
  };

  if (loading) return <Chargement />;
  if (error) return <Message erreur>{error}</Message>;
  if (!recette) return <Message>{t('fiche.aucuneSelectionnee')}</Message>;

  const indexColorants = [1, 2, 3].filter((i) => recette[`colorant_${i}`]);
  const indexMordants = [1, 2, 3].filter((i) => recette[`mordant_${i}`]);
  // Fournisseur et lot, affichés sous le nom du colorant ou du sel
  const provenance = (prefixe) => [
    recette[`${prefixe}_fournisseur`],
    recette[`${prefixe}_lot`] && t('fiche.lotN', { lot: recette[`${prefixe}_lot`] }),
  ].filter(Boolean).join(' · ');
  const codeCouleur = (valeurs) =>
    valeurs.every((v) => v !== null && v !== undefined && v !== '') ? valeurs.join(', ') : '—';
  const nombre = (v, decimales) =>
    v === null || v === undefined || v === '' ? '—' : aff(Number(v).toFixed(decimales));

  const lignesNuances = [
    {
      label: t('fiche.nbParts'),
      aide: indexColorants.map((i) => recette[`colorant_${i}`]).join(' · '),
      valeur: (c) => indexColorants.map((i) => c[`nb_part_colorant_${i}`] ?? 0).join(' · ') || '—',
    },
    { label: t('fiche.valeurPart'), aide: t('fiche.calculee'), valeur: (c) => aff(calculateValeurDeLaPart(c.profondeur_ton)) },
    { label: t('fiche.profondeur'), aide: '', valeur: (c) => nombre(c.profondeur_ton, 2) },
    { label: t('fiche.poids'), aide: 'g', valeur: (c) => aff(c.poids_tissu ?? '—') },
    { label: t('fiche.volumeBain'), aide: t('fiche.mlCalcule'), valeur: (c) => aff(calculateVolumeDuBain(c.poids_tissu)) },
    { label: t('fiche.bleuDepart'), aide: '', valeur: (c) => c.bleu_depart || '—' },
    { label: t('fiche.infosNuance'), aide: '', valeur: (c) => c.info || '—' },
  ];

  const volumeEauInitial = (couleur) => {
    const quantitesColorants = [
      calculateQuantiteColorant(couleur, 1),
      calculateQuantiteColorant(couleur, 2),
      calculateQuantiteColorant(couleur, 3),
    ];
    const quantitesMordants = [
      calculateQuantiteMordant(couleur, 1),
      calculateQuantiteMordant(couleur, 2),
      calculateQuantiteMordant(couleur, 3),
    ];
    const allQuantites = [...quantitesColorants, ...quantitesMordants];
    const volumeDuBain = calculateVolumeDuBain(couleur.poids_tissu);
    return calculateVolumeEauInitial(volumeDuBain, allQuantites);
  };

  // En-tête commun aux tableaux : une colonne par nuance
  const EnTeteNuances = ({ premiere, sousColonnes = false }) => (
    <thead>
      <tr>
        <th
          scope="col"
          rowSpan={sousColonnes ? 2 : 1}
          className="text-left px-5 py-4 font-medium text-[13px] text-encre-500 w-48"
        >
          {premiere}
        </th>
        {couleurs.map((c) => (
          <th
            key={c.couleur_numero}
            scope={sousColonnes ? 'colgroup' : 'col'}
            colSpan={sousColonnes ? 2 : 1}
            className={`px-2 font-medium ${sousColonnes ? 'pt-3.5 pb-1' : 'py-4'}`}
          >
            <PastilleNuance hex={hexNuance(c)} numero={c.couleur_numero} />
          </th>
        ))}
      </tr>
      {sousColonnes && (
        <tr>
          {couleurs.map((c) => (
            <Fragment key={c.couleur_numero}>
              <th scope="col" className="px-2 pt-1 pb-3 font-normal text-xs text-encre-500">{t('fiche.pourcent')}</th>
              <th scope="col" className="px-2 pt-1 pb-3 font-normal text-xs text-encre-500">{t('fiche.quantite')}</th>
            </Fragment>
          ))}
        </tr>
      )}
    </thead>
  );

  const Info = ({ label, children, large = false }) => (
    <div className={`flex flex-col gap-1 ${large ? 'col-span-2' : ''}`}>
      <dt className="text-[13px] text-encre-500">{label}</dt>
      <dd className="m-0 text-[15px] leading-relaxed">{children || '—'}</dd>
    </div>
  );

  // Calculs partagés avec la version imprimée (mêmes valeurs qu'à l'écran)
  const calculs = {
    pourcentColorant: calculatePourcentColorant,
    quantiteColorant: calculateQuantiteColorant,
    quantiteMordant: calculateQuantiteMordant,
    volumeBain: (c) => calculateVolumeDuBain(c.poids_tissu),
    volumeEau: volumeEauInitial,
    unite: getUnite,
  };

  // Contenu de la fiche imprimable : le même pour l'impression et le PDF téléchargé
  const fiche = construireFiche({ recette, couleurs, projetNom, calculs, t, aff, langue });

  const telecharger = async () => {
    setTelechargement(true);
    setErreurSuppression('');
    try {
      const { genererFichePdf, telechargerPdf } = await import('../utils/fichePdf');
      const titre = t('commun.fiche', { n: recette.numero_fiche });
      const octets = await genererFichePdf(fiche, { titre });
      const nom = String(recette.numero_fiche || 'recette').replace(/[^\w.-]+/g, '_');
      telechargerPdf(octets, `${t('fiche.nomFichierPdf')}-${nom}.pdf`);
    } catch (err) {
      console.error(err);
      setErreurSuppression(t('fiche.erreurTelechargement', { message: err.message }));
    } finally {
      setTelechargement(false);
    }
  };

  return (
    <>
    <FicheImpression fiche={fiche} />
    <div className={`${cls.page} vue-ecran-fiche flex flex-col gap-12`}>
      {/* ===== EN-TÊTE ===== */}
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap gap-6 justify-between items-end">
          <div className="flex flex-col gap-2.5">
            <h1 className="m-0 font-serif font-normal text-[52px] tracking-tight">{t('commun.fiche', { n: recette.numero_fiche })}</h1>
          </div>
          <div className="flex gap-2.5">
            <button type="button" onClick={() => window.print()} className={cls.btnSecondaire}>
              <Icone.Imprimante />{t('fiche.imprimer')}
            </button>
            <button type="button" onClick={telecharger} disabled={telechargement} className={`${cls.btnSecondaire} disabled:opacity-60`}>
              <Icone.Telecharger />{telechargement ? t('fiche.telechargementEnCours') : t('fiche.telecharger')}
            </button>
            {peutModifier && (
              <button
                type="button"
                onClick={() => navigate('/nouvelle-recette', { state: { dupliquer: recetteId } })}
                className={cls.btnSecondaire}
              >
                <Icone.Dupliquer />{t('fiche.dupliquer')}
              </button>
            )}
            {peutSupprimer && (
              <button type="button" onClick={supprimerFiche} disabled={suppression} className={cls.btnDanger}>
                <Icone.Corbeille />{suppression ? t('fiche.suppressionEnCours') : t('fiche.supprimer')}
              </button>
            )}
            {peutModifier && (
              <button
                type="button"
                onClick={() => navigate(`/recette/${recetteId}/edit`)}  // Navigue vers l'URL d'édition
                className={cls.btnPrimaire}
              >
                <Icone.Crayon />{t('fiche.modifier')}
              </button>
            )}
          </div>
        </div>
        {erreurSuppression && <p role="alert" className={`m-0 ${cls.erreur}`}>{erreurSuppression}</p>}
      </div>

      {/* ===== COULEURS OBTENUES ===== */}
      <section aria-label={t('fiche.couleurs')} className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        {couleurs.map((c) => (
          <div key={c.couleur_numero} className="flex flex-col gap-2.5">
            <div
              className="relative h-36 rounded-[14px] border border-black/5"
              style={fondCouleur(hexNuance(c))}
            >
              <span className="absolute top-2.5 left-2.5 w-7 h-7 rounded-full bg-lin-50/90 flex items-center justify-center text-[13px] font-semibold">
                {c.couleur_numero}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 font-mono text-xs text-encre-600">
              <span className="font-medium text-encre">Lab {codeCouleur([c.couleur_lab_l, c.couleur_lab_a, c.couleur_lab_b])}</span>
              <span>LCh {codeCouleur([c.couleur_lab_l, c.couleur_lch_c, c.couleur_lch_h])}</span>
            </div>
          </div>
        ))}
      </section>

      {/* ===== INFORMATIONS + BAIN ===== */}
      <section className="flex flex-wrap gap-6">
        <div className={`${cls.carte} flex-[1_1_520px] p-7 flex flex-col gap-5`}>
          <h2 className={`m-0 ${cls.h3}`}>{t('fiche.informations')}</h2>
          <dl className="m-0 grid grid-cols-2 gap-x-6 gap-y-5">
            <Info label={t('fiche.nom')}>{recette.nom}</Info>
            <Info label={t('fiche.date')}>{formaterDate(recette.date, langue)}</Info>
            <Info label={t('fiche.objet')}>{recette.objet}</Info>
            <Info label={t('fiche.matiere')}>{recette.matiere}</Info>
            <Info label={t('fiche.phEau')}>
              {recette.ph_eau !== null && recette.ph_eau !== undefined && recette.ph_eau !== '' ? aff(String(recette.ph_eau)) : ''}
            </Info>
            <Info label={t('fiche.preMordancage')}>{recette.pre_mordancage}</Info>
            <Info label={t('fiche.monteeTemperature')} large>
              {recette.montee_temperature && <span className="whitespace-pre-line">{recette.montee_temperature}</span>}
            </Info>
            <Info label={t('fiche.observations')} large>{recette.observations}</Info>
          </dl>
        </div>

        <div className={`${cls.carte} flex-[1_1_400px] p-7 flex flex-col gap-5`}>
          <h2 className={`m-0 ${cls.h3}`}>{t('fiche.bain')}</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="px-4 py-3.5 rounded-xl bg-lin-200">
              <div className="text-[13px] text-encre-500">{t('fiche.rapportDeBain')}</div>
              <div className="mt-1 font-mono text-[22px] font-medium">
                {recette.rapport_de_bain ? `1:${recette.rapport_de_bain}` : '—'}
              </div>
            </div>
            <div className="px-4 py-3.5 rounded-xl bg-lin-200">
              <div className="text-[13px] text-encre-500">{t('fiche.partsTotales')}</div>
              <div className="mt-1 font-mono text-[22px] font-medium">{recette.nb_parts_totales ?? '—'}</div>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-encre-500">
                <th className="py-2 font-medium text-[13px]">{t('fiche.colorant')}</th>
                <th className="py-2 font-medium text-[13px] text-right">{t('fiche.poudre')}</th>
                <th className="py-2 font-medium text-[13px] text-right">{t('fiche.dilution')}</th>
              </tr>
            </thead>
            <tbody>
              {indexColorants.length === 0 && (
                <tr className="border-t border-lin-400"><td colSpan="3" className="py-2.5 text-encre-500">—</td></tr>
              )}
              {indexColorants.map((i) => (
                <tr key={i} className="border-t border-lin-400">
                  <td className="py-2.5">
                    {recette[`colorant_${i}`]}
                    {provenance(`colorant_${i}`) && (
                      <span className="block text-xs text-encre-500">{provenance(`colorant_${i}`)}</span>
                    )}
                  </td>
                  <td className="py-2.5 text-right font-mono align-top">{recette[`colorant_${i}_qte_poudre`] || '0'}</td>
                  <td className="py-2.5 text-right font-mono align-top">
                    {aff(String(recette[`colorant_${i}_dilution`] ?? '')) || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-encre-500">
                <th className="py-2 font-medium text-[13px]">{t('fiche.mordantNuancage')}</th>
                <th className="py-2 font-medium text-[13px] text-right">{t('fiche.dilution')}</th>
              </tr>
            </thead>
            <tbody>
              {indexMordants.length === 0 && (
                <tr className="border-t border-lin-400"><td colSpan="2" className="py-2.5 text-encre-500">—</td></tr>
              )}
              {indexMordants.map((i) => (
                <tr key={i} className="border-t border-lin-400">
                  <td className="py-2.5">
                    {recette[`mordant_${i}`]}
                    {provenance(`mordant_${i}`) && (
                      <span className="block text-xs text-encre-500">{provenance(`mordant_${i}`)}</span>
                    )}
                  </td>
                  <td className="py-2.5 text-right font-mono align-top">{recette[`mordant_${i}_dilution`] || '1'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ===== NUANCES ===== */}
      <section className="flex flex-col gap-4">
        <h2 className={`m-0 ${cls.h2}`}>{t('fiche.nuances')}</h2>
        <div className={cls.tableau}>
          <table className="w-full min-w-[900px] text-sm">
            <EnTeteNuances premiere={t('fiche.nuance')} />
            <tbody>
              {lignesNuances.map((ligne) => (
                <tr key={ligne.label} className="border-t border-lin-400">
                  <th scope="row" className="text-left px-5 py-3.5 font-normal text-encre-700">
                    {ligne.label}
                    {ligne.aide && <span className="block text-xs text-encre-500">{ligne.aide}</span>}
                  </th>
                  {couleurs.map((c) => (
                    <td key={c.couleur_numero} className="px-3 py-3.5 text-center font-mono">
                      {ligne.valeur(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ===== COLORANTS ===== */}
      <section className="flex flex-col gap-4">
        <h2 className={`m-0 ${cls.h2}`}>{t('fiche.colorants')}</h2>
        <div className={cls.tableau}>
          <table className="w-full min-w-[1000px] text-sm">
            <EnTeteNuances premiere={t('fiche.colorant')} sousColonnes />
            <tbody>
              {indexColorants.map((i) => (
                <tr key={i} className="border-t border-lin-400">
                  <th scope="row" className="text-left px-5 py-3.5 font-normal text-encre-700">
                    {recette[`colorant_${i}`] || '—'}
                    <span className="block text-xs text-encre-500">{getUnite(i, 'colorant')}</span>
                  </th>
                  {couleurs.map((couleur) => (
                    <Fragment key={couleur.couleur_numero}>
                      <td className="px-2 py-3.5 text-center font-mono text-encre-500">
                        {aff(calculatePourcentColorant(couleur, i))}
                      </td>
                      <td className="px-2 py-3.5 text-center font-mono font-medium">
                        {aff(calculateQuantiteColorant(couleur, i))}
                      </td>
                    </Fragment>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ===== NUANÇAGE (colonnes mordant_* en base) ===== */}
      <section className="flex flex-col gap-4">
        <h2 className={`m-0 ${cls.h2}`}>{t('fiche.mordants')}</h2>
        <div className={cls.tableau}>
          <table className="w-full min-w-[1000px] text-sm">
            <EnTeteNuances premiere={t('fiche.mordant')} sousColonnes />
            <tbody>
              {indexMordants.map((i) => (
                <tr key={i} className="border-t border-lin-400">
                  <th scope="row" className="text-left px-5 py-3.5 font-normal text-encre-700">
                    {recette[`mordant_${i}`] || '—'}
                    <span className="block text-xs text-encre-500">{getUnite(i, 'mordant')}</span>
                  </th>
                  {couleurs.map((couleur) => {
                    const pourcentage = couleur[`pourcent_mordant_${i}`];
                    return (
                      <Fragment key={couleur.couleur_numero}>
                        <td className="px-2 py-3.5 text-center font-mono text-encre-500">{aff(pourcentage)}</td>
                        <td className="px-2 py-3.5 text-center font-mono font-medium">
                          {aff(calculateQuantiteMordant(couleur, i))}
                        </td>
                      </Fragment>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ===== VOLUME D'EAU INITIAL ===== */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap justify-between items-baseline gap-4">
          <h2 className={`m-0 ${cls.h2}`}>{t('fiche.volumeEau')}</h2>
          <p className="m-0 text-sm text-encre-500">{t('fiche.volumeEauNote')}</p>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
          {couleurs.map((c) => (
            <div key={c.couleur_numero} className={`${cls.carte} rounded-2xl flex items-center gap-3.5 px-5 py-4`}>
              <span
                className="w-8 h-8 flex-none rounded-lg border border-black/5 flex items-center justify-center text-[13px] font-semibold"
                style={fondCouleur(hexNuance(c))}
              >
                {c.couleur_numero}
              </span>
              <span className="font-mono text-[22px] font-medium">{aff(volumeEauInitial(c))}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
    </>
  );
};

export default RecetteView;
