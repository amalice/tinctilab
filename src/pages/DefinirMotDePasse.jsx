import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { cls } from '../components/ui';
import AuthLayout from '../components/AuthLayout';
import { useT } from '../i18n';

export const LONGUEUR_MIN_MOT_DE_PASSE = 8;
const LONGUEUR_MAX_NOM = 60;

/**
 * Écran affiché juste après un lien reçu par e-mail, la personne étant déjà connectée :
 *  - mode « invitation » : première visite, elle choisit son nom et son mot de passe ;
 *  - mode « reinitialisation » : mot de passe oublié, elle en choisit un nouveau.
 *
 * Une fois le mot de passe enregistré, l'indicateur invitation_en_attente passe à false
 * dans les métadonnées du compte : l'écran ne s'affiche plus, et la personne peut se
 * reconnecter seule avec son e-mail et son mot de passe.
 */
const DefinirMotDePasse = ({ mode, user, onTermine }) => {
  const t = useT();
  const navigate = useNavigate();
  const invitation = mode === 'invitation';
  const meta = user?.user_metadata || {};

  const [nom, setNom] = useState(meta.nom || '');
  const [motDePasse, setMotDePasse] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const messageErreur = (err) => {
    if (err?.code === 'same_password') return t('motDePasse.identique');
    if (err?.code === 'weak_password') return t('motDePasse.tropFaible', { n: LONGUEUR_MIN_MOT_DE_PASSE });
    if (err?.code === 'reauthentication_needed' || err?.status === 401) return t('motDePasse.sessionExpiree');
    return err?.message || t('commun.erreurGenerique');
  };

  const enregistrer = async (e) => {
    e.preventDefault();
    setError('');

    const nomPropre = nom.trim().replace(/\s+/g, ' ');
    if (invitation && !nomPropre) return setError(t('motDePasse.nomRequis'));
    if (motDePasse.length < LONGUEUR_MIN_MOT_DE_PASSE) {
      return setError(t('motDePasse.tropCourt', { n: LONGUEUR_MIN_MOT_DE_PASSE }));
    }
    if (motDePasse !== confirmation) return setError(t('motDePasse.different'));

    setLoading(true);
    try {
      const data = { invitation_en_attente: false };
      if (invitation) data.nom = nomPropre;
      const { error: authError } = await supabase.auth.updateUser({ password: motDePasse, data });
      if (authError) throw authError;
      onTermine();
      navigate('/', { replace: true });
    } catch (err) {
      setError(messageErreur(err));
    } finally {
      setLoading(false);
    }
  };

  const seDeconnecter = async () => {
    await supabase.auth.signOut();
    onTermine();
    navigate('/login', { replace: true });
  };

  return (
    <AuthLayout
      titre={t(invitation ? 'motDePasse.bienvenueTitre' : 'motDePasse.nouveauTitre')}
      sousTitre={t(invitation ? 'motDePasse.bienvenueIntro' : 'motDePasse.nouveauIntro')}
    >
      <form onSubmit={enregistrer} className="flex flex-col gap-7" noValidate>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className={cls.label}>{t('login.email')}</span>
            <span className="text-base text-encre-700 break-all">{user?.email}</span>
          </div>

          {invitation && (
            <div className="flex flex-col gap-2">
              <label className={cls.label} htmlFor="nom">{t('motDePasse.nom')}</label>
              <input
                id="nom"
                type="text"
                autoComplete="name"
                maxLength={LONGUEUR_MAX_NOM}
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder={t('motDePasse.placeholderNom')}
                className={`${cls.input} h-12 px-4 text-base bg-lin-50`}
                required
              />
              <span className="text-[13px] text-encre-500">{t('motDePasse.aideNom')}</span>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className={cls.label} htmlFor="nouveau-mdp">{t('motDePasse.motDePasse')}</label>
            <input
              id="nouveau-mdp"
              type="password"
              autoComplete="new-password"
              minLength={LONGUEUR_MIN_MOT_DE_PASSE}
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              className={`${cls.input} h-12 px-4 text-base bg-lin-50`}
              required
            />
            <span className="text-[13px] text-encre-500">
              {t('motDePasse.aideMotDePasse', { n: LONGUEUR_MIN_MOT_DE_PASSE })}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <label className={cls.label} htmlFor="confirmation-mdp">{t('motDePasse.confirmation')}</label>
            <input
              id="confirmation-mdp"
              type="password"
              autoComplete="new-password"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              className={`${cls.input} h-12 px-4 text-base bg-lin-50`}
              required
            />
          </div>
        </div>

        {error && <p role="alert" className={`m-0 ${cls.erreur}`}>{error}</p>}

        <button type="submit" disabled={loading} className={`${cls.btnPrimaire} h-12 text-base w-full`}>
          {loading ? t('motDePasse.enregistrement') : t(invitation ? 'motDePasse.creerCompte' : 'motDePasse.enregistrer')}
        </button>

        <button
          type="button"
          onClick={seDeconnecter}
          className="self-start text-sm text-encre-500 hover:text-encre underline"
        >
          {t('motDePasse.pasMoi')}
        </button>
      </form>
    </AuthLayout>
  );
};

export default DefinirMotDePasse;
