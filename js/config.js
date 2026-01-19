/* Fichier : js/config.js (VERSION CORRIGÉE ET VÉRIFIÉE) */

// 1. On importe les outils depuis Firebase (Notez bien 'doc' et 'updateDoc')
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 2. Vos clés (Ne touchez pas si elles marchaient avant)
const firebaseConfig = {
    apiKey: "AIzaSyDmsIkTjW2IFkIks5BUAnxLLnc7pnj2e0w",
    authDomain: "pf-solidaire.firebaseapp.com",
    projectId: "pf-solidaire",
    storageBucket: "pf-solidaire.firebasestorage.app",
    messagingSenderId: "485465343242",
    appId: "1:485465343242:web:46d2a49f851a95907b26f3",
    measurementId: "G-TWLLXKF0K4"
  };

// 3. Initialisation
let app, auth, db;
try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("Firebase connecté avec succès (Config)");
} catch (e) {
    console.error("Erreur Config Firebase :", e);
}

// 4. EXPORTATION (C'est ici que l'erreur se produisait avant)
// On rend 'doc' et 'updateDoc' disponibles pour les autres fichiers
export { 
    auth, 
    db, 
    collection, 
    addDoc, 
    getDocs, 
    query, 
    orderBy, 
    limit, 
    doc,        // <--- INDISPENSABLE
    updateDoc,  // <--- INDISPENSABLE
    onAuthStateChanged, 
    signInWithEmailAndPassword, 
    signOut 
};
