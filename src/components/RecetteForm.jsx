import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { CHAMPS_RECETTE, CHAMPS_COULEUR, extraire, numeroFicheExiste, TABLE_RECETTES } from '../utils/recettes';
import { labVersLch, lchVersLab, hexNuance } from '../utils/couleurs';
import { useNavigate, Link } from 'react-router-dom';
import { cls, Icone, PastilleNuance, fondCouleur, FenetreAlerte } from './ui';
import { useT, useNombre } from '../i18n';

// ===== Petits composants de mise en page =====
// Définis hors du composant principal pour que React ne recrée pas les champs
// (et ne perde pas le focus) à chaque frappe.

const ChampInfo = ({ name, label, value, onChange, type = 'text', required = false, mono = false, large = false, ...reste }) => (
  <div className={`flex flex-col gap-1.5 ${large ? 'col-span-2' : ''}`}>
    <label htmlFor={`f-${name}`} className={cls.labelPetit}>{label}{required && ' *'}</label>
    <input
      id={`f-${name}`}
      type={type}
      name={name}
      value={value ?? ''}
      onChange={onChange}
      className={mono ? cls.inputMono : cls.input}
      required={required}
      {...reste}
    />
  </div>
);

const ChampTexteLong = ({ name, label, value, onChange, rows = 3 }) => (
  <div className="col-span-2 flex flex-col gap-1.5">
    <label htmlFor={`f-${name}`} className={cls.labelPetit}>{label}</label>
    <textarea
      id={`f-${name}`}
      name={name}
      rows={rows}
      value={value ?? ''}
      onChange={onChange}
      className={`${cls.input} h-auto py-2.5 leading-relaxed resize-y`}
    />
  </div>
);

// En-tête commun aux tableaux : une colonne par nuance
const EnTeteNuances = ({ couleurs, premiere, sousColonnes = false }) => {
  const t = useT();
  return (
  <thead>
    <tr>
      <th scope="col" className="text-left px-5 pt-4 pb-2 font-medium text-[13px] text-encre-500 w-48">{premiere}</th>
      {couleurs.map((c) => (
        <th key={c.couleur_numero} scope="col" className="px-2 pt-4 pb-2 font-medium">
          <PastilleNuance hex={hexNuance(c)} numero={c.couleur_numero} />
          {sousColonnes && (
            <span className="grid grid-cols-2 gap-1 mt-1.5 text-xs font-normal text-encre-500">
              <span>{t('fiche.pourcent')}</span><span>{t('fiche.quantite')}</span>
            </span>
          )}
        </th>
      ))}
    </tr>
  </thead>
  );
};

const LigneTitre = ({ label, aide }) => (
  <th scope="row" className="text-left px-5 py-3 font-normal text-encre-700">
    {label}
    {aide && <span className="block text-xs text-encre-500">{aide}</span>}
  </th>
);

const Section = ({ titre, note, children, minWidth = 'min-w-[1060px]' }) => (
  <section className="flex flex-col gap-4">
    <div className="flex flex-wrap justify-between items-baseline gap-4">
      <h2 className={`m-0 ${cls.h2}`}>{titre}</h2>
      {note && <p className="m-0 text-sm text-encre-500">{note}</p>}
    </div>
    <div className={cls.tableau}>
      <table className={`w-full ${minWidth} text-sm`}>{children}</table>
    </div>
  </section>
);

// Case L, a, b, C ou h : champ texte qui accepte une saisie en cours (« - », « -1 », « 12, »…)
// et ne transmet la valeur que lorsqu'elle forme un nombre complet, borné entre min et max
// et arrondi à 2 décimales. Une case vidée transmet null.
const NOMBRE_COMPLET = /^-?\d+(\.\d*)?$|^-?\.\d+$/;
const SAISIE_POSSIBLE = /^-?\d*[.,]?\d*$/;
const texteValeur = (v) => (v === null || v === undefined ? '' : String(v));

