/* Fichier : js/script.js - VERSION CORRIGÉE (BOUTON NOUVEAU ACTIF) */
import { auth, db, collection, addDoc, getDocs, query, orderBy, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "./config.js";

// ==========================================================================
// 1. INITIALISATION & CONNEXION
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    chargerLogoBase64(); 
    const loader = document.getElementById('app-loader');
    
    onAuthStateChanged(auth, (user) => {
        if(loader) loader.style.display = 'none';
        if (user) {
            document.getElementById('login-screen').classList.add('hidden');
            chargerClientsFacturation(); 
        } else {
            document.getElementById('login-screen').classList.remove('hidden');
        }
    });

    if(document.getElementById('btn-login')) {
        document.getElementById('btn-login').addEventListener('click', async () => {
            try { 
                await signInWithEmailAndPassword(auth, document.getElementById('login-email').value, document.getElementById('login-password').value); 
            } catch(e) { alert("Erreur connexion : Vérifiez email/mot de passe."); }
        });
    }
    
    // Boutons d'action
    if(document.getElementById('btn-import')) {
        document.getElementById('btn-import').addEventListener('click', importerClient);
    }
    if(document.getElementById('btn-save-bdd')) {
        document.getElementById('btn-save-bdd').addEventListener('click', sauvegarderEnBase);
    }
});

// ==========================================================================
// 2. FONCTIONS INTERFACE (NOUVEAU / IMPORT)
// ==========================================================================

// --- A. GESTION DU BOUTON "NOUVEAU" (RESET) ---
// Cette fonction était manquante, la voici restaurée.
window.viderFormulaire = function() {
    if(confirm("Voulez-vous vider tous les champs pour créer un nouveau dossier ?\n(Cela effacera les données non enregistrées)")) {
        // On vide tous les champs texte et date du panneau Admin
        const inputs = document.querySelectorAll('#view-admin input');
        inputs.forEach(input => input.value = '');
        
        // On remet les selects à la première option
        const selects = document.querySelectorAll('#view-admin select');
        selects.forEach(select => select.selectedIndex = 0);

        // On remet les valeurs par défaut importantes
        if(document.getElementById('immatriculation')) document.getElementById('immatriculation').value = 'DA-081-ZQ';
        if(document.getElementById('faita')) document.getElementById('faita').value = 'THUIR';
        if(document.getElementById('nationalite')) document.getElementById('nationalite').value = 'Française';
        if(document.getElementById('nationalite_mandant')) document.getElementById('nationalite_mandant').value = 'Française';
        
        alert("✅ Formulaire réinitialisé. Vous pouvez saisir un nouveau dossier.");
    }
};

// --- B. IMPORTATION CLIENTS (LIAISON FACTURATION) ---
let clientsCache = [];

async function chargerClientsFacturation() {
    const select = document.getElementById('select-import-client');
    if(!select) return;
    try {
        const q = query(collection(db, "factures_v2"), orderBy("date_creation", "desc"));
        const snap = await getDocs(q);
        
        select.innerHTML = '<option value="">-- Sélectionner un dossier Facturation --</option>';
        clientsCache = [];
        
        snap.forEach(doc => {
            const data = doc.data();
            if(data.client && data.client.nom) {
                const opt = document.createElement('option');
                opt.value = doc.id; 
                // On affiche le Type et le Numéro pour aider à retrouver le devis
                const typeDoc = data.type || "DOC";
                const numDoc = data.numero || "???";
                opt.textContent = `${typeDoc} ${numDoc} | ${data.client.nom} (Défunt: ${data.defunt ? data.defunt.nom : '?'})`;
                select.appendChild(opt);
                clientsCache.push({ id: doc.id, data: data });
            }
        });
    } catch (e) { console.error("Erreur chargement clients:", e); }
}

