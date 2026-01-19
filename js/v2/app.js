/* Fichier : js/v2/app.js - VERSION FINALE (DESIGN ACTIONS + LOGIQUE) */
import { auth, db, collection, addDoc, getDocs, doc, updateDoc, query, orderBy, onAuthStateChanged, signOut } from "../config.js";
import { PdfService } from "./pdf.service.js";

// ==========================================================================
// 1. INITIALISATION
// ==========================================================================
let documentsCache = [];

document.addEventListener('DOMContentLoaded', () => {
    // Vérification Auth
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("Connecté Facturation V2");
            chargerDocuments();
        } else {
            window.location.href = 'index.html'; // Retour au login si pas connecté
        }
    });

    // Bouton Déconnexion
    const btnLogout = document.getElementById('btn-logout');
    if(btnLogout) btnLogout.addEventListener('click', () => {
        if(confirm("Se déconnecter ?")) {
            signOut(auth).then(() => window.location.href = 'index.html');
        }
    });

    // Recherche dynamique
    const searchInput = document.getElementById('search-facture');
    if(searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = documentsCache.filter(d => 
                (d.client.nom && d.client.nom.toLowerCase().includes(term)) ||
                (d.numero && d.numero.toLowerCase().includes(term))
            );
            renderTable(filtered);
        });
    }
});

// ==========================================================================
// 2. CHARGEMENT & AFFICHAGE (TABLEAU + STATS)
// ==========================================================================
async function chargerDocuments() {
    const tbody = document.getElementById('table-body');
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px;">Chargement en cours...</td></tr>';

    try {
        const q = query(collection(db, "factures_v2"), orderBy("date_creation", "desc"));
        const snap = await getDocs(q);
        
        documentsCache = [];
        snap.forEach(docSnap => {
            documentsCache.push({ id: docSnap.id, ...docSnap.data() });
        });

        calculerStats(documentsCache);
        renderTable(documentsCache);

    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:red;">Erreur de chargement.</td></tr>';
    }
}

