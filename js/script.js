/* Fichier : js/script.js (CORRIGÉ - SANS IMPORT PDF) */
import { auth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "./config.js";

// NOTE : On ne met PAS d'import jsPDF ici car il est déjà chargé par le fichier HTML.

// 1. GESTION DU CHARGEMENT & CONNEXION
document.addEventListener('DOMContentLoaded', () => {
    const loader = document.getElementById('app-loader');
    const loginScreen = document.getElementById('login-screen');
    const mainContent = document.getElementById('main-content');
    const sidebar = document.querySelector('.sidebar');

    onAuthStateChanged(auth, (user) => {
        if(loader) loader.style.display = 'none'; // On cache le chargement
        
        if (user) {
            // UTILISATEUR CONNECTÉ
            if(loginScreen) loginScreen.classList.add('hidden');
            if(mainContent) mainContent.classList.remove('hidden');
            if(sidebar) sidebar.classList.remove('hidden');
            console.log("Connecté :", user.email);
        } else {
            // UTILISATEUR DÉCONNECTÉ
            if(loginScreen) loginScreen.classList.remove('hidden');
            if(mainContent) mainContent.classList.add('hidden');
            if(sidebar) sidebar.classList.add('hidden');
        }
    });

    // BOUTON DECONNEXION
    const btnLogout = document.getElementById('btn-logout');
    if(btnLogout) {
        btnLogout.addEventListener('click', () => {
            if(confirm("Se déconnecter ?")) signOut(auth);
        });
    }

    // BOUTON CONNEXION
    const btnLogin = document.getElementById('btn-login');
    if(btnLogin) {
        btnLogin.addEventListener('click', async () => {
            const email = document.getElementById('login-email').value;
            const pass = document.getElementById('login-password').value;
            const errorMsg = document.getElementById('login-error');
            
            try {
                await signInWithEmailAndPassword(auth, email, pass);
            } catch (error) {
                console.error(error);
                if(errorMsg) errorMsg.textContent = "Erreur : Email ou mot de passe incorrect.";
            }
        });
    }
});

// 2. GENERATEUR PDF (ADMINISTRATIF)
// Cette fonction est appelée par les boutons HTML
window.genererPDF = function(type) {
    // C'EST ICI LA CORRECTION : On récupère l'outil directement depuis la page
    if (!window.jspdf) { alert("Erreur: Librairie PDF non chargée"); return; }
    const { jsPDF } = window.jspdf;

    const defunt = document.getElementById('defunt_nom').value || "..................";
    const dateDeces = document.getElementById('date_deces').value;
    const lieuDeces = document.getElementById('lieu_deces').value || "..................";
    
    // Formatage date
    let dateStr = "..................";
    if(dateDeces) {
        dateStr = new Date(dateDeces).toLocaleDateString('fr-FR');
    }

    const doc = new jsPDF();
    
    // En-tête standard
    doc.setFontSize(10);
    doc.text("PF SOLIDAIRE PERPIGNAN", 15, 15);
    doc.text("32 boulevard Léon Jean Grégory", 15, 20);
    doc.text("66300 THUIR", 15, 25);

    if (type === 'POUVOIR') {
        doc.setFontSize(16); doc.setFont("helvetica", "bold");
        doc.text("POUVOIR POUR DEMARCHES", 105, 40, {align:'center'});
        
        doc.setFontSize(12); doc.setFont("helvetica", "normal");
        const texte = `Je soussigné(e) .....................................................................\n\n` +
                      `Agissant en qualité de ...............................................................\n\n` +
                      `Donne pouvoir à la société PF SOLIDAIRE PERPIGNAN pour effectuer toutes les démarches\n` +
                      `administratives nécessaires suite au décès de :\n\n` +
                      `Monsieur/Madame : ${defunt}\n` +
                      `Survenu le : ${dateStr}\n` +
                      `À : ${lieuDeces}\n\n` +
                      `Pour valoir ce que de droit.`;
        
        doc.text(texte, 20, 60);
        doc.text("Signature et mention 'Bon pour pouvoir'", 120, 150);
    }
    else if (type === 'DECES') {
        doc.setFontSize(16); doc.setFont("helvetica", "bold");
        doc.text("DECLARATION DE DECES", 105, 40, {align:'center'});
        
        doc.setFontSize(12); doc.setFont("helvetica", "normal");
        doc.text(`Nous déclarons le décès de : ${defunt}`, 20, 60);
        doc.text(`Survenu le : ${dateStr}`, 20, 70);
        doc.text(`À la commune de : ${lieuDeces}`, 20, 80);
        doc.text(`Cette déclaration est faite pour l'organisation des obsèques.`, 20, 100);
    }
    else if (type === 'FERMETURE') {
        doc.setFontSize(16); doc.setFont("helvetica", "bold");
        doc.text("DEMANDE DE FERMETURE DE CERCUEIL", 105, 40, {align:'center'});
        
        doc.setFontSize(12); doc.setFont("helvetica", "normal");
        doc.text(`Concerne le défunt : ${defunt}`, 20, 60);
        doc.text(`Décédé(e) le : ${dateStr}`, 20, 70);
        doc.text("Nous demandons l'autorisation de procéder à la fermeture du cercueil.", 20, 90);
    }

    doc.save(`${type}_${defunt}.pdf`);
};
