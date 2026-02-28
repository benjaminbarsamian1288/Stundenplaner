/**
 * B.B. Protect - Stundenplaner für Sicherheitseinsätze
 * Berechnung von Arbeitszeit, Stundensatz und Zuschlägen (Nacht/Sonntag/Feiertag)
 */

let einsaetze = JSON.parse(localStorage.getItem('bbprotect_einsaetze') || '[]');
let objekte = JSON.parse(localStorage.getItem('bbprotect_objekte') || '[]');

// --- DOM Referenzen ---
const form = document.getElementById('einsatzForm');
const autoZuschlagCheckbox = document.getElementById('autoZuschlag');
const manualZuschlagDiv = document.getElementById('manualZuschlag');
const einsatzBody = document.getElementById('einsatzBody');
const emptyMessage = document.getElementById('emptyMessage');
const filterMonat = document.getElementById('filterMonat');
const filterObjekt = document.getElementById('filterObjekt');
const previewSection = document.getElementById('previewSection');
const previewContent = document.getElementById('previewContent');
const editIdField = document.getElementById('editId');
const formTitle = document.getElementById('formTitle');
const submitBtn = document.getElementById('submitBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');

// --- Zuschlag-Sätze (Standard für Sicherheitsgewerbe) ---
const ZUSCHLAG_NACHT = 25;
const ZUSCHLAG_SONNTAG = 50;
const ZUSCHLAG_FEIERTAG = 100;

// =============================================
// TAB-NAVIGATION
// =============================================
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', function () {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        document.getElementById('tab-' + this.dataset.tab).classList.add('active');

        if (this.dataset.tab === 'dashboard') {
            updateDashboard();
        }
        if (this.dataset.tab === 'objekte') {
            renderObjekte();
        }
    });
});

// =============================================
// EINSATZ-ERFASSUNG
// =============================================
autoZuschlagCheckbox.addEventListener('change', function () {
    manualZuschlagDiv.style.display = this.checked ? 'none' : 'block';
});

form.addEventListener('submit', function (e) {
    e.preventDefault();
    const einsatz = erfasseFormular();
    if (!einsatz) return;

    const editId = parseInt(editIdField.value);
    if (editId) {
        // Bearbeiten: alten Einsatz ersetzen
        const idx = einsaetze.findIndex(e => e.id === editId);
        if (idx !== -1) {
            einsatz.id = editId;
            einsaetze[idx] = einsatz;
        }
        cancelEdit();
    } else {
        einsaetze.push(einsatz);
    }

    speichern();
    renderTabelle();
    updateMonatsfilter();
    updateObjektfilter();
    form.reset();
    autoZuschlagCheckbox.checked = true;
    manualZuschlagDiv.style.display = 'none';
    previewSection.style.display = 'none';
    document.getElementById('datum').valueAsDate = new Date();
    updateDataLists();
});

// Live-Vorschau bei Eingabeänderungen
['datum', 'zeitVon', 'zeitBis', 'stundensatz'].forEach(id => {
    document.getElementById(id).addEventListener('change', updatePreview);
    document.getElementById(id).addEventListener('input', updatePreview);
});

filterMonat.addEventListener('change', renderTabelle);
filterObjekt.addEventListener('change', renderTabelle);

// Objekt-Auswahl: Stundensatz automatisch setzen
document.getElementById('objekt').addEventListener('change', function () {
    const obj = objekte.find(o => o.name === this.value);
    if (obj && obj.stundensatz) {
        document.getElementById('stundensatz').value = obj.stundensatz;
        updatePreview();
    }
});

// --- Formular auslesen ---
function erfasseFormular() {
    const objekt = document.getElementById('objekt').value.trim();
    const datum = document.getElementById('datum').value;
    const zeitVon = document.getElementById('zeitVon').value;
    const zeitBis = document.getElementById('zeitBis').value;
    const stundensatz = parseFloat(document.getElementById('stundensatz').value);
    const mitarbeiter = document.getElementById('mitarbeiter').value.trim();
    const bemerkung = document.getElementById('bemerkung').value.trim();

    if (!objekt || !datum || !zeitVon || !zeitBis || isNaN(stundensatz)) return null;

    const berechnung = berechneEinsatz(datum, zeitVon, zeitBis, stundensatz);

    return {
        id: Date.now(),
        objekt,
        datum,
        zeitVon,
        zeitBis,
        stundensatz,
        mitarbeiter,
        bemerkung,
        ...berechnung
    };
}

