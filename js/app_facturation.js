/* Fichier : js/app_facturation.js - VERSION FINALE DEBLOCAGE */
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

// --- ETAT GLOBAL ---
const AppState = {
    facture: new Facture(),
    clientsCache: []
};

// --- FONCTIONS INTERNES (Logique) ---
async function chargerHistorique() {
    const tbody = document.getElementById('history-body');
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Chargement...</td></tr>';

    try {
        const docs = await DbService.getAll('factures', 'created_at');
        const now = new Date();
        const anneeEnCours = now.getFullYear();
        let totalCA = 0; let totalEncaisse = 0; let totalImpaye = 0; let nbDevis = 0;

        docs.forEach(d => {
            const mtTotal = parseFloat(d.total_ttc || 0);
            let mtPaye = 0;
            if(d.paiements && Array.isArray(d.paiements)) {
                d.paiements.forEach(p => mtPaye += parseFloat(p.montant || 0));
            } else {
                mtPaye = parseFloat(d.acompte || 0);
            }

            if (d.type === 'FACTURE') {
                if(new Date(d.date_creation).getFullYear() === anneeEnCours) {
                    totalCA += mtTotal;
                    totalEncaisse += mtPaye;
                }
                const reste = mtTotal - mtPaye;
                if(reste > 0.5) totalImpaye += reste;
            } else if (d.type === 'DEVIS') {
                nbDevis++;
            }
        });

        const fmt = n => (n || 0).toLocaleString('fr-FR', {style:'currency', currency:'EUR'});
        
        if(document.getElementById('stat-ca')) document.getElementById('stat-ca').textContent = fmt(totalCA);
        if(document.getElementById('stat-encaisse')) document.getElementById('stat-encaisse').textContent = fmt(totalEncaisse);
        if(document.getElementById('stat-impaye')) document.getElementById('stat-impaye').textContent = fmt(totalImpaye);
        if(document.getElementById('stat-devis')) document.getElementById('stat-devis').textContent = nbDevis;

        if (docs.length === 0) { tbody.innerHTML = '<tr><td colspan="7">Aucun document.</td></tr>'; return; }
        
        tbody.innerHTML = '';
        docs.sort((a,b) => new Date(b.date_creation || 0) - new Date(a.date_creation || 0)).forEach(d => {
            let dateStr = d.date_creation ? new Date(d.date_creation).toLocaleDateString() : '-';
            let btnAction = d.type === 'DEVIS' ? `<button onclick="window.convertirEnFacture('${d.id}')" style="margin-right:5px; background:#eff6ff; border:1px solid #3b82f6;"><i class="fas fa-exchange-alt" style="color:#3b82f6;"></i></button>` : '';
            const affichageTotal = parseFloat(d.total_ttc || 0).toFixed(2);

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding:12px;">${dateStr}</td>
                <td><span class="status-tag ${d.type === 'FACTURE' ? 'tag-facture' : 'tag-devis'}">${d.type}</span></td>
                <td><strong>${d.numero}</strong></td>
                <td><div>${d.client_nom || '-'}</div><div style="font-size:0.85em; color:#64748b;">${d.defunt_nom || ''}</div></td>
                <td>${d.type_obseques || '-'}</td>
                <td style="text-align:right;"><strong>${affichageTotal} €</strong></td>
                <td style="text-align:center;">
                    ${btnAction}
                    <button onclick="window.location.href='facturation.html?id=${d.id}'" style="margin-right:5px;"><i class="fas fa-pen"></i></button>
                    <button onclick="window.supprimerDocument('${d.id}')" style="color:red;"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) { console.error(e); }
}

function afficherVue(nomVue) {
    const vueListe = document.getElementById('view-list');
    const vueForm = document.getElementById('view-form');
    if (nomVue === 'form') {
        vueListe.classList.add('hidden');
        vueForm.classList.remove('hidden');
        window.scrollTo(0, 0);
    } else {
        vueForm.classList.add('hidden');
        vueListe.classList.remove('hidden');
    }
}

async function chargerDocumentOuClient(id) {
    afficherVue('form');
    const doc = await DbService.getById('factures', id);
    if (doc) {
        AppState.facture = new Facture(doc);
        FormMapper.toggleEditMode(false);
    } else {
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

function updateUI() {
    AppState.facture = CalculService.recalculer(AppState.facture);
    FormMapper.fill(AppState.facture);
    
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
    
    const tbodyPay = document.getElementById('payments-body');
    if(tbodyPay) {
        tbodyPay.innerHTML = '';
        (AppState.facture.paiements || []).forEach((p, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${new Date(p.date).toLocaleDateString()}</td><td>${p.mode}</td><td>${p.reference}</td><td style="text-align:right;">${p.montant.toFixed(2)} €</td><td style="text-align:center;"><i class="fas fa-times" style="color:red; cursor:pointer;" onclick="window.supprimerPaiement(${idx})"></i></td>`;
            tbodyPay.appendChild(tr);
        });
    }
    if(document.getElementById('display-total-paye')) document.getElementById('display-total-paye').textContent = AppState.facture.total_paye.toFixed(2) + ' €';
    if(document.getElementById('display-reste')) document.getElementById('display-reste').textContent = AppState.facture.reste_a_payer.toFixed(2) + ' €';
    
    const badgeStatus = document.getElementById('payment-status'); 
    if(badgeStatus) { 
        badgeStatus.textContent = AppState.facture.statut; 
        badgeStatus.className = 'status-tag';
        if(AppState.facture.statut === 'PAYÉE') { badgeStatus.style.background = '#dcfce7'; badgeStatus.style.color = '#166534'; }
        else if(AppState.facture.statut === 'PARTIELLE') { badgeStatus.style.background = '#ffedd5'; badgeStatus.style.color = '#9a3412'; }
        else { badgeStatus.style.background = '#fee2e2'; badgeStatus.style.color = '#991b1b'; }
    }
}

// --- EXPOSITION DES FONCTIONS AU HTML (C'est ICI que ça bloque d'habitude) ---
// On attache manuellement chaque fonction à "window" pour que le HTML les trouve.

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

window.sauvegarderFactureBase = async function() {
    console.log("Sauvegarde lancée...");
    try {
        AppState.facture = FormMapper.read(AppState.facture);
    } catch(e) { alert("Erreur lecture: " + e.message); return; }
    
    const check = ReglesMetier.valider(AppState.facture);
    if (!check.valide) { alert("⚠️ Données incomplètes :\n- " + check.erreurs.join("\n- ")); return; }

    if (!AppState.facture.numero || AppState.facture.numero === 'BROUILLON' || AppState.facture.numero.includes('(')) {
        try {
            const last = await DbService.getLastDocument('factures', AppState.facture.type);
            AppState.facture.numero = NumberingService.genererSuivant(AppState.facture.type, last ? last.numero : null);
        } catch(e) { console.error(e); AppState.facture.numero = "ERR-" + Date.now(); }
    }

    try {
        const id = await DbService.save('factures', AppState.facture);
        AppState.facture.id = id;
        alert(`✅ Enregistré !\nNuméro : ${AppState.facture.numero}`);
        FormMapper.toggleEditMode(false); 
        updateUI();
    } catch (e) { console.error("ERREUR SAVE:", e); alert("Erreur technique enregistrement"); }
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
    if(confirm("Supprimer ce paiement ?")) { AppState.facture.paiements.splice(idx,1); updateUI(); } 
};

window.changerModele = function(type) {
    if(AppState.facture.lignes.length > 0 && !confirm("Remplacer le contenu par le modèle " + type + " ?")) {
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

// INITIALISATION AU CHARGEMENT
window.addEventListener('DOMContentLoaded', async () => {
    onAuthStateChanged(auth, (user) => {
        if (!user) window.location.href = "index.html";
        else {
            // Chargement initial une fois connecté
            const urlParams = new URLSearchParams(window.location.search);
            const idFromUrl = urlParams.get('id');

            // Chargement clients
            DbService.getAll('dossiers_clients', 'nom').then(clients => {
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
            }).catch(e => console.error("Erreur clients", e));

            // Routing
            if (idFromUrl) {
                chargerDocumentOuClient(idFromUrl);
            } else {
                afficherVue('list');
                chargerHistorique();
            }
        }
    });
});