/* Registre des modules : identifiant du bâtiment → module */
import siege from "./siege.js";
import affaires from "./affaires.js";
import chantiers from "./chantiers.js";
import finances from "./finances.js";
import entrepot from "./entrepot.js";
import planning from "./planning.js";
import administration from "./administration.js";
import controle from "./controle.js";
import partenaires from "./partenaires.js";

export const MODULES = { siege, affaires, chantiers, finances, entrepot, planning, administration, controle, partenaires };