// --- Bearbeiten ---
function bearbeiteEinsatz(id) {
    const e = einsaetze.find(x => x.id === id);
    if (!e) return;

    editIdField.value = e.id;
    document.getElementById('objekt').value = e.objekt;
    document.getElementById('datum').value = e.datum;
    document.getElementById('zeitVon').value = e.zeitVon;
    document.getElementById('zeitBis').value = e.zeitBis;
    document.getElementById('stundensatz').value = e.stundensatz;
    document.getElementById('mitarbeiter').value = e.mitarbeiter || '';
    document.getElementById('bemerkung').value = e.bemerkung || '';

    formTitle.textContent = 'Einsatz bearbeiten';
    submitBtn.textContent = 'Änderungen speichern';
    cancelEditBtn.style.display = 'inline-block';
    document.querySelector('.form-section').classList.add('editing');

    // Zum Formular scrollen
    document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
    updatePreview();
}

function cancelEdit() {
    editIdField.value = '';
    formTitle.textContent = 'Neuen Einsatz erfassen';
    submitBtn.textContent = 'Einsatz hinzufügen';
    cancelEditBtn.style.display = 'none';
    document.querySelector('.form-section').classList.remove('editing');
    previewSection.style.display = 'none';
}

// =============================================
// BERECHNUNG
// =============================================
function berechneEinsatz(datum, zeitVon, zeitBis, stundensatz) {
    const stunden = berechneStunden(zeitVon, zeitBis);
    const wochentag = new Date(datum).getDay();
    const feiertag = istFeiertag(datum);
    const autoCalc = autoZuschlagCheckbox.checked;

    let nachtProzent, sonntagProzent, feiertagProzent;

    if (autoCalc) {
        nachtProzent = ZUSCHLAG_NACHT;
        sonntagProzent = ZUSCHLAG_SONNTAG;
        feiertagProzent = ZUSCHLAG_FEIERTAG;
    } else {
        nachtProzent = parseFloat(document.getElementById('nachtzuschlag').value) || 0;
        sonntagProzent = parseFloat(document.getElementById('sonntagszuschlag').value) || 0;
        feiertagProzent = parseFloat(document.getElementById('feiertagszuschlag').value) || 0;
    }

    const nachtStunden = berechneNachtStunden(zeitVon, zeitBis);
    const tagStunden = stunden - nachtStunden;

    let zuschlagBetrag = 0;
    const zuschlagDetails = [];

    if (nachtStunden > 0) {
        const nachtZuschlag = nachtStunden * stundensatz * (nachtProzent / 100);
        zuschlagBetrag += nachtZuschlag;
        zuschlagDetails.push({
            typ: 'Nacht',
            stunden: nachtStunden,
            prozent: nachtProzent,
            betrag: nachtZuschlag
        });
    }

    if (wochentag === 0) {
        const sonntagZuschlag = stunden * stundensatz * (sonntagProzent / 100);
        zuschlagBetrag += sonntagZuschlag;
        zuschlagDetails.push({
            typ: 'Sonntag',
            stunden: stunden,
            prozent: sonntagProzent,
            betrag: sonntagZuschlag
        });
    }

    if (feiertag) {
        const feiertagZuschlag = stunden * stundensatz * (feiertagProzent / 100);
        zuschlagBetrag += feiertagZuschlag;
        zuschlagDetails.push({
            typ: 'Feiertag',
            name: feiertag,
            stunden: stunden,
            prozent: feiertagProzent,
            betrag: feiertagZuschlag
        });
    }

    const grundlohn = stunden * stundensatz;
    const gesamt = grundlohn + zuschlagBetrag;

    return {
        stunden,
        nachtStunden,
        tagStunden,
        grundlohn,
        zuschlagBetrag,
        zuschlagDetails,
        gesamt,
        feiertag,
        istSonntag: wochentag === 0
    };
}

function berechneStunden(von, bis) {
    const [vh, vm] = von.split(':').map(Number);
    const [bh, bm] = bis.split(':').map(Number);
    let startMin = vh * 60 + vm;
    let endMin = bh * 60 + bm;

    if (endMin <= startMin) {
        endMin += 24 * 60;
    }

    return (endMin - startMin) / 60;
}

