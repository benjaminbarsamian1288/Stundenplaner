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
let wachbuch = JSON.parse(localStorage.getItem('bbprotect_wachbuch') || '[]');
let dokumente = JSON.parse(localStorage.getItem('bbprotect_dokumente') || '[]');
let wochenvorlagen = JSON.parse(localStorage.getItem('bbprotect_wochenvorlagen') || '[]');

// Jahresübersicht-State
let jahresJahr = new Date().getFullYear();

// Dienstplan-State
let dienstplanKW = getKalenderWoche(new Date());
let dienstplanJahr = new Date().getFullYear();

// Sortierung
let sortSpalte = 'datum';
let sortRichtung = 1; // 1 = aufsteigend, -1 = absteigend

// Status-Filter
let aktuellerStatusFilter = 'alle';

// Tagesnotizen
let tagesnotizen = JSON.parse(localStorage.getItem('bbprotect_tagesnotizen') || '{}');

// Schichtübergabe-Protokolle
let uebergaben = JSON.parse(localStorage.getItem('bbprotect_uebergaben') || '[]');

// Notfallkontakte
let notfallkontakte = JSON.parse(localStorage.getItem('bbprotect_notfallkontakte') || '[]');

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
        if (this.dataset.tab === 'objekte') { renderObjekte(); renderVertraege(); renderObjektAuslastung(); updateChecklisteObjekte(); updateObjektHistorieSelect(); }
        if (this.dataset.tab === 'kalender') { renderKalender(); renderDienstplan(); renderJahresuebersicht(); }
        if (this.dataset.tab === 'abrechnung') updateAbrechnung();
        if (this.dataset.tab === 'mitarbeiter') { renderMitarbeiter(); renderDokumente(); renderUeberstunden(); renderKontaktliste(); renderUrlaubskonto(); renderArbeitszeitkonto(); renderQualMatrix(); updateSchichtHistorieSelect(); renderNotfallkontakte(); }
        if (this.dataset.tab === 'vorfaelle') renderVorfaelle();
        if (this.dataset.tab === 'wachbuch') { renderWachbuch(); renderUebergaben(); }
        if (this.dataset.tab === 'einstellungen') { updateDatenStats(); updateSpeicherStats(); }
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

    // Status-Filter
    if (aktuellerStatusFilter !== 'alle') {
        gefiltert = gefiltert.filter(e => (e.status || 'geplant') === aktuellerStatusFilter);
    }

    // Statusleiste aktualisieren
    updateStatusLeiste();

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
            <td class="no-print"><input type="checkbox" class="bulk-cb bulk-item-cb" data-id="${e.id}" onchange="bulkUpdateCount()"></td>
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
                ${e.mitarbeiter ? '<button class="btn-secondary btn-small" onclick="tauscheSchicht(' + e.id + ')">Tausch</button>' : ''}
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

    // MA-Leistungsübersicht
    renderMALeistung(filterM);

    // Personalkosten-Trend
    renderPersonalkostenTrend();

    // Wochentage-Verteilung
    renderWochentageVerteilung(gefiltert);

    // Monats-Heatmap
    renderHeatmap(filterM);

    // Konflikterkennung
    renderKonflikte();
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
    const vertragNr = document.getElementById('objektVertragNr').value.trim();
    const auftraggeber = document.getElementById('objektAuftraggeber').value.trim();
    const vertragStart = document.getElementById('objektVertragStart').value;
    const vertragEnde = document.getElementById('objektVertragEnde').value;
    const monatsstunden = parseFloat(document.getElementById('objektMonatsstunden').value) || 0;
    const vertragStatus = document.getElementById('objektVertragStatus').value;

    if (!name) return;

    const idx = objekte.findIndex(o => o.name === name);
    const obj = { name, adresse, stundensatz, ansprechpartner, vertragNr, auftraggeber, vertragStart, vertragEnde, monatsstunden, vertragStatus };
    if (idx !== -1) objekte[idx] = obj; else objekte.push(obj);

    localStorage.setItem('bbprotect_objekte', JSON.stringify(objekte));
    renderObjekte();
    renderVertraege();
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
        let vertragInfo = '';
        if (o.vertragStatus) {
            const cls = 'vs-' + o.vertragStatus;
            vertragInfo = `<br><span class="vertrag-status-badge ${cls}">${escapeHtml(VERTRAG_STATUS[o.vertragStatus] || o.vertragStatus)}</span>`;
            if (o.vertragNr) vertragInfo += ` <small>${escapeHtml(o.vertragNr)}</small>`;
        }
        tr.innerHTML = `
            <td>${escapeHtml(o.name)}${vertragInfo}</td>
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
    const sollStunden = parseFloat(document.getElementById('maSollStunden').value) || 0;
    const urlaubstage = parseInt(document.getElementById('maUrlaubstage').value) || 0;
    const bemerkung = document.getElementById('maBemerkung').value.trim();

    if (!vorname || !nachname) return;

    const vollname = `${vorname} ${nachname}`;
    const idx = mitarbeiterListe_.findIndex(m => m.name === vollname);
    const ma = { name: vollname, vorname, nachname, telefon, email, qualifikation, stundensatz, qualAblauf, sollStunden, urlaubstage, bemerkung };

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
        version: 10,
        datum: new Date().toISOString(),
        einsaetze,
        objekte,
        vorlagen,
        mitarbeiter: mitarbeiterListe_,
        verfuegbarkeit,
        vorfaelle,
        wachbuch,
        dokumente,
        wochenvorlagen,
        tagesnotizen,
        uebergaben,
        notfallkontakte
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
            wachbuch = data.wachbuch || [];
            dokumente = data.dokumente || [];
            wochenvorlagen = data.wochenvorlagen || [];
            tagesnotizen = data.tagesnotizen || {};
            uebergaben = data.uebergaben || [];
            notfallkontakte = data.notfallkontakte || [];

            speichern();
            localStorage.setItem('bbprotect_objekte', JSON.stringify(objekte));
            localStorage.setItem('bbprotect_vorlagen', JSON.stringify(vorlagen));
            localStorage.setItem('bbprotect_mitarbeiter', JSON.stringify(mitarbeiterListe_));
            localStorage.setItem('bbprotect_verfuegbarkeit', JSON.stringify(verfuegbarkeit));
            localStorage.setItem('bbprotect_vorfaelle', JSON.stringify(vorfaelle));
            localStorage.setItem('bbprotect_wachbuch', JSON.stringify(wachbuch));
            localStorage.setItem('bbprotect_dokumente', JSON.stringify(dokumente));
            localStorage.setItem('bbprotect_wochenvorlagen', JSON.stringify(wochenvorlagen));
            localStorage.setItem('bbprotect_tagesnotizen', JSON.stringify(tagesnotizen));
            localStorage.setItem('bbprotect_uebergaben', JSON.stringify(uebergaben));
            localStorage.setItem('bbprotect_notfallkontakte', JSON.stringify(notfallkontakte));

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
    wachbuch = [];
    dokumente = [];
    wochenvorlagen = [];
    tagesnotizen = {};
    uebergaben = [];
    notfallkontakte = [];

    localStorage.removeItem('bbprotect_einsaetze');
    localStorage.removeItem('bbprotect_objekte');
    localStorage.removeItem('bbprotect_vorlagen');
    localStorage.removeItem('bbprotect_mitarbeiter');
    localStorage.removeItem('bbprotect_verfuegbarkeit');
    localStorage.removeItem('bbprotect_vorfaelle');
    localStorage.removeItem('bbprotect_wachbuch');
    localStorage.removeItem('bbprotect_dokumente');
    localStorage.removeItem('bbprotect_wochenvorlagen');
    localStorage.removeItem('bbprotect_tagesnotizen');
    localStorage.removeItem('bbprotect_uebergaben');
    localStorage.removeItem('bbprotect_notfallkontakte');

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
            <div class="daten-stat"><strong>${wachbuch.length}</strong><span>Wachbuch</span></div>
            <div class="daten-stat"><strong>${dokumente.length}</strong><span>Dokumente</span></div>
            <div class="daten-stat"><strong>${wochenvorlagen.length}</strong><span>KW-Vorlagen</span></div>
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

            if (!cellContent) {
                cellClass += ' dp-leer dp-klickbar';
                cellContent = `<span class="dp-plus" onclick="schnellerfassungDienstplan('${escapeHtml(name).replace(/'/g, "\\'")}','${datum}')" title="Einsatz erstellen">+</span>`;
            }

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

        // Timeline
        html += '<div class="modal-abschnitt"><h3>Timeline</h3><div class="tl-container">';
        html += '<div class="tl-stunden">';
        for (let h = 0; h < 24; h++) {
            html += `<span class="tl-h" style="left:${(h / 24) * 100}%">${String(h).padStart(2, '0')}</span>`;
        }
        html += '</div><div class="tl-tracks">';

        const farben = ['#2b6cb0', '#38a169', '#d69e2e', '#c53030', '#805ad5', '#dd6b20'];
        tagesE.forEach((e, idx) => {
            const [svh, svm] = e.zeitVon.split(':').map(Number);
            const [evh, evm] = e.zeitBis.split(':').map(Number);
            let startPct = ((svh * 60 + svm) / 1440) * 100;
            let endPct = ((evh * 60 + evm) / 1440) * 100;
            if (endPct <= startPct) endPct = 100;
            const widthPct = endPct - startPct;
            const farbe = farben[idx % farben.length];

            html += `<div class="tl-track">
                <div class="tl-bar" style="left:${startPct}%;width:${widthPct}%;background:${farbe}" title="${e.zeitVon}-${e.zeitBis} ${escapeHtml(e.objekt)} (${escapeHtml(e.mitarbeiter || '')})">
                    <span class="tl-label">${escapeHtml(e.mitarbeiter ? e.mitarbeiter.split(' ')[0] : e.objekt)}</span>
                </div>
            </div>`;
        });

        html += '</div></div></div>';

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

    // Tagesnotizen
    const tnKey = datumStr;
    const tnSafe = datumStr.replace(/-/g, '');
    const notizen = tagesnotizen[tnKey] || [];
    html += `<div class="modal-abschnitt"><h3>Tagesnotizen (${notizen.length})</h3>`;
    if (notizen.length > 0) {
        html += '<div class="tn-list">';
        notizen.forEach(n => {
            html += `<div class="tn-item"><span>${escapeHtml(n.text)}</span><button class="btn-delete btn-small" onclick="tagesnotizLoeschen('${tnKey}',${n.id});zeigeTagesDetail('${datumStr}')" style="padding:0.1rem 0.3rem;font-size:0.6rem">X</button></div>`;
        });
        html += '</div>';
    }
    html += `<div class="tn-form">
        <input type="text" id="tnInput_${tnSafe}" class="tn-input" placeholder="Notiz hinzufügen..." onkeydown="if(event.key==='Enter'){tagesnotizSpeichern('${tnKey}');zeigeTagesDetail('${datumStr}');}">
        <button class="btn-primary btn-small" onclick="tagesnotizSpeichern('${tnKey}');zeigeTagesDetail('${datumStr}');">+</button>
    </div></div>`;

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

    // Ablaufende Dokumente
    dokumente.forEach(d => {
        if (d.gueltigBis) {
            if (d.gueltigBis < heute) {
                meldungen.push({
                    typ: 'fehler',
                    text: `Dokument "${DOK_TYPEN[d.typ] || d.typ}" von ${d.mitarbeiter} ist abgelaufen (${formatDatum(d.gueltigBis)})!`
                });
            } else if (d.gueltigBis <= in30) {
                meldungen.push({
                    typ: 'warnung',
                    text: `Dokument "${DOK_TYPEN[d.typ] || d.typ}" von ${d.mitarbeiter} läuft am ${formatDatum(d.gueltigBis)} ab.`
                });
            }
        }
    });

    // Auslaufende Verträge
    objekte.forEach(o => {
        if (o.vertragEnde && o.vertragStatus === 'aktiv') {
            if (o.vertragEnde < heute) {
                meldungen.push({
                    typ: 'fehler',
                    text: `Vertrag für "${o.name}" ist am ${formatDatum(o.vertragEnde)} abgelaufen!`
                });
            } else if (o.vertragEnde <= in30) {
                meldungen.push({
                    typ: 'warnung',
                    text: `Vertrag für "${o.name}" läuft am ${formatDatum(o.vertragEnde)} ab.`
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
// JAHRESÜBERSICHT
// =============================================
function jahresNav(offset) {
    jahresJahr += offset;
    renderJahresuebersicht();
}

function renderJahresuebersicht() {
    const el = document.getElementById('jahresGrid');
    const titel = document.getElementById('jahresTitel');
    if (!el) return;

    titel.textContent = `Jahresübersicht ${jahresJahr}`;

    let html = '';
    for (let m = 0; m < 12; m++) {
        const monatsStr = `${jahresJahr}-${String(m + 1).padStart(2, '0')}`;
        const monatsE = einsaetze.filter(e => e.datum.substring(0, 7) === monatsStr);
        const totalStd = monatsE.reduce((s, e) => s + e.stunden, 0);
        const totalGesamt = monatsE.reduce((s, e) => s + e.gesamt, 0);
        const tageImMonat = new Date(jahresJahr, m + 1, 0).getDate();

        const ersterTag = new Date(jahresJahr, m, 1);
        let startWochentag = ersterTag.getDay();
        if (startWochentag === 0) startWochentag = 7;
        startWochentag--;

        html += `<div class="jahres-monat">
            <div class="jahres-monat-header" onclick="kalenderMonat=${m};kalenderJahr=${jahresJahr};wechsleZuTab('kalender');renderKalender();renderDienstplan();">
                <strong>${MONATSNAMEN[m].substring(0, 3)}</strong>
                ${monatsE.length > 0 ? '<span class="jahres-count">' + monatsE.length + '</span>' : ''}
            </div>
            <div class="jahres-mini-grid">`;

        // Tage-Labels
        ['M', 'D', 'M', 'D', 'F', 'S', 'S'].forEach(t => {
            html += `<span class="jm-header">${t}</span>`;
        });

        // Leere Zellen
        for (let i = 0; i < startWochentag; i++) {
            html += '<span class="jm-leer"></span>';
        }

        const heute = new Date().toISOString().split('T')[0];

        for (let tag = 1; tag <= tageImMonat; tag++) {
            const datumStr = `${monatsStr}-${String(tag).padStart(2, '0')}`;
            const hatEinsatz = monatsE.some(e => e.datum === datumStr);
            const istHeute = datumStr === heute;
            const feiertag = istFeiertag(datumStr);
            const wt = new Date(datumStr).getDay();

            let cls = 'jm-tag';
            if (hatEinsatz) cls += ' jm-aktiv';
            if (istHeute) cls += ' jm-heute';
            if (feiertag) cls += ' jm-feiertag';
            if (wt === 0 || wt === 6) cls += ' jm-we';

            html += `<span class="${cls}">${tag}</span>`;
        }

        html += `</div>`;

        if (monatsE.length > 0) {
            html += `<div class="jahres-monat-footer">
                <span>${formatZahl(totalStd)} Std.</span>
                <span>${formatEuro(totalGesamt)}</span>
            </div>`;
        }

        html += '</div>';
    }

    el.innerHTML = html;
}

// =============================================
// ÜBERSTUNDEN-TRACKING
// =============================================
function renderUeberstunden() {
    const el = document.getElementById('ueberstundenContent');
    if (!el) return;

    // Filter aktualisieren
    const filterSelect = document.getElementById('ueberstundenMonat');
    const monate = new Set();
    einsaetze.forEach(e => monate.add(e.datum.substring(0, 7)));
    fillMonatsSelect(filterSelect, monate);

    let filterM = filterSelect.value;
    if (!filterM) {
        // Aktueller Monat
        const jetzt = new Date();
        filterM = `${jetzt.getFullYear()}-${String(jetzt.getMonth() + 1).padStart(2, '0')}`;
    }

    const maList = mitarbeiterListe_.filter(m => m.sollStunden > 0);

    if (maList.length === 0) {
        el.innerHTML = '<p style="color:#a0aec0">Keine Mitarbeiter mit Soll-Stunden definiert. Tragen Sie Soll-Stunden in der Mitarbeiter-Verwaltung ein.</p>';
        return;
    }

    const [j, m] = filterM.split('-');
    const monatLabel = `${MONATSNAMEN[parseInt(m) - 1]} ${j}`;

    let html = `<p style="font-size:0.85rem;color:#718096;margin-bottom:0.75rem">${monatLabel}</p>`;

    maList.forEach(ma => {
        const maEinsaetze = einsaetze.filter(e => e.mitarbeiter === ma.name && e.datum.substring(0, 7) === filterM);
        const istStunden = maEinsaetze.reduce((s, e) => s + e.stunden, 0);
        const diff = istStunden - ma.sollStunden;
        const pct = Math.min((istStunden / ma.sollStunden) * 100, 150);

        let barCls = 'ue-bar-fill';
        if (diff > 0) barCls += ' ue-plus';
        else if (istStunden < ma.sollStunden * 0.8) barCls += ' ue-minus';

        html += `<div class="ue-row">
            <div class="ue-name">${escapeHtml(ma.name)}</div>
            <div class="ue-bar-bg">
                <div class="${barCls}" style="width:${Math.min(pct, 100)}%"></div>
                ${pct > 100 ? '<div class="ue-bar-over" style="width:' + (pct - 100) + '%"></div>' : ''}
            </div>
            <div class="ue-werte">
                <span>${formatZahl(istStunden)} / ${formatZahl(ma.sollStunden)} Std.</span>
                <span class="${diff >= 0 ? 'trend-up' : 'trend-down'}">${diff >= 0 ? '+' : ''}${formatZahl(diff)}</span>
            </div>
        </div>`;
    });

    el.innerHTML = html;
}

// =============================================
// KONTAKTLISTE
// =============================================
function renderKontaktliste() {
    const el = document.getElementById('kontaktlisteContent');
    if (!el) return;

    if (mitarbeiterListe_.length === 0) {
        el.innerHTML = '<p style="color:#a0aec0">Keine Mitarbeiter vorhanden.</p>';
        return;
    }

    let html = '<div class="kontakt-grid">';
    mitarbeiterListe_.sort((a, b) => a.name.localeCompare(b.name)).forEach(m => {
        html += `<div class="kontakt-card">
            <div class="kontakt-name">${escapeHtml(m.name)}</div>
            <div class="kontakt-details">
                ${m.telefon ? '<span>Tel: ' + escapeHtml(m.telefon) + '</span>' : ''}
                ${m.email ? '<span>Mail: ' + escapeHtml(m.email) + '</span>' : ''}
                <span class="qual-badge">${escapeHtml(QUAL_LABELS[m.qualifikation] || m.qualifikation)}</span>
            </div>
        </div>`;
    });
    html += '</div>';
    el.innerHTML = html;
}

function druckeKontaktliste() {
    if (mitarbeiterListe_.length === 0) { alert('Keine Mitarbeiter vorhanden.'); return; }

    let html = printHeader('Kontaktliste / Notfallkontakte');
    html += '<table><thead><tr><th>Name</th><th>Telefon</th><th>E-Mail</th><th>Qualifikation</th><th>Bemerkung</th></tr></thead><tbody>';

    mitarbeiterListe_.sort((a, b) => a.name.localeCompare(b.name)).forEach(m => {
        html += `<tr>
            <td><strong>${escapeHtml(m.name)}</strong></td>
            <td>${escapeHtml(m.telefon || '\u2014')}</td>
            <td>${escapeHtml(m.email || '\u2014')}</td>
            <td>${escapeHtml(QUAL_LABELS[m.qualifikation] || m.qualifikation)}</td>
            <td>${escapeHtml(m.bemerkung || '\u2014')}</td>
        </tr>`;
    });

    html += '</tbody></table>';
    html += '<div style="margin-top:1.5rem;font-size:9pt;color:#666"><strong>Notrufnummern:</strong> Polizei: 110 | Feuerwehr/Rettung: 112 | Leitstelle B.B. Protect: ___________</div>';
    html += printFooter();

    document.getElementById('printArea').innerHTML = html;
    window.print();
}

// =============================================
// WACHBUCH
// =============================================
const DOK_TYPEN = {
    fuehrungszeugnis: 'Führungszeugnis',
    erstehilfe: 'Erste-Hilfe-Kurs',
    brandschutz: 'Brandschutzhelfer',
    datenschutz: 'Datenschutzunterweisung',
    arbeitssicherheit: 'Arbeitssicherheit',
    waffensachkunde: 'Waffensachkunde',
    fahrerlaubnis: 'Fahrerlaubnis',
    sonstiges: 'Sonstiges Dokument'
};

const VERTRAG_STATUS = {
    aktiv: 'Aktiv',
    auslaufend: 'Auslaufend',
    gekuendigt: 'Gekündigt',
    ruhend: 'Ruhend'
};

const WB_KATEGORIEN = {
    rundgang: 'Kontrollrundgang',
    schichtuebergabe: 'Schichtübergabe',
    zugang: 'Zugangsüberwachung',
    schliessung: 'Schließdienst',
    alarm: 'Alarm / Störung',
    besucher: 'Besucherverkehr',
    lieferung: 'Lieferung / Anlieferung',
    sonstiges: 'Sonstiges'
};

document.getElementById('wachbuchForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const eintrag = {
        id: Date.now(),
        datum: document.getElementById('wbDatum').value,
        zeit: document.getElementById('wbZeit').value,
        objekt: document.getElementById('wbObjekt').value.trim(),
        kategorie: document.getElementById('wbKategorie').value,
        mitarbeiter: document.getElementById('wbMitarbeiter').value.trim(),
        eintrag: document.getElementById('wbEintrag').value.trim()
    };

    if (!eintrag.datum || !eintrag.zeit || !eintrag.objekt || !eintrag.eintrag) return;

    wachbuch.push(eintrag);
    localStorage.setItem('bbprotect_wachbuch', JSON.stringify(wachbuch));
    renderWachbuch();
    this.reset();
    document.getElementById('wbDatum').valueAsDate = new Date();
    const jetzt = new Date();
    document.getElementById('wbZeit').value = `${String(jetzt.getHours()).padStart(2, '0')}:${String(jetzt.getMinutes()).padStart(2, '0')}`;
});

function renderWachbuch() {
    const content = document.getElementById('wachbuchContent');
    const empty = document.getElementById('wachbuchEmpty');
    if (!content) return;

    // Objekt-Filter aktualisieren
    const filterObjekt = document.getElementById('wbFilterObjekt');
    const objNames = new Set(wachbuch.map(w => w.objekt));
    const current = filterObjekt.value;
    filterObjekt.innerHTML = '<option value="">Alle Objekte</option>';
    Array.from(objNames).sort().forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        filterObjekt.appendChild(opt);
    });
    filterObjekt.value = current;

    const filterO = filterObjekt.value;
    const filterD = document.getElementById('wbFilterDatum').value;

    let gefiltert = wachbuch;
    if (filterO) gefiltert = gefiltert.filter(w => w.objekt === filterO);
    if (filterD) gefiltert = gefiltert.filter(w => w.datum === filterD);

    if (gefiltert.length === 0) {
        content.innerHTML = '';
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';

    // Sortiere nach Datum/Zeit absteigend
    gefiltert.sort((a, b) => b.datum.localeCompare(a.datum) || b.zeit.localeCompare(a.zeit));

    // Gruppiere nach Datum
    const gruppen = {};
    gefiltert.forEach(w => {
        if (!gruppen[w.datum]) gruppen[w.datum] = [];
        gruppen[w.datum].push(w);
    });

    let html = '';
    Object.entries(gruppen).forEach(([datum, eintraege]) => {
        const wochentage = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
        const wt = wochentage[new Date(datum).getDay()];

        html += `<div class="wb-tag">
            <div class="wb-tag-header">${wt}, ${formatDatum(datum)} (${eintraege.length} Einträge)</div>`;

        eintraege.forEach(w => {
            html += `<div class="wb-eintrag">
                <div class="wb-eintrag-header">
                    <span class="wb-zeit">${w.zeit} Uhr</span>
                    <span class="wb-kat">${escapeHtml(WB_KATEGORIEN[w.kategorie] || w.kategorie)}</span>
                    <span class="wb-objekt">${escapeHtml(w.objekt)}</span>
                    ${w.mitarbeiter ? '<span class="wb-ma">' + escapeHtml(w.mitarbeiter) + '</span>' : ''}
                </div>
                <p class="wb-text">${escapeHtml(w.eintrag)}</p>
                <button class="btn-delete btn-small" onclick="loescheWachbuchEintrag(${w.id})">Löschen</button>
            </div>`;
        });

        html += '</div>';
    });

    content.innerHTML = html;
}

function loescheWachbuchEintrag(id) {
    if (!confirm('Diesen Wachbuch-Eintrag wirklich löschen?')) return;
    wachbuch = wachbuch.filter(w => w.id !== id);
    localStorage.setItem('bbprotect_wachbuch', JSON.stringify(wachbuch));
    renderWachbuch();
}

function druckeWachbuch() {
    const filterO = document.getElementById('wbFilterObjekt').value;
    const filterD = document.getElementById('wbFilterDatum').value;

    let gefiltert = wachbuch;
    if (filterO) gefiltert = gefiltert.filter(w => w.objekt === filterO);
    if (filterD) gefiltert = gefiltert.filter(w => w.datum === filterD);

    if (gefiltert.length === 0) { alert('Keine Einträge zum Drucken.'); return; }

    gefiltert.sort((a, b) => a.datum.localeCompare(b.datum) || a.zeit.localeCompare(b.zeit));

    let titel = 'Wachbuch';
    if (filterO) titel += ' \u2014 ' + filterO;

    let html = printHeader(titel);
    html += '<table><thead><tr><th>Datum</th><th>Zeit</th><th>Objekt</th><th>Kategorie</th><th>Mitarbeiter</th><th>Eintrag</th></tr></thead><tbody>';

    gefiltert.forEach(w => {
        html += `<tr>
            <td>${formatDatum(w.datum)}</td>
            <td>${w.zeit}</td>
            <td>${escapeHtml(w.objekt)}</td>
            <td>${escapeHtml(WB_KATEGORIEN[w.kategorie] || w.kategorie)}</td>
            <td>${escapeHtml(w.mitarbeiter || '\u2014')}</td>
            <td>${escapeHtml(w.eintrag)}</td>
        </tr>`;
    });

    html += '</tbody></table>' + printFooter();
    document.getElementById('printArea').innerHTML = html;
    window.print();
}

// =============================================
// VERTRAGSÜBERSICHT
// =============================================
function renderVertraege() {
    const el = document.getElementById('vertraegeContent');
    const empty = document.getElementById('vertraegeEmpty');
    if (!el) return;

    const mitVertrag = objekte.filter(o => o.vertragStatus);

    if (mitVertrag.length === 0) {
        el.innerHTML = '';
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';

    const heute = new Date().toISOString().split('T')[0];
    const in30 = new Date();
    in30.setDate(in30.getDate() + 30);
    const in30Str = in30.toISOString().split('T')[0];

    let html = '<div class="vertraege-grid">';
    mitVertrag.forEach(o => {
        const cls = 'vs-' + o.vertragStatus;
        let laufzeitWarnung = '';
        if (o.vertragEnde) {
            if (o.vertragEnde < heute) {
                laufzeitWarnung = '<span class="vertrag-warn abgelaufen">Abgelaufen</span>';
            } else if (o.vertragEnde <= in30Str) {
                laufzeitWarnung = '<span class="vertrag-warn bald">Läuft bald ab</span>';
            }
        }

        // Monatsstunden vs. Ist
        let stundenInfo = '';
        if (o.monatsstunden > 0) {
            const aktMonat = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
            const istStd = einsaetze.filter(e => e.objekt === o.name && e.datum.substring(0, 7) === aktMonat).reduce((s, e) => s + e.stunden, 0);
            const pct = Math.min((istStd / o.monatsstunden) * 100, 100);
            stundenInfo = `<div class="vertrag-stunden">
                <div class="vertrag-std-bar-bg"><div class="vertrag-std-bar" style="width:${pct}%"></div></div>
                <span>${formatZahl(istStd)} / ${formatZahl(o.monatsstunden)} Std.</span>
            </div>`;
        }

        html += `<div class="vertrag-card">
            <div class="vertrag-card-header">
                <strong>${escapeHtml(o.name)}</strong>
                <span class="vertrag-status-badge ${cls}">${escapeHtml(VERTRAG_STATUS[o.vertragStatus])}</span>
            </div>
            ${o.vertragNr ? '<div class="vertrag-detail"><span>Vertrag:</span> ' + escapeHtml(o.vertragNr) + '</div>' : ''}
            ${o.auftraggeber ? '<div class="vertrag-detail"><span>Auftraggeber:</span> ' + escapeHtml(o.auftraggeber) + '</div>' : ''}
            ${o.vertragStart || o.vertragEnde ? '<div class="vertrag-detail"><span>Laufzeit:</span> ' + (o.vertragStart ? formatDatum(o.vertragStart) : '?') + ' \u2013 ' + (o.vertragEnde ? formatDatum(o.vertragEnde) : 'unbefristet') + ' ' + laufzeitWarnung + '</div>' : ''}
            ${stundenInfo}
        </div>`;
    });
    html += '</div>';
    el.innerHTML = html;
}

// =============================================
// MITARBEITER-DOKUMENTE
// =============================================
function dokumentSpeichern() {
    const ma = document.getElementById('dokMa').value.trim();
    const typ = document.getElementById('dokTyp').value;
    const ausgestellt = document.getElementById('dokAusgestellt').value;
    const gueltigBis = document.getElementById('dokGueltigBis').value;
    const notiz = document.getElementById('dokNotiz').value.trim();

    if (!ma || !typ) { alert('Bitte Mitarbeiter und Dokumenttyp auswählen.'); return; }

    dokumente.push({ id: Date.now(), mitarbeiter: ma, typ, ausgestellt, gueltigBis, notiz });
    localStorage.setItem('bbprotect_dokumente', JSON.stringify(dokumente));
    renderDokumente();

    document.getElementById('dokAusgestellt').value = '';
    document.getElementById('dokGueltigBis').value = '';
    document.getElementById('dokNotiz').value = '';
}

function loescheDokument(id) {
    if (!confirm('Dieses Dokument wirklich löschen?')) return;
    dokumente = dokumente.filter(d => d.id !== id);
    localStorage.setItem('bbprotect_dokumente', JSON.stringify(dokumente));
    renderDokumente();
}

function renderDokumente() {
    const el = document.getElementById('dokumenteContent');
    const empty = document.getElementById('dokumenteEmpty');
    if (!el) return;

    if (dokumente.length === 0) {
        el.innerHTML = '';
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';

    const heute = new Date().toISOString().split('T')[0];
    const in30 = new Date();
    in30.setDate(in30.getDate() + 30);
    const in30Str = in30.toISOString().split('T')[0];

    // Gruppiere nach MA
    const maMap = {};
    dokumente.forEach(d => {
        if (!maMap[d.mitarbeiter]) maMap[d.mitarbeiter] = [];
        maMap[d.mitarbeiter].push(d);
    });

    let html = '';
    Object.entries(maMap).sort((a, b) => a[0].localeCompare(b[0])).forEach(([name, docs]) => {
        html += `<div class="dok-ma-gruppe">
            <div class="dok-ma-name">${escapeHtml(name)}</div>
            <div class="dok-liste">`;

        docs.forEach(d => {
            let statusCls = 'dok-ok';
            let statusText = '';
            if (d.gueltigBis) {
                if (d.gueltigBis < heute) {
                    statusCls = 'dok-abgelaufen';
                    statusText = 'ABGELAUFEN';
                } else if (d.gueltigBis <= in30Str) {
                    statusCls = 'dok-bald';
                    statusText = 'Läuft bald ab';
                }
            }

            html += `<div class="dok-item ${statusCls}">
                <div class="dok-item-info">
                    <span class="dok-typ">${escapeHtml(DOK_TYPEN[d.typ] || d.typ)}</span>
                    ${d.ausgestellt ? '<span class="dok-datum">Ausgestellt: ' + formatDatum(d.ausgestellt) + '</span>' : ''}
                    ${d.gueltigBis ? '<span class="dok-datum">Gültig bis: ' + formatDatum(d.gueltigBis) + '</span>' : '<span class="dok-datum">Unbefristet</span>'}
                    ${statusText ? '<span class="dok-status ' + statusCls + '">' + statusText + '</span>' : ''}
                    ${d.notiz ? '<span class="dok-notiz">' + escapeHtml(d.notiz) + '</span>' : ''}
                </div>
                <button class="btn-delete btn-small" onclick="loescheDokument(${d.id})">X</button>
            </div>`;
        });

        html += '</div></div>';
    });

    el.innerHTML = html;
}

// =============================================
// DIENSTPLAN DRUCKEN
// =============================================
function druckeDienstplan() {
    const montag = getMontag(dienstplanJahr, dienstplanKW);
    const tage = [];
    const tageLabels = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

    for (let i = 0; i < 7; i++) {
        const d = new Date(montag);
        d.setUTCDate(d.getUTCDate() + i);
        tage.push(d.toISOString().split('T')[0]);
    }

    const alleMa = new Set();
    mitarbeiterListe_.forEach(m => alleMa.add(m.name));
    einsaetze.forEach(e => {
        if (e.mitarbeiter && tage.includes(e.datum)) alleMa.add(e.mitarbeiter);
    });
    const maList = Array.from(alleMa).sort();

    if (maList.length === 0) { alert('Keine Mitarbeiter vorhanden.'); return; }

    let html = printHeader(`Dienstplan KW ${dienstplanKW} / ${dienstplanJahr}`);
    html += `<div class="print-meta">Zeitraum: ${formatDatum(tage[0])} \u2013 ${formatDatum(tage[6])}</div>`;
    html += '<table><thead><tr><th>Mitarbeiter</th>';

    tage.forEach((d, i) => {
        const dt = new Date(d);
        html += `<th>${tageLabels[i].substring(0, 2)} ${dt.getUTCDate()}.${dt.getUTCMonth() + 1}.</th>`;
    });
    html += '<th>Summe</th></tr></thead><tbody>';

    let gesamtStd = 0;

    maList.forEach(name => {
        html += `<tr><td><strong>${escapeHtml(name)}</strong></td>`;
        let maWocheStd = 0;

        tage.forEach(datum => {
            const tagesE = einsaetze.filter(e => e.mitarbeiter === name && e.datum === datum);
            const abwesend = verfuegbarkeit.find(v => v.mitarbeiter === name && v.von <= datum && v.bis >= datum);

            if (abwesend) {
                const typLabels = { urlaub: 'U', krank: 'K', frei: 'F', fortbildung: 'FB' };
                html += `<td style="text-align:center;color:#718096">${typLabels[abwesend.typ] || '?'}</td>`;
            } else if (tagesE.length > 0) {
                const std = tagesE.reduce((s, e) => s + e.stunden, 0);
                maWocheStd += std;
                html += `<td>${tagesE.map(e => e.zeitVon + '-' + e.zeitBis).join('<br>')}<br><small>${formatZahl(std)} Std.</small></td>`;
            } else {
                html += '<td style="text-align:center;color:#ccc">\u2014</td>';
            }
        });

        gesamtStd += maWocheStd;
        html += `<td><strong>${formatZahl(maWocheStd)}</strong></td></tr>`;
    });

    html += `</tbody><tfoot><tr class="total-row"><td colspan="${tage.length + 1}"><strong>GESAMT</strong></td><td><strong>${formatZahl(gesamtStd)} Std.</strong></td></tr></tfoot></table>`;
    html += printFooter();

    document.getElementById('printArea').innerHTML = html;
    window.print();
}

// =============================================
// MITARBEITER-LEISTUNGSÜBERSICHT
// =============================================
function renderMALeistung(filterM) {
    const el = document.getElementById('maLeistung');
    if (!el) return;

    let gefiltert = einsaetze;
    if (filterM) gefiltert = gefiltert.filter(e => e.datum.substring(0, 7) === filterM);

    if (gefiltert.length === 0) {
        el.innerHTML = '<p style="color:#a0aec0">Keine Einsatzdaten vorhanden.</p>';
        return;
    }

    const maMap = {};
    gefiltert.forEach(e => {
        const name = e.mitarbeiter || 'Nicht zugewiesen';
        if (!maMap[name]) maMap[name] = { stunden: 0, einsaetze: 0, umsatz: 0, nacht: 0, tage: new Set(), objekte: new Set() };
        maMap[name].stunden += e.stunden;
        maMap[name].einsaetze++;
        maMap[name].umsatz += e.gesamt;
        maMap[name].nacht += e.nachtStunden;
        maMap[name].tage.add(e.datum);
        maMap[name].objekte.add(e.objekt);
    });

    const sorted = Object.entries(maMap).sort((a, b) => b[1].stunden - a[1].stunden);
    const maxStd = Math.max(...sorted.map(([, d]) => d.stunden), 1);

    let html = '<div class="ma-leistung-grid">';
    sorted.forEach(([name, data], i) => {
        const pct = (data.stunden / maxStd) * 100;
        const avgStdTag = data.tage.size > 0 ? (data.stunden / data.tage.size) : 0;
        const nachtPct = data.stunden > 0 ? ((data.nacht / data.stunden) * 100) : 0;

        let rangBadge = '';
        if (i === 0) rangBadge = '<span class="rang-badge rang-1">1.</span>';
        else if (i === 1) rangBadge = '<span class="rang-badge rang-2">2.</span>';
        else if (i === 2) rangBadge = '<span class="rang-badge rang-3">3.</span>';

        html += `<div class="mal-row">
            <div class="mal-rang">${rangBadge}</div>
            <div class="mal-name">${escapeHtml(name)}</div>
            <div class="mal-bar-bg"><div class="mal-bar" style="width:${pct}%"></div></div>
            <div class="mal-stats">
                <span title="Stunden gesamt"><strong>${formatZahl(data.stunden)}</strong> Std.</span>
                <span title="Einsätze">${data.einsaetze} Eins.</span>
                <span title="Tage">${data.tage.size} Tage</span>
                <span title="Objekte">${data.objekte.size} Obj.</span>
                <span title="Nachtanteil">${nachtPct.toFixed(0)}% Nacht</span>
                <span title="Durchschnitt pro Tag">\u00D8 ${formatZahl(avgStdTag)} Std./Tag</span>
            </div>
        </div>`;
    });
    html += '</div>';

    el.innerHTML = html;
}

// =============================================
// SCHNELLERFASSUNG AUS DIENSTPLAN
// =============================================
function schnellerfassungDienstplan(name, datum) {
    wechsleZuTab('erfassung');
    document.getElementById('datum').value = datum;
    document.getElementById('mitarbeiter').value = name;
    document.getElementById('einsatzFormSection').scrollIntoView({ behavior: 'smooth' });
    updatePreview();
}

// =============================================
// SCHICHT-TAUSCH
// =============================================
function tauscheSchicht(id) {
    const einsatz = einsaetze.find(e => e.id === id);
    if (!einsatz || !einsatz.mitarbeiter) return;

    // Alle MA sammeln die nicht dieser MA sind
    const andereMa = new Set();
    mitarbeiterListe_.forEach(m => { if (m.name !== einsatz.mitarbeiter) andereMa.add(m.name); });
    einsaetze.forEach(e => { if (e.mitarbeiter && e.mitarbeiter !== einsatz.mitarbeiter) andereMa.add(e.mitarbeiter); });

    if (andereMa.size === 0) {
        alert('Kein anderer Mitarbeiter verfügbar für den Tausch.');
        return;
    }

    const maList = Array.from(andereMa).sort();
    const auswahl = prompt(
        `Schicht von ${einsatz.mitarbeiter} am ${formatDatum(einsatz.datum)} (${einsatz.zeitVon}-${einsatz.zeitBis}) tauschen mit:\n\n` +
        maList.map((m, i) => `${i + 1}. ${m}`).join('\n') +
        '\n\nBitte Nummer eingeben:'
    );

    if (!auswahl) return;
    const idx = parseInt(auswahl) - 1;
    if (isNaN(idx) || idx < 0 || idx >= maList.length) {
        alert('Ungültige Auswahl.');
        return;
    }

    const zielMA = maList[idx];
    const origMA = einsatz.mitarbeiter;

    // Prüfen ob der Ziel-MA an dem Tag auch einen Einsatz hat
    const zielEinsatz = einsaetze.find(e =>
        e.mitarbeiter === zielMA && e.datum === einsatz.datum && e.id !== id
    );

    if (zielEinsatz) {
        if (!confirm(`Schichten tauschen:\n\n${origMA}: ${einsatz.zeitVon}-${einsatz.zeitBis} (${einsatz.objekt})\n${zielMA}: ${zielEinsatz.zeitVon}-${zielEinsatz.zeitBis} (${zielEinsatz.objekt})\n\nMitarbeiter tauschen?`)) return;
        einsatz.mitarbeiter = zielMA;
        zielEinsatz.mitarbeiter = origMA;
    } else {
        if (!confirm(`Schicht am ${formatDatum(einsatz.datum)} (${einsatz.zeitVon}-${einsatz.zeitBis}):\n${origMA} → ${zielMA}\n\nÜbertragen?`)) return;
        einsatz.mitarbeiter = zielMA;
    }

    speichern();
    renderTabelle();
    alert('Schicht erfolgreich getauscht!');
}

// =============================================
// URLAUBSKONTO
// =============================================
function renderUrlaubskonto() {
    const el = document.getElementById('urlaubskontoContent');
    if (!el) return;

    // Jahr-Select befüllen
    const jahrSelect = document.getElementById('urlaubJahr');
    const aktJahr = new Date().getFullYear();
    const verfJahre = new Set();
    verfJahre.add(aktJahr);
    verfuegbarkeit.forEach(v => {
        if (v.typ === 'urlaub') {
            verfJahre.add(parseInt(v.von.substring(0, 4)));
        }
    });

    const currentVal = jahrSelect.value;
    jahrSelect.innerHTML = '';
    Array.from(verfJahre).sort().reverse().forEach(j => {
        const opt = document.createElement('option');
        opt.value = j;
        opt.textContent = j;
        jahrSelect.appendChild(opt);
    });
    jahrSelect.value = currentVal || aktJahr;
    const selJahr = parseInt(jahrSelect.value) || aktJahr;

    const maList = mitarbeiterListe_.filter(m => m.urlaubstage > 0);

    if (maList.length === 0) {
        el.innerHTML = '<p style="color:#a0aec0">Keine Mitarbeiter mit Urlaubstagen definiert. Tragen Sie Urlaubstage in der Mitarbeiter-Verwaltung ein.</p>';
        return;
    }

    let html = '<div class="urlaub-grid">';
    maList.forEach(ma => {
        // Urlaubstage zählen: Werktage (Mo-Fr) in allen Urlaubs-Einträgen des Jahres
        const urlaubEintraege = verfuegbarkeit.filter(v =>
            v.mitarbeiter === ma.name && v.typ === 'urlaub' &&
            v.von.substring(0, 4) === String(selJahr)
        );

        let genutzteTage = 0;
        urlaubEintraege.forEach(u => {
            const von = new Date(u.von);
            const bis = new Date(u.bis);
            for (let d = new Date(von); d <= bis; d.setDate(d.getDate() + 1)) {
                const wt = d.getDay();
                if (wt !== 0 && wt !== 6) genutzteTage++;
            }
        });

        const restTage = ma.urlaubstage - genutzteTage;
        const pct = Math.min((genutzteTage / ma.urlaubstage) * 100, 100);

        let barCls = 'urlaub-bar-fill';
        if (restTage <= 0) barCls += ' urlaub-aufgebraucht';
        else if (restTage <= 5) barCls += ' urlaub-wenig';

        html += `<div class="urlaub-row">
            <div class="urlaub-name">${escapeHtml(ma.name)}</div>
            <div class="urlaub-bar-bg">
                <div class="${barCls}" style="width:${pct}%"></div>
            </div>
            <div class="urlaub-werte">
                <span>${genutzteTage} / ${ma.urlaubstage} Tage</span>
                <span class="${restTage >= 0 ? 'trend-up' : 'trend-down'}">Rest: ${restTage}</span>
            </div>
        </div>`;
    });
    html += '</div>';

    el.innerHTML = html;
}

// =============================================
// DIENSTPLAN-WOCHENVORLAGEN
// =============================================
function speichereWochenvorlage() {
    const montag = getMontag(dienstplanJahr, dienstplanKW);
    const tage = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(montag);
        d.setUTCDate(d.getUTCDate() + i);
        tage.push(d.toISOString().split('T')[0]);
    }

    // Alle Einsätze dieser Woche sammeln
    const wochenEinsaetze = einsaetze.filter(e => tage.includes(e.datum));
    if (wochenEinsaetze.length === 0) {
        alert('Keine Einsätze in dieser Woche zum Speichern.');
        return;
    }

    const name = prompt(`Vorlage für KW ${dienstplanKW}/${dienstplanJahr} speichern als:`, `KW ${dienstplanKW} Vorlage`);
    if (!name) return;

    // Einsätze als relative Tage speichern (0=Mo, 6=So)
    const vorlageEinsaetze = wochenEinsaetze.map(e => {
        const tagIdx = tage.indexOf(e.datum);
        return {
            wochentag: tagIdx,
            objekt: e.objekt,
            zeitVon: e.zeitVon,
            zeitBis: e.zeitBis,
            stundensatz: e.stundensatz,
            mitarbeiter: e.mitarbeiter || '',
            bemerkung: e.bemerkung || ''
        };
    });

    wochenvorlagen.push({
        id: Date.now(),
        name,
        erstellt: new Date().toISOString().split('T')[0],
        einsaetze: vorlageEinsaetze
    });

    localStorage.setItem('bbprotect_wochenvorlagen', JSON.stringify(wochenvorlagen));
    alert(`Vorlage "${name}" mit ${vorlageEinsaetze.length} Einsätzen gespeichert!`);
}

function ladeWochenvorlage() {
    if (wochenvorlagen.length === 0) {
        alert('Keine gespeicherten Wochenvorlagen vorhanden.');
        return;
    }

    const auswahl = prompt(
        'Gespeicherte Wochenvorlagen:\n\n' +
        wochenvorlagen.map((v, i) => `${i + 1}. ${v.name} (${v.einsaetze.length} Einsätze, ${formatDatum(v.erstellt)})`).join('\n') +
        '\n\n0 = Vorlage löschen\n\nBitte Nummer eingeben:'
    );

    if (!auswahl) return;
    const idx = parseInt(auswahl) - 1;

    if (parseInt(auswahl) === 0) {
        // Lösch-Dialog
        const delAuswahl = prompt(
            'Welche Vorlage löschen?\n\n' +
            wochenvorlagen.map((v, i) => `${i + 1}. ${v.name}`).join('\n') +
            '\n\nBitte Nummer eingeben:'
        );
        if (!delAuswahl) return;
        const delIdx = parseInt(delAuswahl) - 1;
        if (delIdx >= 0 && delIdx < wochenvorlagen.length) {
            if (confirm(`Vorlage "${wochenvorlagen[delIdx].name}" löschen?`)) {
                wochenvorlagen.splice(delIdx, 1);
                localStorage.setItem('bbprotect_wochenvorlagen', JSON.stringify(wochenvorlagen));
                alert('Vorlage gelöscht.');
            }
        }
        return;
    }

    if (isNaN(idx) || idx < 0 || idx >= wochenvorlagen.length) {
        alert('Ungültige Auswahl.');
        return;
    }

    const vorlage = wochenvorlagen[idx];
    const montag = getMontag(dienstplanJahr, dienstplanKW);

    if (!confirm(`Vorlage "${vorlage.name}" auf KW ${dienstplanKW}/${dienstplanJahr} anwenden?\n\n${vorlage.einsaetze.length} Einsätze werden erstellt.`)) return;

    let count = 0;
    vorlage.einsaetze.forEach(ve => {
        const d = new Date(montag);
        d.setUTCDate(d.getUTCDate() + ve.wochentag);
        const datumStr = d.toISOString().split('T')[0];

        // Prüfe ob bereits ein identischer Einsatz existiert
        const existiert = einsaetze.some(e =>
            e.datum === datumStr && e.zeitVon === ve.zeitVon && e.zeitBis === ve.zeitBis &&
            e.objekt === ve.objekt && e.mitarbeiter === ve.mitarbeiter
        );
        if (existiert) return;

        const berechnung = berechneEinsatz(datumStr, ve.zeitVon, ve.zeitBis, ve.stundensatz);

        einsaetze.push({
            id: Date.now() + count,
            objekt: ve.objekt,
            datum: datumStr,
            zeitVon: ve.zeitVon,
            zeitBis: ve.zeitBis,
            stundensatz: ve.stundensatz,
            mitarbeiter: ve.mitarbeiter,
            bemerkung: ve.bemerkung,
            status: 'geplant',
            ...berechnung
        });
        count++;
    });

    if (count > 0) {
        speichern();
        renderDienstplan();
        renderTabelle();
        updateAlleFilter();
        alert(`${count} Einsätze aus Vorlage erstellt!`);
    } else {
        alert('Keine neuen Einsätze erstellt (alle bereits vorhanden).');
    }
}

// =============================================
// PERSONALKOSTEN-TREND
// =============================================
function renderPersonalkostenTrend() {
    const el = document.getElementById('personalkostenTrend');
    if (!el) return;

    // Letzte 6 Monate ermitteln
    const monate = [];
    const jetzt = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(jetzt.getFullYear(), jetzt.getMonth() - i, 1);
        monate.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const daten = monate.map(m => {
        const monatsE = einsaetze.filter(e => e.datum.substring(0, 7) === m);
        const grundlohn = monatsE.reduce((s, e) => s + e.grundlohn, 0);
        const zuschlaege = monatsE.reduce((s, e) => s + e.zuschlagBetrag, 0);
        const gesamt = monatsE.reduce((s, e) => s + e.gesamt, 0);
        const stunden = monatsE.reduce((s, e) => s + e.stunden, 0);
        const maCount = new Set(monatsE.filter(e => e.mitarbeiter).map(e => e.mitarbeiter)).size;
        return { monat: m, grundlohn, zuschlaege, gesamt, stunden, maCount };
    });

    const maxGesamt = Math.max(...daten.map(d => d.gesamt), 1);

    if (daten.every(d => d.gesamt === 0)) {
        el.innerHTML = '<p style="color:#a0aec0">Noch keine Kostendaten vorhanden.</p>';
        return;
    }

    let html = '<div class="pk-chart">';
    daten.forEach(d => {
        const [j, m] = d.monat.split('-');
        const label = `${MONATSNAMEN[parseInt(m) - 1].substring(0, 3)} ${j.substring(2)}`;
        const grundPct = (d.grundlohn / maxGesamt) * 100;
        const zuschlagPct = (d.zuschlaege / maxGesamt) * 100;

        html += `<div class="pk-spalte">
            <div class="pk-werte">
                <div class="pk-gesamt">${formatEuro(d.gesamt)}</div>
                <div class="pk-detail">${formatZahl(d.stunden)} Std. / ${d.maCount} MA</div>
            </div>
            <div class="pk-bar-container">
                <div class="pk-bar-zuschlag" style="height:${zuschlagPct}%" title="Zuschläge: ${formatEuro(d.zuschlaege)}"></div>
                <div class="pk-bar-grund" style="height:${grundPct}%" title="Grundlohn: ${formatEuro(d.grundlohn)}"></div>
            </div>
            <div class="pk-label">${label}</div>
        </div>`;
    });
    html += '</div>';

    // Legende
    html += '<div class="pk-legende"><span class="pk-leg-item"><span class="pk-leg-color pk-leg-grund"></span>Grundlohn</span><span class="pk-leg-item"><span class="pk-leg-color pk-leg-zuschlag"></span>Zuschläge</span></div>';

    // Zusammenfassung
    const totalGesamt = daten.reduce((s, d) => s + d.gesamt, 0);
    const avgMonat = totalGesamt / daten.filter(d => d.gesamt > 0).length || 0;
    const letzterMonat = daten[daten.length - 1];
    const vorletzter = daten[daten.length - 2];
    const diffPct = vorletzter.gesamt > 0 ? ((letzterMonat.gesamt - vorletzter.gesamt) / vorletzter.gesamt * 100) : 0;

    html += `<div class="pk-summary">
        <span>Gesamt 6 Monate: <strong>${formatEuro(totalGesamt)}</strong></span>
        <span>Durchschnitt/Monat: <strong>${formatEuro(avgMonat)}</strong></span>
        ${vorletzter.gesamt > 0 ? `<span>Trend: <strong class="${diffPct >= 0 ? 'trend-up' : 'trend-down'}">${diffPct >= 0 ? '+' : ''}${diffPct.toFixed(1)}%</strong></span>` : ''}
    </div>`;

    el.innerHTML = html;
}

// =============================================
// EINSATZ-STATUSLEISTE
// =============================================
function updateStatusLeiste() {
    const el = document.getElementById('statusLeiste');
    if (!el) return;

    const filterM = filterMonat.value;
    const filterO = filterObjekt.value;

    let gefiltert = einsaetze;
    if (filterM) gefiltert = gefiltert.filter(e => e.datum.substring(0, 7) === filterM);
    if (filterO) gefiltert = gefiltert.filter(e => e.objekt === filterO);

    if (gefiltert.length === 0) {
        el.innerHTML = '';
        return;
    }

    const counts = { geplant: 0, bestaetigt: 0, abgeschlossen: 0, storniert: 0 };
    gefiltert.forEach(e => {
        const s = e.status || 'geplant';
        if (counts[s] !== undefined) counts[s]++;
    });

    const total = gefiltert.length;

    let html = '<div style="display:flex;gap:2px;width:100%;height:8px;border-radius:4px;overflow:hidden;margin-bottom:0.3rem">';
    if (counts.geplant > 0) html += `<div class="sl-geplant" style="flex:${counts.geplant}" title="Geplant: ${counts.geplant}"></div>`;
    if (counts.bestaetigt > 0) html += `<div class="sl-bestaetigt" style="flex:${counts.bestaetigt}" title="Bestätigt: ${counts.bestaetigt}"></div>`;
    if (counts.abgeschlossen > 0) html += `<div class="sl-abgeschlossen" style="flex:${counts.abgeschlossen}" title="Abgeschlossen: ${counts.abgeschlossen}"></div>`;
    if (counts.storniert > 0) html += `<div class="sl-storniert" style="flex:${counts.storniert}" title="Storniert: ${counts.storniert}"></div>`;
    html += '</div>';

    html += '<div class="sl-legende">';
    html += `<span class="sl-leg-item"><span class="sl-leg-dot sl-geplant"></span>Geplant: ${counts.geplant}</span>`;
    html += `<span class="sl-leg-item"><span class="sl-leg-dot sl-bestaetigt"></span>Bestätigt: ${counts.bestaetigt}</span>`;
    html += `<span class="sl-leg-item"><span class="sl-leg-dot sl-abgeschlossen"></span>Abgeschlossen: ${counts.abgeschlossen}</span>`;
    html += `<span class="sl-leg-item"><span class="sl-leg-dot sl-storniert"></span>Storniert: ${counts.storniert}</span>`;
    html += '</div>';

    el.innerHTML = html;
}

// =============================================
// ERWEITERTE FILTERUNG (STATUS-CHIPS)
// =============================================
function filterStatus(status) {
    aktuellerStatusFilter = status;

    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.classList.toggle('aktiv', chip.dataset.filter === status);
    });

    renderTabelle();
}

// =============================================
// AUTO-SCHICHTEMPFEHLUNG
// =============================================
function updateAutoEmpfehlung() {
    const el = document.getElementById('autoEmpfehlung');
    const result = document.getElementById('autoEmpfehlungResult');
    if (!el || !result) return;

    const datum = document.getElementById('datum').value;
    const zeitVon = document.getElementById('zeitVon').value;
    const zeitBis = document.getElementById('zeitBis').value;
    const objekt = document.getElementById('objekt').value.trim();

    if (!datum || !zeitVon || !zeitBis || mitarbeiterListe_.length === 0) {
        el.style.display = 'none';
        return;
    }

    el.style.display = 'block';

    // Score-Berechnung pro MA
    const scores = mitarbeiterListe_.map(m => {
        let score = 100;
        let details = [];

        // Verfügbarkeit prüfen
        const abwesend = verfuegbarkeit.find(v =>
            v.mitarbeiter === m.name && v.von <= datum && v.bis >= datum
        );
        if (abwesend) {
            return { name: m.name, score: -1, details: ['Abwesend'], verfuegbar: false };
        }

        // Bereits eingeteilt an diesem Tag?
        const tagesEinsaetze = einsaetze.filter(e => e.mitarbeiter === m.name && e.datum === datum);
        if (tagesEinsaetze.length > 0) {
            score -= 40;
            details.push(`${tagesEinsaetze.length} Einsatz(e) am Tag`);
        }

        // Objekt-Erfahrung
        if (objekt) {
            const objErfahrung = einsaetze.filter(e => e.mitarbeiter === m.name && e.objekt === objekt).length;
            if (objErfahrung > 0) {
                score += Math.min(objErfahrung * 5, 30);
                details.push(`${objErfahrung}x am Objekt`);
            }
        }

        // Überstunden vermeiden
        const monat = datum.substring(0, 7);
        const monatStd = einsaetze.filter(e => e.mitarbeiter === m.name && e.datum.substring(0, 7) === monat).reduce((s, e) => s + e.stunden, 0);
        if (m.sollStunden > 0 && monatStd >= m.sollStunden) {
            score -= 20;
            details.push('Soll erreicht');
        }

        return { name: m.name, score, details, verfuegbar: true };
    });

    const verfuegbare = scores.filter(s => s.verfuegbar).sort((a, b) => b.score - a.score);

    if (verfuegbare.length === 0) {
        result.innerHTML = '<p style="color:#a0aec0;font-size:0.8rem">Keine MA verfügbar.</p>';
        return;
    }

    let html = '';
    verfuegbare.slice(0, 5).forEach((s, i) => {
        html += `<div class="ap-row">
            <span>${i === 0 ? '<span class="ap-empfehlung">Empfohlen</span> ' : ''}${escapeHtml(s.name)}</span>
            <span class="ap-score">${s.details.join(' | ')} (Score: ${s.score})</span>
        </div>`;
    });

    result.innerHTML = html;
}

// Listener für Auto-Empfehlung
document.getElementById('zeitVon').addEventListener('change', updateAutoEmpfehlung);
document.getElementById('zeitBis').addEventListener('change', updateAutoEmpfehlung);
document.getElementById('objekt').addEventListener('change', updateAutoEmpfehlung);

// =============================================
// TAGESNOTIZEN
// =============================================
function tagesnotizSpeichern(datum) {
    const input = document.getElementById('tnInput_' + datum.replace(/-/g, ''));
    if (!input) return;

    const text = input.value.trim();
    if (!text) return;

    if (!tagesnotizen[datum]) tagesnotizen[datum] = [];
    tagesnotizen[datum].push({
        id: Date.now(),
        text,
        zeit: new Date().toISOString()
    });

    localStorage.setItem('bbprotect_tagesnotizen', JSON.stringify(tagesnotizen));
    input.value = '';
    renderKalender();
}

function tagesnotizLoeschen(datum, id) {
    if (!tagesnotizen[datum]) return;
    tagesnotizen[datum] = tagesnotizen[datum].filter(n => n.id !== id);
    if (tagesnotizen[datum].length === 0) delete tagesnotizen[datum];
    localStorage.setItem('bbprotect_tagesnotizen', JSON.stringify(tagesnotizen));
}

// =============================================
// ERWEITERTE EXPORT-OPTIONEN
// =============================================
function exportJSON() {
    const filterM = filterMonat.value;
    let gefiltert = einsaetze;
    if (filterM) gefiltert = gefiltert.filter(e => e.datum.substring(0, 7) === filterM);

    if (gefiltert.length === 0) { alert('Keine Einsätze zum Exportieren.'); return; }

    const data = {
        export_datum: new Date().toISOString(),
        zeitraum: filterM || 'Alle',
        anzahl: gefiltert.length,
        einsaetze: gefiltert
    };

    downloadFile(
        `BBProtect_Einsaetze_${filterM || 'Alle'}.json`,
        JSON.stringify(data, null, 2),
        'application/json'
    );
}

function exportDetailCSV() {
    const filterM = filterMonat.value;
    let gefiltert = einsaetze;
    if (filterM) gefiltert = gefiltert.filter(e => e.datum.substring(0, 7) === filterM);

    if (gefiltert.length === 0) { alert('Keine Einsätze zum Exportieren.'); return; }

    gefiltert.sort((a, b) => a.datum.localeCompare(b.datum) || a.zeitVon.localeCompare(b.zeitVon));

    const header = 'Datum;Wochentag;Objekt;Mitarbeiter;Von;Bis;Stunden;Nacht-Std.;Pause;Stundensatz;Grundlohn;Zuschlag Nacht;Zuschlag Sonntag;Zuschlag Feiertag;Zuschlag Gesamt;Gesamt;Status;Bemerkung';
    const wochentage = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

    const rows = gefiltert.map(e => {
        const wt = wochentage[new Date(e.datum).getDay()];
        const nachtZ = e.zuschlagDetails.find(z => z.typ === 'Nacht');
        const sonntagZ = e.zuschlagDetails.find(z => z.typ === 'Sonntag');
        const feiertagZ = e.zuschlagDetails.find(z => z.typ === 'Feiertag');

        return [
            formatDatum(e.datum), wt, e.objekt, e.mitarbeiter || '',
            e.zeitVon, e.zeitBis, formatZahl(e.stunden), formatZahl(e.nachtStunden),
            e.pauseMinuten || 0, formatZahl(e.stundensatz),
            formatZahl(e.grundlohn),
            nachtZ ? formatZahl(nachtZ.betrag) : '0,00',
            sonntagZ ? formatZahl(sonntagZ.betrag) : '0,00',
            feiertagZ ? formatZahl(feiertagZ.betrag) : '0,00',
            formatZahl(e.zuschlagBetrag), formatZahl(e.gesamt),
            STATUS_LABELS[e.status || 'geplant'],
            e.bemerkung || ''
        ].map(x => `"${String(x).replace(/"/g, '""')}"`).join(';');
    });

    downloadFile(
        `BBProtect_Detail_${filterM || 'Alle'}.csv`,
        '\uFEFF' + header + '\n' + rows.join('\n'),
        'text/csv;charset=utf-8;'
    );
}

// =============================================
// MEHRFACHAUSWAHL & MASSENAKTIONEN
// =============================================
function bulkUpdateCount() {
    const checked = document.querySelectorAll('.bulk-item-cb:checked');
    const bar = document.getElementById('bulkActions');
    const count = document.getElementById('bulkCount');

    if (checked.length > 0) {
        bar.style.display = 'flex';
        count.textContent = `${checked.length} ausgewählt`;
    } else {
        bar.style.display = 'none';
    }
}

function bulkAlleWaehlen(checked) {
    document.querySelectorAll('.bulk-item-cb').forEach(cb => { cb.checked = checked; });
    bulkUpdateCount();
}

function bulkAbwaehlen() {
    document.querySelectorAll('.bulk-item-cb').forEach(cb => { cb.checked = false; });
    document.getElementById('bulkSelectAll').checked = false;
    bulkUpdateCount();
}

function bulkGetIds() {
    return Array.from(document.querySelectorAll('.bulk-item-cb:checked')).map(cb => parseInt(cb.dataset.id));
}

function bulkStatusAendern(neuerStatus) {
    const ids = bulkGetIds();
    if (ids.length === 0) return;

    if (!confirm(`${ids.length} Einsätze auf "${STATUS_LABELS[neuerStatus]}" setzen?`)) return;

    ids.forEach(id => {
        const e = einsaetze.find(x => x.id === id);
        if (e) e.status = neuerStatus;
    });

    speichern();
    renderTabelle();
    bulkAbwaehlen();
}

function bulkLoeschen() {
    const ids = bulkGetIds();
    if (ids.length === 0) return;

    if (!confirm(`${ids.length} Einsätze wirklich löschen?`)) return;
    if (ids.length > 5 && !confirm(`Wirklich ${ids.length} Einsätze unwiderruflich löschen?`)) return;

    einsaetze = einsaetze.filter(e => !ids.includes(e.id));
    speichern();
    renderTabelle();
    updateAlleFilter();
    updateDataLists();
    bulkAbwaehlen();
}

// =============================================
// MA-VERFÜGBARKEITSANZEIGE
// =============================================
function updateVerfAnzeige() {
    const datumField = document.getElementById('datum');
    const anzeige = document.getElementById('verfAnzeige');
    const liste = document.getElementById('verfMaList');
    if (!anzeige || !liste || !datumField.value) {
        if (anzeige) anzeige.style.display = 'none';
        return;
    }

    const datum = datumField.value;

    if (mitarbeiterListe_.length === 0) {
        anzeige.style.display = 'none';
        return;
    }

    anzeige.style.display = 'block';
    let html = '';

    mitarbeiterListe_.forEach(m => {
        const abwesend = verfuegbarkeit.find(v =>
            v.mitarbeiter === m.name && v.von <= datum && v.bis >= datum
        );
        const hatSchicht = einsaetze.some(e => e.mitarbeiter === m.name && e.datum === datum);

        if (abwesend) {
            const typLabels = { urlaub: 'U', krank: 'K', frei: 'F', fortbildung: 'FB' };
            html += `<span class="verf-ma-chip nicht-verfuegbar" title="${m.name}: ${abwesend.typ}">${escapeHtml(m.name)} (${typLabels[abwesend.typ] || '?'})</span>`;
        } else if (hatSchicht) {
            html += `<span class="verf-ma-chip nicht-verfuegbar" title="${m.name}: bereits eingeteilt">${escapeHtml(m.name)} (belegt)</span>`;
        } else {
            html += `<span class="verf-ma-chip verfuegbar" title="${m.name}: verfügbar">${escapeHtml(m.name)}</span>`;
        }
    });

    liste.innerHTML = html;
}

// Datum-Feld Listener für Verfügbarkeitsanzeige
document.getElementById('datum').addEventListener('change', updateVerfAnzeige);

// =============================================
// EINSATZ-NOTIZEN-VERLAUF
// =============================================
function einsatzNotizHinzufuegen(id) {
    const input = document.getElementById('notizInput_' + id);
    if (!input) return;

    const text = input.value.trim();
    if (!text) return;

    const einsatz = einsaetze.find(e => e.id === id);
    if (!einsatz) return;

    if (!einsatz.notizen) einsatz.notizen = [];

    einsatz.notizen.push({
        zeit: new Date().toISOString(),
        text
    });

    speichern();
    input.value = '';
    renderTabelle();
}

function renderNotizVerlauf(einsatz) {
    if (!einsatz.notizen || einsatz.notizen.length === 0) return '';

    let html = '<div class="notiz-verlauf">';
    einsatz.notizen.forEach(n => {
        const d = new Date(n.zeit);
        const zeitStr = `${formatDatum(d.toISOString().split('T')[0])} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        html += `<div class="notiz-item"><span class="notiz-meta">${zeitStr}</span> <span class="notiz-text">${escapeHtml(n.text)}</span></div>`;
    });
    html += '</div>';
    return html;
}

// =============================================
// OBJEKT-CHECKLISTEN
// =============================================
function updateChecklisteObjekte() {
    const select = document.getElementById('clObjekt');
    if (!select) return;

    const current = select.value;
    select.innerHTML = '<option value="">Objekt wählen...</option>';
    objekte.forEach(o => {
        const opt = document.createElement('option');
        opt.value = o.name;
        opt.textContent = o.name;
        select.appendChild(opt);
    });
    select.value = current;
}

function checklistePunktHinzufuegen() {
    const objName = document.getElementById('clObjekt').value;
    const input = document.getElementById('clNeuerPunkt');
    const text = input.value.trim();

    if (!objName || !text) {
        alert('Bitte Objekt wählen und Prüfpunkt eingeben.');
        return;
    }

    const obj = objekte.find(o => o.name === objName);
    if (!obj) return;

    if (!obj.checkliste) obj.checkliste = [];
    obj.checkliste.push({ id: Date.now(), text, erledigt: false });

    localStorage.setItem('bbprotect_objekte', JSON.stringify(objekte));
    input.value = '';
    renderCheckliste();
}

function checklisteToggle(objName, punktId) {
    const obj = objekte.find(o => o.name === objName);
    if (!obj || !obj.checkliste) return;

    const punkt = obj.checkliste.find(p => p.id === punktId);
    if (punkt) punkt.erledigt = !punkt.erledigt;

    localStorage.setItem('bbprotect_objekte', JSON.stringify(objekte));
    renderCheckliste();
}

function checklisteLoeschen(objName, punktId) {
    const obj = objekte.find(o => o.name === objName);
    if (!obj || !obj.checkliste) return;

    obj.checkliste = obj.checkliste.filter(p => p.id !== punktId);
    localStorage.setItem('bbprotect_objekte', JSON.stringify(objekte));
    renderCheckliste();
}

function checklisteAlleZuruecksetzen(objName) {
    const obj = objekte.find(o => o.name === objName);
    if (!obj || !obj.checkliste) return;

    obj.checkliste.forEach(p => { p.erledigt = false; });
    localStorage.setItem('bbprotect_objekte', JSON.stringify(objekte));
    renderCheckliste();
}

function renderCheckliste() {
    const el = document.getElementById('checklisteContent');
    const objName = document.getElementById('clObjekt').value;
    if (!el) return;

    if (!objName) {
        el.innerHTML = '<p style="color:#a0aec0;font-size:0.85rem">Bitte ein Objekt auswählen.</p>';
        return;
    }

    const obj = objekte.find(o => o.name === objName);
    if (!obj || !obj.checkliste || obj.checkliste.length === 0) {
        el.innerHTML = '<p style="color:#a0aec0;font-size:0.85rem">Keine Prüfpunkte für dieses Objekt. Fügen Sie oben welche hinzu.</p>';
        return;
    }

    const erledigtCount = obj.checkliste.filter(p => p.erledigt).length;
    const total = obj.checkliste.length;

    let html = `<div class="checkliste-section">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.3rem">
            <span style="font-size:0.8rem;color:#718096">${erledigtCount}/${total} erledigt</span>
            <button class="btn-secondary btn-small" onclick="checklisteAlleZuruecksetzen('${escapeHtml(objName).replace(/'/g, "\\'")}')">Zurücksetzen</button>
        </div>`;

    obj.checkliste.forEach(p => {
        const safeObj = escapeHtml(objName).replace(/'/g, "\\'");
        html += `<div class="cl-item">
            <input type="checkbox" ${p.erledigt ? 'checked' : ''} onchange="checklisteToggle('${safeObj}',${p.id})">
            <span class="cl-label ${p.erledigt ? 'erledigt' : ''}">${escapeHtml(p.text)}</span>
            <button class="btn-delete btn-small" onclick="checklisteLoeschen('${safeObj}',${p.id})" style="padding:0.1rem 0.3rem;font-size:0.65rem">X</button>
        </div>`;
    });

    html += '</div>';
    el.innerHTML = html;
}

// =============================================
// MONATS-GESAMTBERICHT
// =============================================
function druckeGesamtbericht() {
    const filterM = document.getElementById('filterMonat').value;
    if (!filterM) {
        alert('Bitte einen Monat auswählen für den Gesamtbericht.');
        return;
    }

    const [j, m] = filterM.split('-');
    const monatLabel = `${MONATSNAMEN[parseInt(m) - 1]} ${j}`;
    const monatsE = einsaetze.filter(e => e.datum.substring(0, 7) === filterM);

    if (monatsE.length === 0) {
        alert('Keine Einsätze in diesem Monat.');
        return;
    }

    // Gesamtstatistiken
    const totalStd = monatsE.reduce((s, e) => s + e.stunden, 0);
    const totalGesamt = monatsE.reduce((s, e) => s + e.gesamt, 0);
    const totalGrund = monatsE.reduce((s, e) => s + e.grundlohn, 0);
    const totalZuschlag = monatsE.reduce((s, e) => s + e.zuschlagBetrag, 0);
    const totalNacht = monatsE.reduce((s, e) => s + e.nachtStunden, 0);
    const arbeitstage = new Set(monatsE.map(e => e.datum)).size;
    const maSet = new Set(monatsE.filter(e => e.mitarbeiter).map(e => e.mitarbeiter));
    const objSet = new Set(monatsE.map(e => e.objekt));

    let html = `<div class="bericht-header">
        <h1>B.B. Protect</h1>
        <h2>Monatsbericht ${monatLabel}</h2>
        <p>Erstellt am ${formatDatum(new Date().toISOString().split('T')[0])}</p>
    </div>`;

    // Zusammenfassung
    html += `<div class="bericht-section">
        <h3>Zusammenfassung</h3>
        <table><tbody>
            <tr><td><strong>Einsätze</strong></td><td>${monatsE.length}</td><td><strong>Arbeitstage</strong></td><td>${arbeitstage}</td></tr>
            <tr><td><strong>Stunden gesamt</strong></td><td>${formatZahl(totalStd)}</td><td><strong>davon Nacht</strong></td><td>${formatZahl(totalNacht)}</td></tr>
            <tr><td><strong>Grundlohn</strong></td><td>${formatEuro(totalGrund)}</td><td><strong>Zuschläge</strong></td><td>${formatEuro(totalZuschlag)}</td></tr>
            <tr><td><strong>Gesamtumsatz</strong></td><td>${formatEuro(totalGesamt)}</td><td><strong>Mitarbeiter</strong></td><td>${maSet.size}</td></tr>
        </tbody></table>
    </div>`;

    // Aufschlüsselung nach Objekt
    html += '<div class="bericht-section"><h3>Aufschlüsselung nach Objekt</h3>';
    html += '<table><thead><tr><th>Objekt</th><th>Einsätze</th><th>Stunden</th><th>Grundlohn</th><th>Zuschläge</th><th>Gesamt</th></tr></thead><tbody>';

    const objMap = {};
    monatsE.forEach(e => {
        if (!objMap[e.objekt]) objMap[e.objekt] = { cnt: 0, std: 0, grund: 0, zuschlag: 0, gesamt: 0 };
        objMap[e.objekt].cnt++;
        objMap[e.objekt].std += e.stunden;
        objMap[e.objekt].grund += e.grundlohn;
        objMap[e.objekt].zuschlag += e.zuschlagBetrag;
        objMap[e.objekt].gesamt += e.gesamt;
    });

    Object.entries(objMap).sort((a, b) => b[1].gesamt - a[1].gesamt).forEach(([name, d]) => {
        html += `<tr><td>${escapeHtml(name)}</td><td>${d.cnt}</td><td>${formatZahl(d.std)}</td><td>${formatEuro(d.grund)}</td><td>${formatEuro(d.zuschlag)}</td><td><strong>${formatEuro(d.gesamt)}</strong></td></tr>`;
    });
    html += '</tbody></table></div>';

    // Aufschlüsselung nach Mitarbeiter
    html += '<div class="bericht-section"><h3>Aufschlüsselung nach Mitarbeiter</h3>';
    html += '<table><thead><tr><th>Mitarbeiter</th><th>Einsätze</th><th>Stunden</th><th>Nacht-Std.</th><th>Grundlohn</th><th>Zuschläge</th><th>Gesamt</th></tr></thead><tbody>';

    const maMap = {};
    monatsE.forEach(e => {
        const name = e.mitarbeiter || 'Nicht zugewiesen';
        if (!maMap[name]) maMap[name] = { cnt: 0, std: 0, nacht: 0, grund: 0, zuschlag: 0, gesamt: 0 };
        maMap[name].cnt++;
        maMap[name].std += e.stunden;
        maMap[name].nacht += e.nachtStunden;
        maMap[name].grund += e.grundlohn;
        maMap[name].zuschlag += e.zuschlagBetrag;
        maMap[name].gesamt += e.gesamt;
    });

    Object.entries(maMap).sort((a, b) => b[1].gesamt - a[1].gesamt).forEach(([name, d]) => {
        html += `<tr><td>${escapeHtml(name)}</td><td>${d.cnt}</td><td>${formatZahl(d.std)}</td><td>${formatZahl(d.nacht)}</td><td>${formatEuro(d.grund)}</td><td>${formatEuro(d.zuschlag)}</td><td><strong>${formatEuro(d.gesamt)}</strong></td></tr>`;
    });
    html += '</tbody></table></div>';

    // Einsatzliste
    monatsE.sort((a, b) => a.datum.localeCompare(b.datum) || a.zeitVon.localeCompare(b.zeitVon));

    html += '<div class="bericht-section"><h3>Einsatzliste</h3>';
    html += '<table><thead><tr><th>Nr.</th><th>Datum</th><th>Objekt</th><th>Mitarbeiter</th><th>Von</th><th>Bis</th><th>Std.</th><th>Gesamt</th></tr></thead><tbody>';

    monatsE.forEach((e, i) => {
        html += `<tr><td>${i + 1}</td><td>${formatDatum(e.datum)}</td><td>${escapeHtml(e.objekt)}</td><td>${escapeHtml(e.mitarbeiter || '\u2014')}</td><td>${e.zeitVon}</td><td>${e.zeitBis}</td><td>${formatZahl(e.stunden)}</td><td>${formatEuro(e.gesamt)}</td></tr>`;
    });

    html += `</tbody><tfoot><tr class="total-row"><td colspan="6"><strong>GESAMT</strong></td><td><strong>${formatZahl(totalStd)}</strong></td><td><strong>${formatEuro(totalGesamt)}</strong></td></tr></tfoot></table></div>`;

    // Vorfälle des Monats
    const monatsV = vorfaelle.filter(v => v.datum.substring(0, 7) === filterM);
    if (monatsV.length > 0) {
        html += '<div class="bericht-section"><h3>Vorfälle im Monat (' + monatsV.length + ')</h3>';
        html += '<table><thead><tr><th>Datum</th><th>Objekt</th><th>Typ</th><th>Schwere</th><th>Beschreibung</th></tr></thead><tbody>';
        monatsV.sort((a, b) => a.datum.localeCompare(b.datum)).forEach(v => {
            html += `<tr><td>${formatDatum(v.datum)}</td><td>${escapeHtml(v.objekt)}</td><td>${escapeHtml(VORFALL_TYPEN[v.typ] || v.typ)}</td><td>${escapeHtml(SCHWERE_LABELS[v.schwere] || v.schwere)}</td><td>${escapeHtml(v.beschreibung)}</td></tr>`;
        });
        html += '</tbody></table></div>';
    }

    html += printFooter();
    document.getElementById('printArea').innerHTML = html;
    window.print();
}

// =============================================
// GLOBALE SUCHE
// =============================================
function globalSuchen(query) {
    const box = document.getElementById('globaleSucheErgebnis');
    if (!box) return;
    const q = query.toLowerCase().trim();
    if (q.length < 2) { box.style.display = 'none'; return; }

    const ergebnisse = [];

    // Einsätze durchsuchen
    einsaetze.forEach(e => {
        if (e.objekt.toLowerCase().includes(q) || (e.mitarbeiter || '').toLowerCase().includes(q) || (e.bemerkung || '').toLowerCase().includes(q) || formatDatum(e.datum).includes(q)) {
            ergebnisse.push({ typ: 'Einsatz', text: `${formatDatum(e.datum)} - ${e.objekt} (${e.mitarbeiter || '\u2014'})`, tab: 'erfassung' });
        }
    });

    // Mitarbeiter
    mitarbeiterListe_.forEach(m => {
        if (m.name.toLowerCase().includes(q) || (m.telefon || '').includes(q) || (m.email || '').toLowerCase().includes(q)) {
            ergebnisse.push({ typ: 'Mitarbeiter', text: `${m.name}${m.telefon ? ' - ' + m.telefon : ''}`, tab: 'mitarbeiter' });
        }
    });

    // Objekte
    objekte.forEach(o => {
        if (o.name.toLowerCase().includes(q) || (o.adresse || '').toLowerCase().includes(q) || (o.ansprechpartner || '').toLowerCase().includes(q)) {
            ergebnisse.push({ typ: 'Objekt', text: `${o.name}${o.adresse ? ' - ' + o.adresse : ''}`, tab: 'objekte' });
        }
    });

    // Vorfälle
    vorfaelle.forEach(v => {
        if (v.objekt.toLowerCase().includes(q) || v.beschreibung.toLowerCase().includes(q) || (v.mitarbeiter || '').toLowerCase().includes(q)) {
            ergebnisse.push({ typ: 'Vorfall', text: `${formatDatum(v.datum)} - ${v.objekt}: ${v.beschreibung.substring(0, 60)}`, tab: 'vorfaelle' });
        }
    });

    // Wachbuch
    wachbuch.forEach(w => {
        if (w.objekt.toLowerCase().includes(q) || w.eintrag.toLowerCase().includes(q) || (w.mitarbeiter || '').toLowerCase().includes(q)) {
            ergebnisse.push({ typ: 'Wachbuch', text: `${formatDatum(w.datum)} - ${w.objekt}: ${w.eintrag.substring(0, 60)}`, tab: 'wachbuch' });
        }
    });

    if (ergebnisse.length === 0) {
        box.innerHTML = '<div class="gs-leer">Keine Ergebnisse gefunden.</div>';
    } else {
        let html = '';
        const max = Math.min(ergebnisse.length, 12);
        for (let i = 0; i < max; i++) {
            const r = ergebnisse[i];
            html += `<div class="gs-item" onclick="globalSucheNavigieren('${r.tab}')"><span class="gs-typ">${escapeHtml(r.typ)}</span> ${escapeHtml(r.text)}</div>`;
        }
        if (ergebnisse.length > 12) html += `<div class="gs-mehr">...und ${ergebnisse.length - 12} weitere Ergebnisse</div>`;
        box.innerHTML = html;
    }
    box.style.display = 'block';
}

function globalSucheNavigieren(tab) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    const btn = document.querySelector(`.nav-btn[data-tab="${tab}"]`);
    if (btn) btn.classList.add('active');
    document.getElementById('tab-' + tab).classList.add('active');
    document.getElementById('globaleSucheErgebnis').style.display = 'none';
    document.getElementById('globaleSuche').value = '';
}

// Globale Suche schließen bei Klick außerhalb
document.addEventListener('click', function (e) {
    const box = document.getElementById('globaleSucheErgebnis');
    const input = document.getElementById('globaleSuche');
    if (box && !box.contains(e.target) && e.target !== input) {
        box.style.display = 'none';
    }
});

// =============================================
// ARBEITSZEITKONTO
// =============================================
function renderArbeitszeitkonto() {
    const el = document.getElementById('arbeitszeitkontoContent');
    if (!el) return;

    // Monatsselektor befüllen
    const sel = document.getElementById('azkMonat');
    if (sel && sel.options.length <= 1) {
        const monate = new Set();
        einsaetze.forEach(e => monate.add(e.datum.substring(0, 7)));
        const jetzt = new Date();
        monate.add(`${jetzt.getFullYear()}-${String(jetzt.getMonth() + 1).padStart(2, '0')}`);
        const sorted = [...monate].sort().reverse();
        sel.innerHTML = '';
        sorted.forEach(m => {
            const [j, mo] = m.split('-');
            sel.innerHTML += `<option value="${m}">${MONATSNAMEN[parseInt(mo) - 1]} ${j}</option>`;
        });
    }

    const filterM = sel ? sel.value : '';
    if (!filterM) return;

    const maList = mitarbeiterListe_.filter(m => m.sollStunden > 0);
    if (maList.length === 0) {
        el.innerHTML = '<p style="color:#a0aec0">Mitarbeiter mit Soll-Stunden anlegen, um das Arbeitszeitkonto zu sehen.</p>';
        return;
    }

    let html = '<div class="azk-grid">';

    maList.forEach(m => {
        const sollStd = m.sollStunden || 0;
        const [filterJahr, filterMonatNr] = filterM.split('-').map(Number);

        // Ist-Stunden diesen Monat
        const istStd = einsaetze.filter(e => e.mitarbeiter === m.name && e.datum.substring(0, 7) === filterM)
            .reduce((s, e) => s + e.stunden, 0);

        // Saldo dieses Monats
        const saldo = istStd - sollStd;

        // Kumuliertes Saldo aller vorherigen Monate
        let kumuliert = 0;
        const alleMonate = new Set();
        einsaetze.filter(e => e.mitarbeiter === m.name).forEach(e => alleMonate.add(e.datum.substring(0, 7)));
        [...alleMonate].sort().forEach(monat => {
            if (monat >= filterM) return;
            const monIst = einsaetze.filter(e => e.mitarbeiter === m.name && e.datum.substring(0, 7) === monat)
                .reduce((s, e) => s + e.stunden, 0);
            kumuliert += monIst - sollStd;
        });

        const gesamtSaldo = kumuliert + saldo;
        const pctIst = sollStd > 0 ? Math.min((istStd / sollStd) * 100, 150) : 0;
        const saldoClass = gesamtSaldo >= 0 ? 'azk-positiv' : 'azk-negativ';

        html += `<div class="azk-card">
            <div class="azk-name">${escapeHtml(m.name)}</div>
            <div class="azk-row"><span>Soll:</span><span>${formatZahl(sollStd)} Std.</span></div>
            <div class="azk-row"><span>Ist:</span><span>${formatZahl(istStd)} Std.</span></div>
            <div class="azk-bar-wrap"><div class="azk-bar" style="width:${Math.min(pctIst, 100)}%"></div>${pctIst > 100 ? '<div class="azk-bar-over" style="width:' + Math.min(pctIst - 100, 50) + '%"></div>' : ''}</div>
            <div class="azk-row"><span>Monat:</span><span class="${saldo >= 0 ? 'azk-positiv' : 'azk-negativ'}">${saldo >= 0 ? '+' : ''}${formatZahl(saldo)} Std.</span></div>
            <div class="azk-row azk-gesamt"><span>Gesamt-Saldo:</span><span class="${saldoClass}">${gesamtSaldo >= 0 ? '+' : ''}${formatZahl(gesamtSaldo)} Std.</span></div>
        </div>`;
    });

    html += '</div>';
    el.innerHTML = html;
}

// =============================================
// EINSATZ-KONFLIKTERKENNUNG
// =============================================
function findeKonflikte() {
    const konflikte = [];
    const maEinsaetze = {};

    einsaetze.filter(e => e.mitarbeiter && (e.status || 'geplant') !== 'storniert').forEach(e => {
        const key = e.mitarbeiter + '_' + e.datum;
        if (!maEinsaetze[key]) maEinsaetze[key] = [];
        maEinsaetze[key].push(e);
    });

    Object.entries(maEinsaetze).forEach(([key, liste]) => {
        if (liste.length < 2) return;

        // Prüfe auf Überschneidungen
        for (let i = 0; i < liste.length; i++) {
            for (let j = i + 1; j < liste.length; j++) {
                const a = liste[i], b = liste[j];
                // Zeitüberschneidung prüfen
                const aVon = a.zeitVon.replace(':', '');
                const aBis = a.zeitBis.replace(':', '');
                const bVon = b.zeitVon.replace(':', '');
                const bBis = b.zeitBis.replace(':', '');

                let ueberschneidung = false;
                if (aBis <= aVon) {
                    // Nachtschicht a: überschneidet fast alles am selben Tag
                    ueberschneidung = true;
                } else if (bBis <= bVon) {
                    ueberschneidung = true;
                } else {
                    ueberschneidung = aVon < bBis && bVon < aBis;
                }

                if (ueberschneidung) {
                    konflikte.push({
                        ma: a.mitarbeiter,
                        datum: a.datum,
                        schichtA: `${a.zeitVon}-${a.zeitBis} (${a.objekt})`,
                        schichtB: `${b.zeitVon}-${b.zeitBis} (${b.objekt})`
                    });
                }
            }
        }
    });

    return konflikte;
}

function renderKonflikte() {
    const el = document.getElementById('konfliktAnzeige');
    if (!el) return;

    const konflikte = findeKonflikte();

    if (konflikte.length === 0) {
        el.innerHTML = '<p style="color:#48bb78;font-size:0.85rem">Keine Konflikte erkannt.</p>';
        return;
    }

    let html = `<div class="konflikt-warn">${konflikte.length} Konflikt${konflikte.length > 1 ? 'e' : ''} erkannt:</div>`;
    html += '<div class="konflikt-liste">';
    konflikte.slice(0, 10).forEach(k => {
        html += `<div class="konflikt-item">
            <span class="konflikt-ma">${escapeHtml(k.ma)}</span>
            <span class="konflikt-datum">${formatDatum(k.datum)}</span>
            <span class="konflikt-detail">${escapeHtml(k.schichtA)} vs. ${escapeHtml(k.schichtB)}</span>
        </div>`;
    });
    if (konflikte.length > 10) html += `<div class="konflikt-mehr">...und ${konflikte.length - 10} weitere</div>`;
    html += '</div>';
    el.innerHTML = html;
}

// =============================================
// WOCHENTAGE-VERTEILUNG
// =============================================
function renderWochentageVerteilung(gefiltert) {
    const el = document.getElementById('wochentageVerteilung');
    if (!el) return;

    const tage = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    const counts = [0, 0, 0, 0, 0, 0, 0];
    const stunden = [0, 0, 0, 0, 0, 0, 0];

    gefiltert.forEach(e => {
        const d = new Date(e.datum);
        const day = d.getDay();
        counts[day]++;
        stunden[day] += e.stunden;
    });

    const maxCount = Math.max(...counts, 1);
    const maxStd = Math.max(...stunden, 1);

    let html = '<div class="wt-chart">';
    // Zeige Mo-So (verschiebe Sonntag ans Ende)
    const reihenfolge = [1, 2, 3, 4, 5, 6, 0];
    reihenfolge.forEach(i => {
        const pctC = (counts[i] / maxCount) * 100;
        const pctS = (stunden[i] / maxStd) * 100;
        html += `<div class="wt-spalte">
            <div class="wt-bars">
                <div class="wt-bar wt-bar-cnt" style="height:${pctC}%" title="${counts[i]} Einsätze"></div>
                <div class="wt-bar wt-bar-std" style="height:${pctS}%" title="${formatZahl(stunden[i])} Std."></div>
            </div>
            <div class="wt-label">${tage[i]}</div>
            <div class="wt-value">${counts[i]}</div>
        </div>`;
    });
    html += '</div>';
    html += '<div class="wt-legende"><span class="wt-leg-item"><span class="wt-leg-dot wt-bar-cnt"></span> Einsätze</span><span class="wt-leg-item"><span class="wt-leg-dot wt-bar-std"></span> Stunden</span></div>';

    el.innerHTML = html;
}

// =============================================
// SCHICHTÜBERGABE-PROTOKOLL
// =============================================
document.getElementById('uebergabeForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const ug = {
        id: Date.now(),
        datum: document.getElementById('ugDatum').value,
        zeit: document.getElementById('ugZeit').value,
        objekt: document.getElementById('ugObjekt').value.trim(),
        abgebend: document.getElementById('ugAbgebend').value.trim(),
        uebernehmend: document.getElementById('ugUebernehmend').value.trim(),
        besonderheiten: document.getElementById('ugBesonderheiten').value.trim(),
        schluessel: document.getElementById('ugSchluessel').checked,
        funk: document.getElementById('ugFunk').checked,
        rundgang: document.getElementById('ugRundgang').checked
    };

    if (!ug.datum || !ug.zeit || !ug.objekt || !ug.abgebend || !ug.uebernehmend) return;

    uebergaben.push(ug);
    localStorage.setItem('bbprotect_uebergaben', JSON.stringify(uebergaben));
    renderUebergaben();
    this.reset();
    document.getElementById('ugDatum').valueAsDate = new Date();
    const jetzt = new Date();
    document.getElementById('ugZeit').value = `${String(jetzt.getHours()).padStart(2, '0')}:${String(jetzt.getMinutes()).padStart(2, '0')}`;
});

function renderUebergaben() {
    const el = document.getElementById('uebergabeContent');
    if (!el) return;

    if (uebergaben.length === 0) {
        el.innerHTML = '<p style="color:#a0aec0">Noch keine Übergabe-Protokolle.</p>';
        return;
    }

    const sorted = [...uebergaben].sort((a, b) => (b.datum + b.zeit).localeCompare(a.datum + a.zeit));

    let html = '<div class="ug-liste">';
    sorted.slice(0, 20).forEach(ug => {
        const checks = [];
        if (ug.schluessel) checks.push('Schlüssel');
        if (ug.funk) checks.push('Funk');
        if (ug.rundgang) checks.push('Rundgang');

        html += `<div class="ug-item">
            <div class="ug-header">
                <span class="ug-datum">${formatDatum(ug.datum)} ${ug.zeit}</span>
                <span class="ug-objekt">${escapeHtml(ug.objekt)}</span>
                <button class="btn-delete btn-small" onclick="loescheUebergabe(${ug.id})">X</button>
            </div>
            <div class="ug-body">
                <span class="ug-ma">${escapeHtml(ug.abgebend)} &rarr; ${escapeHtml(ug.uebernehmend)}</span>
                ${checks.length > 0 ? '<span class="ug-checks">' + checks.join(', ') + '</span>' : ''}
            </div>
            ${ug.besonderheiten ? '<div class="ug-notiz">' + escapeHtml(ug.besonderheiten) + '</div>' : ''}
        </div>`;
    });
    html += '</div>';
    el.innerHTML = html;
}

function loescheUebergabe(id) {
    if (!confirm('Übergabe-Protokoll löschen?')) return;
    uebergaben = uebergaben.filter(u => u.id !== id);
    localStorage.setItem('bbprotect_uebergaben', JSON.stringify(uebergaben));
    renderUebergaben();
}

// =============================================
// QUALIFIKATIONSMATRIX
// =============================================
function renderQualMatrix() {
    const el = document.getElementById('qualMatrixContent');
    if (!el) return;

    if (mitarbeiterListe_.length === 0) {
        el.innerHTML = '<p style="color:#a0aec0">Mitarbeiter anlegen, um die Matrix zu sehen.</p>';
        return;
    }

    const qualLabels = {
        'unterrichtung': 'Unterrichtung §34a',
        '34a': 'Sachkunde §34a',
        'fachkraft': 'Fachkraft f. Schutz',
        'meister': 'Meister f. Schutz',
        'sonstige': 'Sonstige'
    };

    // Qualifikationshierarchie (höher = besser)
    const qualRang = { 'unterrichtung': 1, '34a': 2, 'fachkraft': 3, 'meister': 4, 'sonstige': 0 };

    // Sammle alle Objekte mit Einsätzen
    const objektSet = new Set();
    einsaetze.forEach(e => { if (e.objekt) objektSet.add(e.objekt); });
    const objekteNamen = [...objektSet].sort();

    let html = '<div class="table-wrapper"><table class="qm-table"><thead><tr><th>Mitarbeiter</th><th>Qualifikation</th><th>Stufe</th>';
    objekteNamen.slice(0, 8).forEach(o => {
        html += `<th class="qm-obj" title="${escapeHtml(o)}">${escapeHtml(o.substring(0, 12))}</th>`;
    });
    html += '</tr></thead><tbody>';

    const sorted = [...mitarbeiterListe_].sort((a, b) => (qualRang[b.qualifikation] || 0) - (qualRang[a.qualifikation] || 0));

    sorted.forEach(m => {
        const rang = qualRang[m.qualifikation] || 0;
        const stufeClass = rang >= 3 ? 'qm-hoch' : rang >= 2 ? 'qm-mittel' : 'qm-niedrig';
        const stufeDots = '\u2605'.repeat(rang) + '\u2606'.repeat(4 - rang);

        html += `<tr><td class="qm-name">${escapeHtml(m.name)}</td>`;
        html += `<td>${escapeHtml(qualLabels[m.qualifikation] || m.qualifikation)}</td>`;
        html += `<td class="${stufeClass}">${stufeDots}</td>`;

        objekteNamen.slice(0, 8).forEach(o => {
            const count = einsaetze.filter(e => e.mitarbeiter === m.name && e.objekt === o).length;
            html += `<td class="qm-count">${count > 0 ? '<span class="qm-badge">' + count + '</span>' : '<span class="qm-leer">\u2014</span>'}</td>`;
        });

        html += '</tr>';
    });

    html += '</tbody></table></div>';
    el.innerHTML = html;
}

// =============================================
// OBJEKT-EINSATZHISTORIE
// =============================================
function updateObjektHistorieSelect() {
    const sel = document.getElementById('ohObjekt');
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = '<option value="">Objekt wählen...</option>';
    objekte.forEach(o => {
        sel.innerHTML += `<option value="${escapeHtml(o.name)}">${escapeHtml(o.name)}</option>`;
    });
    if (current) sel.value = current;
}

function renderObjektHistorie() {
    const el = document.getElementById('objektHistorieContent');
    if (!el) return;

    const objName = document.getElementById('ohObjekt').value;
    if (!objName) {
        el.innerHTML = '<p style="color:#a0aec0">Objekt auswählen, um die Einsatzhistorie zu sehen.</p>';
        return;
    }

    const objEinsaetze = einsaetze.filter(e => e.objekt === objName).sort((a, b) => b.datum.localeCompare(a.datum));

    if (objEinsaetze.length === 0) {
        el.innerHTML = '<p style="color:#a0aec0">Keine Einsätze für dieses Objekt.</p>';
        return;
    }

    // Zusammenfassung
    const totalStd = objEinsaetze.reduce((s, e) => s + e.stunden, 0);
    const totalUmsatz = objEinsaetze.reduce((s, e) => s + e.gesamt, 0);
    const maSet = new Set(objEinsaetze.filter(e => e.mitarbeiter).map(e => e.mitarbeiter));

    // Nach Monat gruppieren
    const monatsGruppen = {};
    objEinsaetze.forEach(e => {
        const m = e.datum.substring(0, 7);
        if (!monatsGruppen[m]) monatsGruppen[m] = { count: 0, stunden: 0, umsatz: 0 };
        monatsGruppen[m].count++;
        monatsGruppen[m].stunden += e.stunden;
        monatsGruppen[m].umsatz += e.gesamt;
    });

    let html = '<div class="oh-summary">';
    html += `<span class="oh-stat">${objEinsaetze.length} Einsätze</span>`;
    html += `<span class="oh-stat">${formatZahl(totalStd)} Stunden</span>`;
    html += `<span class="oh-stat">${formatEuro(totalUmsatz)} Umsatz</span>`;
    html += `<span class="oh-stat">${maSet.size} Mitarbeiter</span>`;
    html += '</div>';

    html += '<div class="oh-monate">';
    Object.entries(monatsGruppen).sort((a, b) => b[0].localeCompare(a[0])).forEach(([monat, d]) => {
        const [j, mo] = monat.split('-');
        html += `<div class="oh-monat-row">
            <span class="oh-monat-label">${MONATSNAMEN[parseInt(mo) - 1]} ${j}</span>
            <span>${d.count} Einsätze</span>
            <span>${formatZahl(d.stunden)} Std.</span>
            <span>${formatEuro(d.umsatz)}</span>
        </div>`;
    });
    html += '</div>';

    // Letzte 10 Einsätze
    html += '<div class="oh-detail"><strong>Letzte Einsätze:</strong></div>';
    html += '<table class="oh-table"><thead><tr><th>Datum</th><th>MA</th><th>Von</th><th>Bis</th><th>Std.</th><th>Gesamt</th></tr></thead><tbody>';
    objEinsaetze.slice(0, 15).forEach(e => {
        html += `<tr><td>${formatDatum(e.datum)}</td><td>${escapeHtml(e.mitarbeiter || '\u2014')}</td><td>${e.zeitVon}</td><td>${e.zeitBis}</td><td>${formatZahl(e.stunden)}</td><td>${formatEuro(e.gesamt)}</td></tr>`;
    });
    html += '</tbody></table>';

    el.innerHTML = html;
}

// =============================================
// KW KOPIEREN (Dienstplan)
// =============================================
function kopiereKW() {
    const zielKW = prompt(`Aktuelle KW ${dienstplanKW}/${dienstplanJahr} kopieren nach:\nBitte Ziel-KW eingeben (z.B. ${dienstplanKW + 1}):`);
    if (!zielKW) return;

    const zielKWNr = parseInt(zielKW);
    if (isNaN(zielKWNr) || zielKWNr < 1 || zielKWNr > 53) {
        alert('Ungültige Kalenderwoche.');
        return;
    }

    // Finde Einsätze der aktuellen KW
    const kwStart = getMontag(dienstplanJahr, dienstplanKW);
    const kwEinsaetze = [];

    for (let d = 0; d < 7; d++) {
        const tag = new Date(kwStart);
        tag.setUTCDate(tag.getUTCDate() + d);
        const tagStr = tag.toISOString().split('T')[0];
        einsaetze.filter(e => e.datum === tagStr).forEach(e => {
            kwEinsaetze.push({ ...e, wochentag: d });
        });
    }

    if (kwEinsaetze.length === 0) {
        alert('Keine Einsätze in der aktuellen KW zum Kopieren.');
        return;
    }

    // Ziel-KW Montag berechnen
    const zielStart = getMontag(dienstplanJahr, zielKWNr);

    let kopiert = 0;
    kwEinsaetze.forEach(e => {
        const zielTag = new Date(zielStart);
        zielTag.setUTCDate(zielTag.getUTCDate() + e.wochentag);
        const zielDatum = zielTag.toISOString().split('T')[0];

        // Prüfe ob schon ein identischer Einsatz existiert
        const existiert = einsaetze.some(ex =>
            ex.datum === zielDatum && ex.objekt === e.objekt && ex.zeitVon === e.zeitVon && ex.zeitBis === e.zeitBis && ex.mitarbeiter === e.mitarbeiter
        );

        if (!existiert) {
            const berechnung = berechneEinsatz(zielDatum, e.zeitVon, e.zeitBis, e.stundensatz);
            einsaetze.push({
                id: Date.now() + kopiert,
                objekt: e.objekt,
                datum: zielDatum,
                zeitVon: e.zeitVon,
                zeitBis: e.zeitBis,
                stundensatz: e.stundensatz,
                mitarbeiter: e.mitarbeiter,
                bemerkung: e.bemerkung || '',
                status: 'geplant',
                ...berechnung
            });
            kopiert++;
        }
    });

    speichern();
    renderTabelle();
    updateAlleFilter();
    renderDienstplan();

    alert(`${kopiert} Einsätze nach KW ${zielKWNr} kopiert.`);
}

// =============================================
// SPEICHERVERBRAUCH & INTEGRITÄT
// =============================================
function updateSpeicherStats() {
    const el = document.getElementById('speicherStats');
    if (!el) return;

    let totalBytes = 0;
    const details = [];
    const keys = ['einsaetze', 'objekte', 'vorlagen', 'mitarbeiter', 'verfuegbarkeit', 'vorfaelle', 'wachbuch', 'dokumente', 'wochenvorlagen', 'tagesnotizen', 'uebergaben', 'notfallkontakte'];

    keys.forEach(key => {
        const val = localStorage.getItem('bbprotect_' + key);
        const bytes = val ? new Blob([val]).size : 0;
        totalBytes += bytes;
        details.push({ key, bytes });
    });

    const maxBytes = 5 * 1024 * 1024; // 5MB localStorage limit
    const pct = (totalBytes / maxBytes) * 100;

    let html = `<div class="sp-bar-wrap"><div class="sp-bar" style="width:${Math.min(pct, 100)}%"></div></div>`;
    html += `<div class="sp-info">${formatBytes(totalBytes)} / ${formatBytes(maxBytes)} (${pct.toFixed(1)}%)</div>`;
    html += '<div class="sp-details">';
    details.sort((a, b) => b.bytes - a.bytes).forEach(d => {
        html += `<div class="sp-row"><span>${d.key}</span><span>${formatBytes(d.bytes)}</span></div>`;
    });
    html += '</div>';
    el.innerHTML = html;
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function pruefeDatenIntegritaet() {
    const el = document.getElementById('integritaetErgebnis');
    if (!el) return;

    const probleme = [];

    // Prüfe Einsätze
    einsaetze.forEach((e, i) => {
        if (!e.id) probleme.push(`Einsatz #${i}: fehlende ID`);
        if (!e.datum) probleme.push(`Einsatz #${i}: fehlendes Datum`);
        if (!e.objekt) probleme.push(`Einsatz #${i}: fehlendes Objekt`);
        if (!e.zeitVon || !e.zeitBis) probleme.push(`Einsatz #${i}: fehlende Zeiten`);
        if (isNaN(e.stunden) || e.stunden <= 0) probleme.push(`Einsatz ${e.id}: ungültige Stunden (${e.stunden})`);
        if (isNaN(e.gesamt)) probleme.push(`Einsatz ${e.id}: ungültiger Gesamtbetrag`);
    });

    // Prüfe MA-Referenzen
    const maNames = new Set(mitarbeiterListe_.map(m => m.name));
    einsaetze.forEach(e => {
        if (e.mitarbeiter && !maNames.has(e.mitarbeiter)) {
            probleme.push(`Einsatz ${formatDatum(e.datum)}: MA "${e.mitarbeiter}" nicht in MA-Liste`);
        }
    });

    // Prüfe Objekt-Referenzen
    const objNames = new Set(objekte.map(o => o.name));
    einsaetze.forEach(e => {
        if (e.objekt && objNames.size > 0 && !objNames.has(e.objekt)) {
            probleme.push(`Einsatz ${formatDatum(e.datum)}: Objekt "${e.objekt}" nicht in Objektliste`);
        }
    });

    // Prüfe Duplikate
    const dupCheck = new Set();
    einsaetze.forEach(e => {
        const key = `${e.datum}_${e.objekt}_${e.zeitVon}_${e.zeitBis}_${e.mitarbeiter}`;
        if (dupCheck.has(key)) {
            probleme.push(`Mögliches Duplikat: ${formatDatum(e.datum)} ${e.objekt} ${e.zeitVon}-${e.zeitBis} ${e.mitarbeiter || ''}`);
        }
        dupCheck.add(key);
    });

    if (probleme.length === 0) {
        el.innerHTML = '<div class="integ-ok">Alle Daten sind konsistent. Keine Probleme gefunden.</div>';
    } else {
        let html = `<div class="integ-warn">${probleme.length} Problem${probleme.length > 1 ? 'e' : ''} gefunden:</div>`;
        html += '<div class="integ-liste">';
        probleme.slice(0, 20).forEach(p => {
            html += `<div class="integ-item">${escapeHtml(p)}</div>`;
        });
        if (probleme.length > 20) html += `<div class="integ-mehr">...und ${probleme.length - 20} weitere</div>`;
        html += '</div>';
        el.innerHTML = html;
    }
}

// =============================================
// MONATS-HEATMAP
// =============================================
function renderHeatmap(filterM) {
    const el = document.getElementById('heatmapContent');
    if (!el) return;

    if (!filterM) {
        const jetzt = new Date();
        filterM = `${jetzt.getFullYear()}-${String(jetzt.getMonth() + 1).padStart(2, '0')}`;
    }

    const [jahr, monat] = filterM.split('-').map(Number);
    const ersterTag = new Date(jahr, monat - 1, 1);
    const letzterTag = new Date(jahr, monat, 0);
    const tageImMonat = letzterTag.getDate();

    // Zähle Einsätze pro Tag
    const tagesDaten = {};
    for (let t = 1; t <= tageImMonat; t++) {
        const tagStr = `${filterM}-${String(t).padStart(2, '0')}`;
        const tagesE = einsaetze.filter(e => e.datum === tagStr);
        tagesDaten[t] = { count: tagesE.length, stunden: tagesE.reduce((s, e) => s + e.stunden, 0) };
    }

    const maxCount = Math.max(...Object.values(tagesDaten).map(d => d.count), 1);
    const tageLabels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

    let html = '<div class="hm-grid">';

    // Header (Wochentage)
    tageLabels.forEach(l => { html += `<div class="hm-header">${l}</div>`; });

    // Leere Zellen vor dem 1. des Monats
    let startTag = ersterTag.getDay();
    if (startTag === 0) startTag = 7;
    for (let i = 1; i < startTag; i++) {
        html += '<div class="hm-cell hm-leer"></div>';
    }

    for (let t = 1; t <= tageImMonat; t++) {
        const d = tagesDaten[t];
        const intensity = d.count / maxCount;
        const level = d.count === 0 ? 0 : intensity < 0.25 ? 1 : intensity < 0.5 ? 2 : intensity < 0.75 ? 3 : 4;
        const tagStr = `${filterM}-${String(t).padStart(2, '0')}`;
        const feiertag = istFeiertag(tagStr);
        const datumObj = new Date(jahr, monat - 1, t);
        const istSo = datumObj.getDay() === 0;

        html += `<div class="hm-cell hm-l${level}${feiertag ? ' hm-feiertag' : ''}${istSo ? ' hm-sonntag' : ''}" title="${t}. ${MONATSNAMEN[monat - 1]}: ${d.count} Einsätze, ${formatZahl(d.stunden)} Std.">
            <span class="hm-tag">${t}</span>
            ${d.count > 0 ? '<span class="hm-cnt">' + d.count + '</span>' : ''}
        </div>`;
    }
    html += '</div>';

    // Legende
    html += '<div class="hm-legende"><span class="hm-leg-label">Wenig</span>';
    for (let i = 0; i <= 4; i++) {
        html += `<span class="hm-leg-box hm-l${i}"></span>`;
    }
    html += '<span class="hm-leg-label">Viel</span></div>';

    el.innerHTML = html;
}

// =============================================
// MA-SCHICHTHISTORIE
// =============================================
function updateSchichtHistorieSelect() {
    const sel = document.getElementById('shMa');
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = '<option value="">Mitarbeiter wählen...</option>';
    mitarbeiterListe_.forEach(m => {
        sel.innerHTML += `<option value="${escapeHtml(m.name)}">${escapeHtml(m.name)}</option>`;
    });
    if (current) sel.value = current;
}

function renderSchichtHistorie() {
    const el = document.getElementById('schichtHistorieContent');
    if (!el) return;

    const maName = document.getElementById('shMa').value;
    if (!maName) {
        el.innerHTML = '<p style="color:#a0aec0">Mitarbeiter auswählen.</p>';
        return;
    }

    const maEinsaetze = einsaetze.filter(e => e.mitarbeiter === maName).sort((a, b) => b.datum.localeCompare(a.datum));

    if (maEinsaetze.length === 0) {
        el.innerHTML = '<p style="color:#a0aec0">Keine Einsätze für diesen Mitarbeiter.</p>';
        return;
    }

    // Zusammenfassung
    const totalStd = maEinsaetze.reduce((s, e) => s + e.stunden, 0);
    const totalNacht = maEinsaetze.reduce((s, e) => s + e.nachtStunden, 0);
    const totalUmsatz = maEinsaetze.reduce((s, e) => s + e.gesamt, 0);
    const objSet = new Set(maEinsaetze.map(e => e.objekt));

    // Durchschnittliche Schichtlänge
    const avgStd = totalStd / maEinsaetze.length;

    // Erster/Letzter Einsatz
    const erster = maEinsaetze[maEinsaetze.length - 1];
    const letzter = maEinsaetze[0];

    let html = '<div class="sh-summary">';
    html += `<span class="sh-stat">${maEinsaetze.length} Einsätze</span>`;
    html += `<span class="sh-stat">${formatZahl(totalStd)} Std. gesamt</span>`;
    html += `<span class="sh-stat">${formatZahl(totalNacht)} Nachtstd.</span>`;
    html += `<span class="sh-stat">\u00D8 ${formatZahl(avgStd)} Std./Einsatz</span>`;
    html += `<span class="sh-stat">${objSet.size} Objekte</span>`;
    html += `<span class="sh-stat">${formatEuro(totalUmsatz)} Umsatz</span>`;
    html += '</div>';

    html += `<div class="sh-zeitraum">Zeitraum: ${formatDatum(erster.datum)} \u2013 ${formatDatum(letzter.datum)}</div>`;

    // Nach Monat gruppiert
    const monatsGruppen = {};
    maEinsaetze.forEach(e => {
        const m = e.datum.substring(0, 7);
        if (!monatsGruppen[m]) monatsGruppen[m] = { count: 0, std: 0, umsatz: 0 };
        monatsGruppen[m].count++;
        monatsGruppen[m].std += e.stunden;
        monatsGruppen[m].umsatz += e.gesamt;
    });

    html += '<div class="sh-monate">';
    Object.entries(monatsGruppen).sort((a, b) => b[0].localeCompare(a[0])).forEach(([monat, d]) => {
        const [j, mo] = monat.split('-');
        html += `<div class="sh-monat-row">
            <span class="sh-monat-label">${MONATSNAMEN[parseInt(mo) - 1]} ${j}</span>
            <span>${d.count} Einsätze</span>
            <span>${formatZahl(d.std)} Std.</span>
            <span>${formatEuro(d.umsatz)}</span>
        </div>`;
    });
    html += '</div>';

    // Letzte 10 Einsätze
    html += '<table class="sh-table"><thead><tr><th>Datum</th><th>Objekt</th><th>Von</th><th>Bis</th><th>Std.</th><th>Gesamt</th></tr></thead><tbody>';
    maEinsaetze.slice(0, 15).forEach(e => {
        html += `<tr><td>${formatDatum(e.datum)}</td><td>${escapeHtml(e.objekt)}</td><td>${e.zeitVon}</td><td>${e.zeitBis}</td><td>${formatZahl(e.stunden)}</td><td>${formatEuro(e.gesamt)}</td></tr>`;
    });
    html += '</tbody></table>';

    el.innerHTML = html;
}

// =============================================
// NOTFALLKONTAKTE
// =============================================
function notfallkontaktSpeichern() {
    const ma = document.getElementById('nkMa').value.trim();
    const kontakt = document.getElementById('nkKontakt').value.trim();
    const telefon = document.getElementById('nkTelefon').value.trim();
    const beziehung = document.getElementById('nkBeziehung').value;

    if (!ma || !kontakt || !telefon) { alert('Bitte alle Pflichtfelder ausfüllen.'); return; }

    notfallkontakte.push({
        id: Date.now(),
        ma, kontakt, telefon, beziehung
    });

    localStorage.setItem('bbprotect_notfallkontakte', JSON.stringify(notfallkontakte));
    renderNotfallkontakte();
    document.getElementById('nkMa').value = '';
    document.getElementById('nkKontakt').value = '';
    document.getElementById('nkTelefon').value = '';
}

function renderNotfallkontakte() {
    const el = document.getElementById('notfallkontakteContent');
    if (!el) return;

    if (notfallkontakte.length === 0) {
        el.innerHTML = '<p style="color:#a0aec0">Keine Notfallkontakte eingetragen.</p>';
        return;
    }

    const BEZIEHUNG_LABELS = {
        ehepartner: 'Ehepartner/in',
        eltern: 'Elternteil',
        kind: 'Kind',
        geschwister: 'Geschwister',
        freund: 'Freund/in',
        sonstige: 'Sonstige'
    };

    // Gruppiere nach MA
    const gruppen = {};
    notfallkontakte.forEach(nk => {
        if (!gruppen[nk.ma]) gruppen[nk.ma] = [];
        gruppen[nk.ma].push(nk);
    });

    let html = '<div class="nk-liste">';
    Object.entries(gruppen).sort((a, b) => a[0].localeCompare(b[0])).forEach(([ma, kontakte]) => {
        html += `<div class="nk-group"><div class="nk-ma">${escapeHtml(ma)}</div>`;
        kontakte.forEach(nk => {
            html += `<div class="nk-item">
                <span class="nk-name">${escapeHtml(nk.kontakt)}</span>
                <span class="nk-bez">${escapeHtml(BEZIEHUNG_LABELS[nk.beziehung] || nk.beziehung)}</span>
                <a href="tel:${escapeHtml(nk.telefon)}" class="nk-tel">${escapeHtml(nk.telefon)}</a>
                <button class="btn-delete btn-small" onclick="loescheNotfallkontakt(${nk.id})">X</button>
            </div>`;
        });
        html += '</div>';
    });
    html += '</div>';
    el.innerHTML = html;
}

function loescheNotfallkontakt(id) {
    notfallkontakte = notfallkontakte.filter(nk => nk.id !== id);
    localStorage.setItem('bbprotect_notfallkontakte', JSON.stringify(notfallkontakte));
    renderNotfallkontakte();
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
renderDokumente();
renderUrlaubskonto();
updateChecklisteObjekte();
renderArbeitszeitkonto();
renderUebergaben();
renderNotfallkontakte();
document.getElementById('vfDatum').valueAsDate = new Date();
document.getElementById('wbDatum').valueAsDate = new Date();
document.getElementById('ugDatum').valueAsDate = new Date();
const jetztInit = new Date();
document.getElementById('wbZeit').value = `${String(jetztInit.getHours()).padStart(2, '0')}:${String(jetztInit.getMinutes()).padStart(2, '0')}`;
document.getElementById('ugZeit').value = `${String(jetztInit.getHours()).padStart(2, '0')}:${String(jetztInit.getMinutes()).padStart(2, '0')}`;
