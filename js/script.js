/* Fichier : js/script.js (VERSION GESTION + SAUVEGARDE) */
import { auth, db, collection, addDoc, getDocs, query, orderBy, onAuthStateChanged, signInWithEmailAndPassword, signOut, limit } from "./config.js";
// Note: On importe aussi 'updateDoc' et 'doc' si on veut modifier, mais commençons simple (ajout).

// 1. GESTION CONNEXION & CHARGEMENT
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
            chargerDossiers(); // ON CHARGE LA LISTE AU DEMARRAGE
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

    // BOUTON SAUVEGARDER
    const btnSave = document.getElementById('btn-save-admin');
    if(btnSave) btnSave.addEventListener('click', sauvegarderDossier);
});

// --- FONCTIONS BASE DE DONNEES ---

async function sauvegarderDossier() {
    const btn = document.getElementById('btn-save-admin');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ...';
    btn.disabled = true;

    try {
        const dossier = {
            defunt_nom: document.getElementById('defunt_nom').value,
            date_deces: document.getElementById('date_deces').value,
            heure_deces: document.getElementById('heure_deces').value,
            lieu_deces: document.getElementById('lieu_deces').value,
            date_naissance: document.getElementById('date_naissance').value,
            domicile_defunt: document.getElementById('domicile_defunt').value,
            
            declarant_nom: document.getElementById('declarant_nom').value,
            declarant_lien: document.getElementById('declarant_lien').value,
            
            lieu_mise_biere: document.getElementById('lieu_mise_biere').value,
            destination: document.getElementById('destination').value,
            vehicule_immat: document.getElementById('vehicule_immat').value,
            chauffeur_nom: document.getElementById('chauffeur_nom').value,
            
            date_creation: new Date().toISOString()
        };

        if(!dossier.defunt_nom) throw new Error("Le nom du défunt est obligatoire.");

        // On enregistre dans une nouvelle collection "dossiers_admin"
        await addDoc(collection(db, "dossiers_admin"), dossier);
        
        btn.innerHTML = '✅ Enregistré !';
        btn.style.background = '#22c55e';
        setTimeout(() => { 
            btn.innerHTML = originalText; 
            btn.style.background = ''; 
            btn.disabled = false;
        }, 2000);

        chargerDossiers(); // On rafraîchit la liste

    } catch (e) {
        console.error(e);
        alert("Erreur : " + e.message);
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function chargerDossiers() {
    const tbody = document.getElementById('list-dossiers-body');
    if(!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="2">Chargement...</td></tr>';
    
    try {
        const q = query(collection(db, "dossiers_admin"), orderBy("date_creation", "desc"), limit(20));
        const snap = await getDocs(q);
        
        tbody.innerHTML = '';
        if(snap.empty) {
            tbody.innerHTML = '<tr><td colspan="2" style="color:#94a3b8; font-style:italic;">Aucun dossier.</td></tr>';
            return;
        }

        snap.forEach(docSnap => {
            const data = docSnap.data();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div style="font-weight:bold;">${data.defunt_nom}</div>
                    <div style="font-size:0.8em; color:#64748b;">${new Date(data.date_creation).toLocaleDateString()}</div>
                </td>
                <td style="text-align:right;">
                    <button class="btn-icon" style="color:#3b82f6;" title="Charger"><i class="fas fa-folder-open"></i></button>
                </td>
            `;
            // Clic sur le bouton Charger
            tr.querySelector('button').addEventListener('click', () => {
                remplirFormulaire(data);
            });
            tbody.appendChild(tr);
        });

    } catch (e) { console.error(e); }
}

function remplirFormulaire(data) {
    if(confirm("Charger le dossier de " + data.defunt_nom + " ?")) {
        document.getElementById('defunt_nom').value = data.defunt_nom || '';
        document.getElementById('date_deces').value = data.date_deces || '';
        document.getElementById('heure_deces').value = data.heure_deces || '';
        document.getElementById('lieu_deces').value = data.lieu_deces || '';
        document.getElementById('date_naissance').value = data.date_naissance || '';
        document.getElementById('domicile_defunt').value = data.domicile_defunt || '';
        
        document.getElementById('declarant_nom').value = data.declarant_nom || '';
        document.getElementById('declarant_lien').value = data.declarant_lien || '';
        
        document.getElementById('lieu_mise_biere').value = data.lieu_mise_biere || '';
        document.getElementById('destination').value = data.destination || '';
        document.getElementById('vehicule_immat').value = data.vehicule_immat || 'DA-081-ZQ';
        document.getElementById('chauffeur_nom').value = data.chauffeur_nom || '';
    }
}

window.viderFormulaire = function() {
    if(confirm("Tout effacer pour un nouveau dossier ?")) {
        document.querySelectorAll('input').forEach(i => i.value = '');
        document.getElementById('vehicule_immat').value = 'DA-081-ZQ';
    }
}

// 2. GENERATEUR PDF (DESIGN ORIGINAL GARANTI)
window.genererPDF = function(type) {
    if (!window.jspdf) { alert("Erreur : Librairie PDF non chargée."); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // DONNEES
    const defunt = document.getElementById('defunt_nom').value || "...................................";
    const dateDeces = document.getElementById('date_deces').value;
    const heureDeces = document.getElementById('heure_deces').value || "......";
    const lieuDeces = document.getElementById('lieu_deces').value || "...................................";
    const dateNaissance = document.getElementById('date_naissance').value;
    const domicile = document.getElementById('domicile_defunt').value || "...................................";
    
    const declarant = document.getElementById('declarant_nom').value || "...................................";
    const declarantLien = document.getElementById('declarant_lien') ? document.getElementById('declarant_lien').value : "";
    
    const lieuMiseBiere = document.getElementById('lieu_mise_biere').value || "...................................";
    const destination = document.getElementById('destination').value || "...................................";
    const immat = document.getElementById('vehicule_immat').value || "DA-081-ZQ";
    const chauffeur = document.getElementById('chauffeur_nom').value || "...................................";

    // FORMATAGE
    const fmtDate = (d) => {
        if(!d) return "..................";
        const [y, m, dDay] = d.split('-');
        return `${dDay}/${m}/${y}`;
    };
    const dateStr = dateDeces ? fmtDate(dateDeces) : "..................";
    const neLeStr = dateNaissance ? fmtDate(dateNaissance) : "..................";
    const dateJour = new Date().toLocaleDateString('fr-FR');

    // EN-TÊTE
    const imgLogo = document.getElementById('logo-model');
    if (imgLogo && imgLogo.src) { try { doc.addImage(imgLogo, 'PNG', 15, 10, 40, 40); } catch(e){} }

    doc.setTextColor(22, 101, 52); 
    doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text("POMPES FUNEBRES SOLIDAIRE", 60, 20);
    
    doc.setTextColor(50, 50, 50); 
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text("32 boulevard Léon Jean Grégory, 66300 THUIR", 60, 26);
    doc.text("Tél: 07 55 18 27 77", 60, 31);
    doc.text("HABILITATION N°: 23-66-0205 | SIRET: 53927029800042", 60, 36);
    
    doc.setDrawColor(22, 101, 52); doc.setLineWidth(0.5); doc.line(15, 55, 195, 55);

    doc.setTextColor(0, 0, 0);
    let y = 70;

    if (type === 'POUVOIR') {
        doc.setFontSize(18); doc.setFont("helvetica", "bold"); doc.setTextColor(22, 101, 52);
        doc.text("POUVOIR", 105, y, {align:'center'}); y += 20;
        doc.setFontSize(12); doc.setFont("helvetica", "normal"); doc.setTextColor(0);
        doc.text(`Je soussigné(e) : ${declarant}`, 20, y); y+=10;
        doc.text(`Agissant en qualité de : ${declarantLien}`, 20, y); y+=15;
        doc.text("Donne pouvoir aux PF SOLIDAIRE PERPIGNAN pour effectuer", 20, y); y+=7;
        doc.text("les démarches administratives relatives aux obsèques de :", 20, y); y+=15;
        doc.setFont("helvetica", "bold"); doc.text(`M. / Mme : ${defunt}`, 20, y); y+=8; doc.setFont("helvetica", "normal");
        doc.text(`Décédé(e) le ${dateStr} à ${lieuDeces}`, 20, y); y+=20;
        doc.text("Pour valoir ce que de droit.", 20, y); y+=30;
        doc.text(`Fait à THUIR, le ${dateJour}`, 20, y); y+=20;
        doc.text("Le Mandant (Signature)", 130, y);
    }
    else if (type === 'DECES') {
        doc.setFontSize(18); doc.setFont("helvetica", "bold"); doc.setTextColor(22, 101, 52);
        doc.text("DÉCLARATION DE DÉCÈS", 105, y, {align:'center'}); y += 20;
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
        doc.text("DE CERCUEIL", 105, y, {align:'center'}); y += 20;
        doc.setFontSize(11); doc.setFont("helvetica", "normal"); doc.setTextColor(0);
        doc.text("Je soussigné M. CHERKAOUI Mustapha, Dirigeant PF SOLIDAIRE,", 20, y); y+=10;
        doc.text("Sollicite l'autorisation de fermeture du cercueil de :", 20, y); y+=15;
        doc.setFont("helvetica", "bold"); doc.text(`${defunt}`, 40, y); y+=15; doc.setFont("helvetica", "normal");
        doc.text(`Mise en bière à : ${lieuMiseBiere}`, 20, y); y+=10;
        doc.text(`Destination : ${destination}`, 20, y); y+=30;
        doc.text(`Fait à THUIR, le ${dateJour}`, 20, y); y+=20;
        doc.text("Cachet de l'entreprise :", 120, y);
    }
    else if (type === 'TRANSPORT') {
        doc.setFontSize(18); doc.setFont("helvetica", "bold"); doc.setTextColor(22, 101, 52);
        doc.text("DÉCLARATION DE TRANSPORT", 105, y, {align:'center'}); y+=8;
        doc.text("AVANT MISE EN BIÈRE", 105, y, {align:'center'}); y += 20;
        doc.setFontSize(11); doc.setFont("helvetica", "normal"); doc.setTextColor(0);
        doc.text(`Défunt : ${defunt}`, 20, y); y+=10;
        doc.text(`Départ : ${lieuMiseBiere}`, 20, y); y+=10;
        doc.text(`Arrivée : ${destination}`, 20, y); y+=20;
        doc.setFont("helvetica", "bold"); doc.text("MOYENS DE TRANSPORT :", 20, y); y+=10; doc.setFont("helvetica", "normal");
        doc.text(`- Véhicule : ${immat}`, 20, y); y+=10;
        doc.text(`- Chauffeur : ${chauffeur}`, 20, y); y+=30;
        doc.text("Le Conseiller Funéraire", 120, y);
    }

    doc.save(`${type}_${defunt}.pdf`);
};