function berechneNachtStunden(von, bis) {
    const [vh, vm] = von.split(':').map(Number);
    const [bh, bm] = bis.split(':').map(Number);
    let startMin = vh * 60 + vm;
    let endMin = bh * 60 + bm;

    if (endMin <= startMin) {
        endMin += 24 * 60;
    }

    let nachtMinuten = 0;

    const nacht1Start = 20 * 60;
    const nacht1End = 24 * 60;
    nachtMinuten += ueberschneidung(startMin, endMin, nacht1Start, nacht1End);

    const nacht2Start = 0;
    const nacht2End = 6 * 60;
    nachtMinuten += ueberschneidung(startMin, endMin, nacht2Start, nacht2End);

    if (endMin > 24 * 60) {
        const nacht3Start = 24 * 60;
        const nacht3End = 30 * 60;
        nachtMinuten += ueberschneidung(startMin, endMin, nacht3Start, nacht3End);
    }

    return nachtMinuten / 60;
}

function ueberschneidung(s1, e1, s2, e2) {
    const start = Math.max(s1, s2);
    const end = Math.min(e1, e2);
    return Math.max(0, end - start);
}

// =============================================
// VORSCHAU
// =============================================
function updatePreview() {
    const datum = document.getElementById('datum').value;
    const zeitVon = document.getElementById('zeitVon').value;
    const zeitBis = document.getElementById('zeitBis').value;
    const stundensatz = parseFloat(document.getElementById('stundensatz').value);

    if (!datum || !zeitVon || !zeitBis || isNaN(stundensatz)) {
        previewSection.style.display = 'none';
        return;
    }

    const berechnung = berechneEinsatz(datum, zeitVon, zeitBis, stundensatz);
    previewSection.style.display = 'block';

    const wochentage = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    const wochentag = wochentage[new Date(datum).getDay()];

    let html = '<div class="detail-grid">';
    html += detailItem('Tag', `${formatDatum(datum)} (${wochentag})`);
    html += detailItem('Arbeitszeit', `${formatZahl(berechnung.stunden)} Std.`);
    html += detailItem('davon Nacht', `${formatZahl(berechnung.nachtStunden)} Std.`);
    html += detailItem('Grundlohn', `${formatEuro(berechnung.grundlohn)}`);

    berechnung.zuschlagDetails.forEach(z => {
        const label = z.name ? `${z.typ} (${z.name})` : z.typ;
        html += detailItem(`${label} ${z.prozent}%`, `${formatEuro(z.betrag)}`);
    });

    html += detailItem('Zuschläge gesamt', formatEuro(berechnung.zuschlagBetrag));
    html += `<div class="detail-item total"><strong>Gesamtbetrag</strong><span>${formatEuro(berechnung.gesamt)}</span></div>`;
    html += '</div>';

    previewContent.innerHTML = html;
}

function detailItem(label, value) {
    return `<div class="detail-item"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(value)}</span></div>`;
}

