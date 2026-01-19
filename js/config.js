/* Fichier : js/config.js (VOS CLÉS + FONCTIONS DE SUPPRESSION) */

// 1. Importation des outils Firebase (J'ai ajouté 'deleteDoc' ici)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 2. VOS CLÉS RÉELLES (Celles que vous m'avez données)
const firebaseConfig = {
    const firebaseConfig = {
    apiKey: "AIzaSyDmsIkTjW2IFkIks5BUAnxLLnc7pnj2e0w",
    authDomain: "pf-solidaire.firebaseapp.com",
    projectId: "pf-solidaire",
    storageBucket: "pf-solidaire.firebasestorage.app",
    messagingSenderId: "485465343242",
    appId: "1:485465343242:web:46d2a49f851a95907b26f3",
    measurementId: "G-TWLLXKF0K4"
  };
};

// 3. Initialisation
let app, auth, db;
try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("Firebase connecté avec succès (Config VOS CLEFS)");
} catch (e) {
    console.error("Erreur Config Firebase :", e);
}

// 4. EXPORTATION (J'ai ajouté 'deleteDoc' ici aussi pour le bouton poubelle)
export { 
    auth, 
    db, 
    collection, 
    addDoc, 
    getDocs, 
    query, 
    orderBy, 
    limit, 
    doc,        // Nécessaire pour modifier
    updateDoc,  // Nécessaire pour modifier
    deleteDoc,  // Nécessaire pour supprimer (Nouveau)
    onAuthStateChanged, 
    signInWithEmailAndPassword, 
    signOut 
};
