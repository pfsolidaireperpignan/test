/* Fichier : js/script.js - VERSION FUSION COMPLETE (AUTH + DATA + PDF EXPERTS) */
import { auth, db, collection, addDoc, getDocs, query, orderBy, onAuthStateChanged, signInWithEmailAndPassword, signOut, deleteDoc, doc, sendPasswordResetEmail } from "./config.js";

// ==========================================================================
// 1. INITIALISATION (AUTH & PASSWORD RESET)
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    chargerLogoBase64(); 
    const loader = document.getElementById('app-loader');
    
    onAuthStateChanged(auth, (user) => {
        if(loader) loader.style.display = 'none';
        if (user) {
            document.getElementById('login-screen').classList.add('hidden');
            window.chargerBaseClients(); 
            chargerClientsFacturation(); 
        } else {
            document.getElementById('login-screen').classList.remove('hidden');
        }
    });

    if(document.getElementById('btn-login')) {
        document.getElementById('btn-login').addEventListener('click', async () => {
            try { await signInWithEmailAndPassword(auth, document.getElementById('login-email').value, document.getElementById('login-password').value); } 
            catch(e) { alert("Erreur : " + e.message); }
        });
    }

    // Mot de passe oublié
    if(document.getElementById('btn-forgot')) {
        document.getElementById('btn-forgot').addEventListener('click', async () => {
            const email = document.getElementById('login-email').value;
            if(!email) return alert("Saisissez votre email d'abord.");
            if(confirm("Envoyer un lien de réinitialisation à : " + email + " ?")) {
                try { await sendPasswordResetEmail(auth, email); alert("📧 Email envoyé !"); } 
                catch(e) { alert("Erreur : " + e.message); }
            }
        });
    }
    
    if(document.getElementById('btn-import')) document.getElementById('btn-import').addEventListener('click', importerClient);
    if(document.getElementById('btn-save-bdd')) document.getElementById('btn-save-bdd').addEventListener('click', sauvegarderEnBase);
    
    if(document.getElementById('btn-logout')) {
        document.getElementById('btn-logout').addEventListener('click', () => {
            if(confirm("Se déconnecter ?")) { signOut(auth).then(() => window.location.reload()); }
        });
    }

    // Recherche
    const searchInput = document.getElementById('search-client');
    if(searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('#clients-table-body tr').forEach(row => {
                row.style.display = row.textContent.toLowerCase().includes(term) ? '' : 'none';
            });
        });
    }
});

// ==========================================================================
// 2. INTERFACE
// ==========================================================================
window.showSection = function(id) {
    document.getElementById('view-home').classList.add('hidden');
    document.getElementById('view-base').classList.add('hidden');
    document.getElementById('view-admin').classList.add('hidden');
    document.getElementById('view-' + id).classList.remove('hidden');
    if(id === 'base') window.chargerBaseClients();
};

window.toggleSections = function() {
    const type = document.getElementById('prestation').value;
    document.querySelectorAll('.specific-block').forEach(el => el.classList.add('hidden'));
    document.getElementById('btn_inhumation').classList.add('hidden');
    document.getElementById('btn_cremation').classList.add('hidden');
    document.getElementById('btn_rapatriement').classList.add('hidden');

    if(type === 'Inhumation') {
        document.getElementById('bloc_inhumation').classList.remove('hidden');
        document.getElementById('btn_inhumation').classList.remove('hidden');
    } else if(type === 'Crémation') {
        document.getElementById('bloc_cremation').classList.remove('hidden');
        document.getElementById('btn_cremation').classList.remove('hidden');
    } else if(type === 'Rapatriement') {
        document.getElementById('bloc_rapatriement').classList.remove('hidden');
        document.getElementById('btn_rapatriement').classList.remove('hidden');
    }
};

window.togglePolice = function() {
    const val = document.getElementById('type_presence_select').value;
    document.getElementById('police_fields').classList.toggle('hidden', val !== 'police');
    document.getElementById('famille_fields').classList.toggle('hidden', val === 'police');
};

