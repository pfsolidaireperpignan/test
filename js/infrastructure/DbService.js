/* Fichier : js/infrastructure/DbService.js - VERSION GOLD */
import { db } from '../config.js'; // Remonte d'un dossier pour trouver config.js
import { 
    collection, 
    addDoc, 
    getDoc, 
    getDocs, 
    doc, 
    updateDoc, 
    deleteDoc, 
    query, 
    orderBy, 
    limit 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export const DbService = {
    // 1. RÉCUPÉRER TOUTE UNE LISTE (Ex: Toutes les factures)
    async getAll(collectionName, sortField = 'numero') {
        try {
            const q = query(collection(db, collectionName), orderBy(sortField, 'desc'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error(`Erreur lecture collection ${collectionName}:`, error);
            throw error;
        }
    },

    // 2. RÉCUPÉRER UN SEUL DOCUMENT PAR SON ID
    async getById(collectionName, id) {
        if (!id) return null;
        try {
            const ref = doc(db, collectionName, id);
            const snap = await getDoc(ref);
            return snap.exists() ? { id: snap.id, ...snap.data() } : null;
        } catch (error) {
            console.error(`Erreur lecture ID ${id}:`, error);
            return null;
        }
    },

    // 3. SAUVEGARDER (CRÉATION OU MISE À JOUR INTELLIGENTE)
    async save(collectionName, data) {
        try {
            // Nettoyage pour éviter les bugs (clone l'objet)
            const cleanData = JSON.parse(JSON.stringify(data));
            
            if (cleanData.id) {
                // CAS A : Mise à jour d'un document existant
                const ref = doc(db, collectionName, cleanData.id);
                const dataToSave = { ...cleanData };
                delete dataToSave.id; // On ne stocke pas l'ID à l'intérieur
                await updateDoc(ref, dataToSave);
                return cleanData.id;
            } else {
                // CAS B : Création d'un nouveau document
                const ref = await addDoc(collection(db, collectionName), cleanData);
                return ref.id;
            }
        } catch (error) {
            console.error("Erreur sauvegarde :", error);
            throw error;
        }
    },

    // 4. SUPPRIMER UN DOCUMENT
    async delete(collectionName, id) {
        try {
            await deleteDoc(doc(db, collectionName, id));
        } catch (error) {
            console.error("Erreur suppression :", error);
            throw error;
        }
    },

    // 5. TROUVER LE DERNIER DOCUMENT (Pour la numérotation automatique)
    async getLastDocument(collectionName, typeDoc) {
        try {
            // Trie par date de création décroissante et prend le 1er
            const q = query(collection(db, collectionName), orderBy('created_at', 'desc'), limit(1));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                return snapshot.docs[0].data();
            }
            return null;
        } catch (error) {
            // Si c'est la toute première fois, pas d'erreur, juste null
            return null;
        }
    }
};