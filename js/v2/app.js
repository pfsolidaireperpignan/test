/* Fichier : js/v2/app.js - VERSION "MODELES COMPLETS FRANCE" */
import { db, auth, onAuthStateChanged, collection, addDoc, updateDoc, doc, getDoc, getDocs, query, orderBy, where, limit, COLLECTION_NAME } from './config.js';
import { createFacture, createLigne, createPaiement } from './models.js';
import { PdfService } from './pdf.service.js';

const App = { user: null, currentDoc: null };

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, (user) => {
        if (!user) window.location.href = 'index.html';
        else {
            App.user = user;
            if(document.getElementById('app-loader')) document.getElementById('app-loader').style.display = 'none';
            initApp();
        }
    });
});

function initApp() {
    chargerHistorique();

    const container = document.getElementById('lines-container');
    if (window.Sortable) {
        new Sortable(container, {
            handle: '.drag-handle',
            animation: 150,
            ghostClass: 'sortable-ghost',
            onEnd: function (evt) {
                const item = App.currentDoc.lignes.splice(evt.oldIndex, 1)[0];
                App.currentDoc.lignes.splice(evt.newIndex, 0, item);
                renderLignes(); 
            }
        });
    }

    document.getElementById('btn-logout').addEventListener('click', () => {
        if(confirm("Se déconnecter ?")) auth.signOut().then(() => window.location.href = 'index.html');
    });

    document.getElementById('btn-new-facture').addEventListener('click', () => ouvrirEditeur());
    document.getElementById('nav-dashboard').addEventListener('click', () => {
        document.getElementById('view-editor').classList.add('hidden');
        document.getElementById('view-dashboard').classList.remove('hidden');
        chargerHistorique();
    });
    document.getElementById('btn-back').addEventListener('click', () => {
        document.getElementById('view-editor').classList.add('hidden');
        document.getElementById('view-dashboard').classList.remove('hidden');
        chargerHistorique();
    });

    document.getElementById('btn-add-line').addEventListener('click', () => {
        App.currentDoc.lignes.push(createLigne({ type: 'line', description: '' }));
        renderLignes();
    });
    document.getElementById('btn-add-section').addEventListener('click', () => {
        App.currentDoc.lignes.push(createLigne({ type: 'section', description: 'TITRE DE SECTION' }));
        renderLignes();
    });
    document.getElementById('btn-save').addEventListener('click', sauvegarderDocument);
    document.getElementById('btn-print').addEventListener('click', () => {
        if(App.currentDoc) PdfService.generer(App.currentDoc);
    });
    document.getElementById('select-modeles').addEventListener('change', (e) => {
        if(e.target.value) appliquerModele(e.target.value);
    });

    document.getElementById('btn-add-pay').addEventListener('click', () => {
        const mt = parseFloat(document.getElementById('pay-montant').value);
        if(!mt) return alert("Montant invalide");
        App.currentDoc.paiements.push(createPaiement({
            date: document.getElementById('pay-date').value,
            mode: document.getElementById('pay-mode').value,
            montant: mt
        }));
        document.getElementById('pay-montant').value = '';
        renderPaiements();
    });

    document.getElementById('btn-export').addEventListener('click', exporterComptabilite);
}

// ... (Les fonctions chargerHistorique, ouvrirEditeur, renderPaiements, etc. restent identiques à la version précédente. 
// Je ne remets que la fonction renderLignes et appliquerModele qui changent vraiment ou sont critiques)

