/* Fichier : js/script.js (RACINE) */
import { auth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "./config.js";

// GESTION CONNEXION
document.addEventListener('DOMContentLoaded', () => {
    const loader = document.getElementById('app-loader');
    const loginScreen = document.getElementById('login-screen');
    const mainContent = document.querySelector('.main-content');
    const sidebar = document.querySelector('.sidebar');

    onAuthStateChanged(auth, (user) => {
        if(loader) loader.style.display = 'none';
        if (user) {
            if(loginScreen) loginScreen.classList.add('hidden');
            if(mainContent) mainContent.classList.remove('hidden');
            if(sidebar) sidebar.classList.remove('hidden');
        } else {
            if(loginScreen) loginScreen.classList.remove('hidden');
            if(mainContent) mainContent.classList.add('hidden');
            if(sidebar) sidebar.classList.add('hidden');
        }
    });

    const btnLogout = document.getElementById('btn-logout');
    if(btnLogout) btnLogout.addEventListener('click', () => { if(confirm("Se déconnecter ?")) signOut(auth); });

    const btnLogin = document.getElementById('btn-login');
    if(btnLogin) btnLogin.addEventListener('click', async () => {
        try {
            await signInWithEmailAndPassword(auth, document.getElementById('login-email').value, document.getElementById('login-password').value);
        } catch (e) { document.getElementById('login-error').textContent = "Erreur d'identification"; }
    });
});

// GENERATEUR PDF (STRUCTURE STANDARD CONSERVÉE)
window.genererPDF = function(type) {
    if (!window.jspdf) { alert("Erreur librairie PDF"); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Récupération des données
    const defunt = document.getElementById('defunt_nom').value || "......................";
    const dateDeces = document.getElementById('date_deces').value;
    const heureDeces = document.getElementById('heure_deces').value || "..h..";
    const lieuDeces = document.getElementById('lieu_deces').value || "......................";
    const neLe = document.getElementById('date_naissance').value;
    const declarant = document.getElementById('declarant_nom').value || "......................";
    
    // Format Dates
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : "................";
    const dateStr = fmtDate(dateDeces);
    const neLeStr = fmtDate(neLe);

    // En-tête Entreprise (Standard)
    doc.setFontSize(10);
    doc.text("PF SOLIDAIRE PERPIGNAN", 15, 15);
    doc.text("32 boulevard Léon Jean Grégory", 15, 20);
    doc.text("66300 THUIR - Tél: 07 55 18 27 77", 15, 25);
    doc.line(15, 28, 195, 28);

    // CONTENU SELON TYPE
    let y = 40;

    if (type === 'POUVOIR') {
        doc.setFontSize(16); doc.setFont("helvetica", "bold");
        doc.text("POUVOIR", 105, y, {align:'center'});
        y += 20;
        doc.setFontSize(12); doc.setFont("helvetica", "normal");
        doc.text(`Je soussigné(e) : ${declarant}`, 20, y); y+=10;
        doc.text(`Agissant en qualité de : ${document.getElementById('declarant_lien').value}`, 20, y); y+=15;
        doc.text("Donne pouvoir à PF SOLIDAIRE PERPIGNAN pour effectuer les démarches", 20, y); y+=7;
        doc.text("administratives relatives aux obsèques de :", 20, y); y+=15;
        doc.setFont("helvetica", "bold");
        doc.text(`Monsieur/Madame ${defunt}`, 20, y); y+=7;
        doc.setFont("helvetica", "normal");
        doc.text(`Décédé(e) le ${dateStr} à ${heureDeces}`, 20, y); y+=7;
        doc.text(`À : ${lieuDeces}`, 20, y); y+=20;
        doc.text("Pour valoir ce que de droit.", 20, y); y+=20;
        doc.text("Signature :", 120, y);
    }
    else if (type === 'DECES') {
        doc.setFontSize(16); doc.setFont("helvetica", "bold");
        doc.text("DÉCLARATION DE DÉCÈS", 105, y, {align:'center'});
        y += 20;
        doc.setFontSize(12); doc.setFont("helvetica", "normal");
        doc.text("À Monsieur l'Officier de l'État Civil,", 20, y); y+=15;
        doc.text(`Nous déclarons le décès de : ${defunt}`, 20, y); y+=10;
        doc.text(`Né(e) le : ${neLeStr}`, 20, y); y+=10;
        doc.text(`Domicilié(e) : ${document.getElementById('domicile_defunt').value}`, 20, y); y+=15;
        doc.text(`Décès survenu le ${dateStr} à ${heureDeces}`, 20, y); y+=10;
        doc.text(`À la commune de : ${lieuDeces}`, 20, y); y+=20;
        doc.text("Le Déclarant (PF SOLIDAIRE) :", 120, y);
    }
    else if (type === 'FERMETURE') {
        doc.setFontSize(16); doc.setFont("helvetica", "bold");
        doc.text("DEMANDE DE FERMETURE DE CERCUEIL", 105, y, {align:'center'});
        y += 20;
        doc.setFontSize(12); doc.setFont("helvetica", "normal");
        doc.text("Maire de la commune de : " + document.getElementById('lieu_mise_biere').value, 20, y); y+=20;
        doc.text(`Je soussigné, représentant les PF SOLIDAIRE,`, 20, y); y+=10;
        doc.text(`Sollicite l'autorisation de fermeture du cercueil de :`, 20, y); y+=15;
        doc.setFont("helvetica", "bold");
        doc.text(`${defunt}`, 40, y); y+=15;
        doc.setFont("helvetica", "normal");
        doc.text(`Mise en bière prévue à : ${document.getElementById('lieu_mise_biere').value}`, 20, y); y+=10;
        doc.text(`Destination : ${document.getElementById('destination').value}`, 20, y); y+=30;
        doc.text("Fait à THUIR, le " + new Date().toLocaleDateString(), 20, y);
    }
    else if (type === 'TRANSPORT') {
        doc.setFontSize(16); doc.setFont("helvetica", "bold");
        doc.text("DÉCLARATION DE TRANSPORT DE CORPS", 105, y, {align:'center'});
        doc.setFontSize(10); y+=7;
        doc.text("(Après Mise en Bière)", 105, y, {align:'center'});
        y += 20;
        doc.setFontSize(12); doc.setFont("helvetica", "normal");
        doc.text(`Défunt : ${defunt}`, 20, y); y+=10;
        doc.text(`Départ : ${document.getElementById('lieu_mise_biere').value}`, 20, y); y+=10;
        doc.text(`Arrivée : ${document.getElementById('destination').value}`, 20, y); y+=20;
        doc.text("Moyens de transport :", 20, y); y+=10;
        doc.text(`- Véhicule Agréé : ${document.getElementById('vehicule_immat').value}`, 20, y); y+=10;
        doc.text(`- Chauffeur : ${document.getElementById('chauffeur_nom').value}`, 20, y); y+=30;
        doc.text("Le Conseiller Funéraire", 120, y);
    }

    doc.save(`${type}_${defunt}.pdf`);
};
