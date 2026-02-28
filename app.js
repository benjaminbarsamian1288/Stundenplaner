/**
 * B.B. Protect - Stundenplaner für Sicherheitseinsätze
 * Berechnung von Arbeitszeit, Stundensatz und Zuschlägen (Nacht/Sonntag/Feiertag)
 */

let einsaetze = JSON.parse(localStorage.getItem('bbprotect_einsaetze') || '[]');
let objekte = JSON.parse(localStorage.getItem('bbprotect_objekte') || '[]');
let vorlagen = JSON.parse(localStorage.getItem('bbprotect_vorlagen') || '[]');

// Kalender-State
let kalenderJahr = new Date().getFullYear();
let kalenderMonat = new Date().getMonth();

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

const MONATSNAMEN = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

// =============================================
// TAB-NAVIGATION
// =============================================
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', function () {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        document.getElementById('tab-' + this.dataset.tab).classList.add('active');

        if (this.dataset.tab === 'dashboard') updateDashboard();
        if (this.dataset.tab === 'objekte') renderObjekte();
        if (this.dataset.tab === 'kalender') renderKalender();
        if (this.dataset.tab === 'abrechnung') updateAbrechnung();
    });
});

// =============================================
// SCHICHTVORLAGEN
// =============================================
function toggleVorlagenForm() {
    const w = document.getElementById('vorlageFormWrapper');
    w.style.display = w.style.display === 'none' ? 'block' : 'none';
}

document.getElementById('vorlageForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const bezeichnung = document.getElementById('vorlageBezeichnung').value.trim();
    const objekt = document.getElementById('vorlageObjekt').value.trim();
    const von = document.getElementById('vorlageVon').value;
    const bis = document.getElementById('vorlageBis').value;
    const satz = parseFloat(document.getElementById('vorlageSatz').value) || 0;

    if (!bezeichnung || !von || !bis) return;

    vorlagen.push({ bezeichnung, objekt, von, bis, satz });
    localStorage.setItem('bbprotect_vorlagen', JSON.stringify(vorlagen));
    renderVorlagen();
    this.reset();
    toggleVorlagenForm();
});

