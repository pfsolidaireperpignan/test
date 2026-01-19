/* Fichier : js/v2/app.js - VERSION V5 (MODELE AUTOMATIQUE + TRANSFORMATION) */
import { auth, db, collection, addDoc, getDocs, doc, updateDoc, query, orderBy, onAuthStateChanged, signOut } from "../config.js";
import { PdfService } from "./pdf.service.js";

// ==========================================================================
// 0. MODELE STANDARD (Ce qui se charge automatiquement)
// ==========================================================================
const MODELE_STANDARD = [
    { type: 'section', label: '1. CERCUEIL & ACCESSOIRES' },
    { type: 'item', label: 'Cercueil (Modèle Standard)', prix: 0, cat: 'courant' },
    { type: 'item', label: 'Capiton', prix: 0, cat: 'courant' },
    { type: 'item', label: 'Plaque d\'identité gravée', prix: 45, cat: 'courant' },
    { type: 'item', label: 'Emblème religieux / civil', prix: 0, cat: 'option' },
    
    { type: 'section', label: '2. SOINS & TOILETTE' },
    { type: 'item', label: 'Soins de conservation', prix: 0, cat: 'option' },
    { type: 'item', label: 'Toilette et habillage', prix: 0, cat: 'courant' },
    
    { type: 'section', label: '3. TRANSPORT' },
    { type: 'item', label: 'Véhicule agréé (Corbillard)', prix: 0, cat: 'courant' },
    { type: 'item', label: 'Vacation porteurs', prix: 0, cat: 'courant' },
    { type: 'item', label: 'Caisson réfrigéré (si nécessaire)', prix: 0, cat: 'option' },
    
    { type: 'section', label: '4. DÉMARCHES ADMINISTRATIVES' },
    { type: 'item', label: 'Démarches Mairie & Préfecture', prix: 0, cat: 'courant' },
    { type: 'item', label: 'Vacation de Police (si applicable)', prix: 20, cat: 'tiers' },
    { type: 'item', label: 'Taxes municipales', prix: 0, cat: 'tiers' },
    
    { type: 'section', label: '5. CÉRÉMONIE' },
    { type: 'item', label: 'Maitre de cérémonie', prix: 0, cat: 'option' },
    { type: 'item', label: 'Registre de condoléances', prix: 35, cat: 'option' }
];

// ==========================================================================
// 1. INITIALISATION
// ==========================================================================
let documentsCache = [];

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("Connecté Facturation V5");
            chargerDocuments();
        } else {
            window.location.href = 'index.html';
        }
    });

    const btnLogout = document.getElementById('btn-logout');
    if(btnLogout) btnLogout.addEventListener('click', () => {
        if(confirm("Se déconnecter ?")) signOut(auth).then(() => window.location.href = 'index.html');
    });

    // Recherche
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
// 2. CHARGEMENT & TABLEAU
// ==========================================================================
async function chargerDocuments() {
    const tbody = document.getElementById('table-body');
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px;">Chargement...</td></tr>';

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
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:red;">Erreur chargement.</td></tr>';
    }
}

