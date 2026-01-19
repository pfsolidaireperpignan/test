/* Fichier : js/script.js (DESIGN PREMIUM + DATA LINK) */
import { auth, db, collection, addDoc, getDocs, query, orderBy, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "./config.js";

// --- 1. INITIALISATION & CONNEXION ---
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
            chargerClientsFacturation(); 
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
    
    document.getElementById('btn-import').addEventListener('click', importerClient);
});

// --- 2. LIAISON FACTURATION (IMPORT CLIENT) ---
let clientsCache = [];

async function chargerClientsFacturation() {
    const select = document.getElementById('select-import-client');
    select.innerHTML = '<option>Chargement...</option>';
    try {
        const q = query(collection(db, "factures_v2"), orderBy("date_creation", "desc"));
        const snap = await getDocs(q);
        select.innerHTML = '<option value="">-- Sélectionner un dossier Facturation --</option>';
        clientsCache = [];
        snap.forEach(doc => {
            const data = doc.data();
            if(data.client && data.client.nom) {
                const label = `${data.client.nom} (Défunt: ${data.defunt ? data.defunt.nom : '?'})`;
                const opt = document.createElement('option');
                opt.value = doc.id; opt.textContent = label;
                select.appendChild(opt);
                clientsCache.push({ id: doc.id, data: data });
            }
        });
    } catch (e) { console.error(e); }
}

function importerClient() {
    const id = document.getElementById('select-import-client').value;
    if(!id) return;
    const dossier = clientsCache.find(c => c.id === id);
    if(dossier) {
        const d = dossier.data;
        if(d.client) {
            document.getElementById('declarant_nom').value = d.client.nom || '';
            document.getElementById('declarant_adresse').value = d.client.adresse || '';
        }
        if(d.defunt) {
            document.getElementById('defunt_nom').value = d.defunt.nom || ''; 
        }
        alert("✅ Données importées !");
    }
}