function renderVorlagen() {
    const grid = document.getElementById('vorlagenGrid');
    const empty = document.getElementById('vorlagenEmpty');

    if (vorlagen.length === 0) {
        grid.innerHTML = '';
        grid.appendChild(empty);
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';
    grid.innerHTML = '';

    vorlagen.forEach((v, i) => {
        const stunden = berechneStunden(v.von, v.bis);
        const card = document.createElement('div');
        card.className = 'vorlage-card';
        card.innerHTML = `
            <div class="vorlage-info">
                <strong>${escapeHtml(v.bezeichnung)}</strong>
                <span>${v.von} - ${v.bis} (${formatZahl(stunden)} Std.)</span>
                ${v.objekt ? '<span class="vorlage-objekt">' + escapeHtml(v.objekt) + '</span>' : ''}
                ${v.satz ? '<span>' + formatEuro(v.satz) + '/Std.</span>' : ''}
            </div>
            <div class="vorlage-actions">
                <button class="btn-primary btn-small" onclick="verwendeVorlage(${i})">Verwenden</button>
                <button class="btn-delete btn-small" onclick="loescheVorlage(${i})">X</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

function verwendeVorlage(index) {
    const v = vorlagen[index];
    if (!v) return;

    if (v.objekt) document.getElementById('objekt').value = v.objekt;
    document.getElementById('zeitVon').value = v.von;
    document.getElementById('zeitBis').value = v.bis;
    if (v.satz) document.getElementById('stundensatz').value = v.satz;

    // Zum Formular scrollen
    document.getElementById('einsatzFormSection').scrollIntoView({ behavior: 'smooth' });
    updatePreview();
}

function loescheVorlage(index) {
    vorlagen.splice(index, 1);
    localStorage.setItem('bbprotect_vorlagen', JSON.stringify(vorlagen));
    renderVorlagen();
}

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
    updateAlleFilter();
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
        objekt, datum, zeitVon, zeitBis, stundensatz, mitarbeiter, bemerkung,
        ...berechnung
    };
}

function bearbeiteEinsatz(id) {
    const e = einsaetze.find(x => x.id === id);
    if (!e) return;

    // Zum Erfassungs-Tab wechseln
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelector('[data-tab="erfassung"]').classList.add('active');
    document.getElementById('tab-erfassung').classList.add('active');

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
    document.getElementById('einsatzFormSection').classList.add('editing');
    document.getElementById('einsatzFormSection').scrollIntoView({ behavior: 'smooth' });
    updatePreview();
}

function cancelEdit() {
    editIdField.value = '';
    formTitle.textContent = 'Neuen Einsatz erfassen';
    submitBtn.textContent = 'Einsatz hinzufügen';
    cancelEditBtn.style.display = 'none';
    document.getElementById('einsatzFormSection').classList.remove('editing');
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
        zuschlagDetails.push({ typ: 'Nacht', stunden: nachtStunden, prozent: nachtProzent, betrag: nachtZuschlag });
    }

    if (wochentag === 0) {
        const sonntagZuschlag = stunden * stundensatz * (sonntagProzent / 100);
        zuschlagBetrag += sonntagZuschlag;
        zuschlagDetails.push({ typ: 'Sonntag', stunden, prozent: sonntagProzent, betrag: sonntagZuschlag });
    }

    if (feiertag) {
        const feiertagZuschlag = stunden * stundensatz * (feiertagProzent / 100);
        zuschlagBetrag += feiertagZuschlag;
        zuschlagDetails.push({ typ: 'Feiertag', name: feiertag, stunden, prozent: feiertagProzent, betrag: feiertagZuschlag });
    }

    const grundlohn = stunden * stundensatz;
    const gesamt = grundlohn + zuschlagBetrag;

    return { stunden, nachtStunden, tagStunden, grundlohn, zuschlagBetrag, zuschlagDetails, gesamt, feiertag, istSonntag: wochentag === 0 };
}

function berechneStunden(von, bis) {
    const [vh, vm] = von.split(':').map(Number);
    const [bh, bm] = bis.split(':').map(Number);
    let startMin = vh * 60 + vm;
    let endMin = bh * 60 + bm;
    if (endMin <= startMin) endMin += 24 * 60;
    return (endMin - startMin) / 60;
}

function berechneNachtStunden(von, bis) {
    const [vh, vm] = von.split(':').map(Number);
    const [bh, bm] = bis.split(':').map(Number);
    let startMin = vh * 60 + vm;
    let endMin = bh * 60 + bm;
    if (endMin <= startMin) endMin += 24 * 60;

    let nachtMinuten = 0;
    nachtMinuten += ueberschneidung(startMin, endMin, 20 * 60, 24 * 60);
    nachtMinuten += ueberschneidung(startMin, endMin, 0, 6 * 60);
    if (endMin > 24 * 60) {
        nachtMinuten += ueberschneidung(startMin, endMin, 24 * 60, 30 * 60);
    }
    return nachtMinuten / 60;
}

function ueberschneidung(s1, e1, s2, e2) {
    return Math.max(0, Math.min(e1, e2) - Math.max(s1, s2));
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
    html += detailItem('Grundlohn', formatEuro(berechnung.grundlohn));

    berechnung.zuschlagDetails.forEach(z => {
        const label = z.name ? `${z.typ} (${z.name})` : z.typ;
        html += detailItem(`${label} ${z.prozent}%`, formatEuro(z.betrag));
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

    const tableWrapper = document.querySelector('#tab-erfassung .table-wrapper');
    if (gefiltert.length === 0) {
        emptyMessage.style.display = 'block';
        if (tableWrapper) tableWrapper.style.display = 'none';
    } else {
        emptyMessage.style.display = 'none';
        if (tableWrapper) tableWrapper.style.display = 'block';
    }

    let totalStunden = 0, totalZuschlaege = 0, totalGesamt = 0;

    gefiltert.forEach(e => {
        const tr = document.createElement('tr');

        let zuschlagBadges = '';
        e.zuschlagDetails.forEach(z => {
            const cls = z.typ === 'Nacht' ? 'zuschlag-nacht' : z.typ === 'Sonntag' ? 'zuschlag-sonntag' : 'zuschlag-feiertag';
            zuschlagBadges += `<span class="zuschlag-badge ${cls}">${escapeHtml(z.typ)} ${z.prozent}% = ${formatEuro(z.betrag)}</span> `;
        });
        if (e.zuschlagDetails.length === 0) zuschlagBadges = '<span style="color:#a0aec0">&mdash;</span>';

        tr.innerHTML = `
            <td>${formatDatum(e.datum)}</td>
            <td>${escapeHtml(e.objekt)}</td>
            <td>${escapeHtml(e.mitarbeiter || '\u2014')}</td>
            <td>${e.zeitVon}</td>
            <td>${e.zeitBis}</td>
            <td>${formatZahl(e.stunden)}</td>
            <td>${formatEuro(e.stundensatz)}/Std.</td>
            <td>${zuschlagBadges}</td>
            <td><strong>${formatEuro(e.gesamt)}</strong></td>
            <td class="no-print">
                <button class="btn-edit" onclick="bearbeiteEinsatz(${e.id})">Bearb.</button>
                <button class="btn-delete" onclick="loescheEinsatz(${e.id})">X</button>
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

// =============================================
// FILTER
// =============================================
function updateAlleFilter() {
    updateMonatsfilter();
    updateObjektfilter();
}

function updateMonatsfilter() {
    const monate = new Set();
    einsaetze.forEach(e => monate.add(e.datum.substring(0, 7)));

    // Einsatz-Tab Filter
    fillMonatsSelect(filterMonat, monate);

    // Dashboard Filter
    const dashMonat = document.getElementById('dashboardMonat');
    if (dashMonat) fillMonatsSelect(dashMonat, monate);

    // Abrechnung Filter
    const abrMonat = document.getElementById('abrechnungMonat');
    if (abrMonat) fillMonatsSelect(abrMonat, monate);
}

function fillMonatsSelect(select, monate) {
    const current = select.value;
    select.innerHTML = '<option value="">Alle Monate</option>';
    Array.from(monate).sort().reverse().forEach(m => {
        const [j, mon] = m.split('-');
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = `${MONATSNAMEN[parseInt(mon) - 1]} ${j}`;
        select.appendChild(opt);
    });
    select.value = current;
}

function updateObjektfilter() {
    const objektNamen = new Set();
    einsaetze.forEach(e => objektNamen.add(e.objekt));

    const current = filterObjekt.value;
    filterObjekt.innerHTML = '<option value="">Alle Objekte</option>';
    Array.from(objektNamen).sort().forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        filterObjekt.appendChild(opt);
    });
    filterObjekt.value = current;
}

function updateMitarbeiterFilter() {
    const select = document.getElementById('abrechnungMitarbeiter');
    if (!select) return;
    const alleMa = new Set();
    einsaetze.forEach(e => { if (e.mitarbeiter) alleMa.add(e.mitarbeiter); });

    const current = select.value;
    select.innerHTML = '<option value="">Alle Mitarbeiter</option>';
    Array.from(alleMa).sort().forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        select.appendChild(opt);
    });
    select.value = current;
}

