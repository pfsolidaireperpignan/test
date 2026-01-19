/* Fichier : js/v2/pdf.service.js - VERSION RIVET EXACTE (FACTURATION) */
export const PdfService = {
    generer(docData) {
        if (!window.jspdf) { alert("Erreur PDF: Librairie manquante"); return; }
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF();

        // =======================================================
        // 1. EN-TÊTE : COPIE EXACTE DE VOS DEVIS
        // =======================================================
        
        // Logo (Si présent dans le HTML)
        const imgElement = document.getElementById('logo-source'); 
        if (imgElement && imgElement.src) {
            try { pdf.addImage(imgElement, 'PNG', 15, 10, 40, 40); } catch(e) {}
        }

        // Bloc Entreprise (Gauche, sous le logo)
        pdf.setFont("helvetica", "bold"); pdf.setTextColor(34, 155, 76); // VERT RIVET
        pdf.setFontSize(11);
        pdf.text("POMPES FUNEBRES SOLIDAIRE", 15, 55);
        
        pdf.setFont("helvetica", "normal"); pdf.setTextColor(50); pdf.setFontSize(9);
        pdf.text("32 boulevard Léon Jean Grégory, 66300 THUIR", 15, 60);
        pdf.text("pfsolidaireperpignan@gmail.com", 15, 64);
        pdf.text("N° TVA Intracommunautaire: FR92539270298", 15, 68);
        pdf.text("RCS: 539270298 | Tél: 07 55 18 27 77", 15, 72);

        // Bloc Client (Cadre Droite)
        pdf.setDrawColor(0); pdf.setFillColor(255);
        // On aligne à droite comme sur le modèle
        const xClient = 110;
        pdf.setFont("helvetica", "bold"); pdf.setTextColor(0); pdf.setFontSize(11);
        pdf.text("CLIENT :", xClient, 55);
        
        pdf.setFont("helvetica", "normal");
        pdf.text(docData.client.nom || '', xClient, 61);
        // Adresse sur plusieurs lignes
        const splitAddr = pdf.splitTextToSize(docData.client.adresse || '', 80);
        pdf.text(splitAddr, xClient, 66);

        // Titre Document (Devis N°...)
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(14);
        pdf.text(`${docData.type} N° ${docData.numero}`, 105, 90, {align:'center'});
        
        pdf.setFontSize(10); pdf.setFont("helvetica", "normal");
        const dateStr = new Date(docData.date_creation).toLocaleDateString('fr-FR');
        pdf.text(`Du ${dateStr}`, 105, 95, {align:'center'});
        
        // Concerne (Défunt)
        if (docData.defunt && docData.defunt.nom) {
            pdf.setFont("helvetica", "bold");
            pdf.text(`Devis Fin de vie : M. ${docData.defunt.nom.toUpperCase()}`, 15, 105);
        }

        // =======================================================
        // 2. LE TABLEAU (3 COLONNES + TVA)
        // =======================================================
        const tableBody = [];
        
        docData.lignes.forEach(l => {
            if (l.type === 'section') {
                // Ligne de titre grise (ex: "1. PREPARATION...")
                tableBody.push([{ 
                    content: l.description.toUpperCase(), 
                    colSpan: 4, 
                    styles: { fillColor: [240, 240, 240], fontStyle: 'bold', textColor:0 } 
                }]);
            } else {
                // Colonnes : Designation | TVA | Courant | Optionnel
                const prix = parseFloat(l.prix || 0);
                const prixFmt = prix > 0 ? prix.toFixed(2) + ' €' : '';
                
                // Si la catégorie est 'option' ou 'tiers', on le met dans la colonne de droite
                // Sinon (courant), colonne de gauche
                const isOption = (l.category === 'option' || l.category === 'tiers');
                
                tableBody.push([
                    l.description,
                    "NA", // TVA non applicable (auto-entrepreneur souvent)
                    isOption ? "" : prixFmt, // Col Courant
                    isOption ? prixFmt : ""  // Col Optionnel
                ]);
            }
        });

        pdf.autoTable({
            startY: 110,
            head: [[
                'DÉSIGNATION DES PRESTATIONS', 
                'TVA', 
                'PRIX TTC PRESTATIONS\nCOURANTES', 
                'PRIX TTC PRESTATIONS\nOPTIONNELLES'
            ]],
            body: tableBody,
            theme: 'grid', // Quadrillage complet
            headStyles: { 
                fillColor: [255, 255, 255], // Fond blanc pour l'en-tête (Spécificité RIVET)
                textColor: [0, 0, 0],       // Texte noir
                lineWidth: 0.1,             // Bordures fines
                lineColor: [0, 0, 0],
                valign: 'middle',
                halign: 'center',
                fontStyle: 'bold'
            },
            styles: { 
                fontSize: 9, 
                cellPadding: 3,
                lineColor: [0, 0, 0], // Lignes noires
                lineWidth: 0.1,
                textColor: [0, 0, 0]
            },
            columnStyles: {
                0: { cellWidth: 90 }, // Désignation large
                1: { cellWidth: 15, halign: 'center' }, // TVA petit
                2: { cellWidth: 40, halign: 'right' },
                3: { cellWidth: 40, halign: 'right' }
            }
        });

        // =======================================================
        // 3. TOTAUX & PIED DE PAGE
        // =======================================================
        let finalY = pdf.lastAutoTable.finalY + 10;
        const total = parseFloat(docData.total_ttc || 0);
        
        // Total à droite
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(12);
        pdf.text("Total (TTC)", 145, finalY);
        pdf.text(total.toFixed(2).replace('.', ',') + " €", 195, finalY, {align:'right'});

        // Mentions légales (Bas de page)
        const pageHeight = pdf.internal.pageSize.height;
        pdf.setFontSize(8); pdf.setFont("helvetica", "normal"); pdf.setTextColor(100);
        const mentions = "(NA) TVA non applicable, art 293 B du CGI.\n(*) Prestations et fournitures obligatoires.\nDevis valable 3 mois.";
        pdf.text(mentions, 15, finalY + 15);

        pdf.save(`${docData.type}_${docData.numero}.pdf`);
    }
};