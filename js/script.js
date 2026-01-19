/* Fichier : js/script.js - VERSION V4.2 (AVEC SUPPRESSION CLIENT) */
// ON AJOUTE deleteDoc DANS L'IMPORT
import { auth, db, collection, addDoc, getDocs, query, orderBy, onAuthStateChanged, signInWithEmailAndPassword, signOut, deleteDoc, doc } from "./config.js";

// ... (Initialisation inchangée) ...
document.addEventListener('DOMContentLoaded', () => {
    chargerLogoBase64(); 
    const loader = document.getElementById('app-loader');
    
    onAuthStateChanged(auth, (user) => {
        if(loader) loader.style.display = 'none';
        if (user) {
            document.getElementById('login-screen').classList.add('hidden');
            window.chargerBaseClients(); 
            window.chargerClientsFacturation(); 
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
    
    if(document.getElementById('btn-import')) document.getElementById('btn-import').addEventListener('click', window.importerClient);
    if(document.getElementById('btn-save-bdd')) document.getElementById('btn-save-bdd').addEventListener('click', window.sauvegarderEnBase);
    
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

// ... (Navigation inchangée) ...
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
// LOGIQUE DASHBOARD (AVEC SUPPRESSION)
// ==========================================================================

// 1. CHARGEMENT TABLEAU AVEC BOUTON SUPPRIMER
window.chargerBaseClients = async function() {
    const tbody = document.getElementById('clients-table-body');
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Chargement...</td></tr>';
    
    try {
        const q = query(collection(db, "dossiers_admin"), orderBy("date_creation", "desc"));
        const snap = await getDocs(q);
        
        tbody.innerHTML = '';
        if(snap.empty) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Aucun dossier trouvé.</td></tr>'; return; }

        snap.forEach(docSnap => {
            const data = docSnap.data();
            const defunt = data.defunt ? `${data.defunt.nom} ${data.defunt.prenom}` : "Inconnu";
            const mandant = data.mandant ? data.mandant.nom : "-";
            const dateC = new Date(data.date_creation).toLocaleDateString();
            let operation = "Inhumation";
            if(data.technique && data.technique.type_operation) operation = data.technique.type_operation;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${dateC}</td>
                <td><strong>${defunt}</strong></td>
                <td>${mandant}</td>
                <td><span class="badge" style="background:#e0f2fe; color:#0369a1; padding:4px 8px; border-radius:4px;">${operation}</span></td>
                <td style="text-align:center;">
                    <button class="btn-icon" onclick="window.chargerDossier('${docSnap.id}')" title="Modifier" style="background:none; border:none; color:#3b82f6; cursor:pointer; font-size:1.2em;">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon" onclick="window.supprimerDossier('${docSnap.id}')" title="Supprimer définitivement" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:1.2em; margin-left:10px;">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch(e) { console.error(e); tbody.innerHTML = '<tr><td colspan="5">Erreur chargement.</td></tr>'; }
};

// 2. FONCTION DE SUPPRESSION
window.supprimerDossier = async function(id) {
    if(confirm("⚠️ ATTENTION : Voulez-vous vraiment supprimer ce dossier client définitivement ?\nCette action est irréversible.")) {
        try {
            await deleteDoc(doc(db, "dossiers_admin", id));
            alert("🗑️ Dossier supprimé avec succès.");
            window.chargerBaseClients(); // Rafraîchir la liste
        } catch (e) {
            alert("Erreur lors de la suppression : " + e.message);
        }
    }
};

window.chargerDossier = async function(id) {
    window.showSection('admin');
    alert("Veuillez utiliser l'import ou saisir un nouveau dossier pour le moment.");
};

// ... (Le reste : viderFormulaire, importerClient, sauvegarderEnBase reste identique) ...
// Pour gagner de la place, je ne répète pas tout le code ici, 
// MAIS ASSUREZ-VOUS DE GARDER VOS FONCTIONS D'IMPORT ET DE SAUVEGARDE CI-DESSOUS
// Si vous copiez-collez, assurez-vous de remettre les fonctions importerClient, sauvegarderEnBase et TOUTES LES FONCTIONS PDF (genererPouvoir, etc.) à la suite.

window.viderFormulaire = function() {
    if(confirm("Tout effacer ?")) {
        document.querySelectorAll('#view-admin input').forEach(i => i.value = '');
        document.getElementById('prestation').selectedIndex = 0;
        window.toggleSections();
        alert("Dossier vidé.");
    }
};

let clientsCache = [];
window.chargerClientsFacturation = async function() {
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
};

window.importerClient = function() {
    const id = document.getElementById('select-import-client').value;
    if(!id) return;
    const dossier = clientsCache.find(c => c.id === id);
    if(dossier) {
        const d = dossier.data;
        if(d.client) {
            document.getElementById('soussigne').value = d.client.nom || ''; 
            document.getElementById('demeurant').value = d.client.adresse || '';
        }
        if(d.defunt) {
            document.getElementById('nom').value = d.defunt.nom || ''; 
        }
        alert("✅ Données importées.");
    }
};

window.sauvegarderEnBase = async function() {
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
        }, 1000);
    } catch(e) { alert("Erreur: " + e.message); btn.innerHTML = oldText; }
};

// ... (MOTEUR PDF ET FONCTIONS GENERER... DOIVENT ETRE ICI COMME DANS LA VERSION PRECEDENTE) ...
// Ajoutez ici le bloc "3. MOTEUR PDF & UTILS" et "4. FONCTIONS PDF" de la réponse précédente.
