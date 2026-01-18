/* Fichier : js/v2/config.js */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
// AJOUT DE 'where' et 'limit' ICI :
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, query, orderBy, where, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- REMETTEZ VOS CLÉS ICI (Copiez depuis l'ancien fichier) ---
const firebaseConfig = {
    apiKey: "AIzaSyDmsIkTjW2IFkIks5BUAnxLLnc7pnj2e0w",
    authDomain: "pf-solidaire.firebaseapp.com",
    projectId: "pf-solidaire",
    storageBucket: "pf-solidaire.firebasestorage.app",
    messagingSenderId: "485465343242",
    appId: "1:485465343242:web:46d2a49f851a95907b26f3",
    measurementId: "G-TWLLXKF0K4"
};
// ----------------------------------------

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const COLLECTION_NAME = "factures_v2"; 

// On exporte les nouveaux outils
export { db, auth, onAuthStateChanged, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, query, orderBy, where, limit, COLLECTION_NAME };