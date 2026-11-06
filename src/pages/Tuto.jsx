import React from "react";
import { cls } from "../components/ui";
import { useLangue } from "../i18n";

const Bouton = ({ children }) => (
  <span className="inline-block px-2 py-0.5 rounded-md bg-lin-300 text-encre text-[14px] font-medium whitespace-nowrap">
    {children}
  </span>
);

const Formule = ({ nom, children }) => (
  <div className="flex flex-col gap-1 sm:flex-row sm:gap-4 py-3 border-t border-lin-400 first:border-t-0">
    <dt className="sm:w-52 flex-none font-medium text-encre">{nom}</dt>
    <dd className="m-0 font-mono text-[13px] text-encre-600 leading-relaxed">{children}</dd>
  </div>
);

const P = ({ children, className = "" }) => <p className={`m-0 ${className}`}>{children}</p>;
const Liste = ({ children }) => <ul className="m-0 pl-5 list-disc flex flex-col gap-1.5">{children}</ul>;
const Fort = ({ children }) => <strong className="font-medium text-encre">{children}</strong>;

// Tableau des droits par rôle. lignes : [libellé, Administrateur, Teinturier, Visiteur] (true / false)
const TableauRoles = ({ roles, lignes, oui, non }) => (
  <div className={cls.tableau}>
    <table className="min-w-full text-sm">
      <thead>
        <tr className="text-left text-encre-600">
          <th scope="col" className="py-3 px-4 font-medium" />
          {roles.map((role) => (
            <th key={role} scope="col" className="py-3 px-4 font-medium text-center whitespace-nowrap">{role}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {lignes.map(([action, ...droits]) => (
          <tr key={action} className="border-t border-lin-400">
            <th scope="row" className="py-2.5 px-4 text-left font-normal text-encre-700">{action}</th>
            {droits.map((autorise, i) => (
              <td key={i} className="py-2.5 px-4 text-center">
                {autorise ? (
                  <span className="text-sauge font-semibold" aria-label={oui}>✓</span>
                ) : (
                  <span className="text-encre-500" aria-label={non}>—</span>
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ===================== FRANÇAIS =====================
const fr = {
  titre: "Tuto",
  intro: "Tout ce qu’il faut savoir pour consulter, saisir et retrouver les recettes de teinture de l’atelier.",
  sommaire: "Sommaire",
  sections: [
    {
      id: "acces",
      titre: "Accès",
      contenu: (
        <>
          <P>
            Les comptes sont créés par la propriétaire de la plateforme. Les membres de chaque projet et leur rôle
            sont ensuite gérés par les administrateurs du projet, depuis le menu du compte (
            <Bouton>Gérer les membres</Bouton>).
          </P>
          <P>Le mot de passe ne peut pas être modifié directement par les utilisateurs.</P>
        </>
      ),
    },
    {
      id: "niveaux",
      titre: "Niveaux d’accès",
      contenu: (
        <>
          <P>
            Pour chaque projet, chaque utilisateur a l’un des trois rôles suivants. Une même personne peut avoir des
            rôles différents selon les projets.
          </P>
          <TableauRoles
            roles={["Administrateur", "Teinturier", "Visiteur"]}
            oui="Autorisé"
            non="Non autorisé"
            lignes={[
              ["Voir le projet, lire les fiches, le nuancier, la recherche par teinte", true, true, true],
              ["Imprimer une fiche", true, true, true],
              ["Créer une fiche (Nouvelle fiche)", true, true, false],
              ["Modifier une fiche", true, true, false],
              ["Supprimer une fiche", true, true, false],
              ["Voir les membres du projet", true, false, false],
              ["Ajouter, inviter ou retirer un membre, changer son rôle", true, false, false],
              ["Créer un nouveau projet", true, false, false],
            ]}
          />
          <Liste>
            <li>Les boutons auxquels votre rôle ne donne pas accès ne sont pas affichés.</li>
            <li>
              Sans rôle sur un projet, on ne voit ni le projet, ni ses fiches, ni ses membres.
            </li>
            <li>
              Le créateur d’un projet en devient automatiquement <Fort>Administrateur</Fort>. Un projet garde
              toujours au moins un administrateur.
            </li>
            <li>La suppression d’un projet est faite par la propriétaire de la plateforme.</li>
          </Liste>
        </>
      ),
    },
    {
      id: "projet",
      titre: "Choisir un projet",
      contenu: (
        <>
          <P>
            Commencez par choisir un projet dans le menu en haut à droite (<Bouton>Sélectionner un projet</Bouton>).
            Une pastille verte indique le projet actif. Toutes les pages affichent ensuite les données de ce projet.
          </P>
          <P>
            Les administrateurs trouvent <Bouton>Créer un nouveau projet</Bouton> en bas de ce même menu. Le rond à
            vos initiales, tout à droite, ouvre le menu du compte : <Bouton>Gérer les membres</Bouton> (administrateurs)
            et <Bouton>Déconnexion</Bouton>.
          </P>
          <P>
            Le bouton <Bouton>FR</Bouton> / <Bouton>EN</Bouton> du bandeau change la langue du site ; votre choix est
            mémorisé sur cet appareil.
          </P>
        </>
      ),
    },
    {
      id: "accueil",
      titre: "Accueil",
      contenu: (
        <P>
          L’accueil permet d’ouvrir directement une fiche en tapant son numéro, d’accéder aux pages principales, et
          liste toutes les fiches du projet, de la plus récente à la plus ancienne. Cliquez sur une fiche pour l’ouvrir.
        </P>
      ),
    },
    {
      id: "nuancier",
      titre: "Nuancier",
      contenu: (
        <>
          <P>
            Le nuancier affiche toutes les couleurs enregistrées dans le projet. Les nuances dont les codes Lab et LCh
            n’ont pas encore été saisis apparaissent sur un fond hachuré, avec la mention « Codes Lab et LCh à
            saisir » ; en tri <Bouton>Par couleur</Bouton>, elles sont placées à la fin.
          </P>
          <Liste>
            <li>
              Filtrez par colorant avec les boutons sous le titre (<Bouton>Tous</Bouton>, <Bouton>Garance</Bouton>…).
            </li>
            <li>
              Triez <Bouton>Par fiche</Bouton> (ordre des numéros) ou <Bouton>Par couleur</Bouton> (regroupe les
              teintes proches, du clair au foncé).
            </li>
            <li>Cliquez sur une couleur pour ouvrir sa fiche, ou tapez un numéro de fiche dans le champ en haut à droite.</li>
          </Liste>
        </>
      ),
    },
    {
      id: "fiche",
      titre: "Consulter une fiche",
      contenu: (
        <P>
          La fiche présente les six nuances obtenues (aperçu, codes Lab et LCh), les informations générales (nom de
          l’auteur, date, objet, matière, pH de l’eau, pré-mordançage, montée en température, observations), les
          ingrédients (rapport de bain, parts totales, colorants avec fournisseur et lot, sels de nuançage), puis les
          tableaux Recettes, Dosage des colorants, Dosage des sels de nuançage et le volume d’eau à ajouter pour
          chaque nuance. La dilution de solution mère
          n’est affichée que pour les colorants dilués (dilution différente de 1).
        </P>
      ),
    },
    {
      id: "modifier",
      titre: "Modifier une fiche",
      contenu: (
        <>
          <P>
            Ouvrez la fiche puis cliquez <Bouton>Modifier</Bouton> en haut de page. Les champs à fond clair sont à
            remplir ; les cases grisées se calculent automatiquement.
          </P>
          <P>
            Le rapport de bain s’écrit sous la forme 1:n : saisissez seulement n (un nombre entier). Pour la couleur,
            saisissez soit le code Lab (L, a, b), soit le code LCh (L, C, h) : l’autre se calcule automatiquement,
            avec 2 décimales dans les deux cas. La case L est commune aux deux codes. Virgule et valeurs négatives sont
            acceptées. L’aperçu de la couleur s’affiche dès que le code est complet ; sans code, la nuance apparaît
            hachurée.
          </P>
          <P>
            Cliquez <Bouton>Mettre à jour</Bouton> pour enregistrer et revenir à la fiche, ou <Bouton>Annuler</Bouton>{" "}
            pour quitter sans enregistrer. Les deux boutons sont présents en haut et en bas de page.
          </P>
        </>
      ),
    },
    {
      id: "nouvelle",
      titre: "Nouvelle fiche",
      contenu: (
        <>
          <P>
            Cliquez <Bouton>Nouvelle fiche</Bouton> dans le menu. La fiche vide s’affiche, organisée comme en mode
            modification. Le numéro de fiche et la date sont obligatoires ; un numéro déjà utilisé dans le projet est
            refusé à l’enregistrement (y compris en modification). Cliquez{" "}
            <Bouton>Enregistrer</Bouton> une fois la fiche remplie.
          </P>
          <P>Seules les nuances où au moins une case « Nombre de parts » est supérieure à 0 sont enregistrées.</P>
        </>
      ),
    },
    {
      id: "supprimer",
      titre: "Supprimer une fiche",
      contenu: (
        <P>
          Réservé aux administrateurs et teinturiers du projet : ouvrez la fiche puis cliquez{" "}
          <Bouton>Supprimer</Bouton> en haut de page et confirmez. La fiche et toutes ses nuances sont supprimées
          définitivement.
        </P>
      ),
    },
    {
      id: "imprimer",
      titre: "Imprimer une fiche",
      contenu: (
        <P>
          Ouvrez la fiche puis cliquez <Bouton>Imprimer</Bouton> en haut de page. La fenêtre d’impression du
          navigateur s’ouvre avec une fiche prête à imprimer : une page A4 en paysage, en niveaux de gris, avec
          les six nuances côte à côte. Les cases vides peuvent être complétées à la main.
          <Bouton>Télécharger</Bouton> enregistre la même fiche en PDF. <Bouton>Dupliquer</Bouton> ouvre une
          nouvelle fiche déjà remplie comme celle-ci : il ne reste qu’à saisir son numéro.
        </P>
      ),
    },
    {
      id: "recherche",
      titre: "Recherche par teinte",
      contenu: (
        <>
          <P>
            Choisissez <Bouton>Lab</Bouton> ou <Bouton>LCh</Bouton>, saisissez la couleur cible (un aperçu s’affiche
            pendant la saisie) puis cliquez <Bouton>Rechercher</Bouton>. La recherche porte sur tous les projets
            auxquels vous avez accès : les 10 couleurs les plus proches s’affichent, la cible et la couleur trouvée
            côte à côte, avec le nom du projet. Cliquer sur une couleur d’un autre projet ouvre la fiche et bascule sur
            ce projet.
          </P>
          <P>
            L’écart est mesuré par le ΔE2000 : plus il est petit, plus les couleurs se ressemblent. En dessous de 1, la
            différence est en général invisible à l’œil ; au-delà de 10, il s’agit nettement d’une autre teinte.
          </P>
        </>
      ),
    },
    {
      id: "calculs",
      titre: "Calculs",
      contenu: (
        <>
          <P>Les cases grisées sont calculées pour chaque nuance à partir des valeurs saisies :</P>
          <dl className={`${cls.carte} m-0 px-5 py-2`}>
            <Formule nom="Valeur de la part">profondeur de ton ÷ parts totales</Formule>
            <Formule nom="% colorant">nombre de parts × valeur de la part</Formule>
            <Formule nom="Quantité de colorant">
              poids du tissu × % colorant ÷ [F] × dilution de la solution mère
            </Formule>
            <Formule nom="Quantité de sel de nuançage">poids du tissu × % sel ÷ 100 × dilution de la solution mère</Formule>
            <Formule nom="Volume du bain">poids du tissu × n (rapport de bain 1:n)</Formule>
            <Formule nom="Volume d’eau à ajouter">volume du bain − somme des quantités de colorants et de sels de nuançage</Formule>
          </dl>
          <P className="text-sm text-encre-500">
            Les quantités sont en grammes lorsque la dilution vaut 1, en millilitres de solution mère sinon.
          </P>
        </>
      ),
    },
    {
      id: "bugs",
      titre: "Bugs signalés et améliorations prévues",
      titreCourt: "Bugs et améliorations",
      contenu: (
        <Liste>
          <li>Aucun pour le moment.</li>
        </Liste>
      ),
    },
  ],
};

// ===================== ENGLISH =====================
const en = {
  titre: "Guide",
  intro: "Everything you need to know to look up, enter and find the studio’s dye recipes.",
  sommaire: "Contents",
  sections: [
    {
      id: "acces",
      titre: "Access",
      contenu: (
        <>
          <P>
            Accounts are created by the platform owner. Each project’s members and their roles are then managed by the
            project’s administrators, from the account menu (<Bouton>Manage members</Bouton>).
          </P>
          <P>Users cannot change their password themselves.</P>
        </>
      ),
    },
    {
      id: "niveaux",
      titre: "Access levels",
      contenu: (
        <>
          <P>
            In each project, every user has one of the three roles below. The same person can have different roles in
            different projects.
          </P>
          <TableauRoles
            roles={["Administrator", "Dyer", "Viewer"]}
            oui="Allowed"
            non="Not allowed"
            lignes={[
              ["See the project, view recipes, the swatch book and search by shade", true, true, true],
              ["Print a recipe", true, true, true],
              ["Create a recipe (New recipe card)", true, true, false],
              ["Edit a recipe", true, true, false],
              ["Delete a recipe", true, true, false],
              ["See the project’s members", true, false, false],
              ["Add, invite or remove a member, change their role", true, false, false],
              ["Create a new project", true, false, false],
            ]}
          />
          <Liste>
            <li>Buttons your role does not give access to are hidden.</li>
            <li>Without a role in a project, you cannot see the project, its recipes or its members.</li>
            <li>
              Whoever creates a project automatically becomes its <Fort>Administrator</Fort>. A project always keeps
              at least one administrator.
            </li>
            <li>Projects are deleted by the platform owner.</li>
          </Liste>
        </>
      ),
    },
    {
      id: "projet",
      titre: "Choosing a project",
      contenu: (
        <>
          <P>
            Start by choosing a project from the menu in the top right corner (<Bouton>Select a project</Bouton>). A
            green dot shows the active project. Every page then shows that project’s data.
          </P>
          <P>
            Administrators will find <Bouton>Create a new project</Bouton> at the bottom of the same menu. The circle
            with your initials, on the far right, opens the account menu: <Bouton>Manage members</Bouton>
            (administrators) and <Bouton>Sign out</Bouton>.
          </P>
          <P>
            The <Bouton>FR</Bouton> / <Bouton>EN</Bouton> switch in the header changes the site language; your choice
            is remembered on this device.
          </P>
        </>
      ),
    },
    {
      id: "accueil",
      titre: "Home",
      contenu: (
        <P>
          From the home page you can open a recipe directly by typing its number, reach the main pages, and see the
          project’s recipes, newest first. Click a recipe to open it.
        </P>
      ),
    },
    {
      id: "nuancier",
      titre: "Swatch book",
      contenu: (
        <>
          <P>
            The swatch book shows every colour saved in the project. Shades whose Lab and LCh codes have not been
            entered yet appear on a hatched background, marked “Lab and LCh codes missing”; when sorting{" "}
            <Bouton>By colour</Bouton>, they are listed last.
          </P>
          <Liste>
            <li>
              Filter by dye with the buttons below the title (<Bouton>All</Bouton> or a dye name).
            </li>
            <li>
              Sort <Bouton>By recipe</Bouton> (number order) or <Bouton>By colour</Bouton> (groups similar hues, from
              light to dark).
            </li>
            <li>Click a colour to open its recipe, or type a recipe number in the field in the top right corner.</li>
          </Liste>
        </>
      ),
    },
    {
      id: "fiche",
      titre: "Viewing a recipe",
      contenu: (
        <P>
          The recipe sheet shows the six shades obtained (preview, Lab and LCh codes), the general details (author’s
          name, date, purpose, fibre, water pH, pre-mordanting, temperature ramp, notes), the ingredients (liquor
          ratio, total parts, dyes with supplier and batch, shading salts), then the Recipes, Dye dosage and Shading
          salt dosage tables and the volume of water to add for each shade. The stock solution dilution is only shown for diluted dyes (dilution
          other than 1).
        </P>
      ),
    },
    {
      id: "modifier",
      titre: "Editing a recipe",
      contenu: (
        <>
          <P>
            Open the recipe and click <Bouton>Edit</Bouton> at the top of the page. Light fields are for you to fill
            in; grey cells are calculated automatically.
          </P>
          <P>
            The liquor ratio is written as 1:n: enter only n (a whole number). For the colour, enter either the Lab
            code (L, a, b) or the LCh code (L, C, h): the other is calculated automatically, to 2 decimals in both
            cases. The L cell is shared by both codes. Negative values and decimal commas are accepted. The colour
            preview appears once the code is complete; without a code, the shade is shown hatched.
          </P>
          <P>
            Click <Bouton>Update</Bouton> to save and return to the recipe, or <Bouton>Cancel</Bouton> to leave without
            saving. Both buttons appear at the top and bottom of the page.
          </P>
        </>
      ),
    },
    {
      id: "nouvelle",
      titre: "New recipe card",
      contenu: (
        <>
          <P>
            Click <Bouton>New recipe card</Bouton> in the menu. A blank recipe sheet opens, laid out like the edit view. The
            recipe number and date are required; a number already used in the project is rejected when saving
            (including when editing). Click{" "}
            <Bouton>Save</Bouton> once the sheet is filled in.
          </P>
          <P>Only shades with at least one “Number of parts” cell above 0 are saved.</P>
        </>
      ),
    },
    {
      id: "supprimer",
      titre: "Deleting a recipe",
      contenu: (
        <P>
          Project administrators and dyers only: open the recipe, click <Bouton>Delete</Bouton> at the top of the
          page and confirm. The recipe and all its shades are permanently deleted.
        </P>
      ),
    },
    {
      id: "imprimer",
      titre: "Printing a recipe",
      contenu: (
        <P>
          Open the recipe and click <Bouton>Print</Bouton> at the top of the page. The browser’s print window opens
          with a print-ready sheet: one A4 landscape page, in greyscale, with the six shades side by side. Empty
          boxes can be filled in by hand. <Bouton>Download</Bouton> saves the same sheet as a PDF.
          <Bouton>Duplicate</Bouton> opens a new recipe card filled in like this one: you only need to enter its number.
        </P>
      ),
    },
    {
      id: "recherche",
      titre: "Search by shade",
      contenu: (
        <>
          <P>
            Choose <Bouton>Lab</Bouton> or <Bouton>LCh</Bouton>, enter the target colour (a preview appears as you
            type) and click <Bouton>Search</Bouton>. The search covers every project you have access to: the 10
            closest colours are listed, with the target and the matching colour side by side and the project name.
            Clicking a colour from another project opens the recipe and switches to that project.
          </P>
          <P>
            The difference is measured with ΔE2000: the smaller it is, the more alike the colours. Below 1 the
            difference is usually invisible to the eye; above 10 it is clearly a different shade.
          </P>
        </>
      ),
    },
    {
      id: "calculs",
      titre: "Calculations",
      contenu: (
        <>
          <P>Grey cells are calculated for each shade from the values you enter:</P>
          <dl className={`${cls.carte} m-0 px-5 py-2`}>
            <Formule nom="Value of one part">depth of shade ÷ total parts</Formule>
            <Formule nom="Dye %">number of parts × value of one part</Formule>
            <Formule nom="Dye amount">fabric weight × dye % ÷ [F] × stock solution dilution</Formule>
            <Formule nom="Shading salt amount">fabric weight × salt % ÷ 100 × stock solution dilution</Formule>
            <Formule nom="Bath volume">fabric weight × n (liquor ratio 1:n)</Formule>
            <Formule nom="Volume of water to add">bath volume − sum of dye and shading salt amounts</Formule>
          </dl>
          <P className="text-sm text-encre-500">
            Amounts are in grams when the dilution is 1, otherwise in millilitres of stock solution.
          </P>
        </>
      ),
    },
    {
      id: "bugs",
      titre: "Known bugs and planned improvements",
      titreCourt: "Bugs and improvements",
      contenu: (
        <Liste>
          <li>None at the moment.</li>
        </Liste>
      ),
    },
  ],
};

const contenus = { fr, en };

export default function Tuto() {
  const { langue } = useLangue();
  const c = contenus[langue] || fr;

  return (
    <div className={`${cls.page} pt-14 flex flex-col gap-10`}>
      <div className="flex flex-col gap-2.5">
        <h1 className={`m-0 ${cls.h1}`}>{c.titre}</h1>
        <p className="m-0 text-base text-encre-500 max-w-2xl leading-relaxed">{c.intro}</p>
      </div>

      <div className="flex flex-wrap gap-10 items-start">
        {/* ===== SOMMAIRE ===== */}
        <nav
          aria-label={c.sommaire}
          className={`${cls.carte} flex-[1_1_220px] max-w-xs p-5 flex flex-col gap-1 lg:sticky lg:top-6`}
        >
          <p className="m-0 mb-2 text-[13px] tracking-[0.08em] uppercase text-encre-500">{c.sommaire}</p>
          {c.sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={(e) => {
                // Le site utilise des routes en « #/… » : on fait défiler sans changer l’URL
                e.preventDefault();
                document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth" });
              }}
              className="px-3 py-2 rounded-lg text-[15px] text-encre-600 no-underline hover:bg-lin-300 hover:text-encre"
            >
              {s.titreCourt || s.titre}
            </a>
          ))}
        </nav>

        {/* ===== CONTENU ===== */}
        <div className="flex-[999_1_560px] min-w-0 flex flex-col gap-10">
          {c.sections.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-6 flex flex-col gap-3">
              <h2 className={`m-0 ${cls.h3}`}>{s.titre}</h2>
              <div className="flex flex-col gap-3 text-[15px] leading-relaxed text-encre-700">{s.contenu}</div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
