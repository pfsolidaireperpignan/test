/**
 * ====================================================================
 * PF SOLIDAIRE ERP - LOGIC V15 (STOCKS + GED PLAN B + COMPLET)
 * ====================================================================
 */

import { auth, db, collection, addDoc, getDocs, getDoc, query, orderBy, onAuthStateChanged, signInWithEmailAndPassword, signOut, deleteDoc, updateDoc, doc, sendPasswordResetEmail } from "./config.js";

// Variable Globale pour la GED (Plan B)
window.current_pieces_jointes = []; 

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
            window.chargerBaseClients(); 
            chargerClientsFacturation(); 
            window.chargerStock(); // Chargement initial du stock
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

    if(document.getElementById('btn-forgot')) {
        document.getElementById('btn-forgot').addEventListener('click', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            if(!email) return alert("⚠️ Veuillez d'abord écrire votre EMAIL dans la case 'Email'.");
            if(confirm("Envoyer un lien de réinitialisation à : " + email + " ?")) {
                try { 
                    await sendPasswordResetEmail(auth, email); 
                    alert("📧 Email envoyé ! Vérifiez votre boîte de réception."); 
                } catch(e) { alert("Erreur : " + e.message); }
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
// 2. LOGIQUE INTERFACE (NAVIGATION & ONGLETS)
// ==========================================================================
window.showSection = function(id) {
    // Masquer toutes les vues
    document.getElementById('view-home').classList.add('hidden');
    document.getElementById('view-base').classList.add('hidden');
    document.getElementById('view-admin').classList.add('hidden');
    document.getElementById('view-stock').classList.add('hidden'); 
    
    // Afficher la bonne vue
    document.getElementById('view-' + id).classList.remove('hidden');
    
    // Actions spécifiques
    if(id === 'base') window.chargerBaseClients();
    if(id === 'stock') window.chargerStock();
};

window.switchAdminTab = function(tabName) {
    document.getElementById('tab-content-identite').classList.add('hidden');
    document.getElementById('tab-content-technique').classList.add('hidden');
    document.getElementById('tab-btn-identite').classList.remove('active');
    document.getElementById('tab-btn-technique').classList.remove('active');
    
    document.getElementById('tab-content-' + tabName).classList.remove('hidden');
    document.getElementById('tab-btn-' + tabName).classList.add('active');
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

window.copierMandant = function() {
    const chk = document.getElementById('copy_mandant');
    if(chk && chk.checked) {
        const civ = document.getElementById('civilite_mandant').value;
        document.getElementById('f_nom_prenom').value = civ + " " + document.getElementById('soussigne').value;
        document.getElementById('f_lien').value = document.getElementById('lien').value;
    }
};

window.viderFormulaire = function() {
    if(confirm("Vider le formulaire pour un NOUVEAU dossier ?")) {
        document.getElementById('dossier_id').value = ""; 
        document.querySelectorAll('#view-admin input').forEach(i => i.value = '');
        document.getElementById('prestation').selectedIndex = 0;
        document.getElementById('faita').value = "PERPIGNAN"; 
        document.getElementById('immatriculation').value = "DA-081-ZQ";
        document.getElementById('rap_immat').value = "DA-081-ZQ";
        if(document.getElementById('check_vol2')) document.getElementById('check_vol2').checked = false;
        if(document.getElementById('copy_mandant')) document.getElementById('copy_mandant').checked = false;
        
        // --- VIDER LA GED (NOUVEAU V15) ---
        window.current_pieces_jointes = [];
        if(window.afficherPiecesJointes) window.afficherPiecesJointes();
        // ----------------------------------

        window.toggleSections();
        document.getElementById('btn-save-bdd').innerHTML = '<i class="fas fa-save"></i> ENREGISTRER';
    }
};

// ==========================================================================
// 3. GESTION DES STOCKS (MODULE V11)
// ==========================================================================
window.openAjoutStock = function() {
    document.getElementById('form-stock').classList.remove('hidden');
    document.getElementById('st_nom').value = "";
    document.getElementById('st_qte').value = "1";
    document.getElementById('st_pa').value = "";
    document.getElementById('st_pv').value = "";
    document.getElementById('st_fourn').value = "";
};

window.ajouterArticleStock = async function() {
    const nom = document.getElementById('st_nom').value;
    const cat = document.getElementById('st_cat').value;
    const qte = parseInt(document.getElementById('st_qte').value) || 0;
    const pa = parseFloat(document.getElementById('st_pa').value) || 0;
    const pv = parseFloat(document.getElementById('st_pv').value) || 0;
    const fourn = document.getElementById('st_fourn').value;

    if(!nom) return alert("Le nom de l'article est obligatoire.");

    try {
        await addDoc(collection(db, "stock_articles"), {
            nom, categorie: cat, qte, prix_achat: pa, prix_vente: pv, fournisseur: fourn,
            date_ajout: new Date().toISOString()
        });
        alert("✅ Article ajouté !");
        document.getElementById('form-stock').classList.add('hidden');
        window.chargerStock();
    } catch(e) { alert("Erreur : " + e.message); }
};

window.chargerStock = async function() {
    const tbody = document.getElementById('stock-table-body');
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">Chargement...</td></tr>';
    
    try {
        const q = query(collection(db, "stock_articles"), orderBy("nom"));
        const snap = await getDocs(q);
        tbody.innerHTML = '';
        
        if(snap.empty) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">Aucun article en stock.</td></tr>'; return; }

        snap.forEach(docSnap => {
            const data = docSnap.data();
            const alertClass = (data.qte < 3) ? 'stock-alert' : 'stock-ok';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${data.nom}</strong><br><small style="color:#64748b;">${data.fournisseur || ''}</small></td>
                <td>${data.categorie}</td>
                <td>${data.prix_achat ? data.prix_achat.toFixed(2) : '0.00'} €</td>
                <td><strong>${data.prix_vente ? data.prix_vente.toFixed(2) : '0.00'} €</strong></td>
                <td style="white-space:nowrap;">
                    <button class="btn-icon" style="background:#fee2e2; color:#ef4444; border-color:#fca5a5; padding:2px 8px; margin-right:5px;" onclick="window.updateStock('${docSnap.id}', -1)" title="Sortie Stock (-1)">-</button>
                    <span class="badge ${alertClass}" style="font-size:1rem; padding:5px 12px;">${data.qte}</span>
                    <button class="btn-icon" style="background:#dcfce7; color:#16a34a; border-color:#86efac; padding:2px 8px; margin-left:5px;" onclick="window.updateStock('${docSnap.id}', 1)" title="Entrée Stock (+1)">+</button>
                </td>
                <td style="text-align:center;">
                    <button class="btn-icon" onclick="window.supprimerArticle('${docSnap.id}')" title="Supprimer la référence"><i class="fas fa-trash" style="color:red;"></i></button>
                </td>`;
            tbody.appendChild(tr);
        });
    } catch(e) { console.error(e); }
};

window.updateStock = async function(id, delta) {
    try {
        const docRef = doc(db, "stock_articles", id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const currentQte = docSnap.data().qte || 0;
            const newQte = currentQte + delta;
            if (newQte < 0) { alert("Impossible : Le stock ne peut pas être négatif."); return; }
            await updateDoc(docRef, { qte: newQte });
            window.chargerStock();
        }
    } catch(e) { alert("Erreur mise à jour stock : " + e.message); }
};

window.supprimerArticle = async function(id) {
    if(confirm("Supprimer cet article du stock ?")) {
        try {
            await deleteDoc(doc(db, "stock_articles", id));
            window.chargerStock();
        } catch(e) { alert("Erreur : " + e.message); }
    }
};

// ==========================================================================
// 4. DONNÉES DOSSIERS & FACTURATION
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
                const civC = data.client.civility || "";
                const nomClient = data.client.nom || "Inconnu";
                const nomDefunt = (data.defunt && data.defunt.nom) ? data.defunt.nom : "Inconnu";
                opt.textContent = `${civC} ${nomClient} (Défunt: ${nomDefunt})`;
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
            if(document.getElementById('civilite_mandant')) document.getElementById('civilite_mandant').value = d.client.civility || "M.";
        }
        if(d.defunt) {
            if(document.getElementById('nom')) document.getElementById('nom').value = d.defunt.nom || '';
            if(document.getElementById('civilite_defunt')) document.getElementById('civilite_defunt').value = d.defunt.civility || "M.";
        }
        alert("✅ Données importées.");
    }
}

async function sauvegarderEnBase() {
    const btn = document.getElementById('btn-save-bdd');
    const dossierId = document.getElementById('dossier_id').value;
    btn.innerHTML = '...';
    try {
        const dossierData = {
            defunt: { 
                civility: getVal('civilite_defunt'),
                nom: getVal('nom'), prenom: getVal('prenom'), nom_jeune_fille: getVal('nom_jeune_fille'),
                date_deces: getVal('date_deces'), lieu_deces: getVal('lieu_deces'), heure_deces: getVal('heure_deces'),
                date_naiss: getVal('date_naiss'), lieu_naiss: getVal('lieu_naiss'), nationalite: getVal('nationalite'),
                adresse: getVal('adresse_fr'), pere: getVal('pere'), mere: getVal('mere'),
                situation: getVal('matrimoniale'), conjoint: getVal('conjoint'), 
                profession: getVal('prof_type'), profession_libelle: getVal('profession_libelle') 
            },
            mandant: { 
                civility: getVal('civilite_mandant'),
                nom: getVal('soussigne'), lien: getVal('lien'), adresse: getVal('demeurant') 
            },
            
            // --- AJOUT V15 : SAUVEGARDE DES PIÈCES JOINTES GED ---
            pieces_jointes: window.current_pieces_jointes || [],
            // -----------------------------------------------------

            technique: { 
                type_operation: document.getElementById('prestation').value,
                mise_biere: getVal('lieu_mise_biere'), date_fermeture: getVal('date_fermeture'),
                vehicule: getVal('immatriculation'), presence: document.getElementById('type_presence_select').value,
                police: { nom: getVal('p_nom_grade'), comm: getVal('p_commissariat') },
                famille: { temoin: getVal('f_nom_prenom'), lien: getVal('f_lien') },
                transport_avant: {
                    lieu_dep: getVal('av_lieu_depart'), lieu_arr: getVal('av_lieu_arrivee'),
                    date_dep: getVal('av_date_dep'), heure_dep: getVal('av_heure_dep'),
                    date_arr: getVal('av_date_arr'), heure_arr: getVal('av_heure_arr')
                },
                transport_apres: {
                    lieu_dep: getVal('ap_lieu_depart'), lieu_arr: getVal('ap_lieu_arrivee'),
                    date_dep: getVal('ap_date_dep'), heure_dep: getVal('ap_heure_dep'),
                    date_arr: getVal('ap_date_arr'), heure_arr: getVal('ap_heure_arr')
                },
                faita: getVal('faita'), dateSignature: getVal('dateSignature')
            },
            details_op: {
                cimetiere: getVal('cimetiere_nom'), concession: getVal('num_concession'), titulaire: getVal('titulaire_concession'),
                crematorium: getVal('crematorium_nom'), dest_cendres: getVal('destination_cendres'), type_sepulture: getVal('type_sepulture'),
                rapa_pays: getVal('rap_pays'), rapa_ville: getVal('rap_ville'), rapa_lta: getVal('rap_lta'),
                vol1: getVal('vol1_num'), vol2: getVal('vol2_num'),
                rapa_route: { immat: getVal('rap_immat'), dep_date: getVal('rap_date_dep_route'), ville_dep: getVal('rap_ville_dep'), ville_arr: getVal('rap_ville_arr') },
                vol_details: { 
                    v1_dep: getVal('vol1_dep_aero'), v1_arr: getVal('vol1_arr_aero'), v1_dtime: getVal('vol1_dep_time'), v1_atime: getVal('vol1_arr_time'),
                    v2_dep: getVal('vol2_dep_aero'), v2_arr: getVal('vol2_arr_aero'), v2_dtime: getVal('vol2_dep_time'), v2_atime: getVal('vol2_arr_time')
                }
            },
            date_modification: new Date().toISOString()
        };

        if (dossierId) {
            await updateDoc(doc(db, "dossiers_admin", dossierId), dossierData);
            alert("✅ Dossier mis à jour !");
        } else {
            dossierData.date_creation = new Date().toISOString(); 
            await addDoc(collection(db, "dossiers_admin"), dossierData);
            alert("✅ Dossier créé !");
        }
        btn.innerHTML = 'OK';
        setTimeout(() => { btn.innerHTML = '<i class="fas fa-save"></i> ENREGISTRER'; window.showSection('base'); }, 1000);
    } catch(e) { alert("Erreur: " + e.message); btn.innerHTML = '<i class="fas fa-save"></i> ENREGISTRER'; }
}

window.chargerDossier = async function(id) {
    try {
        const docRef = doc(db, "dossiers_admin", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            window.showSection('admin');
            document.getElementById('dossier_id').value = id;
            document.getElementById('btn-save-bdd').innerHTML = '<i class="fas fa-edit"></i> MODIFIER';

            // --- CHARGEMENT GED (NOUVEAU V15) ---
            if (data.pieces_jointes) {
                window.current_pieces_jointes = data.pieces_jointes;
            } else {
                window.current_pieces_jointes = [];
            }
            if(window.afficherPiecesJointes) window.afficherPiecesJointes();
            // ------------------------------------

            if(data.defunt) {
                if(data.defunt.civility) document.getElementById('civilite_defunt').value = data.defunt.civility;
                setVal('nom', data.defunt.nom); setVal('prenom', data.defunt.prenom); setVal('nom_jeune_fille', data.defunt.nom_jeune_fille);
                setVal('date_deces', data.defunt.date_deces); setVal('lieu_deces', data.defunt.lieu_deces); setVal('heure_deces', data.defunt.heure_deces);
                setVal('date_naiss', data.defunt.date_naiss); setVal('lieu_naiss', data.defunt.lieu_naiss); setVal('nationalite', data.defunt.nationalite);
                setVal('adresse_fr', data.defunt.adresse); setVal('pere', data.defunt.pere); setVal('mere', data.defunt.mere);
                setVal('conjoint', data.defunt.conjoint);
                if(data.defunt.situation) document.getElementById('matrimoniale').value = data.defunt.situation;
                if(data.defunt.profession) document.getElementById('prof_type').value = data.defunt.profession;
                setVal('profession_libelle', data.defunt.profession_libelle); 
            }
            if(data.mandant) {
                if(data.mandant.civility) document.getElementById('civilite_mandant').value = data.mandant.civility;
                setVal('soussigne', data.mandant.nom); setVal('lien', data.mandant.lien); setVal('demeurant', data.mandant.adresse);
            }
            if(data.technique) {
                document.getElementById('prestation').value = data.technique.type_operation || "Inhumation";
                setVal('lieu_mise_biere', data.technique.mise_biere); setVal('date_fermeture', data.technique.date_fermeture);
                setVal('immatriculation', data.technique.vehicule); document.getElementById('type_presence_select').value = data.technique.presence || "famille";
                if(data.technique.police) { setVal('p_nom_grade', data.technique.police.nom); setVal('p_commissariat', data.technique.police.comm); }
                if(data.technique.famille) { setVal('f_nom_prenom', data.technique.famille.temoin); setVal('f_lien', data.technique.famille.lien); }
                
                if(data.technique.transport_avant) {
                    setVal('av_lieu_depart', data.technique.transport_avant.lieu_dep); setVal('av_lieu_arrivee', data.technique.transport_avant.lieu_arr);
                    setVal('av_date_dep', data.technique.transport_avant.date_dep); setVal('av_heure_dep', data.technique.transport_avant.heure_dep);
                    setVal('av_date_arr', data.technique.transport_avant.date_arr); setVal('av_heure_arr', data.technique.transport_avant.heure_arr);
                }
                if(data.technique.transport_apres) {
                    setVal('ap_lieu_depart', data.technique.transport_apres.lieu_dep); setVal('ap_lieu_arrivee', data.technique.transport_apres.lieu_arr);
                    setVal('ap_date_dep', data.technique.transport_apres.date_dep); setVal('ap_heure_dep', data.technique.transport_apres.heure_dep);
                    setVal('ap_date_arr', data.technique.transport_apres.date_arr); setVal('ap_heure_arr', data.technique.transport_apres.heure_arr);
                }
                setVal('faita', data.technique.faita); setVal('dateSignature', data.technique.dateSignature);
            }
            if(data.details_op) {
                setVal('cimetiere_nom', data.details_op.cimetiere); setVal('num_concession', data.details_op.concession); setVal('titulaire_concession', data.details_op.titulaire);
                setVal('crematorium_nom', data.details_op.crematorium); setVal('destination_cendres', data.details_op.dest_cendres); 
                if(data.details_op.type_sepulture) document.getElementById('type_sepulture').value = data.details_op.type_sepulture;
                
                setVal('rap_pays', data.details_op.rapa_pays); setVal('rap_ville', data.details_op.rapa_ville); setVal('rap_lta', data.details_op.rapa_lta);
                setVal('vol1_num', data.details_op.vol1); setVal('vol2_num', data.details_op.vol2);
                
                if(data.details_op.rapa_route) {
                    setVal('rap_immat', data.details_op.rapa_route.immat); setVal('rap_date_dep_route', data.details_op.rapa_route.dep_date);
                    setVal('rap_ville_dep', data.details_op.rapa_route.ville_dep); setVal('rap_ville_arr', data.details_op.rapa_route.ville_arr);
                }
                if(data.details_op.vol_details) {
                    setVal('vol1_dep_aero', data.details_op.vol_details.v1_dep); setVal('vol1_arr_aero', data.details_op.vol_details.v1_arr);
                    setVal('vol1_dep_time', data.details_op.vol_details.v1_dtime); setVal('vol1_arr_time', data.details_op.vol_details.v1_atime);
                    setVal('vol2_dep_aero', data.details_op.vol_details.v2_dep); setVal('vol2_arr_aero', data.details_op.vol_details.v2_arr);
                    setVal('vol2_dep_time', data.details_op.vol_details.v2_dtime); setVal('vol2_arr_time', data.details_op.vol_details.v2_atime);
                }
            }
            window.toggleSections(); window.togglePolice();
            if(document.getElementById('vol2_num').value) { document.getElementById('check_vol2').checked = true; window.toggleVol2(); }
        } else { alert("Dossier introuvable."); }
    } catch (e) { alert("Erreur Chargement : " + e.message); }
};

function setVal(id, val) { const el = document.getElementById(id); if(el) el.value = val || ""; }

window.supprimerDossier = async function(id) {
    if(confirm("⚠️ Supprimer définitivement ?")) {
        try { await deleteDoc(doc(db, "dossiers_admin", id)); alert("🗑️ Dossier supprimé."); window.chargerBaseClients(); } 
        catch (e) { alert("Erreur : " + e.message); }
    }
};

window.goToFacturation = function(nomDefunt) {
    if(nomDefunt) {
        window.location.href = `facturation_v2.html?search=${encodeURIComponent(nomDefunt)}`;
    } else {
        window.location.href = `facturation_v2.html`;
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
            const nomD = (data.defunt?.civility || "") + " " + (data.defunt?.nom || '?');
            const nomM = (data.mandant?.civility || "") + " " + (data.mandant?.nom || '-');
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${new Date(data.date_creation).toLocaleDateString()}</td>
                <td><strong>${nomD}</strong></td>
                <td>${nomM}</td>
                <td><span class="badge">${op}</span></td>
                <td style="text-align:center; display:flex; justify-content:center; gap:5px;">
                    <button class="btn-icon" onclick="window.chargerDossier('${docSnap.id}')" title="Modifier"><i class="fas fa-edit" style="color:#3b82f6;"></i></button>
                    <button class="btn-icon" onclick="window.goToFacturation('${data.defunt?.nom || ''}')" title="Voir Factures"><i class="fas fa-file-invoice-dollar" style="color:#10b981;"></i></button>
                    <button class="btn-icon" onclick="window.supprimerDossier('${docSnap.id}')" style="margin-left:5px;"><i class="fas fa-trash" style="color:#ef4444;"></i></button>
                </td>`;
            tbody.appendChild(tr);
        });
    } catch(e) { console.error(e); }
};

// ==========================================================================
// 5. MOTEUR PDF (DESIGN COMPLET + FIXES V10.2)
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
function getVal(id) { return document.getElementById(id) ? document.getElementById(id).value : ""; }
function formatDate(d) { return d?d.split("-").reverse().join("/"): "................."; }

// --- 1. POUVOIR ---
window.genererPouvoir = function() {
    if(!logoBase64) chargerLogoBase64(); const {jsPDF}=window.jspdf; const pdf=new jsPDF(); ajouterFiligrane(pdf); headerPF(pdf);
    let typePresta = document.getElementById('prestation').value.toUpperCase();
    if(typePresta === "RAPATRIEMENT") typePresta += ` vers ${getVal("rap_pays").toUpperCase()}`;
    pdf.setFillColor(241,245,249); pdf.rect(20,45,170,12,'F');
    pdf.setFontSize(16); pdf.setTextColor(185,28,28); pdf.setFont("helvetica","bold"); pdf.text("POUVOIR",105,53,{align:"center"});
    let y=75; const x=25; pdf.setFontSize(10); pdf.setTextColor(0); pdf.setFont("helvetica","normal");
    pdf.text(`Je soussigné(e) : ${getVal("civilite_mandant")} ${getVal("soussigne")}`,x,y); y+=8;
    pdf.text(`Demeurant à : ${getVal("demeurant")}`,x,y); y+=8;
    pdf.text(`Agissant en qualité de : ${getVal("lien")}`,x,y); y+=15;
    pdf.text("Ayant qualité pour pourvoir aux funérailles de :",x,y); y+=8;
    pdf.setDrawColor(200); pdf.setFillColor(250); pdf.rect(x-5,y-5,170,40,'FD');
    pdf.setFont("helvetica","bold"); pdf.text(`${getVal("civilite_defunt")} ${getVal("nom")} ${getVal("prenom")}`,x,y+2); y+=8;
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

// --- 2. RAPATRIEMENT (AVEC HORAIRES DE VOL) ---
window.genererDemandeRapatriement = function() {
    if(!logoBase64) chargerLogoBase64(); 
    const { jsPDF } = window.jspdf; 
    const pdf = new jsPDF();
    
    // --- EN-TÊTE (Sans logo texte, Titre centré) ---
    pdf.setDrawColor(0); pdf.setLineWidth(0.5); pdf.setFillColor(240, 240, 240);
    // Cadre centré
    pdf.rect(15, 15, 180, 25, 'FD'); 

    // Textes centrés
    pdf.setTextColor(0); pdf.setFont("helvetica", "bold"); pdf.setFontSize(14);
    pdf.text("DEMANDE D'AUTORISATION DE TRANSPORT DE CORPS", 105, 23, {align:"center"});
    
    pdf.setFontSize(10); pdf.setFont("helvetica", "normal");
    pdf.text("Dans le cas où la fermeture de cercueil a lieu dans les Pyrénées-Orientales", 105, 30, {align:"center"});
    pdf.text("(Article R.2213-22 du code général des collectivités territoriales)", 105, 36, {align:"center"});

    let y = 55; const x = 15;
    
    // --- OPERATEUR ---
    pdf.setFontSize(10); pdf.setFont("helvetica", "normal");
    pdf.text("Je soussigné(e) (nom et prénom) : ", x, y); 
    pdf.setFont("helvetica", "bold"); pdf.text("CHERKAOUI MUSTAPHA", x+60, y); y+=6;
    
    pdf.setFont("helvetica", "normal"); pdf.text("Représentant légal de : ", x, y); 
    pdf.setFont("helvetica", "bold"); pdf.text("Pompes Funèbres Solidaire Perpignan, 32 boulevard Léon Jean Grégory Thuir", x+40, y); y+=6;
    
    pdf.setFont("helvetica", "normal"); pdf.text("Habilitée sous le n° : ", x, y); 
    pdf.setFont("helvetica", "bold"); pdf.text("23-66-0205", x+35, y); y+=6;
    
    pdf.setFont("helvetica", "normal"); 
    pdf.text("Dûment mandaté par la famille de la défunte, sollicite l'autorisation de faire transporter en dehors du", x, y); y+=5;
    pdf.text("territoire métropolitain le corps après mise en bière de :", x, y); y+=10;
    
    // --- DÉFUNT ---
    pdf.text("Nom et prénom de la défunte : ", x, y); 
    pdf.setFont("helvetica", "bold"); pdf.text(`${getVal("nom").toUpperCase()} ${getVal("prenom")}`, x+55, y); y+=6;
    
    pdf.setFont("helvetica", "normal");
    pdf.text(`Date et lieu de naissance   :  ${formatDate(getVal("date_naiss"))}`, x, y); 
    pdf.text(`à   ${getVal("lieu_naiss")}`, x+80, y); y+=6;
    
    pdf.text(`Décédé(e) le                      :  ${formatDate(getVal("date_deces"))}`, x, y); 
    pdf.text(`à   ${getVal("lieu_deces")}`, x+80, y); y+=8;
    
    // --- FILIATION & SITUATION (Ajouté comme le modèle) ---
    pdf.setFont("helvetica", "normal"); pdf.text("Fille/Fils de (père) : ", x, y); 
    pdf.setFont("helvetica", "bold"); pdf.text(getVal("pere") || "", x+35, y); y+=6;
    
    pdf.setFont("helvetica", "normal"); pdf.text("et de (mère) : ", x, y); 
    pdf.setFont("helvetica", "bold"); pdf.text(getVal("mere") || "", x+35, y); y+=6;
    
    let situation = getVal("matrimoniale");
    const conjoint = getVal("conjoint");
    if(conjoint && conjoint.trim() !== "") {
        if(situation.includes("Veuf")) situation = "Veuve de " + conjoint;
        else if(situation.includes("Marié")) situation = "Epoux(se) de " + conjoint;
        else situation = situation + " " + conjoint;
    }
    
    pdf.setFont("helvetica", "normal"); pdf.text("Situation familiale : ", x, y); 
    pdf.setFont("helvetica", "bold"); pdf.text(situation, x+35, y); y+=10;

    // --- TRANSPORT (CORRECTION DES SYMBOLES) ---
    pdf.setFont("helvetica", "bold"); pdf.text("Moyen de transport :", x+5, y); 
    pdf.setLineWidth(0.3); pdf.line(x+5, y+1, x+40, y+1); // Soulignement manuel propre
    y+=8;

    // SECTION ROUTIÈRE
    pdf.rect(x+5, y-3, 2, 2, 'F'); // Petit carré noir dessiné (plus sûr qu'un caractère)
    pdf.text("Par voie routière :", x+10, y); y+=6;
    
    pdf.setFont("helvetica", "normal");
    // Utilisation de ">" au lieu de "➢" pour éviter les bugs d'affichage
    pdf.text(`> Avec le véhicule funéraire immatriculé : ${getVal("rap_immat")}`, x+15, y); y+=5;
    pdf.text(`> Date et heure de départ le : ${getVal("rap_date_dep_route")}`, x+15, y); y+=5;
    pdf.text(`> Lieu de départ : ${getVal("rap_ville_dep")}`, x+15, y); y+=5;
    pdf.text(`> Commune et pays d'arrivée : ${getVal("rap_ville_arr")}`, x+15, y); y+=8;
    
    // SECTION AÉRIENNE
    pdf.setFont("helvetica", "bold");
    pdf.rect(x+5, y-3, 2, 2, 'F'); // Petit carré noir
    pdf.text("Par voie aérienne :", x+10, y); y+=6;
    
    pdf.setFont("helvetica", "normal");
    pdf.text(`> Numéro de LTA : ${getVal("rap_lta")}`, x+15, y); y+=5;
    
    if(getVal("vol1_num")) { 
        // Utilisation de "-" pour les sous-listes (plus propre que "✓" qui bug)
        pdf.text(`- Vol 1 : ${getVal("vol1_num")} (${getVal("vol1_dep_aero")} -> ${getVal("vol1_arr_aero")})`, x+25, y); y+=5;
        pdf.text(`- Départ : ${getVal("vol1_dep_time")}`, x+25, y); y+=5;
        pdf.text(`- Arrivée : ${getVal("vol1_arr_time")}`, x+25, y); y+=5;
    }
    
    if(document.getElementById('check_vol2').checked && getVal("vol2_num")) { 
        pdf.text(`- Vol 2 : ${getVal("vol2_num")} (${getVal("vol2_dep_aero")} -> ${getVal("vol2_arr_aero")})`, x+25, y); y+=5;
        pdf.text(`- Départ : ${getVal("vol2_dep_time")}`, x+25, y); y+=5;
        pdf.text(`- Arrivée : ${getVal("vol2_arr_time")}`, x+25, y); y+=5;
    }
    
    y+=5;
    pdf.setFont("helvetica", "normal");
    pdf.text(`Lieu d'inhumation du corps (Ville – Pays) : `, x, y);
    pdf.setFont("helvetica", "bold"); pdf.text(`${getVal("rap_ville")} (${getVal("rap_pays")})`, x+70, y); y+=20;
    
    // PIED DE PAGE
    pdf.setFont("helvetica", "normal");
    pdf.text(`Fait à : ${getVal("faita")}`, 130, y); y+=6;
    pdf.text(`Le : ${formatDate(getVal("dateSignature"))}`, 130, y); y+=10;
    pdf.setFont("helvetica", "bold");
    pdf.text("Signature et cachet :", 130, y);
    
    pdf.save(`Demande_Rapatriement_Prefecture_${getVal("nom")}.pdf`);
};
// --- 3. DÉCLARATION DÉCÈS (AVEC PROFESSION & MENTION CONJOINT) ---
window.genererDeclaration = function() {
    const { jsPDF } = window.jspdf; const pdf = new jsPDF(); const fontMain = "times";
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
    pdf.setFont(fontMain, "normal"); pdf.text(formatDate(getVal("date_deces")), margin+70, y);
    pdf.setFont(fontMain, "bold"); pdf.text("A", 120, y); pdf.text(getVal("lieu_deces").toUpperCase(), 130, y); y += 18;
    
    pdf.text("PROFESSION : ", margin, y); y+=8;
    const prof = getVal("prof_type");
    pdf.setFont(fontMain, "normal");
    
    pdf.rect(margin+5, y-4, 5, 5); 
    if(prof === "Sans profession") pdf.text("X", margin+6, y); 
    pdf.text("Sans profession", margin+15, y);
    
    pdf.rect(margin+60, y-4, 5, 5); 
    if(prof === "Retraité(e)") pdf.text("X", margin+61, y); 
    pdf.text("retraité(e)", margin+70, y);
    
    if(prof === "Active") {
        const metier = getVal("profession_libelle") || "Active";
        pdf.setFont(fontMain, "bold");
        pdf.text(metier.toUpperCase(), margin+110, y); 
    }
    
    y += 15;
    
    drawLine("DOMICILIE(E) ", getVal("adresse_fr"), y); y+=14;
    drawLine("FILS OU FILLE de (Père) :", getVal("pere"), y); y+=14;
    drawLine("Et de (Mère) :", getVal("mere"), y); y+=14;

    // --- LOGIQUE MENTION CONJOINT ---
    let situation = getVal("matrimoniale");
    const nomConjoint = getVal("conjoint");
    if (nomConjoint && nomConjoint.trim() !== "") {
        if (situation.includes("Marié")) situation = `MARIÉ(E) À ${nomConjoint}`;
        else if (situation.includes("Veuf")) situation = `VEUF(VE) DE ${nomConjoint}`;
        else if (situation.includes("Divorcé")) situation = `DIVORCÉ(E) DE ${nomConjoint}`;
    }
    drawLine("Situation Matrimoniale : ", situation, y); y+=14;
    
    drawLine("NATIONALITE : ", getVal("nationalite"), y); y+=25;
    pdf.setFont(fontMain, "bold"); pdf.text("NOM ET SIGNATURE DES POMPES FUNEBRES", 105, y, { align: "center" });
    pdf.save(`Declaration_Deces_${getVal("nom")}.pdf`);
};

// --- 4. DEMANDE INHUMATION ---
window.genererDemandeInhumation = function() {
    if(!logoBase64) chargerLogoBase64(); const { jsPDF } = window.jspdf; const pdf = new jsPDF(); headerPF(pdf);
    pdf.setFillColor(230, 240, 230); pdf.rect(20, 40, 170, 10, 'F');
    pdf.setFontSize(14); pdf.setFont("helvetica", "bold"); pdf.setTextColor(0);
    pdf.text("DEMANDE D'INHUMATION", 105, 47, { align: "center" });
    let y = 70; const x = 25;
    pdf.setFontSize(11); pdf.text("Monsieur le Maire,", x, y); y+=10;
    pdf.setFont("helvetica", "normal");
    pdf.text("Je soussigné M. CHERKAOUI Mustapha, dirigeant des PF Solidaire,", x, y); y+=6;
    pdf.text("Sollicite l'autorisation d'inhumer le défunt :", x, y); y+=12;
    pdf.setFont("helvetica", "bold"); pdf.text(`${getVal("civilite_defunt")} ${getVal("nom").toUpperCase()} ${getVal("prenom")}`, x+10, y); y+=6;
    pdf.setFont("helvetica", "normal"); pdf.text(`Décédé(e) le ${formatDate(getVal("date_deces"))} à ${getVal("lieu_deces")}`, x+10, y); y+=15;
    pdf.text("Lieu d'inhumation :", x, y); y+=6;
    pdf.setFont("helvetica", "bold"); pdf.text(`Cimetière : ${getVal("cimetiere_nom")}`, x+10, y); y+=6;
    pdf.text(`Le : ${formatDate(getVal("date_inhumation"))} à ${getVal("heure_inhumation")}`, x+10, y); y+=6;
    pdf.text(`Concession : ${getVal("num_concession")} (${getVal("type_sepulture")})`, x+10, y); y+=20;
    pdf.setFont("helvetica", "normal"); pdf.text("Veuillez agréer, Monsieur le Maire, mes salutations distinguées.", x, y); y+=20;
    pdf.text(`Fait à ${getVal("faita")}, le ${formatDate(getVal("dateSignature"))}`, 130, y);
    pdf.save(`Demande_Inhumation_${getVal("nom")}.pdf`);
};

// --- 5. DEMANDE CRÉMATION ---
window.genererDemandeCremation = function() {
    const { jsPDF } = window.jspdf; const pdf = new jsPDF(); headerPF(pdf);
    pdf.setFont("times", "bold"); pdf.setFontSize(12);
    pdf.text(`${getVal("civilite_mandant")} ${getVal("soussigne")}`, 20, 45); 
    pdf.setFont("times", "normal"); pdf.text(getVal("demeurant"), 20, 51);
    pdf.setFont("times", "bold"); pdf.setFontSize(14);
    pdf.text("Monsieur le Maire", 150, 60, {align:"center"});
    pdf.setFontSize(12); pdf.text("OBJET : DEMANDE D'AUTORISATION DE CREMATION", 20, 80);
    let y = 100;
    pdf.setFont("times", "normal");
    const txt = `Monsieur le Maire,\n\nJe soussigné(e) ${getVal("civilite_mandant")} ${getVal("soussigne")}, agissant en qualité de ${getVal("lien")} du défunt(e), sollicite l'autorisation de procéder à la crémation de :\n\n${getVal("civilite_defunt")} ${getVal("nom").toUpperCase()} ${getVal("prenom")}\nNé(e) le ${formatDate(getVal("date_naiss"))} et décédé(e) le ${formatDate(getVal("date_deces"))}.\n\nLa crémation aura lieu le ${formatDate(getVal("date_cremation"))} au ${getVal("crematorium_nom")}.\nDestination des cendres : ${getVal("destination_cendres")}.\n\nJe certifie que le défunt n'était pas porteur d'un stimulateur cardiaque.`;
    const splitTxt = pdf.splitTextToSize(txt, 170); pdf.text(splitTxt, 20, y);
    y += (splitTxt.length * 7) + 20;
    pdf.text(`Fait à ${getVal("faita")}, le ${formatDate(getVal("dateSignature"))}`, 120, y);
    pdf.setFont("times", "bold"); pdf.text("Signature", 120, y+8);
    pdf.save(`Demande_Cremation_${getVal("nom")}.pdf`);
};

// --- 6. FERMETURE MAIRIE (CORRIGÉ LIEU) ---
window.genererFermeture = function() {
    if(!logoBase64) chargerLogoBase64(); 
    const { jsPDF } = window.jspdf; const pdf = new jsPDF(); 
    ajouterFiligrane(pdf); headerPF(pdf);
    
    // Titre
    pdf.setFillColor(52, 73, 94); pdf.rect(0, 35, 210, 15, 'F');
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(14); pdf.setTextColor(255, 255, 255);
    pdf.text("DÉCLARATION DE MISE EN BIÈRE, DE FERMETURE", 105, 41, { align: "center" });
    pdf.text("ET DE SCELLEMENT DE CERCUEIL", 105, 47, { align: "center" });
    
    pdf.setTextColor(0); pdf.setFontSize(10);
    let y = 65; const x = 20;
    
    // Opérateur
    pdf.setDrawColor(200); pdf.setLineWidth(0.5); pdf.rect(x, y, 170, 20);
    pdf.setFont("helvetica", "bold"); pdf.text("L'OPÉRATEUR FUNÉRAIRE", x+5, y+5);
    pdf.setFont("helvetica", "normal");
    pdf.text("PF SOLIDAIRE PERPIGNAN - 32 Bd Léon Jean Grégory, Thuir", x+5, y+10);
    pdf.text("Habilitation : 23-66-0205", x+5, y+15); y += 30;
    
    // Déclaration
    pdf.text("Je, soussigné M. CHERKAOUI Mustapha, certifie avoir procédé à la mise en bière,", x, y);
    pdf.text("à la fermeture et au scellement du cercueil.", x, y+5); y+=15;
    
    pdf.setFont("helvetica", "bold");
    pdf.text(`DATE : ${formatDate(getVal("date_fermeture"))}`, x, y);
    pdf.text(`LIEU : ${getVal("lieu_mise_biere")}`, x+80, y); y+=15;
    
    // Identité Défunt
    pdf.setFillColor(240, 240, 240); pdf.rect(x, y, 170, 30, 'F');
    pdf.setFont("helvetica", "bold"); pdf.text("IDENTITÉ DU DÉFUNT(E)", x+5, y+6);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Nom : ${getVal("civilite_defunt")} ${getVal("nom").toUpperCase()}`, x+5, y+14); pdf.text(`Prénom : ${getVal("prenom")}`, x+80, y+14);
    pdf.text(`Né(e) le : ${formatDate(getVal("date_naiss"))}`, x+5, y+22); pdf.text(`Décédé(e) le : ${formatDate(getVal("date_deces"))}`, x+80, y+22); y+=40;
    
    // Présence (Police ou Famille)
    const typePresence = document.getElementById('type_presence_select').value;
    const isPolice = (typePresence === 'police'); 
    
    pdf.setFont("helvetica", "bold"); pdf.text("EN PRÉSENCE DE :", x, y); y+=10;
    pdf.setDrawColor(0); pdf.rect(x, y, 170, 30);
    
    if(isPolice) {
        pdf.text("AUTORITÉ DE POLICE (Absence de famille)", x+5, y+6);
        pdf.setFont("helvetica", "normal");
        pdf.text(`Nom & Grade : ${getVal("p_nom_grade")}`, x+5, y+14);
        pdf.text(`Commissariat : ${getVal("p_commissariat")}`, x+5, y+22);
    } else {
        pdf.text("LA FAMILLE (Témoin)", x+5, y+6);
        pdf.setFont("helvetica", "normal");
        // Nom et Lien sur la première ligne
        pdf.text(`Nom : ${getVal("f_nom_prenom")}`, x+5, y+14);
        pdf.text(`Lien : ${getVal("f_lien")}`, x+80, y+14);
        // Adresse sur la deuxième ligne (AJOUTÉ ICI)
        // On utilise 'demeurant' car c'est l'adresse du mandant/témoin
        pdf.text(`Adresse : ${getVal("demeurant")}`, x+5, y+22); 
    }
    
    // Signatures
    y+=45; pdf.line(20, y, 190, y); y+=10;
    pdf.setFont("helvetica", "bold");
    pdf.text("Signature Opérateur", 40, y);
    pdf.text(isPolice ? "Signature Police" : "Signature Famille", 140, y);
    
    pdf.save(`PV_Mise_En_Biere_Fermeture_${getVal("nom")}.pdf`);
};
// --- 7. OUVERTURE SÉPULTURE ---
window.genererDemandeOuverture = function() {
    if(!logoBase64) chargerLogoBase64(); 
    const { jsPDF } = window.jspdf; 
    const pdf = new jsPDF();
    
    headerPF(pdf); 

    // --- TITRE ---
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(13); pdf.setTextColor(0);
    pdf.text("DEMANDE D'OUVERTURE D'UNE SEPULTURE DE FAMILLE", 105, 40, { align: "center" });

    let y = 55; const x = 15; 
    
    // --- CASES À COCHER (POUR...) ---
    pdf.setFontSize(10);
    pdf.text("POUR : ", x, y);
    const type = getVal("prestation");
    
    // Inhumation
    pdf.rect(x+20, y-4, 5, 5); 
    if(type === "Inhumation") { pdf.setLineWidth(0.5); pdf.line(x+20, y-4, x+25, y+1); pdf.line(x+25, y-4, x+20, y+1); } // X dessiné
    pdf.text("INHUMATION", x+27, y);

    // Exhumation
    pdf.rect(x+65, y-4, 5, 5); 
    if(type === "Exhumation") { pdf.setLineWidth(0.5); pdf.line(x+65, y-4, x+70, y+1); pdf.line(x+70, y-4, x+65, y+1); }
    pdf.text("EXHUMATION", x+72, y);

    // Scellement
    pdf.rect(x+110, y-4, 5, 5); 
    pdf.text("SCELLEMENT D'URNE", x+117, y);
    y += 15;

    // --- 1. NOUS SOUSSIGNONS ---
    pdf.setFont("helvetica", "normal");
    pdf.text("Nous soussignons :", x, y); y+=6;
    
    // Utilisation de ">" au lieu de "➢" pour éviter les bugs
    pdf.text("> Nom et Prénom : ", x+5, y); 
    pdf.setFont("helvetica", "bold"); 
    pdf.text(`${getVal("civilite_mandant")} ${getVal("soussigne").toUpperCase()}`, x+40, y);
    
    pdf.setFont("helvetica", "normal");
    pdf.text("Lien de parenté : ", x+110, y);
    pdf.setFont("helvetica", "bold");
    pdf.text(getVal("lien"), x+140, y);
    y += 12;

    // --- 2. DEMANDONS À FAIRE ---
    pdf.setFont("helvetica", "bold");
    pdf.rect(x, y-3, 2, 2, 'F'); // Petit carré noir dessiné (Remplace ◾)
    pdf.text("Demandons à faire :", x+5, y); y+=6;
    
    let actionTxt = "Ouvrir la concession";
    if(type === "Inhumation") actionTxt = "Inhumer dans la concession";
    if(type === "Exhumation") actionTxt = "Exhumer de la concession";
    
    pdf.text(`${actionTxt} :`, x+5, y); y+=6;
    pdf.setFont("helvetica", "normal");
    pdf.text(`n° ${getVal("num_concession")}`, x+10, y);
    pdf.text(`acquise par : ${getVal("titulaire_concession")}`, x+50, y);
    pdf.text(`(Cimetière : ${getVal("cimetiere_nom")})`, x+130, y);
    y += 12;

    // --- 3. LE CORPS DE ---
    pdf.setFont("helvetica", "bold");
    pdf.rect(x, y-3, 2, 2, 'F'); // Petit carré noir dessiné
    pdf.text("Le corps de :", x+5, y); y+=6;
    
    pdf.setFont("helvetica", "normal");
    pdf.text("> M/Mme : ", x+5, y);
    pdf.setFont("helvetica", "bold");
    pdf.text(`${getVal("civilite_defunt")} ${getVal("nom").toUpperCase()} ${getVal("prenom")}`, x+30, y);
    
    pdf.setFont("helvetica", "normal");
    pdf.text(`né(e) le ${formatDate(getVal("date_naiss"))} à ${getVal("lieu_naiss")}`, x+110, y);
    y+=6;
    
    pdf.text("> Qui demeurait à : ", x+5, y);
    pdf.setFont("helvetica", "bold");
    // Adresse coupée si trop longue
    pdf.text(pdf.splitTextToSize(getVal("adresse_fr"), 130), x+40, y);
    y+=6;
    
    pdf.setFont("helvetica", "normal");
    pdf.text("> Décédé(e) le : ", x+5, y);
    pdf.setFont("helvetica", "bold");
    pdf.text(`${formatDate(getVal("date_deces"))} à ${getVal("lieu_deces")}`, x+40, y);
    y += 15;

    // --- 4. MANDATONS ---
    pdf.setFont("helvetica", "bold"); 
    pdf.rect(x, y-3, 2, 2, 'F'); // Petit carré noir dessiné
    pdf.text("Mandatons et donnons pouvoir à l'entreprise :", x+5, y); y+=5;
    pdf.text("POMPES FUNEBRES SOLIDAIRE PERPIGNAN", 105, y, {align:"center"}); y+=6;
    
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(9);
    pdf.text("D'exécuter les travaux d'ouverture et fermeture ou scellement d'une urne relatifs à l'opération", x, y); y+=4;
    pdf.text("funéraire ci-dessus mentionnée.", x, y); y+=6;
    
    pdf.setFontSize(10);
    pdf.text("M : ......................................................", x, y);
    pdf.setFont("helvetica", "bold"); pdf.text("CHERKAOUI MUSTAPHA", x+60, y); y+=5;
    
    pdf.setFont("helvetica", "normal");
    pdf.text("Pompes Funèbres à ..............................", x, y);
    pdf.setFont("helvetica", "bold"); pdf.text("32 boulevard Léon Jean Grégory Thuir", x+60, y); 
    y += 15;

    // --- 5. DATE ET HEURE ---
    pdf.setFont("helvetica", "bold");
    pdf.text("Date et heure de l'inhumation au cimetière :", x, y); y+=8;
    pdf.setFont("helvetica", "normal");
    pdf.text("......................................................................................", x, y);
    pdf.setFont("helvetica", "bold");
    pdf.text(`${formatDate(getVal("date_inhumation"))} à ${getVal("heure_inhumation")}`, x+20, y-1);
    y += 15;

    // --- LEGAL & SIGNATURE ---
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(9);
    const legal = "La présente déclaration dont j'assure la peine et entière responsabilité m'engage à garantir la ville contre toute réclamation qui pourrait survenir suite à l'inhumation/exhumation ou le scellement d'urne qui en fait objet.\n\nEnfin conférèrent à la réglementation en vigueur je m'engage à fournir la preuve de la qualité du ou des ayants droits (livret de famille, acte de naissance, attestation notariée etc.) et déposer ou service Réglementation funéraire de la ville, la copie du ou des document(s) précité prouvant la qualité du ou des ayants droits.";
    const splitLegal = pdf.splitTextToSize(legal, 180);
    pdf.text(splitLegal, x, y);
    y += 35;

    pdf.setFontSize(11);
    pdf.text(`Fait à ${getVal("faita")}, le ${formatDate(getVal("dateSignature"))}`, 130, y); y += 10;
    
    pdf.setFont("helvetica", "bold");
    pdf.text("Signature des déclarants", 130, y);

    pdf.save(`Ouverture_Sepulture_${getVal("nom")}.pdf`);
};
// --- 8. PV MISE EN BIERE (CORRECT) ---
window.genererFermeture = function() {
    if(!logoBase64) chargerLogoBase64(); 
    const { jsPDF } = window.jspdf; const pdf = new jsPDF(); 
    ajouterFiligrane(pdf); headerPF(pdf);
    
    // Titre
    pdf.setFillColor(52, 73, 94); pdf.rect(0, 35, 210, 15, 'F');
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(14); pdf.setTextColor(255, 255, 255);
    pdf.text("DÉCLARATION DE MISE EN BIÈRE, DE FERMETURE", 105, 41, { align: "center" });
    pdf.text("ET DE SCELLEMENT DE CERCUEIL", 105, 47, { align: "center" });
    
    pdf.setTextColor(0); pdf.setFontSize(10);
    let y = 65; const x = 20;
    
    // Opérateur
    pdf.setDrawColor(200); pdf.setLineWidth(0.5); pdf.rect(x, y, 170, 20);
    pdf.setFont("helvetica", "bold"); pdf.text("L'OPÉRATEUR FUNÉRAIRE", x+5, y+5);
    pdf.setFont("helvetica", "normal");
    pdf.text("PF SOLIDAIRE PERPIGNAN - 32 Bd Léon Jean Grégory, Thuir", x+5, y+10);
    pdf.text("Habilitation : 23-66-0205", x+5, y+15); y += 30;
    
    // Déclaration
    pdf.text("Je, soussigné M. CHERKAOUI Mustapha, certifie avoir procédé à la mise en bière,", x, y);
    pdf.text("à la fermeture et au scellement du cercueil.", x, y+5); y+=15;
    
    pdf.setFont("helvetica", "bold");
    pdf.text(`DATE : ${formatDate(getVal("date_fermeture"))}`, x, y);
    pdf.text(`LIEU : ${getVal("lieu_mise_biere")}`, x+80, y); y+=15;
    
    // Identité Défunt
    pdf.setFillColor(240, 240, 240); pdf.rect(x, y, 170, 30, 'F');
    pdf.setFont("helvetica", "bold"); pdf.text("IDENTITÉ DU DÉFUNT(E)", x+5, y+6);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Nom : ${getVal("civilite_defunt")} ${getVal("nom").toUpperCase()}`, x+5, y+14); pdf.text(`Prénom : ${getVal("prenom")}`, x+80, y+14);
    pdf.text(`Né(e) le : ${formatDate(getVal("date_naiss"))}`, x+5, y+22); pdf.text(`Décédé(e) le : ${formatDate(getVal("date_deces"))}`, x+80, y+22); y+=40;
    
    // Présence (Police ou Famille)
    const typePresence = document.getElementById('type_presence_select').value;
    const isPolice = (typePresence === 'police'); 
    
    pdf.setFont("helvetica", "bold"); pdf.text("EN PRÉSENCE DE :", x, y); y+=10;
    pdf.setDrawColor(0); pdf.rect(x, y, 170, 30);
    
    if(isPolice) {
        pdf.text("AUTORITÉ DE POLICE (Absence de famille)", x+5, y+6);
        pdf.setFont("helvetica", "normal");
        pdf.text(`Nom & Grade : ${getVal("p_nom_grade")}`, x+5, y+14);
        pdf.text(`Commissariat : ${getVal("p_commissariat")}`, x+5, y+22);
    } else {
        pdf.text("LA FAMILLE (Témoin)", x+5, y+6);
        pdf.setFont("helvetica", "normal");
        // Nom et Lien sur la première ligne
        pdf.text(`Nom : ${getVal("f_nom_prenom")}`, x+5, y+14);
        pdf.text(`Lien : ${getVal("f_lien")}`, x+80, y+14);
        // Adresse sur la deuxième ligne (AJOUTÉ ICI)
        // On utilise 'demeurant' car c'est l'adresse du mandant/témoin
        pdf.text(`Adresse : ${getVal("demeurant")}`, x+5, y+22); 
    }
    
    // Signatures
    y+=45; pdf.line(20, y, 190, y); y+=10;
    pdf.setFont("helvetica", "bold");
    pdf.text("Signature Opérateur", 40, y);
    pdf.text(isPolice ? "Signature Police" : "Signature Famille", 140, y);
    
    pdf.save(`PV_Mise_En_Biere_Fermeture_${getVal("nom")}.pdf`);
};

// --- 9. TRANSPORT (AVANT ET APRÈS) - MODIFIÉ ---
window.genererTransport = function(type) {
    if(!logoBase64) chargerLogoBase64(); 
    const { jsPDF } = window.jspdf; const pdf = new jsPDF();
    const prefix = type === 'avant' ? 'av' : 'ap';
    const labelT = type === 'avant' ? "AVANT MISE EN BIÈRE" : "APRÈS MISE EN BIÈRE";

    // Cadre global et En-tête
    pdf.setLineWidth(1); pdf.rect(10, 10, 190, 277); headerPF(pdf);
    
    // Titre
    pdf.setFillColor(200); pdf.rect(10, 35, 190, 15, 'F');
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(16);
    pdf.text(`DÉCLARATION DE TRANSPORT DE CORPS`, 105, 42, { align: "center" });
    pdf.setFontSize(12); pdf.text(labelT, 105, 47, { align: "center" });
    
    let y = 70; const x = 20;
    
    // Transporteur
    pdf.setFontSize(10); pdf.setFont("helvetica", "bold");
    pdf.text("TRANSPORTEUR :", x, y); y+=5;
    pdf.setFont("helvetica", "normal");
    pdf.text("PF SOLIDAIRE PERPIGNAN - 32 Bd Léon J. Grégory, Thuir", x, y); y+=15;
    
    // --- BLOC DÉFUNT (MODIFIÉ) ---
    pdf.setDrawColor(0); pdf.rect(x, y, 170, 30); // Cadre un peu plus grand
    pdf.setFont("helvetica", "bold"); pdf.text("DÉFUNT(E)", x+5, y+6);
    
    // Nom Prénom
    pdf.setFontSize(14); 
    pdf.text(`${getVal("civilite_defunt")} ${getVal("nom")} ${getVal("prenom")}`, 105, y+15, {align:"center"});
    
    // Naissance ET Décès sur la même ligne (ou juste en dessous si trop long)
    pdf.setFontSize(9); pdf.setFont("helvetica", "normal");
    const phraseEtatCivil = `Né(e) le ${formatDate(getVal("date_naiss"))} à ${getVal("lieu_naiss")}   —   Décédé(e) le ${formatDate(getVal("date_deces"))} à ${getVal("lieu_deces")}`;
    pdf.text(phraseEtatCivil, 105, y+22, {align:"center"}); 
    
    y+=40; // On descend après le cadre défunt

    // --- BLOC LIEUX ---
    pdf.setLineWidth(0.5); 
    // Cadre Départ
    pdf.rect(x, y, 80, 50); 
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(10); pdf.text("LIEU DE DÉPART", x+5, y+6);
    pdf.setFont("helvetica", "normal"); pdf.text(getVal(`${prefix}_lieu_depart`), x+5, y+15);
    pdf.setFont("helvetica", "bold"); pdf.text("Date & Heure :", x+5, y+35);
    pdf.setFont("helvetica", "normal"); pdf.text(`${formatDate(getVal(`${prefix}_date_dep`))} à ${getVal(`${prefix}_heure_dep`)}`, x+5, y+42);

    // Cadre Arrivée
    pdf.rect(x+90, y, 80, 50);
    pdf.setFont("helvetica", "bold"); pdf.text("LIEU D'ARRIVÉE", x+95, y+6);
    pdf.setFont("helvetica", "normal"); pdf.text(getVal(`${prefix}_lieu_arrivee`), x+95, y+15);
    pdf.setFont("helvetica", "bold"); pdf.text("Date & Heure :", x+95, y+35);
    pdf.setFont("helvetica", "normal"); pdf.text(`${formatDate(getVal(`${prefix}_date_arr`))} à ${getVal(`${prefix}_heure_arr`)}`, x+95, y+42);
    
    y+=60;

    // (La partie Véhicule a été supprimée ici)

    // --- SIGNATURE ---
    const faita = getVal("faita");
    const dateSign = getVal("dateSignature");
    
    y += 20; // Marge avant signature
    pdf.setFont("helvetica", "normal");
    pdf.text(`Fait à ${faita}, le ${formatDate(dateSign)}`, 120, y);
    pdf.setFont("helvetica", "bold");
    pdf.text("Cachet de l'entreprise :", 120, y+10);
    
    pdf.save(`Transport_${type}_${getVal("nom")}.pdf`);
};

