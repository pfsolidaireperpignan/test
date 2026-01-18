/* Fichier : js/v2/app.js - MOTEUR COMPLET */
import { db, auth, onAuthStateChanged, collection, addDoc, updateDoc, doc, getDocs, query, orderBy, COLLECTION_NAME } from './config.js';
import { createFacture, createLigne } from './models.js';

// --- ÉTAT DU LOGICIEL ---
const App = {
    user: null,
    currentDoc: null, // La facture en cours d'édition
};

// --- DÉMARRAGE ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Vérification Connexion
    onAuthStateChanged(auth, (user) => {
        const loader = document.getElementById('app-loader');
        if (!user) {
            window.location.href = 'index.html';
        } else {
            App.user = user;
            if(loader) loader.style.display = 'none';
            initApp(); // On lance le moteur
        }
    });
});

function initApp() {
    console.log("Moteur v2 démarré.");
    chargerHistorique(); // On affiche la liste (vide pour l'instant)

    // --- BOUTONS DU MENU ---
    document.getElementById('btn-new-facture').addEventListener('click', () => ouvrirEditeur());
    
    document.getElementById('nav-dashboard').addEventListener('click', () => {
        document.getElementById('view-editor').classList.add('hidden');
        document.getElementById('view-dashboard').classList.remove('hidden');
        chargerHistorique(); // Rafraîchir la liste au retour
    });

    document.getElementById('btn-back').addEventListener('click', () => {
        document.getElementById('view-editor').classList.add('hidden');
        document.getElementById('view-dashboard').classList.remove('hidden');
        chargerHistorique();
    });

    // --- BOUTONS DE L'ÉDITEUR ---
    document.getElementById('btn-add-line').addEventListener('click', () => {
        App.currentDoc.lignes.push(createLigne({ type: 'line', description: '' }));
        renderLignes();
    });

    document.getElementById('btn-add-section').addEventListener('click', () => {
        App.currentDoc.lignes.push(createLigne({ type: 'section', description: 'TITRE DE SECTION' }));
        renderLignes();
    });

    document.getElementById('btn-save').addEventListener('click', sauvegarderDocument);

    // Sélecteur de Modèles
    document.getElementById('select-modeles').addEventListener('change', (e) => {
        if(e.target.value) appliquerModele(e.target.value);
    });
}

