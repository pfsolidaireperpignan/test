/* Fichier : js/domain/Paiement.js - VERSION GOLD */
export class Paiement {
    constructor(data = {}) {
        // Date du paiement (par défaut aujourd'hui)
        this.date = data.date || new Date().toISOString().split('T')[0];
        
        // Mode de règlement
        this.mode = data.mode || 'VIREMENT'; // Valeurs possibles: CHÈQUE, ESPÈCES, CB, VIREMENT
        
        // Référence (ex: Numéro du chèque)
        this.reference = data.reference || '';
        
        // Montant versé
        this.montant = parseFloat(data.montant) || 0;
    }
}