import { HashRouter as Router, Routes, Route, Navigate, Link, NavLink, useLocation } from 'react-router-dom';
import { supabase, lienAuth } from './supabaseClient';
import { useEffect, useState, createContext } from 'react';
import Login from './pages/Login';
import MotDePasseOublie from './pages/MotDePasseOublie';
import DefinirMotDePasse from './pages/DefinirMotDePasse';
import Home from './pages/Home';
import Admin from './pages/Admin';
import Tuto from './pages/Tuto';
import PrivateRoute from './components/PrivateRoute';
import CreerProjetModal from './components/CreerProjetModal';
import { Logo, Icone } from './components/ui';
import { useT, ChoixLangue } from './i18n';

// Créer un contexte pour partager projetId, projetNom, et isAdmin
const ProjetContext = createContext();

const liensNav = [
  { to: '/', cle: 'nav.accueil', end: true },
  { to: '/nuancier', cle: 'nav.nuancier' },
  { to: '/recherche-teinte', cle: 'nav.recherche' },
  { to: '/nouvelle-recette', cle: 'nav.nouvelle', edition: true }, // masqué pour les Visiteurs
  { to: '/tuto', cle: 'nav.tuto' },
];

const classeLien = ({ isActive }) =>
  `px-3.5 py-2.5 rounded-full text-[15px] no-underline ${
    isActive
      ? 'bg-sauge-pale text-encre font-medium'
      : 'text-encre-600 hover:bg-lin-300 hover:text-encre'
  }`;

// Revenir en haut de page à chaque changement de page
const RetourEnHaut = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const initiales = (nomAffiche, email) => {
  const nom = (nomAffiche || '').trim() || (email || '').split('@')[0];
  if (!nom) return '?';
  const parties = nom.split(/[\s._-]+/).filter(Boolean);
  if (parties.length >= 2) return (parties[0][0] + parties[1][0]).toUpperCase();
  return nom.slice(0, 2).toUpperCase();
};

