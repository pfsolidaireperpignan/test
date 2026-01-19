/* Fichier : js/v2/app.js - VERSION V6 (DRAG & DROP + PAIEMENTS DETAILLES) */
import { auth, db, collection, addDoc, getDocs, doc, updateDoc, query, orderBy, onAuthStateChanged, signOut } from "../config.js";
import { PdfService } from "./pdf.service.js";

// Modèle Standard
const MODELE_STANDARD = [
    { type: 'section', label: '1. CERCUEIL & ACCESSOIRES' },
    { type: 'item', label: 'Cercueil (Modèle Standard)', prix: 0, cat: 'courant' },
    { type: 'item', label: 'Capiton', prix: 0, cat: 'courant' },
    { type: 'item', label: 'Plaque d\'identité', prix: 35, cat: 'courant' },
    { type: 'section', label: '2. TRANSPORT' },
    { type: 'item', label: 'Véhicule agréé', prix: 0, cat: 'courant' },
    { type: 'item', label: 'Vacation porteurs', prix: 0, cat: 'courant' },
    { type: 'section', label: '3. DÉMARCHES' },
    { type: 'item', label: 'Démarches Administratives', prix: 0, cat: 'courant' }
];

let documentsCache = [];
let currentDocId = null;
let currentPayments = []; // Stockage temporaire des paiements lors de l'édition

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, (user) => {
        if (user) chargerDocuments();
        else window.location.href = 'index.html';
    });
    
    document.getElementById('btn-logout')?.addEventListener('click', () => {
        if(confirm("Se déconnecter ?")) signOut(auth).then(() => window.location.href = 'index.html');
    });

    // Initialisation Drag & Drop global
    initDragAndDrop();
});

// ==========================================================================
// 1. CHARGEMENT & STATS DÉTAILLÉES
// ==========================================================================
async function chargerDocuments() {
    const tbody = document.getElementById('table-body');
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Chargement...</td></tr>';

    try {
        const q = query(collection(db, "factures_v2"), orderBy("date_creation", "desc"));
        const snap = await getDocs(q);
        documentsCache = [];
        snap.forEach(docSnap => documentsCache.push({ id: docSnap.id, ...docSnap.data() }));
        
        calculerStatsGlobales(documentsCache);
        renderTable(documentsCache);
    } catch (e) { console.error(e); }
}

function calculerStatsGlobales(docs) {
    let ca = 0, totalEncaisse = 0;
    let esp = 0, chq = 0, vir = 0;

    docs.forEach(d => {
        if(d.type === 'FACTURE') {
            ca += parseFloat(d.total_ttc || 0);
            
            // Calculer les encaissements basés sur le tableau de paiements
            if (d.paiements && Array.isArray(d.paiements)) {
                d.paiements.forEach(p => {
                    const m = parseFloat(p.montant || 0);
                    totalEncaisse += m;
                    if(p.mode === 'ESPECE') esp += m;
                    else if(p.mode === 'CHEQUE') chq += m;
                    else vir += m;
                });
            } else {
                // Rétro-compatibilité : ancien champ acompte unique
                const ac = parseFloat(d.acompte || 0);
                if(ac > 0) {
                    totalEncaisse += ac;
                    vir += ac; // Par défaut virement si inconnu
                }
            }
        }
    });

    document.getElementById('stats-ca').textContent = ca.toFixed(2) + ' €';
    document.getElementById('stats-encaisse').textContent = totalEncaisse.toFixed(2) + ' €';
    document.getElementById('stats-reste').textContent = (ca - totalEncaisse).toFixed(2) + ' €';
    
    // Détails
    document.getElementById('stats-esp').textContent = esp.toFixed(2) + ' €';
    document.getElementById('stats-chq').textContent = chq.toFixed(2) + ' €';
    document.getElementById('stats-vir').textContent = vir.toFixed(2) + ' €';
}