function loescheEinsatz(id) {
    if (!confirm('Diesen Einsatz wirklich löschen?')) return;
    einsaetze = einsaetze.filter(e => e.id !== id);
    speichern();
    renderTabelle();
    updateAlleFilter();
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

    if (gefiltert.length === 0) { alert('Keine Einsätze zum Exportieren.'); return; }

    const header = 'Datum;Objekt;Mitarbeiter;Von;Bis;Stunden;Stundensatz;Grundlohn;Zuschläge;Zuschlagsbetrag;Gesamt;Bemerkung';
    const rows = gefiltert.map(e => {
        const zuschlagText = e.zuschlagDetails.map(z => `${z.typ} ${z.prozent}%`).join(', ') || 'keine';
        return [formatDatum(e.datum), e.objekt, e.mitarbeiter || '', e.zeitVon, e.zeitBis,
            formatZahl(e.stunden), formatZahl(e.stundensatz), formatZahl(e.grundlohn),
            zuschlagText, formatZahl(e.zuschlagBetrag), formatZahl(e.gesamt), e.bemerkung || ''
        ].map(v => `"${v}"`).join(';');
    });

    downloadFile(`BBProtect_Einsaetze_${filterM || 'Alle'}.csv`,
        '\uFEFF' + header + '\n' + rows.join('\n'), 'text/csv;charset=utf-8;');
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

    if (gefiltert.length === 0) { alert('Keine Einsätze zum Drucken.'); return; }

    gefiltert.sort((a, b) => a.datum.localeCompare(b.datum) || a.zeitVon.localeCompare(b.zeitVon));

    let zeitraum = 'Alle Einsätze';
    if (filterM) {
        const [j, m] = filterM.split('-');
        zeitraum = `${MONATSNAMEN[parseInt(m) - 1]} ${j}`;
    }

    let totalStunden = 0, totalGrund = 0, totalZuschlag = 0, totalGesamt = 0;
    gefiltert.forEach(e => { totalStunden += e.stunden; totalGrund += e.grundlohn; totalZuschlag += e.zuschlagBetrag; totalGesamt += e.gesamt; });

    let html = printHeader(zeitraum, filterO) + `
        <div class="print-summary">
            <div><strong>Stunden gesamt:</strong> ${formatZahl(totalStunden)}</div>
            <div><strong>Grundlohn:</strong> ${formatEuro(totalGrund)}</div>
            <div><strong>Zuschläge:</strong> ${formatEuro(totalZuschlag)}</div>
            <div><strong>Gesamtbetrag:</strong> ${formatEuro(totalGesamt)}</div>
        </div>
        <table><thead><tr>
            <th>Datum</th><th>Objekt</th><th>Mitarbeiter</th><th>Von</th><th>Bis</th>
            <th>Stunden</th><th>Satz</th><th>Zuschläge</th><th>Gesamt</th>
        </tr></thead><tbody>`;

    gefiltert.forEach(e => {
        const zText = e.zuschlagDetails.map(z => `${z.typ} ${z.prozent}%`).join(', ') || '\u2014';
        html += `<tr>
            <td>${formatDatum(e.datum)}</td><td>${escapeHtml(e.objekt)}</td>
            <td>${escapeHtml(e.mitarbeiter || '\u2014')}</td><td>${e.zeitVon}</td><td>${e.zeitBis}</td>
            <td>${formatZahl(e.stunden)}</td><td>${formatEuro(e.stundensatz)}</td>
            <td>${escapeHtml(zText)} (${formatEuro(e.zuschlagBetrag)})</td><td>${formatEuro(e.gesamt)}</td>
        </tr>`;
    });

    html += `</tbody><tfoot><tr class="total-row">
        <td colspan="5"><strong>GESAMT</strong></td>
        <td><strong>${formatZahl(totalStunden)}</strong></td><td></td>
        <td><strong>${formatEuro(totalZuschlag)}</strong></td><td><strong>${formatEuro(totalGesamt)}</strong></td>
    </tr></tfoot></table>` + printFooter();

    document.getElementById('printArea').innerHTML = html;
    window.print();
}

