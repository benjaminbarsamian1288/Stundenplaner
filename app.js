/**
 * B.B. Protect - Stundenplaner für Sicherheitseinsätze
 * Berechnung von Arbeitszeit, Stundensatz und Zuschlägen (Nacht/Sonntag/Feiertag)
 */

let einsaetze = JSON.parse(localStorage.getItem('bbprotect_einsaetze') || '[]');
let objekte = JSON.parse(localStorage.getItem('bbprotect_objekte') || '[]');
let vorlagen = JSON.parse(localStorage.getItem('bbprotect_vorlagen') || '[]');
let mitarbeiterListe_ = JSON.parse(localStorage.getItem('bbprotect_mitarbeiter') || '[]');
let verfuegbarkeit = JSON.parse(localStorage.getItem('bbprotect_verfuegbarkeit') || '[]');
let vorfaelle = JSON.parse(localStorage.getItem('bbprotect_vorfaelle') || '[]');

// Dienstplan-State
let dienstplanKW = getKalenderWoche(new Date());
let dienstplanJahr = new Date().getFullYear();

// Sortierung
let sortSpalte = 'datum';
let sortRichtung = 1; // 1 = aufsteigend, -1 = absteigend

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

const STATUS_LABELS = {
    geplant: 'Geplant',
    bestaetigt: 'Bestätigt',
    abgeschlossen: 'Abgeschlossen',
    storniert: 'Storniert'
};

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
        if (this.dataset.tab === 'objekte') { renderObjekte(); renderObjektAuslastung(); }
        if (this.dataset.tab === 'kalender') { renderKalender(); renderDienstplan(); }
        if (this.dataset.tab === 'abrechnung') updateAbrechnung();
        if (this.dataset.tab === 'mitarbeiter') renderMitarbeiter();
        if (this.dataset.tab === 'vorfaelle') renderVorfaelle();
        if (this.dataset.tab === 'einstellungen') updateDatenStats();
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

    // Konflikterkennung
    const editId = parseInt(editIdField.value);
    const konflikt = pruefeKonflikt(einsatz, editId || null);
    if (konflikt && !confirm(konflikt + '\n\nTrotzdem speichern?')) return;

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