function importerClient() {
    const id = document.getElementById('select-import-client').value;
    if(!id) return;
    const dossier = clientsCache.find(c => c.id === id);
    
    if(dossier) {
        const d = dossier.data;
        // Remplissage automatique des champs
        if(d.client) {
            document.getElementById('soussigne').value = d.client.nom || ''; // Le client facturé devient le mandant
            document.getElementById('demeurant').value = d.client.adresse || '';
            document.getElementById('declarant_nom').value = d.client.nom || '';
            document.getElementById('declarant_adresse').value = d.client.adresse || '';
        }
        if(d.defunt) {
            document.getElementById('nom').value = d.defunt.nom || ''; 
            document.getElementById('defunt_nom').value = d.defunt.nom || ''; 
        }
        
        // Message d'aide pour l'utilisateur
        const msg = `✅ Données importées du dossier ${d.numero} !\n\n` +
                    `Pour voir le détail financier (prix, prestations), ` +
                    `veuillez aller dans le menu 'Facturation V2' et chercher le document n° ${d.numero}.`;
        alert(msg);
    }
}

// --- C. SAUVEGARDE EN BASE ---
async function sauvegarderEnBase() {
    const btn = document.getElementById('btn-save-bdd');
    const oldText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ...';
    
    try {
        const dossier = {
            defunt: { 
                nom: getVal('nom'), 
                prenom: getVal('prenom'), 
                date_deces: getVal('date_deces'),
                lieu_deces: getVal('lieu_deces') 
            },
            mandant: { 
                nom: getVal('soussigne'), 
                adresse: getVal('demeurant'),
                lien: getVal('lien') 
            },
            technique: { 
                lieu_mise_biere: getVal('lieu_mise_biere'), 
                vehicule: getVal('immatriculation'),
                destination: getVal('destination')
            },
            date_creation: new Date().toISOString()
        };
        await addDoc(collection(db, "dossiers_admin"), dossier);
        btn.style.background = "#22c55e";
        btn.innerHTML = '<i class="fas fa-check"></i> Enregistré !';
        setTimeout(() => { 
            btn.innerHTML = oldText; 
            btn.style.background = ""; 
        }, 2000);
    } catch(e) { 
        alert("Erreur sauvegarde: " + e.message); 
        btn.innerHTML = oldText;
    }
}

// ==========================================================================
// 3. FONCTIONS UTILITAIRES (PDF)
// ==========================================================================
let logoBase64 = null;

function chargerLogoBase64() {
    const imgElement = document.getElementById('logo-source');
    if (!imgElement || !imgElement.complete || imgElement.naturalWidth === 0) return;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = imgElement.naturalWidth;
    canvas.height = imgElement.naturalHeight;
    ctx.drawImage(imgElement, 0, 0);
    try { logoBase64 = canvas.toDataURL("image/png"); } catch (e) { logoBase64 = null; }
}

function ajouterFiligrane(pdf) {
    if (logoBase64) {
        try {
            pdf.saveGraphicsState();
            pdf.setGState(new pdf.GState({ opacity: 0.06 }));
            const width = 100; const height = 100; 
            pdf.addImage(logoBase64, 'PNG', (210 - width) / 2, (297 - height) / 2, width, height);
            pdf.restoreGraphicsState();
        } catch(e) {}
    }
}

function headerPF(pdf, yPos = 20) {
    pdf.setFont("helvetica", "bold"); 
    pdf.setTextColor(34, 155, 76); // VERT EXACT
    pdf.setFontSize(12);
    pdf.text("POMPES FUNEBRES SOLIDAIRE PERPIGNAN", 105, yPos, { align: "center" });
    
    pdf.setTextColor(80); 
    pdf.setFontSize(8); 
    pdf.setFont("helvetica", "normal");
    pdf.text("32 boulevard Léon Jean Grégory Thuir - TEL : 07.55.18.27.77", 105, yPos + 5, { align: "center" });
    pdf.text("HABILITATION N° : 23-66-0205 | SIRET : 53927029800042", 105, yPos + 9, { align: "center" });
    
    pdf.setDrawColor(34, 155, 76); 
    pdf.setLineWidth(0.5);
    pdf.line(40, yPos + 12, 170, yPos + 12);
}

function getVal(id) { const el = document.getElementById(id); return el ? el.value : ""; }
function formatDate(d) { 
    if (!d) return ".................";
    if (d.includes("-")) return d.split("-").reverse().join("/");
    return d;
}