async function chargerHistorique() {
    // ... (Gardez le code de chargerHistorique de la version précédente ou copiez-le ici si besoin, c'est le même)
    // Pour simplifier la réponse, je remets le bloc complet standard :
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center">Chargement...</td></tr>';
    try {
        const q = query(collection(db, COLLECTION_NAME), orderBy('date_creation', 'desc'));
        const snapshot = await getDocs(q);
        let caAnnuel = 0, encaisse = 0, resteGlobal = 0;
        const clientsUniques = new Set(); 
        const anneeEnCours = new Date().getFullYear();
        const dateLimiteDevis = new Date(); dateLimiteDevis.setDate(dateLimiteDevis.getDate() - 90);

        if (snapshot.empty) { tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px;">Vide.</td></tr>'; return; }

        tbody.innerHTML = '';
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const dateDoc = new Date(data.date_creation);
            if(data.client && data.client.nom) clientsUniques.add(data.client.nom);
            const total = parseFloat(data.total_ttc || 0);
            const paye = parseFloat(data.solde_paye || 0);
            const reste = total - paye;
            if(data.type === 'FACTURE') {
                if (dateDoc.getFullYear() === anneeEnCours) caAnnuel += total;
                encaisse += paye;
                resteGlobal += reste;
            }
            let badge = '', convertBtn = '';
            if (data.type === 'FACTURE') {
                if (reste <= 0.05 && total > 0) badge = `<span class="tag" style="background:#dcfce7; color:#166534;">PAYÉ</span>`;
                else if (paye > 0) badge = `<span class="tag" style="background:#ffedd5; color:#9a3412;">PARTIEL</span>`;
                else badge = `<span class="tag" style="background:#fee2e2; color:#991b1b;">À PAYER</span>`;
            } else {
                if (dateDoc < dateLimiteDevis) {
                    badge = `<span class="tag" style="background:#94a3b8; color:white;">EXPIRÉ</span>`;
                    convertBtn = `<button class="btn-icon convert-btn" data-id="${docSnap.id}" title="Réactiver"><i class="fas fa-redo"></i></button>`;
                } else {
                    badge = `<span class="tag" style="background:#f1f5f9; color:#64748b;">DEVIS</span>`;
                    convertBtn = `<button class="btn-icon convert-btn" data-id="${docSnap.id}" title="Convertir"><i class="fas fa-exchange-alt"></i></button>`;
                }
            }
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${dateDoc.toLocaleDateString()}</td><td><strong>${data.numero}</strong></td><td><span class="badge">${data.type}</span></td><td><div>${data.client.nom}</div><div style="font-size:0.8em; color:#666;">${data.defunt.nom}</div></td><td style="text-align:right"><strong>${total.toFixed(2)} €</strong></td><td style="text-align:right; color:${reste > 0 ? '#ef4444' : '#166534'}">${reste.toFixed(2)} €</td><td style="text-align:center">${badge}</td><td style="text-align:center">${convertBtn}<button class="btn-icon print-btn" data-id="${docSnap.id}"><i class="fas fa-print"></i></button><button class="btn-icon edit-btn" data-id="${docSnap.id}"><i class="fas fa-pen"></i></button></td>`;
            tbody.appendChild(tr);
        });

        const datalist = document.getElementById('list-clients'); datalist.innerHTML = '';
        clientsUniques.forEach(nom => { const opt = document.createElement('option'); opt.value = nom; datalist.appendChild(opt); });

        const fmt = (n) => n.toLocaleString('fr-FR', {style:'currency', currency:'EUR'});
        if(document.getElementById('stat-ca')) {
             document.getElementById('stat-ca').textContent = fmt(caAnnuel);
             document.getElementById('stat-ca').parentElement.querySelector('div:first-child').textContent = `CHIFFRE D'AFFAIRES (${anneeEnCours})`;
        }
        if(document.getElementById('stat-paye')) document.getElementById('stat-paye').textContent = fmt(encaisse);
        if(document.getElementById('stat-reste')) document.getElementById('stat-reste').textContent = fmt(resteGlobal);

        document.querySelectorAll('.print-btn').forEach(btn => btn.addEventListener('click', async () => {
            const docRef = doc(db, COLLECTION_NAME, btn.dataset.id); const snap = await getDoc(docRef);
            if(snap.exists()) PdfService.generer(snap.data());
        }));
        document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', async () => {
            const docRef = doc(db, COLLECTION_NAME, btn.dataset.id); const snap = await getDoc(docRef);
            if(snap.exists()) { const data = snap.data(); data.id = snap.id; ouvrirEditeur(data); }
        }));
        document.querySelectorAll('.convert-btn').forEach(btn => btn.addEventListener('click', async () => {
            if(!confirm("Convertir ce Devis en Facture officielle ?")) return;
            try {
                const id = btn.dataset.id; const docRef = doc(db, COLLECTION_NAME, id); const snap = await getDoc(docRef);
                if(snap.exists()) {
                    const data = snap.data(); data.type = 'FACTURE'; data.numero = await genererNumero('FACTURE'); data.date_creation = new Date().toISOString().split('T')[0];
                    await updateDoc(docRef, data); alert(`✅ Validé ! Facture N° ${data.numero}`); chargerHistorique();
                }
            } catch(e) { console.error(e); alert("Erreur"); }
        }));
    } catch (e) { console.error(e); }
}