// =============================================
// EINSATZ-TABELLE
// =============================================
function renderTabelle() {
    const filterM = filterMonat.value;
    const filterO = filterObjekt.value;

    let gefiltert = einsaetze;
    if (filterM) gefiltert = gefiltert.filter(e => e.datum.substring(0, 7) === filterM);
    if (filterO) gefiltert = gefiltert.filter(e => e.objekt === filterO);

    gefiltert.sort((a, b) => a.datum.localeCompare(b.datum) || a.zeitVon.localeCompare(b.zeitVon));

    einsatzBody.innerHTML = '';

    if (gefiltert.length === 0) {
        emptyMessage.style.display = 'block';
        document.querySelector('#tab-erfassung .table-wrapper').style.display = 'none';
    } else {
        emptyMessage.style.display = 'none';
        document.querySelector('#tab-erfassung .table-wrapper').style.display = 'block';
    }

    let totalStunden = 0;
    let totalZuschlaege = 0;
    let totalGesamt = 0;

    gefiltert.forEach(e => {
        const tr = document.createElement('tr');

        let zuschlagBadges = '';
        e.zuschlagDetails.forEach(z => {
            const cls = z.typ === 'Nacht' ? 'zuschlag-nacht'
                : z.typ === 'Sonntag' ? 'zuschlag-sonntag'
                    : 'zuschlag-feiertag';
            zuschlagBadges += `<span class="zuschlag-badge ${cls}">${escapeHtml(z.typ)} ${z.prozent}% = ${formatEuro(z.betrag)}</span> `;
        });

        if (e.zuschlagDetails.length === 0) {
            zuschlagBadges = '<span style="color:#a0aec0">&mdash;</span>';
        }

        tr.innerHTML = `
            <td>${formatDatum(e.datum)}</td>
            <td>${escapeHtml(e.objekt)}</td>
            <td>${escapeHtml(e.mitarbeiter || '—')}</td>
            <td>${e.zeitVon}</td>
            <td>${e.zeitBis}</td>
            <td>${formatZahl(e.stunden)}</td>
            <td>${formatEuro(e.stundensatz)}/Std.</td>
            <td>${zuschlagBadges}</td>
            <td><strong>${formatEuro(e.gesamt)}</strong></td>
            <td class="no-print">
                <button class="btn-edit" onclick="bearbeiteEinsatz(${e.id})">Bearb.</button>
                <button class="btn-delete" onclick="loescheEinsatz(${e.id})">Löschen</button>
            </td>
        `;
        einsatzBody.appendChild(tr);

        totalStunden += e.stunden;
        totalZuschlaege += e.zuschlagBetrag;
        totalGesamt += e.gesamt;
    });

    document.getElementById('totalStunden').textContent = formatZahl(totalStunden);
    document.getElementById('totalZuschlaege').textContent = formatEuro(totalZuschlaege);
    document.getElementById('totalGesamt').textContent = formatEuro(totalGesamt);
}

// --- Filter ---
function updateMonatsfilter() {
    const monate = new Set();
    einsaetze.forEach(e => monate.add(e.datum.substring(0, 7)));

    const monatsnamen = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
        'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

    const aktuellerFilter = filterMonat.value;
    filterMonat.innerHTML = '<option value="">Alle Monate</option>';

    Array.from(monate).sort().reverse().forEach(m => {
        const [j, mon] = m.split('-');
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = `${monatsnamen[parseInt(mon) - 1]} ${j}`;
        filterMonat.appendChild(opt);
    });

    filterMonat.value = aktuellerFilter;

    // Dashboard Monatsfilter synchronisieren
    const dashMonat = document.getElementById('dashboardMonat');
    if (dashMonat) {
        const dashFilter = dashMonat.value;
        dashMonat.innerHTML = '<option value="">Alle Monate</option>';
        Array.from(monate).sort().reverse().forEach(m => {
            const [j, mon] = m.split('-');
            const opt = document.createElement('option');
            opt.value = m;
            opt.textContent = `${monatsnamen[parseInt(mon) - 1]} ${j}`;
            dashMonat.appendChild(opt);
        });
        dashMonat.value = dashFilter;
    }
}

function updateObjektfilter() {
    const objektNamen = new Set();
    einsaetze.forEach(e => objektNamen.add(e.objekt));

    const aktuellerFilter = filterObjekt.value;
    filterObjekt.innerHTML = '<option value="">Alle Objekte</option>';

    Array.from(objektNamen).sort().forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        filterObjekt.appendChild(opt);
    });

    filterObjekt.value = aktuellerFilter;
}

// --- Löschen ---
function loescheEinsatz(id) {
    if (!confirm('Diesen Einsatz wirklich löschen?')) return;
    einsaetze = einsaetze.filter(e => e.id !== id);
    speichern();
    renderTabelle();
    updateMonatsfilter();
    updateObjektfilter();
}