// ==========================================================================
// 4. MOTEUR PDF (VOS DOCUMENTS COMPLETS)
// ==========================================================================

// --- 4.1 POUVOIR ---
window.genererPouvoir = function() {
    if(!logoBase64) chargerLogoBase64();
    const { jsPDF } = window.jspdf; const pdf = new jsPDF();
    ajouterFiligrane(pdf); headerPF(pdf);
    
    let typePresta = getVal("prestation").toUpperCase();
    if(typePresta === "RAPATRIEMENT") typePresta += ` vers ${getVal("rap_pays").toUpperCase()}`;
    
    pdf.setFillColor(241, 245, 249); pdf.rect(20, 45, 170, 12, 'F');
    pdf.setFontSize(16); pdf.setTextColor(185, 28, 28); pdf.setFont("helvetica", "bold");
    pdf.text("POUVOIR", 105, 53, { align: "center" });
    
    pdf.setFontSize(10); pdf.setTextColor(0);
    let y = 75; const x = 25;
    pdf.setFont("helvetica", "normal");
    pdf.text(`Je soussigné(e) : ${getVal("soussigne")}`, x, y); y+=8;
    pdf.text(`Demeurant à : ${getVal("demeurant")}`, x, y); y+=8;
    pdf.text(`Agissant en qualité de : ${getVal("lien")}`, x, y); y+=15;
    pdf.text("Ayant qualité pour pourvoir aux funérailles de :", x, y); y+=8;
    
    pdf.setDrawColor(200); pdf.setFillColor(250); pdf.rect(x-5, y-5, 170, 40, 'FD');
    pdf.setFont("helvetica", "bold");
    pdf.text(`${getVal("nom")} ${getVal("prenom")}`, x, y+2); y+=8;
    pdf.setFont("helvetica", "normal");
    pdf.text(`Né(e) le ${formatDate(getVal("date_naiss"))} à ${getVal("lieu_naiss")}`, x, y); y+=6;
    pdf.text(`Décédé(e) le ${formatDate(getVal("date_deces"))} à ${getVal("lieu_deces")}`, x, y); y+=6;
    pdf.text(`Domicile : ${getVal("adresse_fr")}`, x, y); y+=12;
    
    pdf.setFont("helvetica", "bold"); pdf.setTextColor(185, 28, 28);
    pdf.text(`POUR : ${typePresta}`, 105, y, {align:"center"}); y+=15;
    
    pdf.setTextColor(0); pdf.setFont("helvetica", "bold");
    pdf.text("Donne mandat aux PF SOLIDAIRE PERPIGNAN pour :", x, y); y+=8;
    pdf.setFont("helvetica", "normal");
    pdf.text("- Effectuer toutes les démarches administratives.", x+5, y); y+=6;
    pdf.text("- Signer toute demande d'autorisation nécessaire.", x+5, y); y+=6;
    if(typePresta.includes("RAPATRIEMENT")) {
        pdf.text("- Accomplir les formalités consulaires et douanières.", x+5, y); y+=6;
    }
    y = 240;
    pdf.text(`Fait à ${getVal("faita")}, le ${formatDate(getVal("dateSignature"))}`, x, y);
    pdf.setFont("helvetica", "bold"); pdf.text("Signature du Mandant", 150, y, { align: "center" });
    pdf.save(`Pouvoir_${getVal("nom")}.pdf`);
};

