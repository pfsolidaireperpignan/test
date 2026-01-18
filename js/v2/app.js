/* Fichier : js/v2/app.js */
import { auth, onAuthStateChanged } from './config.js';
import { createFacture } from './models.js';

// État de l'application
const App = {
    currentDoc: null,
    user: null
};

// Démarrage
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Vérif connexion
    onAuthStateChanged(auth, (user) => {
        const loader = document.getElementById('app-loader');
        if (!user) {
            window.location.href = 'index.html'; // Retour accueil si pas connecté
        } else {
            App.user = user;
            console.log("Connecté (v2) :", user.email);
            if(loader) loader.style.display = 'none'; // On cache le loader
            initApp();
        }
    });
});

function initApp() {
    console.log("Application v2 prête.");
    
    // Gestion des boutons (Navigation simple pour tester)
    document.getElementById('btn-new-facture').addEventListener('click', () => {
        ouvrirEditeur(); // Ouvre une facture vide
    });

    document.getElementById('btn-back').addEventListener('click', () => {
        document.getElementById('view-editor').classList.add('hidden');
        document.getElementById('view-dashboard').classList.remove('hidden');
    });
}

function ouvrirEditeur(docData = null) {
    // On crée un objet propre grâce au Modèle
    App.currentDoc = createFacture(docData);
    
    // On affiche l'éditeur
    document.getElementById('view-dashboard').classList.add('hidden');
    document.getElementById('view-editor').classList.remove('hidden');
    
    // On remplit les champs (à suivre...)
    console.log("Document chargé :", App.currentDoc);
}