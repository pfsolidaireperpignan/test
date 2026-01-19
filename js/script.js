/* Fichier : js/script.js (INTEGRATION TOTALE) */
import { auth, db, collection, addDoc, getDocs, query, orderBy, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "./config.js";

// --- INITIALISATION ---
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
            chargerClientsFacturation(); // IMPORT DEPUIS FACTURATION
        } else {
            if(loginScreen) loginScreen.classList.remove('hidden');
            if(mainContent) mainContent.classList.add('hidden');
            if(sidebar) sidebar.classList.add('hidden');
        }
    });

    if(document.getElementById('btn-login')) document.getElementById('btn-login').addEventListener('click', async () => {
        try { await signInWithEmailAndPassword(auth, document.getElementById('login-email').value, document.getElementById('login-password').value); }
        catch(e) { alert("Erreur connexion"); }
    });
    
    // BOUTON IMPORT
    document.getElementById('btn-import').addEventListener('click', importerClient);
});

// --- LIAISON AVEC LA FACTURATION V2 (LE "LINK") ---
let clientsCache = [];

async function chargerClientsFacturation() {
    const select = document.getElementById('select-import-client');
    select.innerHTML = '<option>Chargement...</option>';
    
    try {
        // On va chercher dans la collection des FACTURES car c'est là que sont les clients
        const q = query(collection(db, "factures_v2"), orderBy("date_creation", "desc"));
        const snap = await getDocs(q);
        
        select.innerHTML = '<option value="">-- Sélectionner un dossier Facturation --</option>';
        clientsCache = [];

        snap.forEach(doc => {
            const data = doc.data();
            if(data.client && data.client.nom) {
                // On crée une entrée simple pour la liste
                const label = `${data.client.nom} (Défunt: ${data.defunt ? data.defunt.nom : '?'})`;
                const opt = document.createElement('option');
                opt.value = doc.id;
                opt.textContent = label;
                select.appendChild(opt);
                clientsCache.push({ id: doc.id, data: data });
            }
        });
    } catch (e) { console.error("Erreur chargement clients facturation", e); }
}

function importerClient() {
    const id = document.getElementById('select-import-client').value;
    if(!id) return;
    
    const dossier = clientsCache.find(c => c.id === id);
    if(dossier) {
        const d = dossier.data;
        // Remplissage automatique
        if(d.client) {
            document.getElementById('declarant_nom').value = d.client.nom || '';
            document.getElementById('declarant_adresse').value = d.client.adresse || '';
        }
        if(d.defunt) {
            document.getElementById('defunt_nom').value = d.defunt.nom || '';
            // On essaie de séparer Nom Prénom si possible, sinon tout dans Nom
            document.getElementById('defunt_prenom').value = ''; 
        }
        alert("✅ Données importées depuis la Facture N° " + d.numero);
    }
}