// --- 4.2 DÉCLARATION DÉCÈS ---
window.genererDeclaration = function() {
    const { jsPDF } = window.jspdf; const pdf = new jsPDF();
    const fontMain = "times";
    
    pdf.setFont(fontMain, "bold"); pdf.setFontSize(16);
    pdf.text("DECLARATION DE DECES", 105, 30, { align: "center" });
    pdf.setLineWidth(0.5); pdf.line(75, 31, 135, 31);
    pdf.setFontSize(11);
    pdf.text("Dans tous les cas à remettre obligatoirement complété et signé", 105, 38, { align: "center" });
    pdf.line(55, 39, 155, 39);
    
    let y = 60; const margin = 20;
    const drawLine = (label, val, yPos) => {
        pdf.setFont(fontMain, "bold"); pdf.text(label, margin, yPos);
        const startDots = margin + pdf.getTextWidth(label) + 2;
        let curX = startDots; pdf.setFont(fontMain, "normal");
        while(curX < 190) { pdf.text(".", curX, yPos); curX += 2; }
        if(val) {
            pdf.setFont(fontMain, "bold"); pdf.setFillColor(255, 255, 255);
            pdf.rect(startDots, yPos - 4, pdf.getTextWidth(val)+5, 5, 'F');
            pdf.text(val.toUpperCase(), startDots + 2, yPos);
        }
    };
    
    drawLine("NOM : ", getVal("nom"), y); y+=14;
    drawLine("NOM DE JEUNE FILLE : ", getVal("nom_jeune_fille"), y); y+=14;
    drawLine("Prénoms : ", getVal("prenom"), y); y+=14;
    drawLine("Né(e) le : ", formatDate(getVal("date_naiss")), y); y+=14;
    drawLine("A : ", getVal("lieu_naiss"), y); y+=14;
    
    pdf.setFont(fontMain, "bold"); pdf.text("DATE ET LIEU DU DECES LE", margin, y);
    pdf.setFont(fontMain, "normal"); 
    pdf.text(formatDate(getVal("date_deces")), margin+70, y);
    pdf.setFont(fontMain, "bold"); pdf.text("A", 120, y);
    pdf.text(getVal("lieu_deces").toUpperCase(), 130, y);
    y += 6; pdf.setFont(fontMain, "bold"); pdf.text("(en son domicile, en clinique, à l'hôpital)", margin, y); y += 18;
    
    const profSelect = document.getElementById("prof_type");
    const profVal = profSelect ? profSelect.value : "";
    drawLine("PROFESSION : ", profVal, y); y+=14;
    drawLine("DOMICILIE(E) ", getVal("adresse_fr"), y); y+=14;
    drawLine("FILS OU FILLE de (Père) :", getVal("pere"), y); y+=14;
    drawLine("Et de (Mère) :", getVal("mere"), y); y+=14;
    drawLine("Situation Matrimoniale : ", getVal("matrimoniale"), y); y+=14;
    drawLine("NATIONALITE : ", getVal("nationalite"), y); y+=25;
    
    pdf.setFont(fontMain, "bold"); pdf.text("NOM ET SIGNATURE DES POMPES FUNEBRES EN CHARGE DES OBSEQUES", 105, y, { align: "center" });
    pdf.save(`Declaration_Deces_${getVal("nom")}.pdf`);
};

// --- 4.3 DEMANDE INHUMATION ---
window.genererDemandeInhumation = function() {
    if(!logoBase64) chargerLogoBase64();
    const { jsPDF } = window.jspdf; const pdf = new jsPDF();
    headerPF(pdf);
    pdf.setFillColor(230, 240, 230); pdf.rect(20, 40, 170, 10, 'F');
    pdf.setFontSize(14); pdf.setFont("helvetica", "bold"); pdf.setTextColor(0);
    pdf.text("DEMANDE D'INHUMATION", 105, 47, { align: "center" });
    let y = 70; const x = 25;
    pdf.setFontSize(11); pdf.text("Monsieur le Maire,", x, y); y+=10;
    pdf.setFont("helvetica", "normal");
    pdf.text("Je soussigné M. CHERKAOUI Mustapha, dirigeant des PF Solidaire,", x, y); y+=6;
    pdf.text("Sollicite l'autorisation d'inhumer le défunt :", x, y); y+=12;
    pdf.setFont("helvetica", "bold"); pdf.text(`${getVal("nom").toUpperCase()} ${getVal("prenom")}`, x+10, y); y+=6;
    pdf.setFont("helvetica", "normal"); pdf.text(`Décédé(e) le ${formatDate(getVal("date_deces"))} à ${getVal("lieu_deces")}`, x+10, y); y+=15;
    pdf.text("Lieu d'inhumation :", x, y); y+=6;
    pdf.setFont("helvetica", "bold"); pdf.text(`Cimetière : ${getVal("cimetiere_nom")}`, x+10, y); y+=6;
    pdf.text(`Le : ${formatDate(getVal("date_inhumation"))} à ${getVal("heure_inhumation")}`, x+10, y); y+=6;
    pdf.text(`Concession : ${getVal("num_concession")} (${getVal("type_sepulture")})`, x+10, y); y+=20;
    pdf.setFont("helvetica", "normal"); pdf.text("Veuillez agréer, Monsieur le Maire, mes salutations distinguées.", x, y); y+=20;
    pdf.text(`Fait à ${getVal("faita")}, le ${formatDate(getVal("dateSignature"))}`, 130, y);
    pdf.save(`Demande_Inhumation_${getVal("nom")}.pdf`);
};