function renderTable(docs) {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';
    docs.forEach(doc => {
        const total = parseFloat(doc.total_ttc || 0);
        
        // Calcul du payé
        let paye = 0;
        if(doc.paiements) doc.paiements.forEach(p => paye += parseFloat(p.montant));
        else paye = parseFloat(doc.acompte || 0);
        
        const reste = total - paye;
        let statut = "EN ATTENTE";
        let css = "status-pending";
        
        if(doc.type === 'DEVIS') { statut = "DEVIS"; css = "status-pending"; }
        else if(reste <= 0.1) { statut = "PAYÉ"; css = "status-paid"; }
        else if(paye > 0) { statut = "PARTIEL"; css = "status-pending"; }

        // Bouton transformer
        let btnTrans = doc.type === 'DEVIS' ? `<button onclick="window.convertir('${doc.id}')" class="btn-icon-action" style="color:blue;"><i class="fas fa-exchange-alt"></i></button>` : '';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${new Date(doc.date_creation).toLocaleDateString()}</td>
            <td><strong>${doc.numero}</strong></td>
            <td><span class="badge">${doc.type}</span></td>
            <td><strong>${doc.client.nom}</strong><br><small>${doc.defunt ? doc.defunt.nom : ''}</small></td>
            <td style="text-align:right;">${total.toFixed(2)} €</td>
            <td style="text-align:right; color:${reste>0.1?'red':'green'}">${reste.toFixed(2)} €</td>
            <td style="text-align:center;"><span class="status-badge ${css}">${statut}</span></td>
            <td class="actions-cell">
                ${btnTrans}
                <button onclick="window.imprimer('${doc.id}')" class="btn-icon-action btn-print"><i class="fas fa-print"></i></button>
                <button onclick="window.editer('${doc.id}')" class="btn-icon-action btn-edit"><i class="fas fa-pen"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ==========================================================================
// 2. ÉDITION & DRAG AND DROP
// ==========================================================================

// --- DRAG & DROP LOGIC ---
let dragSrcEl = null;

function initDragAndDrop() {
    // Cette fonction sera appelée à chaque ajout de ligne pour attacher les événements
}

function addDragEvents(row) {
    row.setAttribute('draggable', true);
    row.addEventListener('dragstart', function(e) {
        dragSrcEl = this;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', this.innerHTML);
        this.classList.add('dragging');
    });
    row.addEventListener('dragover', function(e) {
        if (e.preventDefault) e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        return false;
    });
    row.addEventListener('dragenter', function() { this.classList.add('over'); });
    row.addEventListener('dragleave', function() { this.classList.remove('over'); });
    row.addEventListener('drop', function(e) {
        if (e.stopPropagation) e.stopPropagation();
        if (dragSrcEl !== this) {
            // Echange de contenu (plus simple pour le DOM)
            // Ou insertion avant/après. Ici on fait une insertion
            this.parentNode.insertBefore(dragSrcEl, this.nextSibling === dragSrcEl ? this : this.nextSibling);
        }
        return false;
    });
    row.addEventListener('dragend', function() {
        this.classList.remove('dragging');
        document.querySelectorAll('.ligne-item').forEach(col => col.classList.remove('over'));
    });
}

// --- GESTION LIGNES ---
window.ajouterLigne = function(desc="", prix=0, cat="courant") {
    const div = document.createElement('div');
    div.className = "ligne-item form-grid";
    div.style.gridTemplateColumns = "10px 3fr 1fr 1fr 30px"; // +1 col pour poignée
    div.style.alignItems = "center"; 
    div.style.gap = "5px";
    div.style.marginBottom = "5px";
    div.style.padding = "5px";
    div.style.background = "white";
    div.style.border = "1px solid #f1f5f9";
    
    div.innerHTML = `
        <div style="cursor:move; color:#cbd5e1;"><i class="fas fa-grip-vertical"></i></div>
        <input type="text" class="l-desc" value="${desc}" placeholder="Désignation">
        <input type="number" class="l-prix" value="${prix}" step="0.01" onchange="window.calculerTotal()" placeholder="0.00">
        <select class="l-cat">
            <option value="courant" ${cat==='courant'?'selected':''}>Courant</option>
            <option value="option" ${cat==='option'?'selected':''}>Option</option>
            <option value="tiers" ${cat==='tiers'?'selected':''}>Tiers</option>
        </select>
        <button onclick="this.parentElement.remove(); window.calculerTotal()" style="color:red; background:none; border:none;">&times;</button>
    `;
    document.getElementById('lignes-container').appendChild(div);
    addDragEvents(div); // Active le drag
};

window.ajouterSection = function(titre="") {
    const div = document.createElement('div');
    div.className = "ligne-item ligne-section"; // Aussi draggable
    div.style.background = "#f1f5f9"; 
    div.style.padding = "8px"; 
    div.style.marginTop = "10px";
    div.style.cursor = "move";
    
    div.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px;">
            <i class="fas fa-grip-lines" style="color:#94a3b8;"></i>
            <input type="text" class="l-desc section-title" value="${titre}" style="font-weight:bold; width:100%; border:none; background:transparent;" placeholder="TITRE SECTION">
            <input type="hidden" class="l-type" value="section">
            <button onclick="this.parentElement.parentElement.remove()" style="color:red; border:none; background:none;">&times;</button>
        </div>
    `;
    document.getElementById('lignes-container').appendChild(div);
    addDragEvents(div);
};

// ==========================================================================
// 3. GESTION DES PAIEMENTS (NOUVEAU)
// ==========================================================================
window.ajouterPaiement = function() {
    const montant = parseFloat(document.getElementById('pay-amount').value);
    const mode = document.getElementById('pay-method').value;
    
    if(!montant || montant <= 0) return alert("Montant invalide");
    
    currentPayments.push({
        montant: montant,
        mode: mode,
        date: new Date().toISOString()
    });
    
    document.getElementById('pay-amount').value = "";
    afficherPaiements();
};

function afficherPaiements() {
    const container = document.getElementById('payments-container');
    container.innerHTML = "";
    let total = 0;
    
    currentPayments.forEach((p, index) => {
        total += parseFloat(p.montant);
        const div = document.createElement('div');
        div.style.display = "flex"; 
        div.style.justifyContent = "space-between";
        div.style.fontSize = "0.85rem";
        div.style.padding = "5px";
        div.style.borderBottom = "1px solid #eee";
        
        let icon = "fa-money-bill";
        if(p.mode === 'CHEQUE') icon = "fa-money-check";
        if(p.mode === 'VIREMENT') icon = "fa-university";
        
        div.innerHTML = `
            <span><i class="fas ${icon}"></i> ${new Date(p.date).toLocaleDateString()}</span>
            <strong>${parseFloat(p.montant).toFixed(2)} €</strong>
            <i class="fas fa-trash" style="color:red; cursor:pointer;" onclick="window.supprimerPaiement(${index})"></i>
        `;
        container.appendChild(div);
    });
    
    document.getElementById('total-paye').textContent = total.toFixed(2);
}

window.supprimerPaiement = function(index) {
    if(confirm("Supprimer ce paiement ?")) {
        currentPayments.splice(index, 1);
        afficherPaiements();
    }
};

// ==========================================================================
// 4. ACTIONS GLOBALES
// ==========================================================================

window.nouveauDocument = function() {
    currentDocId = null;
    currentPayments = []; // Reset paiements
    document.getElementById('modal-title').textContent = "Nouveau Devis";
    document.getElementById('edit-numero').value = "D-" + Date.now().toString().slice(-6);
    document.getElementById('lignes-container').innerHTML = "";
    
    // Chargement Modèle
    MODELE_STANDARD.forEach(l => {
        if(l.type === 'section') window.ajouterSection(l.label);
        else window.ajouterLigne(l.label, l.prix, l.cat);
    });
    
    afficherPaiements();
    window.calculerTotal();
    document.getElementById('modal-editor').classList.remove('hidden');
};

window.editer = function(id) {
    const doc = documentsCache.find(d => d.id === id);
    if(!doc) return;
    currentDocId = id;
    
    document.getElementById('edit-numero').value = doc.numero;
    document.getElementById('edit-client-nom').value = doc.client.nom;
    document.getElementById('edit-client-adresse').value = doc.client.adresse;
    document.getElementById('edit-defunt-nom').value = doc.defunt ? doc.defunt.nom : "";
    document.getElementById('edit-date').value = doc.date_creation.split('T')[0];
    
    // Lignes
    document.getElementById('lignes-container').innerHTML = "";
    if(doc.lignes) {
        doc.lignes.forEach(l => {
            if(l.type === 'section') window.ajouterSection(l.description);
            else window.ajouterLigne(l.description, l.prix, l.category);
        });
    }
    
    // Paiements (Gestion compatibilité ancien champ acompte)
    currentPayments = doc.paiements || [];
    if(currentPayments.length === 0 && doc.acompte > 0) {
        currentPayments.push({ montant: doc.acompte, mode: 'ANCIEN', date: doc.date_creation });
    }
    afficherPaiements();
    
    window.calculerTotal();
    document.getElementById('modal-editor').classList.remove('hidden');
};

window.calculerTotal = function() {
    let total = 0;
    document.querySelectorAll('.l-prix').forEach(el => total += parseFloat(el.value || 0));
    document.getElementById('edit-total').textContent = total.toFixed(2);
};

window.sauvegarderDocument = async function() {
    const lignes = [];
    document.getElementById('lignes-container').childNodes.forEach(child => {
        if(child.nodeType !== 1) return;
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
    });

    const docData = {
        numero: document.getElementById('edit-numero').value,
        type: currentDocId ? documentsCache.find(d=>d.id===currentDocId).type : 'DEVIS',
        date_creation: document.getElementById('edit-date').value,
        client: { nom: document.getElementById('edit-client-nom').value, adresse: document.getElementById('edit-client-adresse').value },
        defunt: { nom: document.getElementById('edit-defunt-nom').value },
        lignes: lignes,
        total_ttc: parseFloat(document.getElementById('edit-total').textContent),
        paiements: currentPayments, // Sauvegarde tableau détaillé
        acompte: currentPayments.reduce((acc, p) => acc + parseFloat(p.montant), 0) // Pour compatibilité
    };

    try {
        if(currentDocId) await updateDoc(doc(db, "factures_v2", currentDocId), docData);
        else await addDoc(collection(db, "factures_v2"), docData);
        window.fermerModal();
        chargerDocuments();
    } catch(e) { alert("Erreur : " + e.message); }
};

window.fermerModal = function() { document.getElementById('modal-editor').classList.add('hidden'); };
window.convertir = async function(id) {
    if(confirm("Transformer ce devis en FACTURE ?")) {
        const newNum = "F-" + Date.now().toString().slice(-6);
        await updateDoc(doc(db, "factures_v2", id), { type: 'FACTURE', numero: newNum });
        chargerDocuments();
    }
};
window.imprimer = function(id) {
    const d = documentsCache.find(doc => doc.id === id);
    if(d) PdfService.generer(d);
};