// =============================================
// KALENDER
// =============================================
function kalenderNav(offset) {
    kalenderMonat += offset;
    if (kalenderMonat > 11) { kalenderMonat = 0; kalenderJahr++; }
    if (kalenderMonat < 0) { kalenderMonat = 11; kalenderJahr--; }
    renderKalender();
}

function renderKalender() {
    document.getElementById('kalenderTitel').textContent = `${MONATSNAMEN[kalenderMonat]} ${kalenderJahr}`;

    const grid = document.getElementById('kalenderGrid');
    grid.innerHTML = '';

    // Wochentag-Header
    ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].forEach(tag => {
        const cell = document.createElement('div');
        cell.className = 'kalender-header-cell';
        cell.textContent = tag;
        grid.appendChild(cell);
    });

    const ersterTag = new Date(kalenderJahr, kalenderMonat, 1);
    let startWochentag = ersterTag.getDay();
    if (startWochentag === 0) startWochentag = 7;
    startWochentag--;

    const tageImMonat = new Date(kalenderJahr, kalenderMonat + 1, 0).getDate();
    const monatsStr = `${kalenderJahr}-${String(kalenderMonat + 1).padStart(2, '0')}`;

    // Einsätze für diesen Monat
    const monatsEinsaetze = einsaetze.filter(e => e.datum.substring(0, 7) === monatsStr);

    // Leere Zellen vor dem 1.
    for (let i = 0; i < startWochentag; i++) {
        const cell = document.createElement('div');
        cell.className = 'kalender-cell empty';
        grid.appendChild(cell);
    }

    // Tage
    for (let tag = 1; tag <= tageImMonat; tag++) {
        const datumStr = `${monatsStr}-${String(tag).padStart(2, '0')}`;
        const tagesEinsaetze = monatsEinsaetze.filter(e => e.datum === datumStr);
        const feiertag = istFeiertag(datumStr);
        const wochentag = new Date(datumStr).getDay();
        const istHeute = datumStr === new Date().toISOString().split('T')[0];

        const cell = document.createElement('div');
        cell.className = 'kalender-cell';
        if (istHeute) cell.classList.add('heute');
        if (feiertag) cell.classList.add('feiertag-tag');
        if (wochentag === 0 || wochentag === 6) cell.classList.add('wochenende');

        let inhalt = `<div class="kalender-tag-nr">${tag}</div>`;

        if (feiertag) {
            inhalt += `<div class="kalender-feiertag">${escapeHtml(feiertag)}</div>`;
        }

        tagesEinsaetze.forEach(e => {
            const hatNacht = e.nachtStunden > 0;
            const cls = hatNacht ? 'nacht' : 'tag';
            inhalt += `<div class="kalender-einsatz ${cls}" onclick="bearbeiteEinsatz(${e.id})" title="${escapeHtml(e.objekt)}">
                <span class="ke-zeit">${e.zeitVon}-${e.zeitBis}</span>
                <span class="ke-objekt">${escapeHtml(e.objekt)}</span>
            </div>`;
        });

        // Stunden-Summe
        if (tagesEinsaetze.length > 0) {
            const tagesStunden = tagesEinsaetze.reduce((s, e) => s + e.stunden, 0);
            inhalt += `<div class="kalender-summe">${formatZahl(tagesStunden)} Std.</div>`;
        }

        cell.innerHTML = inhalt;

        // Klick auf leere Zelle: Datum setzen und zum Formular wechseln
        if (tagesEinsaetze.length === 0) {
            cell.style.cursor = 'pointer';
            cell.addEventListener('click', () => {
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
                document.querySelector('[data-tab="erfassung"]').classList.add('active');
                document.getElementById('tab-erfassung').classList.add('active');
                document.getElementById('datum').value = datumStr;
                document.getElementById('einsatzFormSection').scrollIntoView({ behavior: 'smooth' });
                updatePreview();
            });
        }

        grid.appendChild(cell);
    }
}