function renderTable(docs) {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';

    if (docs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px; color:#64748b;">Aucun document trouvé.</td></tr>';
        return;
    }

    docs.forEach(doc => {
        const total = parseFloat(doc.total_ttc || 0);
        const paye = parseFloat(doc.acompte || 0);
        const reste = total - paye;
        
        // Statut (Logique simple)
        let statut = "EN ATTENTE";
        let statusClass = "status-pending";
        if(doc.type === 'DEVIS') { statut = "DEVIS"; statusClass = "status-pending"; }
        else if(reste <= 0.1) { statut = "PAYÉ"; statusClass = "status-paid"; } // Marge d'erreur centimes
        else if(paye > 0) { statut = "PARTIEL"; statusClass = "status-pending"; }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${new Date(doc.date_creation).toLocaleDateString()}</td>
            <td style="font-weight:bold; color:#1e293b;">${doc.numero}</td>
            <td><span class="badge" style="font-size:0.75rem;">${doc.type}</span></td>
            <td>
                <div style="font-weight:bold;">${doc.client.nom || 'Client Inconnu'}</div>
                <div style="font-size:0.8em; color:#64748b;">${doc.defunt ? 'Défunt: '+doc.defunt.nom : ''}</div>
            </td>
            <td style="text-align:right; font-weight:bold;">${total.toFixed(2)} €</td>
            <td style="text-align:right; color:${reste > 0.1 ? '#ef4444' : '#166534'}; font-weight:bold;">
                ${reste.toFixed(2)} €
            </td>
            <td style="text-align:center;"><span class="status-badge ${statusClass}">${statut}</span></td>
            
            <td class="actions-cell">
                <button class="btn-icon-action btn-print" onclick="window.imprimer('${doc.id}')" title="Imprimer PDF">
                    <i class="fas fa-print"></i>
                </button>
                <button class="btn-icon-action btn-edit" onclick="window.editer('${doc.id}')" title="Modifier">
                    <i class="fas fa-pen"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function calculerStats(docs) {
    let ca = 0;
    let encaisse = 0;
    
    docs.forEach(d => {
        // On ne compte que les FACTURES pour le CA, pas les DEVIS
        if(d.type === 'FACTURE') {
            ca += parseFloat(d.total_ttc || 0);
            encaisse += parseFloat(d.acompte || 0);
        }
    });

    document.getElementById('stats-ca').textContent = ca.toFixed(2) + ' €';
    document.getElementById('stats-encaisse').textContent = encaisse.toFixed(2) + ' €';
    document.getElementById('stats-reste').textContent = (ca - encaisse).toFixed(2) + ' €';
}

// ==========================================================================
// 3. ACTIONS DOCUMENTS (IMPRIMER / EDITER / NOUVEAU)
// ==========================================================================

window.imprimer = function(id) {
    const docData = documentsCache.find(d => d.id === id);
    if(docData) {
        PdfService.generer(docData);
    }
};

// --- LOGIQUE D'EDITION (MODAL) ---
let currentDocId = null; // null = création, ID = modification

window.nouveauDocument = function() {
    currentDocId = null;
    document.getElementById('modal-title').textContent = "Nouveau Devis";
    
    // Vider le formulaire
    document.getElementById('edit-client-nom').value = "";
    document.getElementById('edit-client-adresse').value = "";
    document.getElementById('edit-defunt-nom').value = "";
    document.getElementById('edit-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('edit-numero').value = "PRO-" + Math.floor(Math.random()*10000); // Numéro temporaire
    document.getElementById('lignes-container').innerHTML = "";
    document.getElementById('edit-total').textContent = "0.00";
    
    // Ajouter une ligne vide par défaut
    window.ajouterLigne();
    
    document.getElementById('modal-editor').classList.remove('hidden');
};

window.editer = function(id) {
    const docData = documentsCache.find(d => d.id === id);
    if(!docData) return;

    currentDocId = id;
    document.getElementById('modal-title').textContent = `Modifier ${docData.type} ${docData.numero}`;
    
    // Remplir les champs
    document.getElementById('edit-client-nom').value = docData.client.nom || "";
    document.getElementById('edit-client-adresse').value = docData.client.adresse || "";
    document.getElementById('edit-defunt-nom').value = docData.defunt ? docData.defunt.nom : "";
    document.getElementById('edit-date').value = docData.date_creation ? docData.date_creation.split('T')[0] : "";
    document.getElementById('edit-numero').value = docData.numero;
    
    // Remplir les lignes
    const container = document.getElementById('lignes-container');
    container.innerHTML = "";
    if(docData.lignes && docData.lignes.length > 0) {
        docData.lignes.forEach(l => {
            if(l.type === 'section') window.ajouterSection(l.description);
            else window.ajouterLigne(l.description, l.prix, l.category);
        });
    } else {
        window.ajouterLigne();
    }
    
    window.calculerTotalModal();
    document.getElementById('modal-editor').classList.remove('hidden');
};

window.fermerModal = function() {
    document.getElementById('modal-editor').classList.add('hidden');
};

// --- GESTION DES LIGNES (AJOUT DYNAMIQUE) ---

window.ajouterLigne = function(desc="", prix="", cat="courant") {
    const div = document.createElement('div');
    div.className = "ligne-item form-grid";
    div.style.gridTemplateColumns = "3fr 1fr 1fr 30px";
    div.style.marginBottom = "5px";
    div.style.alignItems = "center";
    
    // HTML de la ligne : Description | Prix | Catégorie | Supprimer
    div.innerHTML = `
        <input type="text" class="l-desc" placeholder="Désignation" value="${desc}">
        <input type="number" class="l-prix" placeholder="0.00" step="0.01" value="${prix}" onchange="window.calculerTotalModal()">
        <select class="l-cat">
            <option value="courant" ${cat==='courant'?'selected':''}>Courant</option>
            <option value="option" ${cat==='option'?'selected':''}>Option</option>
            <option value="tiers" ${cat==='tiers'?'selected':''}>Tiers</option>
        </select>
        <button onclick="this.parentElement.remove(); window.calculerTotalModal()" style="color:red; background:none; border:none; cursor:pointer;">&times;</button>
    `;
    document.getElementById('lignes-container').appendChild(div);
};

window.ajouterSection = function(titre="") {
    const div = document.createElement('div');
    div.className = "ligne-section";
    div.style.marginBottom = "10px";
    div.style.marginTop = "10px";
    div.style.background = "#f1f5f9";
    div.style.padding = "5px";
    div.style.display = "flex";
    div.style.gap = "10px";
    
    div.innerHTML = `
        <input type="text" class="l-desc section-title" placeholder="TITRE DE SECTION (ex: CERCUEIL)" value="${titre}" style="font-weight:bold; width:100%;">
        <input type="hidden" class="l-type" value="section">
        <button onclick="this.parentElement.remove()" style="color:red; background:none; border:none;">&times;</button>
    `;
    document.getElementById('lignes-container').appendChild(div);
};

window.calculerTotalModal = function() {
    let total = 0;
    document.querySelectorAll('#lignes-container .l-prix').forEach(input => {
        const val = parseFloat(input.value);
        if(!isNaN(val)) total += val;
    });
    document.getElementById('edit-total').textContent = total.toFixed(2);
};

// --- SAUVEGARDE FINALE ---
window.sauvegarderDocument = async function() {
    const lignes = [];
    // Récupérer toutes les lignes (items et sections)
    const container = document.getElementById('lignes-container');
    
    for (let child of container.children) {
        if(child.querySelector('.l-type')?.value === 'section') {
            lignes.push({
                type: 'section',
                description: child.querySelector('.l-desc').value
            });
        } else {
            lignes.push({
                type: 'item',
                description: child.querySelector('.l-desc').value,
                prix: child.querySelector('.l-prix').value || 0,
                category: child.querySelector('.l-cat').value
            });
        }
    }

    const docData = {
        numero: document.getElementById('edit-numero').value,
        type: 'DEVIS', // Par défaut (on changera en FACTURE plus tard si besoin)
        date_creation: document.getElementById('edit-date').value,
        client: {
            nom: document.getElementById('edit-client-nom').value,
            adresse: document.getElementById('edit-client-adresse').value
        },
        defunt: {
            nom: document.getElementById('edit-defunt-nom').value
        },
        lignes: lignes,
        total_ttc: parseFloat(document.getElementById('edit-total').textContent),
        acompte: 0 // Gestion acompte à améliorer dans une V5
    };

    try {
        if(currentDocId) {
            // Mise à jour
            await updateDoc(doc(db, "factures_v2", currentDocId), docData);
        } else {
            // Création
            await addDoc(collection(db, "factures_v2"), docData);
        }
        window.fermerModal();
        chargerDocuments(); // Rafraîchir
        alert("Sauvegardé !");
    } catch(e) {
        alert("Erreur sauvegarde : " + e.message);
    }
};

window.exporterCompta = function() {
    alert("Fonction Export Excel à venir dans la version V5 !");
};
