/* Fichier : js/v2/pdf.service.js */
export const PdfService = {
    generer(doc) {
        if (!window.jspdf) { alert("Erreur PDF: Librairie manquante"); return; }
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF();
        
        // Logo
        const imgElement = document.getElementById('logo-source');
        if (imgElement && imgElement.naturalWidth > 0) {
            try { pdf.addImage(imgElement, 'PNG', 15, 15, 35, 35); } catch(e) {}
        }

        // En-tête
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(12); pdf.setTextColor(22, 101, 52);
        pdf.text("POMPES FUNEBRES", 15, 55);
        pdf.text("SOLIDAIRE PERPIGNAN", 15, 60);
        
        pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(80);
        pdf.text("32 boulevard Léon Jean Grégory", 15, 66);
        pdf.text("66300 THUIR - FRANCE", 15, 70);
        pdf.text("Tél : +33 7 55 18 27 77", 15, 74);

        // Client
        pdf.setFillColor(248, 250, 252); pdf.setDrawColor(220);
        pdf.rect(110, 20, 85, 40, 'FD');
        pdf.setFont("helvetica", "bold"); pdf.setTextColor(0); pdf.setFontSize(10);
        pdf.text("CLIENT", 115, 28);
        pdf.setFont("helvetica", "normal"); pdf.setFontSize(11);
        pdf.text(doc.client.nom || '', 115, 36);
        pdf.setFontSize(10); pdf.setTextColor(100);
        pdf.text(pdf.splitTextToSize(doc.client.adresse || '', 75), 115, 44);

        // Titre
        let y = 90;
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(16); pdf.setTextColor(22, 101, 52);
        pdf.text(`${doc.type} N° ${doc.numero}`, 15, y);
        pdf.setFontSize(10); pdf.setTextColor(100);
        pdf.text(`Date : ${new Date(doc.date_creation).toLocaleDateString('fr-FR')}`, 15, y + 6);

        if (doc.defunt.nom) {
            pdf.setDrawColor(22, 101, 52); pdf.line(15, y+10, 195, y+10);
            pdf.setFont("helvetica", "bold"); pdf.setTextColor(0);
            pdf.text(`Obsèques de : ${doc.defunt.nom}`, 15, y + 16);
        }
        y += 25;

        // Tableau
        const rows = doc.lignes.map(l => {
            if (l.type === 'section') {
                return [{ content: l.description.toUpperCase(), colSpan: 4, styles: { fillColor: [240, 240, 240], fontStyle: 'bold' } }];
            }
            return [l.description, l.category === 'courant' ? 'Courant' : 'Option', (parseFloat(l.prix)||0).toFixed(2) + ' €', l.tva || 'NA'];
        });

        pdf.autoTable({
            startY: y, head: [['Désignation', 'Type', 'Prix TTC', 'TVA']], body: rows,
            theme: 'plain', headStyles: { fillColor: [22, 101, 52], textColor: 255, fontStyle: 'bold' },
            styles: { cellPadding: 3, fontSize: 9 }, columnStyles: { 0: { cellWidth: 100 }, 2: { halign: 'right' } }
        });

        // Total
        let finalY = pdf.lastAutoTable.finalY + 10;
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(12); pdf.setTextColor(0);
        pdf.text("TOTAL TTC", 140, finalY);
        pdf.text((parseFloat(doc.total_ttc)||0).toFixed(2) + " €", 195, finalY, { align: 'right' });

        // Footer
        const pageHeight = pdf.internal.pageSize.height;
        pdf.setFontSize(8); pdf.setTextColor(150); pdf.setFont("helvetica", "italic");
        pdf.text("Généré par PF Solidaire - Logiciel V2", 15, pageHeight - 10);
        
        pdf.save(`Document_${doc.numero}.pdf`);
    }
};