// --- 3. MOTEUR PDF "DESIGN PROFESSIONNEL" (RESTAURÉ) ---
window.genererPDF = function(type) {
    if (!window.jspdf) { alert("Erreur PDF"); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // -- RECUPERATION DONNEES (MAPPING INTELLIGENT) --
    // Cette fonction fait le lien entre vos IDs HTML et les variables de votre ancien script
    const getVal = (id) => {
        const el = document.getElementById(id);
        return el ? el.value : "";
    };

    // Variables dérivées
    const defuntNom = getVal('defunt_nom').toUpperCase();
    const defuntPrenom = getVal('defunt_prenom');
    const defuntComplet = `${defuntNom} ${defuntPrenom}`;
    
    // Formatage Dates
    const fmtDate = (d) => {
        if(!d) return "..................";
        const [y, m, dDay] = d.split('-');
        return `${dDay}/${m}/${y}`;
    };
    const dateStr = fmtDate(getVal('date_deces'));
    const neLeStr = fmtDate(getVal('date_naissance'));
    const today = new Date().toLocaleDateString('fr-FR');

    // -- FONCTION HEADER (EN-TÊTE PRO) --
    const headerPF = (pdf) => {
        const imgLogo = document.getElementById('logo-model');
        if (imgLogo && imgLogo.src) { try { pdf.addImage(imgLogo, 'PNG', 15, 10, 35, 35); } catch(e){} }
        
        pdf.setTextColor(22, 101, 52); // VERT
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(12);
        pdf.text("POMPES FUNEBRES SOLIDAIRE PERPIGNAN", 60, 20);
        
        pdf.setTextColor(50); // GRIS
        pdf.setFont("helvetica", "normal"); pdf.setFontSize(9);
        pdf.text("32 boulevard Léon Jean Grégory Thuir - TEL: 07.55.18.27.77", 60, 25);
        pdf.text("HABILITATION N°: 23-66-0205 | SIRET: 53927029800042", 60, 30);
    };

    // ============================================================
    // LOGIQUE DE DESSIN SELON LE TYPE (VOTRE DESIGN EXACT)
    // ============================================================

    if (type === 'POUVOIR') {
        // [Design: Titre ROUGE, Cadre Gris, Layout spécifique]
        headerPF(doc);
        
        doc.setFillColor(241, 245, 249); doc.rect(20, 45, 170, 12, 'F');
        doc.setFontSize(16); doc.setTextColor(185, 28, 28); doc.setFont("helvetica", "bold"); // ROUGE
        doc.text("POUVOIR", 105, 53, { align: "center" });

        doc.setTextColor(0); doc.setFontSize(10); doc.setFont("helvetica", "normal");
        let y = 75; const x = 25;
        
        doc.text(`Je soussigné(e) : ${getVal('declarant_nom')}`, x, y); y+=8;
        doc.text(`Demeurant à : ${getVal('declarant_adresse')}`, x, y); y+=8;
        doc.text(`Agissant en qualité de : ${getVal('declarant_lien')}`, x, y); y+=15;
        
        doc.text("Ayant qualité pour pourvoir aux funérailles de :", x, y); y+=8;
        
        // Cadre Défunt
        doc.setDrawColor(200); doc.setFillColor(250); doc.rect(x-5, y-5, 170, 35, 'FD');
        doc.setFont("helvetica", "bold"); doc.text(defuntComplet, x, y+2); y+=8;
        doc.setFont("helvetica", "normal");
        doc.text(`Né(e) le ${neLeStr} à ${getVal('lieu_naissance')}`, x, y); y+=6;
        doc.text(`Décédé(e) le ${dateStr} à ${getVal('lieu_deces')}`, x, y); y+=6;
        doc.text(`Domicile : ${getVal('domicile_defunt')}`, x, y); y+=15;

        // Mention Inhumation/Crémation
        const opType = getVal('type_operation');
        doc.setFont("helvetica", "bold"); doc.setTextColor(185, 28, 28);
        doc.text(`POUR : ${opType}`, 105, y, {align:"center"}); y+=15;

        doc.setTextColor(0); doc.setFont("helvetica", "bold");
        doc.text("Donne mandat aux PF SOLIDAIRE PERPIGNAN pour :", x, y); y+=8;
        doc.setFont("helvetica", "normal");
        doc.text("- Effectuer toutes les démarches administratives.", x+5, y); y+=6;
        doc.text("- Signer toute demande d'autorisation nécessaire.", x+5, y); y+=20;

        doc.text(`Fait à THUIR, le ${today}`, x, y);
        doc.setFont("helvetica", "bold"); doc.text("Signature du Mandant", 150, y, { align: "center" });
    }

    else if (type === 'PV_FERMETURE') {
        // [Design: En-tête bleu foncé, Cadres Police/Famille]
        headerPF(doc);
        
        // Bandeau titre foncé
        doc.setFillColor(52, 73, 94); doc.rect(0, 35, 210, 15, 'F');
        doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(255, 255, 255);
        doc.text("PROCÈS-VERBAL DE FERMETURE DE CERCUEIL", 105, 45, { align: "center" });
        
        doc.setTextColor(0); doc.setFontSize(10);
        let y = 65; const x = 20;
        
        // Cadre Opérateur
        doc.setDrawColor(200); doc.setLineWidth(0.5); doc.rect(x, y, 170, 20);
        doc.setFont("helvetica", "bold"); doc.text("L'OPÉRATEUR FUNÉRAIRE", x+5, y+5);
        doc.setFont("helvetica", "normal");
        doc.text("PF SOLIDAIRE PERPIGNAN - 32 Bd Léon Jean Grégory, Thuir", x+5, y+10);
        doc.text("Habilitation : 23-66-0205", x+5, y+15); y += 30;

        doc.text("Nous, soussignés, certifions avoir procédé à la fermeture et au scellement du cercueil.", x, y); y+=10;
        doc.setFont("helvetica", "bold");
        doc.text(`DATE : ${fmtDate(getVal('date_fermeture'))}`, x, y);
        doc.text(`LIEU : ${getVal('lieu_mise_biere')}`, x+80, y); y+=15;

        // Cadre Identité
        doc.setFillColor(240, 240, 240); doc.rect(x, y, 170, 30, 'F');
        doc.setFont("helvetica", "bold"); doc.text("IDENTITÉ DU DÉFUNT(E)", x+5, y+6);
        doc.setFont("helvetica", "normal");
        doc.text(`Nom Prénom : ${defuntComplet}`, x+5, y+14);
        doc.text(`Né(e) le : ${neLeStr}`, x+5, y+22); doc.text(`Décédé(e) le : ${dateStr}`, x+80, y+22); y+=40;

        // Cadre Témoins
        doc.setFont("helvetica", "bold"); doc.text("EN PRÉSENCE DE :", x, y); y+=10;
        doc.rect(x, y, 170, 30);
        doc.text("LA FAMILLE / AUTORITÉ DE POLICE", x+5, y+6);
        doc.setFont("helvetica", "normal");
        doc.text("Nom & Qualité : .................................................................", x+5, y+15);
        doc.text("(En l'absence de famille, indiquer le grade et le matricule de l'officier de police)", x+5, y+25);

        y+=40;
        doc.text(`Fait à ${getVal('lieu_mise_biere')}, le ${today}`, 20, y); y+=20;
        doc.text("Signature Opérateur", 40, y); doc.text("Signature Police / Famille", 140, y);
    }

    else if (type === 'TRANSPORT') {
        // [Design: Cadres séparés Départ/Arrivée, Bloc Transporteur]
        doc.setLineWidth(1); doc.rect(10, 10, 190, 277); // Grand cadre page
        headerPF(doc);
        
        doc.setFillColor(220); doc.rect(10, 35, 190, 15, 'F');
        doc.setFont("helvetica", "bold"); doc.setFontSize(16);
        doc.text("DÉCLARATION DE TRANSPORT DE CORPS", 105, 42, { align: "center" });
        doc.setFontSize(12); doc.text("AVANT/APRÈS MISE EN BIÈRE", 105, 47, { align: "center" });

        let y = 70; const x = 20;
        doc.setFontSize(10); doc.setFont("helvetica", "bold");
        doc.text("TRANSPORTEUR :", x, y); y+=5;
        doc.setFont("helvetica", "normal");
        doc.text("PF SOLIDAIRE PERPIGNAN - 32 Bd Léon J. Grégory, Thuir", x, y); y+=15;

        // Cadre Défunt
        doc.setDrawColor(0); doc.rect(x, y, 170, 25);
        doc.setFont("helvetica", "bold"); doc.text("DÉFUNT(E)", x+5, y+6);
        doc.setFontSize(14); doc.text(defuntComplet, 105, y+15, {align:"center"});
        doc.setFontSize(10); doc.setFont("helvetica", "normal");
        doc.text(`Né(e) le ${neLeStr}`, 105, y+21, {align:"center"}); y+=35;

        // Cadres Départ / Arrivée côte à côte
        doc.setLineWidth(0.5); doc.rect(x, y, 80, 50); doc.rect(x+90, y, 80, 50);
        
        // Départ
        doc.setFont("helvetica", "bold"); doc.text("LIEU DE DÉPART", x+5, y+6);
        doc.setFont("helvetica", "normal"); doc.text(getVal('lieu_mise_biere'), x+5, y+15);
        doc.setFont("helvetica", "bold"); doc.text("Date & Heure :", x+5, y+35);
        doc.setFont("helvetica", "normal"); doc.text("....................... à ..........", x+5, y+42);

        // Arrivée
        doc.setFont("helvetica", "bold"); doc.text("LIEU D'ARRIVÉE", x+95, y+6);
        doc.setFont("helvetica", "normal"); doc.text(getVal('destination'), x+95, y+15);
        doc.setFont("helvetica", "bold"); doc.text("Date & Heure :", x+95, y+35);
        doc.setFont("helvetica", "normal"); doc.text("....................... à ..........", x+95, y+42); y+=60;

        // Véhicule
        doc.setFillColor(230); doc.rect(x, y, 170, 10, 'F');
        doc.setFont("helvetica", "bold");
        doc.text(`VÉHICULE AGRÉÉ IMMATRICULÉ : ${getVal('vehicule_immat')}`, 105, y+7, {align:"center"}); y+=30;
        
        doc.text(`Fait à THUIR, le ${today}`, 120, y);
        doc.text("Cachet de l'entreprise :", 120, y+10);
    }
    
    else if (type === 'RAPATRIEMENT') {
        // [Design: Champs spécifiques Vol, LTA, Aéroports]
        headerPF(doc);
        doc.setDrawColor(0); doc.setLineWidth(0.5); doc.setFillColor(240, 240, 240);
        doc.rect(15, 35, 180, 20, 'FD');
        doc.setFont("helvetica", "bold"); doc.setFontSize(14);
        doc.text("DEMANDE DE TRANSPORT DE CORPS (ETRANGER)", 105, 47, {align:"center"});

        let y = 70; const x = 15;
        doc.setFontSize(10); doc.setFont("helvetica", "bold");
        doc.text("Je soussigné(e) : CHERKAOUI MUSTPAHA (PF SOLIDAIRE)", x, y); y+=10;
        doc.setFont("helvetica", "normal");
        doc.text("Sollicite l'autorisation de faire transporter hors du territoire le corps de :", x, y); y+=15;

        doc.setFont("helvetica", "bold");
        doc.text(`Nom Prénom : ${defuntComplet}`, x, y); y+=8;
        doc.setFont("helvetica", "normal");
        doc.text(`Né(e) le : ${neLeStr} à ${getVal('lieu_naissance')}`, x, y); y+=8;
        doc.text(`Décédé(e) le : ${dateStr} à ${getVal('lieu_deces')}`, x, y); y+=15;

        doc.setFont("helvetica", "bold"); doc.text("DESTINATION :", x, y); y+=8;
        doc.setFont("helvetica", "normal");
        doc.text(`Pays : ${getVal('rap_pays')}`, x+5, y); y+=6;
        doc.text(`Ville : ${getVal('rap_ville_dest')}`, x+5, y); y+=15;

        doc.setFont("helvetica", "bold"); 
        doc.rect(x, y-5, 180, 50); // Cadre Transport
        doc.text("MOYENS DE TRANSPORT :", x+5, y); y+=10;
        
        doc.setFont("helvetica", "normal");
        doc.text(`- Par Voie Aérienne`, x+5, y); y+=8;
        doc.text(`  > Aéroport Départ : ${getVal('rap_aero_dep')}`, x+10, y); y+=6;
        doc.text(`  > Aéroport Arrivée : ${getVal('rap_aero_arr')}`, x+10, y); y+=6;
        doc.text(`  > Vol N° : ${getVal('rap_vol_num')}`, x+10, y); y+=6;
        doc.text(`  > LTA (Lettre de Transport Aérien) : ${getVal('rap_lta')}`, x+10, y); y+=20;

        doc.text(`Fait à THUIR, le ${today}`, 140, y); y+=10;
        doc.setFont("helvetica", "bold"); doc.text("Signature et Cachet", 140, y);
    }
    
    else if (type === 'CREMATION') {
        // [Design: Lettre au Maire]
        headerPF(doc);
        doc.setFont("times", "bold"); doc.setFontSize(12);
        doc.text(getVal('declarant_nom'), 20, 45); 
        doc.setFont("times", "normal"); doc.text(getVal('declarant_adresse'), 20, 51);
        
        doc.setFont("times", "bold"); doc.setFontSize(14);
        doc.text("Monsieur le Maire", 150, 60, {align:"center"});
        doc.setFontSize(12); doc.text("OBJET : DEMANDE D'AUTORISATION DE CREMATION", 20, 80);
        
        let y = 100; doc.setFont("times", "normal");
        const txt = `Monsieur le Maire,\n\nJe soussigné(e) ${getVal('declarant_nom')}, agissant en qualité de ${getVal('declarant_lien')} du défunt(e), sollicite l'autorisation de procéder à la crémation de :\n\n${defuntComplet}\nNé(e) le ${neLeStr} et décédé(e) le ${dateStr}.\n\nLa crémation aura lieu au crématorium de : ${getVal('destination')}.\n\nJe certifie que le défunt n'était pas porteur d'un stimulateur cardiaque (ou qu'il a été retiré).`;
        
        const splitTxt = doc.splitTextToSize(txt, 170); doc.text(splitTxt, 20, y);
        y += (splitTxt.length * 7) + 20;
        
        doc.text(`Fait à THUIR, le ${today}`, 120, y);
        doc.setFont("times", "bold"); doc.text("Signature", 120, y+8);
    }

    else if (type === 'DECES') {
        // [Design: Declaration standard avec pointillés]
        doc.setFontSize(16); doc.setFont("helvetica", "bold");
        doc.text("DÉCLARATION DE DÉCÈS", 105, 30, { align: "center" });
        doc.setLineWidth(0.5); doc.line(75, 31, 135, 31);
        
        doc.setFontSize(11); doc.setFont("helvetica", "normal");
        doc.text("À Monsieur l'Officier de l'État Civil,", 20, 50);
        
        let y = 70; const x = 20;
        doc.text("Nous déclarons le décès de :", x, y); y+=10;
        doc.setFont("helvetica", "bold"); doc.text(defuntComplet, x+20, y); doc.setFont("helvetica", "normal"); y+=15;
        
        doc.text(`Né(e) le : ${neLeStr} à ${getVal('lieu_naissance')}`, x, y); y+=10;
        doc.text(`Domicilié(e) : ${getVal('domicile_defunt')}`, x, y); y+=15;
        
        doc.text("Décès survenu le :", x, y); y+=10;
        doc.setFont("helvetica", "bold"); doc.text(`${dateStr} à ${getVal('heure_deces')}`, x+20, y); doc.setFont("helvetica", "normal"); y+=15;
        
        doc.text(`À la commune de : ${getVal('lieu_deces')}`, x, y); y+=30;
        
        doc.text(`Fait à ${getVal('lieu_deces')}, le ${today}`, x, y); y+=20;
        doc.text("Le Déclarant (PF SOLIDAIRE) :", 120, y);
    }
    
    else if (type === 'FERMETURE') {
        // [Design: Demande Mairie standard]
        headerPF(doc);
        doc.setFontSize(16); doc.setFont("helvetica", "bold");
        doc.text("DEMANDE D'AUTORISATION DE FERMETURE", 105, 45, {align:'center'});
        
        let y = 80; const x = 20;
        doc.setFontSize(11); doc.setFont("helvetica", "normal");
        doc.text("Je soussigné M. CHERKAOUI Mustapha, Dirigeant PF Solidaire,", x, y); y+=10;
        doc.text("Sollicite l'autorisation de fermeture du cercueil de :", x, y); y+=15;
        
        doc.setFont("helvetica", "bold"); doc.text(defuntComplet, x+20, y); doc.setFont("helvetica", "normal"); y+=15;
        
        doc.text(`Décédé(e) le : ${dateStr} à ${getVal('lieu_deces')}`, x, y); y+=10;
        doc.text(`Mise en bière à : ${getVal('lieu_mise_biere')}`, x, y); y+=10;
        doc.text(`Destination : ${getVal('destination')}`, x, y); y+=30;
        
        doc.text(`Fait à THUIR, le ${today}`, x, y); y+=20;
        doc.text("Cachet de l'entreprise :", 120, y);
    }

    doc.save(`${type}_${defuntNom}.pdf`);
};