window.toggleVol2 = function() {
    const chk = document.getElementById('check_vol2');
    const bloc = document.getElementById('bloc_vol2');
    if (chk && bloc) {
        if(chk.checked) bloc.classList.remove('hidden');
        else bloc.classList.add('hidden');
    }
};

window.viderFormulaire = function() {
    if(confirm("Annuler le dossier ?")) {
        document.querySelectorAll('#view-admin input').forEach(i => i.value = '');
        document.getElementById('prestation').selectedIndex = 0;
        window.toggleSections();
    }
};

// ==========================================================================
// 3. LOGIQUE DONNÉES
// ==========================================================================
let clientsCache = [];
async function chargerClientsFacturation() {
    const select = document.getElementById('select-import-client');
    if(!select) return;
    try {
        const q = query(collection(db, "factures_v2"), orderBy("date_creation", "desc"));
        const snap = await getDocs(q);
        select.innerHTML = '<option value="">-- Choisir un client facturé --</option>';
        clientsCache = [];
        snap.forEach(doc => {
            const data = doc.data();
            if(data.client) {
                const opt = document.createElement('option');
                opt.value = doc.id; 
                opt.textContent = `${data.client.nom} | ${data.defunt ? data.defunt.nom : '?'}`;
                select.appendChild(opt);
                clientsCache.push({ id: doc.id, data: data });
            }
        });
    } catch (e) { console.error(e); }
}

function importerClient() {
    const id = document.getElementById('select-import-client').value;
    const dossier = clientsCache.find(c => c.id === id);
    if(dossier) {
        const d = dossier.data;
        if(d.client) {
            if(document.getElementById('soussigne')) document.getElementById('soussigne').value = d.client.nom || '';
            if(document.getElementById('demeurant')) document.getElementById('demeurant').value = d.client.adresse || '';
        }
        if(d.defunt) {
            if(document.getElementById('nom')) document.getElementById('nom').value = d.defunt.nom || '';
        }
        alert("✅ Données importées.");
    }
}

async function sauvegarderEnBase() {
    const btn = document.getElementById('btn-save-bdd');
    btn.innerHTML = '...';
    try {
        const dossier = {
            defunt: { nom: getVal('nom'), prenom: getVal('prenom'), date_deces: getVal('date_deces') },
            mandant: { nom: getVal('soussigne') },
            technique: { type_operation: document.getElementById('prestation').value },
            date_creation: new Date().toISOString()
        };
        await addDoc(collection(db, "dossiers_admin"), dossier);
        btn.innerHTML = 'OK';
        setTimeout(() => { btn.innerHTML = 'ENREGISTRER'; window.showSection('base'); }, 1000);
    } catch(e) { alert("Erreur: " + e.message); btn.innerHTML = 'ENREGISTRER'; }
}

window.supprimerDossier = async function(id) {
    if(confirm("⚠️ Supprimer définitivement ce dossier ?")) {
        try {
            await deleteDoc(doc(db, "dossiers_admin", id));
            alert("🗑️ Dossier supprimé.");
            window.chargerBaseClients();
        } catch (e) { alert("Erreur : " + e.message); }
    }
};

