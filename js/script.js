/* Fichier : js/script.js (VERSION DESIGN PRO + LOGO) */
import { auth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "./config.js";

// 1. GESTION CONNEXION
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

// 2. GENERATEUR PDF (DESIGN PRO + LOGO)
window.genererPDF = function(type) {
    if (!window.jspdf) { alert("Erreur PDF"); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // --- RECUPERATION DONNEES ---
    const defunt = document.getElementById('defunt_nom').value || "......................";
    const dateDeces = document.getElementById('date_deces').value;
    const heureDeces = document.getElementById('heure_deces').value || "..h..";
    const lieuDeces = document.getElementById('lieu_deces').value || "......................";
    const neLe = document.getElementById('date_naissance').value;
    const declarant = document.getElementById('declarant_nom').value || "......................";
    const declarantLien = document.getElementById('declarant_lien') ? document.getElementById('declarant_lien').value : "";
    const domicile = document.getElementById('domicile_defunt').value || "......................";
    
    // Transport
    const lieuMiseBiere = document.getElementById('lieu_mise_biere').value || "......................";
    const destination = document.getElementById('destination').value || "......................";
    const immat = document.getElementById('vehicule_immat').value || "DA-081-ZQ";
    const chauffeur = document.getElementById('chauffeur_nom').value || "......................";

    // Dates
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : "................";
    const dateStr = fmtDate(dateDeces);
    const neLeStr = fmtDate(neLe);
    const dateJour = new Date().toLocaleDateString('fr-FR');

    // ==========================================
    // EN-TÊTE PRO (AVEC LOGO & COULEURS)
    // ==========================================
    
    // 1. Le Logo
    const imgLogo = document.getElementById('logo-model');
    if (imgLogo && imgLogo.src) {
        try {
            doc.addImage(imgLogo, 'PNG', 15, 10, 40, 40); // Logo en haut à gauche
        } catch(e) { console.log("Logo non chargé, continuons..."); }
    }

    // 2. Infos Entreprise (A droite du logo ou en dessous)
    doc.setTextColor(22, 101, 52); // VERT ENTREPRISE
    doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text("POMPES FUNEBRES SOLIDAIRE", 60, 20);
    
    doc.setTextColor(50, 50, 50); // GRIS FONCÉ
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text("32 boulevard Léon Jean Grégory, 66300 THUIR", 60, 26);
    doc.text("Tél: 07 55 18 27 77", 60, 31);
    doc.text("HABILITATION N°: 23-66-0205 | SIRET: 53927029800042", 60, 36);
    
    // Ligne de séparation verte
    doc.setDrawColor(22, 101, 52); 
    doc.setLineWidth(0.5);
    doc.line(15, 55, 195, 55);

    // ==========================================
    // CORPS DU DOCUMENT
    // ==========================================
    doc.setTextColor(0, 0, 0); // Noir pour le texte
    let y = 70;

    if (type === 'POUVOIR') {
        doc.setFontSize(18); doc.setFont("helvetica", "bold"); doc.setTextColor(22, 101, 52);
        doc.text("POUVOIR", 105, y, {align:'center'});
        y += 20;
        doc.setFontSize(12); doc.setFont("helvetica", "normal"); doc.setTextColor(0);
        
        doc.text(`Je soussigné(e) : ${declarant}`, 20, y); y+=10;
        doc.text(`Agissant en qualité de : ${declarantLien}`, 20, y); y+=15;
        doc.text("Donne pouvoir aux PF SOLIDAIRE PERPIGNAN pour effectuer", 20, y); y+=7;
        doc.text("les démarches administratives relatives aux obsèques de :", 20, y); y+=15;
        
        doc.setFont("helvetica", "bold");
        doc.text(`M. / Mme : ${defunt}`, 20, y); y+=8;
        doc.setFont("helvetica", "normal");
        
        doc.text(`Décédé(e) le ${dateStr} à ${lieuDeces}`, 20, y); y+=20;
        doc.text("Pour valoir ce que de droit.", 20, y); y+=30;
        
        doc.text(`Fait à THUIR, le ${dateJour}`, 20, y); y+=20;
        doc.text("Le Mandant (Signature)", 130, y);
    }
    else if (type === 'DECES') {
        doc.setFontSize(18); doc.setFont("helvetica", "bold"); doc.setTextColor(22, 101, 52);
        doc.text("DÉCLARATION DE DÉCÈS", 105, y, {align:'center'});
        y += 20;
        doc.setFontSize(12); doc.setFont("helvetica", "normal"); doc.setTextColor(0);
        
        doc.text("À Monsieur l'Officier de l'État Civil,", 20, y); y+=15;
        doc.text(`Nous déclarons le décès de : ${defunt}`, 20, y); y+=10;
        doc.text(`Né(e) le : ${neLeStr}`, 20, y); y+=10;
        doc.text(`Domicilié(e) : ${domicile}`, 20, y); y+=15;
        doc.text(`Survenu le ${dateStr} à ${heureDeces}`, 20, y); y+=10;
        doc.text(`À la commune de : ${lieuDeces}`, 20, y); y+=25;
        
        doc.text("Le Déclarant (PF SOLIDAIRE) :", 120, y);
    }
    else if (type === 'FERMETURE') {
        doc.setFontSize(18); doc.setFont("helvetica", "bold"); doc.setTextColor(22, 101, 52);
        doc.text("DEMANDE DE FERMETURE", 105, y, {align:'center'}); y+=8;
        doc.text("DE CERCUEIL", 105, y, {align:'center'});
        y += 20;
        
        doc.setFontSize(11); doc.setFont("helvetica", "normal"); doc.setTextColor(0);
        doc.text("Je soussigné M. CHERKAOUI Mustapha, Dirigeant PF SOLIDAIRE,", 20, y); y+=10;
        doc.text("Sollicite l'autorisation de fermeture du cercueil de :", 20, y); y+=15;
        
        doc.setFont("helvetica", "bold");
        doc.text(`${defunt}`, 40, y); y+=15;
        doc.setFont("helvetica", "normal");
        
        doc.text(`Mise en bière à : ${lieuMiseBiere}`, 20, y); y+=10;
        doc.text(`Destination : ${destination}`, 20, y); y+=30;
        
        doc.text(`Fait à THUIR, le ${dateJour}`, 20, y); y+=20;
        doc.text("Cachet de l'entreprise :", 120, y);
    }
    else if (type === 'TRANSPORT') {
        doc.setFontSize(18); doc.setFont("helvetica", "bold"); doc.setTextColor(22, 101, 52);
        doc.text("DÉCLARATION DE TRANSPORT", 105, y, {align:'center'}); y+=8;
        doc.text("AVANT MISE EN BIÈRE", 105, y, {align:'center'});
        y += 20;
        
        doc.setFontSize(11); doc.setFont("helvetica", "normal"); doc.setTextColor(0);
        doc.text(`Défunt : ${defunt}`, 20, y); y+=10;
        doc.text(`Départ : ${lieuMiseBiere}`, 20, y); y+=10;
        doc.text(`Arrivée : ${destination}`, 20, y); y+=20;
        
        doc.setFont("helvetica", "bold");
        doc.text("MOYENS DE TRANSPORT :", 20, y); y+=10;
        doc.setFont("helvetica", "normal");
        
        doc.text(`- Véhicule : ${immat}`, 20, y); y+=10;
        doc.text(`- Chauffeur : ${chauffeur}`, 20, y); y+=30;
        
        doc.text("Le Conseiller Funéraire", 120, y);
    }

    doc.save(`${type}_${defunt}.pdf`);
};