/* Fichier : js/services/NumberingService.js - VERSION GOLD */
export const NumberingService = {
    genererSuivant(type, dernierNumero) {
        // 1. Définir le préfixe (F pour Facture, D pour Devis)
        const prefix = type === 'FACTURE' ? 'F' : 'D';
        
        // 2. Récupérer l'année en cours (ex: 2026)
        const year = new Date().getFullYear();
        
        // 3. Construire la base du numéro (ex: F2026-)
        const base = `${prefix}${year}-`;

        // 4. Si c'est la toute première facture de l'année
        if (!dernierNumero || !dernierNumero.startsWith(base)) {
            return `${base}001`;
        }

        // 5. Sinon, on incrémente le dernier numéro trouvé
        try {
            // On coupe après le tiret (ex: '012') et on convertit en nombre (12)
            const sequenceStr = dernierNumero.split('-')[1];
            const sequence = parseInt(sequenceStr, 10);
            
            // On ajoute 1
            const next = sequence + 1;
            
            // On remet les zéros devant (ex: 13 devient '013')
            return `${base}${next.toString().padStart(3, '0')}`;
        } catch (e) {
            console.error("Erreur numérotation", e);
            // En cas de panique, on redémarre à 001 pour ne pas bloquer
            return `${base}001`; 
        }
    }
};