// --- 4.4 DEMANDE CRÉMATION ---
window.genererDemandeCremation = function() {
    const { jsPDF } = window.jspdf; const pdf = new jsPDF();
    headerPF(pdf);
    pdf.setFont("times", "bold"); pdf.setFontSize(12);
    pdf.text(getVal("soussigne"), 20, 45); 
    pdf.setFont("times", "normal"); pdf.text(getVal("demeurant"), 20, 51);
    pdf.setFont("times", "bold"); pdf.setFontSize(14);
    pdf.text("Monsieur le Maire", 150, 60, {align:"center"});
    pdf.setFontSize(12); pdf.text("OBJET : DEMANDE D'AUTORISATION DE CREMATION", 20, 80);
    let y = 100;
    pdf.setFont("times", "normal");
    const txt = `Monsieur le Maire,\n\nJe soussigné(e) ${getVal("soussigne")}, agissant en qualité de ${getVal("lien")} du défunt(e), sollicite l'autorisation de procéder à la crémation de :\n\n${getVal("nom").toUpperCase()} ${getVal("prenom")}\nNé(e) le ${formatDate(getVal("date_naiss"))} et décédé(e) le ${formatDate(getVal("date_deces"))}.\n\nLa crémation aura lieu le ${formatDate(getVal("date_cremation"))} au ${getVal("crematorium_nom")}.\nDestination des cendres : ${getVal("destination_cendres")}.\n\nJe certifie que le défunt n'était pas porteur d'un stimulateur cardiaque.`;
    const splitTxt = pdf.splitTextToSize(txt, 170); pdf.text(splitTxt, 20, y);
    y += (splitTxt.length * 7) + 20;
    pdf.text(`Fait à ${getVal("faita")}, le ${formatDate(getVal("dateSignature"))}`, 120, y);
    pdf.setFont("times", "bold"); pdf.text("Signature", 120, y+8);
    pdf.save(`Demande_Cremation_${getVal("nom")}.pdf`);
};

// --- 4.5 RAPATRIEMENT (PRÉFECTURE) ---
window.genererDemandeRapatriement = function() {
    const { jsPDF } = window.jspdf; const pdf = new jsPDF();
    pdf.setDrawColor(0); pdf.setLineWidth(0.5); pdf.setFillColor(240, 240, 240);
    pdf.rect(15, 20, 180, 20, 'FD');
    pdf.setTextColor(0); pdf.setFont("helvetica", "bold"); pdf.setFontSize(14);
    pdf.text("DEMANDE D'AUTORISATION DE TRANSPORT DE CORPS", 105, 32, {align:"center"});

    let y = 60; const x = 15;
    pdf.setFontSize(10); pdf.setFont("helvetica", "bold");
    pdf.text("Je soussigné(e) (nom et prénom) : CHERKAOUI MUSTPAHA", x, y); y+=6;
    pdf.text("Représentant légal de : ", x, y);
    pdf.setFont("helvetica", "normal");
    pdf.text("Pompes Funèbres Solidaire Perpignan, 32 boulevard Léon Jean Grégory Thuir", x+45, y); y+=6;
    pdf.setFont("helvetica", "bold");
    pdf.text("Habilitée sous le n° : 23-66-0205", x, y); y+=6;
    pdf.setFont("helvetica", "normal");
    pdf.text("Dûment mandaté par la famille de la défunte, sollicite l'autorisation de faire transporter en dehors du", x, y); y+=5;
    pdf.text("territoire métropolitain le corps après mise en bière de :", x, y); y+=10;
    pdf.setFont("helvetica", "bold");
    pdf.text(`Nom et prénom défunt(e) : ${getVal("nom").toUpperCase()} ${getVal("prenom")}`, x, y); y+=6;
    pdf.setFont("helvetica", "normal");
    pdf.text(`Date et lieu de naissance    : ${formatDate(getVal("date_naiss"))}       à     ${getVal("lieu_naiss")}`, x, y); y+=6;
    pdf.text(`Date et lieu de décès        : ${formatDate(getVal("date_deces"))}       à     ${getVal("lieu_deces")}`, x, y); y+=10;
    
    pdf.text(`Destination : ${getVal("rap_pays")} - Ville : ${getVal("rap_ville")}`, x, y); y+=10;
    
    if(getVal("vol1_num")) {
        pdf.text(`Vol N° ${getVal("vol1_num")} - LTA : ${getVal("rap_lta")}`, x, y); y+=6;
        pdf.text(`Départ : ${getVal("vol1_dep_aero")} - Arrivée : ${getVal("vol1_arr_aero")}`, x, y); y+=10;
    }
    
    pdf.text(`Fait à ${getVal("faita")}, le ${formatDate(getVal("dateSignature"))}`, 130, y);
    pdf.save(`Demande_Rapatriement_Prefecture_${getVal("nom")}.pdf`);
};