// =============================================
// MITARBEITER-ABRECHNUNG
// =============================================
document.getElementById('abrechnungMonat').addEventListener('change', updateAbrechnung);
document.getElementById('abrechnungMitarbeiter').addEventListener('change', updateAbrechnung);

function updateAbrechnung() {
    updateMitarbeiterFilter();

    const filterM = document.getElementById('abrechnungMonat').value;
    const filterMA = document.getElementById('abrechnungMitarbeiter').value;

    let gefiltert = einsaetze;
    if (filterM) gefiltert = gefiltert.filter(e => e.datum.substring(0, 7) === filterM);
    if (filterMA) gefiltert = gefiltert.filter(e => e.mitarbeiter === filterMA);

    const content = document.getElementById('abrechnungContent');

    if (gefiltert.length === 0) {
        content.innerHTML = '<p style="color:#a0aec0;text-align:center;padding:2rem">Keine Einsätze für diesen Zeitraum.</p>';
        return;
    }

    // Gruppiert nach Mitarbeiter
    const maMap = {};
    gefiltert.forEach(e => {
        const name = e.mitarbeiter || 'Nicht zugewiesen';
        if (!maMap[name]) maMap[name] = [];
        maMap[name].push(e);
    });

    let html = '';

    Object.entries(maMap).sort((a, b) => a[0].localeCompare(b[0])).forEach(([name, einsaetzeMa]) => {
        einsaetzeMa.sort((a, b) => a.datum.localeCompare(b.datum));

        let totalStd = 0, totalNacht = 0, totalGrund = 0, totalZuschlag = 0, totalGesamt = 0;
        einsaetzeMa.forEach(e => {
            totalStd += e.stunden; totalNacht += e.nachtStunden;
            totalGrund += e.grundlohn; totalZuschlag += e.zuschlagBetrag; totalGesamt += e.gesamt;
        });

        let zeitraum = 'Alle Monate';
        if (filterM) {
            const [j, m] = filterM.split('-');
            zeitraum = `${MONATSNAMEN[parseInt(m) - 1]} ${j}`;
        }

        html += `
        <div class="abrechnung-card">
            <div class="abrechnung-header-info">
                <h3>${escapeHtml(name)}</h3>
                <span class="abrechnung-zeitraum">${escapeHtml(zeitraum)}</span>
            </div>

            <div class="abrechnung-summary">
                <div class="abr-stat"><span class="abr-label">Einsätze</span><span class="abr-value">${einsaetzeMa.length}</span></div>
                <div class="abr-stat"><span class="abr-label">Stunden</span><span class="abr-value">${formatZahl(totalStd)}</span></div>
                <div class="abr-stat"><span class="abr-label">davon Nacht</span><span class="abr-value">${formatZahl(totalNacht)}</span></div>
                <div class="abr-stat"><span class="abr-label">Grundlohn</span><span class="abr-value">${formatEuro(totalGrund)}</span></div>
                <div class="abr-stat"><span class="abr-label">Zuschläge</span><span class="abr-value">${formatEuro(totalZuschlag)}</span></div>
                <div class="abr-stat total"><span class="abr-label">GESAMT</span><span class="abr-value">${formatEuro(totalGesamt)}</span></div>
            </div>

            <table class="abrechnung-table">
                <thead><tr>
                    <th>Datum</th><th>Objekt</th><th>Von</th><th>Bis</th>
                    <th>Std.</th><th>Nacht</th><th>Grund</th><th>Zuschlag</th><th>Gesamt</th>
                </tr></thead>
                <tbody>`;

        einsaetzeMa.forEach(e => {
            html += `<tr>
                <td>${formatDatum(e.datum)}</td><td>${escapeHtml(e.objekt)}</td>
                <td>${e.zeitVon}</td><td>${e.zeitBis}</td>
                <td>${formatZahl(e.stunden)}</td><td>${formatZahl(e.nachtStunden)}</td>
                <td>${formatEuro(e.grundlohn)}</td><td>${formatEuro(e.zuschlagBetrag)}</td>
                <td><strong>${formatEuro(e.gesamt)}</strong></td>
            </tr>`;
        });

        html += `</tbody></table></div>`;
    });

    content.innerHTML = html;
}

