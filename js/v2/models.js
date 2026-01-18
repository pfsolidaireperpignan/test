/* Fichier : js/v2/models.js */

export function createLigne(data = {}) {
    return {
        type: data.type || 'line',
        description: data.description || '',
        prix: parseFloat(data.prix || 0) || 0,
        tva: data.tva || 'NA',
        category: data.category || 'courant'
    };
}

export function createPaiement(data = {}) {
    return {
        date: data.date || new Date().toISOString().split('T')[0],
        mode: data.mode || 'VIREMENT',
        montant: parseFloat(data.montant || 0) || 0
    };
}

export function createFacture(data = {}) {
    return {
        id: data.id || null,
        numero: data.numero || 'BROUILLON',
        type: data.type || 'DEVIS',
        date_creation: data.date_creation || new Date().toISOString().split('T')[0],
        
        client: {
            nom: data.client?.nom || '',
            adresse: data.client?.adresse || ''
        },
        defunt: {
            nom: data.defunt?.nom || ''
        },
        
        // Liste des prestations
        lignes: (data.lignes || []).map(l => createLigne(l)),
        
        // Liste des paiements
        paiements: (data.paiements || []).map(p => createPaiement(p)),
        
        // Totaux calculés
        total_ttc: parseFloat(data.total_ttc || 0) || 0,
        solde_paye: parseFloat(data.solde_paye || 0) || 0
    };
}