function ouvrirEditeur(docData = null) {
    App.currentDoc = createFacture(docData || {});
    document.getElementById('input-client-nom').value = App.currentDoc.client.nom;
    document.getElementById('input-client-adresse').value = App.currentDoc.client.adresse;
    document.getElementById('input-defunt-nom').value = App.currentDoc.defunt.nom;
    document.getElementById('input-type-doc').value = App.currentDoc.type;
    document.getElementById('input-date').value = App.currentDoc.date_creation;
    document.getElementById('pay-date').value = new Date().toISOString().split('T')[0];
    renderLignes(); renderPaiements();
    document.getElementById('view-dashboard').classList.add('hidden'); document.getElementById('view-editor').classList.remove('hidden');
}

function renderLignes() {
    const container = document.getElementById('lines-container'); container.innerHTML = ''; let total = 0;
    App.currentDoc.lignes.forEach((ligne, index) => {
        const tr = document.createElement('tr');
        const dragHandle = `<i class="fas fa-grip-vertical drag-handle" style="cursor:grab; margin-right:10px; color:#cbd5e1;"></i>`;
        if (ligne.type === 'section') {
            tr.style.background = '#f1f5f9';
            tr.innerHTML = `<td colspan="4" style="display:flex; align-items:center;">${dragHandle}<input type="text" value="${ligne.description}" style="width:100%; font-weight:bold; background:transparent; border:none; margin-left:10px;" onchange="updateLigne(${index}, 'description', this.value)"></td><td style="text-align:center"><button onclick="deleteLigne(${index})" style="color:red; border:none; background:none;"><i class="fas fa-trash"></i></button></td>`;
        } else {
            total += parseFloat(ligne.prix || 0);
            tr.innerHTML = `<td style="display:flex; align-items:center;">${dragHandle}<input type="text" value="${ligne.description}" style="width:100%; margin-left:10px;" onchange="updateLigne(${index}, 'description', this.value)"></td><td><select onchange="updateLigne(${index}, 'category', this.value)"><option value="courant" ${ligne.category==='courant'?'selected':''}>Courant</option><option value="option" ${ligne.category==='option'?'selected':''}>Option</option></select></td><td><select><option>NA</option></select></td><td><input type="number" step="0.01" value="${ligne.prix}" style="width:100px; text-align:right" onchange="updateLigne(${index}, 'prix', this.value)"></td><td style="text-align:center"><button onclick="deleteLigne(${index})" style="color:#ccc; border:none; background:none;"><i class="fas fa-trash"></i></button></td>`;
        }
        container.appendChild(tr);
    });
    App.currentDoc.total_ttc = total; document.getElementById('display-total').textContent = total.toFixed(2) + ' €'; calculerSolde();
    window.updateLigne = (idx, f, v) => { if(f==='prix') v = parseFloat(v)||0; App.currentDoc.lignes[idx][f] = v; if(f==='prix') renderLignes(); };
    window.deleteLigne = (idx) => { App.currentDoc.lignes.splice(idx, 1); renderLignes(); };
}

