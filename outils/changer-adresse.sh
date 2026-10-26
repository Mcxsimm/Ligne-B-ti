#!/usr/bin/env bash
# Remplace l'adresse publique du site dans toutes les pages, le sitemap et robots.txt.
# À lancer une fois le nom de domaine connecté (voir README, étape 5).
#
#   Usage :  bash outils/changer-adresse.sh https://www.chargepro.fr/
#
# L'adresse doit commencer par https:// et se terminer par une barre oblique.
set -euo pipefail

ANCIENNE="https://mcxsimm.github.io/Ligne-B-ti/"
NOUVELLE="${1:-}"

if [[ ! "$NOUVELLE" =~ ^https://.+/$ ]]; then
  echo "Indiquez la nouvelle adresse complète, par exemple : https://www.mon-domaine.fr/" >&2
  exit 1
fi

cd "$(dirname "$0")/.."
ACTUELLE=$(grep -o 'https://[^"<]*sitemap.xml' robots.txt | sed 's/sitemap.xml$//')
ANCIENNE="${ACTUELLE:-$ANCIENNE}"

for f in *.html sitemap.xml robots.txt; do
  # Séparateur « | » : les adresses contiennent des « / »
  sed -i.bak "s|${ANCIENNE}|${NOUVELLE}|g" "$f" && rm -f "$f.bak"
done

echo "Adresse remplacée : ${ANCIENNE} -> ${NOUVELLE}"
grep -c "${NOUVELLE}" index.html >/dev/null && echo "Vérification : OK"
