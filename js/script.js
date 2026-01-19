/* Fichier : js/script.js (DESIGN ORIGINAL RESTAURÉ) */
import { auth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "./config.js";

// 1. GESTION CONNEXION (Ne pas toucher, c'est ce qui fait marcher le site)
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

// 2. GENERATEUR PDF (ARCHITECTURE EXACTE DE VOS FICHIERS)
window.genererPDF = function(type) {
    if (!window.jspdf) { alert("Erreur : Librairie PDF non chargée. Rafraîchissez la page."); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // --- DONNEES FORMULAIRE ---
    const defunt = document.getElementById('defunt_nom').value || "...................................";
    const dateDeces = document.getElementById('date_deces').value;
    const heureDeces = document.getElementById('heure_deces').value || "......";
    const lieuDeces = document.getElementById('lieu_deces').value || "...................................";
    const dateNaissance = document.getElementById('date_naissance').value;
    const domicile = document.getElementById('domicile_defunt').value || "...................................";
    
    const declarant = document.getElementById('declarant_nom').value || "...................................";
    const declarantLien = document.getElementById('declarant_lien') ? document.getElementById('declarant_lien').value : "";
    
    // Données Transport / Technique
    const lieuMiseBiere = document.getElementById('lieu_mise_biere').value || "...................................";
    const destination = document.getElementById('destination').value || "...................................";
    const immat = document.getElementById('vehicule_immat').value || "DA-081-ZQ"; // Valeur par défaut de votre PDF
    const chauffeur = document.getElementById('chauffeur_nom').value || "...................................";

    // --- FORMATAGE DATES ---
    const fmtDate = (d) => {
        if(!d) return "..................";
        const [y, m, dDay] = d.split('-');
        return `${dDay}/${m}/${y}`;
    };
    const dateStr = dateDeces ? fmtDate(dateDeces) : "..................";
    const neLeStr = dateNaissance ? fmtDate(dateNaissance) : "..................";
    const dateJour = new Date().toLocaleDateString('fr-FR');

    // ==========================================
    // EN-TÊTE COMMUN (IDENTIQUE A VOS FICHIERS)
    // ==========================================
    // Voir fichier Transport_.pdf ou Demande_Fermeture_.pdf
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("POMPES FUNEBRES SOLIDAIRE PERPIGNAN", 15, 15);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("32 boulevard Léon Jean Grégory Thuir - TEL: 07.55.18.27.77", 15, 20);
    doc.text("HABILITATION N°: 23-66-0205 | SIRET: 53927029800042", 15, 25);
    
    // ==========================================
    // CONTENU SELON LE TYPE
    // ==========================================
    let y = 45;

    if (type === 'POUVOIR') {
        // Basé sur le fichier Pouvoir_.pdf
        doc.setFontSize(18); doc.setFont("helvetica", "bold");
        doc.text("POUVOIR", 105, y, {align:'center'});
        
        y += 20;
        doc.setFontSize(11); doc.setFont("helvetica", "normal");
        
        doc.text(`Je soussigné(e): ${declarant}`, 20, y); y += 10;
        doc.text(`Demeurant à : ${domicile}`, 20, y); y += 10;
        doc.text(`Agissant en qualité de: ${declarantLien}`, 20, y); y += 15;
        
        doc.text("Ayant qualité pour pourvoir aux funérailles de:", 20, y); y += 10;
        doc.setFont("helvetica", "bold");
        doc.text(`${defunt}`, 40, y); 
        doc.setFont("helvetica", "normal");
        y += 10;
        
        doc.text(`Né(e) le ${neLeStr} à ...........................`, 20, y); y += 10;
        doc.text(`Décédé(e) le ${dateStr} à ${lieuDeces}`, 20, y); y += 10;
        doc.text(`Domicile: ${domicile}`, 20, y); y += 20;
        
        doc.setFont("helvetica", "bold");
        doc.text("POUR: INHUMATION", 20, y); // Ou Crémation selon besoin
        doc.setFont("helvetica", "normal");
        y += 15;
        
        doc.text("Donne mandat aux PF SOLIDAIRE PERPIGNAN pour :", 20, y); y += 10;
        doc.text("- Effectuer toutes les démarches administratives.", 25, y); y += 7;
        doc.text("  Signer toute demande d'autorisation nécessaire.", 25, y); y += 20;
        
        doc.text(`Fait à THUIR, le ${dateJour}`, 20, y); y += 20;
        doc.text("Signature du Mandant", 120, y);
    }
    
    else if (type === 'DECES') {
        // Basé sur DECES_....pdf (Lettre)
        doc.setFontSize(16); doc.setFont("helvetica", "bold");
        doc.text("DÉCLARATION DE DÉCÈS", 105, y, {align:'center'});
        y += 20;
        
        doc.setFontSize(12); doc.setFont("helvetica", "normal");
        doc.text("À Monsieur l'Officier de l'État Civil,", 20, y); y += 15;
        
        doc.text("Nous déclarons le décès de :", 20, y); y += 10;
        doc.setFont("helvetica", "bold");
        doc.text(`${defunt}`, 50, y);
        doc.setFont("helvetica", "normal");
        y += 10;
        
        doc.text(`Né(e) le : ${neLeStr}`, 20, y); y += 10;
        doc.text(`Domicilié(e): ${domicile}`, 20, y); y += 15;
        
        doc.text(`Décès survenu le ${dateStr} à ${heureDeces}`, 20, y); y += 10;
        doc.text(`À la commune de ${lieuDeces}`, 20, y); y += 25;
        
        doc.text("Le Déclarant (PF SOLIDAIRE) :", 120, y);
    }
    
    else if (type === 'FERMETURE') {
        // Basé EXACTEMENT sur Demande_Fermeture_.pdf
        doc.setFontSize(16); doc.setFont("helvetica", "bold");
        doc.text("DEMANDE D'AUTORISATION DE FERMETURE", 105, y, {align:'center'});
        y += 8;
        doc.text("DE CERCUEIL", 105, y, {align:'center'});
        y += 20;
        
        doc.setFontSize(11); doc.setFont("helvetica", "normal");
        doc.text("Je soussigné :", 20, y); y += 10;
        
        // VOS INFOS FIXES COMME SUR LE PDF
        doc.text("• Nom et Prénom: M. CHERKAOUI Mustapha", 20, y); y += 7;
        doc.text("• Qualité: Dirigeant PF Solidaire Perpignan", 20, y); y += 7;
        doc.text("• Adresse: 32 Bd Léon Jean Grégory, Thuir", 20, y); y += 15;
        
        doc.text("A l'honneur de solliciter votre autorisation de fermeture du cercueil de :", 20, y); y += 10;
        
        doc.setFont("helvetica", "bold");
        doc.text(`• Nom et Prénom : ${defunt}`, 20, y); y += 10;
        doc.setFont("helvetica", "normal");
        
        doc.text(`• Né(e) le : ${neLeStr} à ...........................`, 20, y); y += 10;
        doc.text(`• Décédé(e) le : ${dateStr} à ${heureDeces}`, 20, y); y += 15;
        
        doc.text("Et ce,", 20, y); y += 10;
        doc.text(`Le: ${dateJour}`, 20, y); y += 10;
        doc.text(`• A (Lieu): ${lieuMiseBiere}`, 20, y); y += 20;
        
        doc.text(`Fait à THUIR, le ${dateJour}`, 20, y); y += 20;
        doc.text("Cachet de l'entreprise :", 120, y);
    }
    
    else if (type === 'TRANSPORT') {
        // Basé EXACTEMENT sur Transport_.pdf
        doc.setFontSize(16); doc.setFont("helvetica", "bold");
        doc.text("DÉCLARATION DE TRANSPORT DE CORPS", 105, y, {align:'center'});
        y += 8;
        doc.text("AVANT MISE EN BIÈRE", 105, y, {align:'center'}); // Comme sur votre PDF
        y += 20;
        
        doc.setFontSize(11); doc.setFont("helvetica", "normal");
        
        doc.setFont("helvetica", "bold");
        doc.text("TRANSPORTEUR :", 20, y); y += 7;
        doc.setFont("helvetica", "normal");
        doc.text("PF SOLIDAIRE PERPIGNAN - 32 Bd Léon J. Grégory, Thuir", 20, y); y += 15;
        
        doc.setFont("helvetica", "bold");
        doc.text("DÉFUNT(E)", 20, y); y += 7;
        doc.text(`${defunt}`, 20, y); y += 15;
        
        doc.text("LIEU DE DÉPART", 20, y); y += 7;
        doc.setFont("helvetica", "normal");
        doc.text(`${lieuMiseBiere}`, 20, y); y += 7;
        doc.text("Date & Heure: ....................... à ..........", 20, y); y += 15;
        
        doc.text(`Né(e) le ${neLeStr}`, 20, y); y += 15;
        
        doc.setFont("helvetica", "bold");
        doc.text("LIEU D'ARRIVÉE", 20, y); y += 7;
        doc.setFont("helvetica", "normal");
        doc.text(`${destination}`, 20, y); y += 7;
        doc.text("Date & Heure: ....................... à ..........", 20, y); y += 20;
        
        // VOTRE VEHICULE FIXE
        doc.setFont("helvetica", "bold");
        doc.text(`VÉHICULE AGRÉÉ IMMATRICULÉ: ${immat}`, 20, y); y += 20;
        
        doc.setFont("helvetica", "normal");
        doc.text(`Fait à THUIR, le ${dateJour}`, 20, y); y += 20;
        doc.text("Cachet de l'entreprise :", 20, y);
    }

    doc.save(`${type}_${defunt}.pdf`);
};