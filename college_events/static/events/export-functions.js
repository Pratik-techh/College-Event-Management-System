// Export functions for admin panel
// These functions use the global 'registrations' array loaded by admin-script.js

function exportToExcel() {
    if (!window.registrations || registrations.length === 0) {
        alert('No registrations to export.');
        return;
    }

    // Group registrations by event
    const groupedRegistrations = {};
    registrations.forEach(reg => {
        const eventName = reg.event__name;
        if (!groupedRegistrations[eventName]) {
            groupedRegistrations[eventName] = [];
        }
        groupedRegistrations[eventName].push(reg);
    });

    const wb = XLSX.utils.book_new();

    Object.entries(groupedRegistrations).forEach(([eventName, eventRegistrations]) => {
        const wsData = eventRegistrations.map(reg => ({
            'Ticket ID': reg.ticket_id,
            'Student Name': reg.name,
            'Email': reg.email,
            'Course': reg.course,
            'Branch': reg.branch,
            'Mobile': reg.mobile,
            'Registration Date': reg.timestamp,
            'Event': reg.event__name,
            'Event Date': reg.event__date,
            'Venue': reg.event__venue
        }));

        const ws = XLSX.utils.json_to_sheet(wsData);

        // Truncate sheet name to 31 characters (Excel limit)
        const sheetName = eventName.substring(0, 31);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    XLSX.writeFile(wb, 'event_registrations.xlsx');
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

        // Group registrations by event
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
                { header: 'Ticket ID', dataKey: 'ticket_id' },
                { header: 'Name', dataKey: 'name' },
                { header: 'Email', dataKey: 'email' },
                { header: 'Course', dataKey: 'course' },
                { header: 'Branch', dataKey: 'branch' },
                { header: 'Mobile', dataKey: 'mobile' },
                { header: 'Registration Date', dataKey: 'date' }
            ];

            const data = group.registrations.map(reg => ({
                ticket_id: reg.ticket_id,
                name: reg.name,
                email: reg.email,
                course: reg.course,
                branch: reg.branch,
                mobile: reg.mobile,
                date: reg.timestamp
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
                    textColor: [73, 80, 87]
                },
                alternateRowStyles: {
                    fillColor: [249, 250, 251]
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