// --- 4.6 FERMETURE CERCUEIL MAIRIE ---
window.genererDemandeFermetureMairie = function() {
    const { jsPDF } = window.jspdf; const pdf = new jsPDF();
    pdf.setDrawColor(26, 90, 143); pdf.setLineWidth(1.5); pdf.rect(10, 10, 190, 277);
    headerPF(pdf);
    pdf.setFont("helvetica", "bold"); pdf.setTextColor(26, 90, 143); pdf.setFontSize(16);
    pdf.text("DEMANDE D'AUTORISATION DE FERMETURE", 105, 45, { align: "center" });
    pdf.text("DE CERCUEIL", 105, 53, { align: "center" });
    let y = 80; const x = 25;
    pdf.setTextColor(0); pdf.setFontSize(11); pdf.setFont("helvetica", "bold");
    pdf.text("Je soussigné :", x, y); y+=10;
    pdf.setFont("helvetica", "normal");
    pdf.text("• Nom et Prénom : M. CHERKAOUI Mustapha", x+10, y); y+=8;
    pdf.text("• Qualité : Dirigeant PF Solidaire Perpignan", x+10, y); y+=8;
    pdf.text("• Adresse : 32 Bd Léon Jean Grégory, Thuir", x+10, y); y+=15;
    pdf.setFont("helvetica", "bold");
    pdf.text("A l'honneur de solliciter votre autorisation de fermeture du cercueil de :", x, y); y+=15;
    pdf.setFillColor(245, 245, 245); pdf.rect(x-5, y-5, 170, 35, 'F');
    pdf.text("• Nom et Prénom : " + getVal("nom").toUpperCase() + " " + getVal("prenom"), x+10, y); y+=10;
    pdf.text("• Né(e) le : " + formatDate(getVal("date_naiss")) + " à " + getVal("lieu_naiss"), x+10, y); y+=10;
    pdf.text("• Décédé(e) le : " + formatDate(getVal("date_deces")) + " à " + getVal("lieu_deces"), x+10, y); y+=20;
    pdf.text("Et ce,", x, y); y+=10;
    pdf.setFont("helvetica", "normal");
    pdf.text("• Le : " + formatDate(getVal("date_fermeture")), x+10, y); y+=10;
    pdf.text("• A (Lieu) : " + getVal("lieu_fermeture"), x+10, y); y+=30;
    pdf.setFont("helvetica", "bold");
    pdf.text(`Fait à ${getVal("faita")}, le ${formatDate(getVal("dateSignature"))}`, x, y);
    pdf.save(`Demande_Fermeture_${getVal("nom")}.pdf`);
};