// =============================================
// CSV EXPORT
// =============================================
function exportCSV() {
    const filterM = filterMonat.value;
    const filterO = filterObjekt.value;

    let gefiltert = einsaetze;
    if (filterM) gefiltert = gefiltert.filter(e => e.datum.substring(0, 7) === filterM);
    if (filterO) gefiltert = gefiltert.filter(e => e.objekt === filterO);

    if (gefiltert.length === 0) {
        alert('Keine Einsätze zum Exportieren vorhanden.');
        return;
    }

    const header = 'Datum;Objekt;Mitarbeiter;Von;Bis;Stunden;Stundensatz;Grundlohn;Zuschläge;Zuschlagsbetrag;Gesamt;Bemerkung';
    const rows = gefiltert.map(e => {
        const zuschlagText = e.zuschlagDetails.map(z => `${z.typ} ${z.prozent}%`).join(', ') || 'keine';
        return [
            formatDatum(e.datum),
            e.objekt,
            e.mitarbeiter || '',
            e.zeitVon,
            e.zeitBis,
            formatZahl(e.stunden),
            formatZahl(e.stundensatz),
            formatZahl(e.grundlohn),
            zuschlagText,
            formatZahl(e.zuschlagBetrag),
            formatZahl(e.gesamt),
            e.bemerkung || ''
        ].map(v => `"${v}"`).join(';');
    });

    const csv = '\uFEFF' + header + '\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    const filterLabel = filterM || 'Alle';
    a.download = `BBProtect_Einsaetze_${filterLabel}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// =============================================
// DRUCKANSICHT / MONATSBERICHT
// =============================================
function druckeMonatsbericht() {
    const filterM = filterMonat.value;
    const filterO = filterObjekt.value;

    let gefiltert = einsaetze;
    if (filterM) gefiltert = gefiltert.filter(e => e.datum.substring(0, 7) === filterM);
    if (filterO) gefiltert = gefiltert.filter(e => e.objekt === filterO);

    if (gefiltert.length === 0) {
        alert('Keine Einsätze zum Drucken vorhanden.');
        return;
    }

    gefiltert.sort((a, b) => a.datum.localeCompare(b.datum) || a.zeitVon.localeCompare(b.zeitVon));

    const monatsnamen = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
        'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

    let zeitraum = 'Alle Einsätze';
    if (filterM) {
        const [j, m] = filterM.split('-');
        zeitraum = `${monatsnamen[parseInt(m) - 1]} ${j}`;
    }

    let totalStunden = 0, totalGrund = 0, totalZuschlag = 0, totalGesamt = 0;
    gefiltert.forEach(e => {
        totalStunden += e.stunden;
        totalGrund += e.grundlohn;
        totalZuschlag += e.zuschlagBetrag;
        totalGesamt += e.gesamt;
    });

    let html = `
        <h1>B.B. Protect</h1>
        <h2>Einsatzbericht &mdash; ${escapeHtml(zeitraum)}${filterO ? ' &mdash; ' + escapeHtml(filterO) : ''}</h2>
        <div class="print-meta">
            Erstellt am: ${formatDatum(new Date().toISOString().split('T')[0])} |
            Anzahl Einsätze: ${gefiltert.length} |
            Zeitraum: ${escapeHtml(zeitraum)}
        </div>
        <div class="print-summary">
            <div><strong>Stunden gesamt:</strong> ${formatZahl(totalStunden)}</div>
            <div><strong>Grundlohn:</strong> ${formatEuro(totalGrund)}</div>
            <div><strong>Zuschläge:</strong> ${formatEuro(totalZuschlag)}</div>
            <div><strong>Gesamtbetrag:</strong> ${formatEuro(totalGesamt)}</div>
        </div>
        <table>
            <thead>
                <tr>
                    <th>Datum</th>
                    <th>Objekt</th>
                    <th>Mitarbeiter</th>
                    <th>Von</th>
                    <th>Bis</th>
                    <th>Stunden</th>
                    <th>Satz</th>
                    <th>Zuschläge</th>
                    <th>Gesamt</th>
                </tr>
            </thead>
            <tbody>
    `;

    gefiltert.forEach(e => {
        const zuschlagText = e.zuschlagDetails.map(z =>
            `${z.typ} ${z.prozent}%`
        ).join(', ') || '—';

        html += `
            <tr>
                <td>${formatDatum(e.datum)}</td>
                <td>${escapeHtml(e.objekt)}</td>
                <td>${escapeHtml(e.mitarbeiter || '—')}</td>
                <td>${e.zeitVon}</td>
                <td>${e.zeitBis}</td>
                <td>${formatZahl(e.stunden)}</td>
                <td>${formatEuro(e.stundensatz)}</td>
                <td>${escapeHtml(zuschlagText)} (${formatEuro(e.zuschlagBetrag)})</td>
                <td>${formatEuro(e.gesamt)}</td>
            </tr>
        `;
    });

    html += `
            </tbody>
            <tfoot>
                <tr class="total-row">
                    <td colspan="5"><strong>GESAMT</strong></td>
                    <td><strong>${formatZahl(totalStunden)}</strong></td>
                    <td></td>
                    <td><strong>${formatEuro(totalZuschlag)}</strong></td>
                    <td><strong>${formatEuro(totalGesamt)}</strong></td>
                </tr>
            </tfoot>
        </table>
        <div class="print-footer">
            B.B. Protect &mdash; Sicherheitseinsatz-Planer | Erstellt: ${new Date().toLocaleDateString('de-DE')}
        </div>
    `;

    document.getElementById('printArea').innerHTML = html;
    window.print();
}

// =============================================
// DASHBOARD
// =============================================
document.getElementById('dashboardMonat').addEventListener('change', updateDashboard);

function updateDashboard() {
    const filterM = document.getElementById('dashboardMonat').value;
    let gefiltert = einsaetze;
    if (filterM) gefiltert = gefiltert.filter(e => e.datum.substring(0, 7) === filterM);

    // Statistiken
    const totalStunden = gefiltert.reduce((s, e) => s + e.stunden, 0);
    const totalNacht = gefiltert.reduce((s, e) => s + e.nachtStunden, 0);
    const totalZuschlaege = gefiltert.reduce((s, e) => s + e.zuschlagBetrag, 0);
    const totalGesamt = gefiltert.reduce((s, e) => s + e.gesamt, 0);
    const mitarbeiterSet = new Set(gefiltert.filter(e => e.mitarbeiter).map(e => e.mitarbeiter));

    document.getElementById('statStunden').textContent = formatZahl(totalStunden);
    document.getElementById('statEinsaetze').textContent = gefiltert.length;
    document.getElementById('statGesamt').textContent = formatEuro(totalGesamt);
    document.getElementById('statNacht').textContent = formatZahl(totalNacht);
    document.getElementById('statZuschlaege').textContent = formatEuro(totalZuschlaege);
    document.getElementById('statMitarbeiter').textContent = mitarbeiterSet.size;

    // Objekt-Aufschlüsselung
    const objektMap = {};
    gefiltert.forEach(e => {
        if (!objektMap[e.objekt]) objektMap[e.objekt] = { stunden: 0, gesamt: 0, count: 0 };
        objektMap[e.objekt].stunden += e.stunden;
        objektMap[e.objekt].gesamt += e.gesamt;
        objektMap[e.objekt].count++;
    });

    const maxObjStunden = Math.max(...Object.values(objektMap).map(o => o.stunden), 1);
    let objektHtml = '';
    Object.entries(objektMap).sort((a, b) => b[1].stunden - a[1].stunden).forEach(([name, data]) => {
        const pct = (data.stunden / maxObjStunden) * 100;
        objektHtml += `
            <div class="stat-row">
                <span class="stat-row-label">${escapeHtml(name)}</span>
                <div class="stat-bar"><div class="stat-bar-fill" style="width:${pct}%"></div></div>
                <span class="stat-row-value">${formatZahl(data.stunden)} Std. / ${formatEuro(data.gesamt)}</span>
            </div>`;
    });
    document.getElementById('objektStats').innerHTML = objektHtml || '<p style="color:#a0aec0">Keine Daten</p>';

    // Mitarbeiter-Aufschlüsselung
    const maMap = {};
    gefiltert.forEach(e => {
        const name = e.mitarbeiter || 'Nicht zugewiesen';
        if (!maMap[name]) maMap[name] = { stunden: 0, gesamt: 0, count: 0 };
        maMap[name].stunden += e.stunden;
        maMap[name].gesamt += e.gesamt;
        maMap[name].count++;
    });

    const maxMaStunden = Math.max(...Object.values(maMap).map(o => o.stunden), 1);
    let maHtml = '';
    Object.entries(maMap).sort((a, b) => b[1].stunden - a[1].stunden).forEach(([name, data]) => {
        const pct = (data.stunden / maxMaStunden) * 100;
        maHtml += `
            <div class="stat-row">
                <span class="stat-row-label">${escapeHtml(name)}</span>
                <div class="stat-bar"><div class="stat-bar-fill" style="width:${pct}%"></div></div>
                <span class="stat-row-value">${formatZahl(data.stunden)} Std. / ${formatEuro(data.gesamt)}</span>
            </div>`;
    });
    document.getElementById('mitarbeiterStats').innerHTML = maHtml || '<p style="color:#a0aec0">Keine Daten</p>';

    // Zuschlagsverteilung
    let nachtTotal = 0, sonntagTotal = 0, feiertagTotal = 0;
    gefiltert.forEach(e => {
        e.zuschlagDetails.forEach(z => {
            if (z.typ === 'Nacht') nachtTotal += z.betrag;
            else if (z.typ === 'Sonntag') sonntagTotal += z.betrag;
            else feiertagTotal += z.betrag;
        });
    });

    const maxZ = Math.max(nachtTotal, sonntagTotal, feiertagTotal, 1);
    let zHtml = '';
    [
        { label: 'Nachtzuschläge', betrag: nachtTotal, cls: 'nacht' },
        { label: 'Sonntagszuschläge', betrag: sonntagTotal, cls: 'sonntag' },
        { label: 'Feiertagszuschläge', betrag: feiertagTotal, cls: 'feiertag' }
    ].forEach(z => {
        const pct = (z.betrag / maxZ) * 100;
        zHtml += `
            <div class="stat-row">
                <span class="stat-row-label">${z.label}</span>
                <div class="stat-bar"><div class="stat-bar-fill ${z.cls}" style="width:${pct}%"></div></div>
                <span class="stat-row-value">${formatEuro(z.betrag)}</span>
            </div>`;
    });
    document.getElementById('zuschlagStats').innerHTML = zHtml;
}

// =============================================
// OBJEKT-VERWALTUNG
// =============================================
document.getElementById('objektForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const name = document.getElementById('objektName').value.trim();
    const adresse = document.getElementById('objektAdresse').value.trim();
    const stundensatz = parseFloat(document.getElementById('objektStundensatz').value) || 0;
    const ansprechpartner = document.getElementById('objektAnsprechpartner').value.trim();

    if (!name) return;

    // Prüfen ob Objekt schon existiert (Update)
    const idx = objekte.findIndex(o => o.name === name);
    const obj = { name, adresse, stundensatz, ansprechpartner };

    if (idx !== -1) {
        objekte[idx] = obj;
    } else {
        objekte.push(obj);
    }

    localStorage.setItem('bbprotect_objekte', JSON.stringify(objekte));
    renderObjekte();
    updateDataLists();
    this.reset();
});

function renderObjekte() {
    const body = document.getElementById('objekteBody');
    const empty = document.getElementById('objekteEmpty');

    body.innerHTML = '';

    if (objekte.length === 0) {
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';
    objekte.forEach((o, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${escapeHtml(o.name)}</td>
            <td>${escapeHtml(o.adresse || '—')}</td>
            <td>${o.stundensatz ? formatEuro(o.stundensatz) + '/Std.' : '—'}</td>
            <td>${escapeHtml(o.ansprechpartner || '—')}</td>
            <td><button class="btn-delete" onclick="loescheObjekt(${i})">Löschen</button></td>
        `;
        body.appendChild(tr);
    });
}

