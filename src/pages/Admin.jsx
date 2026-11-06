import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useT } from '../i18n';
import { cls, Chargement } from '../components/ui';

const ROLES = ['Administrateur', 'Teinturier', 'Visiteur'];
const CLES_ROLES = {
  Administrateur: 'admin.roleAdministrateur',
  Teinturier: 'admin.roleTeinturier',
  Visiteur: 'admin.roleVisiteur',
};

/**
 * Appelle l'Edge Function « gestion-membres ».
 * Toute la gestion des membres se fait côté serveur : le navigateur n'a jamais
 * la clé secrète, et la fonction vérifie que l'appelant administre le projet.
 */
const gestionMembres = async (body) => {
  const { data, error } = await supabase.functions.invoke('gestion-membres', { body });
  if (error) {
    let message = error.message;
    try {
      const corps = await error.context?.json();
      if (corps?.erreur) message = corps.erreur;
    } catch {
      // réponse non JSON : on garde le message générique
    }
    throw new Error(message);
  }
  return data;
};

export default function Admin() {
  const t = useT();
  const [projets, setProjets] = useState([]);
  const [selectedProjet, setSelectedProjet] = useState('');
  const [membres, setMembres] = useState([]);
  const [moi, setMoi] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chargementMembres, setChargementMembres] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [nouvelEmail, setNouvelEmail] = useState('');
  const [nouveauRole, setNouveauRole] = useState('Teinturier');

  // Projets dont l'utilisateur courant est Administrateur
  useEffect(() => {
    const fetchProjetsAdmin = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        setMoi(user.id);

        const { data: droits, error: droitsError } = await supabase
          .from('droits_projet')
          .select('projet_id, projets(nom, id)')
          .eq('utilisateur_id', user.id)
          .eq('role', 'Administrateur');

        if (droitsError) throw droitsError;
        setProjets(droits.map((droit) => droit.projets).filter(Boolean));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProjetsAdmin();
  }, []);

  // Membres du projet sélectionné (et seulement eux)
  const chargerMembres = useCallback(async () => {
    if (!selectedProjet) {
      setMembres([]);
      return;
    }
    setChargementMembres(true);
    setError(null);
    try {
      const { membres: liste } = await gestionMembres({ action: 'lister', projet_id: selectedProjet });
      setMembres(liste);
    } catch (err) {
      setError(err.message);
      setMembres([]);
    } finally {
      setChargementMembres(false);
    }
  }, [selectedProjet]);

  useEffect(() => {
    setInfo(null);
    chargerMembres();
  }, [chargerMembres]);

  const executer = async (body, messageSucces) => {
    setEnCours(true);
    setError(null);
    setInfo(null);
    try {
      const resultat = await gestionMembres({ projet_id: selectedProjet, ...body });
      setInfo(typeof messageSucces === 'function' ? messageSucces(resultat) : messageSucces);
      await chargerMembres();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setEnCours(false);
    }
  };

  const changerRole = (membre, role) =>
    executer({ action: 'modifier', utilisateur_id: membre.utilisateur_id, role }, t('admin.roleModifie'));

  const retirer = (membre) => {
    if (!window.confirm(t('admin.confirmerRetrait', { email: membre.email }))) return;
    executer({ action: 'retirer', utilisateur_id: membre.utilisateur_id }, t('admin.membreRetire'));
  };

  const renvoyerInvitation = (membre) =>
    executer(
      { action: 'renvoyer_invitation', utilisateur_id: membre.utilisateur_id },
      t('admin.invitationRenvoyee', { email: membre.email }),
    );

  const ajouter = async (e) => {
    e.preventDefault();
    const ok = await executer(
      { action: 'ajouter', email: nouvelEmail.trim(), role: nouveauRole },
      (r) => (r?.invite ? t('admin.invitationEnvoyee', { email: r.membre.email }) : t('admin.membreAjoute')),
    );
    if (ok) setNouvelEmail('');
  };

  if (loading) return <Chargement />;

  return (
    <div className={`${cls.page} flex flex-col gap-8`}>
      <h1 className={`m-0 ${cls.h2}`}>{t('admin.titre')}</h1>

      <div className="flex flex-col gap-2 max-w-md">
        <label htmlFor="admin-projet" className={cls.label}>{t('admin.selectionner')}</label>
        <select
          id="admin-projet"
          value={selectedProjet}
          onChange={(e) => setSelectedProjet(e.target.value)}
          className={cls.input}
        >
          <option value="">{t('admin.selectionnez')}</option>
          {projets.map((projet) => (
            <option key={projet.id} value={projet.id}>
              {projet.nom}
            </option>
          ))}
        </select>
      </div>

      {error && <p role="alert" className={`m-0 ${cls.erreur}`}>{error}</p>}
      {info && <p role="status" className="m-0 text-sm text-sauge">{info}</p>}

      {selectedProjet && (
        <>
          <section className="flex flex-col gap-4">
            <h2 className={`m-0 ${cls.h3}`}>{t('admin.gerer')}</h2>
            {chargementMembres ? (
              <Chargement />
            ) : membres.length === 0 ? (
              <p className={`m-0 ${cls.muted}`}>{t('admin.aucunMembre')}</p>
            ) : (
              <div className={cls.tableau}>
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-encre-600">
                      <th className="py-3 px-4">{t('admin.nom')}</th>
                      <th className="py-3 px-4">{t('admin.email')}</th>
                      <th className="py-3 px-4">{t('admin.role')}</th>
                      <th className="py-3 px-4" />
                    </tr>
                  </thead>
                  <tbody>
                    {membres.map((membre) => (
                      <tr key={membre.utilisateur_id} className="border-t border-lin-400">
                        <td className="py-2 px-4">
                          {membre.nom}
                          {membre.utilisateur_id === moi && <span className={cls.muted}> {t('admin.vous')}</span>}
                        </td>
                        <td className="py-2 px-4">
                          {membre.email}
                          {membre.invitation_en_attente && (
                            <span className="ml-2 inline-block rounded-full bg-lin-300 px-2.5 py-0.5 text-xs font-medium text-encre-600">
                              {t('admin.invitationEnAttente')}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-4">
                          <select
                            aria-label={t('admin.role')}
                            value={membre.role}
                            disabled={enCours}
                            onChange={(e) => changerRole(membre, e.target.value)}
                            className={cls.input}
                          >
                            {ROLES.map((role) => (
                              <option key={role} value={role}>{t(CLES_ROLES[role])}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-4 text-right whitespace-nowrap">
                          {membre.invitation_en_attente && (
                            <button
                              type="button"
                              disabled={enCours}
                              onClick={() => renvoyerInvitation(membre)}
                              className={`${cls.btnSecondaire} mr-2 disabled:opacity-60 disabled:cursor-not-allowed`}
                            >
                              {t('admin.renvoyerInvitation')}
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={enCours}
                            onClick={() => retirer(membre)}
                            className={cls.btnDanger}
                          >
                            {t('admin.retirer')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className={`${cls.carte} p-6 flex flex-col gap-4 max-w-2xl`}>
            <h2 className={`m-0 ${cls.h3}`}>{t('admin.ajouterTitre')}</h2>
            <p className={`m-0 text-sm ${cls.muted}`}>{t('admin.ajouterIntro')}</p>
            <form onSubmit={ajouter} className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-2 flex-1 min-w-[220px]">
                <label htmlFor="admin-email" className={cls.label}>{t('admin.email')}</label>
                <input
                  id="admin-email"
                  type="email"
                  required
                  value={nouvelEmail}
                  onChange={(e) => setNouvelEmail(e.target.value)}
                  className={cls.input}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="admin-role" className={cls.label}>{t('admin.role')}</label>
                <select
                  id="admin-role"
                  value={nouveauRole}
                  onChange={(e) => setNouveauRole(e.target.value)}
                  className={cls.input}
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>{t(CLES_ROLES[role])}</option>
                  ))}
                </select>
              </div>
              <button type="submit" disabled={enCours} className={cls.btnPrimaire}>
                {enCours ? t('admin.ajout') : t('admin.ajouter')}
              </button>
            </form>
          </section>
        </>
      )}
    </div>
  );
}