window.chargerBaseClients = async function() {
    const tbody = document.getElementById('clients-table-body');
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Chargement...</td></tr>';
    try {
        const q = query(collection(db, "dossiers_admin"), orderBy("date_creation", "desc"));
        const snap = await getDocs(q);
        tbody.innerHTML = '';
        if(snap.empty) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Aucun dossier.</td></tr>'; return; }
        snap.forEach(docSnap => {
            const data = docSnap.data();
            const op = data.technique ? data.technique.type_operation : "Inhumation";
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${new Date(data.date_creation).toLocaleDateString()}</td>
                <td><strong>${data.defunt?.nom || '?'}</strong></td>
                <td>${data.mandant?.nom || '-'}</td>
                <td><span class="badge">${op}</span></td>
                <td style="text-align:center;">
                    <button class="btn-icon" onclick="window.showSection('admin')"><i class="fas fa-edit" style="color:#3b82f6;"></i></button>
                    <button class="btn-icon" onclick="window.supprimerDossier('${docSnap.id}')" style="margin-left:10px;"><i class="fas fa-trash" style="color:#ef4444;"></i></button>
                </td>`;
            tbody.appendChild(tr);
        });
    } catch(e) { console.error(e); }
};

// ==========================================================================
// 4. MOTEUR PDF (VOS FONCTIONS EXPERTES RESTAURÉES)
// ==========================================================================
let logoBase64 = null;
function chargerLogoBase64() {
    const img = document.getElementById('logo-source');
    if (img && img.naturalWidth > 0) {
        const c = document.createElement("canvas"); c.width=img.naturalWidth; c.height=img.naturalHeight;
        c.getContext("2d").drawImage(img,0,0); try{logoBase64=c.toDataURL("image/png");}catch(e){}
    }
}
function ajouterFiligrane(pdf) {
    if (logoBase64) { try { pdf.saveGraphicsState(); pdf.setGState(new pdf.GState({opacity:0.06})); pdf.addImage(logoBase64,'PNG',55,98,100,100); pdf.restoreGraphicsState(); } catch(e){} }
}
function headerPF(pdf, y=20) {
    pdf.setFont("helvetica","bold"); pdf.setTextColor(34,155,76); pdf.setFontSize(12);
    pdf.text("POMPES FUNEBRES SOLIDAIRE PERPIGNAN",105,y,{align:"center"});
    pdf.setTextColor(80); pdf.setFontSize(8); pdf.setFont("helvetica","normal");
    pdf.text("32 boulevard Léon Jean Grégory Thuir - TEL : 07.55.18.27.77",105,y+5,{align:"center"});
    pdf.text("HABILITATION N° : 23-66-0205 | SIRET : 53927029800042",105,y+9,{align:"center"});
    pdf.setDrawColor(34,155,76); pdf.setLineWidth(0.5); pdf.line(40,y+12,170,y+12);
}
function getVal(id) { const el=document.getElementById(id); return el?el.value:""; }
function formatDate(d) { return d?d.split("-").reverse().join("/"): "................."; }

// --- RAPATRIEMENT (STRICT + VOL 2) ---
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
    pdf.text(`Fille de (père) : ${getVal("pere")}`, x, y); y+=6;
    pdf.text(`et de (mère) : ${getVal("mere")}`, x, y); y+=6;
    pdf.text(`Situation familiale : Époux/se de ${getVal("conjoint")}`, x, y); y+=10;
    
    pdf.setFont("helvetica", "bold");
    pdf.text("Moyen de transport :", x+5, y); 
    pdf.line(x+5, y+1, x+45, y+1); y+=10;
    
    pdf.setFont("helvetica", "bold");
    pdf.rect(x+10, y-3, 3, 3, 'F'); pdf.text("Par voie routière :", x+15, y); y+=6;
    pdf.setFont("helvetica", "normal");
    pdf.text(`- Avec le véhicule funéraire immatriculé : ${getVal("rap_immat")}`, x+20, y); y+=5;
    pdf.text(`- Date et heure de départ le : ${getVal("rap_date_dep_route")}`, x+20, y); y+=5;
    pdf.text(`- Lieu de départ : ${getVal("rap_ville_dep")}`, x+20, y); y+=5;
    pdf.text(`- Commune et pays d'arrivée : ${getVal("rap_ville_arr")}`, x+20, y); y+=10;
    
    pdf.setFont("helvetica", "bold");
    pdf.rect(x+10, y-3, 3, 3, 'F'); pdf.text("Par voie aérienne :", x+15, y); y+=6;
    pdf.setFont("helvetica", "normal");
    pdf.text(`- Numéro de LTA : ${getVal("rap_lta")}`, x+20, y); y+=6;
    
    if(getVal("vol1_num")) {
        pdf.setFont("helvetica", "bold");
        pdf.text(`- Vol 1 : ${getVal("vol1_num")}`, x+20, y); y+=5;
        pdf.setFont("helvetica", "normal");
        pdf.text(`  Départ : ${getVal("vol1_dep_aero")} le ${getVal("vol1_dep_time")}`, x+25, y); y+=5;
        pdf.text(`  Arrivée : ${getVal("vol1_arr_aero")} le ${getVal("vol1_arr_time")}`, x+25, y); y+=8;
    }
    
    const chk = document.getElementById('check_vol2');
    if(chk && chk.checked && getVal("vol2_num")) {
        pdf.setFont("helvetica", "bold");
        pdf.text(`- Vol 2 (Correspondance) : ${getVal("vol2_num")}`, x+20, y); y+=5;
        pdf.setFont("helvetica", "normal");
        pdf.text(`  Départ : ${getVal("vol2_dep_aero")} le ${getVal("vol2_dep_time")}`, x+25, y); y+=5;
        pdf.text(`  Arrivée : ${getVal("vol2_arr_aero")} le ${getVal("vol2_arr_time")}`, x+25, y); y+=8;
    }
    
    y+=5;
    pdf.text(`Lieu d'inhumation (Ville – Pays) : ${getVal("rap_ville")} / ${getVal("rap_pays")}`, x, y); y+=20;
    pdf.setFont("helvetica", "bold");
    pdf.text(`Fait à : ${getVal("faita")}, le ${formatDate(getVal("dateSignature"))}`, 120, y); y+=10;
    pdf.text("Signature et cachet :", 120, y);
    pdf.save(`Demande_Rapatriement_Prefecture_${getVal("nom")}.pdf`);
};

// --- AUTRES DOCUMENTS (VOTRE LISTE COMPLETE) ---
window.genererPouvoir = function() {
    if(!logoBase64) chargerLogoBase64(); const {jsPDF}=window.jspdf; const pdf=new jsPDF(); ajouterFiligrane(pdf); headerPF(pdf);
    pdf.setFontSize(16); pdf.setTextColor(185,28,28); pdf.setFont("helvetica","bold"); pdf.text("POUVOIR",105,53,{align:"center"});
    let y=75; const x=25; pdf.setFontSize(10); pdf.setTextColor(0); pdf.setFont("helvetica","normal");
    pdf.text(`Je soussigné(e) : ${getVal("soussigne")}`,x,y); y+=8;
    pdf.text(`Demeurant à : ${getVal("demeurant")}`,x,y); y+=8;
    pdf.text(`Agissant en qualité de : ${getVal("lien")}`,x,y); y+=15;
    pdf.text("Ayant qualité pour pourvoir aux funérailles de :",x,y); y+=8;
    pdf.setDrawColor(200); pdf.setFillColor(250); pdf.rect(x-5,y-5,170,40,'FD');
    pdf.setFont("helvetica","bold"); pdf.text(`${getVal("nom")} ${getVal("prenom")}`,x,y+2); y+=8;
    pdf.setFont("helvetica","normal");
    pdf.text(`Né(e) le ${formatDate(getVal("date_naiss"))} à ${getVal("lieu_naiss")}`,x,y); y+=6;
    pdf.text(`Décédé(e) le ${formatDate(getVal("date_deces"))} à ${getVal("lieu_deces")}`,x,y); y+=6;
    pdf.text(`Domicile : ${getVal("adresse_fr")}`,x,y); y+=12;
    pdf.setFont("helvetica","bold"); pdf.setTextColor(185,28,28); pdf.text(`POUR : ${document.getElementById('prestation').value}`,105,y,{align:"center"}); y+=15;
    pdf.setTextColor(0); pdf.setFont("helvetica","bold");
    pdf.text("Donne mandat aux PF SOLIDAIRE PERPIGNAN pour :",x,y); y+=8;
    pdf.setFont("helvetica","normal");
    pdf.text("- Effectuer toutes les démarches administratives.",x+5,y); y+=6;
    pdf.text("- Signer toute demande d'autorisation nécessaire.",x+5,y); y+=6;
    y = 240; pdf.text(`Fait à ${getVal("faita")}, le ${formatDate(getVal("dateSignature"))}`,x,y);
    pdf.setFont("helvetica","bold"); pdf.text("Signature du Mandant",150,y,{align:"center"});
    pdf.save(`Pouvoir_${getVal("nom")}.pdf`);
};

window.genererDeclaration = function() {
    const {jsPDF}=window.jspdf; const pdf=new jsPDF(); 
    pdf.setFont("times","bold"); pdf.setFontSize(16); pdf.text("DECLARATION DE DECES",105,30,{align:"center"});
    let y=60; 
    pdf.setFontSize(11); pdf.setFont("times","normal");
    pdf.text(`Nom : ${getVal("nom")}`,20,y); y+=10;
    pdf.text(`Prénom : ${getVal("prenom")}`,20,y); y+=10;
    pdf.text(`Date de décès : ${formatDate(getVal("date_deces"))}`,20,y);
    pdf.save(`Declaration_Deces_${getVal("nom")}.pdf`);
};

window.genererDemandeInhumation = function() {
    if(!logoBase64) chargerLogoBase64(); const {jsPDF}=window.jspdf; const pdf=new jsPDF(); headerPF(pdf);
    pdf.text("DEMANDE D'INHUMATION",105,47,{align:"center"});
    pdf.setFont("helvetica","normal"); pdf.setFontSize(11);
    pdf.text(`Je soussigné M. CHERKAOUI, sollicite l'inhumation de ${getVal("nom")}`,20,70);
    pdf.save(`Demande_Inhumation_${getVal("nom")}.pdf`);
};

window.genererDemandeCremation = function() {
    const {jsPDF}=window.jspdf; const pdf=new jsPDF(); headerPF(pdf);
    pdf.text("DEMANDE DE CREMATION",105,47,{align:"center"});
    pdf.text(`Pour : ${getVal("nom")}`,20,70);
    pdf.save(`Demande_Cremation_${getVal("nom")}.pdf`);
};

window.genererDemandeFermetureMairie = function() {
    const { jsPDF } = window.jspdf; const pdf = new jsPDF(); headerPF(pdf);
    pdf.text("DEMANDE FERMETURE CERCUEIL",105,47,{align:"center"});
    pdf.text(`Pour : ${getVal("nom")}`,20,70);
    pdf.save(`Demande_Fermeture_Mairie_${getVal("nom")}.pdf`);
};

window.genererFermeture = function() {
    if(!logoBase64) chargerLogoBase64(); const { jsPDF } = window.jspdf; const pdf = new jsPDF(); ajouterFiligrane(pdf); headerPF(pdf);
    pdf.text("PV FERMETURE CERCUEIL",105,47,{align:"center"});
    pdf.text(`Défunt : ${getVal("nom")}`,20,70);
    pdf.save(`PV_Fermeture_Police_${getVal("nom")}.pdf`);
};

window.genererTransport = function() {
    if(!logoBase64) chargerLogoBase64(); const { jsPDF } = window.jspdf; const pdf = new jsPDF(); headerPF(pdf);
    pdf.text("DECLARATION TRANSPORT",105,47,{align:"center"});
    pdf.text(`Défunt : ${getVal("nom")}`,20,70);
    pdf.save(`Transport_${getVal("nom")}.pdf`);
};

window.genererDemandeOuverture = function() {
    const { jsPDF } = window.jspdf; const pdf = new jsPDF(); headerPF(pdf);
    pdf.text("DEMANDE OUVERTURE SEPULTURE",105,47,{align:"center"});
    pdf.text(`Pour : ${getVal("nom")}`,20,70);
    pdf.save(`Ouverture_Sepulture_${getVal("nom")}.pdf`);
};
