/* Fichier : js/domain/LigneFacture.js - VERSION ROBUSTE */
export class LigneFacture {
    constructor(data = {}) {
        // Sécurité maximale : on s'assure que data n'est pas null
        if (!data) data = {};

        this.type = data.type || 'line'; 
        
        // On cherche le texte partout. 
        // Si 'description' est explicitement "undefined" (le texte), on le remplace par vide.
        let desc = data.description || data.designation || data.libelle || data.nom || data.titre || '';
        if (desc === 'undefined') desc = '';
        this.description = desc;
        
        // On nettoye le prix
        let prix = data.prix_unitaire || data.prix || data.montant || 0;
        this.prix_unitaire = parseFloat(prix);
        if (isNaN(this.prix_unitaire)) this.prix_unitaire = 0;
        
        this.tva = data.tva || 'NA'; 
        this.type_prestation = data.type_prestation || 'courant'; 
    }
}