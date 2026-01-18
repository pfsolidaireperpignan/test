/* Fichier : js/utils.js - VERSION GOLD */

// 1. Récupère la valeur d'un input HTML (ou vide si n'existe pas)
export function getVal(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
}

// 2. Formate un nombre en Euros (Ex: 1050.5 -> "1 050,50 €")
export function formatMoney(amount) {
    if (isNaN(amount)) return "0,00 €";
    return parseFloat(amount).toLocaleString('fr-FR', { 
        style: 'currency', 
        currency: 'EUR' 
    });
}

// 3. Formate une date (Ex: 2026-01-20 -> "20/01/2026")
export function formatDateFR(dateString) {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString('fr-FR');
}