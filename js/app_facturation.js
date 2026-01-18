/* Fichier : js/app_facturation.js - VERSION FUSION (Stable + Nouveautés) */
import { Facture } from './domain/Facture.js';
import { LigneFacture } from './domain/LigneFacture.js';
import { Paiement } from './domain/Paiement.js';
import { CalculService } from './services/CalculService.js';
import { ReglesMetier } from './services/ReglesMetier.js';
import { NumberingService } from './services/NumberingService.js';
import { DbService } from './infrastructure/DbService.js';
import { PdfService } from './infrastructure/PdfService.js';
import { FormMapper } from './ui/FormMapper.js';
import { TableRenderer } from './ui/TableRenderer.js';
import { auth } from './config.js'; 
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- ETAT DE L'APPLICATION ---
const AppState = {
    facture: new Facture(),
    clientsCache: []
};

// --- INITIALISATION ---
window.addEventListener('DOMContentLoaded', async () => {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = "index.html";
            return;
        }

        // 1. Charger les clients pour la recherche
        try {
            const clients = await DbService.getAll('dossiers_clients', 'nom');
            AppState.clientsCache = clients;
            const datalist = document.getElementById('clients-datalist');
            if (datalist) {
                datalist.innerHTML = '';
                clients.forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = `${c.soussigne || c.nom} (Défunt: ${c.nom} ${c.prenom})`;
                    datalist.appendChild(opt);
                });
            }
        } catch (e) { console.error(e); }

        // 2. Vérifier l'URL (Edition ou Liste ?)
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('id');

        if (id) {
            await chargerDocumentOuClient(id);
        } else {
            afficherVue('list');
            chargerHistorique();
        }
    });
});

// --- FONCTIONS LOGIQUES ---

