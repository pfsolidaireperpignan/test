/* Fichier : script.js - VERSION GOLD */
// Importation de la configuration (Vérifiez que le chemin est bon)
import { auth } from './js/config.js'; 
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- SURVEILLANCE DE L'ÉTAT DE CONNEXION ---
onAuthStateChanged(auth, (user) => {
    const loader = document.getElementById('app-loader');
    const loginScreen = document.getElementById('login-screen');
    const mainContent = document.getElementById('main-content');

    if (user) {
        // --- CAS 1 : CONNECTÉ ---
        console.log("Utilisateur connecté :", user.email);
        
        // 1. Cacher le Login
        if(loginScreen) loginScreen.classList.add('hidden');
        
        // 2. Afficher le contenu principal
        if(mainContent) mainContent.classList.remove('hidden');

        // 3. Faire disparaître le Loader en douceur
        if(loader) {
            loader.style.opacity = '0';
            loader.style.transition = 'opacity 0.5s';
            setTimeout(() => loader.remove(), 500);
        }

    } else {
        // --- CAS 2 : DÉCONNECTÉ ---
        console.log("Utilisateur déconnecté");

        // 1. Afficher le Login
        if(loginScreen) loginScreen.classList.remove('hidden');
        
        // 2. Cacher le contenu
        if(mainContent) mainContent.classList.add('hidden');

        // 3. Supprimer le loader (pour qu'on puisse voir le login)
        if(loader) loader.remove();
    }
});

// --- FONCTIONS DE CONNEXION (Globales) ---

// 1. Se connecter
window.loginFirebase = function() {
    const email = document.getElementById('email-input').value;
    const pass = document.getElementById('password-input').value;
    const errorMsg = document.getElementById('login-error');

    if(!email || !pass) {
        errorMsg.textContent = "Veuillez remplir tous les champs.";
        return;
    }

    errorMsg.textContent = "Connexion en cours...";

    signInWithEmailAndPassword(auth, email, pass)
        .then((userCredential) => {
            // La redirection est gérée automatiquement par onAuthStateChanged
            errorMsg.textContent = "";
        })
        .catch((error) => {
            console.error(error);
            errorMsg.textContent = "Erreur : Email ou mot de passe incorrect.";
        });
};

// 2. Se déconnecter
window.logoutFirebase = function() {
    if(confirm("Voulez-vous vraiment vous déconnecter ?")) {
        signOut(auth).then(() => {
            window.location.reload(); // On recharge pour remettre l'application à zéro
        }).catch((error) => {
            console.error("Erreur déconnexion", error);
        });
    }
};