function renderPaiements() {
    const container = document.getElementById('payments-container'); container.innerHTML = ''; let totalPaye = 0;
    App.currentDoc.paiements.forEach((p, idx) => {
        totalPaye += p.montant; const tr = document.createElement('tr');
        tr.innerHTML = `<td>${new Date(p.date).toLocaleDateString()}</td><td><span class="badge">${p.mode}</span></td><td style="text-align:right;">${p.montant.toFixed(2)} €</td><td style="text-align:center"><button onclick="deletePayment(${idx})" style="color:red; border:none; background:none;"><i class="fas fa-trash"></i></button></td>`;
        container.appendChild(tr);
    });
    App.currentDoc.solde_paye = totalPaye; calculerSolde();
    window.deletePayment = (idx) => { App.currentDoc.paiements.splice(idx, 1); renderPaiements(); };
}

function calculerSolde() {
    const total = App.currentDoc.total_ttc || 0; const paye = App.currentDoc.solde_paye || 0; const reste = Math.max(0, total - paye);
    const divReste = document.getElementById('display-reste'); divReste.textContent = reste.toFixed(2) + ' €';
    if (reste <= 0.05 && total > 0) { divReste.style.color = '#166534'; divReste.textContent = "SOLDE RÉGLÉ"; } else { divReste.style.color = '#ef4444'; }
}

async function genererNumero(type) {
    const prefix = type === 'FACTURE' ? 'F' : 'D'; const year = new Date().getFullYear(); const base = `${prefix}-${year}-`;
    const q = query(collection(db, COLLECTION_NAME), where("numero", ">=", base), where("numero", "<=", base + "\uf8ff"), orderBy("numero", "desc"), limit(1));
    const snap = await getDocs(q); let seq = 1;
    if (!snap.empty) { const parts = snap.docs[0].data().numero.split('-'); if(parts.length === 3) seq = parseInt(parts[2]) + 1; }
    return `${base}${seq.toString().padStart(3, '0')}`;
}

async function sauvegarderDocument() {
    const btn = document.getElementById('btn-save'); const oldText = btn.innerHTML; btn.innerHTML = '...'; btn.disabled = true;
    try {
        App.currentDoc.client.nom = document.getElementById('input-client-nom').value; App.currentDoc.client.adresse = document.getElementById('input-client-adresse').value;
        App.currentDoc.defunt.nom = document.getElementById('input-defunt-nom').value; App.currentDoc.type = document.getElementById('input-type-doc').value; App.currentDoc.date_creation = document.getElementById('input-date').value;
        if (!App.currentDoc.client.nom) throw new Error("Nom du client manquant");
        if (!App.currentDoc.numero || App.currentDoc.numero === 'BROUILLON' || App.currentDoc.numero.startsWith('PRO-')) App.currentDoc.numero = await genererNumero(App.currentDoc.type);
        if (App.currentDoc.id) await updateDoc(doc(db, COLLECTION_NAME, App.currentDoc.id), App.currentDoc);
        else { const ref = await addDoc(collection(db, COLLECTION_NAME), App.currentDoc); App.currentDoc.id = ref.id; }
        btn.innerHTML = '✅ OK'; setTimeout(() => { btn.innerHTML = oldText; btn.disabled = false; document.getElementById('view-editor').classList.add('hidden'); document.getElementById('view-dashboard').classList.remove('hidden'); chargerHistorique(); }, 1500);
    } catch (e) { console.error(e); btn.innerHTML = 'Erreur'; btn.disabled = false; alert("Erreur: " + e.message); }
}