async function chargerHistorique() {
    const tbody = document.getElementById('history-body');
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Chargement...</td></tr>';

    try {
        const docs = await DbService.getAll('factures', 'created_at');
        // Tri du plus récent au plus vieux
        docs.sort((a,b) => new Date(b.date_creation || 0) - new Date(a.date_creation || 0));

        if (docs.length === 0) { tbody.innerHTML = '<tr><td colspan="7">Aucun document.</td></tr>'; return; }
        
        tbody.innerHTML = '';
        docs.forEach(d => {
            const total = parseFloat(d.total_ttc || 0).toFixed(2);
            let dateStr = d.date_creation ? new Date(d.date_creation).toLocaleDateString() : '-';
            
            // Bouton convertir pour les devis
            let btnAction = d.type === 'DEVIS' ? 
                `<button onclick="window.convertirEnFacture('${d.id}')" title="Convertir" style="margin-right:5px; background:#eff6ff; border:1px solid #3b82f6;"><i class="fas fa-exchange-alt" style="color:#3b82f6;"></i></button>` : '';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding:12px;">${dateStr}</td>
                <td><span class="status-tag ${d.type === 'FACTURE' ? 'tag-facture' : 'tag-devis'}">${d.type}</span></td>
                <td><strong>${d.numero}</strong></td>
                <td><div>${d.client_nom || '-'}</div><div style="font-size:0.85em; color:#64748b;">${d.defunt_nom || ''}</div></td>
                <td>${d.type_obseques || '-'}</td>
                <td style="text-align:right;"><strong>${total} €</strong></td>
                <td style="text-align:center;">
                    ${btnAction}
                    <button onclick="window.location.href='facturation.html?id=${d.id}'" style="margin-right:5px;"><i class="fas fa-pen"></i></button>
                    <button onclick="window.supprimerDocument('${d.id}')" style="color:red;"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        // Mise à jour des compteurs (simple)
        let ca = 0;
        docs.filter(d => d.type === 'FACTURE').forEach(d => ca += parseFloat(d.total_ttc || 0));
        if(document.getElementById('stat-ca')) document.getElementById('stat-ca').textContent = ca.toLocaleString('fr-FR', {style:'currency', currency:'EUR'});

    } catch (e) { console.error(e); }
}

async function chargerDocumentOuClient(id) {
    afficherVue('form');
    // Est-ce une facture existante ?
    const doc = await DbService.getById('factures', id);
    if (doc) {
        AppState.facture = new Facture(doc); // Ici LigneFacture va faire son travail de détective
        FormMapper.toggleEditMode(false);
    } else {
        // Est-ce un client pour une nouvelle facture ?
        const cli = AppState.clientsCache.find(c => c.id === id) || await DbService.getById('dossiers_clients', id);
        window.initialiserNouveauDoc();
        if (cli) {
            AppState.facture.client_id = cli.id;
            AppState.facture.client_nom = cli.soussigne || cli.nom;
            AppState.facture.client_adresse = cli.demeurant || '';
            AppState.facture.defunt_nom = `${cli.nom} ${cli.prenom}`;
        }
    }
    updateUI();
}

function afficherVue(nomVue) {
    const vueListe = document.getElementById('view-list');
    const vueForm = document.getElementById('view-form');
    if (nomVue === 'form') {
        vueListe.classList.add('hidden');
        vueForm.classList.remove('hidden');
    } else {
        vueForm.classList.add('hidden');
        vueListe.classList.remove('hidden');
    }
}

function updateUI() {
    AppState.facture = CalculService.recalculer(AppState.facture);
    FormMapper.fill(AppState.facture);
    
    // Drag & Drop activé
    TableRenderer.render(
        AppState.facture, 
        (idx) => { AppState.facture.lignes.splice(idx, 1); updateUI(); }, 
        () => updateUI(),
        (from, to) => { 
            const el = AppState.facture.lignes.splice(from, 1)[0];
            AppState.facture.lignes.splice(to, 0, el);
            updateUI();
        }
    );
    
    // Rendu Paiements
    const tbodyPay = document.getElementById('payments-body');
    if(tbodyPay) {
        tbodyPay.innerHTML = '';
        (AppState.facture.paiements || []).forEach((p, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${new Date(p.date).toLocaleDateString()}</td><td>${p.mode}</td><td>${p.reference}</td><td style="text-align:right;">${p.montant.toFixed(2)} €</td><td style="text-align:center;"><i class="fas fa-times" style="color:red; cursor:pointer;" onclick="window.supprimerPaiement(${idx})"></i></td>`;
            tbodyPay.appendChild(tr);
        });
    }
    
    // Totaux bas de page
    if(document.getElementById('display-total-paye')) document.getElementById('display-total-paye').textContent = (AppState.facture.total_paye || 0).toFixed(2) + ' €';
    if(document.getElementById('display-reste')) document.getElementById('display-reste').textContent = (AppState.facture.reste_a_payer || 0).toFixed(2) + ' €';
}

// --- FONCTIONS GLOBALES (EXPOSÉES AU HTML) ---
// C'est ici qu'on assure que les boutons marchent toujours

window.initialiserNouveauDoc = function() {
    afficherVue('form');
    AppState.facture = new Facture();
    FormMapper.toggleEditMode(true);
    updateUI();
};

window.nouvelleFacture = function() { window.initialiserNouveauDoc(); };
window.afficherListe = function() { afficherVue('list'); chargerHistorique(); };
window.retourAccueil = function() { window.location.href='index.html'; };
window.ajouterLigne = function() { AppState.facture.lignes.push(new LigneFacture({type:'line'})); updateUI(); };
window.ajouterTitreSection = function() { AppState.facture.lignes.push(new LigneFacture({type:'section', description:'SECTION'})); updateUI(); };
window.setModeEdition = function(bool) { FormMapper.toggleEditMode(bool); };
window.genererPDFFacture = function() { PdfService.generer(AppState.facture); };

// SAUVEGARDE CORRIGÉE
window.sauvegarderFactureBase = async function() {
    try {
        AppState.facture = FormMapper.read(AppState.facture);
    } catch(e) { alert("Erreur lecture: " + e.message); return; }
    
    // Génération Numéro si nécessaire
    if (!AppState.facture.numero || AppState.facture.numero === 'BROUILLON' || AppState.facture.numero.includes('(')) {
        try {
            const last = await DbService.getLastDocument('factures', AppState.facture.type);
            AppState.facture.numero = NumberingService.genererSuivant(AppState.facture.type, last ? last.numero : null);
        } catch(e) { console.error(e); AppState.facture.numero = "ERR-" + Date.now(); }
    }

    try {
        const id = await DbService.save('factures', AppState.facture);
        AppState.facture.id = id;
        alert(`✅ Sauvegardé : ${AppState.facture.numero}`);
        FormMapper.toggleEditMode(false); 
        updateUI();
    } catch (e) { 
        console.error("ERREUR SAVE:", e); 
        alert("Erreur sauvegarde. Vérifiez la console."); 
    }
};

window.convertirEnFacture = async function(id) {
    if(!confirm("Convertir en Facture ?")) return;
    try {
        const devis = await DbService.getById('factures', id);
        if(!devis) return;
        const newFacture = { ...devis }; 
        delete newFacture.id; 
        newFacture.type = 'FACTURE'; 
        newFacture.numero = '(Auto)'; 
        newFacture.date_creation = new Date().toISOString(); 
        newFacture.reference_devis = devis.numero; 
        newFacture.paiements = [];
        AppState.facture = new Facture(newFacture);
        await window.sauvegarderFactureBase();
        window.afficherListe();
    } catch(e) { console.error(e); }
};

window.supprimerDocument = async function(id) { 
    if(confirm("Supprimer ?")) { await DbService.delete('factures', id); chargerHistorique(); } 
};

window.ajouterPaiement = function() {
    const mt = parseFloat(document.getElementById('pay_montant').value);
    if(!mt) return alert("Montant incorrect");
    AppState.facture.paiements.push(new Paiement({date: document.getElementById('pay_date').value, mode: document.getElementById('pay_mode').value, reference: document.getElementById('pay_ref').value, montant: mt}));
    document.getElementById('pay_montant').value = ''; document.getElementById('pay_ref').value = '';
    updateUI();
};

window.supprimerPaiement = function(idx) { 
    if(confirm("Supprimer ?")) { AppState.facture.paiements.splice(idx,1); updateUI(); } 
};

// MODÈLES (Avec Rapatriement !)
window.changerModele = function(type) {
    if(AppState.facture.lignes.length > 0 && !confirm("Remplacer le contenu ?")) {
        document.getElementById('facture_sujet_select').selectedIndex = 0;
        return;
    }
    AppState.facture.lignes=[]; 
    AppState.facture.type_obseques = type;
    
    const S = (t) => AppState.facture.lignes.push(new LigneFacture({type:'section', description:t}));
    const L = (d, p, t='courant') => AppState.facture.lignes.push(new LigneFacture({description:d, prix_unitaire:p, type_prestation:t}));

    if(type === 'INHUMATION'){ 
        S("1 - PRÉPARATION"); L("Démarches Mairie/Pref", 250); L("Organisation Obsèques", 150); L("Toilette mortuaire", 120); L("Soins de conservation", 280, 'option');
        S("2 - TRANSPORT"); L("Corbillard avec chauffeur", 450); L("Porteurs (x4)", 400, 'option');
        S("3 - CERCUEIL"); L("Cercueil Chêne", 950); L("Plaque + Capiton", 85); L("Ouverture Fosse", 650); 
    }
    else if(type === 'CREMATION'){ 
        S("1 - PRÉPARATION"); L("Démarches Administratives", 250); L("Organisation", 150);
        S("2 - TRANSPORT"); L("Corbillard", 450); L("Cercueil Pin (Crémation)", 580); L("Urne cinéraire", 150); 
        S("3 - CRÉMATORIUM"); L("Redevance Crématorium", 680); L("Dispersion cendres", 50, 'option');
    }
    else if(type === 'RAPATRIEMENT'){
        S("1 - ADMINISTRATIF"); L("Démarches Consulat/Pref", 350); L("Soins conservation (Obli.)", 380); L("Toilette", 120);
        S("2 - CERCUEIL"); L("Cercueil Rapatriement", 850); L("Zinc avec épurateur", 450); L("Soudure/Scellés", 120); L("Emballage fret", 90);
        S("3 - TRANSPORT AÉRIEN"); L("Transport Aéroport", 350); L("Fret Aérien (Estim.)", 1500, 'option'); L("LTA (Lettre Transport)", 80, 'option');
    }
    else if(type === 'EXHUMATION'){
        S("1 - ADMINISTRATIF"); L("Demande Mairie", 150); L("Vacation Police", 25);
        S("2 - CIMETIÈRE"); L("Ouverture Sépulture", 550); L("Exhumation", 450); L("Reliquaire", 180); L("Réduction corps", 250, 'option'); L("Fermeture Sépulture", 550);
    }
    else if(type === 'TRANSPORT'){
        S("1 - DÉPART"); L("Mise en bière", 100); L("Fermeture Cercueil", 50);
        S("2 - ROUTE"); L("Véhicule (Forfait)", 250); L("Indemnité km", 150, 'option');
    }
    S("DIVERS"); L("Avis presse", 0, 'option');
    updateUI();
};