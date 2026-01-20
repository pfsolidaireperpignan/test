/* Fichier : js/config.js (AVEC RESET PASSWORD) */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// VOS CLÉS (Ne changez rien ici si c'est déjà bon chez vous)
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
    console.log("Firebase connecté (Config)");
} catch (e) {
    console.error("Erreur Config :", e);
}

export { 
    auth, db, collection, addDoc, getDocs, query, orderBy, limit, 
    doc, updateDoc, deleteDoc, 
    onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail // <--- AJOUTÉ ICI
};