function renderTable(docs) {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';

    if (docs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px;">Aucun document.</td></tr>';
        return;
    }

    docs.forEach(doc => {
        const total = parseFloat(doc.total_ttc || 0);
        const reste = total - parseFloat(doc.acompte || 0);
        
        let statut = "EN ATTENTE";
        let statusClass = "status-pending";
        
        if(doc.type === 'DEVIS') { statut = "DEVIS"; statusClass = "status-pending"; }
        else if(reste <= 0.1) { statut = "PAYÉ"; statusClass = "status-paid"; }
        else { statut = "À PAYER"; statusClass = "status-pending"; }

        // BOUTON TRANSFORMER (Seulement si c'est un DEVIS)
        let btnTransformer = '';
        if(doc.type === 'DEVIS') {
            btnTransformer = `
                <button class="btn-icon-action btn-convert" onclick="window.convertirEnFacture('${doc.id}')" title="Transformer en Facture" style="background:#dbeafe; color:#2563eb;">
                    <i class="fas fa-exchange-alt"></i>
                </button>
            `;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${new Date(doc.date_creation).toLocaleDateString()}</td>
            <td style="font-weight:bold;">${doc.numero}</td>
            <td><span class="badge">${doc.type}</span></td>
            <td>
                <div style="font-weight:bold;">${doc.client.nom || 'Inconnu'}</div>
                <div style="font-size:0.8em; color:#64748b;">${doc.defunt ? doc.defunt.nom : ''}</div>
            </td>
            <td style="text-align:right;">${total.toFixed(2)} €</td>
            <td style="text-align:right; color:${reste > 0.1 ? 'red' : 'green'};">${reste.toFixed(2)} €</td>
            <td style="text-align:center;"><span class="status-badge ${statusClass}">${statut}</span></td>
            <td class="actions-cell">
                ${btnTransformer}
                <button class="btn-icon-action btn-print" onclick="window.imprimer('${doc.id}')"><i class="fas fa-print"></i></button>
                <button class="btn-icon-action btn-edit" onclick="window.editer('${doc.id}')"><i class="fas fa-pen"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function calculerStats(docs) {
    let ca = 0, encaisse = 0;
    docs.forEach(d => {
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
// 3. GESTION DES DOCUMENTS
// ==========================================================================

// --- NOUVEAU DOCUMENT (CHARGEMENT AUTOMATIQUE DU MODELE) ---
window.nouveauDocument = function() {
    window.currentDocId = null;
    document.getElementById('modal-title').textContent = "Nouveau Devis (Modèle Chargé)";
    
    // Reset champs
    document.getElementById('edit-client-nom').value = "";
    document.getElementById('edit-client-adresse').value = "";
    document.getElementById('edit-defunt-nom').value = "";
    document.getElementById('edit-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('edit-numero').value = "D-" + new Date().getFullYear() + "-" + Math.floor(Math.random()*1000);
    
    // CHARGEMENT DU MODELE STANDARD
    const container = document.getElementById('lignes-container');
    container.innerHTML = "";
    
    MODELE_STANDARD.forEach(ligne => {
        if(ligne.type === 'section') {
            window.ajouterSection(ligne.label);
        } else {
            window.ajouterLigne(ligne.label, ligne.prix, ligne.cat);
        }
    });
    
    window.calculerTotalModal();
    document.getElementById('modal-editor').classList.remove('hidden');
};

// --- TRANSFORMER DEVIS -> FACTURE ---
window.convertirEnFacture = async function(id) {
    const docData = documentsCache.find(d => d.id === id);
    if(!docData) return;

    if(!confirm(`Transformer le DEVIS ${docData.numero} en FACTURE ?`)) return;

    const nouveauNumero = "F-" + new Date().getFullYear() + "-" + Math.floor(Math.random()*10000);
    
    try {
        const docRef = doc(db, "factures_v2", id);
        
        await updateDoc(docRef, {
            type: 'FACTURE',
            numero: nouveauNumero,
            date_transformation: new Date().toISOString()
        });
        
        alert(`✅ Devis transformé en Facture N° ${nouveauNumero}`);
        chargerDocuments(); // Rafraîchir le tableau
    } catch(e) {
        alert("Erreur lors de la transformation : " + e.message);
    }
};

window.imprimer = function(id) {
    const docData = documentsCache.find(d => d.id === id);
    if(docData) PdfService.generer(docData);
};

window.editer = function(id) {
    const docData = documentsCache.find(d => d.id === id);
    if(!docData) return;
    window.currentDocId = id;
    document.getElementById('modal-title').textContent = `Modifier ${docData.type}`;
    
    document.getElementById('edit-client-nom').value = docData.client.nom;
    document.getElementById('edit-client-adresse').value = docData.client.adresse;
    document.getElementById('edit-defunt-nom').value = docData.defunt ? docData.defunt.nom : "";
    document.getElementById('edit-date').value = docData.date_creation.split('T')[0];
    document.getElementById('edit-numero').value = docData.numero;
    
    const container = document.getElementById('lignes-container');
    container.innerHTML = "";
    
    if(docData.lignes) {
        docData.lignes.forEach(l => {
            if(l.type === 'section') window.ajouterSection(l.description);
            else window.ajouterLigne(l.description, l.prix, l.category);
        });
    }
    window.calculerTotalModal();
    document.getElementById('modal-editor').classList.remove('hidden');
};

window.fermerModal = function() {
    document.getElementById('modal-editor').classList.add('hidden');
};

window.ajouterLigne = function(desc="", prix=0, cat="courant") {
    const div = document.createElement('div');
    div.className = "ligne-item form-grid";
    div.style.gridTemplateColumns = "3fr 1fr 1fr 30px";
    div.style.marginBottom = "5px";
    div.innerHTML = `
        <input type="text" class="l-desc" value="${desc}">
        <input type="number" class="l-prix" value="${prix}" step="0.01" onchange="window.calculerTotalModal()">
        <select class="l-cat">
            <option value="courant" ${cat==='courant'?'selected':''}>Courant</option>
            <option value="option" ${cat==='option'?'selected':''}>Option</option>
            <option value="tiers" ${cat==='tiers'?'selected':''}>Tiers</option>
        </select>
        <button onclick="this.parentElement.remove(); window.calculerTotalModal()" style="color:red; border:none; background:none;">&times;</button>
    `;
    document.getElementById('lignes-container').appendChild(div);
};

window.ajouterSection = function(titre="") {
    const div = document.createElement('div');
    div.style.background = "#f1f5f9"; div.style.padding = "5px"; div.style.marginTop = "10px";
    div.innerHTML = `
        <input type="text" class="l-desc section-title" value="${titre}" style="font-weight:bold; width:90%; border:none; background:transparent;">
        <input type="hidden" class="l-type" value="section">
        <button onclick="this.parentElement.remove()" style="float:right; color:red; border:none;">&times;</button>
    `;
    document.getElementById('lignes-container').appendChild(div);
};

window.calculerTotalModal = function() {
    let total = 0;
    document.querySelectorAll('.l-prix').forEach(i => total += parseFloat(i.value || 0));
    document.getElementById('edit-total').textContent = total.toFixed(2);
};

window.sauvegarderDocument = async function() {
    const lignes = [];
    const container = document.getElementById('lignes-container');
    for (let child of container.children) {
        if(child.querySelector('.l-type')?.value === 'section') {
            lignes.push({ type: 'section', description: child.querySelector('.l-desc').value });
        } else {
            lignes.push({
                type: 'item',
                description: child.querySelector('.l-desc').value,
                prix: child.querySelector('.l-prix').value,
                category: child.querySelector('.l-cat').value
            });
        }
    }

    const docData = {
        numero: document.getElementById('edit-numero').value,
        type: window.currentDocId ? 'MODIFIÉ' : 'DEVIS', // Si nouveau = DEVIS
        date_creation: document.getElementById('edit-date').value,
        client: { nom: document.getElementById('edit-client-nom').value, adresse: document.getElementById('edit-client-adresse').value },
        defunt: { nom: document.getElementById('edit-defunt-nom').value },
        lignes: lignes,
        total_ttc: parseFloat(document.getElementById('edit-total').textContent),
        acompte: 0
    };
    
    // Si c'est une modif, on garde le type original (DEVIS ou FACTURE)
    if(window.currentDocId) {
        const original = documentsCache.find(d => d.id === window.currentDocId);
        if(original) docData.type = original.type;
    }

    try {
        if(window.currentDocId) {
            await updateDoc(doc(db, "factures_v2", window.currentDocId), docData);
        } else {
            await addDoc(collection(db, "factures_v2"), docData);
        }
        window.fermerModal();
        chargerDocuments();
        alert("Enregistré !");
    } catch(e) { alert("Erreur : " + e.message); }
};

window.exporterCompta = function() { alert("Fonctionnalité Export Excel bientôt disponible."); };
