/* Fichier : js/domain/LigneFacture.js - VERSION DETECTIVE AUTO */
export class LigneFacture {
    constructor(data = {}) {
        if (!data) data = {};

        // 1. RECHERCHE INTELLIGENTE DE LA DESCRIPTION
        // On regarde si une des clés connues contient le texte
        this.description = data.description || 
                           data.designation || 
                           data.libelle || 
                           data.nom || 
                           data.titre || 
                           data.prestation || 
                           data.label || 
                           '';

        // Si on a rien trouvé, on cherche la première valeur "Texte" qui traîne dans l'objet
        if (!this.description) {
            for (const key in data) {
                // Si c'est du texte et que c'est pas un ID ou un Type
                if (typeof data[key] === 'string' && data[key].length > 2 && key !== 'id' && key !== 'type') {
                    this.description = data[key];
                    break; 
                }
            }
        }

        // 2. RECHERCHE INTELLIGENTE DU PRIX
        let prix = data.prix_unitaire || data.prix || data.montant || data.total || data.pu || data.value || 0;
        this.prix_unitaire = parseFloat(prix);
        if (isNaN(this.prix_unitaire)) this.prix_unitaire = 0;

        // 3. LE RESTE
        this.type = data.type || 'line';
        this.tva = data.tva || 'NA';
        this.type_prestation = data.type_prestation || 'courant';
    }
}