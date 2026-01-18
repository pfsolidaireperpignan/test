/* Fichier : js/v2/app.js - COMPLET */
import { db, auth, onAuthStateChanged, collection, addDoc, updateDoc, doc, getDoc, getDocs, query, orderBy, COLLECTION_NAME } from './config.js';
import { createFacture, createLigne } from './models.js';
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
    
    // Navigation
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

    // Editeur Actions
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
}

async function chargerHistorique() {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">Chargement...</td></tr>';
    try {
        const q = query(collection(db, COLLECTION_NAME), orderBy('date_creation', 'desc'));
        const snapshot = await getDocs(q);
        if (snapshot.empty) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px;">Vide.</td></tr>'; return; }

        tbody.innerHTML = '';
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${new Date(data.date_creation).toLocaleDateString()}</td>
                <td><strong>${data.numero}</strong></td>
                <td><span class="badge">${data.type}</span></td>
                <td><div>${data.client.nom}</div><div style="font-size:0.8em; color:#666;">${data.defunt.nom}</div></td>
                <td style="text-align:right"><strong>${(data.total_ttc||0).toFixed(2)} €</strong></td>
                <td style="text-align:center">${data.type === 'FACTURE' ? 'À PAYER' : 'BROUILLON'}</td>
                <td style="text-align:center">
                    <button class="btn-icon print-btn" data-id="${docSnap.id}"><i class="fas fa-print"></i></button>
                    <button class="btn-icon edit-btn" data-id="${docSnap.id}"><i class="fas fa-pen"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Clics liste
        document.querySelectorAll('.print-btn').forEach(btn => btn.addEventListener('click', async () => {
            const docRef = doc(db, COLLECTION_NAME, btn.dataset.id);
            const snap = await getDoc(docRef);
            if(snap.exists()) PdfService.generer(snap.data());
        }));
        
        document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', async () => {
            const docRef = doc(db, COLLECTION_NAME, btn.dataset.id);
            const snap = await getDoc(docRef);
            if(snap.exists()) {
                const data = snap.data();
                data.id = snap.id; // Important pour update
                ouvrirEditeur(data);
            }
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
    renderLignes();
    document.getElementById('view-dashboard').classList.add('hidden');
    document.getElementById('view-editor').classList.remove('hidden');
}

function renderLignes() {
    const container = document.getElementById('lines-container');
    container.innerHTML = '';
    let total = 0;
    App.currentDoc.lignes.forEach((ligne, index) => {
        const tr = document.createElement('tr');
        if (ligne.type === 'section') {
            tr.style.background = '#f1f5f9';
            tr.innerHTML = `<td colspan="4"><input type="text" value="${ligne.description}" style="width:100%; font-weight:bold; border:none; background:transparent;" onchange="updateLigne(${index}, 'description', this.value)"></td><td style="text-align:center"><button onclick="deleteLigne(${index})" style="color:red; border:none; background:none;"><i class="fas fa-trash"></i></button></td>`;
        } else {
            total += parseFloat(ligne.prix || 0);
            tr.innerHTML = `<td><input type="text" value="${ligne.description}" style="width:100%" onchange="updateLigne(${index}, 'description', this.value)"></td><td><select onchange="updateLigne(${index}, 'category', this.value)"><option value="courant" ${ligne.category==='courant'?'selected':''}>Courant</option><option value="option" ${ligne.category==='option'?'selected':''}>Option</option></select></td><td><select><option>NA</option></select></td><td><input type="number" step="0.01" value="${ligne.prix}" style="width:100px; text-align:right" onchange="updateLigne(${index}, 'prix', this.value)"></td><td style="text-align:center"><button onclick="deleteLigne(${index})" style="color:#ccc; border:none; background:none;"><i class="fas fa-trash"></i></button></td>`;
        }
        container.appendChild(tr);
    });
    App.currentDoc.total_ttc = total;
    document.getElementById('display-total').textContent = total.toFixed(2) + ' €';

    window.updateLigne = (idx, f, v) => { 
        if(f==='prix') v = parseFloat(v)||0; 
        App.currentDoc.lignes[idx][f] = v; 
        if(f==='prix') renderLignes(); 
    };
    window.deleteLigne = (idx) => { App.currentDoc.lignes.splice(idx, 1); renderLignes(); };
}

async function sauvegarderDocument() {
    const btn = document.getElementById('btn-save');
    btn.innerHTML = '...'; btn.disabled = true;
    try {
        App.currentDoc.client.nom = document.getElementById('input-client-nom').value;
        App.currentDoc.client.adresse = document.getElementById('input-client-adresse').value;
        App.currentDoc.defunt.nom = document.getElementById('input-defunt-nom').value;
        App.currentDoc.type = document.getElementById('input-type-doc').value;
        App.currentDoc.date_creation = document.getElementById('input-date').value;

        if (!App.currentDoc.client.nom) throw new Error("Nom manquant");
        if (App.currentDoc.numero === 'BROUILLON') App.currentDoc.numero = "PRO-" + Date.now().toString().slice(-4);

        if (App.currentDoc.id) await updateDoc(doc(db, COLLECTION_NAME, App.currentDoc.id), App.currentDoc);
        else { const ref = await addDoc(collection(db, COLLECTION_NAME), App.currentDoc); App.currentDoc.id = ref.id; }

        btn.innerHTML = 'OK !';
        setTimeout(() => { btn.innerHTML = 'ENREGISTRER (v2)'; btn.disabled = false; }, 1500);
    } catch (e) { console.error(e); btn.innerHTML = 'Erreur'; btn.disabled = false; alert("Erreur: " + e.message); }
}

function appliquerModele(type) {
    if(!confirm("Remplacer ?")) return;
    const lignes = [];
    const addS = (t) => lignes.push(createLigne({type:'section', description:t}));
    const addL = (d, p) => lignes.push(createLigne({type:'line', description:d, prix:p}));
    if(type === 'INHUMATION') { addS("PRÉPARATION"); addL("Démarches", 250); addS("CERCUEIL"); addL("Cercueil Chêne", 950); }
    else if (type === 'CREMATION') { addS("PRÉPARATION"); addL("Démarches", 250); addS("CRÉMATORIUM"); addL("Redevance", 680); }
    else if (type === 'RAPATRIEMENT') { addS("ADMINISTRATIF"); addL("Consulat", 350); addS("VOL"); addL("Fret Aérien", 1500); }
    App.currentDoc.lignes = lignes;
    renderLignes();
}