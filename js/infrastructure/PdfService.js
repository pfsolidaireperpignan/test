/* Fichier : js/infrastructure/PdfService.js - VERSION GOLD */
import { genererPDFFacture } from '../pdf_invoice.js';

export const PdfService = {
    generer(facture) {
        // 1. Petite vérification de sécurité
        if (!facture) {
            alert("Erreur : Aucune donnée à imprimer.");
            return;
        }

        // 2. Vérifie qu'il y a au moins un client ou un défunt
        if (!facture.client_nom && !facture.defunt_nom) {
            if(!confirm("Attention : Le nom du client est vide. Voulez-vous quand même imprimer ?")) {
                return;
            }
        }

        // 3. Lance la vraie génération du PDF
        try {
            genererPDFFacture(facture);
        } catch (e) {
            console.error("Erreur génération PDF:", e);
            alert("Une erreur est survenue lors de la création du PDF.");
        }
    }
};