async function exporterComptabilite() {
    try {
        const q = query(collection(db, COLLECTION_NAME), orderBy('date_creation', 'desc')); const snap = await getDocs(q);
        if(snap.empty) return alert("Rien à exporter.");
        let csv = "Date;Numero;Type;Client;Defunt;Total TTC;Statut\n";
        snap.forEach(doc => { const d = doc.data(); csv += `${new Date(d.date_creation).toLocaleDateString()};${d.numero};${d.type};"${d.client.nom}";"${d.defunt.nom}";${d.total_ttc};${d.solde_paye>=d.total_ttc?'PAYE':'EN ATTENTE'}\n`; });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "export.csv"; link.click();
    } catch(e) { console.error(e); }
}

// =========================================================
// C'EST ICI QUE CA SE JOUE : VOS MODELES COMPLETS FRANCAIS
// =========================================================
function appliquerModele(type) {
    if(!confirm("Cela va remplacer le contenu actuel. Continuer ?")) return;
    
    const lignes = [];
    const addS = (t) => lignes.push(createLigne({type:'section', description:t}));
    const addL = (d, p, cat='courant') => lignes.push(createLigne({type:'line', description:d, prix:p, category:cat}));

    if(type === 'INHUMATION') {
        addS("1. PRÉPARATION / ORGANISATION");
        addL("Démarches et formalités administratives", 200, 'courant');
        addL("Vacation de police (Tiers)", 25, 'option');
        addL("Préparation du défunt (Toilette/Habillage)", 120, 'courant');
        addL("Frais de séjour chambre funéraire (Forfait)", 350, 'courant');
        
        addS("2. TRANSPORT AVANT MISE EN BIÈRE");
        addL("Mise à disposition corbillard", 200, 'courant');
        addL("Housse mortuaire", 30, 'courant');

        addS("3. CERCUEIL ET ACCESSOIRES");
        addL("Cercueil Chêne Standard (4 poignées, capiton)", 950, 'courant');
        addL("Plaque d'identité gravée", 35, 'courant');
        
        addS("4. CÉRÉMONIE & CONVOI");
        addL("Maître de cérémonie", 200, 'courant');
        addL("Equipe de porteurs (x4)", 400, 'courant');
        addL("Corbillard de cérémonie", 450, 'courant');
        addL("Frais de culte / Paroisse (Tiers)", 150, 'option');

        addS("5. CIMETIÈRE");
        addL("Ouverture / Fermeture caveau", 600, 'option');
    }
    else if (type === 'CREMATION') {
        addS("1. PRÉPARATION / ORGANISATION");
        addL("Démarches et formalités administratives", 200, 'courant');
        addL("Vacation de police (Tiers)", 25, 'option');
        addL("Préparation du défunt", 120, 'courant');
        addL("Frais de séjour chambre funéraire", 350, 'courant');

        addS("2. CERCUEIL ET ACCESSOIRES");
        addL("Cercueil Pin (Modèle Crémation)", 580, 'courant');
        addL("Capiton écologique", 80, 'courant');
        addL("Plaque d'identité", 35, 'courant');

        addS("3. CÉRÉMONIE & CONVOI");
        addL("Maître de cérémonie", 200, 'courant');
        addL("Equipe de porteurs", 300, 'courant');
        addL("Corbillard", 450, 'courant');

        addS("4. CRÉMATORIUM");
        addL("Redevance de crémation (Tiers)", 685, 'option');
        addL("Urne cinéraire standard", 120, 'courant');
    }
    else if (type === 'RAPATRIEMENT') {
        addS("1. ADMINISTRATIF");
        addL("Démarches Consulat / Préfecture", 350, 'courant');
        addL("Soins de conservation (Thanatopraxie)", 350, 'courant');
        
        addS("2. CERCUEIL SPÉCIAL");
        addL("Cercueil Zinc (Hermétique) obligatoire", 1400, 'courant');
        addL("Filtre épurateur", 45, 'courant');
        addL("Soudure à froid", 80, 'courant');

        addS("3. TRANSPORT AÉRIEN");
        addL("Transport aéroport & Mise en soute", 250, 'courant');
        addL("Fret Aérien (Estimation Tiers)", 1500, 'option');
    }

    App.currentDoc.lignes = lignes;
    renderLignes();
}
