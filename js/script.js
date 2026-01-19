/* Fichier : js/script.js - VERSION FUSIONNÉE (PDF EXPERT + SUPPRESSION) */
// 1. On ajoute 'deleteDoc' et 'doc' dans les imports pour la suppression
import { auth, db, collection, addDoc, getDocs, query, orderBy, onAuthStateChanged, signInWithEmailAndPassword, signOut, deleteDoc, doc } from "./config.js";

// ==========================================================================
// 1. INITIALISATION & NAVIGATION
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    chargerLogoBase64(); 
    const loader = document.getElementById('app-loader');
    
    onAuthStateChanged(auth, (user) => {
        if(loader) loader.style.display = 'none';
        if (user) {
            document.getElementById('login-screen').classList.add('hidden');
            chargerClientsFacturation(); 
            window.chargerBaseClients(); // On charge la liste au démarrage
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
    
    if(document.getElementById('btn-import')) document.getElementById('btn-import').addEventListener('click', importerClient);
    if(document.getElementById('btn-save-bdd')) document.getElementById('btn-save-bdd').addEventListener('click', sauvegarderEnBase);
    
    // Recherche
    const searchInput = document.getElementById('search-client');
    if(searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            const term = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('#clients-table-body tr');
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(term) ? '' : 'none';
            });
        });
    }
});

// Navigation
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
    if(val === 'police') {
        document.getElementById('police_fields').classList.remove('hidden');
        document.getElementById('famille_fields').classList.add('hidden');
    } else {
        document.getElementById('police_fields').classList.add('hidden');
        document.getElementById('famille_fields').classList.remove('hidden');
    }
};

// ==========================================================================
// 2. LOGIQUE MÉTIER (IMPORT / SAVE / DELETE)
// ==========================================================================

window.viderFormulaire = function() {
    if(confirm("Confirmez-vous l'annulation ?")) {
        document.querySelectorAll('#view-admin input').forEach(i => i.value = '');
        document.querySelectorAll('#view-admin select').forEach(s => s.selectedIndex = 0);
        if(document.getElementById('immatriculation')) document.getElementById('immatriculation').value = 'DA-081-ZQ';
        alert("✅ Dossier annulé.");
    }
};

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
    if(!id) return;
    const dossier = clientsCache.find(c => c.id === id);
    if(dossier) {
        const d = dossier.data;
        if(d.client) {
            if(document.getElementById('soussigne')) document.getElementById('soussigne').value = d.client.nom || '';
            if(document.getElementById('demeurant')) document.getElementById('demeurant').value = d.client.adresse || '';
            if(document.getElementById('declarant_nom')) document.getElementById('declarant_nom').value = d.client.nom || '';
            if(document.getElementById('declarant_adresse')) document.getElementById('declarant_adresse').value = d.client.adresse || '';
        }
        if(d.defunt) {
            if(document.getElementById('nom')) document.getElementById('nom').value = d.defunt.nom || '';
            if(document.getElementById('defunt_nom')) document.getElementById('defunt_nom').value = d.defunt.nom || '';
        }
        alert("✅ Données importées.");
    }
}

async function sauvegarderEnBase() {
    const btn = document.getElementById('btn-save-bdd');
    const oldText = btn.innerHTML;
    btn.innerHTML = '...';
    try {
        const dossier = {
            defunt: { nom: getVal('nom'), prenom: getVal('prenom'), date_deces: getVal('date_deces') },
            mandant: { nom: getVal('soussigne') },
            technique: { type_operation: document.getElementById('prestation').value },
            date_creation: new Date().toISOString()
        };
        await addDoc(collection(db, "dossiers_admin"), dossier);
        btn.style.background = "#22c55e"; btn.innerHTML = 'OK';
        setTimeout(() => { 
            btn.innerHTML = oldText; btn.style.background = ""; 
            window.showSection('base'); 
        }, 1500);
    } catch(e) { alert("Erreur: " + e.message); btn.innerHTML = oldText; }
}