// --- GENERATEUR PDF COMPLEXE (ISSU DE VOTRE ANCIEN FICHIER) ---
window.genererPDF = function(type) {
    if (!window.jspdf) { alert("Erreur PDF"); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // DONNEES FORMULAIRE
    const getVal = (id) => document.getElementById(id) ? document.getElementById(id).value : "";
    
    const defunt = `${getVal('defunt_nom')} ${getVal('defunt_prenom')}`;
    const dateDeces = getVal('date_deces');
    const lieuDeces = getVal('lieu_deces');
    const neLe = getVal('date_naissance');
    const lieuNaiss = getVal('lieu_naissance');
    const declarant = getVal('declarant_nom');
    const adresseDeclarant = getVal('declarant_adresse');
    const lien = getVal('declarant_lien');
    
    // Dates formatées
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : "................";
    const dateStr = fmtDate(dateDeces);
    const today = new Date().toLocaleDateString('fr-FR');

    // EN-TÊTE PRO (LOGO + SIRET)
    const imgLogo = document.getElementById('logo-model');
    if (imgLogo && imgLogo.src) { try { doc.addImage(imgLogo, 'PNG', 15, 10, 40, 40); } catch(e){} }

    doc.setTextColor(22, 101, 52); 
    doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text("POMPES FUNEBRES SOLIDAIRE", 60, 20);
    doc.setTextColor(50, 50, 50); 
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text("32 boulevard Léon Jean Grégory, 66300 THUIR", 60, 26);
    doc.text("Tél: 07 55 18 27 77 | Habilitation 23-66-0205", 60, 31);
    doc.setDrawColor(22, 101, 52); doc.line(15, 50, 195, 50);

    let y = 65;
    doc.setTextColor(0);

    // --- LOGIQUE SPECIFIQUE SELON LE TYPE ---

    if (type === 'PV_FERMETURE') {
        // VOTRE ANCIEN CODE "PV POLICE" RESTAURÉ
        doc.setFillColor(52, 73, 94); doc.rect(0, 35, 210, 15, 'F');
        doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(255, 255, 255);
        doc.text("PROCÈS-VERBAL DE FERMETURE DE CERCUEIL", 105, 45, { align: "center" });
        
        doc.setTextColor(0); doc.setFontSize(10); y = 70;
        doc.text("Nous, soussignés, certifions avoir procédé à la fermeture et au scellement du cercueil.", 20, y); y+=10;
        
        doc.setFillColor(240, 240, 240); doc.rect(20, y, 170, 30, 'F');
        doc.setFont("helvetica", "bold"); doc.text("IDENTITÉ DU DÉFUNT(E)", 25, y+6);
        doc.setFont("helvetica", "normal");
        doc.text(`Nom : ${defunt}`, 25, y+15);
        doc.text(`Né(e) le : ${fmtDate(neLe)} à ${lieuNaiss}`, 25, y+22);
        doc.text(`Décédé(e) le : ${dateStr} à ${lieuDeces}`, 100, y+22); y+=40;

        doc.setFont("helvetica", "bold"); doc.text("EN PRÉSENCE DE :", 20, y); y+=10;
        doc.rect(20, y, 170, 30);
        doc.text("LA FAMILLE / AUTORITÉ DE POLICE", 25, y+6);
        doc.setFont("helvetica", "normal");
        doc.text("Nom & Qualité : .................................................................", 25, y+15);
        
        y+=40;
        doc.text(`Fait à ${getVal('lieu_mise_biere')}, le ${today}`, 20, y); y+=20;
        doc.text("Signature Opérateur Funéraire", 30, y);
        doc.text("Signature Police / Famille", 130, y);
    }
    
    else if (type === 'RAPATRIEMENT') {
        // VOTRE ANCIEN CODE "PREFECTURE" RESTAURÉ
        doc.setFontSize(16); doc.setFont("helvetica", "bold");
        doc.text("DEMANDE D'AUTORISATION DE TRANSPORT DE CORPS", 105, y, {align:'center'});
        doc.text("HORS DU TERRITOIRE METROPOLITAIN", 105, y+8, {align:'center'}); y+=25;
        
        doc.setFontSize(11); doc.setFont("helvetica", "normal");
        doc.text("Je soussigné M. CHERKAOUI Mustapha, Dirigeant PF Solidaire,", 20, y); y+=8;
        doc.text("Sollicite l'autorisation de transporter le corps de :", 20, y); y+=15;
        
        doc.setFont("helvetica", "bold"); doc.text(defunt, 50, y); doc.setFont("helvetica", "normal"); y+=10;
        doc.text(`Vers le pays : ${getVal('rap_pays')}`, 20, y); y+=10;
        doc.text(`Ville de destination : ${getVal('rap_ville_dest')}`, 20, y); y+=15;
        
        doc.setFont("helvetica", "bold"); doc.text("MOYENS DE TRANSPORT", 20, y); y+=10; doc.setFont("helvetica", "normal");
        doc.text(`- Vol N° : ${getVal('rap_vol_num')}`, 20, y); y+=7;
        doc.text(`- LTA : ${getVal('rap_lta')}`, 20, y); y+=7;
        doc.text(`- Aéroport Départ : ${getVal('rap_aero_dep')}`, 20, y); y+=7;
        doc.text(`- Aéroport Arrivée : ${getVal('rap_aero_arr')}`, 20, y); y+=20;
        
        doc.text("Fait à THUIR, le " + today, 20, y); y+=20;
        doc.text("Signature et Cachet", 130, y);
    }
    
    else if (type === 'CREMATION') {
         doc.setFontSize(16); doc.setFont("helvetica", "bold");
         doc.text("DEMANDE D'AUTORISATION DE CRÉMATION", 105, y, {align:'center'}); y+=20;
         doc.setFontSize(11); doc.setFont("helvetica", "normal");
         
         doc.text(`Je soussigné(e) ${declarant}, lien : ${lien}`, 20, y); y+=10;
         doc.text(`Demeurant : ${adresseDeclarant}`, 20, y); y+=15;
         doc.text("Sollicite l'autorisation de procéder à la crémation de :", 20, y); y+=10;
         doc.setFont("helvetica", "bold"); doc.text(defunt, 40, y); doc.setFont("helvetica", "normal"); y+=10;
         doc.text(`Au crématorium de : ${getVal('destination')}`, 20, y); y+=20;
         doc.text("Je certifie que le défunt n'était pas porteur d'un stimulateur cardiaque.", 20, y); y+=20;
         doc.text("Signature du demandeur :", 120, y);
    }

    else if (type === 'POUVOIR') {
        doc.setFontSize(18); doc.setFont("helvetica", "bold");
        doc.text("POUVOIR", 105, y, {align:'center'}); y += 20;
        doc.setFontSize(12); doc.setFont("helvetica", "normal");
        doc.text(`Je soussigné(e) : ${declarant}`, 20, y); y+=10;
        doc.text(`Agissant en qualité de : ${lien}`, 20, y); y+=10;
        doc.text(`Demeurant : ${adresseDeclarant}`, 20, y); y+=15;
        doc.text("Donne pouvoir aux PF SOLIDAIRE PERPIGNAN pour les démarches.", 20, y); y+=15;
        doc.setFont("helvetica", "bold"); doc.text(`Défunt : ${defunt}`, 20, y); y+=10; doc.setFont("helvetica", "normal");
        doc.text(`Décédé(e) le ${dateStr} à ${lieuDeces}`, 20, y); y+=20;
        doc.text("Signature :", 130, y);
    }
    
    else {
        // DEFAUT (Transport, Fermeture classique...)
        doc.setFontSize(16); doc.setFont("helvetica", "bold");
        doc.text("DOCUMENT ADMINISTRATIF", 105, y, {align:'center'}); y+=20;
        doc.setFontSize(12); doc.setFont("helvetica", "normal");
        doc.text(`Concerne : ${defunt}`, 20, y); y+=10;
        doc.text(`Date décès : ${dateStr}`, 20, y); y+=10;
        doc.text(`Transport : ${getVal('vehicule_immat')}`, 20, y); y+=10;
        doc.text(`Chauffeur : ${getVal('chauffeur_nom')}`, 20, y);
    }

    doc.save(`${type}_${defunt}.pdf`);
};