// Mitarbeiter-Auswahl: persönlichen Stundensatz übernehmen (falls kein Objektsatz)
document.getElementById('mitarbeiter').addEventListener('change', function () {
    const ma = mitarbeiterListe_.find(m => m.name === this.value);
    if (ma && ma.stundensatz) {
        const aktuellerSatz = document.getElementById('stundensatz').value;
        if (!aktuellerSatz || aktuellerSatz === '0') {
            document.getElementById('stundensatz').value = ma.stundensatz;
            updatePreview();
        }
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
    const status = document.getElementById('einsatzStatus').value;

    if (!objekt || !datum || !zeitVon || !zeitBis || isNaN(stundensatz)) return null;

    const berechnung = berechneEinsatz(datum, zeitVon, zeitBis, stundensatz);

    return {
        id: Date.now(),
        objekt, datum, zeitVon, zeitBis, stundensatz, mitarbeiter, bemerkung, status,
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
    document.getElementById('einsatzStatus').value = e.status || 'geplant';

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

    // Pausenberechnung nach §4 ArbZG
    let pauseMinuten = 0;
    if (stunden > 9) pauseMinuten = 45;
    else if (stunden > 6) pauseMinuten = 30;

    const grundlohn = stunden * stundensatz;
    const gesamt = grundlohn + zuschlagBetrag;

    return { stunden, nachtStunden, tagStunden, pauseMinuten, grundlohn, zuschlagBetrag, zuschlagDetails, gesamt, feiertag, istSonntag: wochentag === 0 };
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
    if (berechnung.pauseMinuten > 0) {
        html += detailItem('Pause (§4 ArbZG)', `${berechnung.pauseMinuten} Min.`);
    }
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
function sortiereNach(spalte) {
    if (sortSpalte === spalte) {
        sortRichtung *= -1;
    } else {
        sortSpalte = spalte;
        sortRichtung = 1;
    }
    renderTabelle();
}

function renderTabelle() {
    const filterM = filterMonat.value;
    const filterO = filterObjekt.value;

    let gefiltert = einsaetze;
    if (filterM) gefiltert = gefiltert.filter(e => e.datum.substring(0, 7) === filterM);
    if (filterO) gefiltert = gefiltert.filter(e => e.objekt === filterO);

    // Suchfilter
    const suchfeld = document.getElementById('suchfeld');
    const suche = suchfeld ? suchfeld.value.toLowerCase().trim() : '';
    if (suche) {
        gefiltert = gefiltert.filter(e =>
            e.objekt.toLowerCase().includes(suche) ||
            (e.mitarbeiter || '').toLowerCase().includes(suche) ||
            formatDatum(e.datum).includes(suche) ||
            (e.bemerkung || '').toLowerCase().includes(suche)
        );
    }

    // Sortierung
    gefiltert.sort((a, b) => {
        let cmp = 0;
        switch (sortSpalte) {
            case 'datum': cmp = a.datum.localeCompare(b.datum) || a.zeitVon.localeCompare(b.zeitVon); break;
            case 'objekt': cmp = a.objekt.localeCompare(b.objekt); break;
            case 'mitarbeiter': cmp = (a.mitarbeiter || '').localeCompare(b.mitarbeiter || ''); break;
            case 'stunden': cmp = a.stunden - b.stunden; break;
            case 'gesamt': cmp = a.gesamt - b.gesamt; break;
            default: cmp = a.datum.localeCompare(b.datum);
        }
        return cmp * sortRichtung;
    });

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
            <td>${formatDatum(e.datum)}${e.status && e.status !== 'geplant' ? '<br><span class="status-badge status-' + e.status + '">' + escapeHtml(STATUS_LABELS[e.status] || e.status) + '</span>' : ''}</td>
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
                <button class="btn-secondary btn-small" onclick="dupliziereEinsatz(${e.id})">Dupl.</button>
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

    // Wochentag-Header (KW + Mo-So)
    const kwHeader = document.createElement('div');
    kwHeader.className = 'kalender-header-cell kw-header';
    kwHeader.textContent = 'KW';
    grid.appendChild(kwHeader);

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

    // KW-Zelle für erste Zeile
    const kw1Datum = new Date(kalenderJahr, kalenderMonat, 1);
    const kwCell1 = document.createElement('div');
    kwCell1.className = 'kalender-kw-cell';
    kwCell1.textContent = 'KW ' + getKalenderWoche(kw1Datum);
    grid.appendChild(kwCell1);

    // Leere Zellen vor dem 1.
    for (let i = 0; i < startWochentag; i++) {
        const cell = document.createElement('div');
        cell.className = 'kalender-cell empty';
        grid.appendChild(cell);
    }

    let posInWoche = startWochentag;

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

        // Abwesenheiten anzeigen
        const tagesAbwesende = verfuegbarkeit.filter(v => v.von <= datumStr && v.bis >= datumStr);
        if (tagesAbwesende.length > 0) {
            const typLabels = { urlaub: 'U', krank: 'K', frei: 'F', fortbildung: 'FB' };
            tagesAbwesende.forEach(v => {
                const cls = v.typ === 'krank' ? 'verf-krank' : v.typ === 'urlaub' ? 'verf-urlaub' : 'verf-frei';
                inhalt += `<div class="kalender-abwesend ${cls}" title="${escapeHtml(v.mitarbeiter)}: ${v.typ}">${typLabels[v.typ]} ${escapeHtml(v.mitarbeiter.split(' ')[0])}</div>`;
            });
        }

        // Vorfälle anzeigen
        const tagesVorfaelle = vorfaelle.filter(v => v.datum === datumStr);
        if (tagesVorfaelle.length > 0) {
            inhalt += `<div class="kalender-vorfall-badge" title="${tagesVorfaelle.length} Vorfall/Vorfälle">${tagesVorfaelle.length} Vorfall${tagesVorfaelle.length > 1 ? 'e' : ''}</div>`;
        }

        // Stunden-Summe
        if (tagesEinsaetze.length > 0) {
            const tagesStunden = tagesEinsaetze.reduce((s, e) => s + e.stunden, 0);
            inhalt += `<div class="kalender-summe">${formatZahl(tagesStunden)} Std.</div>`;
        }

        cell.innerHTML = inhalt;

        // Klick auf Zelle öffnet Tagesdetail
        cell.style.cursor = 'pointer';
        cell.addEventListener('click', (ev) => {
            // Nicht öffnen wenn auf einen Einsatz geklickt wurde (der hat eigenen onclick)
            if (ev.target.closest('.kalender-einsatz')) return;
            zeigeTagesDetail(datumStr);
        });

        grid.appendChild(cell);
        posInWoche++;

        // Neue Zeile: KW-Zelle einfügen
        if (posInWoche === 7 && tag < tageImMonat) {
            posInWoche = 0;
            const nextDate = new Date(kalenderJahr, kalenderMonat, tag + 1);
            const kwCell = document.createElement('div');
            kwCell.className = 'kalender-kw-cell';
            kwCell.textContent = 'KW ' + getKalenderWoche(nextDate);
            grid.appendChild(kwCell);
        }
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

    // Monatsvergleich
    renderMonatsVergleich(filterM);
}

function renderMonatsVergleich(aktuellerMonat) {
    const el = document.getElementById('monatsVergleich');
    if (!el) return;

    // Sammle alle Monate
    const monatsDaten = {};
    einsaetze.forEach(e => {
        const m = e.datum.substring(0, 7);
        if (!monatsDaten[m]) monatsDaten[m] = { stunden: 0, umsatz: 0, einsaetze: 0, zuschlaege: 0 };
        monatsDaten[m].stunden += e.stunden;
        monatsDaten[m].umsatz += e.gesamt;
        monatsDaten[m].einsaetze++;
        monatsDaten[m].zuschlaege += e.zuschlagBetrag;
    });

    const monateKeys = Object.keys(monatsDaten).sort().reverse().slice(0, 6).reverse();

    if (monateKeys.length < 2) {
        el.innerHTML = '<p style="color:#a0aec0">Mindestens 2 Monate Daten nötig für den Vergleich.</p>';
        return;
    }

    const maxUmsatz = Math.max(...monateKeys.map(k => monatsDaten[k].umsatz), 1);

    let html = '<div class="monatsvergleich-grid">';
    monateKeys.forEach((key, i) => {
        const d = monatsDaten[key];
        const [j, m] = key.split('-');
        const label = `${MONATSNAMEN[parseInt(m) - 1].substring(0, 3)} ${j.substring(2)}`;
        const pct = (d.umsatz / maxUmsatz) * 100;
        const istAktuell = key === aktuellerMonat;

        // Trend-Pfeil zum Vormonat
        let trend = '';
        if (i > 0) {
            const prev = monatsDaten[monateKeys[i - 1]];
            const diff = d.umsatz - prev.umsatz;
            if (diff > 0) trend = `<span class="trend-up">+${formatEuro(diff)}</span>`;
            else if (diff < 0) trend = `<span class="trend-down">${formatEuro(diff)}</span>`;
            else trend = '<span class="trend-equal">=</span>';
        }

        html += `<div class="mv-spalte ${istAktuell ? 'mv-aktuell' : ''}">
            <div class="mv-werte">
                <div class="mv-umsatz">${formatEuro(d.umsatz)}</div>
                <div class="mv-detail">${d.einsaetze} Eins. / ${formatZahl(d.stunden)} Std.</div>
                ${trend}
            </div>
            <div class="mv-bar-container">
                <div class="mv-bar" style="height:${pct}%"></div>
            </div>
            <div class="mv-label">${label}</div>
        </div>`;
    });
    html += '</div>';

    el.innerHTML = html;

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
    mitarbeiterListe_.forEach(m => alleMa.add(m.name));
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
// SCHICHT DUPLIZIEREN
// =============================================
function dupliziereEinsatz(id) {
    const orig = einsaetze.find(e => e.id === id);
    if (!orig) return;

    // Zum Erfassungs-Tab wechseln mit vorausgefüllten Daten
    wechsleZuTab('erfassung');

    document.getElementById('objekt').value = orig.objekt;
    document.getElementById('zeitVon').value = orig.zeitVon;
    document.getElementById('zeitBis').value = orig.zeitBis;
    document.getElementById('stundensatz').value = orig.stundensatz;
    document.getElementById('mitarbeiter').value = orig.mitarbeiter || '';
    document.getElementById('bemerkung').value = orig.bemerkung || '';

    // Datum auf nächsten Tag setzen
    const naechsterTag = new Date(orig.datum);
    naechsterTag.setDate(naechsterTag.getDate() + 1);
    document.getElementById('datum').value = naechsterTag.toISOString().split('T')[0];

    document.getElementById('einsatzFormSection').scrollIntoView({ behavior: 'smooth' });
    updatePreview();
}

// =============================================
// ARBZG-PRÜFUNG
// =============================================
function pruefeArbZG() {
    const section = document.getElementById('arbzgSection');
    const content = document.getElementById('arbzgContent');
    section.style.display = 'block';

    if (einsaetze.length === 0) {
        content.innerHTML = '<p class="arbzg-ok">Keine Einsätze vorhanden.</p>';
        return;
    }

    const warnungen = [];

    // Gruppiere nach Mitarbeiter
    const maMap = {};
    einsaetze.forEach(e => {
        const name = e.mitarbeiter || 'Nicht zugewiesen';
        if (!maMap[name]) maMap[name] = [];
        maMap[name].push(e);
    });

    Object.entries(maMap).forEach(([name, liste]) => {
        liste.sort((a, b) => a.datum.localeCompare(b.datum) || a.zeitVon.localeCompare(b.zeitVon));

        // Prüfung 1: Max 10 Stunden pro Tag (§3 ArbZG)
        const tagesMap = {};
        liste.forEach(e => {
            if (!tagesMap[e.datum]) tagesMap[e.datum] = 0;
            tagesMap[e.datum] += e.stunden;
        });

        Object.entries(tagesMap).forEach(([datum, stunden]) => {
            if (stunden > 10) {
                warnungen.push({
                    typ: 'fehler',
                    ma: name,
                    text: `${formatDatum(datum)}: ${formatZahl(stunden)} Stunden (max. 10 Std. nach §3 ArbZG)`
                });
            } else if (stunden > 8) {
                warnungen.push({
                    typ: 'warnung',
                    ma: name,
                    text: `${formatDatum(datum)}: ${formatZahl(stunden)} Stunden (über 8 Std., max. 10 Std. Ausnahme)`
                });
            }
        });

        // Prüfung 2: Ruhezeit min. 11 Stunden (§5 ArbZG)
        for (let i = 1; i < liste.length; i++) {
            const vorher = liste[i - 1];
            const jetzt = liste[i];

            // Ende vorheriger Schicht
            const endeVorher = schichtEndeTimestamp(vorher.datum, vorher.zeitVon, vorher.zeitBis);
            // Beginn aktuelle Schicht
            const startJetzt = new Date(jetzt.datum + 'T' + jetzt.zeitVon);

            const ruhezeitStd = (startJetzt - endeVorher) / (1000 * 60 * 60);

            if (ruhezeitStd >= 0 && ruhezeitStd < 11) {
                warnungen.push({
                    typ: 'fehler',
                    ma: name,
                    text: `${formatDatum(vorher.datum)} → ${formatDatum(jetzt.datum)}: Nur ${formatZahl(ruhezeitStd)} Std. Ruhezeit (min. 11 Std. nach §5 ArbZG)`
                });
            }
        }

        // Prüfung 3: Max 48 Stunden pro Woche im Durchschnitt (§3 ArbZG)
        const wochen = {};
        liste.forEach(e => {
            const d = new Date(e.datum);
            const kw = getKalenderWoche(d);
            const key = `${d.getFullYear()}-KW${kw}`;
            if (!wochen[key]) wochen[key] = 0;
            wochen[key] += e.stunden;
        });

        Object.entries(wochen).forEach(([kw, stunden]) => {
            if (stunden > 48) {
                warnungen.push({
                    typ: 'fehler',
                    ma: name,
                    text: `${kw}: ${formatZahl(stunden)} Wochenstunden (max. 48 Std. nach §3 ArbZG)`
                });
            } else if (stunden > 40) {
                warnungen.push({
                    typ: 'warnung',
                    ma: name,
                    text: `${kw}: ${formatZahl(stunden)} Wochenstunden (über 40 Std.)`
                });
            }
        });
    });

    if (warnungen.length === 0) {
        content.innerHTML = '<div class="arbzg-ok">Keine Verstöße gefunden. Alle Einsätze entsprechen dem Arbeitszeitgesetz.</div>';
    } else {
        // Sortiere: Fehler zuerst
        warnungen.sort((a, b) => (a.typ === 'fehler' ? 0 : 1) - (b.typ === 'fehler' ? 0 : 1));

        let html = `<div class="arbzg-zusammenfassung">
            <span class="arbzg-count fehler">${warnungen.filter(w => w.typ === 'fehler').length} Verstöße</span>
            <span class="arbzg-count warnung">${warnungen.filter(w => w.typ === 'warnung').length} Warnungen</span>
        </div>`;

        warnungen.forEach(w => {
            html += `<div class="arbzg-item ${w.typ}">
                <span class="arbzg-badge ${w.typ}">${w.typ === 'fehler' ? 'VERSTOSS' : 'WARNUNG'}</span>
                <strong>${escapeHtml(w.ma)}</strong>: ${escapeHtml(w.text)}
            </div>`;
        });
        content.innerHTML = html;
    }

    section.scrollIntoView({ behavior: 'smooth' });
}

function schichtEndeTimestamp(datum, zeitVon, zeitBis) {
    const [vh, vm] = zeitVon.split(':').map(Number);
    const [bh, bm] = zeitBis.split(':').map(Number);
    const startMin = vh * 60 + vm;
    const endMin = bh * 60 + bm;

    const ende = new Date(datum + 'T' + zeitBis);
    if (endMin <= startMin) {
        ende.setDate(ende.getDate() + 1);
    }
    return ende;
}

function getKalenderWoche(d) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
}

// =============================================
// MITARBEITER-VERWALTUNG
// =============================================
document.getElementById('mitarbeiterForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const vorname = document.getElementById('maVorname').value.trim();
    const nachname = document.getElementById('maNachname').value.trim();
    const telefon = document.getElementById('maTelefon').value.trim();
    const email = document.getElementById('maEmail').value.trim();
    const qualifikation = document.getElementById('maQualifikation').value;
    const stundensatz = parseFloat(document.getElementById('maStundensatz').value) || 0;
    const qualAblauf = document.getElementById('maQualAblauf').value;
    const bemerkung = document.getElementById('maBemerkung').value.trim();

    if (!vorname || !nachname) return;

    const vollname = `${vorname} ${nachname}`;
    const idx = mitarbeiterListe_.findIndex(m => m.name === vollname);
    const ma = { name: vollname, vorname, nachname, telefon, email, qualifikation, stundensatz, qualAblauf, bemerkung };

    if (idx !== -1) mitarbeiterListe_[idx] = ma; else mitarbeiterListe_.push(ma);

    localStorage.setItem('bbprotect_mitarbeiter', JSON.stringify(mitarbeiterListe_));
    renderMitarbeiter();
    updateDataLists();
    this.reset();
});

const QUAL_LABELS = {
    '34a': 'Sachkunde §34a',
    'fachkraft': 'Fachkraft Schutz & Sicherheit',
    'meister': 'Meister Schutz & Sicherheit',
    'unterrichtung': 'Unterrichtung §34a',
    'sonstige': 'Sonstige'
};

function renderMitarbeiter() {
    const body = document.getElementById('mitarbeiterBody');
    const empty = document.getElementById('mitarbeiterEmpty');
    body.innerHTML = '';

    if (mitarbeiterListe_.length === 0) { empty.style.display = 'block'; return; }
    empty.style.display = 'none';

    mitarbeiterListe_.forEach((m, i) => {
        // Einsatz-Statistik
        const maEinsaetze = einsaetze.filter(e => e.mitarbeiter === m.name);
        const totalStd = maEinsaetze.reduce((s, e) => s + e.stunden, 0);

        // Qualifikation-Ablauf prüfen
        let qualStatus = '';
        if (m.qualAblauf) {
            const heute = new Date().toISOString().split('T')[0];
            const in30Tagen = new Date();
            in30Tagen.setDate(in30Tagen.getDate() + 30);
            const in30 = in30Tagen.toISOString().split('T')[0];

            if (m.qualAblauf < heute) {
                qualStatus = '<span class="qual-ablauf abgelaufen">ABGELAUFEN ' + formatDatum(m.qualAblauf) + '</span>';
            } else if (m.qualAblauf <= in30) {
                qualStatus = '<span class="qual-ablauf bald">Läuft ab ' + formatDatum(m.qualAblauf) + '</span>';
            } else {
                qualStatus = '<small style="color:#718096">bis ' + formatDatum(m.qualAblauf) + '</small>';
            }
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${escapeHtml(m.name)}</strong><br><small>${maEinsaetze.length} Einsätze / ${formatZahl(totalStd)} Std.</small></td>
            <td>${escapeHtml(m.telefon || '\u2014')}</td>
            <td>${escapeHtml(m.email || '\u2014')}</td>
            <td><span class="qual-badge">${escapeHtml(QUAL_LABELS[m.qualifikation] || m.qualifikation)}</span>${qualStatus ? '<br>' + qualStatus : ''}</td>
            <td>${m.stundensatz ? formatEuro(m.stundensatz) + '/Std.' : '\u2014'}</td>
            <td>${escapeHtml(m.bemerkung || '\u2014')}</td>
            <td><button class="btn-delete" onclick="loescheMitarbeiter(${i})">X</button></td>
        `;
        body.appendChild(tr);
    });
}

function loescheMitarbeiter(index) {
    if (!confirm('Diesen Mitarbeiter wirklich löschen?')) return;
    mitarbeiterListe_.splice(index, 1);
    localStorage.setItem('bbprotect_mitarbeiter', JSON.stringify(mitarbeiterListe_));
    renderMitarbeiter();
    updateDataLists();
}

// =============================================
// DATENSICHERUNG (BACKUP / RESTORE)
// =============================================
function erstelleBackup() {
    const backup = {
        version: 4,
        datum: new Date().toISOString(),
        einsaetze,
        objekte,
        vorlagen,
        mitarbeiter: mitarbeiterListe_,
        verfuegbarkeit,
        vorfaelle
    };

    const json = JSON.stringify(backup, null, 2);
    const datum = new Date().toISOString().split('T')[0];
    downloadFile(`BBProtect_Backup_${datum}.json`, json, 'application/json');
}

function stelleWiederHer(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = JSON.parse(e.target.result);

            if (!data.einsaetze || !Array.isArray(data.einsaetze)) {
                alert('Ungültige Backup-Datei: Keine Einsätze gefunden.');
                return;
            }

            const anzahl = data.einsaetze.length + (data.objekte || []).length + (data.mitarbeiter || []).length;
            if (!confirm(`Backup vom ${data.datum || 'unbekannt'} wiederherstellen?\n\n${data.einsaetze.length} Einsätze, ${(data.objekte || []).length} Objekte, ${(data.mitarbeiter || []).length} Mitarbeiter, ${(data.vorlagen || []).length} Vorlagen\n\nAlle aktuellen Daten werden überschrieben!`)) return;

            einsaetze = data.einsaetze;
            objekte = data.objekte || [];
            vorlagen = data.vorlagen || [];
            mitarbeiterListe_ = data.mitarbeiter || [];
            verfuegbarkeit = data.verfuegbarkeit || [];
            vorfaelle = data.vorfaelle || [];

            speichern();
            localStorage.setItem('bbprotect_objekte', JSON.stringify(objekte));
            localStorage.setItem('bbprotect_vorlagen', JSON.stringify(vorlagen));
            localStorage.setItem('bbprotect_mitarbeiter', JSON.stringify(mitarbeiterListe_));
            localStorage.setItem('bbprotect_verfuegbarkeit', JSON.stringify(verfuegbarkeit));
            localStorage.setItem('bbprotect_vorfaelle', JSON.stringify(vorfaelle));

            renderTabelle();
            updateAlleFilter();
            updateDataLists();
            renderObjekte();
            renderVorlagen();
            renderMitarbeiter();
            updateDatenStats();

            alert('Backup erfolgreich wiederhergestellt!');
        } catch (err) {
            alert('Fehler beim Lesen der Datei: ' + err.message);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function loescheAlleDaten() {
    if (!confirm('ACHTUNG: Alle Daten werden unwiderruflich gelöscht!\n\nEinsätze, Objekte, Mitarbeiter und Vorlagen.\n\nFortfahren?')) return;
    if (!confirm('Wirklich ALLE Daten löschen? Dies kann nicht rückgängig gemacht werden!')) return;

    einsaetze = [];
    objekte = [];
    vorlagen = [];
    mitarbeiterListe_ = [];
    verfuegbarkeit = [];
    vorfaelle = [];

    localStorage.removeItem('bbprotect_einsaetze');
    localStorage.removeItem('bbprotect_objekte');
    localStorage.removeItem('bbprotect_vorlagen');
    localStorage.removeItem('bbprotect_mitarbeiter');
    localStorage.removeItem('bbprotect_verfuegbarkeit');
    localStorage.removeItem('bbprotect_vorfaelle');

    renderTabelle();
    updateAlleFilter();
    updateDataLists();
    renderObjekte();
    renderVorlagen();
    renderMitarbeiter();
    updateDatenStats();
}

function updateDatenStats() {
    const el = document.getElementById('datenStats');
    if (!el) return;

    const totalStd = einsaetze.reduce((s, e) => s + e.stunden, 0);
    const totalGesamt = einsaetze.reduce((s, e) => s + e.gesamt, 0);

    el.innerHTML = `
        <div class="daten-stats-grid">
            <div class="daten-stat"><strong>${einsaetze.length}</strong><span>Einsätze</span></div>
            <div class="daten-stat"><strong>${objekte.length}</strong><span>Objekte</span></div>
            <div class="daten-stat"><strong>${mitarbeiterListe_.length}</strong><span>Mitarbeiter</span></div>
            <div class="daten-stat"><strong>${vorlagen.length}</strong><span>Vorlagen</span></div>
            <div class="daten-stat"><strong>${vorfaelle.length}</strong><span>Vorfälle</span></div>
            <div class="daten-stat"><strong>${formatZahl(totalStd)}</strong><span>Stunden gesamt</span></div>
            <div class="daten-stat"><strong>${formatEuro(totalGesamt)}</strong><span>Umsatz gesamt</span></div>
        </div>
    `;
}

// =============================================
// HEADER-SCHNELLSTATISTIK
// =============================================
function updateHeaderStats() {
    const el = document.getElementById('headerStats');
    if (!el) return;

    const heute = new Date().toISOString().split('T')[0];
    const heuteEinsaetze = einsaetze.filter(e => e.datum === heute);
    const heuteStd = heuteEinsaetze.reduce((s, e) => s + e.stunden, 0);

    // Diese Woche (Mo-So)
    const now = new Date();
    const montag = new Date(now);
    const tag = montag.getDay();
    const diff = tag === 0 ? 6 : tag - 1;
    montag.setDate(montag.getDate() - diff);
    montag.setHours(0, 0, 0, 0);
    const sonntag = new Date(montag);
    sonntag.setDate(sonntag.getDate() + 6);

    const montagStr = montag.toISOString().split('T')[0];
    const sonntagStr = sonntag.toISOString().split('T')[0];
    const wocheEinsaetze = einsaetze.filter(e => e.datum >= montagStr && e.datum <= sonntagStr);
    const wocheStd = wocheEinsaetze.reduce((s, e) => s + e.stunden, 0);
    const wocheUmsatz = wocheEinsaetze.reduce((s, e) => s + e.gesamt, 0);

    // Abwesende heute
    const heuteAbwesend = verfuegbarkeit.filter(v => v.von <= heute && v.bis >= heute);

    el.innerHTML = `
        <span class="hs-item">Heute: <strong>${heuteEinsaetze.length}</strong> Einsätze / <strong>${formatZahl(heuteStd)}</strong> Std.</span>
        <span class="hs-divider">|</span>
        <span class="hs-item">Woche: <strong>${wocheEinsaetze.length}</strong> Einsätze / <strong>${formatZahl(wocheStd)}</strong> Std. / <strong>${formatEuro(wocheUmsatz)}</strong></span>
        ${heuteAbwesend.length > 0 ? '<span class="hs-divider">|</span><span class="hs-item hs-warn">Abwesend: <strong>' + heuteAbwesend.map(v => escapeHtml(v.mitarbeiter)).join(', ') + '</strong></span>' : ''}
    `;
}

// =============================================
// VERFÜGBARKEIT (URLAUB/KRANK)
// =============================================
function verfuegbarkeitSpeichern() {
    const ma = document.getElementById('verfMa').value;
    const typ = document.getElementById('verfTyp').value;
    const von = document.getElementById('verfVon').value;
    const bis = document.getElementById('verfBis').value;
    const notiz = document.getElementById('verfNotiz').value.trim();

    if (!ma || !von || !bis) { alert('Bitte Mitarbeiter, Von und Bis ausfüllen.'); return; }
    if (bis < von) { alert('Bis-Datum muss nach Von-Datum liegen.'); return; }

    verfuegbarkeit.push({ id: Date.now(), mitarbeiter: ma, typ, von, bis, notiz });
    localStorage.setItem('bbprotect_verfuegbarkeit', JSON.stringify(verfuegbarkeit));
    renderVerfuegbarkeit();
    updateHeaderStats();

    document.getElementById('verfNotiz').value = '';
}

function loescheVerfuegbarkeit(id) {
    verfuegbarkeit = verfuegbarkeit.filter(v => v.id !== id);
    localStorage.setItem('bbprotect_verfuegbarkeit', JSON.stringify(verfuegbarkeit));
    renderVerfuegbarkeit();
    updateHeaderStats();
}

function renderVerfuegbarkeit() {
    const body = document.getElementById('verfBody');
    const empty = document.getElementById('verfEmpty');
    if (!body) return;

    body.innerHTML = '';
    const aktive = verfuegbarkeit.filter(v => v.bis >= new Date().toISOString().split('T')[0]);
    aktive.sort((a, b) => a.von.localeCompare(b.von));

    if (aktive.length === 0) { empty.style.display = 'block'; return; }
    empty.style.display = 'none';

    const typLabels = { urlaub: 'Urlaub', krank: 'Krank', frei: 'Frei', fortbildung: 'Fortbildung' };

    aktive.forEach(v => {
        const tr = document.createElement('tr');
        const typCls = v.typ === 'krank' ? 'verf-krank' : v.typ === 'urlaub' ? 'verf-urlaub' : 'verf-frei';
        tr.innerHTML = `
            <td>${escapeHtml(v.mitarbeiter)}</td>
            <td><span class="verf-badge ${typCls}">${escapeHtml(typLabels[v.typ] || v.typ)}</span></td>
            <td>${formatDatum(v.von)}</td>
            <td>${formatDatum(v.bis)}</td>
            <td>${escapeHtml(v.notiz || '\u2014')}</td>
            <td><button class="btn-delete" onclick="loescheVerfuegbarkeit(${v.id})">X</button></td>
        `;
        body.appendChild(tr);
    });
}

// =============================================
// KONFLIKTERKENNUNG
// =============================================
function pruefeKonflikt(neuerEinsatz, editId) {
    if (!neuerEinsatz.mitarbeiter) return null;

    // Verfügbarkeit prüfen
    const abwesend = verfuegbarkeit.find(v =>
        v.mitarbeiter === neuerEinsatz.mitarbeiter &&
        v.von <= neuerEinsatz.datum && v.bis >= neuerEinsatz.datum
    );
    if (abwesend) {
        const typLabels = { urlaub: 'Urlaub', krank: 'Krank', frei: 'Frei', fortbildung: 'Fortbildung' };
        return `ABWESEND: ${neuerEinsatz.mitarbeiter} ist am ${formatDatum(neuerEinsatz.datum)} als "${typLabels[abwesend.typ] || abwesend.typ}" eingetragen.`;
    }

    const [nvh, nvm] = neuerEinsatz.zeitVon.split(':').map(Number);
    const [nbh, nbm] = neuerEinsatz.zeitBis.split(':').map(Number);
    let nStart = nvh * 60 + nvm;
    let nEnd = nbh * 60 + nbm;
    if (nEnd <= nStart) nEnd += 24 * 60;

    for (const e of einsaetze) {
        if (editId && e.id === editId) continue;
        if (e.mitarbeiter !== neuerEinsatz.mitarbeiter) continue;
        if (e.datum !== neuerEinsatz.datum) continue;

        const [evh, evm] = e.zeitVon.split(':').map(Number);
        const [ebh, ebm] = e.zeitBis.split(':').map(Number);
        let eStart = evh * 60 + evm;
        let eEnd = ebh * 60 + ebm;
        if (eEnd <= eStart) eEnd += 24 * 60;

        if (nStart < eEnd && nEnd > eStart) {
            return `KONFLIKT: ${neuerEinsatz.mitarbeiter} hat am ${formatDatum(neuerEinsatz.datum)} bereits einen Einsatz (${e.zeitVon}-${e.zeitBis} bei ${e.objekt}).`;
        }
    }
    return null;
}

// =============================================
// WOCHENWIEDERHOLUNG
// =============================================
function wiederholungWoche() {
    const objekt = document.getElementById('objekt').value.trim();
    const zeitVon = document.getElementById('zeitVon').value;
    const zeitBis = document.getElementById('zeitBis').value;
    const stundensatz = parseFloat(document.getElementById('stundensatz').value);
    const mitarbeiter = document.getElementById('mitarbeiter').value.trim();
    const bemerkung = document.getElementById('bemerkung').value.trim();
    const startDatum = document.getElementById('datum').value;

    if (!objekt || !startDatum || !zeitVon || !zeitBis || isNaN(stundensatz)) {
        alert('Bitte zuerst alle Pflichtfelder ausfüllen.');
        return;
    }

    const tageCbs = document.querySelectorAll('.wdh-tag:checked');
    if (tageCbs.length === 0) {
        alert('Bitte mindestens einen Wochentag auswählen.');
        return;
    }

    const wochen = parseInt(document.getElementById('wdhWochen').value) || 1;
    const tage = Array.from(tageCbs).map(cb => parseInt(cb.value));

    let count = 0;
    const start = new Date(startDatum);

    for (let w = 0; w < wochen; w++) {
        for (const tag of tage) {
            const d = new Date(start);
            // Finde den nächsten passenden Wochentag
            const aktuellerTag = d.getDay();
            let diff = tag - aktuellerTag;
            if (diff < 0) diff += 7;
            d.setDate(d.getDate() + diff + (w * 7));

            const datumStr = d.toISOString().split('T')[0];
            const berechnung = berechneEinsatz(datumStr, zeitVon, zeitBis, stundensatz);

            const einsatz = {
                id: Date.now() + count,
                objekt, datum: datumStr, zeitVon, zeitBis, stundensatz, mitarbeiter, bemerkung,
                ...berechnung
            };

            // Nur hinzufügen wenn kein Konflikt
            const konflikt = pruefeKonflikt(einsatz, null);
            if (!konflikt) {
                einsaetze.push(einsatz);
                count++;
            }
        }
    }

    if (count > 0) {
        speichern();
        renderTabelle();
        updateAlleFilter();
        updateDataLists();
        alert(`${count} Einsätze für ${wochen} Woche(n) erstellt.`);
    } else {
        alert('Keine Einsätze erstellt (alle Termine haben Konflikte).');
    }
}

// =============================================
// DARK MODE
// =============================================
let darkMode = localStorage.getItem('bbprotect_darkmode') === 'true';

function toggleDarkMode() {
    darkMode = !darkMode;
    document.body.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('bbprotect_darkmode', darkMode);
    const btn = document.getElementById('darkModeBtn');
    if (btn) btn.textContent = darkMode ? 'Hell' : 'Dunkel';
}

function initDarkMode() {
    if (darkMode) document.body.classList.add('dark-mode');
    const btn = document.getElementById('darkModeBtn');
    if (btn) btn.textContent = darkMode ? 'Hell' : 'Dunkel';
}

// =============================================
// HILFSFUNKTION: TAB WECHSELN
// =============================================
function wechsleZuTab(tabName) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    const btn = document.querySelector(`[data-tab="${tabName}"]`);
    if (btn) btn.classList.add('active');
    const tab = document.getElementById('tab-' + tabName);
    if (tab) tab.classList.add('active');
}

// =============================================
// VORFALLSBERICHT
// =============================================
const VORFALL_TYPEN = {
    diebstahl: 'Diebstahl / Ladendiebstahl',
    hausfrieden: 'Hausfriedensbruch',
    vandalismus: 'Vandalismus / Sachbeschädigung',
    koerperverletzung: 'Körperverletzung',
    brand: 'Brand / Brandgefahr',
    technisch: 'Technische Störung',
    verdacht: 'Verdächtiges Verhalten',
    unfall: 'Unfall / Verletzung',
    hausordnung: 'Hausordnungsverstoß',
    sonstiges: 'Sonstiges'
};

const SCHWERE_LABELS = {
    gering: 'Gering',
    mittel: 'Mittel',
    hoch: 'Hoch',
    kritisch: 'Kritisch'
};

document.getElementById('vorfallForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const vorfall = {
        id: Date.now(),
        datum: document.getElementById('vfDatum').value,
        zeit: document.getElementById('vfZeit').value,
        objekt: document.getElementById('vfObjekt').value.trim(),
        mitarbeiter: document.getElementById('vfMitarbeiter').value.trim(),
        typ: document.getElementById('vfTyp').value,
        schwere: document.getElementById('vfSchwere').value,
        beschreibung: document.getElementById('vfBeschreibung').value.trim(),
        massnahmen: document.getElementById('vfMassnahmen').value.trim(),
        polizei: document.getElementById('vfPolizei').checked,
        aktenzeichen: document.getElementById('vfAktenzeichen').value.trim()
    };

    if (!vorfall.datum || !vorfall.zeit || !vorfall.objekt || !vorfall.beschreibung) return;

    vorfaelle.push(vorfall);
    localStorage.setItem('bbprotect_vorfaelle', JSON.stringify(vorfaelle));
    renderVorfaelle();
    this.reset();
    document.getElementById('vfDatum').valueAsDate = new Date();
});

function renderVorfaelle() {
    const content = document.getElementById('vorfaelleContent');
    const empty = document.getElementById('vorfaelleEmpty');
    if (!content) return;

    // Filter aktualisieren
    const filterSelect = document.getElementById('vfFilterMonat');
    const monate = new Set();
    vorfaelle.forEach(v => monate.add(v.datum.substring(0, 7)));
    fillMonatsSelect(filterSelect, monate);

    const filterM = filterSelect.value;
    let gefiltert = vorfaelle;
    if (filterM) gefiltert = gefiltert.filter(v => v.datum.substring(0, 7) === filterM);

    if (gefiltert.length === 0) {
        content.innerHTML = '';
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';

    // Sortiere nach Datum absteigend
    gefiltert.sort((a, b) => b.datum.localeCompare(a.datum) || b.zeit.localeCompare(a.zeit));

    let html = '';
    gefiltert.forEach(v => {
        const schwereCls = 'vf-schwere-' + v.schwere;
        html += `<div class="vorfall-card ${schwereCls}">
            <div class="vorfall-header">
                <div class="vorfall-meta">
                    <span class="vorfall-datum">${formatDatum(v.datum)} ${v.zeit} Uhr</span>
                    <span class="vorfall-objekt">${escapeHtml(v.objekt)}</span>
                </div>
                <div class="vorfall-badges">
                    <span class="vorfall-typ-badge">${escapeHtml(VORFALL_TYPEN[v.typ] || v.typ)}</span>
                    <span class="vorfall-schwere-badge ${schwereCls}">${escapeHtml(SCHWERE_LABELS[v.schwere] || v.schwere)}</span>
                </div>
            </div>
            <div class="vorfall-body">
                <p>${escapeHtml(v.beschreibung)}</p>
                ${v.massnahmen ? '<p class="vorfall-massnahmen"><strong>Maßnahmen:</strong> ' + escapeHtml(v.massnahmen) + '</p>' : ''}
            </div>
            <div class="vorfall-footer">
                <span>${v.mitarbeiter ? 'Melder: ' + escapeHtml(v.mitarbeiter) : ''}</span>
                <span>${v.polizei ? 'Polizei informiert' + (v.aktenzeichen ? ' (AZ: ' + escapeHtml(v.aktenzeichen) + ')' : '') : ''}</span>
                <button class="btn-delete btn-small" onclick="loescheVorfall(${v.id})">Löschen</button>
            </div>
        </div>`;
    });

    content.innerHTML = html;
}

function loescheVorfall(id) {
    if (!confirm('Diesen Vorfallsbericht wirklich löschen?')) return;
    vorfaelle = vorfaelle.filter(v => v.id !== id);
    localStorage.setItem('bbprotect_vorfaelle', JSON.stringify(vorfaelle));
    renderVorfaelle();
}

document.getElementById('vfFilterMonat').addEventListener('change', renderVorfaelle);

function exportVorfaelle() {
    const filterM = document.getElementById('vfFilterMonat').value;
    let gefiltert = vorfaelle;
    if (filterM) gefiltert = gefiltert.filter(v => v.datum.substring(0, 7) === filterM);

    if (gefiltert.length === 0) { alert('Keine Vorfälle zum Exportieren.'); return; }

    const header = 'Datum;Uhrzeit;Objekt;Typ;Schweregrad;Beschreibung;Maßnahmen;Melder;Polizei;Aktenzeichen';
    const rows = gefiltert.map(v => [
        formatDatum(v.datum), v.zeit, v.objekt, VORFALL_TYPEN[v.typ] || v.typ,
        SCHWERE_LABELS[v.schwere] || v.schwere, v.beschreibung, v.massnahmen || '',
        v.mitarbeiter || '', v.polizei ? 'Ja' : 'Nein', v.aktenzeichen || ''
    ].map(x => `"${x.replace(/"/g, '""')}"`).join(';'));

    downloadFile(`BBProtect_Vorfaelle_${filterM || 'Alle'}.csv`,
        '\uFEFF' + header + '\n' + rows.join('\n'), 'text/csv;charset=utf-8;');
}

function druckeVorfaelle() {
    const filterM = document.getElementById('vfFilterMonat').value;
    let gefiltert = vorfaelle;
    if (filterM) gefiltert = gefiltert.filter(v => v.datum.substring(0, 7) === filterM);

    if (gefiltert.length === 0) { alert('Keine Vorfälle zum Drucken.'); return; }

    gefiltert.sort((a, b) => b.datum.localeCompare(a.datum) || b.zeit.localeCompare(a.zeit));

    let zeitraum = 'Alle Vorfälle';
    if (filterM) {
        const [j, m] = filterM.split('-');
        zeitraum = `Vorfallsberichte ${MONATSNAMEN[parseInt(m) - 1]} ${j}`;
    }

    let html = printHeader(zeitraum) + `
        <table><thead><tr>
            <th>Datum/Zeit</th><th>Objekt</th><th>Typ</th><th>Schwere</th>
            <th>Beschreibung</th><th>Maßnahmen</th><th>Polizei</th>
        </tr></thead><tbody>`;

    gefiltert.forEach(v => {
        html += `<tr>
            <td>${formatDatum(v.datum)}<br>${v.zeit}</td>
            <td>${escapeHtml(v.objekt)}</td>
            <td>${escapeHtml(VORFALL_TYPEN[v.typ] || v.typ)}</td>
            <td>${escapeHtml(SCHWERE_LABELS[v.schwere] || v.schwere)}</td>
            <td>${escapeHtml(v.beschreibung)}</td>
            <td>${escapeHtml(v.massnahmen || '\u2014')}</td>
            <td>${v.polizei ? 'Ja' + (v.aktenzeichen ? '<br>AZ: ' + escapeHtml(v.aktenzeichen) : '') : 'Nein'}</td>
        </tr>`;
    });

    html += '</tbody></table>' + printFooter();
    document.getElementById('printArea').innerHTML = html;
    window.print();
}

// =============================================
// DIENSTPLAN-WOCHENANSICHT
// =============================================
function dienstplanNav(offset) {
    dienstplanKW += offset;
    if (dienstplanKW > 52) { dienstplanKW = 1; dienstplanJahr++; }
    if (dienstplanKW < 1) { dienstplanKW = 52; dienstplanJahr--; }
    renderDienstplan();
}

function getMontag(jahr, kw) {
    const jan4 = new Date(Date.UTC(jahr, 0, 4));
    const montag = new Date(jan4);
    montag.setUTCDate(jan4.getUTCDate() - (jan4.getUTCDay() || 7) + 1 + (kw - 1) * 7);
    return montag;
}

function renderDienstplan() {
    document.getElementById('dienstplanTitel').textContent = `KW ${dienstplanKW} / ${dienstplanJahr}`;

    const grid = document.getElementById('dienstplanGrid');
    grid.innerHTML = '';

    const montag = getMontag(dienstplanJahr, dienstplanKW);
    const tage = [];
    const tageLabels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

    for (let i = 0; i < 7; i++) {
        const d = new Date(montag);
        d.setUTCDate(d.getUTCDate() + i);
        tage.push(d.toISOString().split('T')[0]);
    }

    // Alle MA die in dieser Woche Einsätze haben oder in der MA-Liste stehen
    const alleMa = new Set();
    mitarbeiterListe_.forEach(m => alleMa.add(m.name));
    einsaetze.forEach(e => {
        if (e.mitarbeiter && tage.includes(e.datum)) alleMa.add(e.mitarbeiter);
    });

    const maList = Array.from(alleMa).sort();

    if (maList.length === 0) {
        grid.innerHTML = '<p style="color:#a0aec0;text-align:center;padding:1rem">Keine Mitarbeiter vorhanden.</p>';
        return;
    }

    // Header-Zeile
    let html = '<div class="dp-header dp-name">Mitarbeiter</div>';
    tage.forEach((datum, i) => {
        const d = new Date(datum);
        const heute = datum === new Date().toISOString().split('T')[0];
        html += `<div class="dp-header ${heute ? 'dp-heute' : ''}">${tageLabels[i]}<br><small>${d.getUTCDate()}.${d.getUTCMonth() + 1}.</small></div>`;
    });

    // MA-Zeilen
    maList.forEach(name => {
        html += `<div class="dp-name">${escapeHtml(name)}</div>`;
        tage.forEach(datum => {
            const tagesE = einsaetze.filter(e => e.mitarbeiter === name && e.datum === datum);
            const abwesend = verfuegbarkeit.find(v => v.mitarbeiter === name && v.von <= datum && v.bis >= datum);

            let cellContent = '';
            let cellClass = 'dp-cell';

            if (abwesend) {
                const typLabels = { urlaub: 'U', krank: 'K', frei: 'F', fortbildung: 'FB' };
                cellClass += ' dp-abwesend dp-abw-' + abwesend.typ;
                cellContent = `<span class="dp-abw-label">${typLabels[abwesend.typ] || '?'}</span>`;
            }

            tagesE.forEach(e => {
                const hatNacht = e.nachtStunden > 0;
                cellContent += `<div class="dp-einsatz ${hatNacht ? 'dp-nacht' : 'dp-tag'}">${e.zeitVon}-${e.zeitBis}</div>`;
            });

            if (!cellContent) cellClass += ' dp-leer';

            html += `<div class="${cellClass}">${cellContent}</div>`;
        });
    });

    grid.innerHTML = html;
}

// =============================================
// TAGES-DETAIL-MODAL
// =============================================
function zeigeTagesDetail(datumStr) {
    const modal = document.getElementById('tagesModal');
    const content = document.getElementById('tagesModalContent');
    const titel = document.getElementById('tagesModalTitel');

    const wochentage = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    const wochentag = wochentage[new Date(datumStr).getDay()];
    const feiertag = istFeiertag(datumStr);

    titel.textContent = `${wochentag}, ${formatDatum(datumStr)}`;

    const tagesE = einsaetze.filter(e => e.datum === datumStr);
    tagesE.sort((a, b) => a.zeitVon.localeCompare(b.zeitVon));

    const abwesende = verfuegbarkeit.filter(v => v.von <= datumStr && v.bis >= datumStr);
    const tagesV = vorfaelle.filter(v => v.datum === datumStr);

    let html = '';

    if (feiertag) {
        html += `<div class="modal-feiertag">Feiertag: ${escapeHtml(feiertag)}</div>`;
    }

    if (abwesende.length > 0) {
        html += '<div class="modal-abschnitt"><h3>Abwesend</h3>';
        const typLabels = { urlaub: 'Urlaub', krank: 'Krank', frei: 'Frei', fortbildung: 'Fortbildung' };
        abwesende.forEach(v => {
            const cls = v.typ === 'krank' ? 'verf-krank' : v.typ === 'urlaub' ? 'verf-urlaub' : 'verf-frei';
            html += `<span class="verf-badge ${cls}">${escapeHtml(v.mitarbeiter)}: ${typLabels[v.typ] || v.typ}</span> `;
        });
        html += '</div>';
    }

    if (tagesE.length === 0) {
        html += '<div class="modal-abschnitt"><p style="color:#a0aec0">Keine Einsätze an diesem Tag.</p></div>';
    } else {
        const totalStd = tagesE.reduce((s, e) => s + e.stunden, 0);
        const totalGesamt = tagesE.reduce((s, e) => s + e.gesamt, 0);

        html += `<div class="modal-abschnitt"><h3>Einsätze (${tagesE.length})</h3>
            <div class="modal-stats">
                <span><strong>${formatZahl(totalStd)}</strong> Stunden</span>
                <span><strong>${formatEuro(totalGesamt)}</strong> Umsatz</span>
            </div>
            <table class="abrechnung-table"><thead><tr>
                <th>Zeit</th><th>Objekt</th><th>MA</th><th>Std.</th><th>Gesamt</th><th></th>
            </tr></thead><tbody>`;

        tagesE.forEach(e => {
            html += `<tr>
                <td>${e.zeitVon}-${e.zeitBis}</td>
                <td>${escapeHtml(e.objekt)}</td>
                <td>${escapeHtml(e.mitarbeiter || '\u2014')}</td>
                <td>${formatZahl(e.stunden)}</td>
                <td>${formatEuro(e.gesamt)}</td>
                <td><button class="btn-edit btn-small" onclick="schliesseModal();bearbeiteEinsatz(${e.id})">Bearb.</button></td>
            </tr>`;
        });

        html += '</tbody></table></div>';
    }

    if (tagesV.length > 0) {
        html += '<div class="modal-abschnitt"><h3>Vorfälle (' + tagesV.length + ')</h3>';
        tagesV.forEach(v => {
            html += `<div class="modal-vorfall">
                <strong>${v.zeit} Uhr</strong> - ${escapeHtml(VORFALL_TYPEN[v.typ] || v.typ)} (${escapeHtml(v.objekt)})
                <p>${escapeHtml(v.beschreibung)}</p>
            </div>`;
        });
        html += '</div>';
    }

    // Button um neuen Einsatz an diesem Tag zu erstellen
    html += `<div class="modal-actions">
        <button class="btn-primary btn-small" onclick="schliesseModal();neuenEinsatzAnTag('${datumStr}')">+ Einsatz an diesem Tag</button>
    </div>`;

    content.innerHTML = html;
    modal.style.display = 'flex';
}

function schliesseModal() {
    document.getElementById('tagesModal').style.display = 'none';
}

function neuenEinsatzAnTag(datumStr) {
    wechsleZuTab('erfassung');
    document.getElementById('datum').value = datumStr;
    document.getElementById('einsatzFormSection').scrollIntoView({ behavior: 'smooth' });
    updatePreview();
}

// Modal schließen bei Klick auf Overlay
document.getElementById('tagesModal').addEventListener('click', function (e) {
    if (e.target === this) schliesseModal();
});

// =============================================
// OBJEKT-AUSLASTUNG
// =============================================
function renderObjektAuslastung() {
    const el = document.getElementById('objektAuslastung');
    if (!el) return;

    const filterM = document.getElementById('auslastungMonat').value;

    // Auslastungsfilter aktualisieren
    const monate = new Set();
    einsaetze.forEach(e => monate.add(e.datum.substring(0, 7)));
    fillMonatsSelect(document.getElementById('auslastungMonat'), monate);

    let gefiltert = einsaetze;
    if (filterM) gefiltert = gefiltert.filter(e => e.datum.substring(0, 7) === filterM);

    if (gefiltert.length === 0) {
        el.innerHTML = '<p style="color:#a0aec0">Keine Einsatzdaten vorhanden.</p>';
        return;
    }

    // Gruppiere nach Objekt
    const objektMap = {};
    gefiltert.forEach(e => {
        if (!objektMap[e.objekt]) objektMap[e.objekt] = { stunden: 0, umsatz: 0, einsaetze: 0, tage: new Set(), ma: new Set(), nacht: 0, zuschlaege: 0 };
        objektMap[e.objekt].stunden += e.stunden;
        objektMap[e.objekt].umsatz += e.gesamt;
        objektMap[e.objekt].einsaetze++;
        objektMap[e.objekt].tage.add(e.datum);
        if (e.mitarbeiter) objektMap[e.objekt].ma.add(e.mitarbeiter);
        objektMap[e.objekt].nacht += e.nachtStunden;
        objektMap[e.objekt].zuschlaege += e.zuschlagBetrag;
    });

    const maxStd = Math.max(...Object.values(objektMap).map(o => o.stunden), 1);

    let html = '';
    Object.entries(objektMap).sort((a, b) => b[1].stunden - a[1].stunden).forEach(([name, data]) => {
        const pct = (data.stunden / maxStd) * 100;
        const nachtPct = data.stunden > 0 ? ((data.nachtStunden / data.stunden) * 100).toFixed(0) : 0;
        const avgStdTag = data.tage.size > 0 ? (data.stunden / data.tage.size) : 0;

        html += `<div class="auslastung-card">
            <div class="auslastung-header">
                <strong>${escapeHtml(name)}</strong>
                <span class="auslastung-umsatz">${formatEuro(data.umsatz)}</span>
            </div>
            <div class="auslastung-bar-bg"><div class="auslastung-bar" style="width:${pct}%"></div></div>
            <div class="auslastung-details">
                <span>${formatZahl(data.stunden)} Std.</span>
                <span>${data.einsaetze} Einsätze</span>
                <span>${data.tage.size} Tage</span>
                <span>${data.ma.size} MA</span>
                <span>${formatZahl(avgStdTag)} Std./Tag</span>
                <span>${formatEuro(data.zuschlaege)} Zuschläge</span>
            </div>
        </div>`;
    });

    el.innerHTML = html;
}

// =============================================
// KOSTENRECHNER / KALKULATION
// =============================================
function berechneKalkulation() {
    const stunden = parseFloat(document.getElementById('kalkStunden').value) || 8;
    const satz = parseFloat(document.getElementById('kalkSatz').value) || 15;
    const tage = parseInt(document.getElementById('kalkTage').value) || 5;
    const wochen = parseInt(document.getElementById('kalkWochen').value) || 4;
    const ma = parseInt(document.getElementById('kalkMA').value) || 1;
    const nachtPct = parseFloat(document.getElementById('kalkNacht').value) || 0;

    const totalSchichten = tage * wochen * ma;
    const totalStunden = totalSchichten * stunden;
    const nachtStunden = totalStunden * (nachtPct / 100);
    const tagStunden = totalStunden - nachtStunden;

    const grundlohn = totalStunden * satz;
    const nachtZuschlag = nachtStunden * satz * (ZUSCHLAG_NACHT / 100);
    const gesamt = grundlohn + nachtZuschlag;

    const proWoche = gesamt / wochen;
    const proMonat = gesamt; // Wenn 4 Wochen
    const proTag = gesamt / (tage * wochen);

    const el = document.getElementById('kalkErgebnis');
    el.innerHTML = `<div class="kalk-ergebnis">
        <div class="kalk-grid">
            <div class="kalk-item"><span class="kalk-label">Schichten gesamt</span><span class="kalk-value">${totalSchichten}</span></div>
            <div class="kalk-item"><span class="kalk-label">Stunden gesamt</span><span class="kalk-value">${formatZahl(totalStunden)}</span></div>
            <div class="kalk-item"><span class="kalk-label">davon Nacht</span><span class="kalk-value">${formatZahl(nachtStunden)}</span></div>
            <div class="kalk-item"><span class="kalk-label">Grundlohn</span><span class="kalk-value">${formatEuro(grundlohn)}</span></div>
            <div class="kalk-item"><span class="kalk-label">Nachtzuschlag (${ZUSCHLAG_NACHT}%)</span><span class="kalk-value">${formatEuro(nachtZuschlag)}</span></div>
            <div class="kalk-item kalk-total"><span class="kalk-label">GESAMT</span><span class="kalk-value">${formatEuro(gesamt)}</span></div>
        </div>
        <div class="kalk-sub">
            <span>Pro Tag: ${formatEuro(proTag)}</span> |
            <span>Pro Woche: ${formatEuro(proWoche)}</span> |
            <span>Pro Monat (4 Wo.): ${formatEuro(proMonat)}</span>
        </div>
    </div>`;
}

// =============================================
// BENACHRICHTIGUNGEN
// =============================================
function pruefeBenachrichtigungen() {
    const el = document.getElementById('benachrichtigungen');
    if (!el) return;

    const meldungen = [];
    const heute = new Date().toISOString().split('T')[0];
    const in30Tagen = new Date();
    in30Tagen.setDate(in30Tagen.getDate() + 30);
    const in30 = in30Tagen.toISOString().split('T')[0];

    // Ablaufende Qualifikationen
    mitarbeiterListe_.forEach(m => {
        if (m.qualAblauf) {
            if (m.qualAblauf < heute) {
                meldungen.push({
                    typ: 'fehler',
                    text: `Qualifikation von ${m.name} (${QUAL_LABELS[m.qualifikation] || m.qualifikation}) ist am ${formatDatum(m.qualAblauf)} abgelaufen!`
                });
            } else if (m.qualAblauf <= in30) {
                meldungen.push({
                    typ: 'warnung',
                    text: `Qualifikation von ${m.name} (${QUAL_LABELS[m.qualifikation] || m.qualifikation}) läuft am ${formatDatum(m.qualAblauf)} ab.`
                });
            }
        }
    });

    // Heutige Einsätze ohne Bestätigung
    const heuteGeplant = einsaetze.filter(e => e.datum === heute && (!e.status || e.status === 'geplant'));
    if (heuteGeplant.length > 0) {
        meldungen.push({
            typ: 'info',
            text: `${heuteGeplant.length} Einsatz/Einsätze heute noch nicht bestätigt.`
        });
    }

    // Stornierte Einsätze in der Zukunft
    const storniert = einsaetze.filter(e => e.datum >= heute && e.status === 'storniert');
    if (storniert.length > 0) {
        meldungen.push({
            typ: 'info',
            text: `${storniert.length} stornierte/r zukünftige/r Einsatz/Einsätze.`
        });
    }

    if (meldungen.length === 0) {
        el.style.display = 'none';
        return;
    }

    el.style.display = 'block';
    el.innerHTML = meldungen.map(m => {
        const icon = m.typ === 'fehler' ? '!!!' : m.typ === 'warnung' ? '!' : 'i';
        return `<div class="benach-item benach-${m.typ}">
            <span class="benach-icon">${icon}</span>
            <span>${escapeHtml(m.text)}</span>
        </div>`;
    }).join('');
}

// =============================================
// STUNDENZETTEL (EINZELNER MA)
// =============================================
function druckeStundenzettel() {
    const filterM = document.getElementById('abrechnungMonat').value;
    const filterMA = document.getElementById('abrechnungMitarbeiter').value;

    if (!filterMA) { alert('Bitte einen Mitarbeiter auswählen.'); return; }
    if (!filterM) { alert('Bitte einen Monat auswählen.'); return; }

    const gefiltert = einsaetze.filter(e => e.datum.substring(0, 7) === filterM && e.mitarbeiter === filterMA);

    if (gefiltert.length === 0) { alert('Keine Einsätze für diesen Mitarbeiter in diesem Monat.'); return; }

    gefiltert.sort((a, b) => a.datum.localeCompare(b.datum) || a.zeitVon.localeCompare(b.zeitVon));

    const [j, m] = filterM.split('-');
    const monat = `${MONATSNAMEN[parseInt(m) - 1]} ${j}`;

    // MA-Info
    const maInfo = mitarbeiterListe_.find(ma => ma.name === filterMA);
    const qualLabel = maInfo ? (QUAL_LABELS[maInfo.qualifikation] || maInfo.qualifikation) : '';

    let totalStd = 0, totalNacht = 0, totalGrund = 0, totalZuschlag = 0, totalGesamt = 0, totalPause = 0;
    gefiltert.forEach(e => {
        totalStd += e.stunden;
        totalNacht += e.nachtStunden;
        totalGrund += e.grundlohn;
        totalZuschlag += e.zuschlagBetrag;
        totalGesamt += e.gesamt;
        totalPause += e.pauseMinuten || 0;
    });

    const arbeitstage = new Set(gefiltert.map(e => e.datum)).size;

    let html = `<h1>B.B. Protect</h1>
        <h2>Stundenzettel</h2>
        <div class="print-meta">
            <strong>${escapeHtml(filterMA)}</strong>${qualLabel ? ' | ' + escapeHtml(qualLabel) : ''}<br>
            Zeitraum: ${monat} | Erstellt: ${formatDatum(new Date().toISOString().split('T')[0])}
        </div>
        <div class="print-summary">
            <div><strong>Arbeitstage:</strong> ${arbeitstage}</div>
            <div><strong>Stunden:</strong> ${formatZahl(totalStd)}</div>
            <div><strong>davon Nacht:</strong> ${formatZahl(totalNacht)}</div>
            <div><strong>Pausen:</strong> ${totalPause} Min.</div>
        </div>
        <table><thead><tr>
            <th>Nr.</th><th>Datum</th><th>Tag</th><th>Objekt</th><th>Von</th><th>Bis</th>
            <th>Std.</th><th>Nacht</th><th>Pause</th><th>Grund</th><th>Zuschlag</th><th>Gesamt</th>
        </tr></thead><tbody>`;

    const wochentage = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

    gefiltert.forEach((e, i) => {
        const wt = wochentage[new Date(e.datum).getDay()];
        html += `<tr>
            <td>${i + 1}</td>
            <td>${formatDatum(e.datum)}</td>
            <td>${wt}</td>
            <td>${escapeHtml(e.objekt)}</td>
            <td>${e.zeitVon}</td>
            <td>${e.zeitBis}</td>
            <td>${formatZahl(e.stunden)}</td>
            <td>${formatZahl(e.nachtStunden)}</td>
            <td>${e.pauseMinuten || 0}</td>
            <td>${formatEuro(e.grundlohn)}</td>
            <td>${formatEuro(e.zuschlagBetrag)}</td>
            <td>${formatEuro(e.gesamt)}</td>
        </tr>`;
    });

    html += `</tbody><tfoot><tr class="total-row">
        <td colspan="6"><strong>GESAMT</strong></td>
        <td><strong>${formatZahl(totalStd)}</strong></td>
        <td><strong>${formatZahl(totalNacht)}</strong></td>
        <td><strong>${totalPause}</strong></td>
        <td><strong>${formatEuro(totalGrund)}</strong></td>
        <td><strong>${formatEuro(totalZuschlag)}</strong></td>
        <td><strong>${formatEuro(totalGesamt)}</strong></td>
    </tr></tfoot></table>`;

    html += `<div style="margin-top:2rem;display:flex;justify-content:space-between">
        <div style="border-top:1px solid #000;width:200px;text-align:center;padding-top:0.3rem">
            Unterschrift Mitarbeiter
        </div>
        <div style="border-top:1px solid #000;width:200px;text-align:center;padding-top:0.3rem">
            Unterschrift Arbeitgeber
        </div>
    </div>`;

    html += printFooter();
    document.getElementById('printArea').innerHTML = html;
    window.print();
}

// =============================================
// INITIALISIERUNG
// =============================================
document.getElementById('datum').valueAsDate = new Date();
initDarkMode();
renderTabelle();
updateAlleFilter();
updateMitarbeiterFilter();
updateDataLists();
renderObjekte();
renderVorlagen();
renderMitarbeiter();
renderVerfuegbarkeit();
updateHeaderStats();
pruefeBenachrichtigungen();
document.getElementById('vfDatum').valueAsDate = new Date();