// --- FONCTION SUPPRESSION (AJOUTÉE) ---
window.supprimerDossier = async function(id) {
    if(confirm("⚠️ Supprimer définitivement ce dossier ?")) {
        try {
            await deleteDoc(doc(db, "dossiers_admin", id));
            alert("🗑️ Dossier supprimé.");
            window.chargerBaseClients();
        } catch (e) { alert("Erreur suppression: " + e.message); }
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
            const defunt = data.defunt ? `${data.defunt.nom} ${data.defunt.prenom}` : "Inconnu";
            const dateC = new Date(data.date_creation).toLocaleDateString();
            const op = data.technique ? data.technique.type_operation : "Inhumation";
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${dateC}</td>
                <td><strong>${defunt}</strong></td>
                <td>${data.mandant?.nom || '-'}</td>
                <td><span class="badge">${op}</span></td>
                <td style="text-align:center;">
                    <button class="btn-icon" onclick="window.showSection('admin')" title="Modifier"><i class="fas fa-edit" style="color:#3b82f6;"></i></button>
                    <button class="btn-icon" onclick="window.supprimerDossier('${docSnap.id}')" title="Supprimer" style="margin-left:10px;"><i class="fas fa-trash" style="color:#ef4444;"></i></button>
                </td>`;
            tbody.appendChild(tr);
        });
    } catch(e) { console.error(e); tbody.innerHTML = '<tr><td colspan="5">Erreur.</td></tr>'; }
};

window.chargerDossier = function(id) {
    window.showSection('admin');
    alert("Modification à venir. Utilisez l'import pour l'instant.");
};

// ==========================================================================
// 3. MOTEUR PDF & UTILS
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

function getVal(key) {
    const map = {
        'nom': 'nom', 'prenom': 'prenom', 'nom_jeune_fille': 'nom_jeune_fille',
        'date_naiss': 'date_naiss', 'lieu_naiss': 'lieu_naiss',
        'date_deces': 'date_deces', 'lieu_deces': 'lieu_deces', 'heure_deces': 'heure_deces',
        'adresse_fr': 'adresse_fr', 
        'pere': 'pere', 'mere': 'mere', 'matrimoniale': 'matrimoniale',
        'nationalite': 'nationalite', 'conjoint': 'conjoint',
        'soussigne': 'soussigne', 'demeurant': 'demeurant', 'lien': 'lien',
        'lieu_mise_biere': 'lieu_mise_biere', 'date_fermeture': 'date_fermeture', 'lieu_fermeture': 'lieu_fermeture',
        'destination': 'destination', 'vehicule_immat': 'immatriculation', 'chauffeur': 'chauffeur_nom',
        'cimetiere_nom': 'cimetiere_nom', 'num_concession': 'num_concession', 'titulaire_concession': 'titulaire_concession',
        'type_sepulture': 'type_sepulture',
        // Rapatriement
        'rap_pays': 'rap_pays', 'rap_ville': 'rap_ville', 'rap_lta': 'rap_lta',
        'rap_immat': 'rap_immat', 'rap_date_dep_route': 'rap_date_dep_route',
        'rap_ville_dep': 'rap_ville_dep', 'rap_ville_arr': 'rap_ville_arr',
        'vol1_num': 'vol1_num', 'vol1_dep_aero': 'vol1_dep_aero', 'vol1_arr_aero': 'vol1_arr_aero',
        'vol1_dep_time': 'vol1_dep_time', 'vol1_arr_time': 'vol1_arr_time',
        'vol2_num': 'vol2_num', 'vol2_dep_aero': 'vol2_dep_aero', 'vol2_arr_aero': 'vol2_arr_aero',
        'vol2_dep_time': 'vol2_dep_time', 'vol2_arr_time': 'vol2_arr_time',
        'faita': 'faita', 'dateSignature': 'dateSignature'
    };
    const id = map[key] || key;
    const el = document.getElementById(id);
    return el ? el.value : ""; 
}
function formatDate(d) { return d?d.split("-").reverse().join("/"): "................."; }

// ==========================================================================
// 4. FONCTIONS PDF - RESTAURATION COMPLÈTE (VOTRE VERSION)
// ==========================================================================

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
    const conj = getVal("conjoint") ? getVal("conjoint") : "";
    pdf.text(`Situation familiale : Époux/se de ${conj}`, x, y); y+=10;
    
    pdf.setFont("helvetica", "bold"); pdf.setLineWidth(0.5);
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
        pdf.text(`- vol : ${getVal("vol1_num")}`, x+20, y); y+=5;
        pdf.setFont("helvetica", "normal");
        pdf.text(`  > Départ :`, x+25, y); y+=5;
        pdf.text(`    - Aéroport de départ : ${getVal("vol1_dep_aero")}`, x+30, y); y+=5;
        pdf.text(`    - Date et heure de départ le : ${getVal("vol1_dep_time")}`, x+30, y); y+=5;
        pdf.text(`  > Arrivée :`, x+25, y); y+=5;
        pdf.text(`    - Aéroport d'Arrivée : ${getVal("vol1_arr_aero")}`, x+30, y); y+=5;
        pdf.text(`    - Date et heure d'arrivée le : ${getVal("vol1_arr_time")}`, x+30, y); y+=8;
    }
    const chk = document.getElementById('check_vol2');
    if(chk && chk.checked && getVal("vol2_num")) {
        pdf.setFont("helvetica", "bold");
        pdf.text(`- vol : ${getVal("vol2_num")}`, x+20, y); y+=5;
        pdf.setFont("helvetica", "normal");
        pdf.text(`  > Départ :`, x+25, y); y+=5;
        pdf.text(`    - Aéroport de départ : ${getVal("vol2_dep_aero")}`, x+30, y); y+=5;
        pdf.text(`    - Date et heure de départ le : ${getVal("vol2_dep_time")}`, x+30, y); y+=5;
        pdf.text(`  > Arrivée :`, x+25, y); y+=5;
        pdf.text(`    - Aéroport d'Arrivée : ${getVal("vol2_arr_aero")}`, x+30, y); y+=5;
        pdf.text(`    - Date et heure d'arrivée le : ${getVal("vol2_arr_time")}`, x+30, y); y+=8;
    }
    y+=5;
    pdf.text(`Lieu d'inhumation du corps (Ville – Pays) : ${getVal("rap_ville")} / ${getVal("rap_pays")}`, x, y); y+=15;
    pdf.setFont("helvetica", "bold");
    pdf.text(`Fait à   : ${getVal("faita")}`, 140, y); y+=6;
    pdf.text(`Le        : ${formatDate(getVal("dateSignature"))}`, 140, y); y+=15;
    pdf.text("Signature et cachet", 140, y);
    pdf.save(`Demande_Rapatriement_Prefecture_${getVal("nom")}.pdf`);
};

