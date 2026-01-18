/* Fichier : js/domain/Facture.js - VERSION "ANTI-BUG" */
import { LigneFacture } from './LigneFacture.js';

export class Facture {
    constructor(data = {}) {
        this.id = data.id || null;
        this.numero = data.numero || null; 
        this.type = data.type || 'DEVIS'; 
        this.client_id = data.client_id || null;
        
        this.client_nom = data.client_nom || '';
        this.client_adresse = data.client_adresse || '';
        this.defunt_nom = data.defunt_nom || '';
        
        this.date_creation = data.date_creation || new Date().toISOString();
        
        // ICI EST LA CLÉ DU PROBLÈME :
        // Au lieu de prendre les données brutes (qui peuvent être buggées),
        // on les passe toutes par le "Nettoyeur" (new LigneFacture).
        this.lignes = (data.lignes || []).map(l => new LigneFacture(l));
        
        this.paiements = data.paiements || [];
        
        this.total_ht = parseFloat(data.total_ht) || 0;
        this.total_ttc = parseFloat(data.total_ttc) || 0;
        this.total_paye = parseFloat(data.total_paye) || 0;
        this.reste_a_payer = parseFloat(data.reste_a_payer) || 0;
        
        this.statut = data.statut || 'BROUILLON';
        this.type_obseques = data.type_obseques || '';
    }
}