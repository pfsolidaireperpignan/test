/* Fichier : js/v2/models.js */

// Structure d'une ligne parfaite
export function createLigne(data = {}) {
    return {
        type: data.type || 'line', // 'section' ou 'line'
        description: data.description || '',
        prix: parseFloat(data.prix || 0) || 0,
        tva: data.tva || 'NA',
        category: data.category || 'courant' // 'courant' ou 'option'
    };
}

// Structure d'une facture parfaite
export function createFacture(data = {}) {
    return {
        id: data.id || null, // L'ID Firebase
        numero: data.numero || 'BROUILLON',
        type: data.type || 'DEVIS',
        
        // Dates
        date_creation: data.date_creation || new Date().toISOString().split('T')[0],
        
        // Client
        client: {
            nom: data.client?.nom || '',
            adresse: data.client?.adresse || ''
        },
        defunt: {
            nom: data.defunt?.nom || ''
        },
        
        // Contenu
        lignes: (data.lignes || []).map(l => createLigne(l)),
        
        // Totaux (Calculés, pas stockés au hasard)
        total_ttc: parseFloat(data.total_ttc || 0) || 0,
        solde_paye: parseFloat(data.solde_paye || 0) || 0
    };
}