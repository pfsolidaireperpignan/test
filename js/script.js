/* Fichier : js/script.js (DESIGN STABLE RESTAURÉ) */
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

// 2. GENERATEUR PDF (STRUCTURE ORIGINALE EXACTE)
window.genererPDF = function(type) {
    // Vérification de sécurité
    if (!window.jspdf) { alert("Erreur : Librairie PDF non chargée. Rafraîchissez la page."); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // --- RECUPERATION DES DONNEES ---
    const defunt = document.getElementById('defunt_nom').value || "...................................";
    const dateDeces = document.getElementById('date_deces').value;
    const heureDeces = document.getElementById('heure_deces').value || "..h..";
    const lieuDeces = document.getElementById('lieu_deces').value || "...................................";
    const dateNaissance = document.getElementById('date_naissance').value;
    const domicile = document.getElementById('domicile_defunt').value || "...................................";
    
    const declarant = document.getElementById('declarant_nom').value || "...................................";
    const lien = document.getElementById('declarant_lien') ? document.getElementById('declarant_lien').value : "";
    
    // Formatage des dates (JJ/MM/AAAA)
    const fmtDate = (d) => {
        if(!d) return "..................";
        const [y, m, dDay] = d.split('-');
        return `${dDay}/${m}/${y}`;
    };
    const dateStr = dateDeces ? fmtDate(dateDeces) : "..................";
    const neLeStr = dateNaissance ? fmtDate(dateNaissance) : "..................";
    const dateJour = new Date().toLocaleDateString('fr-FR');

    // --- EN-TÊTE STANDARD (HAUT GAUCHE) ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("PF SOLIDAIRE PERPIGNAN", 15, 15);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("32 boulevard Léon Jean Grégory", 15, 20);
    doc.text("66300 THUIR", 15, 25);
    doc.text("Tél: 07 55 18 27 77", 15, 30);
    
    // Ligne de séparation
    doc.setLineWidth(0.5);
    doc.line(15, 33, 195, 33);

    // --- CORPS DU DOCUMENT ---
    let y = 50;

    if (type === 'POUVOIR') {
        doc.setFontSize(18); 
        doc.setFont("helvetica", "bold");
        doc.text("POUVOIR", 105, y, {align:'center'});
        doc.setFontSize(14);
        y += 10;
        doc.text("POUR DÉMARCHES ADMINISTRATIVES", 105, y, {align:'center'});
        
        y += 25;
        doc.setFontSize(12); 
        doc.setFont("helvetica", "normal");
        
        doc.text(`Je soussigné(e) : ${declarant}`, 20, y); 
        y += 10;
        doc.text(`Agissant en qualité de : ${lien}`, 20, y); 
        y += 10;
        doc.text(`Demeurant à : .......................................................................................`, 20, y); 
        
        y += 20;
        doc.text("Donne pouvoir à la société PF SOLIDAIRE PERPIGNAN, pour effectuer", 20, y);
        y += 7;
        doc.text("toutes les démarches administratives nécessaires suite au décès de :", 20, y);
        
        y += 15;
        doc.setFont("helvetica", "bold");
        doc.text(`Monsieur / Madame : ${defunt}`, 20, y); 
        y += 8;
        doc.setFont("helvetica", "normal");
        doc.text(`Survenu le ${dateStr} à ${heureDeces}`, 20, y); 
        y += 8;
        doc.text(`À : ${lieuDeces}`, 20, y); 
        
        y += 20;
        doc.text("Pour valoir ce que de droit.", 20, y);
        
        y += 20;
        doc.text(`Fait à THUIR, le ${dateJour}`, 20, y);
        
        y += 20;
        doc.text("Le Mandant", 130, y);
        y += 7;
        doc.setFontSize(10);
        doc.text("(Mention 'Bon pour pouvoir' + Signature)", 120, y);
    }
    
    else if (type === 'DECES') {
        doc.setFontSize(18); 
        doc.setFont("helvetica", "bold");
        doc.text("DÉCLARATION DE DÉCÈS", 105, y, {align:'center'});
        
        y += 25;
        doc.setFontSize(12); 
        doc.setFont("helvetica", "normal");
        doc.text("À Monsieur l'Officier de l'État Civil,", 20, y);
        
        y += 20;
        doc.text("Nous déclarons le décès de :", 20, y);
        y += 10;
        doc.setFont("helvetica", "bold");
        doc.text(`${defunt}`, 40, y);
        doc.setFont("helvetica", "normal");
        
        y += 15;
        doc.text(`Né(e) le : ${neLeStr}`, 20, y);
        y += 10;
        doc.text(`Domicilié(e) : ${domicile}`, 20, y);
        
        y += 15;
        doc.text(`Décès survenu le ${dateStr} à ${heureDeces}`, 20, y);
        y += 10;
        doc.text(`À la commune de : ${lieuDeces}`, 20, y);
        
        y += 20;
        doc.text("Cette déclaration est faite préalablement à l'organisation des obsèques.", 20, y);
        
        y += 30;
        doc.text(`Fait à ${lieuDeces}, le ${dateJour}`, 20, y);
        
        y += 20;
        doc.text("Le Déclarant (PF SOLIDAIRE)", 120, y);
    }
    
    else if (type === 'FERMETURE') {
        doc.setFontSize(18); 
        doc.setFont("helvetica", "bold");
        doc.text("DEMANDE DE FERMETURE", 105, y, {align:'center'});
        y += 10;
        doc.text("DE CERCUEIL", 105, y, {align:'center'});
        
        y += 25;
        doc.setFontSize(12); 
        doc.setFont("helvetica", "normal");
        
        const villeMiseBiere = document.getElementById('lieu_mise_biere').value || "..................";
        doc.text(`À Monsieur le Maire de la commune de : ${villeMiseBiere}`, 20, y);
        
        y += 20;
        doc.text("Je soussigné, représentant les Pompes Funèbres SOLIDAIRE,", 20, y);
        y += 10;
        doc.text("Sollicite l'autorisation de procéder à la fermeture du cercueil de :", 20, y);
        
        y += 15;
        doc.setFont("helvetica", "bold");
        doc.text(`${defunt}`, 40, y);
        doc.setFont("helvetica", "normal");
        
        y += 15;
        doc.text(`Décédé(e) le : ${dateStr} à ${lieuDeces}`, 20, y);
        
        y += 15;
        doc.text(`La mise en bière aura lieu à : ${villeMiseBiere}`, 20, y);
        y += 10;
        const destination = document.getElementById('destination').value || "..................";
        doc.text(`Pour inhumation/crémation à : ${destination}`, 20, y);
        
        y += 30;
        doc.text(`Fait à THUIR, le ${dateJour}`, 20, y);
        y += 20;
        doc.text("L'entreprise de Pompes Funèbres", 110, y);
    }
    
    else if (type === 'TRANSPORT') {
        doc.setFontSize(18); 
        doc.setFont("helvetica", "bold");
        doc.text("DÉCLARATION DE TRANSPORT", 105, y, {align:'center'});
        y += 10;
        doc.text("DE CORPS APRÈS MISE EN BIÈRE", 105, y, {align:'center'});
        
        y += 25;
        doc.setFontSize(12); 
        doc.setFont("helvetica", "normal");
        
        doc.text("Le soussigné, représentant les PF SOLIDAIRE,", 20, y);
        y += 10;
        doc.text("Déclare effectuer le transport du corps de :", 20, y);
        
        y += 15;
        doc.setFont("helvetica", "bold");
        doc.text(`${defunt}`, 40, y);
        doc.setFont("helvetica", "normal");
        
        y += 15;
        const depart = document.getElementById('lieu_mise_biere').value || "..................";
        doc.text(`Lieu de départ (Mise en bière) : ${depart}`, 20, y);
        
        y += 10;
        const arrivee = document.getElementById('destination').value || "..................";
        doc.text(`Lieu d'arrivée (Cimetière/Crématorium) : ${arrivee}`, 20, y);
        
        y += 20;
        doc.setFont("helvetica", "bold");
        doc.text("MOYENS DE TRANSPORT :", 20, y);
        doc.setFont("helvetica", "normal");
        
        y += 10;
        const immat = document.getElementById('vehicule_immat').value || "..................";
        doc.text(`- Véhicule agréé immatriculé : ${immat}`, 20, y);
        
        y += 10;
        const chauffeur = document.getElementById('chauffeur_nom').value || "..................";
        doc.text(`- Chauffeur : ${chauffeur}`, 20, y);
        
        y += 30;
        doc.text(`Fait à THUIR, le ${dateJour}`, 20, y);
        y += 20;
        doc.text("Le Conseiller Funéraire", 120, y);
    }

    // Sauvegarde du fichier
    const nomFichier = defunt.replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`${type}_${nomFichier}.pdf`);
};