// --- 4.7 OUVERTURE SÉPULTURE ---
window.genererDemandeOuverture = function() {
    const { jsPDF } = window.jspdf; const pdf = new jsPDF();
    const type = getVal("prestation"); 
    headerPF(pdf);
    pdf.setFont("times", "bold"); pdf.setFontSize(14);
    pdf.text("DEMANDE D'OUVERTURE D'UNE SEPULTURE DE FAMILLE", 105, 40, {align:"center"});
    let y = 60;
    pdf.setFontSize(12);
    pdf.text(`POUR : ${type.toUpperCase()}`, 25, y);
    y += 20;
    pdf.setFont("times", "normal");
    pdf.text("Nous soussignons :", 25, y); y+=10;
    pdf.setFont("times", "bold");
    pdf.text(getVal("soussigne"), 35, y); y+=10;
    pdf.setFont("times", "normal");
    pdf.text("Demandons l'ouverture de la concession n° " + getVal("num_concession"), 25, y);
    pdf.save(`Ouverture_Sepulture_${getVal("nom")}.pdf`);
};

// --- 4.8 PV FERMETURE (TECHNIQUE) ---
window.genererFermeture = function() {
    if(!logoBase64) chargerLogoBase64();
    const { jsPDF } = window.jspdf; const pdf = new jsPDF();
    ajouterFiligrane(pdf);
    headerPF(pdf);
    pdf.setFillColor(52, 73, 94); pdf.rect(0, 35, 210, 15, 'F');
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(16); pdf.setTextColor(255, 255, 255);
    pdf.text("DECLARATION DE FERMETURE ET DE SCELLEMENT DE CERCUEIL", 105, 45, { align: "center" });
    pdf.setTextColor(0); pdf.setFontSize(10);
    let y = 65; const x = 20;
    pdf.setDrawColor(200); pdf.setLineWidth(0.5); pdf.rect(x, y, 170, 20);
    pdf.setFont("helvetica", "bold"); pdf.text("L'OPÉRATEUR FUNÉRAIRE", x+5, y+5);
    pdf.setFont("helvetica", "normal");
    pdf.text("PF SOLIDAIRE PERPIGNAN - 32 Bd Léon Jean Grégory, Thuir", x+5, y+10);
    pdf.text("Habilitation : 23-66-0205", x+5, y+15); y += 30;
    pdf.text("Je, soussigné M. CHERKAOUI Mustapha, certifie avoir procédé à la Mise en bière, fermeture et au scellement du cercueil.", x, y); y+=10;
    pdf.setFont("helvetica", "bold");
    pdf.text(`DATE : ${formatDate(getVal("date_fermeture"))}`, x, y);
    pdf.text(`LIEU : ${getVal("lieu_fermeture")}`, x+80, y); y+=15;
    pdf.setFillColor(240, 240, 240); pdf.rect(x, y, 170, 30, 'F');
    pdf.setFont("helvetica", "bold"); pdf.text("IDENTITÉ DU DÉFUNT(E)", x+5, y+6);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Nom : ${getVal("nom").toUpperCase()}`, x+5, y+14); pdf.text(`Prénom : ${getVal("prenom")}`, x+80, y+14);
    pdf.text(`Né(e) le : ${formatDate(getVal("date_naiss"))}`, x+5, y+22); pdf.text(`Décédé(e) le : ${formatDate(getVal("date_deces"))}`, x+80, y+22); y+=40;
    
    // Détection Police/Famille
    const typePres = document.getElementById('type_presence_select');
    const isPolice = typePres && typePres.value === "police";
    
    pdf.setFont("helvetica", "bold"); pdf.text("EN PRÉSENCE DE :", x, y); y+=10;
    pdf.rect(x, y, 170, 30);
    if(isPolice) {
        pdf.text("AUTORITÉ DE POLICE (Absence de famille)", x+5, y+6);
        pdf.setFont("helvetica", "normal");
        pdf.text(`Nom & Grade : ${getVal("p_nom_grade")}`, x+5, y+14);
        pdf.text(`Commissariat : ${getVal("p_commissariat")}`, x+5, y+22);
    } else {
        pdf.text("LA FAMILLE", x+5, y+6);
        pdf.setFont("helvetica", "normal");
        pdf.text(`Nom : ${getVal("f_nom_prenom")}`, x+5, y+14);
        pdf.text(`Lien de parenté : ${getVal("f_lien")}`, x+80, y+14);
        pdf.text(`Domicile : ${getVal("f_adresse")}`, x+5, y+22);
    }
    y+=45;
    pdf.line(20, y, 190, y); y+=10;
    pdf.setFont("helvetica", "bold");
    pdf.text("Signature Opérateur", 40, y);
    pdf.text(isPolice ? "Signature Police" : "Signature Famille", 140, y);
    pdf.save(`PV_Fermeture_${getVal("nom")}.pdf`);
};

// --- 4.9 TRANSPORT ---
window.genererTransport = function() {
    if(!logoBase64) chargerLogoBase64();
    const { jsPDF } = window.jspdf; const pdf = new jsPDF();
    pdf.setLineWidth(1); pdf.rect(10, 10, 190, 277);
    headerPF(pdf);
    pdf.setFillColor(200); pdf.rect(10, 35, 190, 15, 'F');
    const sel = document.getElementById('transport_type_select');
    const labelT = (sel && sel.value === "avant") ? "AVANT MISE EN BIÈRE" : "APRÈS MISE EN BIÈRE";
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(16);
    pdf.text(`DÉCLARATION DE TRANSPORT DE CORPS`, 105, 42, { align: "center" });
    pdf.setFontSize(12); pdf.text(labelT, 105, 47, { align: "center" });
    let y = 70; const x = 20;
    pdf.setFontSize(10); pdf.setFont("helvetica", "bold");
    pdf.text("TRANSPORTEUR :", x, y); y+=5;
    pdf.setFont("helvetica", "normal");
    pdf.text("PF SOLIDAIRE PERPIGNAN - 32 Bd Léon J. Grégory, Thuir", x, y); y+=15;
    pdf.setDrawColor(0); pdf.rect(x, y, 170, 25);
    pdf.setFont("helvetica", "bold"); pdf.text("DÉFUNT(E)", x+5, y+6);
    pdf.setFontSize(14); pdf.text(`${getVal("nom")} ${getVal("prenom")}`, 105, y+15, {align:"center"});
    pdf.setFontSize(10); pdf.setFont("helvetica", "normal");
    pdf.text(`Né(e) le ${formatDate(getVal("date_naiss"))}`, 105, y+21, {align:"center"}); y+=35;
    pdf.setLineWidth(0.5); pdf.rect(x, y, 80, 50); pdf.rect(x+90, y, 80, 50);
    pdf.setFont("helvetica", "bold"); pdf.text("LIEU DE DÉPART", x+5, y+6);
    pdf.setFont("helvetica", "normal"); pdf.text(getVal("lieu_depart_t"), x+5, y+15);
    pdf.setFont("helvetica", "bold"); pdf.text("Date & Heure :", x+5, y+35);
    pdf.setFont("helvetica", "normal"); pdf.text(`${formatDate(getVal("date_depart_t"))} à ${getVal("heure_depart_t")}`, x+5, y+42);
    pdf.setFont("helvetica", "bold"); pdf.text("LIEU D'ARRIVÉE", x+95, y+6);
    pdf.setFont("helvetica", "normal"); pdf.text(getVal("lieu_arrivee_t"), x+95, y+15);
    pdf.setFont("helvetica", "bold"); pdf.text("Date & Heure :", x+95, y+35);
    pdf.setFont("helvetica", "normal"); pdf.text(`${formatDate(getVal("date_arrivee_t"))} à ${getVal("heure_arrivee_t")}`, x+95, y+42); y+=60;
    pdf.setFillColor(230); pdf.rect(x, y, 170, 10, 'F');
    pdf.setFont("helvetica", "bold");
    pdf.text(`VÉHICULE AGRÉÉ IMMATRICULÉ : ${getVal("immatriculation")}`, 105, y+7, {align:"center"}); y+=30;
    pdf.text(`Fait à ${getVal("faita")}, le ${formatDate(getVal("dateSignature"))}`, 120, y);
    pdf.text("Cachet de l'entreprise :", 120, y+10);
    pdf.save(`Transport_${getVal("nom")}.pdf`);
};