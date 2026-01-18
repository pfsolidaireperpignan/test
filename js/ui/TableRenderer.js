/* Fichier : js/ui/TableRenderer.js - VERSION ROBUSTE */
export const TableRenderer = {
    render(facture, onDelete, onUpdate, onReorder) {
        const tbody = document.getElementById('lines-body');
        if (!tbody) return;
        
        tbody.innerHTML = '';

        facture.lignes.forEach((ligne, index) => {
            const tr = document.createElement('tr');
            tr.className = 'draggable-row';
            tr.setAttribute('draggable', 'true'); // Active le drag natif
            
            // --- GESTION DU DRAG & DROP ---
            
            // 1. DÉBUT DU DRAG
            tr.ondragstart = (e) => {
                // On stocke l'index de la ligne qu'on déplace
                e.dataTransfer.setData('text/plain', index.toString());
                e.dataTransfer.effectAllowed = 'move';
                tr.style.opacity = '0.4'; // On la rend transparente pour le style
            };

            // 2. SURVOL (Obligatoire pour autoriser le DROP)
            tr.ondragover = (e) => {
                e.preventDefault(); // Indispensable !
                e.dataTransfer.dropEffect = 'move';
                tr.style.borderTop = '2px solid #3b82f6'; // Ligne bleue pour voir où on lâche
            };

            // 3. FIN DU SURVOL
            tr.ondragleave = () => {
                tr.style.borderTop = '';
            };

            // 4. LE LÂCHER (DROP)
            tr.ondrop = (e) => {
                e.preventDefault();
                tr.style.opacity = '1';
                tr.style.borderTop = '';
                
                const fromIndexStr = e.dataTransfer.getData('text/plain');
                if (!fromIndexStr) return; // Sécurité

                const fromIndex = parseInt(fromIndexStr, 10);
                const toIndex = index;

                // Si on a changé de place, on prévient le chef (app_facturation.js)
                if (fromIndex !== toIndex && onReorder) {
                    onReorder(fromIndex, toIndex);
                }
            };
            
            tr.ondragend = () => {
                tr.style.opacity = '1';
                tr.style.borderTop = '';
            };

            // --- CONTENU DES LIGNES ---
            
            // CAS 1 : SECTION (Titre gris)
            if (ligne.type === 'section') {
                tr.style.background = '#f8fafc';
                tr.innerHTML = `
                    <td style="text-align:center; cursor:move; color:#64748b; font-size:1.2em;" title="Attraper pour déplacer">
                        <i class="fas fa-bars"></i>
                    </td>
                    <td colspan="4" style="padding:0;">
                        <input value="${ligne.description}" 
                            onchange="window.updateLigne(${index}, 'description', this.value)"
                            style="width:100%; border:none; background:transparent; font-weight:bold; color:#334155; padding:12px; font-size:1rem;" 
                            placeholder="TITRE DE LA SECTION...">
                    </td>
                    <td style="text-align:center;">
                        <button onclick="window.supprimerLigne(${index})" style="color:#ef4444; border:none; background:none; cursor:pointer;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
            } 
            // CAS 2 : LIGNE PRODUIT
            else {
                tr.innerHTML = `
                    <td style="text-align:center; cursor:move; color:#cbd5e1;" title="Attraper pour déplacer">
                        <i class="fas fa-grip-vertical"></i>
                    </td>
                    <td>
                        <input value="${ligne.description}" 
                            onchange="window.updateLigne(${index}, 'description', this.value)" 
                            style="width:100%; font-weight:500;" placeholder="Description...">
                    </td>
                    <td>
                        <select onchange="window.updateLigne(${index}, 'type_prestation', this.value)">
                            <option value="courant" ${ligne.type_prestation === 'courant' ? 'selected' : ''}>Courant</option>
                            <option value="option" ${ligne.type_prestation === 'option' ? 'selected' : ''}>Option</option>
                        </select>
                    </td>
                    <td>
                        <select onchange="window.updateLigne(${index}, 'tva', this.value)" style="width:70px;">
                            <option value="NA" ${ligne.tva === 'NA' ? 'selected' : ''}>NA</option>
                            <option value="20%" ${ligne.tva === '20%' ? 'selected' : ''}>20%</option>
                            <option value="10%" ${ligne.tva === '10%' ? 'selected' : ''}>10%</option>
                        </select>
                    </td>
                    <td style="text-align:right;">
                        <div style="display:flex; justify-content:flex-end; gap:5px;">
                            <input type="number" step="0.01" value="${ligne.prix_unitaire}" 
                                onchange="window.updateLigne(${index}, 'prix_unitaire', this.value)" 
                                style="text-align:right; width:90px; font-weight:bold;"> 
                            <span>€</span>
                        </div>
                    </td>
                    <td style="text-align:center;">
                        <button onclick="window.supprimerLigne(${index})" style="color:#94a3b8; border:none; background:none; cursor:pointer;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
            }
            tbody.appendChild(tr);
        });

        // Fonctions globales
        window.updateLigne = (index, field, value) => {
            const valFinale = field === 'prix_unitaire' ? parseFloat(value) : value;
            facture.lignes[index][field] = valFinale;
            if (onUpdate) onUpdate();
        };
        window.supprimerLigne = (index) => { if (onDelete) onDelete(index); };
    }
};