function loescheObjekt(index) {
    if (!confirm('Dieses Objekt wirklich löschen?')) return;
    objekte.splice(index, 1);
    localStorage.setItem('bbprotect_objekte', JSON.stringify(objekte));
    renderObjekte();
    updateDataLists();
}

// --- DataLists für Autocomplete ---
function updateDataLists() {
    // Objekt-Liste
    const objektListe = document.getElementById('objektListe');
    objektListe.innerHTML = '';
    const alleObjekte = new Set(objekte.map(o => o.name));
    einsaetze.forEach(e => alleObjekte.add(e.objekt));
    alleObjekte.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        objektListe.appendChild(opt);
    });

    // Mitarbeiter-Liste
    const maListe = document.getElementById('mitarbeiterListe');
    maListe.innerHTML = '';
    const alleMa = new Set();
    einsaetze.forEach(e => { if (e.mitarbeiter) alleMa.add(e.mitarbeiter); });
    alleMa.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        maListe.appendChild(opt);
    });
}

// =============================================
// HILFSFUNKTIONEN
// =============================================
function formatDatum(d) {
    const [j, m, t] = d.split('-');
    return `${t}.${m}.${j}`;
}

function formatEuro(betrag) {
    return betrag.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' \u20AC';
}

function formatZahl(n) {
    return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function speichern() {
    localStorage.setItem('bbprotect_einsaetze', JSON.stringify(einsaetze));
}

// =============================================
// INITIALISIERUNG
// =============================================
document.getElementById('datum').valueAsDate = new Date();
renderTabelle();
updateMonatsfilter();
updateObjektfilter();
updateDataLists();
renderObjekte();
