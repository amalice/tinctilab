import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, lienAuth } from '../supabaseClient';
import { cls } from '../components/ui';
import AuthLayout from '../components/AuthLayout';
import { useT } from '../i18n';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const t = useT();

  // Lien d'invitation ou de réinitialisation expiré / déjà utilisé
  const erreurLien = lienAuth.erreur
    ? t(lienAuth.erreur.code === 'otp_expired' ? 'login.lienExpire' : 'login.lienInvalide')
    : '';

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;
      navigate('/');
    } catch (err) {
      setError(err.message || t('login.erreur'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout titre={t('login.titre')} sousTitre={t('login.sousTitre')}>
      <form onSubmit={handleLogin} className="flex flex-col gap-7">
        {erreurLien && !error && <p role="alert" className={`m-0 ${cls.erreur}`}>{erreurLien}</p>}

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className={cls.label} htmlFor="email">{t('login.email')}</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('login.placeholderEmail')}
              className={`${cls.input} h-12 px-4 text-base bg-lin-50`}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <label className={cls.label} htmlFor="password">{t('login.motDePasse')}</label>
              <Link to="/mot-de-passe-oublie" className="text-sm text-sauge hover:text-sauge-fonce">
                {t('login.oublie')}
              </Link>
            </div>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${cls.input} h-12 px-4 text-base bg-lin-50`}
              required
            />
          </div>
        </div>

        {error && <p role="alert" className={`m-0 ${cls.erreur}`}>{error}</p>}

        <button type="submit" disabled={loading} className={`${cls.btnPrimaire} h-12 text-base w-full`}>
          {loading ? t('login.connexionEnCours') : t('login.seConnecter')}
        </button>

        <p className="m-0 text-sm text-encre-500 leading-relaxed">
          {t('login.pasDeCompte')}
        </p>
      </form>
    </AuthLayout>
  );
};

export default Login;
