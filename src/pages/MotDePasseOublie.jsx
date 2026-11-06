import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, urlApplication } from '../supabaseClient';
import { cls } from '../components/ui';
import AuthLayout from '../components/AuthLayout';
import { useT } from '../i18n';

/**
 * Demande d'un lien de réinitialisation du mot de passe.
 * Sert aussi aux personnes invitées dont le lien d'invitation a déjà été utilisé
 * sans qu'elles aient choisi de mot de passe.
 */
const MotDePasseOublie = () => {
  const t = useT();
  const [email, setEmail] = useState('');
  const [envoye, setEnvoye] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const envoyer = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: urlApplication(),
      });
      // Message identique que le compte existe ou non (on ne révèle pas qui est inscrit),
      // sauf pour les erreurs techniques (limite d'envoi atteinte, réseau…).
      if (authError && authError.status !== 400 && authError.status !== 404) throw authError;
      setEnvoye(true);
    } catch (err) {
      setError(err.message || t('commun.erreurGenerique'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout titre={t('motDePasse.oublieTitre')} sousTitre={envoye ? null : t('motDePasse.oublieIntro')}>
      {envoye ? (
        <div className="flex flex-col gap-7">
          <p role="status" className="m-0 text-base text-encre-700 leading-relaxed">
            {t('motDePasse.lienEnvoye', { email: email.trim() })}
          </p>
          <Link to="/login" className={`${cls.btnSecondaire} h-12 text-base w-full no-underline`}>
            {t('motDePasse.retourConnexion')}
          </Link>
        </div>
      ) : (
        <form onSubmit={envoyer} className="flex flex-col gap-7">
          <div className="flex flex-col gap-2">
            <label className={cls.label} htmlFor="email-oubli">{t('login.email')}</label>
            <input
              id="email-oubli"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('login.placeholderEmail')}
              className={`${cls.input} h-12 px-4 text-base bg-lin-50`}
              required
            />
          </div>

          {error && <p role="alert" className={`m-0 ${cls.erreur}`}>{error}</p>}

          <button type="submit" disabled={loading} className={`${cls.btnPrimaire} h-12 text-base w-full`}>
            {loading ? t('motDePasse.envoiEnCours') : t('motDePasse.envoyerLien')}
          </button>

          <Link to="/login" className="text-sm text-sauge hover:text-sauge-fonce">
            {t('motDePasse.retourConnexion')}
          </Link>
        </form>
      )}
    </AuthLayout>
  );
};

export default MotDePasseOublie;