// --- GESTION DE L'HISTORIQUE (DASHBOARD) ---
async function chargerHistorique() {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">Chargement...</td></tr>';

    try {
        // On va chercher dans la NOUVELLE collection propre
        const q = query(collection(db, COLLECTION_NAME), orderBy('date_creation', 'desc'));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px;">Aucun document pour le moment. Créez-en un !</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const tr = document.createElement('tr');
            
            // Calcul du total pour affichage
            const total = (data.total_ttc || 0).toFixed(2);
            
            // Statut simple
            let statut = 'BROUILLON';
            if(data.type === 'FACTURE') statut = 'À PAYER';
            if(data.solde_paye >= data.total_ttc && data.total_ttc > 0) statut = 'PAYÉ';

            tr.innerHTML = `
                <td>${new Date(data.date_creation).toLocaleDateString()}</td>
                <td><strong>${data.numero}</strong></td>
                <td><span class="badge">${data.type}</span></td>
                <td>
                    <div>${data.client.nom}</div>
                    <div style="font-size:0.8em; color:#666;">Défunt: ${data.defunt.nom}</div>
                </td>
                <td style="text-align:right"><strong>${total} €</strong></td>
                <td style="text-align:center"><span class="tag">${statut}</span></td>
                <td style="text-align:center">
                    <button class="btn-icon edit-btn" data-id="${docSnap.id}"><i class="fas fa-pen"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Clic sur "Modifier"
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                // On récupère le document complet (pas juste le résumé)
                // Pour l'instant on triche en rechargeant depuis la liste, 
                // mais idéalement on ferait un getDoc
                const id = btn.dataset.id;
                // Logique simplifiée : on recharge la page avec l'ID dans l'URL (plus robuste)
                // window.location.href = `facturation_v2.html?id=${id}`; 
                // Mais restons en SPA pour l'instant :
                alert("Pour modifier, fonctionnalité à venir dans la minute suivante ! Concentrons-nous sur la Création d'abord.");
            });
        });

    } catch (e) {
        console.error("Erreur historique:", e);
        tbody.innerHTML = '<tr><td colspan="7" style="color:red">Erreur de chargement. Vérifiez la console.</td></tr>';
    }
}

// --- GESTION DE L'ÉDITEUR ---

function ouvrirEditeur(docData = null) {
    // 1. On initialise les données
    App.currentDoc = createFacture(docData || {});
    
    // 2. On remplit le formulaire HTML
    document.getElementById('input-client-nom').value = App.currentDoc.client.nom;
    document.getElementById('input-client-adresse').value = App.currentDoc.client.adresse;
    document.getElementById('input-defunt-nom').value = App.currentDoc.defunt.nom;
    document.getElementById('input-type-doc').value = App.currentDoc.type;
    document.getElementById('input-date').value = App.currentDoc.date_creation;
    
    // 3. On dessine les lignes
    renderLignes();
    
    // 4. On affiche la vue
    document.getElementById('view-dashboard').classList.add('hidden');
    document.getElementById('view-editor').classList.remove('hidden');
}

// Cette fonction redessine tout le tableau à chaque changement (Simple et Robuste)
function renderLignes() {
    const container = document.getElementById('lines-container');
    container.innerHTML = '';
    
    let total = 0;

    App.currentDoc.lignes.forEach((ligne, index) => {
        const tr = document.createElement('tr');
        
        // LOGIQUE D'AFFICHAGE (Section vs Ligne)
        if (ligne.type === 'section') {
            tr.style.background = '#f1f5f9';
            tr.innerHTML = `
                <td colspan="4">
                    <input type="text" value="${ligne.description}" 
                           class="input-section"
                           style="width:100%; font-weight:bold; background:transparent; border:none;"
                           onchange="updateLigne(${index}, 'description', this.value)">
                </td>
                <td style="text-align:center">
                    <button onclick="deleteLigne(${index})" style="color:red; border:none; background:none; cursor:pointer;"><i class="fas fa-trash"></i></button>
                </td>
            `;
        } else {
            // Calcul du total pour cette boucle
            total += parseFloat(ligne.prix || 0);
            
            tr.innerHTML = `
                <td>
                    <input type="text" value="${ligne.description}" class="input-desc" style="width:100%"
                           onchange="updateLigne(${index}, 'description', this.value)">
                </td>
                <td>
                    <select onchange="updateLigne(${index}, 'category', this.value)">
                        <option value="courant" ${ligne.category === 'courant' ? 'selected' : ''}>Courant</option>
                        <option value="option" ${ligne.category === 'option' ? 'selected' : ''}>Option</option>
                    </select>
                </td>
                <td>
                    <select onchange="updateLigne(${index}, 'tva', this.value)" style="width:60px">
                        <option value="NA">NA</option>
                        <option value="20%">20%</option>
                    </select>
                </td>
                <td>
                    <input type="number" step="0.01" value="${ligne.prix}" style="width:100px; text-align:right"
                           onchange="updateLigne(${index}, 'prix', this.value)">
                </td>
                <td style="text-align:center">
                    <button onclick="deleteLigne(${index})" style="color:#ccc; border:none; background:none; cursor:pointer;" onmouseover="this.style.color='red'" onmouseout="this.style.color='#ccc'"><i class="fas fa-trash"></i></button>
                </td>
            `;
        }
        container.appendChild(tr);
    });

    // Mise à jour du Total Général
    App.currentDoc.total_ttc = total;
    document.getElementById('display-total').textContent = total.toFixed(2) + ' €';
    
    // On rend les fonctions accessibles au HTML (le "pont")
    window.updateLigne = (idx, field, val) => {
        if(field === 'prix') val = parseFloat(val) || 0;
        App.currentDoc.lignes[idx][field] = val;
        if(field === 'prix') renderLignes(); // Recalculer le total
    };
    
    window.deleteLigne = (idx) => {
        App.currentDoc.lignes.splice(idx, 1);
        renderLignes();
    };
}

// --- SAUVEGARDE ---
async function sauvegarderDocument() {
    const btn = document.getElementById('btn-save');
    const oldText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enregistrement...';
    btn.disabled = true;

    try {
        // 1. On récupère les dernières infos du formulaire (En-tête)
        App.currentDoc.client.nom = document.getElementById('input-client-nom').value;
        App.currentDoc.client.adresse = document.getElementById('input-client-adresse').value;
        App.currentDoc.defunt.nom = document.getElementById('input-defunt-nom').value;
        App.currentDoc.type = document.getElementById('input-type-doc').value;
        App.currentDoc.date_creation = document.getElementById('input-date').value;

        // 2. Validation basique
        if (!App.currentDoc.client.nom) {
            alert("Erreur : Le nom du client est obligatoire.");
            throw new Error("Nom manquant");
        }

        // 3. Numérotation (Si c'est un nouveau)
        if (App.currentDoc.numero === 'BROUILLON') {
            App.currentDoc.numero = "PROVISOIRE-" + Date.now().toString().slice(-4); 
            // Note: On fera une vraie numérotation plus tard, commençons simple pour tester la sauvegarde
        }

        // 4. Envoi Firebase (Nouvelle Collection)
        if (App.currentDoc.id) {
            // Mise à jour
            const docRef = doc(db, COLLECTION_NAME, App.currentDoc.id);
            await updateDoc(docRef, App.currentDoc);
        } else {
            // Création
            const docRef = await addDoc(collection(db, COLLECTION_NAME), App.currentDoc);
            App.currentDoc.id = docRef.id;
        }

        // Succès
        btn.innerHTML = '<i class="fas fa-check"></i> Sauvegardé !';
        btn.classList.add('btn-success'); // Si vous avez une classe CSS pour ça
        setTimeout(() => { 
            btn.innerHTML = oldText; 
            btn.disabled = false; 
        }, 2000);

    } catch (e) {
        console.error("Erreur save:", e);
        if(e.message !== "Nom manquant") alert("Erreur technique lors de l'enregistrement.");
        btn.innerHTML = oldText;
        btn.disabled = false;
    }
}

// --- MODÈLES (Pour remplir vite) ---
function appliquerModele(type) {
    if(!confirm("Cela va effacer les lignes actuelles. Continuer ?")) return;
    
    const lignes = [];
    const addS = (t) => lignes.push(createLigne({type:'section', description:t}));
    const addL = (d, p) => lignes.push(createLigne({type:'line', description:d, prix:p}));

    if(type === 'INHUMATION') {
        addS("PRÉPARATION"); addL("Démarches et formalités", 250); addL("Toilette mortuaire", 120);
        addS("CERCUEIL"); addL("Cercueil Chêne Standard", 950); addL("Capiton", 85);
        addS("TRANSPORT"); addL("Corbillard", 450);
    } 
    else if (type === 'CREMATION') {
        addS("PRÉPARATION"); addL("Organisation obsèques", 250);
        addS("CERCUEIL"); addL("Cercueil Pin (Crémation)", 580); addL("Urne", 150);
        addS("CRÉMATORIUM"); addL("Redevance", 680);
    }
    // Ajoutez d'autres modèles ici si vous voulez

    App.currentDoc.lignes = lignes;
    renderLignes();
}