function druckeAbrechnung() {
    const filterM = document.getElementById('abrechnungMonat').value;
    const filterMA = document.getElementById('abrechnungMitarbeiter').value;

    let gefiltert = einsaetze;
    if (filterM) gefiltert = gefiltert.filter(e => e.datum.substring(0, 7) === filterM);
    if (filterMA) gefiltert = gefiltert.filter(e => e.mitarbeiter === filterMA);

    if (gefiltert.length === 0) { alert('Keine Daten zum Drucken.'); return; }

    let zeitraum = 'Alle Monate';
    if (filterM) {
        const [j, m] = filterM.split('-');
        zeitraum = `${MONATSNAMEN[parseInt(m) - 1]} ${j}`;
    }

    const maMap = {};
    gefiltert.forEach(e => {
        const name = e.mitarbeiter || 'Nicht zugewiesen';
        if (!maMap[name]) maMap[name] = [];
        maMap[name].push(e);
    });

    let html = printHeader(`Mitarbeiter-Abrechnung \u2014 ${zeitraum}`, filterMA);

    Object.entries(maMap).sort((a, b) => a[0].localeCompare(b[0])).forEach(([name, list]) => {
        list.sort((a, b) => a.datum.localeCompare(b.datum));

        let totalStd = 0, totalGrund = 0, totalZuschlag = 0, totalGesamt = 0;
        list.forEach(e => { totalStd += e.stunden; totalGrund += e.grundlohn; totalZuschlag += e.zuschlagBetrag; totalGesamt += e.gesamt; });

        html += `<h3 style="margin:1rem 0 0.5rem">${escapeHtml(name)}</h3>
        <div class="print-summary">
            <div><strong>Stunden:</strong> ${formatZahl(totalStd)}</div>
            <div><strong>Grundlohn:</strong> ${formatEuro(totalGrund)}</div>
            <div><strong>Zuschläge:</strong> ${formatEuro(totalZuschlag)}</div>
            <div><strong>Gesamt:</strong> ${formatEuro(totalGesamt)}</div>
        </div>
        <table><thead><tr>
            <th>Datum</th><th>Objekt</th><th>Von</th><th>Bis</th><th>Std.</th><th>Grund</th><th>Zuschlag</th><th>Gesamt</th>
        </tr></thead><tbody>`;

        list.forEach(e => {
            html += `<tr><td>${formatDatum(e.datum)}</td><td>${escapeHtml(e.objekt)}</td>
                <td>${e.zeitVon}</td><td>${e.zeitBis}</td><td>${formatZahl(e.stunden)}</td>
                <td>${formatEuro(e.grundlohn)}</td><td>${formatEuro(e.zuschlagBetrag)}</td>
                <td>${formatEuro(e.gesamt)}</td></tr>`;
        });

        html += `</tbody><tfoot><tr class="total-row">
            <td colspan="4"><strong>Summe</strong></td><td><strong>${formatZahl(totalStd)}</strong></td>
            <td><strong>${formatEuro(totalGrund)}</strong></td><td><strong>${formatEuro(totalZuschlag)}</strong></td>
            <td><strong>${formatEuro(totalGesamt)}</strong></td>
        </tr></tfoot></table>`;
    });

    html += printFooter();
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
    renderBarStats('objektStats', gefiltert, e => e.objekt);
    // Mitarbeiter-Aufschlüsselung
    renderBarStats('mitarbeiterStats', gefiltert, e => e.mitarbeiter || 'Nicht zugewiesen');

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
    [{ label: 'Nachtzuschläge', betrag: nachtTotal, cls: 'nacht' },
     { label: 'Sonntagszuschläge', betrag: sonntagTotal, cls: 'sonntag' },
     { label: 'Feiertagszuschläge', betrag: feiertagTotal, cls: 'feiertag' }
    ].forEach(z => {
        const pct = (z.betrag / maxZ) * 100;
        zHtml += `<div class="stat-row">
            <span class="stat-row-label">${z.label}</span>
            <div class="stat-bar"><div class="stat-bar-fill ${z.cls}" style="width:${pct}%"></div></div>
            <span class="stat-row-value">${formatEuro(z.betrag)}</span>
        </div>`;
    });
    document.getElementById('zuschlagStats').innerHTML = zHtml;
}