window.genererPouvoir = function() {
    if(!logoBase64) chargerLogoBase64(); const {jsPDF}=window.jspdf; const pdf=new jsPDF(); ajouterFiligrane(pdf); headerPF(pdf);
    let typePresta = document.getElementById('prestation').value.toUpperCase();
    if(typePresta === "RAPATRIEMENT") typePresta += ` vers ${getVal("rap_pays").toUpperCase()}`;
    pdf.setFillColor(241,245,249); pdf.rect(20,45,170,12,'F');
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
    pdf.setFont("helvetica","bold"); pdf.setTextColor(185,28,28); pdf.text(`POUR : ${typePresta}`,105,y,{align:"center"}); y+=15;
    pdf.setTextColor(0); pdf.setFont("helvetica","bold");
    pdf.text("Donne mandat aux PF SOLIDAIRE PERPIGNAN pour :",x,y); y+=8;
    pdf.setFont("helvetica","normal");
    pdf.text("- Effectuer toutes les démarches administratives.",x+5,y); y+=6;
    pdf.text("- Signer toute demande d'autorisation nécessaire.",x+5,y); y+=6;
    if(typePresta.includes("RAPATRIEMENT")) { pdf.text("- Accomplir les formalités consulaires.",x+5,y); y+=6; }
    y = 240; pdf.text(`Fait à ${getVal("faita")}, le ${formatDate(getVal("dateSignature"))}`,x,y);
    pdf.setFont("helvetica","bold"); pdf.text("Signature du Mandant",150,y,{align:"center"});
    pdf.save(`Pouvoir_${getVal("nom")}.pdf`);
};