const ChampLab = ({ value, onValeur, min, max, label }) => {
  const [saisie, setSaisie] = useState(texteValeur(value));
  const enCours = useRef(false);

  // Mise à jour depuis l'extérieur (ex. a et b recalculés après un changement de C ou h)
  useEffect(() => {
    if (!enCours.current) setSaisie(texteValeur(value));
  }, [value]);

  const surSaisie = (e) => {
    const texte = e.target.value.replace(/\s/g, '');
    if (!SAISIE_POSSIBLE.test(texte)) return; // ignore lettres et caractères invalides
    setSaisie(texte);
    if (texte === '') {
      onValeur(null);
      return;
    }
    const normalise = texte.replace(',', '.');
    if (NOMBRE_COMPLET.test(normalise)) {
      const nombre = Math.min(max, Math.max(min, parseFloat(normalise)));
      onValeur(Math.round(nombre * 100) / 100);
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={saisie}
      onFocus={() => { enCours.current = true; }}
      onChange={surSaisie}
      onBlur={() => {
        enCours.current = false;
        // Saisie incomplète (« - »…) : on réaffiche la dernière valeur valide
        setSaisie(texteValeur(value));
      }}
      aria-label={label}
      className={`${cls.inputCellule} px-0.5 text-xs`}
    />
  );
};

const BoutonsAction = ({ onAnnuler, loading, recetteId }) => {
  const t = useT();
  return (
  <div className="flex gap-2.5">
    <button type="button" onClick={onAnnuler} className={cls.btnSecondaire}>{t('commun.annuler')}</button>
    <button type="submit" disabled={loading} className={cls.btnPrimaire}>
      <Icone.Valider />
      {loading ? t('form.enregistrement') : recetteId ? t('form.mettreAJour') : t('form.enregistrer')}
    </button>
  </div>
  );
};

// ===== Valeurs par défaut =====
const RECETTE_VIDE = {
  ...Object.fromEntries(CHAMPS_RECETTE.map((champ) => [champ, ''])),
  date: new Date().toISOString().split('T')[0],
  nb_parts_totales: 100,
  colorant_1_qte_poudre: 100,
  colorant_2_qte_poudre: 100,
  colorant_3_qte_poudre: 100,
  colorant_1_dilution: 1,
  colorant_2_dilution: 1,
  colorant_3_dilution: 1,
  mordant_1_dilution: 1,
  mordant_2_dilution: 1,
  mordant_3_dilution: 1,
};

// Une nuance vierge : la couleur (Lab / LCh) n'est pas renseignée tant qu'elle n'a pas été mesurée
// Les cases numériques sont vides (null) : en cliquant dedans, on ne voit que le curseur, sans « 0 ».
const nuanceVide = (numero) => ({
  couleur_numero: numero,
  nb_part_colorant_1: null,
  nb_part_colorant_2: null,
  nb_part_colorant_3: null,
  profondeur_ton: null,
  poids_tissu: null,
  bleu_depart: '',
  info: '',
  pourcent_mordant_1: null,
  pourcent_mordant_2: null,
  pourcent_mordant_3: null,
  couleur_lab_l: null,
  couleur_lab_a: null,
  couleur_lab_b: null,
  couleur_lch_c: null,
  couleur_lch_h: null,
});

const NB_NUANCES = 6;

// Cases numériques des nuances : vides à l'écran quand elles valent 0, enregistrées à 0 quand elles sont vides
const CHAMPS_NUMERIQUES_NUANCE = [
  'nb_part_colorant_1', 'nb_part_colorant_2', 'nb_part_colorant_3',
  'profondeur_ton', 'poids_tissu',
  'pourcent_mordant_1', 'pourcent_mordant_2', 'pourcent_mordant_3',
];
const zeroVersVide = (nuance) => {
  const n = { ...nuance };
  CHAMPS_NUMERIQUES_NUANCE.forEach((champ) => {
    if (n[champ] === 0 || n[champ] === '0') n[champ] = null;
  });
  return n;
};
const videVersZero = (nuance) => {
  const n = { ...nuance };
  CHAMPS_NUMERIQUES_NUANCE.forEach((champ) => {
    if (n[champ] === null || n[champ] === undefined || n[champ] === '') n[champ] = 0;
  });
  return n;
};
// Saisie d'une case numérique : vide → null, sinon nombre (entier pour les parts)
const lireNombre = (texte, entier = false) => {
  if (texte === '') return null;
  const v = entier ? parseInt(texte, 10) : parseFloat(texte);
  return Number.isFinite(v) ? v : null;
};

const estNombre = (v) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));