function renderBarStats(elementId, daten, keyFn) {
    const map = {};
    daten.forEach(e => {
        const key = keyFn(e);
        if (!map[key]) map[key] = { stunden: 0, gesamt: 0 };
        map[key].stunden += e.stunden;
        map[key].gesamt += e.gesamt;
    });

    const maxStd = Math.max(...Object.values(map).map(o => o.stunden), 1);
    let html = '';
    Object.entries(map).sort((a, b) => b[1].stunden - a[1].stunden).forEach(([name, data]) => {
        const pct = (data.stunden / maxStd) * 100;
        html += `<div class="stat-row">
            <span class="stat-row-label">${escapeHtml(name)}</span>
            <div class="stat-bar"><div class="stat-bar-fill" style="width:${pct}%"></div></div>
            <span class="stat-row-value">${formatZahl(data.stunden)} Std. / ${formatEuro(data.gesamt)}</span>
        </div>`;
    });
    document.getElementById(elementId).innerHTML = html || '<p style="color:#a0aec0">Keine Daten</p>';
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

    const idx = objekte.findIndex(o => o.name === name);
    const obj = { name, adresse, stundensatz, ansprechpartner };
    if (idx !== -1) objekte[idx] = obj; else objekte.push(obj);

    localStorage.setItem('bbprotect_objekte', JSON.stringify(objekte));
    renderObjekte();
    updateDataLists();
    this.reset();
});