function App() {
  const t = useT();
  const [session, setSession] = useState(null);
  const [projetId, setProjetId] = useState(null);
  const [projetNom, setProjetNom] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showCreerProjetModal, setShowCreerProjetModal] = useState(false);
  const [projets, setProjets] = useState([]);
  const [loadingProjets, setLoadingProjets] = useState(false);
  const [isProjetMenuOpen, setIsProjetMenuOpen] = useState(false);
  const [isCompteMenuOpen, setIsCompteMenuOpen] = useState(false);
  // Étape imposée après un lien reçu par e-mail : 'invitation', 'reinitialisation' ou null
  const [etapeLien, setEtapeLien] = useState(
    lienAuth.type === 'invite' ? 'invitation' : lienAuth.type === 'recovery' ? 'reinitialisation' : null
  );

  // Récupérer la session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'PASSWORD_RECOVERY') setEtapeLien('reinitialisation');
      if (event === 'SIGNED_OUT') setEtapeLien(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Vérifier si l'utilisateur est administrateur
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!session) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: droits, error } = await supabase
        .from('droits_projet')
        .select('role')
        .eq('utilisateur_id', user.id);

      if (error) {
        console.error('Erreur lors de la vérification des droits :', error);
      } else {
        const isUserAdmin = droits.some(droit => droit.role === 'Administrateur');
        setIsAdmin(isUserAdmin);
      }
    };

    checkAdminStatus();
  }, [session]);

  // Récupérer la liste des projets de l'utilisateur
  useEffect(() => {
    const fetchProjets = async () => {
      if (!session) return;
      setLoadingProjets(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoadingProjets(false);
        return;
      }

      const { data, error } = await supabase
        .from('droits_projet')
        .select(`
          projet_id,
          role,
          projets:projet_id (id, nom)
        `)
        .eq('utilisateur_id', user.id);

      if (error) {
        console.error('Erreur lors de la récupération des projets :', error);
      } else {
        setProjets(data);
      }
      setLoadingProjets(false);
    };

    fetchProjets();
  }, [session]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    return <Navigate to="/login" replace />;
  };

  const handleSelectProjet = (id, nom) => {
    setProjetId(id);
    setProjetNom(nom);
  };

  // Rôle de l'utilisateur sur le projet actif (les droits se gèrent projet par projet)
  const roleProjet = projets.find((droit) => droit.projets?.id === projetId)?.role || null;
  const isAdminProjet = roleProjet === 'Administrateur';
  // Créer, modifier et supprimer des fiches : Administrateurs et Teinturiers
  // (vérifié aussi côté Supabase par enregistrer_fiche et supprimer_fiche)
  const peutEditer = roleProjet === 'Administrateur' || roleProjet === 'Teinturier';

  // Projets accessibles, sous une forme simple { id, nom, role } (utilisé par la recherche multi-projets)
  const projetsAccessibles = projets
    .filter((droit) => droit.projets)
    .map((droit) => ({ id: droit.projets.id, nom: droit.projets.nom, role: droit.role }));

  const handleCreerProjet = () => {
    setShowCreerProjetModal(true);
  };

  // Tant que la personne invitée n'a pas choisi son mot de passe, on lui présente
  // cet écran (même si elle revient plus tard avec la session ouverte par le lien).
  const invitationEnAttente = session?.user?.user_metadata?.invitation_en_attente === true;
  const etapeCompte = session ? (invitationEnAttente ? 'invitation' : etapeLien) : null;
  const nomUtilisateur = session?.user?.user_metadata?.nom || '';

  const handleProjetCreated = () => {
    // Rafraîchir la liste des projets
    window.location.reload();
  };

  return (
    <Router>
      <RetourEnHaut />
      {etapeCompte ? (
        <DefinirMotDePasse mode={etapeCompte} user={session.user} onTermine={() => setEtapeLien(null)} />
      ) : (
        <>
        {session && (
          <header className="navbar no-print border-b border-lin-500 bg-lin">
            <div className="max-w-6xl mx-auto px-6 py-4 flex flex-wrap items-center gap-4">
              <Link to="/" className="mr-4 no-underline">
                <Logo />
              </Link>

              <nav aria-label={t('nav.principale')} className="flex flex-wrap gap-1 flex-1">
                {liensNav.filter((lien) => !lien.edition || peutEditer).map((lien) => (
                  <NavLink key={lien.to} to={lien.to} end={lien.end} className={classeLien}>
                    {t(lien.cle)}
                  </NavLink>
                ))}
              </nav>

              {/* Menu déroulant pour la sélection de projet */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsProjetMenuOpen(!isProjetMenuOpen);
                    setIsCompteMenuOpen(false);
                  }}
                  aria-expanded={isProjetMenuOpen}
                  className="flex items-center gap-2 h-11 px-4 rounded-full border border-lin-600 bg-lin-50 text-sm font-medium text-encre hover:border-sauge"
                >
                  <span className={`w-2 h-2 rounded-full ${projetNom ? 'bg-sauge-point' : 'bg-lin-600'}`} />
                  {projetNom || t('projet.selectionner')}
                  <Icone.Chevron />
                </button>
                {isProjetMenuOpen && (
                  <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-lin-500 bg-lin-50 shadow-lg z-20 p-1.5">
                    {loadingProjets ? (
                      <div className="px-3 py-2 text-sm text-encre-500">{t('projet.chargement')}</div>
                    ) : projets.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-encre-500">{t('projet.aucun')}</div>
                    ) : (
                      projets.map((droit) => (
                        <button
                          type="button"
                          key={droit.projet_id}
                          onClick={() => {
                            handleSelectProjet(droit.projets.id, droit.projets.nom);
                            setIsProjetMenuOpen(false);
                          }}
                          className={`block w-full text-left px-3 py-2.5 rounded-xl text-sm hover:bg-lin-300 ${
                            droit.projets.id === projetId ? 'font-medium text-encre' : 'text-encre-600'
                          }`}
                        >
                          {droit.projets.nom}
                        </button>
                      ))
                    )}
                    {isAdmin && (
                      <div className="mt-1 pt-1 border-t border-lin-400">
                        <button
                          type="button"
                          onClick={() => {
                            setIsProjetMenuOpen(false);
                            handleCreerProjet();
                          }}
                          className="flex items-center gap-2 w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-sauge hover:bg-lin-300"
                        >
                          <Icone.Plus width="16" height="16" />
                          {t('projet.creer')}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Choix de la langue */}
              <ChoixLangue />

              {/* Menu du compte */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsCompteMenuOpen(!isCompteMenuOpen);
                    setIsProjetMenuOpen(false);
                  }}
                  aria-label={t('compte.aria')}
                  aria-expanded={isCompteMenuOpen}
                  className="w-11 h-11 rounded-full bg-brun text-lin-50 text-sm font-semibold"
                >
                  {initiales(nomUtilisateur, session.user?.email)}
                </button>
                {isCompteMenuOpen && (
                  <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-lin-500 bg-lin-50 shadow-lg z-20 p-1.5">
                    <div className="px-3 py-2 text-sm truncate">
                      {nomUtilisateur && <div className="font-medium text-encre truncate">{nomUtilisateur}</div>}
                      <div className="text-encre-500 truncate">{session.user?.email}</div>
                    </div>
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setIsCompteMenuOpen(false)}
                        className="block w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-encre no-underline hover:bg-lin-300"
                      >
                        {t('admin.lien')}
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setIsCompteMenuOpen(false);
                        handleLogout();
                      }}
                      className="block w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-alerte-texte hover:bg-alerte-fond"
                    >
                      {t('compte.deconnexion')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>
        )}

        {showCreerProjetModal && (
          <CreerProjetModal
            onClose={() => setShowCreerProjetModal(false)}
            onProjetCreated={handleProjetCreated}
          />
        )}

        <ProjetContext.Provider
          value={{
            projetId,
            projetNom,
            isAdmin,
            isAdminProjet,
            roleProjet,
            peutEditer,
            projets: projetsAccessibles,
            selectionnerProjet: handleSelectProjet,
            setProjetId,
            setProjetNom,
          }}
        >
          <Routes>
            <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />
            <Route
              path="/mot-de-passe-oublie"
              element={session ? <Navigate to="/" replace /> : <MotDePasseOublie />}
            />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Home />
                </PrivateRoute>
              }
            />
            <Route
              path="/nuancier"
              element={
                <PrivateRoute>
                  <Home />
                </PrivateRoute>
              }
            />
            <Route
              path="/nouvelle-recette"
              element={
                <PrivateRoute>
                  <Home />
                </PrivateRoute>
              }
            />
            <Route
              path="/recherche-teinte"
              element={
                <PrivateRoute>
                  <Home />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <PrivateRoute>
                  <Admin />
                </PrivateRoute>
              }
            />
            <Route
              path="/tuto"
              element={
                <PrivateRoute>
                  <Tuto />
                </PrivateRoute>
              }
            />
            <Route
              path="/recette/:recetteId"
              element={
                <PrivateRoute>
                  <Home />
                </PrivateRoute>
              }
            />
            <Route
              path="/recette/:recetteId/edit"
              element={
                <PrivateRoute>
                  <Home />
                </PrivateRoute>
              }
            />
          </Routes>
        </ProjetContext.Provider>
        </>
      )}
    </Router>
  );
}

export default App;
export { ProjetContext };
