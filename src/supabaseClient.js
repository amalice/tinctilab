import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vdlxzugpwrqtuqrgexyh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkbHh6dWdwd3JxdHVxcmdleHloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NjY3MjMsImV4cCI6MjA5NDI0MjcyM30.nkDVyN27egmh8wo9UBLi2pwYuRG6JsQT0QeIQs-6iE4';

/**
 * Lien reçu par e-mail (invitation, mot de passe oublié).
 *
 * Supabase renvoie vers l'application avec les jetons dans l'URL :
 *   …/#access_token=…&refresh_token=…&type=invite     (ou type=recovery)
 *   …/#error=access_denied&error_code=otp_expired&…   (lien expiré ou déjà utilisé)
 *
 * On lit le type AVANT de créer le client, car supabase-js efface ensuite
 * l'URL. En cas d'erreur, on nettoie nous-mêmes l'URL : sinon le HashRouter
 * prend « error=… » pour une page et l'écran reste vide.
 */
const lireLienAuth = () => {
  if (typeof window === 'undefined') return { type: null, erreur: null };
  const params = new URLSearchParams(window.location.hash.replace(/^#\/?/, ''));
  new URLSearchParams(window.location.search).forEach((valeur, cle) => {
    if (!params.has(cle)) params.set(cle, valeur);
  });

  if (params.get('error') || params.get('error_code')) {
    const erreur = { code: params.get('error_code') || params.get('error'), message: params.get('error_description') };
    window.history.replaceState(null, '', `${window.location.pathname}#/login`);
    return { type: null, erreur };
  }
  if (params.get('access_token')) {
    return { type: params.get('type'), erreur: null };
  }
  return { type: null, erreur: null };
};

export const lienAuth = lireLienAuth();

export const supabase = createClient(supabaseUrl, supabaseKey);

/** Adresse de l'application, sans la partie « #/… » : cible des liens envoyés par e-mail. */
export const urlApplication = () =>
  typeof window === 'undefined' ? undefined : `${window.location.origin}${window.location.pathname}`;