window.genererDeclaration = function() {
    const {jsPDF}=window.jspdf; const pdf=new jsPDF(); const fontMain="times";
    pdf.setFont(fontMain,"bold"); pdf.setFontSize(16); pdf.text("DECLARATION DE DECES",105,30,{align:"center"});
    pdf.setLineWidth(0.5); pdf.line(75,31,135,31); pdf.setFontSize(11);
    pdf.text("Dans tous les cas à remettre obligatoirement complété et signé",105,38,{align:"center"});
    pdf.line(55,39,155,39);
    let y=60; const margin=20;
    const drawLine=(l,v,yp)=>{
        pdf.setFont(fontMain,"bold"); pdf.text(l,margin,yp);
        let curX=margin+pdf.getTextWidth(l)+2; pdf.setFont(fontMain,"normal");
        while(curX<190){pdf.text(".",curX,yp);curX+=2;}
        if(v){pdf.setFont(fontMain,"bold"); pdf.setFillColor(255); pdf.rect(curX-100,yp-4,80,5,'F'); pdf.text(v.toUpperCase(),margin+pdf.getTextWidth(l)+5,yp);}
    };
    drawLine("NOM : ",getVal("nom"),y); y+=14;
    drawLine("Prénoms : ",getVal("prenom"),y); y+=14;
    drawLine("Né(e) le : ",formatDate(getVal("date_naiss")),y); y+=14;
    pdf.setFont(fontMain,"bold"); pdf.text("DATE ET LIEU DU DECES LE",margin,y);
    pdf.setFont(fontMain,"normal"); pdf.text(formatDate(getVal("date_deces")),margin+70,y);
    pdf.setFont(fontMain,"bold"); pdf.text("A",120,y); pdf.text(getVal("lieu_deces").toUpperCase(),130,y); y+=18;
    drawLine("DOMICILIE(E) : ",getVal("adresse_fr"),y); y+=14;
    drawLine("FILS de :",getVal("pere"),y); y+=14;
    drawLine("Et de :",getVal("mere"),y); y+=14;
    drawLine("Situation : ",getVal("matrimoniale"),y); y+=25;
    pdf.setFont(fontMain,"bold"); pdf.text("SIGNATURE POMPES FUNEBRES",105,y,{align:"center"});
    pdf.save(`Declaration_Deces_${getVal("nom")}.pdf`);
};

window.genererDemandeInhumation = function() {
    if(!logoBase64) chargerLogoBase64(); const {jsPDF}=window.jspdf; const pdf=new jsPDF(); headerPF(pdf);
    pdf.setFillColor(230,240,230); pdf.rect(20,40,170,10,'F');
    pdf.setFontSize(14); pdf.setFont("helvetica","bold"); pdf.setTextColor(0);
    pdf.text("DEMANDE D'INHUMATION",105,47,{align:"center"});
    let y=70; const x=25; pdf.setFontSize(11);
    pdf.text("Monsieur le Maire,",x,y); y+=10;
    pdf.setFont("helvetica","normal");
    pdf.text("Je soussigné M. CHERKAOUI Mustapha, dirigeant des PF Solidaire,",x,y); y+=6;
    pdf.text("Sollicite l'autorisation d'inhumer le défunt :",x,y); y+=12;
    pdf.setFont("helvetica","bold"); pdf.text(`${getVal("nom").toUpperCase()} ${getVal("prenom")}`,x+10,y); y+=6;
    pdf.setFont("helvetica","normal"); pdf.text(`Décédé(e) le ${formatDate(getVal("date_deces"))} à ${getVal("lieu_deces")}`,x+10,y); y+=15;
    pdf.text("Lieu d'inhumation :",x,y); y+=6;
    pdf.setFont("helvetica","bold"); pdf.text(`Cimetière : ${getVal("cimetiere_nom")}`,x+10,y); y+=6;
    pdf.text(`Le : ${formatDate(getVal("date_inhumation"))} à ${getVal("heure_inhumation")}`,x+10,y); y+=6;
    pdf.text(`Concession : ${getVal("num_concession")} (${getVal("type_sepulture")})`,x+10,y); y+=20;
    pdf.setFont("helvetica","normal"); pdf.text("Veuillez agréer, Monsieur le Maire, mes salutations distinguées.",x,y); y+=20;
    pdf.text(`Fait à ${getVal("faita")}, le ${formatDate(getVal("dateSignature"))}`,130,y);
    pdf.save(`Demande_Inhumation_${getVal("nom")}.pdf`);
};

