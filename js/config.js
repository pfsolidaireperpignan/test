/* Fichier : js/config.js (VOS CLÉS + FONCTIONS ACTIVES) */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
// AJOUT DES OUTILS MANQUANTS ICI : doc, updateDoc, deleteDoc
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDmsIkTjW2IFkIks5BUAnxLLnc7pnj2e0w",
    authDomain: "pf-solidaire.firebaseapp.com",
    projectId: "pf-solidaire",
    storageBucket: "pf-solidaire.firebasestorage.app",
    messagingSenderId: "485465343242",
    appId: "1:485465343242:web:46d2a49f851a95907b26f3",
    measurementId: "G-TWLLXKF0K4"
};

let app, auth, db;
try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("Firebase connecté (PF Solidaire) !");
} catch (e) {
    console.error("Erreur Config :", e);
}

export { 
    auth, db, collection, addDoc, getDocs, query, orderBy, limit, 
    doc, updateDoc, deleteDoc, // <--- C'EST CA QUI MANQUAIT POUR SUPPRIMER
    onAuthStateChanged, signInWithEmailAndPassword, signOut 
};
