/* Fichier : js/services/ReglesMetier.js - VERSION GOLD */
export const ReglesMetier = {
    valider(facture) {
        const erreurs = [];

        // 1. Règle absolue : Il faut un Client
        if (!facture.client_nom || facture.client_nom.trim() === '') {
            erreurs.push("Le nom du client est obligatoire.");
        }

        // 2. Règle absolue : Le document ne peut pas être vide
        if (!facture.lignes || facture.lignes.length === 0) {
            erreurs.push("Le document est vide. Ajoutez au moins une ligne ou une prestation.");
        }

        // 3. Vérification de cohérence des prix
        facture.lignes.forEach((l, index) => {
            // On ignore les titres de sections (type 'section')
            if (l.type !== 'section') {
                // Si le prix n'est pas un nombre valide
                if (isNaN(parseFloat(l.prix_unitaire))) {
                    erreurs.push(`Erreur ligne ${index + 1} ("${l.description}") : Le prix est invalide.`);
                }
            }
        });

        // Résultat du contrôle
        return {
            valide: erreurs.length === 0, // Vrai si 0 erreur
            erreurs: erreurs // La liste des problèmes à afficher
        };
    }
};