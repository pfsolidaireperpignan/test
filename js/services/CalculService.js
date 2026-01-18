/* Fichier : js/services/CalculService.js - VERSION GOLD */
export const CalculService = {
    recalculer(facture) {
        let total = 0;

        // 1. Calcul du total des lignes
        facture.lignes.forEach(ligne => {
            // On ignore les titres de section pour le calcul
            if (ligne.type !== 'section') {
                total += parseFloat(ligne.prix_unitaire) || 0;
            }
        });

        // Dans votre cas (TVA non applicable), le Total HT = Total TTC
        facture.total_ttc = total;
        facture.total_ht = total; // On garde les deux identiques par sécurité

        // 2. Calcul du total déjà payé
        let paye = 0;
        if (facture.paiements && Array.isArray(facture.paiements)) {
            facture.paiements.forEach(p => {
                paye += parseFloat(p.montant) || 0;
            });
        }
        facture.total_paye = paye;

        // 3. Calcul du Reste à Payer
        // On empêche les chiffres négatifs (Math.max(0...))
        facture.reste_a_payer = Math.max(0, facture.total_ttc - facture.total_paye);

        // 4. Définition automatique du statut (Couleur du badge)
        if (facture.total_ttc > 0 && facture.reste_a_payer <= 0.05) {
            // S'il reste moins de 5 centimes, c'est payé (tolérance aux arrondis)
            facture.statut = 'PAYÉE';
        } else if (facture.total_paye > 0) {
            // Payé un peu mais pas tout
            facture.statut = 'PARTIELLE';
        } else {
            // Rien payé du tout
            facture.statut = 'À PAYER';
        }

        return facture;
    }
};