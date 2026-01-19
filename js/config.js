/* Fichier : js/config.js (CORRIGÉ - AVEC 'doc' et 'updateDoc') */
// Importation des outils Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
// AJOUT ICI DE 'doc' et 'updateDoc'
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ⚠️ REMPLACEZ CECI PAR VOS VRAIES CLÉS FIREBASE ⚠️
const firebaseConfig = {
    apiKey: "AIzaSyDmsIkTjW2IFkIks5BUAnxLLnc7pnj2e0w",
    authDomain: "pf-solidaire.firebaseapp.com",
    projectId: "pf-solidaire",
    storageBucket: "pf-solidaire.firebasestorage.app",
    messagingSenderId: "485465343242",
    appId: "1:485465343242:web:46d2a49f851a95907b26f3",
    measurementId: "G-TWLLXKF0K4"
  };

// Initialisation
let app, auth, db;
try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("Firebase connecté !");
} catch (e) {
    console.error("Erreur Config Firebase :", e);
}

// Exportation (AJOUT DE 'doc' et 'updateDoc' ICI AUSSI)
export { auth, db, collection, addDoc, getDocs, query, orderBy, limit, doc, updateDoc, onAuthStateChanged, signInWithEmailAndPassword, signOut };
