// Export functions for admin panel
// These functions use the global 'registrations' array loaded by admin-script.js

function getQrBase64(text) {
    const tempDiv = document.createElement('div');
    new QRCode(tempDiv, {
        text: text,
        width: 100,
        height: 100,
        correctLevel: QRCode.CorrectLevel.M
    });
    const canvas = tempDiv.querySelector('canvas');
    if (canvas) return canvas.toDataURL('image/png');
    return null;
}

async function exportToExcel() {
    if (!window.registrations || registrations.length === 0) {
        alert('No registrations to export.');
        return;
    }

    if (!window.ExcelJS) {
        alert('ExcelJS is not loaded.');
        return;
    }

    const groupedRegistrations = {};
    registrations.forEach(reg => {
        const eventName = reg.event__name || 'Event';
        if (!groupedRegistrations[eventName]) {
            groupedRegistrations[eventName] = [];
        }
        groupedRegistrations[eventName].push(reg);
    });

    const wb = new ExcelJS.Workbook();

    for (const [eventName, eventRegistrations] of Object.entries(groupedRegistrations)) {
        const sheetName = eventName.substring(0, 31).replace(/[\[\]\*\\\?\:\/]/g, '');
        const ws = wb.addWorksheet(sheetName);

        ws.columns = [
            { header: 'QR Code', key: 'qr', width: 12 },
            { header: 'Ticket ID', key: 'ticket_id', width: 20 },
            { header: 'Student Name', key: 'name', width: 25 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Course', key: 'course', width: 15 },
            { header: 'Branch', key: 'branch', width: 25 },
            { header: 'Mobile', key: 'mobile', width: 15 },
            { header: 'Registration Date', key: 'timestamp', width: 22 },
            { header: 'Venue', key: 'venue', width: 20 }
        ];

        ws.getRow(1).font = { bold: true };

        eventRegistrations.forEach((reg, index) => {
            const rowNumber = index + 2;
            const r = ws.addRow({
                qr: '',
                ticket_id: reg.ticket_id,
                name: reg.name,
                email: reg.email,
                course: reg.course,
                branch: reg.branch,
                mobile: reg.mobile,
                timestamp: reg.timestamp,
                venue: reg.event__venue
            });

            r.height = 65;
            r.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

            const qrBase64 = getQrBase64(reg.ticket_id);
            if (qrBase64) {
                const imageId = wb.addImage({
                    base64: qrBase64,
                    extension: 'png',
                });
                ws.addImage(imageId, {
                    tl: { col: 0, row: rowNumber - 1 },
                    ext: { width: 70, height: 70 },
                    editAs: 'oneCell'
                });
            }
        });
    }

    const buffer = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), 'event_registrations.xlsx');
}

function exportToPDF() {
    try {
        if (!window.registrations || registrations.length === 0) {
            alert('No registrations to export.');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        let yOffset = 20;

        doc.setFontSize(20);
        doc.setTextColor(0, 123, 255);
        doc.text('Event Registrations Report', 15, yOffset);
        yOffset += 15;

        const groupedRegistrations = {};
        registrations.forEach(reg => {
            const eventId = reg.event__id;
            if (!groupedRegistrations[eventId]) {
                groupedRegistrations[eventId] = {
                    eventName: reg.event__name,
                    eventDate: reg.event__date,
                    eventVenue: reg.event__venue,
                    registrations: []
                };
            }
            groupedRegistrations[eventId].registrations.push(reg);
        });

        Object.values(groupedRegistrations).forEach((group, eventIndex) => {
            if (group.registrations.length === 0) return;

            if (yOffset > 170) {
                doc.addPage();
                yOffset = 20;
            }

            doc.setFontSize(14);
            doc.setTextColor(73, 80, 87);
            doc.text(`${group.eventName} - ${group.eventDate}`, 15, yOffset);
            yOffset += 8;

            const columns = [
                { header: 'QR', dataKey: 'qr' },
                { header: 'Ticket ID', dataKey: 'ticket_id' },
                { header: 'Name', dataKey: 'name' },
                { header: 'Email', dataKey: 'email' },
                { header: 'Course', dataKey: 'course' },
                { header: 'Branch', dataKey: 'branch' },
                { header: 'Mobile', dataKey: 'mobile' },
                { header: 'Registration Date', dataKey: 'date' }
            ];

            const data = group.registrations.map(reg => ({
                qr: '', // Empty space for QR code rendering
                ticket_id: reg.ticket_id,
                name: reg.name,
                email: reg.email,
                course: reg.course,
                branch: reg.branch,
                mobile: reg.mobile,
                date: reg.timestamp,
                qrData: getQrBase64(reg.ticket_id) // Add QR data object to the raw model
            }));

            doc.autoTable({
                columns: columns,
                body: data,
                startY: yOffset,
                margin: { left: 15, right: 15 },
                headStyles: {
                    fillColor: [0, 123, 255],
                    textColor: [255, 255, 255],
                    fontSize: 10,
                    fontStyle: 'bold',
                    halign: 'center'
                },
                bodyStyles: {
                    fontSize: 9,
                    textColor: [73, 80, 87],
                    minCellHeight: 18, // Make row height bigger to fit QR codes
                    valign: 'middle'
                },
                columnStyles: {
                    qr: { cellWidth: 16 }
                },
                alternateRowStyles: {
                    fillColor: [249, 250, 251]
                },
                didDrawCell: function (data) {
                    // Render the QR code when drawing the 'qr' body cell
                    if (data.section === 'body' && data.column.dataKey === 'qr' && data.cell.raw !== null) {
                        const qrDataUrl = data.row.raw.qrData;
                        if (qrDataUrl) {
                            const x = data.cell.x + 2;
                            const y = data.cell.y + 2;
                            doc.addImage(qrDataUrl, 'PNG', x, y, 12, 12);
                        }
                    }
                },
                didDrawPage: function (data) {
                    doc.setFontSize(8);
                    doc.setTextColor(108, 117, 125);
                    doc.text(
                        `Generated on ${new Date().toLocaleString()}`,
                        15,
                        doc.internal.pageSize.height - 10
                    );
                }
            });

            yOffset = doc.lastAutoTable.finalY + 15;
        });

        doc.save('event_registrations.pdf');

    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('An error occurred while generating the PDF. Please try again.');
    }
}
