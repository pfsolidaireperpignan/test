/* Fichier : js/config.js - VERSION GOLD */

// 1. Importation des modules Firebase (Ne touchez pas à ces liens)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js"; 

// 2. Configuration de votre projet (C'est ici qu'il faut coller vos clés)
const firebaseConfig = {
    apiKey: "AIzaSyDmsIkTjW2IFkIks5BUAnxLLnc7pnj2e0w",
    authDomain: "pf-solidaire.firebaseapp.com",
    projectId: "pf-solidaire",
    storageBucket: "pf-solidaire.firebasestorage.app",
    messagingSenderId: "485465343242",
    appId: "1:485465343242:web:46d2a49f851a95907b26f3",
    measurementId: "G-TWLLXKF0K4"
};

/* ⚠️ IMPORTANT : 
   Si vous avez déjà vos clés dans votre ancien fichier, 
   copiez juste le bloc "const firebaseConfig = { ... };" 
   et collez-le à la place de celui ci-dessus.
*/

// 3. Initialisation des services
const app = initializeApp(firebaseConfig);
const db = getFirestore(app); // La base de données
const auth = getAuth(app);    // L'authentification (Login)

// 4. Exportation pour que les autres fichiers (app_facturation.js, etc.) puissent les utiliser
export { db, auth };