function renderObjekte() {
    const body = document.getElementById('objekteBody');
    const empty = document.getElementById('objekteEmpty');
    body.innerHTML = '';

    if (objekte.length === 0) { empty.style.display = 'block'; return; }
    empty.style.display = 'none';

    objekte.forEach((o, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${escapeHtml(o.name)}</td>
            <td>${escapeHtml(o.adresse || '\u2014')}</td>
            <td>${o.stundensatz ? formatEuro(o.stundensatz) + '/Std.' : '\u2014'}</td>
            <td>${escapeHtml(o.ansprechpartner || '\u2014')}</td>
            <td><button class="btn-delete" onclick="loescheObjekt(${i})">X</button></td>
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

// =============================================
// DATALISTEN (AUTOCOMPLETE)
// =============================================
function updateDataLists() {
    const objektListe = document.getElementById('objektListe');
    objektListe.innerHTML = '';
    const alleObjekte = new Set(objekte.map(o => o.name));
    einsaetze.forEach(e => alleObjekte.add(e.objekt));
    alleObjekte.forEach(name => { const opt = document.createElement('option'); opt.value = name; objektListe.appendChild(opt); });

    const maListe = document.getElementById('mitarbeiterListe');
    maListe.innerHTML = '';
    const alleMa = new Set();
    einsaetze.forEach(e => { if (e.mitarbeiter) alleMa.add(e.mitarbeiter); });
    alleMa.forEach(name => { const opt = document.createElement('option'); opt.value = name; maListe.appendChild(opt); });
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

function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function printHeader(titel, extra) {
    return `<h1>B.B. Protect</h1>
        <h2>${escapeHtml(titel)}${extra ? ' \u2014 ' + escapeHtml(extra) : ''}</h2>
        <div class="print-meta">Erstellt am: ${formatDatum(new Date().toISOString().split('T')[0])} | ${escapeHtml(titel)}</div>`;
}

function printFooter() {
    return `<div class="print-footer">B.B. Protect \u2014 Sicherheitseinsatz-Planer | ${new Date().toLocaleDateString('de-DE')}</div>`;
}

// =============================================
// INITIALISIERUNG
// =============================================
document.getElementById('datum').valueAsDate = new Date();
renderTabelle();
updateAlleFilter();
updateMitarbeiterFilter();
updateDataLists();
renderObjekte();
renderVorlagen();
