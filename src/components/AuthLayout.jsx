import { Logo } from './ui';
import { useT, ChoixLangue } from '../i18n';

// Bandes décoratives du panneau gauche
const bandes = [
  { c: '#E3CFA0', h: '62%' },
  { c: '#D9C46A', h: '78%' },
  { c: '#A7A35A', h: '90%' },
  { c: '#6E8456', h: '70%' },
  { c: '#C9876B', h: '100%' },
  { c: '#A65442', h: '84%' },
  { c: '#8E6A4B', h: '66%' },
  { c: '#5B4535', h: '92%' },
];

/**
 * Mise en page commune aux écrans de connexion, de mot de passe oublié
 * et de création du mot de passe : panneau décoratif à gauche, formulaire à droite.
 */
const AuthLayout = ({ titre, sousTitre, children }) => {
  const t = useT();
  return (
    <div className="min-h-screen flex flex-wrap bg-lin text-encre">
      <aside
        aria-hidden="true"
        className="flex-[1_1_480px] min-h-[320px] flex flex-col justify-between gap-12 p-12 bg-lin-700"
      >
        <Logo />
        <div className="hidden md:flex gap-2.5 items-end h-96">
          {bandes.map((b) => (
            <div
              key={b.c}
              className="flex-1 rounded-t-md rounded-b-sm"
              style={{ height: b.h, backgroundColor: b.c }}
            />
          ))}
        </div>
        <p className="m-0 font-serif text-[28px] leading-snug max-w-md text-encre-700">
          {t('login.accroche')}
        </p>
      </aside>

      <main className="relative flex-[1_1_480px] flex items-center justify-center px-6 pt-20 pb-12">
        <ChoixLangue className="absolute top-6 right-6" />
        <div className="w-full max-w-sm flex flex-col gap-7">
          <div className="flex flex-col gap-2.5">
            <h1 className="m-0 font-serif font-normal text-[40px]">{titre}</h1>
            {sousTitre && <p className="m-0 text-base text-encre-500">{sousTitre}</p>}
          </div>
          {children}
        </div>
      </main>
    </div>
  );
};

export default AuthLayout;