// Champs numériques facultatifs : '' → null, virgule acceptée
const nombreOuNull = (v) => {
  if (v === null || v === undefined || String(v).trim() === '') return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

const RecetteForm = ({ projetId, projetNom, recetteId = null, modeleId = null, onSuccess }) => {
  // modeleId : fiche à dupliquer (bouton « Dupliquer ») ; tout est repris sauf le numéro de fiche
  const idACharger = recetteId || modeleId;
  const [numeroModele, setNumeroModele] = useState(null);
  // Fiche enregistrée : pop-up de confirmation, puis ouverture de la fiche
  const [ficheEnregistree, setFicheEnregistree] = useState(null);

  const [recette, setRecette] = useState(RECETTE_VIDE);
  const [couleurs, setCouleurs] = useState(() =>
    Array.from({ length: NB_NUANCES }, (_, i) => nuanceVide(i + 1))
  );

  const [error, setError] = useState('');
  // Numéro de fiche déjà utilisé dans le projet : affiché dans une fenêtre pop-up
  const [numeroEnDouble, setNumeroEnDouble] = useState(null);
  const fermerAlerteNumero = useCallback(() => {
    setNumeroEnDouble(null);
    // On replace le curseur dans le champ à corriger
    const champ = document.getElementById('f-numero_fiche');
    if (champ) {
      champ.focus();
      champ.select();
    }
  }, []);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const t = useT();
  const aff = useNombre(); // virgule ou point décimal selon la langue

  useEffect(() => {
    if (idACharger && projetId) {
      const fetchRecette = async () => {
        try {
          const { data, error } = await supabase
            .from(TABLE_RECETTES)
            .select('*')
            .eq('projet_id', projetId)
            .eq('recette_id', idACharger)
            .order('couleur_numero', { ascending: true });

          if (error) throw error;

          if (data && data.length > 0) {
            const donnees = extraire(data[0], CHAMPS_RECETTE);
            if (!recetteId) {
              // Duplication : nouvelle fiche, numéro à saisir
              setNumeroModele(donnees.numero_fiche);
              donnees.numero_fiche = '';
              setTimeout(() => document.getElementById('f-numero_fiche')?.focus(), 0);
            }
            setRecette(donnees);

            const newCouleurs = Array.from({ length: NB_NUANCES }, (_, i) => nuanceVide(i + 1));
            data.forEach((row) => {
              const index = row.couleur_numero - 1;
              if (index >= 0 && index < NB_NUANCES) {
                const nuance = zeroVersVide(extraire(row, CHAMPS_COULEUR));
                // Fiche enregistrée avant l'ajout du LCh : on le calcule depuis le Lab
                if (!estNombre(nuance.couleur_lch_c) && estNombre(nuance.couleur_lab_a) && estNombre(nuance.couleur_lab_b)) {
                  const [, C, h] = labVersLch(nuance.couleur_lab_l, nuance.couleur_lab_a, nuance.couleur_lab_b);
                  nuance.couleur_lch_c = C;
                  nuance.couleur_lch_h = h;
                }
                newCouleurs[index] = nuance;
              }
            });
            setCouleurs(newCouleurs);
          }
        } catch (err) {
          setError(t('form.erreurChargement'));
          console.error(err);
        }
      };
      fetchRecette();
    }
  }, [idACharger, projetId, recetteId]);

  const handleRecetteChange = (e) => {
    const { name, value } = e.target;
    setRecette((prec) => ({ ...prec, [name]: value }));
  };

  const handleCouleurChange = (index, field, value) => {
    setCouleurs((prec) => prec.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  };

  // Colorimétrie : L est commun au Lab et au LCh. La conversion a,b ⇄ C,h se fait
  // dès que les deux valeurs du code modifié sont renseignées ; sinon l'autre code est vidé.
  const handleCouleurimetrie = (index, field, value) => {
    setCouleurs((prec) => prec.map((c, i) => {
      if (i !== index) return c;
      const n = { ...c, [field]: value };
      if (field === 'couleur_lab_a' || field === 'couleur_lab_b') {
        if (estNombre(n.couleur_lab_a) && estNombre(n.couleur_lab_b)) {
          const [, C, h] = labVersLch(0, n.couleur_lab_a, n.couleur_lab_b);
          n.couleur_lch_c = C;
          n.couleur_lch_h = h;
        } else {
          n.couleur_lch_c = null;
          n.couleur_lch_h = null;
        }
      } else if (field === 'couleur_lch_c' || field === 'couleur_lch_h') {
        if (estNombre(n.couleur_lch_c) && estNombre(n.couleur_lch_h)) {
          const [, a, b] = lchVersLab(0, n.couleur_lch_c, n.couleur_lch_h);
          n.couleur_lab_a = a;
          n.couleur_lab_b = b;
        } else {
          n.couleur_lab_a = null;
          n.couleur_lab_b = null;
        }
      }
      return n;
    }));
  };

  const getRapportDeBainValue = () => {
    if (!recette.rapport_de_bain) return 0;
    const match = String(recette.rapport_de_bain).match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  };

  const calculateValeurDeLaPart = (profondeurTon) => {
    if (!recette.nb_parts_totales || profondeurTon === undefined || profondeurTon === null) {
      return '0,00';
    }
    const valeur = (parseFloat(profondeurTon) / parseFloat(recette.nb_parts_totales)).toFixed(2);
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

  // Quantité de sel de nuançage = poids du tissu × % / 100 × dilution de la solution mère
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

  // La saisie renvoie du texte (« 1 ») et la base un nombre (1) : on compare des nombres
  const getUnite = (Index,mordantOuColorant) => {
    return Number(recette[`${mordantOuColorant}_${Index}_dilution`]) === 1 ? "g" : "ml";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!projetId) throw new Error(t('commun.selectionnezProjet'));
      const numero = String(recette.numero_fiche ?? '').trim();
      if (!numero) throw new Error(t('form.numeroObligatoire'));

      // Un numéro de fiche ne peut exister qu'une fois par projet
      // (en modification, la fiche elle-même n'est pas comptée).
      if (await numeroFicheExiste(projetId, numero, recetteId)) {
        setNumeroEnDouble(numero);
        return;
      }

      const finalRecetteId = recetteId || crypto.randomUUID();
      const donneesRecette = {
        ...recette,
        numero_fiche: numero,
        ph_eau: nombreOuNull(recette.ph_eau),
      };

      const recetteData = couleurs
      .filter(
        (couleur) =>
          couleur.nb_part_colorant_1 > 0 ||
          couleur.nb_part_colorant_2 > 0 ||
          couleur.nb_part_colorant_3 > 0
      )
      .map((couleur) => ({
        ...donneesRecette,
        ...extraire(videVersZero(couleur), CHAMPS_COULEUR),
        id: crypto.randomUUID(),
      }));

      // Enregistrement côté Supabase (fonction enregistrer_fiche) : vérifie le rôle
      // (Administrateur ou Teinturier) et remplace les nuances en une seule transaction.
      const { error } = await supabase.rpc('enregistrer_fiche', {
        p_projet_id: projetId,
        p_recette_id: finalRecetteId,
        p_lignes: recetteData,
      });

      if (error) throw error;

      setFicheEnregistree({ id: finalRecetteId, numero });
    } catch (err) {
      // 23P01 : contrainte d'unicité du numéro de fiche côté Supabase (enregistrement simultané)
      if (err?.code === '23P01') setNumeroEnDouble(String(recette.numero_fiche).trim());
      else setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fermeture du pop-up « fiche enregistrée » : ouverture de la fiche en visualisation
  const fermerConfirmation = () => {
    const { id } = ficheEnregistree;
    setFicheEnregistree(null);
    if (onSuccess) onSuccess(id);
    else navigate(`/recette/${id}`, { replace: true });
  };

  // La touche Entrée dans un champ n'enregistre pas la fiche (seuls les boutons le font).
  // Elle reste utilisable dans les zones de texte (retour à la ligne) et sur les boutons.
  const bloquerEntree = (e) => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') e.preventDefault();
  };

  const annuler = () => {
    if (recetteId) navigate(`/recette/${recetteId}`);
    else navigate(-1);
  };

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

  const nomsColorants = [1, 2, 3].map((i) => recette[`colorant_${i}`] || t('form.colorantN', { n: i }));

  return (
    <form onSubmit={handleSubmit} onKeyDown={bloquerEntree} className={`${cls.page} flex flex-col gap-8`}>
      {ficheEnregistree && (
        <FenetreAlerte
          titre={t(recetteId ? 'form.titreMaj' : 'form.titreEnregistree')}
          onFermer={fermerConfirmation}
          libelleBouton={t('form.voirFiche')}
        >
          {t(recetteId ? 'form.alerteMaj' : 'form.alerteEnregistree', { n: ficheEnregistree.numero })}
        </FenetreAlerte>
      )}
      {numeroEnDouble && (
        <FenetreAlerte titre={t('form.titreNumeroExiste')} onFermer={fermerAlerteNumero}>
          {t('form.numeroExiste', { n: numeroEnDouble })}
        </FenetreAlerte>
      )}

      {/* ===== EN-TÊTE ===== */}
      <div className="flex flex-col gap-5">
        {recetteId && (
          <nav aria-label={t('commun.filAriane')} className="flex gap-2 text-sm text-encre-500">
            <Link to="/nuancier" className="text-sauge hover:text-sauge-fonce">{t('nav.nuancier')}</Link>
            <span aria-hidden="true">/</span>
            <Link to={`/recette/${recetteId}`} className="text-sauge hover:text-sauge-fonce">{t('commun.fiche', { n: recette.numero_fiche })}</Link>
            <span aria-hidden="true">/</span>
            <span>{t('form.filModifier')}</span>
          </nav>
        )}
        <div className="flex flex-wrap gap-6 justify-between items-end">
          <div className="flex flex-col gap-2.5">
            <p className="m-0 inline-flex items-center gap-2 text-sm text-brun">
              <span className="w-2 h-2 rounded-full bg-brun-accent" />
              {recetteId
                ? t('form.modeModif')
                : numeroModele ? t('form.copieDe', { n: numeroModele }) : t('form.nouvelleFiche')}
            </p>
            <h1 className="m-0 font-serif font-normal text-[52px] tracking-tight">
              {recetteId ? t('commun.fiche', { n: recette.numero_fiche }) : t('form.nouvelleRecette')}
            </h1>
          </div>
          <BoutonsAction onAnnuler={annuler} loading={loading} recetteId={recetteId} />
        </div>
        {error && <p role="alert" className={`m-0 ${cls.erreur}`}>{error}</p>}
      </div>

      {/* ===== INFORMATIONS + BAIN ===== */}
      <section className="flex flex-wrap gap-6">
        <fieldset className={`${cls.carte} m-0 flex-[1_1_520px] p-7 flex flex-col gap-5`}>
          <legend className="float-left p-0 font-serif text-2xl">{t('fiche.informations')}</legend>
          <div className="clear-both grid grid-cols-2 gap-x-5 gap-y-4">
            <ChampInfo name="numero_fiche" value={recette.numero_fiche} onChange={handleRecetteChange} label={t('form.numeroFiche')} required mono />
            <ChampInfo name="date" value={recette.date} onChange={handleRecetteChange} label={t('fiche.date')} type="date" required />
            <ChampInfo name="nom" value={recette.nom} onChange={handleRecetteChange} label={t('fiche.nom')} />
            <ChampInfo name="objet" value={recette.objet} onChange={handleRecetteChange} label={t('fiche.objet')} />
            <ChampInfo name="matiere" value={recette.matiere} onChange={handleRecetteChange} label={t('fiche.matiere')} />
            <ChampInfo
              name="ph_eau"
              value={recette.ph_eau}
              onChange={handleRecetteChange}
              label={t('fiche.phEau')}
              type="number"
              min="0"
              max="14"
              step="0.01"
              mono
            />
            <ChampInfo name="pre_mordancage" value={recette.pre_mordancage} onChange={handleRecetteChange} label={t('fiche.preMordancage')} large />
            <ChampTexteLong name="montee_temperature" value={recette.montee_temperature} onChange={handleRecetteChange} label={t('fiche.monteeTemperature')} rows="2" />
            <ChampTexteLong name="observations" value={recette.observations} onChange={handleRecetteChange} label={t('fiche.observations')} />
          </div>
        </fieldset>

        <fieldset className={`${cls.carte} m-0 flex-[1_1_400px] p-7 flex flex-col gap-5`}>
          <legend className="float-left p-0 font-serif text-2xl">{t('fiche.bain')}</legend>
          <div className="clear-both grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="f-rapport_de_bain" className={cls.labelPetit}>{t('fiche.rapportDeBain')}</label>
              <div className="flex items-center h-11 rounded-[10px] border border-lin-600 bg-lin focus-within:ring-2 focus-within:ring-sauge focus-within:bg-white">
                <span className="pl-3 pr-0.5 font-mono text-[15px] text-encre-500" aria-hidden="true">1:</span>
                <input
                  id="f-rapport_de_bain"
                  type="number"
                  name="rapport_de_bain"
                  value={recette.rapport_de_bain ?? ''}
                  onChange={handleRecetteChange}
                  aria-describedby="aide-rapport-de-bain"
                  className="sans-fleches flex-1 min-w-0 h-full pr-3 bg-transparent font-mono text-[15px] text-encre focus:outline-none"
                  min="1"
                  step="1"
                />
              </div>
              <span id="aide-rapport-de-bain" className="sr-only">{t('form.aideRapport')}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="f-nb_parts_totales" className={cls.labelPetit}>{t('fiche.partsTotales')}</label>
              <input
                id="f-nb_parts_totales"
                type="number"
                name="nb_parts_totales"
                value={recette.nb_parts_totales ?? ''}
                onChange={handleRecetteChange}
                className={cls.inputMono}
                min="1"
              />
            </div>
          </div>

          {/* Colorants : nom, concentration et dilution, puis fournisseur et lot sur une seconde ligne */}
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-[2fr_1fr_1fr] gap-2 text-[13px] font-medium text-encre-500">
              <span>{t('fiche.colorant')}</span><span>{t('fiche.poudre')}</span><span>{t('fiche.dilution')}</span>
            </div>
            {['colorant_1', 'colorant_2', 'colorant_3'].map((colorant, i) => (
              <div
                key={colorant}
                role="group"
                aria-label={t('form.colorantN', { n: i + 1 })}
                className="grid grid-cols-[2fr_1fr_1fr] gap-2 pb-3 border-b border-lin-400 last:border-b-0 last:pb-0"
              >
                <input
                  type="text"
                  name={colorant}
                  value={recette[colorant] ?? ''}
                  onChange={handleRecetteChange}
                  aria-label={t('form.colorantN', { n: i + 1 })}
                  placeholder={t('form.colorantN', { n: i + 1 })}
                  className={`${cls.input} min-w-0 h-10`}
                />
                <input
                  type="number"
                  name={`${colorant}_qte_poudre`}
                  value={recette[`${colorant}_qte_poudre`] ?? ''}
                  onChange={handleRecetteChange}
                  aria-label={t('form.ariaPoudre', { n: i + 1 })}
                  className={`${cls.inputMono} min-w-0 h-10`}
                  min="0"
                />
                <input
                  type="number"
                  name={`${colorant}_dilution`}
                  value={recette[`${colorant}_dilution`] ?? ''}
                  onChange={handleRecetteChange}
                  aria-label={t('form.ariaDilColorant', { n: i + 1 })}
                  className={`${cls.inputMono} min-w-0 h-10`}
                  min="1"
                />
                <input
                  type="text"
                  name={`${colorant}_fournisseur`}
                  value={recette[`${colorant}_fournisseur`] ?? ''}
                  onChange={handleRecetteChange}
                  aria-label={t('form.ariaFournisseur', { n: i + 1 })}
                  placeholder={t('fiche.fournisseur')}
                  className={`${cls.input} min-w-0 h-9 text-sm`}
                />
                <input
                  type="text"
                  name={`${colorant}_lot`}
                  value={recette[`${colorant}_lot`] ?? ''}
                  onChange={handleRecetteChange}
                  aria-label={t('form.ariaLot', { n: i + 1 })}
                  placeholder={t('fiche.lot')}
                  className={`${cls.inputMono} col-span-2 min-w-0 h-9 text-sm`}
                />
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-[2fr_1fr] gap-2 text-[13px] font-medium text-encre-500">
              <span>{t('fiche.mordantNuancage')}</span><span>{t('fiche.dilution')}</span>
            </div>
            {['mordant_1', 'mordant_2', 'mordant_3'].map((mordant, i) => (
              <div
                key={mordant}
                role="group"
                aria-label={t('form.mordantN', { n: i + 1 })}
                className="grid grid-cols-[2fr_1fr] gap-2 pb-3 border-b border-lin-400 last:border-b-0 last:pb-0"
              >
                <input
                  type="text"
                  name={mordant}
                  value={recette[mordant] ?? ''}
                  onChange={handleRecetteChange}
                  aria-label={t('form.mordantN', { n: i + 1 })}
                  placeholder={t('form.mordantN', { n: i + 1 })}
                  className={`${cls.input} min-w-0 h-10`}
                />
                <input
                  type="number"
                  name={`${mordant}_dilution`}
                  value={recette[`${mordant}_dilution`] ?? ''}
                  onChange={handleRecetteChange}
                  aria-label={t('form.ariaDilMordant', { n: i + 1 })}
                  className={`${cls.inputMono} min-w-0 h-10`}
                  min="1"
                />
                <input
                  type="text"
                  name={`${mordant}_fournisseur`}
                  value={recette[`${mordant}_fournisseur`] ?? ''}
                  onChange={handleRecetteChange}
                  aria-label={t('form.ariaFournisseurMordant', { n: i + 1 })}
                  placeholder={t('fiche.fournisseur')}
                  className={`${cls.input} min-w-0 h-9 text-sm`}
                />
                <input
                  type="text"
                  name={`${mordant}_lot`}
                  value={recette[`${mordant}_lot`] ?? ''}
                  onChange={handleRecetteChange}
                  aria-label={t('form.ariaLotMordant', { n: i + 1 })}
                  placeholder={t('fiche.lot')}
                  className={`${cls.inputMono} min-w-0 h-9 text-sm`}
                />
              </div>
            ))}
          </div>
        </fieldset>
      </section>

      <p className="m-0 -mb-4 inline-flex items-center gap-2 text-sm text-encre-500">
        <span className="w-3.5 h-3.5 rounded bg-lin-300" />
        {t('form.casesGrisees')}
      </p>

      {/* ===== NUANCES ===== */}
      <Section titre={t('fiche.nuances')}>
        <EnTeteNuances couleurs={couleurs} premiere={t('fiche.nuance')} />
        <tbody>
          <tr className="border-t border-lin-400">
            <LigneTitre label={t('fiche.nbParts')} aide={nomsColorants.join(' · ')} />
            {couleurs.map((couleur, index) => (
              <td key={`nb_parts_${index}`} className="px-2 py-2.5">
                <div className="flex gap-1">
                  {[1, 2, 3].map((k) => (
                    <input
                      key={k}
                      type="number"
                      value={couleur[`nb_part_colorant_${k}`] ?? ''}
                      onChange={(e) => handleCouleurChange(index, `nb_part_colorant_${k}`, lireNombre(e.target.value, true))}
                      aria-label={t('form.ariaParts', { colorant: nomsColorants[k - 1], n: index + 1 })}
                      className={cls.inputCellule}
                      min="0"
                    />
                  ))}
                </div>
              </td>
            ))}
          </tr>
          <tr className="border-t border-lin-400">
            <LigneTitre label={t('fiche.valeurPart')} aide={t('fiche.calculee')} />
            {couleurs.map((couleur, index) => (
              <td key={`valeur_part_${index}`} className="px-2 py-2.5">
                <div className={cls.calcule}>{aff(calculateValeurDeLaPart(couleur.profondeur_ton))}</div>
              </td>
            ))}
          </tr>
          <tr className="border-t border-lin-400">
            <LigneTitre label={t('fiche.profondeur')} />
            {couleurs.map((couleur, index) => (
              <td key={`profondeur_${index}`} className="px-2 py-2.5">
                <input
                  type="number"
                  value={couleur.profondeur_ton ?? ''}
                  onChange={(e) => handleCouleurChange(index, 'profondeur_ton', lireNombre(e.target.value))}
                  aria-label={t('form.ariaChamp', { champ: t('fiche.profondeur'), n: index + 1 })}
                  className={cls.inputCellule}
                  min="0"
                  step="0.01"
                />
              </td>
            ))}
          </tr>
          <tr className="border-t border-lin-400">
            <LigneTitre label={t('fiche.poids')} aide="g" />
            {couleurs.map((couleur, index) => (
              <td key={`poids_${index}`} className="px-2 py-2.5">
                <input
                  type="number"
                  value={couleur.poids_tissu ?? ''}
                  onChange={(e) => handleCouleurChange(index, 'poids_tissu', lireNombre(e.target.value))}
                  aria-label={t('form.ariaChamp', { champ: t('fiche.poids'), n: index + 1 })}
                  className={cls.inputCellule}
                  min="0"
                  step="0.01"
                />
              </td>
            ))}
          </tr>
          <tr className="border-t border-lin-400">
            <LigneTitre label={t('fiche.volumeBain')} aide={t('fiche.mlCalcule')} />
            {couleurs.map((couleur, index) => (
              <td key={`volume_bain_${index}`} className="px-2 py-2.5">
                <div className={cls.calcule}>{aff(calculateVolumeDuBain(couleur.poids_tissu))}</div>
              </td>
            ))}
          </tr>
          <tr className="border-t border-lin-400">
            <LigneTitre label={t('fiche.bleuDepart')} />
            {couleurs.map((couleur, index) => (
              <td key={`bleu_depart_${index}`} className="px-2 py-2.5">
                <input
                  type="text"
                  value={couleur.bleu_depart ?? ''}
                  onChange={(e) => handleCouleurChange(index, 'bleu_depart', e.target.value)}
                  aria-label={t('form.ariaChamp', { champ: t('fiche.bleuDepart'), n: index + 1 })}
                  className={cls.inputCellule}
                />
              </td>
            ))}
          </tr>
          <tr className="border-t border-lin-400">
            <LigneTitre label={t('fiche.infosNuance')} />
            {couleurs.map((couleur, index) => (
              <td key={`info_${index}`} className="px-2 py-2.5">
                <input
                  type="text"
                  value={couleur.info ?? ''}
                  onChange={(e) => handleCouleurChange(index, 'info', e.target.value)}
                  aria-label={t('form.ariaChamp', { champ: t('fiche.infosNuance'), n: index + 1 })}
                  className={cls.inputCellule}
                />
              </td>
            ))}
          </tr>
        </tbody>
      </Section>

      {/* ===== COLORANTS ===== */}
      <Section titre={t('fiche.colorants')} note={t('form.noteColorants')} minWidth="min-w-[1000px]">
        <EnTeteNuances couleurs={couleurs} premiere={t('fiche.colorant')} sousColonnes />
        <tbody>
          {[1, 2, 3].map((i) => (
            <tr key={i} className="border-t border-lin-400">
              <LigneTitre label={recette[`colorant_${i}`] || '—'} aide={getUnite(i, 'colorant')} />
              {couleurs.map((couleur, index) => (
                <td key={`colorant${i}_${index}`} className="px-2 py-2.5">
                  <div className="grid grid-cols-2 gap-1">
                    <div className={cls.calcule}>{aff(calculatePourcentColorant(couleur, i))}</div>
                    <div className={cls.calcule}>{aff(calculateQuantiteColorant(couleur, i))}</div>
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </Section>

      {/* ===== NUANÇAGE (colonnes mordant_* en base) ===== */}
      <Section titre={t('fiche.mordants')} note={t('form.noteMordants')} minWidth="min-w-[1000px]">
        <EnTeteNuances couleurs={couleurs} premiere={t('fiche.mordant')} sousColonnes />
        <tbody>
          {[1, 2, 3].map((i) => (
            <tr key={i} className="border-t border-lin-400">
              <LigneTitre label={recette[`mordant_${i}`] || '—'} aide={getUnite(i, 'mordant')} />
              {couleurs.map((couleur, index) => {
                const pourcentage = couleur[`pourcent_mordant_${i}`];
                return (
                  <td key={`mordant${i}_${index}`} className="px-2 py-2.5">
                    <div className="grid grid-cols-2 gap-1">
                      <input
                        type="number"
                        value={pourcentage ?? ''}
                        onChange={(e) => handleCouleurChange(index, `pourcent_mordant_${i}`, lireNombre(e.target.value))}
                        aria-label={t('form.ariaPourcentMordant', { mordant: recette[`mordant_${i}`] || t('form.mordantMinuscule', { n: i }), n: index + 1 })}
                        className={cls.inputCellule}
                        min="0"
                        step="0.01"
                      />
                      <div className={cls.calcule}>{aff(calculateQuantiteMordant(couleur, i))}</div>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </Section>

      {/* ===== VOLUME D'EAU INITIAL ===== */}
      <Section titre={t('fiche.volumeEau')} note={t('form.noteEau')}>
        <EnTeteNuances couleurs={couleurs} premiere="" />
        <tbody>
          <tr className="border-t border-lin-400">
            <LigneTitre label={t('fiche.volumeEau')} aide={t('fiche.mlCalcule')} />
            {couleurs.map((couleur, index) => (
              <td key={`vol_eau_${index}`} className="px-2 py-2.5">
                <div className={cls.calcule}>{aff(volumeEauInitial(couleur))}</div>
              </td>
            ))}
          </tr>
        </tbody>
      </Section>

      {/* ===== COLORIMÉTRIE ===== */}
      <Section titre={t('form.colorimetrie')} note={t('form.noteColorimetrie')}>
        <EnTeteNuances couleurs={couleurs} premiere="" />
        <tbody>
          <tr className="border-t border-lin-400">
            <LigneTitre label={t('form.codeLab')} aide="L · a · b" />
            {couleurs.map((couleur, index) => (
              <td key={`lab_${index}`} className="px-2 py-2.5">
                <div className="grid grid-cols-3 gap-1">
                  {[
                    ['couleur_lab_l', 'L', 0, 100],
                    ['couleur_lab_a', 'a', -128, 127],
                    ['couleur_lab_b', 'b', -128, 127],
                  ].map(([champ, nom, min, max]) => (
                    <ChampLab
                      key={champ}
                      value={couleur[champ]}
                      onValeur={(v) => handleCouleurimetrie(index, champ, v)}
                      min={min}
                      max={max}
                      label={t('form.ariaChamp', { champ: `Lab ${nom}`, n: index + 1 })}
                    />
                  ))}
                </div>
              </td>
            ))}
          </tr>
          <tr className="border-t border-lin-400">
            <LigneTitre label={t('form.codeLch')} aide="L · C · h" />
            {couleurs.map((couleur, index) => (
              <td key={`lch_${index}`} className="px-2 py-2.5">
                <div className="grid grid-cols-3 gap-1">
                  {[
                    // L est le même en Lab et en LCh : les deux cases L sont liées
                    ['couleur_lab_l', 'L', 0, 100],
                    ['couleur_lch_c', 'C', 0, 182],
                    ['couleur_lch_h', 'h', 0, 360],
                  ].map(([champ, nom, min, max]) => (
                    <ChampLab
                      key={champ}
                      value={couleur[champ]}
                      onValeur={(v) => handleCouleurimetrie(index, champ, v)}
                      min={min}
                      max={max}
                      label={t('form.ariaChamp', { champ: `LCh ${nom}`, n: index + 1 })}
                    />
                  ))}
                </div>
              </td>
            ))}
          </tr>
          <tr className="border-t border-lin-400">
            <LigneTitre label={t('form.apercu')} aide={t('form.aideApercu')} />
            {couleurs.map((couleur, index) => (
              <td key={`apercu_${index}`} className="px-2 py-2.5">
                <div className="h-10 rounded-[10px] border border-black/5" style={fondCouleur(hexNuance(couleur))} />
              </td>
            ))}
          </tr>
        </tbody>
      </Section>

      {/* ===== ACTIONS ===== */}
      <div className="flex flex-wrap justify-between items-center gap-4 px-6 py-5 rounded-[20px] bg-lin-700">
        <p className="m-0 text-sm text-encre-600">{t('form.champsObligatoires')}</p>
        <BoutonsAction onAnnuler={annuler} loading={loading} recetteId={recetteId} />
      </div>
    </form>
  );
};

export default RecetteForm;
