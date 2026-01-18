/* Fichier : js/pdf_invoice.js - VERSION CORRIGÉE (Vérifiez la fin !) */
import { getVal } from './utils.js';

export function genererPDFFacture(factureObjet) {
    if (!window.jspdf) {
        alert("Erreur : La librairie jsPDF n'est pas chargée.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();
    const data = factureObjet || {};
    const type = data.type || 'DOCUMENT';
    const numero = data.numero || 'BROUILLON';
    
    // 1. EN-TÊTE
    const imgElement = document.getElementById('logo-source');
    if (imgElement && imgElement.naturalWidth > 0) {
        try { pdf.addImage(imgElement, 'PNG', 15, 15, 35, 35); } catch(e) {}
    }
    
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(12); pdf.setTextColor(22, 101, 52);
    pdf.text("POMPES FUNEBRES", 15, 55);
    pdf.text("SOLIDAIRE PERPIGNAN", 15, 60);
    
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(80);
    pdf.text("32 boulevard Léon Jean Grégory", 15, 66);
    pdf.text("66300 THUIR - FRANCE", 15, 70);
    pdf.text("Tél : +33 7 55 18 27 77", 15, 74);
    pdf.text("SIRET : 539 270 298 00042", 15, 78);

    // 2. CLIENT
    pdf.setFillColor(248, 250, 252); pdf.setDrawColor(226, 232, 240);
    pdf.rect(110, 20, 85, 45, 'FD');
    pdf.setFont("helvetica", "bold"); pdf.setTextColor(0); pdf.setFontSize(10);
    pdf.text("ADRESSE DE FACTURATION", 115, 28);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(11);
    pdf.text(data.client_nom || '', 115, 38);
    pdf.setFontSize(10); pdf.setTextColor(50);
    pdf.text(pdf.splitTextToSize(data.client_adresse || '', 75), 115, 45);

    // 3. TITRE
    let y = 95;
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(16); pdf.setTextColor(22, 101, 52);
    let dateFr = data.date_creation ? new Date(data.date_creation).toLocaleDateString() : '-';
    pdf.text(`${type} N° ${numero}`, 15, y);
    pdf.setFontSize(10); pdf.setTextColor(100);
    pdf.text(`Date d'émission : ${dateFr}`, 15, y+6);
    
    if(data.defunt_nom) {
        pdf.setDrawColor(22, 101, 52); pdf.setLineWidth(0.5);
        pdf.line(15, y+10, 195, y+10);
        pdf.setFont("helvetica", "bold"); pdf.setTextColor(0);
        pdf.text(`Obsèques de : ${data.defunt_nom}`, 15, y+16);
    }
    y += 25;

    // 4. TABLEAU
    const rows = [];
    (data.lignes || []).forEach(l => {
        if (l.type === 'section') {
            rows.push([{ content: l.description, colSpan: 4, styles: { fillColor: [241, 245, 249], fontStyle: 'bold' } }]);
        } else {
            const prix = parseFloat(l.prix_unitaire).toFixed(2) + ' €';
            const colC = l.type_prestation === 'courant' ? prix : '';
            const colO = l.type_prestation === 'option' ? prix : '';
            rows.push([l.description, l.tva || 'NA', colC, colO]);
        }
    });

    pdf.autoTable({
        startY: y,
        head: [['DÉSIGNATION', 'TVA', 'OBLIGATOIRE', 'OPTIONNEL']],
        body: rows,
        theme: 'plain',
        headStyles: { fillColor: [22, 101, 52], textColor: 255, fontStyle: 'bold', halign: 'center' },
        styles: { fontSize: 9, cellPadding: 3, valign: 'middle', lineColor: [200, 200, 200], lineWidth: 0.1 },
        columnStyles: { 0: { cellWidth: 90 }, 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' } }
    });

    // 5. TOTAUX
    let finalY = pdf.lastAutoTable.finalY + 10;
    if (finalY > 240) { pdf.addPage(); finalY = 20; }

    const ttc = parseFloat(data.total_ttc || 0);
    const paye = parseFloat(data.total_paye || 0);
    const reste = parseFloat(data.reste_a_payer || (ttc - paye));

    pdf.setFont("helvetica", "bold"); pdf.setFontSize(11); pdf.setTextColor(0);
    pdf.text("TOTAL GÉNÉRAL", 130, finalY);
    pdf.text(ttc.toFixed(2) + " €", 195, finalY, {align: 'right'});
    finalY += 8;

    (data.paiements || []).forEach(p => {
        pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(50);
        pdf.text(`Reçu le ${new Date(p.date).toLocaleDateString()} (${p.mode})`, 130, finalY);
        pdf.text("- " + parseFloat(p.montant).toFixed(2) + " €", 195, finalY, {align: 'right'});
        finalY += 5;
    });

    pdf.setDrawColor(0); pdf.line(130, finalY, 195, finalY);
    finalY += 8;
    
    pdf.setFontSize(12); 
    if(reste <= 0.05) {
        pdf.setTextColor(22, 163, 74); 
        pdf.text("SOLDE RÉGLÉ", 195, finalY, {align: 'right'});
    } else {
        pdf.setTextColor(220, 38, 38); 
        pdf.text("NET À PAYER", 130, finalY);
        pdf.text(reste.toFixed(2) + " €", 195, finalY, {align: 'right'});
    }

    // 6. PIED DE PAGE
    const pageHeight = pdf.internal.pageSize.height;
    pdf.setFontSize(8); pdf.setTextColor(100); pdf.setFont("helvetica", "normal");
    
    pdf.text("Conditions de règlement : Paiement comptant à réception.", 15, pageHeight - 30);
    
    const aDuNA = (data.lignes || []).some(l => l.tva === 'NA');
    if(aDuNA) {
        pdf.setFont("helvetica", "italic");
        pdf.text("TVA non applicable, art. 293 B du CGI", 15, pageHeight - 34);
        pdf.setFont("helvetica", "normal");
    }

    pdf.text("Indemnité retard : 40 €.", 15, pageHeight - 26);
    
    pdf.setDrawColor(200); pdf.rect(15, pageHeight - 22, 180, 12);
    pdf.setFont("helvetica", "bold"); 
    pdf.text("IBAN : FR76 XXXX XXXX XXXX XXXX XXXX XXX   |   BIC : XXXXXXXX", 20, pageHeight - 14);
    
    pdf.save(`${type}_${numero}.pdf`);
}