/* Fichier : js/ui/FormMapper.js - VERSION GOLD */
export const FormMapper = {
    // 1. REMPLIR L'ÉCRAN AVEC LES DONNÉES (De l'Objet vers le HTML)
    fill(facture) {
        // Petite fonction pour remplir un champ sans erreur si l'ID n'existe pas
        const setValue = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val || '';
        };

        // Remplissage des champs principaux
        setValue('facture_numero', facture.numero);
        setValue('doc_type', facture.type);
        setValue('facture_nom', facture.client_nom);
        setValue('facture_adresse', facture.client_adresse);
        setValue('facture_defunt', facture.defunt_nom);

        // Gestion spéciale du Numéro (Texte affiché en gros)
        const txtNum = document.getElementById('facture_numero_txt');
        if (txtNum) {
            // Si c'est un brouillon, on affiche "Nouveau", sinon le numéro
            txtNum.textContent = (facture.numero && facture.numero !== '(Brouillon)') ? facture.numero : '#NOUVEAU';
        }

        // Gestion spéciale de la Date (Format YYYY-MM-DD pour l'input date)
        if (facture.date_creation) {
            // On garde juste la partie date (2026-01-20)
            const dateAffichage = new Date(facture.date_creation).toISOString().split('T')[0];
            setValue('facture_date', dateAffichage);
        } else {
            // Date du jour par défaut
            setValue('facture_date', new Date().toISOString().split('T')[0]);
        }

        // Affichage du Total en bas du tableau
        const totalEl = document.getElementById('total-ttc');
        if (totalEl) {
            totalEl.textContent = (parseFloat(facture.total_ttc) || 0).toFixed(2) + ' €';
        }
    },

    // 2. LIRE L'ÉCRAN POUR SAUVEGARDER (Du HTML vers l'Objet)
    read(factureActuelle) {
        const getValue = (id) => {
            const el = document.getElementById(id);
            return el ? el.value : '';
        };

        // On met à jour l'objet facture avec ce que l'utilisateur a tapé
        factureActuelle.type = getValue('doc_type');
        factureActuelle.date_creation = getValue('facture_date') || new Date().toISOString();
        
        // On ne change le numéro que s'il est déjà défini (sinon c'est l'auto qui gère)
        const numVal = getValue('facture_numero');
        if(numVal) factureActuelle.numero = numVal;

        factureActuelle.client_nom = getValue('facture_nom');
        factureActuelle.client_adresse = getValue('facture_adresse');
        factureActuelle.defunt_nom = getValue('facture_defunt');

        return factureActuelle;
    },

    // 3. ACTIVER OU DÉSACTIVER LES CHAMPS (Mode Lecture Seule vs Édition)
    toggleEditMode(editable) {
        // Dans cette version Gold, on laisse généralement tout modifiable pour corriger les erreurs.
        // Mais on verrouille toujours le numéro qui est généré automatiquement.
        const numInput = document.getElementById('facture_numero');
        if(numInput) numInput.disabled = true; // Toujours bloqué
        
        // Optionnel : Vous pouvez ajouter ici d'autres logiques de verrouillage si besoin
    }
};