window.genererDemandeCremation = function() {
    const {jsPDF}=window.jspdf; const pdf=new jsPDF(); headerPF(pdf);
    pdf.setFont("times","bold"); pdf.setFontSize(12); pdf.text(getVal("soussigne"),20,45);
    pdf.setFont("times","normal"); pdf.text(getVal("demeurant"),20,51);
    pdf.setFont("times","bold"); pdf.setFontSize(14); pdf.text("Monsieur le Maire",150,60,{align:"center"});
    pdf.setFontSize(12); pdf.text("OBJET : DEMANDE D'AUTORISATION DE CREMATION",20,80);
    let y=100; pdf.setFont("times","normal");
    const txt=`Monsieur le Maire,\n\nJe soussigné(e) ${getVal("soussigne")}, agissant en qualité de ${getVal("lien")}, sollicite l'autorisation de procéder à la crémation de :\n\n${getVal("nom").toUpperCase()} ${getVal("prenom")}\nNé(e) le ${formatDate(getVal("date_naiss"))} et décédé(e) le ${formatDate(getVal("date_deces"))}.\n\nLa crémation aura lieu le ${formatDate(getVal("date_cremation"))} au ${getVal("crematorium_nom")}.\nDestination des cendres : ${getVal("destination_cendres")}.\n\nJe certifie que le défunt n'était pas porteur d'un stimulateur cardiaque.`;
    const split=pdf.splitTextToSize(txt,170); pdf.text(split,20,y);
    y+=(split.length*7)+20;
    pdf.text(`Fait à ${getVal("faita")}, le ${formatDate(getVal("dateSignature"))}`,120,y);
    pdf.setFont("times","bold"); pdf.text("Signature",120,y+8);
    pdf.save(`Demande_Cremation_${getVal("nom")}.pdf`);
};

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
    
    const isPolice = document.querySelector('input[name="type_presence"][value="police"]').checked;
    
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

window.genererTransport = function() {
    if(!logoBase64) chargerLogoBase64();
    const { jsPDF } = window.jspdf; const pdf = new jsPDF();
    pdf.setLineWidth(1); pdf.rect(10, 10, 190, 277);
    headerPF(pdf);
    pdf.setFillColor(200); pdf.rect(10, 35, 190, 15, 'F');
    const labelT = document.querySelector('input[name="transport_type"]:checked').value === "avant" ? "AVANT MISE EN BIÈRE" : "APRÈS MISE EN BIÈRE";
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
    pdf.text(`Fait à ${getVal("faita_transport")}, le ${formatDate(getVal("dateSignature_transport"))}`, 120, y);
    pdf.text("Cachet de l'entreprise :", 120, y+10);
    pdf.save(`Transport_${getVal("nom")}.pdf`);
};

window.genererDemandeOuverture = function() {
    const { jsPDF } = window.jspdf; const pdf = new jsPDF();
    const type = document.getElementById('prestation').value; 
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
