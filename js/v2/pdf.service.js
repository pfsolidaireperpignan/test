/* Fichier : js/v2/pdf.service.js - STYLE LEGAL FRANCAIS */
export const PdfService = {
    generer(doc) {
        if (!window.jspdf) { alert("Erreur PDF"); return; }
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF();
        
        // 1. LOGO & EN-TÊTE
        const imgElement = document.getElementById('logo-source');
        if (imgElement && imgElement.naturalWidth > 0) {
            try { pdf.addImage(imgElement, 'PNG', 15, 10, 40, 40); } catch(e) {}
        }

        // Infos Entreprise (Gauche)
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(11); pdf.setTextColor(22, 101, 52);
        pdf.text("POMPES FUNEBRES SOLIDAIRE", 15, 55);
        pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(50);
        pdf.text("32 boulevard Léon Jean Grégory", 15, 60);
        pdf.text("66300 THUIR", 15, 64);
        pdf.text("Tél: 07 55 18 27 77", 15, 68);
        pdf.text("Mail: pfsolidaireperpignan@gmail.com", 15, 72);
        
        // Cadre Client (Droite)
        pdf.setDrawColor(0); pdf.setFillColor(255, 255, 255);
        pdf.rect(110, 20, 85, 35);
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(10); pdf.setTextColor(0);
        pdf.text("CLIENT", 112, 26);
        pdf.setFont("helvetica", "normal");
        pdf.text(doc.client.nom || '', 112, 32);
        const splitAdresse = pdf.splitTextToSize(doc.client.adresse || '', 80);
        pdf.text(splitAdresse, 112, 37);

        // Titre Document + Défunt
        let y = 85;
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(14); pdf.setTextColor(0);
        pdf.text(`${doc.type} N° ${doc.numero}`, 105, y, {align:'center'});
        
        y += 7;
        pdf.setFontSize(10); pdf.setFont("helvetica", "normal");
        pdf.text(`Date du document : ${new Date(doc.date_creation).toLocaleDateString()}`, 105, y, {align:'center'});

        if (doc.defunt.nom) {
            y += 10;
            pdf.setDrawColor(200); pdf.line(15, y, 195, y);
            y += 5;
            pdf.setFont("helvetica", "bold");
            pdf.text(`Obsèques de : ${doc.defunt.nom}`, 15, y);
        }
        y += 10;

        // 2. LE TABLEAU COMPLEXE (Type Modèle Français)
        // Colonnes : Description | Prix TTC Courant | Prix TTC Option
        const tableBody = [];
        
        doc.lignes.forEach(l => {
            if (l.type === 'section') {
                // Ligne de titre grise
                tableBody.push([{ content: l.description.toUpperCase(), colSpan: 3, styles: { fillColor: [240, 240, 240], fontStyle: 'bold', textColor:0 } }]);
            } else {
                // Ligne normale : on place le prix dans la bonne colonne
                const prix = parseFloat(l.prix || 0);
                const prixFmt = prix > 0 ? prix.toFixed(2) + ' €' : '';
                
                if (l.category === 'courant') {
                    tableBody.push([l.description, prixFmt, '']);
                } else {
                    // C'est une option ou un tiers
                    tableBody.push([l.description, '', prixFmt]);
                }
            }
        });

        pdf.autoTable({
            startY: y,
            head: [[
                'DÉSIGNATION DES PRESTATIONS', 
                'PRESTATIONS\nCOURANTES TTC', 
                'PRESTATIONS\nOPTIONNELLES TTC'
            ]],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [22, 101, 52], textColor: 255, halign: 'center', valign:'middle', fontSize:9 },
            styles: { fontSize: 9, cellPadding: 2 },
            columnStyles: {
                0: { cellWidth: 110 },
                1: { cellWidth: 40, halign: 'right' },
                2: { cellWidth: 40, halign: 'right' }
            }
        });

        // 3. TOTAUX
        let finalY = pdf.lastAutoTable.finalY + 10;
        const total = parseFloat(doc.total_ttc || 0);
        
        // On dessine le bloc total à droite
        pdf.setDrawColor(0);
        pdf.rect(130, finalY, 65, 15);
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(12);
        pdf.text("TOTAL TTC", 135, finalY + 10);
        pdf.text(total.toFixed(2) + " €", 190, finalY + 10, {align:'right'});

        // Mentions légales bas de page (Exemple RIVET)
        const pageHeight = pdf.internal.pageSize.height;
        pdf.setFontSize(7); pdf.setTextColor(100);
        const mentions = "Devis valable 3 mois. TVA non applicable, art. 293 B du CGI (Auto-entrepreneur) ou TVA selon régime.\nPF SOLIDAIRE PERPIGNAN - SIRET en cours - Agrément préfectoral en cours.";
        pdf.text(mentions, 105, pageHeight - 15, {align:'center'});

        pdf.save(`${doc.type}_${doc.numero}.pdf`);
    }
};
