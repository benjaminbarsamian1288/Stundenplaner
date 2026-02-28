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

// Audit-Log
let auditLog = JSON.parse(localStorage.getItem('bbprotect_auditlog') || '[]');

// Objekt-Kontakte
let objektKontakte = JSON.parse(localStorage.getItem('bbprotect_objektkontakte') || '[]');

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

        if (this.dataset.tab === 'dashboard') { updateDashboard(); renderEinsatzChronik(); renderEinsatzAnalytics(); renderWochenReport(); renderEinsatzTimeline(); renderKostenTrend(); renderObjektUmsatzRanking(); renderStundenkontoChart(); renderDashboardKacheln(); renderSchichtplanVorschau(); renderErweiterteStatistik(); renderTagesPersonal(); renderWetterWidget(); renderDauerStatistik(); renderStornoquote(); renderWiederholungsStatistik(); }
        if (this.dataset.tab === 'objekte') { renderObjekte(); renderVertraege(); renderObjektAuslastung(); updateChecklisteObjekte(); updateObjektHistorieSelect(); updateObjektKontakteSelect(); renderObjektKontakte(); updateObjektAnweisungenSelect(); renderObjektAnweisungen(); updateObjektKostenMonat(); renderObjektKostenanalyse(); renderVertragsCountdown(); updateRevierplanSelect(); renderRevierplan(); updateBesObjektSelect(); renderBesichtigungen(); updateInfokarteSelect(); updateWetterObjektSelects(); renderWetterNotizen(); updateObjektChecklisteSelect(); renderObjektCheckliste(); renderVertragslaufzeitBalken(); updateZugangshinweiseSelect(); renderZugangshinweise(); updateObjektBewertungSelect(); renderObjektBewertungen(); updateObjektNotfallSelects(); renderObjektNotfallKontakte(); updateObjektEinsatzKalSelects(); renderObjektEinsatzKalender(); renderObjektStatusampel(); updateObjektDokSelects(); renderObjektDokumenteAblage(); }
        if (this.dataset.tab === 'kalender') { renderKalender(); renderDienstplan(); renderJahresuebersicht(); }
        if (this.dataset.tab === 'abrechnung') { updateAbrechnung(); updateLohnvorschauSelects(); renderDuplikatCheck(); renderBewertungsUebersicht(); updateMonatsabschlussSelect(); renderMonatsabschluss(); updateCSVExportFilter(); renderDuplikatFinder(); renderKostenSplit(); }
        if (this.dataset.tab === 'mitarbeiter') { renderMitarbeiter(); renderDokumente(); renderUeberstunden(); renderKontaktliste(); renderUrlaubskonto(); renderArbeitszeitkonto(); renderQualMatrix(); updateSchichtHistorieSelect(); renderNotfallkontakte(); updateMAKalSelect(); renderVerfuegbarkeitWoche(); renderDoppelschichtWarnungen(); renderMALeistung(); renderKrankenstatistik(); renderGeburtstageJubilaeen(); renderMASkills(); renderTauschBoard(); renderMAVerfuegbarkeitsKalender(); renderNachrichtenBoard(); renderZertifikateTracker(); renderJahresarbeitszeitkonto(); renderUeberstundenWarnung(); renderMAEinsatzHeatmap(); renderMAFavoritobjekte(); renderMAStreaks(); renderSchichtPraeferenzen(); }
        if (this.dataset.tab === 'vorfaelle') { renderVorfaelle(); renderVorfallsStatistik(); }
        if (this.dataset.tab === 'wachbuch') { renderWachbuch(); renderUebergaben(); renderWachbuchStats(); updateSchichtUebergabeSelects(); renderSchichtUebergaben(); renderTagesprotokoll(); }
        if (this.dataset.tab === 'einstellungen') { updateDatenStats(); updateSpeicherStats(); ladeEinstellungen(); renderAuditLog(); renderSondernotizen(); renderFeiertagsKalender(); renderSpeicherStatistik(); renderDatenChangelog(); renderAutoErinnerungen(); renderSystemInfo(); }
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
            logAudit('bearbeitet', 'Einsatz', `${einsatz.objekt} am ${formatDatum(einsatz.datum)} (${einsatz.zeitVon}-${einsatz.zeitBis})`);
        }
        cancelEdit();
    } else {
        einsaetze.push(einsatz);
        logAudit('erstellt', 'Einsatz', `${einsatz.objekt} am ${formatDatum(einsatz.datum)} (${einsatz.zeitVon}-${einsatz.zeitBis})`);
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
    const notiz = document.getElementById('einsatzNotiz') ? document.getElementById('einsatzNotiz').value.trim() : '';

    if (!objekt || !datum || !zeitVon || !zeitBis || isNaN(stundensatz)) return null;

    const berechnung = berechneEinsatz(datum, zeitVon, zeitBis, stundensatz);

    return {
        id: Date.now(),
        objekt, datum, zeitVon, zeitBis, stundensatz, mitarbeiter, bemerkung, status, notiz,
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
    document.getElementById('einsatzNotiz').value = e.notiz || '';
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
    if (einsaetze._quickFilter) gefiltert = gefiltert.filter(einsaetze._quickFilter);
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
            <td><span class="ampel" style="background:${getEinsatzAmpel(e).farbe}" title="${getEinsatzAmpel(e).label}"></span>${formatDatum(e.datum)}${e.status && e.status !== 'geplant' ? '<br><span class="status-badge status-' + e.status + '">' + escapeHtml(STATUS_LABELS[e.status] || e.status) + '</span>' : ''}${renderEinsatzTags(e)}${renderEinsatzTagBadges(e.id)}</td>
            <td>${getPrioritaetBadge(e.id)}<span class="obj-farbe" style="background:${getObjektFarbe(e.objekt)}"></span>${escapeHtml(e.objekt)}${renderStandortInfo(e.id)}</td>
            <td>${escapeHtml(e.mitarbeiter || '\u2014')}</td>
            <td>${e.zeitVon}</td>
            <td>${e.zeitBis}</td>
            <td>${formatZahl(e.stunden)}${e.pauseMinuten > 0 ? '<span class="pause-badge" title="Pflichtpause §4 ArbZG">' + e.pauseMinuten + 'min</span>' : ''}</td>
            <td>${formatEuro(e.stundensatz)}/Std.</td>
            <td>${zuschlagBadges}</td>
            <td><strong>${formatEuro(e.gesamt)}</strong></td>
            <td class="no-print">
                <button class="btn-edit" onclick="bearbeiteEinsatz(${e.id})">Bearb.</button>
                <button class="btn-secondary btn-small" onclick="dupliziereEinsatz(${e.id})">Dupl.</button>
                ${e.mitarbeiter ? '<button class="btn-secondary btn-small" onclick="tauscheSchicht(' + e.id + ')">Tausch</button><button class="btn-secondary btn-small" onclick="tauschAnfrageErstellen(' + e.id + ')" title="Tausch-Board Anfrage">TB</button>' : ''}
                <button class="btn-delete" onclick="loescheEinsatz(${e.id})">X</button>
                <button class="btn-secondary btn-small" onclick="toggleKommentare(${e.id})" title="Kommentare">${(einsatzKommentare[e.id] || []).length > 0 ? '💬' + (einsatzKommentare[e.id].length) : '💬'}</button>
                <select class="prio-select" onchange="setzePrioritaet(${e.id},this.value)" title="Priorität">
                    <option value="normal" ${(einsatzPrioritaeten[e.id] || 'normal') === 'normal' ? 'selected' : ''}>Normal</option>
                    <option value="hoch" ${einsatzPrioritaeten[e.id] === 'hoch' ? 'selected' : ''}>Hoch</option>
                    <option value="kritisch" ${einsatzPrioritaeten[e.id] === 'kritisch' ? 'selected' : ''}>Kritisch</option>
                </select>
            </td>
        `;
        einsatzBody.appendChild(tr);

        // Kommentar-Zeile
        const komRow = document.createElement('tr');
        komRow.id = 'ek_row_' + e.id;
        komRow.style.display = 'none';
        komRow.className = 'ek-row';
        komRow.innerHTML = `<td colspan="11" class="ek-cell">
            <div class="ek-container">
                <div class="ft-selector" style="margin-bottom:0.3rem">${renderTagSelector(e.id)}</div>
                <div id="ek_list_${e.id}"></div>
                <div class="ek-input-row">
                    <input type="text" id="ek_input_${e.id}" placeholder="Kommentar hinzufügen..." class="ek-input" onkeydown="if(event.key==='Enter')kommentarSpeichern(${e.id})">
                    <button class="btn-primary btn-small" onclick="kommentarSpeichern(${e.id})">+</button>
                </div>
            </div>
        </td>`;
        einsatzBody.appendChild(komRow);

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
    const e = einsaetze.find(x => x.id === id);
    if (e) logAudit('geloescht', 'Einsatz', `${e.objekt} am ${formatDatum(e.datum)} (${e.zeitVon}-${e.zeitBis})`);
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

    // KPI-Leiste
    renderKPILeiste(gefiltert);

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

    // MA-Stundenchart
    renderMAStundenChart(gefiltert);

    // Monats-Heatmap
    renderHeatmap(filterM);

    // Monatsziel-Fortschritt
    renderFortschritt(filterM);

    // Zeitvergleich
    renderZeitvergleich(filterM);

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
    const mindestQual = document.getElementById('objektMindestQual').value;
    const minMA = parseInt(document.getElementById('objektMinMA').value) || 0;
    const anforderungen = document.getElementById('objektAnforderungen').value.trim();

    if (!name) return;

    const idx = objekte.findIndex(o => o.name === name);
    const obj = { name, adresse, stundensatz, ansprechpartner, vertragNr, auftraggeber, vertragStart, vertragEnde, monatsstunden, vertragStatus, mindestQual, minMA, anforderungen };
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
        const istFav = favObjekte.includes(o.name);
        tr.innerHTML = `
            <td><span class="fav-stern ${istFav ? 'fav-aktiv' : ''}" onclick="toggleFavObjekt('${escapeHtml(o.name)}')">${istFav ? '\u2605' : '\u2606'}</span> ${escapeHtml(o.name)}${vertragInfo}</td>
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
    const geburtstag = document.getElementById('maGeburtstag').value;
    const eintrittsdatum = document.getElementById('maEintrittsdatum').value;
    const bemerkung = document.getElementById('maBemerkung').value.trim();

    if (!vorname || !nachname) return;

    const vollname = `${vorname} ${nachname}`;
    const idx = mitarbeiterListe_.findIndex(m => m.name === vollname);
    const ma = { name: vollname, vorname, nachname, telefon, email, qualifikation, stundensatz, qualAblauf, sollStunden, urlaubstage, geburtstag, eintrittsdatum, bemerkung };

    if (idx !== -1) {
        mitarbeiterListe_[idx] = ma;
        logAudit('bearbeitet', 'Mitarbeiter', vollname);
    } else {
        mitarbeiterListe_.push(ma);
        logAudit('erstellt', 'Mitarbeiter', vollname);
    }

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
        version: 23,
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
        notfallkontakte,
        auditLog,
        objektKontakte,
        objektAnweisungen,
        einsatzBewertungen,
        revierplaene,
        monatsabschluesse,
        tagesSondernotizen,
        schnellvorlagen,
        besichtigungen,
        tauschAnfragen,
        einsatzKommentare,
        schichtUebergaben,
        objektWetterNotizen,
        einsatzPrioritaeten,
        maNachrichten,
        objektChecklisten,
        maZertifikate,
        einsatzFarbTags,
        objektZugangshinweise,
        objektBewertungen,
        objektNotfallKontakte,
        datenChangelog,
        maSchichtPraef,
        objektDokumente
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
            auditLog = data.auditLog || [];
            objektKontakte = data.objektKontakte || [];
            objektAnweisungen = data.objektAnweisungen || {};
            einsatzBewertungen = data.einsatzBewertungen || {};
            revierplaene = data.revierplaene || {};
            monatsabschluesse = data.monatsabschluesse || {};
            tagesSondernotizen = data.tagesSondernotizen || {};
            schnellvorlagen = data.schnellvorlagen || [];
            besichtigungen = data.besichtigungen || [];
            tauschAnfragen = data.tauschAnfragen || [];
            einsatzKommentare = data.einsatzKommentare || {};
            schichtUebergaben = data.schichtUebergaben || [];
            objektWetterNotizen = data.objektWetterNotizen || {};
            einsatzPrioritaeten = data.einsatzPrioritaeten || {};
            maNachrichten = data.maNachrichten || [];
            objektChecklisten = data.objektChecklisten || {};
            maZertifikate = data.maZertifikate || [];
            einsatzFarbTags = data.einsatzFarbTags || {};
            objektZugangshinweise = data.objektZugangshinweise || {};
            objektBewertungen = data.objektBewertungen || {};
            objektNotfallKontakte = data.objektNotfallKontakte || {};
            datenChangelog = data.datenChangelog || [];
            maSchichtPraef = data.maSchichtPraef || {};
            objektDokumente = data.objektDokumente || {};

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
            localStorage.setItem('bbprotect_auditlog', JSON.stringify(auditLog));
            localStorage.setItem('bbprotect_objektkontakte', JSON.stringify(objektKontakte));
            localStorage.setItem('bbprotect_objektanweisungen', JSON.stringify(objektAnweisungen));
            localStorage.setItem('bbprotect_bewertungen', JSON.stringify(einsatzBewertungen));
            localStorage.setItem('bbprotect_revierplaene', JSON.stringify(revierplaene));
            localStorage.setItem('bbprotect_monatsabschluesse', JSON.stringify(monatsabschluesse));
            localStorage.setItem('bbprotect_tagesnotizen_extra', JSON.stringify(tagesSondernotizen));
            localStorage.setItem('bbprotect_schnellvorlagen', JSON.stringify(schnellvorlagen));
            localStorage.setItem('bbprotect_besichtigungen', JSON.stringify(besichtigungen));
            localStorage.setItem('bbprotect_tauschanfragen', JSON.stringify(tauschAnfragen));
            localStorage.setItem('bbprotect_einsatzkommentare', JSON.stringify(einsatzKommentare));
            localStorage.setItem('bbprotect_schichtuebergaben', JSON.stringify(schichtUebergaben));
            localStorage.setItem('bbprotect_objektwetter', JSON.stringify(objektWetterNotizen));
            localStorage.setItem('bbprotect_prioritaeten', JSON.stringify(einsatzPrioritaeten));
            localStorage.setItem('bbprotect_nachrichten', JSON.stringify(maNachrichten));
            localStorage.setItem('bbprotect_objektchecklisten', JSON.stringify(objektChecklisten));
            localStorage.setItem('bbprotect_zertifikate', JSON.stringify(maZertifikate));
            localStorage.setItem('bbprotect_farbtags', JSON.stringify(einsatzFarbTags));
            localStorage.setItem('bbprotect_zugangshinweise', JSON.stringify(objektZugangshinweise));
            localStorage.setItem('bbprotect_objektbewertungen', JSON.stringify(objektBewertungen));
            localStorage.setItem('bbprotect_objektnotfall', JSON.stringify(objektNotfallKontakte));
            localStorage.setItem('bbprotect_changelog', JSON.stringify(datenChangelog));
            localStorage.setItem('bbprotect_schichtpraef', JSON.stringify(maSchichtPraef));
            localStorage.setItem('bbprotect_objektdokumente', JSON.stringify(objektDokumente));

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
    auditLog = [];
    objektKontakte = [];
    objektAnweisungen = {};
    einsatzBewertungen = {};
    revierplaene = {};
    monatsabschluesse = {};
    tagesSondernotizen = {};
    schnellvorlagen = [];
    besichtigungen = [];
    tauschAnfragen = [];
    einsatzKommentare = {};
    schichtUebergaben = [];
    objektWetterNotizen = {};
    einsatzPrioritaeten = {};
    maNachrichten = [];
    objektChecklisten = {};
    maZertifikate = [];
    einsatzFarbTags = {};
    objektZugangshinweise = {};
    objektBewertungen = {};
    objektNotfallKontakte = {};
    datenChangelog = [];
    maSchichtPraef = {};
    objektDokumente = {};

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
    localStorage.removeItem('bbprotect_auditlog');
    localStorage.removeItem('bbprotect_objektkontakte');
    localStorage.removeItem('bbprotect_objektanweisungen');
    localStorage.removeItem('bbprotect_bewertungen');
    localStorage.removeItem('bbprotect_revierplaene');
    localStorage.removeItem('bbprotect_monatsabschluesse');
    localStorage.removeItem('bbprotect_tagesnotizen_extra');
    localStorage.removeItem('bbprotect_schnellvorlagen');
    localStorage.removeItem('bbprotect_besichtigungen');
    localStorage.removeItem('bbprotect_tauschanfragen');
    localStorage.removeItem('bbprotect_einsatzkommentare');
    localStorage.removeItem('bbprotect_schichtuebergaben');
    localStorage.removeItem('bbprotect_objektwetter');
    localStorage.removeItem('bbprotect_prioritaeten');
    localStorage.removeItem('bbprotect_nachrichten');
    localStorage.removeItem('bbprotect_objektchecklisten');
    localStorage.removeItem('bbprotect_zertifikate');
    localStorage.removeItem('bbprotect_farbtags');
    localStorage.removeItem('bbprotect_zugangshinweise');
    localStorage.removeItem('bbprotect_objektbewertungen');
    localStorage.removeItem('bbprotect_objektnotfall');
    localStorage.removeItem('bbprotect_changelog');
    localStorage.removeItem('bbprotect_schichtpraef');
    localStorage.removeItem('bbprotect_objektdokumente');

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
            </tr>
            <tr><td colspan="6" style="padding:0.2rem 0.5rem;border:none">
                ${renderEinsatzKommentare(e)}
                <div class="ek-add"><input type="text" id="ek_${e.id}" class="ek-input" placeholder="Kommentar..." onkeydown="if(event.key==='Enter')einsatzKommentarHinzufuegen(${e.id})"><button class="btn-secondary btn-small" onclick="einsatzKommentarHinzufuegen(${e.id})">+</button></div>
            </td></tr>`;
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

    // Doppelschicht-Warnungen
    const dsWarn = pruefeDoppelschichten();
    if (dsWarn.length > 0) {
        meldungen.push({
            typ: 'warnung',
            text: `${dsWarn.length} Ruhezeitverletzung(en) nach §5 ArbZG erkannt (< 11 Std. Ruhezeit).`
        });
    }

    // Einsatz-Duplikate
    const duplikate = findeEinsatzDuplikate();
    if (duplikate.length > 0) {
        meldungen.push({
            typ: 'warnung',
            text: `${duplikate.length} mögliche Einsatz-Duplikat(e) gefunden.`
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

    logAudit('status', 'Einsatz', `${ids.length} Einsätze → ${STATUS_LABELS[neuerStatus]}`);
    speichern();
    renderTabelle();
    bulkAbwaehlen();
}

function bulkLoeschen() {
    const ids = bulkGetIds();
    if (ids.length === 0) return;

    if (!confirm(`${ids.length} Einsätze wirklich löschen?`)) return;
    if (ids.length > 5 && !confirm(`Wirklich ${ids.length} Einsätze unwiderruflich löschen?`)) return;

    logAudit('geloescht', 'Einsatz', `${ids.length} Einsätze per Bulk gelöscht`);
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
// SCHNELLAKTIONEN
// =============================================
function schnellNeuerEinsatz() {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelector('[data-tab="erfassung"]').classList.add('active');
    document.getElementById('tab-erfassung').classList.add('active');
    document.getElementById('datum').valueAsDate = new Date();
    document.getElementById('einsatzFormSection').scrollIntoView({ behavior: 'smooth' });
}

function schnellHeuteAnzeigen() {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelector('[data-tab="kalender"]').classList.add('active');
    document.getElementById('tab-kalender').classList.add('active');
    kalenderJahr = new Date().getFullYear();
    kalenderMonat = new Date().getMonth();
    renderKalender();
    // Zeige Tagesdetail für heute
    const heute = new Date().toISOString().split('T')[0];
    setTimeout(() => zeigeTagesDetail(heute), 200);
}

function schnellDienstplan() {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelector('[data-tab="kalender"]').classList.add('active');
    document.getElementById('tab-kalender').classList.add('active');
    dienstplanKW = getKalenderWoche(new Date());
    dienstplanJahr = new Date().getFullYear();
    renderKalender();
    renderDienstplan();
}

function schnellAbrechnung() {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelector('[data-tab="abrechnung"]').classList.add('active');
    document.getElementById('tab-abrechnung').classList.add('active');
    updateAbrechnung();
}

// =============================================
// KPI-LEISTE (Dashboard)
// =============================================
function renderKPILeiste(gefiltert) {
    const el = document.getElementById('kpiLeiste');
    if (!el) return;

    const totalStd = gefiltert.reduce((s, e) => s + e.stunden, 0);
    const totalUmsatz = gefiltert.reduce((s, e) => s + e.gesamt, 0);
    const maSet = new Set(gefiltert.filter(e => e.mitarbeiter).map(e => e.mitarbeiter));

    // Kosten pro Stunde
    const kostenProStd = totalStd > 0 ? totalUmsatz / totalStd : 0;

    // Durchschnittliche Schichtlänge
    const avgSchicht = gefiltert.length > 0 ? totalStd / gefiltert.length : 0;

    // Auslastung: Einsätze pro MA
    const einsaetzeProMA = maSet.size > 0 ? gefiltert.length / maSet.size : 0;

    // Stornoquote
    const storniertCount = gefiltert.filter(e => (e.status || 'geplant') === 'storniert').length;
    const stornoQuote = gefiltert.length > 0 ? (storniertCount / gefiltert.length * 100) : 0;

    // Nachtschichtanteil
    const nachtStd = gefiltert.reduce((s, e) => s + e.nachtStunden, 0);
    const nachtAnteil = totalStd > 0 ? (nachtStd / totalStd * 100) : 0;

    const kpis = [
        { label: 'Kosten/Std.', value: formatEuro(kostenProStd), cls: '' },
        { label: '\u00D8 Schichtl\u00E4nge', value: formatZahl(avgSchicht) + ' Std.', cls: '' },
        { label: 'Einsätze/MA', value: formatZahl(einsaetzeProMA), cls: '' },
        { label: 'Stornoquote', value: stornoQuote.toFixed(1) + '%', cls: stornoQuote > 10 ? 'kpi-warn' : '' },
        { label: 'Nachtanteil', value: nachtAnteil.toFixed(1) + '%', cls: '' }
    ];

    let html = '';
    kpis.forEach(k => {
        html += `<div class="kpi-card ${k.cls}"><div class="kpi-value">${k.value}</div><div class="kpi-label">${k.label}</div></div>`;
    });
    el.innerHTML = html;
}

// =============================================
// EINSATZ-KOMMENTARE
// =============================================
function einsatzKommentarHinzufuegen(id) {
    const input = document.getElementById('ek_' + id);
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    const e = einsaetze.find(x => x.id === id);
    if (!e) return;

    if (!e.kommentare) e.kommentare = [];
    e.kommentare.push({
        text,
        zeit: new Date().toISOString(),
        autor: 'Admin'
    });

    speichern();
    input.value = '';
    // Re-render wenn im Detail-Modal
    const modal = document.getElementById('tagesModal');
    if (modal && modal.style.display !== 'none') {
        const datum = e.datum;
        zeigeTagesDetail(datum);
    }
}

function renderEinsatzKommentare(einsatz) {
    if (!einsatz.kommentare || einsatz.kommentare.length === 0) return '';
    let html = '<div class="ek-liste">';
    einsatz.kommentare.forEach(k => {
        const zeit = new Date(k.zeit);
        html += `<div class="ek-item"><span class="ek-zeit">${zeit.toLocaleDateString('de-DE')} ${zeit.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span> ${escapeHtml(k.text)}</div>`;
    });
    html += '</div>';
    return html;
}

// =============================================
// EINSATZ-FARBKODIERUNG
// =============================================
function getObjektFarbe(objName) {
    const farben = ['#2b6cb0', '#38a169', '#d69e2e', '#c53030', '#805ad5', '#dd6b20', '#319795', '#d53f8c', '#5a67d8', '#718096'];
    const alleObjekte = [...new Set(einsaetze.map(e => e.objekt))].sort();
    const idx = alleObjekte.indexOf(objName);
    return farben[idx % farben.length];
}

// =============================================
// MA-STUNDENÜBERSICHT CHART
// =============================================
function renderMAStundenChart(gefiltert) {
    const el = document.getElementById('maStundenChart');
    if (!el) return;

    const maStunden = {};
    gefiltert.forEach(e => {
        const name = e.mitarbeiter || 'Nicht zugewiesen';
        if (!maStunden[name]) maStunden[name] = { ist: 0, nacht: 0 };
        maStunden[name].ist += e.stunden;
        maStunden[name].nacht += e.nachtStunden;
    });

    const sorted = Object.entries(maStunden).sort((a, b) => b[1].ist - a[1].ist);
    if (sorted.length === 0) {
        el.innerHTML = '<p style="color:#a0aec0;font-size:0.8rem">Keine Daten.</p>';
        return;
    }

    const maxStd = Math.max(...sorted.map(([, d]) => d.ist), 1);

    let html = '<div class="msc-chart">';
    sorted.slice(0, 15).forEach(([name, d]) => {
        const pctIst = (d.ist / maxStd) * 100;
        const pctNacht = d.ist > 0 ? (d.nacht / d.ist) * pctIst : 0;

        // Soll-Stunden
        const ma = mitarbeiterListe_.find(m => m.name === name);
        const soll = ma && ma.sollStunden ? ma.sollStunden : 0;
        const sollPct = soll > 0 ? (soll / maxStd) * 100 : 0;

        html += `<div class="msc-row">
            <div class="msc-name" title="${escapeHtml(name)}">${escapeHtml(name.length > 15 ? name.substring(0, 15) + '...' : name)}</div>
            <div class="msc-bar-wrap">
                <div class="msc-bar msc-bar-tag" style="width:${pctIst}%"></div>
                <div class="msc-bar msc-bar-nacht" style="width:${pctNacht}%"></div>
                ${sollPct > 0 ? '<div class="msc-soll-marker" style="left:' + Math.min(sollPct, 100) + '%"></div>' : ''}
            </div>
            <div class="msc-val">${formatZahl(d.ist)}${soll > 0 ? '/' + formatZahl(soll) : ''}</div>
        </div>`;
    });
    html += '</div>';

    html += '<div class="msc-legende">';
    html += '<span class="wt-leg-item"><span class="wt-leg-dot msc-bar-tag"></span> Tagstunden</span>';
    html += '<span class="wt-leg-item"><span class="wt-leg-dot msc-bar-nacht"></span> Nachtstunden</span>';
    html += '<span class="wt-leg-item"><span class="msc-soll-leg"></span> Soll</span>';
    html += '</div>';

    el.innerHTML = html;
}

// =============================================
// WACHBUCH-STATISTIK
// =============================================
function renderWachbuchStats() {
    const el = document.getElementById('wachbuchStats');
    if (!el) return;

    if (wachbuch.length === 0) {
        el.innerHTML = '<p style="color:#a0aec0">Noch keine Wachbuch-Einträge für Statistiken.</p>';
        return;
    }

    const KAT_LABELS = {
        rundgang: 'Kontrollrundgang',
        schichtuebergabe: 'Schichtübergabe',
        zugang: 'Zugangsüberwachung',
        schliessung: 'Schließdienst',
        alarm: 'Alarm / Störung',
        besucher: 'Besucherverkehr',
        lieferung: 'Lieferung',
        sonstiges: 'Sonstiges'
    };

    // Kategorieverteilung
    const katCount = {};
    wachbuch.forEach(w => {
        const kat = w.kategorie || 'sonstiges';
        katCount[kat] = (katCount[kat] || 0) + 1;
    });

    const maxKat = Math.max(...Object.values(katCount), 1);

    // Objekt-Verteilung
    const objCount = {};
    wachbuch.forEach(w => {
        objCount[w.objekt] = (objCount[w.objekt] || 0) + 1;
    });

    // MA-Verteilung
    const maCount = {};
    wachbuch.forEach(w => {
        if (w.mitarbeiter) maCount[w.mitarbeiter] = (maCount[w.mitarbeiter] || 0) + 1;
    });

    let html = '<div class="wbs-grid">';

    // Gesamt
    html += '<div class="wbs-card"><div class="wbs-val">' + wachbuch.length + '</div><div class="wbs-label">Einträge gesamt</div></div>';
    html += '<div class="wbs-card"><div class="wbs-val">' + Object.keys(objCount).length + '</div><div class="wbs-label">Objekte</div></div>';
    html += '<div class="wbs-card"><div class="wbs-val">' + Object.keys(maCount).length + '</div><div class="wbs-label">Mitarbeiter</div></div>';
    html += '</div>';

    // Kategorien
    html += '<div class="wbs-section"><strong>Kategorien:</strong></div>';
    Object.entries(katCount).sort((a, b) => b[1] - a[1]).forEach(([kat, count]) => {
        const pct = (count / maxKat) * 100;
        html += `<div class="stat-row"><span class="stat-row-label">${escapeHtml(KAT_LABELS[kat] || kat)}</span><div class="stat-bar"><div class="stat-bar-fill nacht" style="width:${pct}%"></div></div><span class="stat-row-value">${count}</span></div>`;
    });

    el.innerHTML = html;
}

// =============================================
// DATEN-ARCHIVIERUNG
// =============================================
function vorschauArchivierung() {
    const el = document.getElementById('archivVorschau');
    if (!el) return;

    const monate = parseInt(document.getElementById('archivZeitraum').value) || 6;
    const grenze = new Date();
    grenze.setMonth(grenze.getMonth() - monate);
    const grenzeStr = grenze.toISOString().split('T')[0];

    const zuArchivieren = einsaetze.filter(e =>
        e.datum < grenzeStr && (e.status === 'abgeschlossen' || e.status === 'storniert')
    );

    if (zuArchivieren.length === 0) {
        el.innerHTML = '<p style="color:#a0aec0;font-size:0.8rem">Keine Einsätze zum Archivieren.</p>';
        return;
    }

    const totalStd = zuArchivieren.reduce((s, e) => s + e.stunden, 0);
    el.innerHTML = `<div class="archiv-info">${zuArchivieren.length} Einsätze (${formatZahl(totalStd)} Std.) vor dem ${formatDatum(grenzeStr)} können archiviert werden.</div>`;
}

function archiviereEinsaetze() {
    const monate = parseInt(document.getElementById('archivZeitraum').value) || 6;
    const grenze = new Date();
    grenze.setMonth(grenze.getMonth() - monate);
    const grenzeStr = grenze.toISOString().split('T')[0];

    const zuArchivieren = einsaetze.filter(e =>
        e.datum < grenzeStr && (e.status === 'abgeschlossen' || e.status === 'storniert')
    );

    if (zuArchivieren.length === 0) {
        alert('Keine Einsätze zum Archivieren.');
        return;
    }

    if (!confirm(`${zuArchivieren.length} abgeschlossene/stornierte Einsätze vor dem ${formatDatum(grenzeStr)} archivieren?\n\nDie Einsätze werden als JSON exportiert und dann entfernt.`)) return;

    // Exportiere Archiv
    const archiv = {
        typ: 'Archiv',
        datum: new Date().toISOString(),
        zeitraum: `vor ${formatDatum(grenzeStr)}`,
        anzahl: zuArchivieren.length,
        einsaetze: zuArchivieren
    };
    downloadFile(`BBProtect_Archiv_${new Date().toISOString().split('T')[0]}.json`, JSON.stringify(archiv, null, 2), 'application/json');

    // Entferne archivierte Einsätze
    einsaetze = einsaetze.filter(e => !(e.datum < grenzeStr && (e.status === 'abgeschlossen' || e.status === 'storniert')));
    speichern();
    renderTabelle();
    updateAlleFilter();
    updateDatenStats();
    updateSpeicherStats();

    alert(`${zuArchivieren.length} Einsätze archiviert und exportiert.`);
}

// =============================================
// EINSATZ-AMPEL
// =============================================
function getEinsatzAmpel(einsatz) {
    // Grün = bestätigt + MA zugewiesen, Gelb = geplant, Rot = kein MA oder storniert
    const status = einsatz.status || 'geplant';
    if (status === 'storniert') return { farbe: '#a0aec0', label: 'Storniert' };
    if (status === 'abgeschlossen') return { farbe: '#48bb78', label: 'OK' };
    if (!einsatz.mitarbeiter) return { farbe: '#e53e3e', label: 'Kein MA' };
    if (status === 'bestaetigt') return { farbe: '#48bb78', label: 'OK' };

    // Check Objekt-Anforderungen
    const obj = objekte.find(o => o.name === einsatz.objekt);
    if (obj && obj.mindestQual) {
        const ma = mitarbeiterListe_.find(m => m.name === einsatz.mitarbeiter);
        const qualRang = { 'unterrichtung': 1, '34a': 2, 'fachkraft': 3, 'meister': 4, 'sonstige': 0 };
        if (ma && (qualRang[ma.qualifikation] || 0) < (qualRang[obj.mindestQual] || 0)) {
            return { farbe: '#d69e2e', label: 'Qual.!' };
        }
    }

    return { farbe: '#d69e2e', label: 'Geplant' };
}

// =============================================
// KEYBOARD SHORTCUTS
// =============================================
document.addEventListener('keydown', function (ev) {
    // Ignoriere wenn in Eingabefeld
    if (ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA' || ev.target.tagName === 'SELECT') return;

    if (ev.key === 'n' || ev.key === 'N') {
        ev.preventDefault();
        schnellNeuerEinsatz();
    } else if (ev.key === 'h' || ev.key === 'H') {
        ev.preventDefault();
        schnellHeuteAnzeigen();
    } else if (ev.key === 'd' || ev.key === 'D') {
        ev.preventDefault();
        schnellDienstplan();
    } else if (ev.key === 'b' || ev.key === 'B') {
        ev.preventDefault();
        erstelleBackup();
    } else if (ev.key === '1') {
        navigiereTab('erfassung');
    } else if (ev.key === '2') {
        navigiereTab('kalender');
    } else if (ev.key === '3') {
        navigiereTab('abrechnung');
    } else if (ev.key === '4') {
        navigiereTab('dashboard');
    } else if (ev.key === '5') {
        navigiereTab('objekte');
    } else if (ev.key === '6') {
        navigiereTab('mitarbeiter');
    } else if (ev.key === 'Escape') {
        schliesseModal();
    }
});

function navigiereTab(tab) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    const btn = document.querySelector(`.nav-btn[data-tab="${tab}"]`);
    if (btn) btn.classList.add('active');
    const tabEl = document.getElementById('tab-' + tab);
    if (tabEl) tabEl.classList.add('active');

    if (tab === 'dashboard') updateDashboard();
    if (tab === 'kalender') { renderKalender(); renderDienstplan(); }
    if (tab === 'abrechnung') updateAbrechnung();
    if (tab === 'mitarbeiter') { renderMitarbeiter(); renderDokumente(); renderUeberstunden(); renderKontaktliste(); renderUrlaubskonto(); renderArbeitszeitkonto(); renderQualMatrix(); }
    if (tab === 'objekte') { renderObjekte(); renderVertraege(); renderObjektAuslastung(); updateChecklisteObjekte(); }
}

// =============================================
// DASHBOARD ZEITVERGLEICH
// =============================================
function renderZeitvergleich(filterM) {
    const el = document.getElementById('zeitvergleichContent');
    if (!el) return;

    if (!filterM) {
        const jetzt = new Date();
        filterM = `${jetzt.getFullYear()}-${String(jetzt.getMonth() + 1).padStart(2, '0')}`;
    }

    const [j, m] = filterM.split('-').map(Number);
    const prevMonat = m === 1 ? `${j - 1}-12` : `${j}-${String(m - 1).padStart(2, '0')}`;

    const aktE = einsaetze.filter(e => e.datum.substring(0, 7) === filterM);
    const prevE = einsaetze.filter(e => e.datum.substring(0, 7) === prevMonat);

    if (prevE.length === 0) {
        el.innerHTML = '<p style="color:#a0aec0;font-size:0.8rem">Kein Vormonat zum Vergleichen.</p>';
        return;
    }

    function metriken(arr) {
        return {
            einsaetze: arr.length,
            stunden: arr.reduce((s, e) => s + e.stunden, 0),
            umsatz: arr.reduce((s, e) => s + e.gesamt, 0),
            zuschlaege: arr.reduce((s, e) => s + e.zuschlagBetrag, 0),
            ma: new Set(arr.filter(e => e.mitarbeiter).map(e => e.mitarbeiter)).size
        };
    }

    const akt = metriken(aktE);
    const prev = metriken(prevE);

    function vergleichsZelle(label, aktVal, prevVal, format) {
        const diff = aktVal - prevVal;
        const pct = prevVal > 0 ? ((diff / prevVal) * 100).toFixed(1) : '0.0';
        const cls = diff > 0 ? 'zv-up' : diff < 0 ? 'zv-down' : 'zv-gleich';
        const arrow = diff > 0 ? '\u2191' : diff < 0 ? '\u2193' : '=';
        const formatted = format === 'euro' ? formatEuro(aktVal) : format === 'zahl' ? formatZahl(aktVal) : aktVal;
        const prevFormatted = format === 'euro' ? formatEuro(prevVal) : format === 'zahl' ? formatZahl(prevVal) : prevVal;
        return `<div class="zv-item">
            <div class="zv-label">${label}</div>
            <div class="zv-wert">${formatted}</div>
            <div class="zv-prev">Vormonat: ${prevFormatted}</div>
            <div class="${cls}">${arrow} ${pct}%</div>
        </div>`;
    }

    let html = '<div class="zv-grid">';
    html += vergleichsZelle('Einsätze', akt.einsaetze, prev.einsaetze, 'num');
    html += vergleichsZelle('Stunden', akt.stunden, prev.stunden, 'zahl');
    html += vergleichsZelle('Umsatz', akt.umsatz, prev.umsatz, 'euro');
    html += vergleichsZelle('Zuschläge', akt.zuschlaege, prev.zuschlaege, 'euro');
    html += vergleichsZelle('Mitarbeiter', akt.ma, prev.ma, 'num');
    html += '</div>';

    el.innerHTML = html;
}

// =============================================
// ENHANCED PRINT
// =============================================
function printHeader() {
    return `<div class="bericht-header"><h1>B.B. Protect</h1><p>Sicherheitseinsatz-Planer</p></div>`;
}

// =============================================
// MONATSZIEL-FORTSCHRITT
// =============================================
function renderFortschritt(filterM) {
    const el = document.getElementById('fortschrittContent');
    if (!el) return;

    if (!filterM) {
        const jetzt = new Date();
        filterM = `${jetzt.getFullYear()}-${String(jetzt.getMonth() + 1).padStart(2, '0')}`;
    }

    // Objekte mit Monatsstunden-Soll
    const zielObjekte = objekte.filter(o => o.monatsstunden > 0);

    if (zielObjekte.length === 0) {
        el.innerHTML = '<p style="color:#a0aec0;font-size:0.8rem">Objekte mit Soll-Monatsstunden anlegen.</p>';
        return;
    }

    let html = '<div class="fort-grid">';
    zielObjekte.forEach(o => {
        const objE = einsaetze.filter(e => e.objekt === o.name && e.datum.substring(0, 7) === filterM);
        const istStd = objE.reduce((s, e) => s + e.stunden, 0);
        const soll = o.monatsstunden;
        const pct = soll > 0 ? Math.min((istStd / soll) * 100, 120) : 0;
        const cls = pct >= 100 ? 'fort-voll' : pct >= 75 ? 'fort-gut' : pct >= 50 ? 'fort-mittel' : 'fort-niedrig';

        html += `<div class="fort-item">
            <div class="fort-header">
                <span class="fort-name">${escapeHtml(o.name)}</span>
                <span class="fort-pct ${cls}">${pct.toFixed(0)}%</span>
            </div>
            <div class="fort-bar-wrap"><div class="fort-bar ${cls}" style="width:${Math.min(pct, 100)}%"></div></div>
            <div class="fort-detail">${formatZahl(istStd)} / ${formatZahl(soll)} Std. (${objE.length} Einsätze)</div>
        </div>`;
    });
    html += '</div>';
    el.innerHTML = html;
}

// =============================================
// MA-EINSATZKALENDER
// =============================================
let maKalJahr = new Date().getFullYear();
let maKalMonat = new Date().getMonth();

function maKalNav(richtung) {
    maKalMonat += richtung;
    if (maKalMonat < 0) { maKalMonat = 11; maKalJahr--; }
    if (maKalMonat > 11) { maKalMonat = 0; maKalJahr++; }
    renderMAKalender();
}

function updateMAKalSelect() {
    const sel = document.getElementById('maKalMa');
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = '<option value="">Mitarbeiter wählen...</option>';
    mitarbeiterListe_.forEach(m => {
        sel.innerHTML += `<option value="${escapeHtml(m.name)}">${escapeHtml(m.name)}</option>`;
    });
    if (current) sel.value = current;
}

function renderMAKalender() {
    const el = document.getElementById('maKalenderContent');
    const titel = document.getElementById('maKalTitel');
    if (!el) return;

    if (titel) titel.textContent = `${MONATSNAMEN[maKalMonat]} ${maKalJahr}`;

    const maName = document.getElementById('maKalMa').value;
    if (!maName) {
        el.innerHTML = '<p style="color:#a0aec0">Mitarbeiter auswählen.</p>';
        return;
    }

    const monatStr = `${maKalJahr}-${String(maKalMonat + 1).padStart(2, '0')}`;
    const letzterTag = new Date(maKalJahr, maKalMonat + 1, 0).getDate();
    const ersterWT = new Date(maKalJahr, maKalMonat, 1).getDay();
    const startWT = ersterWT === 0 ? 7 : ersterWT;

    const tageLabels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    let html = '<div class="mak-grid">';
    tageLabels.forEach(l => { html += `<div class="mak-header">${l}</div>`; });

    for (let i = 1; i < startWT; i++) html += '<div class="mak-cell mak-leer"></div>';

    // Abwesenheiten
    const maVerf = verfuegbarkeit.filter(v => v.mitarbeiter === maName);

    for (let t = 1; t <= letzterTag; t++) {
        const tagStr = `${monatStr}-${String(t).padStart(2, '0')}`;
        const tagesE = einsaetze.filter(e => e.mitarbeiter === maName && e.datum === tagStr);
        const abwesend = maVerf.find(v => v.von <= tagStr && v.bis >= tagStr);
        const feiertag = istFeiertag(tagStr);
        const datumObj = new Date(maKalJahr, maKalMonat, t);
        const istSo = datumObj.getDay() === 0;

        let cls = 'mak-cell';
        if (abwesend) cls += ' mak-abwesend';
        else if (tagesE.length > 0) cls += ' mak-einsatz';
        if (feiertag) cls += ' mak-feiertag';
        if (istSo) cls += ' mak-sonntag';

        const totalStd = tagesE.reduce((s, e) => s + e.stunden, 0);
        let inhalt = `<span class="mak-tag">${t}</span>`;
        if (tagesE.length > 0) {
            inhalt += `<span class="mak-info">${tagesE.length}x | ${formatZahl(totalStd)}h</span>`;
        }
        if (abwesend) {
            inhalt += `<span class="mak-verf">${abwesend.typ === 'urlaub' ? 'U' : abwesend.typ === 'krank' ? 'K' : 'F'}</span>`;
        }

        html += `<div class="${cls}" title="${formatDatum(tagStr)}: ${tagesE.length} Einsätze${abwesend ? ', ' + abwesend.typ : ''}">${inhalt}</div>`;
    }
    html += '</div>';

    // Monats-Summary
    const monatsE = einsaetze.filter(e => e.mitarbeiter === maName && e.datum.substring(0, 7) === monatStr);
    const totalStd = monatsE.reduce((s, e) => s + e.stunden, 0);
    const totalNacht = monatsE.reduce((s, e) => s + e.nachtStunden, 0);
    const arbeitstage = new Set(monatsE.map(e => e.datum)).size;
    const urlaubstage = maVerf.filter(v => v.typ === 'urlaub').reduce((sum, v) => {
        let count = 0;
        const start = new Date(Math.max(new Date(v.von), new Date(maKalJahr, maKalMonat, 1)));
        const end = new Date(Math.min(new Date(v.bis), new Date(maKalJahr, maKalMonat + 1, 0)));
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) count++;
        return sum + count;
    }, 0);

    html += `<div class="mak-summary">
        <span>${monatsE.length} Einsätze</span>
        <span>${arbeitstage} Arbeitstage</span>
        <span>${formatZahl(totalStd)} Std.</span>
        <span>${formatZahl(totalNacht)} Nachtstd.</span>
        ${urlaubstage > 0 ? '<span>' + urlaubstage + ' Urlaubstage</span>' : ''}
    </div>`;

    el.innerHTML = html;
}

// =============================================
// EINSTELLUNGEN
// =============================================
let einstellungen = JSON.parse(localStorage.getItem('bbprotect_einstellungen') || '{}');

function ladeEinstellungen() {
    const e = einstellungen;
    const fn = document.getElementById('einstFirmenname');
    const ss = document.getElementById('einstStdSatz');
    const am = document.getElementById('einstArbZGMax');
    const wm = document.getElementById('einstWocheMax');

    if (fn && e.firmenname) fn.value = e.firmenname;
    if (ss && e.standardSatz) ss.value = e.standardSatz;
    if (am && e.arbZGMax) am.value = e.arbZGMax;
    if (wm && e.wocheMax) wm.value = e.wocheMax;
}

function speichereEinstellungen() {
    einstellungen = {
        firmenname: document.getElementById('einstFirmenname').value.trim() || 'B.B. Protect',
        standardSatz: parseFloat(document.getElementById('einstStdSatz').value) || 15,
        arbZGMax: parseFloat(document.getElementById('einstArbZGMax').value) || 10,
        wocheMax: parseFloat(document.getElementById('einstWocheMax').value) || 48
    };
    localStorage.setItem('bbprotect_einstellungen', JSON.stringify(einstellungen));
}

// =============================================
// EINSATZ-TAGS
// =============================================
const EINSATZ_TAGS = ['VIP', 'Nacht', 'Notfall', 'Doppelt', 'Einarbeitung', 'Sonder'];

function einsatzTagToggle(id, tag) {
    const e = einsaetze.find(x => x.id === id);
    if (!e) return;
    if (!e.tags) e.tags = [];
    const idx = e.tags.indexOf(tag);
    if (idx !== -1) e.tags.splice(idx, 1);
    else e.tags.push(tag);
    speichern();
    renderTabelle();
}

function renderEinsatzTags(einsatz) {
    if (!einsatz.tags || einsatz.tags.length === 0) return '';
    return einsatz.tags.map(t => `<span class="etag etag-${t.toLowerCase()}">${escapeHtml(t)}</span>`).join(' ');
}

// =============================================
// FAVORITEN-OBJEKTE
// =============================================
let favObjekte = JSON.parse(localStorage.getItem('bbprotect_favObjekte') || '[]');

function toggleFavObjekt(name) {
    const idx = favObjekte.indexOf(name);
    if (idx !== -1) favObjekte.splice(idx, 1);
    else favObjekte.push(name);
    localStorage.setItem('bbprotect_favObjekte', JSON.stringify(favObjekte));
    renderObjekte();
}

// =============================================
// DASHBOARD-EXPORT
// =============================================
function exportDashboard() {
    const filterM = document.getElementById('dashboardMonat').value;
    const jetzt = new Date();
    const monat = filterM || `${jetzt.getFullYear()}-${String(jetzt.getMonth() + 1).padStart(2, '0')}`;
    const [j, m] = monat.split('-');

    let gefiltert = einsaetze;
    if (filterM) gefiltert = gefiltert.filter(e => e.datum.substring(0, 7) === filterM);

    const totalStd = gefiltert.reduce((s, e) => s + e.stunden, 0);
    const totalUmsatz = gefiltert.reduce((s, e) => s + e.gesamt, 0);
    const totalZuschlaege = gefiltert.reduce((s, e) => s + e.zuschlagBetrag, 0);
    const maSet = new Set(gefiltert.filter(e => e.mitarbeiter).map(e => e.mitarbeiter));
    const firma = einstellungen.firmenname || 'B.B. Protect';

    let html = printHeader();
    html += `<div class="bericht-section"><h2>Dashboard-Bericht: ${MONATSNAMEN[parseInt(m) - 1]} ${j}</h2>`;
    html += `<p>Erstellt am: ${jetzt.toLocaleDateString('de-DE')} ${jetzt.toLocaleTimeString('de-DE')}</p></div>`;

    html += '<div class="bericht-section"><h3>Kennzahlen</h3>';
    html += `<table><tbody>
        <tr><td><strong>Einsätze gesamt</strong></td><td>${gefiltert.length}</td></tr>
        <tr><td><strong>Stunden gesamt</strong></td><td>${formatZahl(totalStd)}</td></tr>
        <tr><td><strong>Umsatz gesamt</strong></td><td>${formatEuro(totalUmsatz)}</td></tr>
        <tr><td><strong>Zuschläge gesamt</strong></td><td>${formatEuro(totalZuschlaege)}</td></tr>
        <tr><td><strong>Mitarbeiter aktiv</strong></td><td>${maSet.size}</td></tr>
        <tr><td><strong>Ø Kosten/Std.</strong></td><td>${totalStd > 0 ? formatEuro(totalUmsatz / totalStd) : '—'}</td></tr>
        <tr><td><strong>Ø Schichtlänge</strong></td><td>${gefiltert.length > 0 ? formatZahl(totalStd / gefiltert.length) + ' Std.' : '—'}</td></tr>
    </tbody></table></div>`;

    // Objekt-Aufschlüsselung
    const objStats = {};
    gefiltert.forEach(e => {
        if (!objStats[e.objekt]) objStats[e.objekt] = { cnt: 0, std: 0, umsatz: 0 };
        objStats[e.objekt].cnt++;
        objStats[e.objekt].std += e.stunden;
        objStats[e.objekt].umsatz += e.gesamt;
    });

    html += '<div class="bericht-section"><h3>Nach Objekt</h3>';
    html += '<table><thead><tr><th>Objekt</th><th>Einsätze</th><th>Stunden</th><th>Umsatz</th></tr></thead><tbody>';
    Object.entries(objStats).sort((a, b) => b[1].umsatz - a[1].umsatz).forEach(([obj, d]) => {
        html += `<tr><td>${escapeHtml(obj)}</td><td>${d.cnt}</td><td>${formatZahl(d.std)}</td><td>${formatEuro(d.umsatz)}</td></tr>`;
    });
    html += '</tbody></table></div>';

    // MA-Aufschlüsselung
    const maStats = {};
    gefiltert.forEach(e => {
        const name = e.mitarbeiter || 'Nicht zugewiesen';
        if (!maStats[name]) maStats[name] = { cnt: 0, std: 0, umsatz: 0 };
        maStats[name].cnt++;
        maStats[name].std += e.stunden;
        maStats[name].umsatz += e.gesamt;
    });

    html += '<div class="bericht-section"><h3>Nach Mitarbeiter</h3>';
    html += '<table><thead><tr><th>Mitarbeiter</th><th>Einsätze</th><th>Stunden</th><th>Umsatz</th></tr></thead><tbody>';
    Object.entries(maStats).sort((a, b) => b[1].std - a[1].std).forEach(([name, d]) => {
        html += `<tr><td>${escapeHtml(name)}</td><td>${d.cnt}</td><td>${formatZahl(d.std)}</td><td>${formatEuro(d.umsatz)}</td></tr>`;
    });
    html += '</tbody></table></div>';

    html += printFooter();
    document.getElementById('printArea').innerHTML = html;
    window.print();
}

// =============================================
// ERWEITERTE VORFALLSSTATISTIK
// =============================================
function renderVorfallsStatistik() {
    const el = document.getElementById('vorfallsStatsContent');
    if (!el) return;

    if (vorfaelle.length === 0) {
        el.innerHTML = '<p style="color:#a0aec0">Keine Vorfälle für Statistiken.</p>';
        return;
    }

    // Typ-Verteilung
    const typCount = {};
    vorfaelle.forEach(v => {
        typCount[v.typ] = (typCount[v.typ] || 0) + 1;
    });

    const maxTyp = Math.max(...Object.values(typCount), 1);

    // Schwere-Verteilung
    const schwereCount = { gering: 0, mittel: 0, hoch: 0, kritisch: 0 };
    vorfaelle.forEach(v => {
        schwereCount[v.schwere] = (schwereCount[v.schwere] || 0) + 1;
    });

    // Monatstrend
    const monatsTrend = {};
    vorfaelle.forEach(v => {
        const m = v.datum.substring(0, 7);
        monatsTrend[m] = (monatsTrend[m] || 0) + 1;
    });

    let html = '<div class="vfs-grid">';
    html += `<div class="vfs-card"><div class="vfs-val">${vorfaelle.length}</div><div class="vfs-label">Vorfälle gesamt</div></div>`;
    html += `<div class="vfs-card vfs-${schwereCount.kritisch > 0 ? 'kritisch' : 'ok'}"><div class="vfs-val">${schwereCount.kritisch}</div><div class="vfs-label">Kritisch</div></div>`;
    html += `<div class="vfs-card"><div class="vfs-val">${schwereCount.hoch}</div><div class="vfs-label">Hoch</div></div>`;
    html += `<div class="vfs-card"><div class="vfs-val">${vorfaelle.filter(v => v.polizei).length}</div><div class="vfs-label">Polizei</div></div>`;
    html += '</div>';

    // Typ-Balken
    html += '<div class="vfs-section"><strong>Vorfallstypen:</strong></div>';
    Object.entries(typCount).sort((a, b) => b[1] - a[1]).forEach(([typ, count]) => {
        const pct = (count / maxTyp) * 100;
        html += `<div class="stat-row"><span class="stat-row-label">${escapeHtml(VORFALL_TYPEN[typ] || typ)}</span><div class="stat-bar"><div class="stat-bar-fill feiertag" style="width:${pct}%"></div></div><span class="stat-row-value">${count}</span></div>`;
    });

    // Monatstrend
    const trendMonate = Object.keys(monatsTrend).sort().slice(-6);
    if (trendMonate.length >= 2) {
        html += '<div class="vfs-section" style="margin-top:0.75rem"><strong>Monatstrend:</strong></div>';
        const maxTrend = Math.max(...trendMonate.map(m => monatsTrend[m]), 1);
        html += '<div class="vfs-trend">';
        trendMonate.forEach(m => {
            const [j, mo] = m.split('-');
            const pct = (monatsTrend[m] / maxTrend) * 100;
            html += `<div class="vfs-trend-col"><div class="vfs-trend-bar" style="height:${pct}%"></div><div class="vfs-trend-label">${MONATSNAMEN[parseInt(mo) - 1].substring(0, 3)}</div><div class="vfs-trend-val">${monatsTrend[m]}</div></div>`;
        });
        html += '</div>';
    }

    el.innerHTML = html;
}

// =============================================
// AUDIT-LOG (Änderungsverlauf)
// =============================================
function logAudit(aktion, typ, details) {
    auditLog.unshift({
        id: Date.now(),
        zeitpunkt: new Date().toISOString(),
        aktion,
        typ,
        details
    });
    // Max 500 Einträge behalten
    if (auditLog.length > 500) auditLog = auditLog.slice(0, 500);
    localStorage.setItem('bbprotect_auditlog', JSON.stringify(auditLog));
}

function renderAuditLog() {
    const el = document.getElementById('auditLogContent');
    if (!el) return;

    const filterTyp = document.getElementById('auditFilterTyp');
    const typ = filterTyp ? filterTyp.value : '';

    let gefiltert = auditLog;
    if (typ) gefiltert = gefiltert.filter(a => a.typ === typ);

    if (gefiltert.length === 0) {
        el.innerHTML = '<p style="color:#a0aec0">Keine Änderungen protokolliert.</p>';
        return;
    }

    const AKTION_ICONS = { erstellt: '+', bearbeitet: '~', geloescht: 'X', status: '\u2192', importiert: '\u2191', archiviert: '\u2193' };
    const AKTION_LABELS = { erstellt: 'Erstellt', bearbeitet: 'Bearbeitet', geloescht: 'Gelöscht', status: 'Status', importiert: 'Importiert', archiviert: 'Archiviert' };

    let html = '<div class="audit-liste">';
    gefiltert.slice(0, 50).forEach(a => {
        const d = new Date(a.zeitpunkt);
        const zeit = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        html += `<div class="audit-eintrag audit-${a.aktion}">
            <span class="audit-icon">${AKTION_ICONS[a.aktion] || '?'}</span>
            <span class="audit-zeit">${zeit}</span>
            <span class="audit-typ-badge">${escapeHtml(a.typ)}</span>
            <span class="audit-aktion">${AKTION_LABELS[a.aktion] || a.aktion}</span>
            <span class="audit-details">${escapeHtml(a.details)}</span>
        </div>`;
    });
    html += '</div>';
    if (gefiltert.length > 50) html += `<p style="color:#718096;font-size:0.8rem;margin-top:0.5rem">${gefiltert.length - 50} weitere Einträge...</p>`;

    el.innerHTML = html;
}

function auditLogLeeren() {
    if (!confirm('Alle Audit-Log-Einträge löschen?')) return;
    auditLog = [];
    localStorage.setItem('bbprotect_auditlog', JSON.stringify(auditLog));
    renderAuditLog();
}

// =============================================
// OBJEKT-KONTAKTLISTE
// =============================================
function objektKontaktSpeichern() {
    const objekt = document.getElementById('okObjekt').value;
    const rolle = document.getElementById('okRolle').value.trim();
    const name = document.getElementById('okName').value.trim();
    const telefon = document.getElementById('okTelefon').value.trim();
    const email = document.getElementById('okEmail').value.trim();

    if (!objekt || !name) { alert('Bitte Objekt und Name ausfüllen.'); return; }

    objektKontakte.push({
        id: Date.now(),
        objekt, rolle, name, telefon, email
    });
    localStorage.setItem('bbprotect_objektkontakte', JSON.stringify(objektKontakte));
    logAudit('erstellt', 'Objekt-Kontakt', `${name} (${rolle}) für ${objekt}`);
    renderObjektKontakte();

    document.getElementById('okRolle').value = '';
    document.getElementById('okName').value = '';
    document.getElementById('okTelefon').value = '';
    document.getElementById('okEmail').value = '';
}

function renderObjektKontakte() {
    const el = document.getElementById('objektKontakteContent');
    if (!el) return;

    const selObj = document.getElementById('okObjekt');
    const objekt = selObj ? selObj.value : '';

    const gefiltert = objekt ? objektKontakte.filter(k => k.objekt === objekt) : objektKontakte;

    if (gefiltert.length === 0) {
        el.innerHTML = '<p style="color:#a0aec0">Keine Kontakte für dieses Objekt.</p>';
        return;
    }

    let html = '<table class="ok-tabelle"><thead><tr><th>Objekt</th><th>Rolle</th><th>Name</th><th>Telefon</th><th>E-Mail</th><th>Akt.</th></tr></thead><tbody>';
    gefiltert.forEach(k => {
        html += `<tr>
            <td>${escapeHtml(k.objekt)}</td>
            <td>${escapeHtml(k.rolle || '\u2014')}</td>
            <td><strong>${escapeHtml(k.name)}</strong></td>
            <td>${k.telefon ? '<a href="tel:' + escapeHtml(k.telefon) + '">' + escapeHtml(k.telefon) + '</a>' : '\u2014'}</td>
            <td>${k.email ? '<a href="mailto:' + escapeHtml(k.email) + '">' + escapeHtml(k.email) + '</a>' : '\u2014'}</td>
            <td><button class="btn-delete" onclick="loescheObjektKontakt(${k.id})">X</button></td>
        </tr>`;
    });
    html += '</tbody></table>';
    el.innerHTML = html;
}

function loescheObjektKontakt(id) {
    if (!confirm('Kontakt löschen?')) return;
    const k = objektKontakte.find(x => x.id === id);
    objektKontakte = objektKontakte.filter(x => x.id !== id);
    localStorage.setItem('bbprotect_objektkontakte', JSON.stringify(objektKontakte));
    if (k) logAudit('geloescht', 'Objekt-Kontakt', `${k.name} (${k.objekt})`);
    renderObjektKontakte();
}

function updateObjektKontakteSelect() {
    const sel = document.getElementById('okObjekt');
    if (!sel) return;
    const val = sel.value;
    sel.innerHTML = '<option value="">Alle Objekte</option>';
    objekte.forEach(o => {
        sel.innerHTML += `<option value="${escapeHtml(o.name)}" ${o.name === val ? 'selected' : ''}>${escapeHtml(o.name)}</option>`;
    });
}

// =============================================
// VERFÜGBARKEITS-WOCHENANSICHT
// =============================================
function renderVerfuegbarkeitWoche() {
    const el = document.getElementById('verfWocheContent');
    if (!el) return;

    const heute = new Date();
    const montag = new Date(heute);
    const tag = montag.getDay();
    const diff = tag === 0 ? 6 : tag - 1;
    montag.setDate(montag.getDate() - diff);
    montag.setHours(0, 0, 0, 0);

    const wochentage = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    const tage = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(montag);
        d.setDate(d.getDate() + i);
        tage.push(d.toISOString().split('T')[0]);
    }

    const maListe = mitarbeiterListe_.map(m => m.name);
    if (maListe.length === 0) {
        el.innerHTML = '<p style="color:#a0aec0">Keine Mitarbeiter vorhanden.</p>';
        return;
    }

    const VERF_FARBEN = { urlaub: '#e53e3e', krank: '#ed8936', frei: '#a0aec0', fortbildung: '#805ad5' };

    let html = '<div class="vw-grid">';
    html += '<div class="vw-header vw-ma-col">Mitarbeiter</div>';
    tage.forEach((t, i) => {
        const d = new Date(t + 'T12:00:00');
        const istHeute = t === heute.toISOString().split('T')[0];
        html += `<div class="vw-header ${istHeute ? 'vw-heute' : ''}">${wochentage[i]}<br><small>${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.</small></div>`;
    });

    maListe.forEach(ma => {
        html += `<div class="vw-ma-col">${escapeHtml(ma)}</div>`;
        tage.forEach(t => {
            const abw = verfuegbarkeit.find(v => v.mitarbeiter === ma && v.von <= t && v.bis >= t);
            const einsaetzeHeute = einsaetze.filter(e => e.mitarbeiter === ma && e.datum === t);

            let cls = 'vw-frei';
            let inhalt = '';
            if (abw) {
                cls = 'vw-abwesend';
                inhalt = `<span class="vw-badge" style="background:${VERF_FARBEN[abw.typ] || '#a0aec0'}">${abw.typ.substring(0, 1).toUpperCase()}</span>`;
            } else if (einsaetzeHeute.length > 0) {
                cls = 'vw-eingeteilt';
                const std = einsaetzeHeute.reduce((s, e) => s + e.stunden, 0);
                inhalt = `<span class="vw-std">${formatZahl(std)}h</span>`;
            }
            html += `<div class="vw-zelle ${cls}">${inhalt}</div>`;
        });
    });

    html += '</div>';

    html += '<div class="vw-legende">';
    html += '<span class="vw-leg-item"><span class="vw-leg-box vw-eingeteilt"></span>Eingeteilt</span>';
    html += '<span class="vw-leg-item"><span class="vw-leg-box" style="background:#e53e3e"></span>Urlaub</span>';
    html += '<span class="vw-leg-item"><span class="vw-leg-box" style="background:#ed8936"></span>Krank</span>';
    html += '<span class="vw-leg-item"><span class="vw-leg-box" style="background:#a0aec0"></span>Frei</span>';
    html += '<span class="vw-leg-item"><span class="vw-leg-box" style="background:#805ad5"></span>Fortbildung</span>';
    html += '<span class="vw-leg-item"><span class="vw-leg-box vw-frei"></span>Verfügbar</span>';
    html += '</div>';

    el.innerHTML = html;
}

// =============================================
// DOPPELSCHICHT-WARNUNG (Ruhezeit §5 ArbZG)
// =============================================
function pruefeDoppelschichten() {
    const warnungen = [];
    const MIN_RUHEZEIT = 11; // §5 ArbZG: 11 Stunden Ruhezeit

    // Gruppiere Einsätze nach Mitarbeiter
    const maEinsaetze = {};
    einsaetze.forEach(e => {
        if (!e.mitarbeiter) return;
        if (!maEinsaetze[e.mitarbeiter]) maEinsaetze[e.mitarbeiter] = [];
        maEinsaetze[e.mitarbeiter].push(e);
    });

    Object.entries(maEinsaetze).forEach(([ma, liste]) => {
        // Sortiere nach Datum + Startzeit
        liste.sort((a, b) => (a.datum + a.zeitVon).localeCompare(b.datum + b.zeitVon));

        for (let i = 0; i < liste.length - 1; i++) {
            const aktuell = liste[i];
            const naechst = liste[i + 1];

            // Berechne Endzeit des aktuellen Einsatzes
            const [eh, em] = aktuell.zeitBis.split(':').map(Number);
            const [sh, sm] = naechst.zeitVon.split(':').map(Number);

            let endMinuten = eh * 60 + em;
            let startMinuten = sh * 60 + sm;

            // Wenn gleicher Tag
            if (aktuell.datum === naechst.datum) {
                if (endMinuten <= aktuell.zeitVon.split(':').map(Number)[0] * 60 + parseInt(aktuell.zeitVon.split(':')[1])) {
                    // Schicht geht über Mitternacht - nächste Schicht am selben Tag
                    continue;
                }
                const pause = (startMinuten - endMinuten) / 60;
                if (pause >= 0 && pause < MIN_RUHEZEIT) {
                    warnungen.push({
                        ma,
                        datum: aktuell.datum,
                        pause: pause,
                        schicht1: `${aktuell.zeitVon}-${aktuell.zeitBis}`,
                        schicht2: `${naechst.zeitVon}-${naechst.zeitBis}`
                    });
                }
            } else {
                // Verschiedene Tage - prüfe Tag-zu-Tag-Übergang
                const d1 = new Date(aktuell.datum + 'T00:00:00');
                const d2 = new Date(naechst.datum + 'T00:00:00');
                const tageDiff = (d2 - d1) / (1000 * 60 * 60 * 24);

                if (tageDiff === 1) {
                    // Endzeit am aktuellen Tag bis Startzeit am nächsten Tag
                    const ruhezeit = (24 * 60 - endMinuten + startMinuten) / 60;
                    if (ruhezeit < MIN_RUHEZEIT) {
                        warnungen.push({
                            ma,
                            datum: aktuell.datum,
                            pause: ruhezeit,
                            schicht1: `${formatDatum(aktuell.datum)} ${aktuell.zeitVon}-${aktuell.zeitBis}`,
                            schicht2: `${formatDatum(naechst.datum)} ${naechst.zeitVon}-${naechst.zeitBis}`
                        });
                    }
                }
            }
        }
    });

    return warnungen;
}

function renderDoppelschichtWarnungen() {
    const el = document.getElementById('doppelschichtContent');
    if (!el) return;

    const warnungen = pruefeDoppelschichten();

    if (warnungen.length === 0) {
        el.innerHTML = '<p style="color:#48bb78">Keine Ruhezeitverletzungen gefunden.</p>';
        return;
    }

    let html = `<div class="ds-hinweis">Es wurden <strong>${warnungen.length}</strong> Ruhezeitverletzungen nach §5 ArbZG (min. 11 Std.) gefunden:</div>`;
    html += '<div class="ds-liste">';
    warnungen.forEach(w => {
        const stunden = formatZahl(w.pause);
        html += `<div class="ds-warnung">
            <span class="ds-ma">${escapeHtml(w.ma)}</span>
            <span class="ds-info">Nur <strong>${stunden} Std.</strong> Ruhezeit</span>
            <span class="ds-schichten">${escapeHtml(w.schicht1)} → ${escapeHtml(w.schicht2)}</span>
        </div>`;
    });
    html += '</div>';
    el.innerHTML = html;
}

// =============================================
// MA-LEISTUNGSÜBERSICHT
// =============================================
function renderMALeistung() {
    const el = document.getElementById('maLeistungContent');
    if (!el) return;

    if (mitarbeiterListe_.length === 0) {
        el.innerHTML = '<p style="color:#a0aec0">Keine Mitarbeiter vorhanden.</p>';
        return;
    }

    const heute = new Date().toISOString().split('T')[0];
    const monat = heute.substring(0, 7);

    let html = '<div class="mal-grid">';

    mitarbeiterListe_.forEach(m => {
        const maE = einsaetze.filter(e => e.mitarbeiter === m.name);
        const maMonat = maE.filter(e => e.datum.substring(0, 7) === monat);

        const totalStd = maE.reduce((s, e) => s + e.stunden, 0);
        const monatStd = maMonat.reduce((s, e) => s + e.stunden, 0);
        const storniert = maE.filter(e => e.status === 'storniert').length;
        const stornoRate = maE.length > 0 ? (storniert / maE.length * 100) : 0;

        // Bevorzugte Objekte
        const objCount = {};
        maE.forEach(e => { objCount[e.objekt] = (objCount[e.objekt] || 0) + 1; });
        const topObjekte = Object.entries(objCount).sort((a, b) => b[1] - a[1]).slice(0, 3);

        // Durchschnittliche Schichtlänge
        const avgStd = maE.length > 0 ? totalStd / maE.length : 0;

        // Zuverlässigkeits-Score
        const zuverlaessigkeit = maE.length > 0 ? Math.round((1 - storniert / maE.length) * 100) : 100;
        const zuverCls = zuverlaessigkeit >= 90 ? 'mal-gut' : zuverlaessigkeit >= 70 ? 'mal-mittel' : 'mal-schlecht';

        html += `<div class="mal-card">
            <div class="mal-header"><strong>${escapeHtml(m.name)}</strong><span class="mal-score ${zuverCls}">${zuverlaessigkeit}%</span></div>
            <div class="mal-stats">
                <div class="mal-stat"><span class="mal-label">Einsätze gesamt</span><span class="mal-val">${maE.length}</span></div>
                <div class="mal-stat"><span class="mal-label">Stunden gesamt</span><span class="mal-val">${formatZahl(totalStd)}</span></div>
                <div class="mal-stat"><span class="mal-label">Monat (${MONATSNAMEN[new Date().getMonth()].substring(0, 3)})</span><span class="mal-val">${formatZahl(monatStd)} Std.</span></div>
                <div class="mal-stat"><span class="mal-label">Ø Schichtlänge</span><span class="mal-val">${formatZahl(avgStd)} Std.</span></div>
                <div class="mal-stat"><span class="mal-label">Stornoquote</span><span class="mal-val ${stornoRate > 10 ? 'mal-schlecht' : ''}">${formatZahl(stornoRate)}%</span></div>
            </div>
            ${topObjekte.length > 0 ? '<div class="mal-objekte"><small>Top-Objekte:</small> ' + topObjekte.map(([o, c]) => `<span class="mal-obj-badge">${escapeHtml(o)} (${c})</span>`).join(' ') + '</div>' : ''}
        </div>`;
    });

    html += '</div>';
    el.innerHTML = html;
}

// =============================================
// OBJEKT-DIENSTANWEISUNGEN
// =============================================
let objektAnweisungen = JSON.parse(localStorage.getItem('bbprotect_objektanweisungen') || '{}');

function speichereObjektAnweisung() {
    const objekt = document.getElementById('oaObjekt').value;
    const text = document.getElementById('oaText').value.trim();

    if (!objekt) { alert('Bitte Objekt wählen.'); return; }
    if (!text) { alert('Bitte Dienstanweisung eingeben.'); return; }

    if (!objektAnweisungen[objekt]) objektAnweisungen[objekt] = [];
    objektAnweisungen[objekt].push({
        id: Date.now(),
        text,
        datum: new Date().toISOString().split('T')[0],
        aktiv: true
    });

    localStorage.setItem('bbprotect_objektanweisungen', JSON.stringify(objektAnweisungen));
    logAudit('erstellt', 'Dienstanweisung', `${objekt}: ${text.substring(0, 50)}...`);
    renderObjektAnweisungen();
    document.getElementById('oaText').value = '';
}

function renderObjektAnweisungen() {
    const el = document.getElementById('objektAnweisungenContent');
    if (!el) return;

    const objekt = document.getElementById('oaObjekt').value;
    if (!objekt) {
        el.innerHTML = '<p style="color:#a0aec0">Bitte Objekt wählen.</p>';
        return;
    }

    const anweisungen = objektAnweisungen[objekt] || [];
    if (anweisungen.length === 0) {
        el.innerHTML = '<p style="color:#a0aec0">Keine Dienstanweisungen für dieses Objekt.</p>';
        return;
    }

    let html = '<div class="oa-liste">';
    anweisungen.forEach(a => {
        html += `<div class="oa-item ${a.aktiv ? '' : 'oa-inaktiv'}">
            <div class="oa-text">${escapeHtml(a.text)}</div>
            <div class="oa-meta">
                <span class="oa-datum">${formatDatum(a.datum)}</span>
                <button class="btn-secondary btn-small" onclick="toggleObjektAnweisung('${escapeHtml(objekt)}',${a.id})">${a.aktiv ? 'Deaktivieren' : 'Aktivieren'}</button>
                <button class="btn-delete btn-small" onclick="loescheObjektAnweisung('${escapeHtml(objekt)}',${a.id})">X</button>
            </div>
        </div>`;
    });
    html += '</div>';
    el.innerHTML = html;
}

function toggleObjektAnweisung(objekt, id) {
    const anw = (objektAnweisungen[objekt] || []).find(a => a.id === id);
    if (anw) anw.aktiv = !anw.aktiv;
    localStorage.setItem('bbprotect_objektanweisungen', JSON.stringify(objektAnweisungen));
    renderObjektAnweisungen();
}

function loescheObjektAnweisung(objekt, id) {
    if (!confirm('Dienstanweisung löschen?')) return;
    objektAnweisungen[objekt] = (objektAnweisungen[objekt] || []).filter(a => a.id !== id);
    localStorage.setItem('bbprotect_objektanweisungen', JSON.stringify(objektAnweisungen));
    renderObjektAnweisungen();
}

function updateObjektAnweisungenSelect() {
    const sel = document.getElementById('oaObjekt');
    if (!sel) return;
    const val = sel.value;
    sel.innerHTML = '<option value="">Objekt wählen...</option>';
    objekte.forEach(o => {
        sel.innerHTML += `<option value="${escapeHtml(o.name)}" ${o.name === val ? 'selected' : ''}>${escapeHtml(o.name)}</option>`;
    });
}

// =============================================
// LOHNABRECHNUNG-VORSCHAU
// =============================================
function renderLohnvorschau() {
    const el = document.getElementById('lohnvorschauContent');
    if (!el) return;

    const maSelect = document.getElementById('lvMa');
    const monatSelect = document.getElementById('lvMonat');
    if (!maSelect || !monatSelect) return;

    const maN = maSelect.value;
    const monat = monatSelect.value || new Date().toISOString().substring(0, 7);

    if (!maN) {
        el.innerHTML = '<p style="color:#a0aec0">Mitarbeiter wählen...</p>';
        return;
    }

    const maEinsaetze = einsaetze.filter(e => e.mitarbeiter === maN && e.datum.substring(0, 7) === monat && e.status !== 'storniert');

    if (maEinsaetze.length === 0) {
        el.innerHTML = '<p style="color:#a0aec0">Keine Einsätze in diesem Monat.</p>';
        return;
    }

    const totalStd = maEinsaetze.reduce((s, e) => s + e.stunden, 0);
    const totalNacht = maEinsaetze.reduce((s, e) => s + e.nachtStunden, 0);
    const totalGrund = maEinsaetze.reduce((s, e) => s + e.grundlohn, 0);
    const totalZuschlag = maEinsaetze.reduce((s, e) => s + e.zuschlagBetrag, 0);
    const totalBrutto = totalGrund + totalZuschlag;
    const totalPause = maEinsaetze.reduce((s, e) => s + (e.pauseMinuten || 0), 0);

    // Simulierte Abzüge (Richtwerte)
    const kvBeitrag = totalBrutto * 0.073; // AN-Anteil KV ~7.3%
    const rvBeitrag = totalBrutto * 0.093; // AN-Anteil RV ~9.3%
    const avBeitrag = totalBrutto * 0.012; // AN-Anteil AV ~1.2%
    const pvBeitrag = totalBrutto * 0.018; // AN-Anteil PV ~1.8%
    const svGesamt = kvBeitrag + rvBeitrag + avBeitrag + pvBeitrag;
    const lstGeschaetzt = totalBrutto * 0.14; // Grober LStSchätzung
    const netto = totalBrutto - svGesamt - lstGeschaetzt;

    const [j, m] = monat.split('-');
    const zeitraum = `${MONATSNAMEN[parseInt(m) - 1]} ${j}`;

    let html = `<div class="lv-card">
        <div class="lv-header"><strong>${escapeHtml(maN)}</strong><span>${zeitraum}</span></div>
        <div class="lv-grid">
            <div class="lv-row"><span>Einsätze</span><span>${maEinsaetze.length}</span></div>
            <div class="lv-row"><span>Arbeitsstunden</span><span>${formatZahl(totalStd)} Std.</span></div>
            <div class="lv-row"><span>davon Nachtarbeit</span><span>${formatZahl(totalNacht)} Std.</span></div>
            <div class="lv-row"><span>Pausenzeit gesamt</span><span>${totalPause} Min.</span></div>
            <div class="lv-divider"></div>
            <div class="lv-row"><span>Grundlohn</span><span>${formatEuro(totalGrund)}</span></div>
            <div class="lv-row"><span>Zuschläge</span><span>${formatEuro(totalZuschlag)}</span></div>
            <div class="lv-row lv-brutto"><span>Bruttolohn</span><span>${formatEuro(totalBrutto)}</span></div>
            <div class="lv-divider"></div>
            <div class="lv-row lv-abzug"><span>Krankenversicherung (~7,3%)</span><span>-${formatEuro(kvBeitrag)}</span></div>
            <div class="lv-row lv-abzug"><span>Rentenversicherung (~9,3%)</span><span>-${formatEuro(rvBeitrag)}</span></div>
            <div class="lv-row lv-abzug"><span>Arbeitslosenversicherung (~1,2%)</span><span>-${formatEuro(avBeitrag)}</span></div>
            <div class="lv-row lv-abzug"><span>Pflegeversicherung (~1,8%)</span><span>-${formatEuro(pvBeitrag)}</span></div>
            <div class="lv-row lv-abzug"><span>Lohnsteuer (geschätzt ~14%)</span><span>-${formatEuro(lstGeschaetzt)}</span></div>
            <div class="lv-divider"></div>
            <div class="lv-row lv-netto"><span>Geschätztes Netto</span><span>${formatEuro(netto)}</span></div>
        </div>
        <p class="lv-hinweis">Die Abzüge sind Richtwerte und dienen nur zur Orientierung. Tatsächliche Beträge hängen von Steuerklasse, Kirchensteuer und individuellen Faktoren ab.</p>
    </div>`;

    el.innerHTML = html;
}

function updateLohnvorschauSelects() {
    const maSel = document.getElementById('lvMa');
    const monatSel = document.getElementById('lvMonat');
    if (!maSel || !monatSel) return;

    const maVal = maSel.value;
    maSel.innerHTML = '<option value="">Mitarbeiter wählen...</option>';
    mitarbeiterListe_.forEach(m => {
        maSel.innerHTML += `<option value="${escapeHtml(m.name)}" ${m.name === maVal ? 'selected' : ''}>${escapeHtml(m.name)}</option>`;
    });

    const monatVal = monatSel.value;
    const monate = new Set();
    einsaetze.forEach(e => monate.add(e.datum.substring(0, 7)));
    const sortedMonate = [...monate].sort().reverse();
    monatSel.innerHTML = '<option value="">Aktueller Monat</option>';
    sortedMonate.forEach(m => {
        const [j, mo] = m.split('-');
        monatSel.innerHTML += `<option value="${m}" ${m === monatVal ? 'selected' : ''}>${MONATSNAMEN[parseInt(mo) - 1]} ${j}</option>`;
    });
}

// =============================================
// EINSATZ-DUPLIKAT-ERKENNUNG
// =============================================
function findeEinsatzDuplikate() {
    const duplikate = [];
    for (let i = 0; i < einsaetze.length; i++) {
        for (let j = i + 1; j < einsaetze.length; j++) {
            const a = einsaetze[i];
            const b = einsaetze[j];
            if (a.datum === b.datum && a.objekt === b.objekt &&
                a.zeitVon === b.zeitVon && a.zeitBis === b.zeitBis &&
                a.mitarbeiter === b.mitarbeiter && a.mitarbeiter) {
                duplikate.push({ a, b });
            }
        }
    }
    return duplikate;
}

function renderDuplikatCheck() {
    const el = document.getElementById('duplikatCheckContent');
    if (!el) return;

    const duplikate = findeEinsatzDuplikate();

    if (duplikate.length === 0) {
        el.innerHTML = '<p style="color:#48bb78">Keine Duplikate gefunden.</p>';
        return;
    }

    let html = `<div class="dup-hinweis">${duplikate.length} mögliche Duplikat(e) gefunden:</div>`;
    html += '<div class="dup-liste">';
    duplikate.forEach(d => {
        html += `<div class="dup-item">
            <span class="dup-info">${formatDatum(d.a.datum)} | ${escapeHtml(d.a.objekt)} | ${escapeHtml(d.a.mitarbeiter)} | ${d.a.zeitVon}-${d.a.zeitBis}</span>
            <button class="btn-delete btn-small" onclick="loescheEinsatz(${d.b.id})">Duplikat löschen</button>
        </div>`;
    });
    html += '</div>';
    el.innerHTML = html;
}

// =============================================
// SCHICHTPLAN-DRUCKANSICHT (Wochenplan)
// =============================================
function druckeSchichtplan() {
    const printArea = document.getElementById('printArea');
    if (!printArea) return;

    const montag = getMontag(dienstplanJahr, dienstplanKW);
    const wochentage = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
    const tage = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(montag);
        d.setUTCDate(d.getUTCDate() + i);
        tage.push(d.toISOString().split('T')[0]);
    }

    const einstName = einstellungen.firmenname || 'B.B. Protect';

    let html = `<h2 style="margin-bottom:0.5rem">${escapeHtml(einstName)} - Schichtplan KW ${dienstplanKW} / ${dienstplanJahr}</h2>`;
    html += `<p style="margin-bottom:1rem;color:#718096">Erstellt am ${formatDatum(new Date().toISOString().split('T')[0])}</p>`;

    html += '<table style="width:100%;border-collapse:collapse;font-size:0.8rem">';
    html += '<thead><tr style="background:#edf2f7"><th style="padding:0.4rem;border:1px solid #ccc">Tag</th><th style="padding:0.4rem;border:1px solid #ccc">Datum</th><th style="padding:0.4rem;border:1px solid #ccc">Objekt</th><th style="padding:0.4rem;border:1px solid #ccc">Mitarbeiter</th><th style="padding:0.4rem;border:1px solid #ccc">Von</th><th style="padding:0.4rem;border:1px solid #ccc">Bis</th><th style="padding:0.4rem;border:1px solid #ccc">Std.</th></tr></thead><tbody>';

    tage.forEach((t, i) => {
        const tagesE = einsaetze.filter(e => e.datum === t && e.status !== 'storniert').sort((a, b) => a.zeitVon.localeCompare(b.zeitVon));
        if (tagesE.length === 0) {
            html += `<tr><td style="padding:0.3rem;border:1px solid #ccc;font-weight:600">${wochentage[i]}</td><td style="padding:0.3rem;border:1px solid #ccc">${formatDatum(t)}</td><td colspan="5" style="padding:0.3rem;border:1px solid #ccc;color:#a0aec0">Keine Einsätze</td></tr>`;
        } else {
            tagesE.forEach((e, j) => {
                html += `<tr><td style="padding:0.3rem;border:1px solid #ccc;font-weight:${j === 0 ? '600' : '400'}">${j === 0 ? wochentage[i] : ''}</td><td style="padding:0.3rem;border:1px solid #ccc">${j === 0 ? formatDatum(t) : ''}</td><td style="padding:0.3rem;border:1px solid #ccc">${escapeHtml(e.objekt)}</td><td style="padding:0.3rem;border:1px solid #ccc">${escapeHtml(e.mitarbeiter || '\u2014')}</td><td style="padding:0.3rem;border:1px solid #ccc">${e.zeitVon}</td><td style="padding:0.3rem;border:1px solid #ccc">${e.zeitBis}</td><td style="padding:0.3rem;border:1px solid #ccc">${formatZahl(e.stunden)}</td></tr>`;
            });
        }
    });

    html += '</tbody></table>';

    // Abwesende MA
    const abwesende = verfuegbarkeit.filter(v => {
        return tage.some(t => v.von <= t && v.bis >= t);
    });
    if (abwesende.length > 0) {
        html += '<div style="margin-top:1rem"><strong>Abwesende Mitarbeiter:</strong><ul style="margin-top:0.3rem">';
        abwesende.forEach(v => {
            html += `<li>${escapeHtml(v.mitarbeiter)} (${v.typ}: ${formatDatum(v.von)} - ${formatDatum(v.bis)})</li>`;
        });
        html += '</ul></div>';
    }

    printArea.innerHTML = html;
    window.print();
}

// =============================================
// KRANKENSTATISTIK
// =============================================
function renderKrankenstatistik() {
    const el = document.getElementById('krankenStatsContent');
    if (!el) return;

    const krankEntries = verfuegbarkeit.filter(v => v.typ === 'krank');
    if (krankEntries.length === 0) {
        el.innerHTML = '<p style="color:#a0aec0">Keine Krankheitsdaten vorhanden.</p>';
        return;
    }

    // Pro MA aggregieren
    const maStats = {};
    krankEntries.forEach(k => {
        if (!maStats[k.mitarbeiter]) maStats[k.mitarbeiter] = { tage: 0, eintraege: 0 };
        const von = new Date(k.von + 'T00:00:00');
        const bis = new Date(k.bis + 'T00:00:00');
        const diff = Math.ceil((bis - von) / (1000 * 60 * 60 * 24)) + 1;
        maStats[k.mitarbeiter].tage += diff;
        maStats[k.mitarbeiter].eintraege++;
    });

    const totalTage = Object.values(maStats).reduce((s, m) => s + m.tage, 0);
    const maxTage = Math.max(...Object.values(maStats).map(m => m.tage), 1);

    let html = '<div class="ks-summary">';
    html += `<div class="ks-card"><div class="ks-val">${totalTage}</div><div class="ks-label">Krankheitstage gesamt</div></div>`;
    html += `<div class="ks-card"><div class="ks-val">${krankEntries.length}</div><div class="ks-label">Krankmeldungen</div></div>`;
    html += `<div class="ks-card"><div class="ks-val">${Object.keys(maStats).length}</div><div class="ks-label">Betroffene MA</div></div>`;
    html += `<div class="ks-card"><div class="ks-val">${formatZahl(totalTage / Math.max(Object.keys(maStats).length, 1))}</div><div class="ks-label">Ø Tage/MA</div></div>`;
    html += '</div>';

    // Balkendiagramm pro MA
    html += '<div style="margin-top:0.75rem">';
    Object.entries(maStats).sort((a, b) => b[1].tage - a[1].tage).forEach(([ma, s]) => {
        const pct = (s.tage / maxTage) * 100;
        html += `<div class="stat-row"><span class="stat-row-label">${escapeHtml(ma)}</span><div class="stat-bar"><div class="stat-bar-fill" style="width:${pct}%;background:#e53e3e"></div></div><span class="stat-row-value">${s.tage} Tage (${s.eintraege}x)</span></div>`;
    });
    html += '</div>';

    // Monatliche Verteilung
    const monatVerteilung = {};
    krankEntries.forEach(k => {
        const m = k.von.substring(0, 7);
        const von = new Date(k.von + 'T00:00:00');
        const bis = new Date(k.bis + 'T00:00:00');
        const diff = Math.ceil((bis - von) / (1000 * 60 * 60 * 24)) + 1;
        monatVerteilung[m] = (monatVerteilung[m] || 0) + diff;
    });

    const sortedMonate = Object.keys(monatVerteilung).sort().slice(-6);
    if (sortedMonate.length >= 2) {
        const maxMon = Math.max(...sortedMonate.map(m => monatVerteilung[m]), 1);
        html += '<div style="margin-top:0.75rem"><strong style="font-size:0.8rem">Monatliche Krankheitstage:</strong></div>';
        html += '<div class="vfs-trend" style="margin-top:0.3rem">';
        sortedMonate.forEach(m => {
            const [j, mo] = m.split('-');
            const pct = (monatVerteilung[m] / maxMon) * 100;
            html += `<div class="vfs-trend-col"><div class="vfs-trend-bar" style="height:${pct}%;background:#e53e3e"></div><div class="vfs-trend-label">${MONATSNAMEN[parseInt(mo) - 1].substring(0, 3)}</div><div class="vfs-trend-val">${monatVerteilung[m]}</div></div>`;
        });
        html += '</div>';
    }

    el.innerHTML = html;
}

// =============================================
// OBJEKT-KOSTENANALYSE
// =============================================
function renderObjektKostenanalyse() {
    const el = document.getElementById('objektKostenContent');
    if (!el) return;

    const monatSel = document.getElementById('okAnalyseMonat');
    const monat = monatSel ? monatSel.value : '';

    let gefiltert = einsaetze.filter(e => e.status !== 'storniert');
    if (monat) gefiltert = gefiltert.filter(e => e.datum.substring(0, 7) === monat);

    if (gefiltert.length === 0) {
        el.innerHTML = '<p style="color:#a0aec0">Keine Einsätze für diesen Zeitraum.</p>';
        return;
    }

    // Gruppiere nach Objekt
    const objMap = {};
    gefiltert.forEach(e => {
        if (!objMap[e.objekt]) objMap[e.objekt] = { stunden: 0, grundlohn: 0, zuschlaege: 0, gesamt: 0, einsaetze: 0, maSet: new Set() };
        objMap[e.objekt].stunden += e.stunden;
        objMap[e.objekt].grundlohn += e.grundlohn;
        objMap[e.objekt].zuschlaege += e.zuschlagBetrag;
        objMap[e.objekt].gesamt += e.gesamt;
        objMap[e.objekt].einsaetze++;
        if (e.mitarbeiter) objMap[e.objekt].maSet.add(e.mitarbeiter);
    });

    const totalGesamt = Object.values(objMap).reduce((s, o) => s + o.gesamt, 0);

    let html = '<div class="oka-grid">';
    Object.entries(objMap).sort((a, b) => b[1].gesamt - a[1].gesamt).forEach(([name, d]) => {
        const anteil = totalGesamt > 0 ? (d.gesamt / totalGesamt * 100) : 0;
        const kostenProStd = d.stunden > 0 ? d.gesamt / d.stunden : 0;

        html += `<div class="oka-card">
            <div class="oka-header"><strong>${escapeHtml(name)}</strong><span class="oka-anteil">${formatZahl(anteil)}%</span></div>
            <div class="oka-bar" style="--anteil:${anteil}%"></div>
            <div class="oka-stats">
                <div class="oka-stat"><span>Einsätze</span><span>${d.einsaetze}</span></div>
                <div class="oka-stat"><span>Stunden</span><span>${formatZahl(d.stunden)}</span></div>
                <div class="oka-stat"><span>Grundlohn</span><span>${formatEuro(d.grundlohn)}</span></div>
                <div class="oka-stat"><span>Zuschläge</span><span>${formatEuro(d.zuschlaege)}</span></div>
                <div class="oka-stat"><span>Kosten/Std.</span><span>${formatEuro(kostenProStd)}</span></div>
                <div class="oka-stat oka-total"><span>Gesamt</span><span>${formatEuro(d.gesamt)}</span></div>
                <div class="oka-stat"><span>MA eingesetzt</span><span>${d.maSet.size}</span></div>
            </div>
        </div>`;
    });
    html += '</div>';

    html += `<div class="oka-total-row"><strong>Gesamtkosten:</strong> ${formatEuro(totalGesamt)} | ${formatZahl(Object.values(objMap).reduce((s, o) => s + o.stunden, 0))} Stunden | ${gefiltert.length} Einsätze</div>`;

    el.innerHTML = html;
}

function updateObjektKostenMonat() {
    const sel = document.getElementById('okAnalyseMonat');
    if (!sel) return;
    const val = sel.value;
    const monate = new Set();
    einsaetze.forEach(e => monate.add(e.datum.substring(0, 7)));
    sel.innerHTML = '<option value="">Alle Monate</option>';
    [...monate].sort().reverse().forEach(m => {
        const [j, mo] = m.split('-');
        sel.innerHTML += `<option value="${m}" ${m === val ? 'selected' : ''}>${MONATSNAMEN[parseInt(mo) - 1]} ${j}</option>`;
    });
}

// =============================================
// EINSATZ-CHRONIK (Zeitstrahl)
// =============================================
function renderEinsatzChronik() {
    const el = document.getElementById('chronikContent');
    if (!el) return;

    const anzahl = 20;
    const sortiert = [...einsaetze].sort((a, b) => (b.datum + b.zeitVon).localeCompare(a.datum + a.zeitVon));
    const letzteN = sortiert.slice(0, anzahl);

    if (letzteN.length === 0) {
        el.innerHTML = '<p style="color:#a0aec0">Keine Einsätze vorhanden.</p>';
        return;
    }

    let html = '<div class="chronik-timeline">';
    let letztesDatum = '';

    letzteN.forEach(e => {
        if (e.datum !== letztesDatum) {
            letztesDatum = e.datum;
            const d = new Date(e.datum + 'T12:00:00');
            const wt = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][d.getDay()];
            html += `<div class="chronik-datum">${wt}, ${formatDatum(e.datum)}</div>`;
        }

        const statusCls = e.status ? 'status-' + e.status : '';
        html += `<div class="chronik-eintrag">
            <div class="chronik-zeit">${e.zeitVon}<br>${e.zeitBis}</div>
            <div class="chronik-linie"></div>
            <div class="chronik-inhalt ${statusCls}">
                <div class="chronik-obj"><span class="obj-farbe" style="background:${getObjektFarbe(e.objekt)}"></span>${escapeHtml(e.objekt)}</div>
                <div class="chronik-ma">${escapeHtml(e.mitarbeiter || 'Nicht zugewiesen')}</div>
                <div class="chronik-detail">${formatZahl(e.stunden)} Std. | ${formatEuro(e.gesamt)}${e.pauseMinuten > 0 ? ' | Pause: ' + e.pauseMinuten + 'min' : ''}</div>
            </div>
        </div>`;
    });

    html += '</div>';
    if (sortiert.length > anzahl) {
        html += `<p style="color:#718096;font-size:0.75rem;margin-top:0.5rem">${sortiert.length - anzahl} weitere Einsätze...</p>`;
    }

    el.innerHTML = html;
}

// =============================================
// EINSATZ-STATISTIK-DASHBOARD (Analytics)
// =============================================
function renderEinsatzAnalytics() {
    const el = document.getElementById('analyticsContent');
    if (!el) return;

    if (einsaetze.length === 0) {
        el.innerHTML = '<p style="color:#a0aec0">Keine Einsätze für Analyse.</p>';
        return;
    }

    const aktiv = einsaetze.filter(e => e.status !== 'storniert');

    // Wochentag-Verteilung
    const wtVerteilung = [0, 0, 0, 0, 0, 0, 0]; // Mo-So
    const wtStunden = [0, 0, 0, 0, 0, 0, 0];
    aktiv.forEach(e => {
        const d = new Date(e.datum + 'T12:00:00');
        const wt = d.getDay();
        const idx = wt === 0 ? 6 : wt - 1; // Mo=0...So=6
        wtVerteilung[idx]++;
        wtStunden[idx] += e.stunden;
    });

    const wtLabels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    const maxWT = Math.max(...wtVerteilung, 1);

    // Stundensatz-Verteilung
    const satzBereiche = { 'bis 12€': 0, '12-15€': 0, '15-18€': 0, '18-22€': 0, 'über 22€': 0 };
    aktiv.forEach(e => {
        if (e.stundensatz <= 12) satzBereiche['bis 12€']++;
        else if (e.stundensatz <= 15) satzBereiche['12-15€']++;
        else if (e.stundensatz <= 18) satzBereiche['15-18€']++;
        else if (e.stundensatz <= 22) satzBereiche['18-22€']++;
        else satzBereiche['über 22€']++;
    });

    // Schichtlängen-Verteilung
    const laengen = { 'bis 4h': 0, '4-6h': 0, '6-8h': 0, '8-10h': 0, '10-12h': 0, 'über 12h': 0 };
    aktiv.forEach(e => {
        if (e.stunden <= 4) laengen['bis 4h']++;
        else if (e.stunden <= 6) laengen['4-6h']++;
        else if (e.stunden <= 8) laengen['6-8h']++;
        else if (e.stunden <= 10) laengen['8-10h']++;
        else if (e.stunden <= 12) laengen['10-12h']++;
        else laengen['über 12h']++;
    });

    let html = '<div class="ana-grid">';

    // Wochentag-Balken
    html += '<div class="ana-card"><div class="ana-title">Einsätze nach Wochentag</div><div class="ana-wt">';
    wtLabels.forEach((wt, i) => {
        const pct = (wtVerteilung[i] / maxWT) * 100;
        html += `<div class="ana-wt-col"><div class="ana-wt-bar" style="height:${pct}%"></div><div class="ana-wt-label">${wt}</div><div class="ana-wt-val">${wtVerteilung[i]}</div></div>`;
    });
    html += '</div></div>';

    // Stundensatz-Verteilung
    const maxSatz = Math.max(...Object.values(satzBereiche), 1);
    html += '<div class="ana-card"><div class="ana-title">Stundensatz-Verteilung</div>';
    Object.entries(satzBereiche).forEach(([bereich, count]) => {
        const pct = (count / maxSatz) * 100;
        html += `<div class="stat-row"><span class="stat-row-label">${bereich}</span><div class="stat-bar"><div class="stat-bar-fill" style="width:${pct}%"></div></div><span class="stat-row-value">${count}</span></div>`;
    });
    html += '</div>';

    // Schichtlängen-Verteilung
    const maxLen = Math.max(...Object.values(laengen), 1);
    html += '<div class="ana-card"><div class="ana-title">Schichtlängen-Verteilung</div>';
    Object.entries(laengen).forEach(([bereich, count]) => {
        const pct = (count / maxLen) * 100;
        html += `<div class="stat-row"><span class="stat-row-label">${bereich}</span><div class="stat-bar"><div class="stat-bar-fill feiertag" style="width:${pct}%"></div></div><span class="stat-row-value">${count}</span></div>`;
    });
    html += '</div>';

    // Kennzahlen
    const avgStd = aktiv.reduce((s, e) => s + e.stunden, 0) / aktiv.length;
    const avgSatz = aktiv.reduce((s, e) => s + e.stundensatz, 0) / aktiv.length;
    const nachtAnteil = aktiv.filter(e => e.nachtStunden > 0).length / aktiv.length * 100;
    const zuschlagAnteil = aktiv.reduce((s, e) => s + e.zuschlagBetrag, 0) / aktiv.reduce((s, e) => s + e.gesamt, 0) * 100;

    html += '<div class="ana-card"><div class="ana-title">Kennzahlen</div><div class="ana-kz">';
    html += `<div class="ana-kz-item"><span class="ana-kz-val">${formatZahl(avgStd)}</span><span class="ana-kz-label">Ø Schichtdauer (Std.)</span></div>`;
    html += `<div class="ana-kz-item"><span class="ana-kz-val">${formatEuro(avgSatz)}</span><span class="ana-kz-label">Ø Stundensatz</span></div>`;
    html += `<div class="ana-kz-item"><span class="ana-kz-val">${formatZahl(nachtAnteil)}%</span><span class="ana-kz-label">Nachtschicht-Anteil</span></div>`;
    html += `<div class="ana-kz-item"><span class="ana-kz-val">${formatZahl(zuschlagAnteil)}%</span><span class="ana-kz-label">Zuschlagsanteil am Umsatz</span></div>`;
    html += '</div></div>';

    html += '</div>';
    el.innerHTML = html;
}

// =============================================
// PERSONALPLANUNG / BEDARFSRECHNER
// =============================================
function berechnePersonalbedarf() {
    const el = document.getElementById('personalBedarfResult');
    if (!el) return;

    const stdProTag = parseFloat(document.getElementById('pbStdProTag').value) || 24;
    const tageProWoche = parseInt(document.getElementById('pbTageProWoche').value) || 7;
    const schichtlaenge = parseFloat(document.getElementById('pbSchichtlaenge').value) || 8;
    const maxWocheStd = parseFloat(document.getElementById('pbMaxWoche').value) || 48;
    const urlaubsTage = parseInt(document.getElementById('pbUrlaub').value) || 30;
    const krankTage = parseInt(document.getElementById('pbKrank').value) || 10;

    // Berechnung
    const wochenStdBedarf = stdProTag * tageProWoche;
    const schichtenProTag = Math.ceil(stdProTag / schichtlaenge);
    const schichtenProWoche = schichtenProTag * tageProWoche;

    // MA-Kapazität pro Jahr
    const arbeitsWochen = 52 - Math.ceil(urlaubsTage / 5) - Math.ceil(krankTage / 5);
    const maxJahresStd = arbeitsWochen * maxWocheStd;
    const jahresBedarf = wochenStdBedarf * 52;

    const minMA = Math.ceil(jahresBedarf / maxJahresStd);
    const empfMA = Math.ceil(minMA * 1.15); // 15% Puffer

    let html = `<div class="pb-result">
        <div class="pb-grid">
            <div class="pb-card pb-highlight"><div class="pb-val">${empfMA}</div><div class="pb-label">Empfohlene MA</div></div>
            <div class="pb-card"><div class="pb-val">${minMA}</div><div class="pb-label">Minimum MA</div></div>
            <div class="pb-card"><div class="pb-val">${schichtenProWoche}</div><div class="pb-label">Schichten/Woche</div></div>
            <div class="pb-card"><div class="pb-val">${formatZahl(wochenStdBedarf)}</div><div class="pb-label">Std./Woche Bedarf</div></div>
        </div>
        <div class="pb-detail">
            <p><strong>Annahmen:</strong> ${schichtenProTag} Schicht(en)/Tag à ${schichtlaenge}h, ${tageProWoche} Tage/Woche</p>
            <p><strong>MA-Kapazität:</strong> ${arbeitsWochen} Arbeitswochen/Jahr à ${maxWocheStd}h = ${formatZahl(maxJahresStd)} Std./Jahr</p>
            <p><strong>Jahresbedarf:</strong> ${formatZahl(jahresBedarf)} Stunden (inkl. 15% Puffer: ${formatZahl(jahresBedarf * 1.15)})</p>
        </div>
    </div>`;

    el.innerHTML = html;
}

// =============================================
// VERTRAGS-COUNTDOWN
// =============================================
function renderVertragsCountdown() {
    const el = document.getElementById('vertragsCountdownContent');
    if (!el) return;

    const heute = new Date();
    const heuteStr = heute.toISOString().split('T')[0];

    const mitVertrag = objekte.filter(o => o.vertragEnde && o.vertragStatus === 'aktiv');
    if (mitVertrag.length === 0) {
        el.innerHTML = '<p style="color:#a0aec0">Keine aktiven Verträge mit Enddatum.</p>';
        return;
    }

    mitVertrag.sort((a, b) => a.vertragEnde.localeCompare(b.vertragEnde));

    let html = '<div class="vc-liste">';
    mitVertrag.forEach(o => {
        const ende = new Date(o.vertragEnde + 'T00:00:00');
        const diffMs = ende - heute;
        const diffTage = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        let cls = 'vc-ok';
        if (diffTage <= 0) cls = 'vc-abgelaufen';
        else if (diffTage <= 30) cls = 'vc-kritisch';
        else if (diffTage <= 90) cls = 'vc-warnung';

        html += `<div class="vc-item ${cls}">
            <div class="vc-obj"><strong>${escapeHtml(o.name)}</strong></div>
            <div class="vc-countdown">${diffTage <= 0 ? '<span class="vc-expired">ABGELAUFEN</span>' : `<span class="vc-tage">${diffTage}</span> Tage`}</div>
            <div class="vc-datum">Vertragsende: ${formatDatum(o.vertragEnde)}</div>
        </div>`;
    });
    html += '</div>';
    el.innerHTML = html;
}

// =============================================
// TAGES-SONDERNOTIZEN
// =============================================
let tagesSondernotizen = JSON.parse(localStorage.getItem('bbprotect_tagesnotizen_extra') || '{}');

function speichereSondernotiz() {
    const datum = document.getElementById('snDatum').value;
    const notiz = document.getElementById('snText').value.trim();
    const typ = document.getElementById('snTyp').value;

    if (!datum || !notiz) { alert('Bitte Datum und Notiz ausfüllen.'); return; }

    if (!tagesSondernotizen[datum]) tagesSondernotizen[datum] = [];
    tagesSondernotizen[datum].push({
        id: Date.now(),
        text: notiz,
        typ,
        erstellt: new Date().toISOString()
    });

    localStorage.setItem('bbprotect_tagesnotizen_extra', JSON.stringify(tagesSondernotizen));
    renderSondernotizen();
    document.getElementById('snText').value = '';
}

function renderSondernotizen() {
    const el = document.getElementById('sonderNotizenContent');
    if (!el) return;

    const alleDaten = Object.keys(tagesSondernotizen).sort().reverse();
    if (alleDaten.length === 0) {
        el.innerHTML = '<p style="color:#a0aec0">Keine Sondernotizen.</p>';
        return;
    }

    const SN_TYPEN = { wetter: 'Wetter', event: 'Veranstaltung', hinweis: 'Hinweis', warnung: 'Warnung', sonstiges: 'Sonstiges' };
    const SN_FARBEN = { wetter: '#3182ce', event: '#805ad5', hinweis: '#38a169', warnung: '#e53e3e', sonstiges: '#718096' };

    let html = '<div class="sn-liste">';
    alleDaten.slice(0, 10).forEach(datum => {
        const notizen = tagesSondernotizen[datum];
        html += `<div class="sn-datum-header">${formatDatum(datum)}</div>`;
        notizen.forEach(n => {
            html += `<div class="sn-item">
                <span class="sn-typ" style="background:${SN_FARBEN[n.typ] || '#718096'}">${SN_TYPEN[n.typ] || n.typ}</span>
                <span class="sn-text">${escapeHtml(n.text)}</span>
                <button class="btn-delete btn-small" onclick="loescheSondernotiz('${datum}',${n.id})">X</button>
            </div>`;
        });
    });
    html += '</div>';
    el.innerHTML = html;
}

function loescheSondernotiz(datum, id) {
    if (!tagesSondernotizen[datum]) return;
    tagesSondernotizen[datum] = tagesSondernotizen[datum].filter(n => n.id !== id);
    if (tagesSondernotizen[datum].length === 0) delete tagesSondernotizen[datum];
    localStorage.setItem('bbprotect_tagesnotizen_extra', JSON.stringify(tagesSondernotizen));
    renderSondernotizen();
}

// =============================================
// MA-GEBURTSTAGE & JUBILÄEN
// =============================================
function renderGeburtstageJubilaeen() {
    const el = document.getElementById('geburtstageContent');
    if (!el) return;

    const heute = new Date();
    const heuteTag = heute.getDate();
    const heuteMonat = heute.getMonth();

    const events = [];

    mitarbeiterListe_.forEach(m => {
        if (m.geburtstag) {
            const geb = new Date(m.geburtstag + 'T12:00:00');
            const alter = heute.getFullYear() - geb.getFullYear();
            const naechster = new Date(heute.getFullYear(), geb.getMonth(), geb.getDate());
            if (naechster < heute) naechster.setFullYear(naechster.getFullYear() + 1);
            const tagesBis = Math.ceil((naechster - heute) / (1000 * 60 * 60 * 24));

            events.push({
                name: m.name,
                typ: 'geburtstag',
                datum: naechster,
                tagesBis,
                detail: `wird ${alter + (tagesBis === 0 ? 0 : 1)} Jahre`,
                istHeute: tagesBis === 0
            });
        }

        if (m.eintrittsdatum) {
            const eintritt = new Date(m.eintrittsdatum + 'T12:00:00');
            const jahre = heute.getFullYear() - eintritt.getFullYear();
            const naechster = new Date(heute.getFullYear(), eintritt.getMonth(), eintritt.getDate());
            if (naechster < heute) naechster.setFullYear(naechster.getFullYear() + 1);
            const tagesBis = Math.ceil((naechster - heute) / (1000 * 60 * 60 * 24));
            const jubJahre = naechster.getFullYear() - eintritt.getFullYear();

            if (jubJahre > 0 && (jubJahre % 5 === 0 || jubJahre === 1)) {
                events.push({
                    name: m.name,
                    typ: 'jubilaeum',
                    datum: naechster,
                    tagesBis,
                    detail: `${jubJahre} Jahre im Unternehmen`,
                    istHeute: tagesBis === 0
                });
            }
        }
    });

    events.sort((a, b) => a.tagesBis - b.tagesBis);

    if (events.length === 0) {
        el.innerHTML = '<p style="color:#a0aec0">Keine Geburtstage/Jubiläen erfasst.</p>';
        return;
    }

    let html = '<div class="gj-liste">';
    events.slice(0, 15).forEach(e => {
        const icon = e.typ === 'geburtstag' ? '\uD83C\uDF82' : '\uD83C\uDF89';
        html += `<div class="gj-item ${e.istHeute ? 'gj-heute' : ''} ${e.tagesBis <= 7 ? 'gj-bald' : ''}">
            <span class="gj-icon">${icon}</span>
            <span class="gj-name"><strong>${escapeHtml(e.name)}</strong></span>
            <span class="gj-detail">${escapeHtml(e.detail)}</span>
            <span class="gj-countdown">${e.istHeute ? 'HEUTE!' : `in ${e.tagesBis} Tagen`}</span>
        </div>`;
    });
    html += '</div>';
    el.innerHTML = html;
}

// =============================================
// EINSATZ-BEWERTUNG / FEEDBACK
// =============================================
let einsatzBewertungen = JSON.parse(localStorage.getItem('bbprotect_bewertungen') || '{}');

function bewerteEinsatz(einsatzId, sterne) {
    if (!einsatzBewertungen[einsatzId]) einsatzBewertungen[einsatzId] = {};
    einsatzBewertungen[einsatzId].sterne = sterne;
    localStorage.setItem('bbprotect_bewertungen', JSON.stringify(einsatzBewertungen));
    renderBewertungsUebersicht();
}

function einsatzFeedback(einsatzId) {
    const text = prompt('Feedback zum Einsatz:');
    if (!text) return;
    if (!einsatzBewertungen[einsatzId]) einsatzBewertungen[einsatzId] = {};
    einsatzBewertungen[einsatzId].feedback = text;
    einsatzBewertungen[einsatzId].datum = new Date().toISOString().split('T')[0];
    localStorage.setItem('bbprotect_bewertungen', JSON.stringify(einsatzBewertungen));
    renderBewertungsUebersicht();
}

function renderBewertungsUebersicht() {
    const el = document.getElementById('bewertungContent');
    if (!el) return;

    const bewIds = Object.keys(einsatzBewertungen);
    if (bewIds.length === 0) {
        el.innerHTML = '<p style="color:#a0aec0">Noch keine Bewertungen abgegeben.</p>';
        return;
    }

    // Durchschnitt
    const sterneArr = bewIds.map(id => einsatzBewertungen[id].sterne).filter(s => s);
    const avgSterne = sterneArr.length > 0 ? sterneArr.reduce((s, v) => s + v, 0) / sterneArr.length : 0;

    let html = `<div class="bew-header"><span class="bew-avg">${'\u2605'.repeat(Math.round(avgSterne))}${'\u2606'.repeat(5 - Math.round(avgSterne))}</span> <strong>${formatZahl(avgSterne)}/5</strong> (${sterneArr.length} Bewertungen)</div>`;

    html += '<div class="bew-liste">';
    const letzte = bewIds.slice(-10).reverse();
    letzte.forEach(id => {
        const b = einsatzBewertungen[id];
        const e = einsaetze.find(x => x.id === parseInt(id));
        if (!e) return;

        html += `<div class="bew-item">
            <span class="bew-sterne">${'\u2605'.repeat(b.sterne || 0)}${'\u2606'.repeat(5 - (b.sterne || 0))}</span>
            <span class="bew-einsatz">${formatDatum(e.datum)} | ${escapeHtml(e.objekt)}</span>
            ${b.feedback ? '<span class="bew-feedback">"' + escapeHtml(b.feedback) + '"</span>' : ''}
        </div>`;
    });
    html += '</div>';

    el.innerHTML = html;
}

// =============================================
// OBJEKT-REVIERPLAN (Grundriss-Notizen)
// =============================================
let revierplaene = JSON.parse(localStorage.getItem('bbprotect_revierplaene') || '{}');

function speichereRevierplan() {
    const objekt = document.getElementById('rpObjekt').value;
    const text = document.getElementById('rpText').value.trim();

    if (!objekt) { alert('Bitte Objekt wählen.'); return; }

    revierplaene[objekt] = {
        text,
        aktualisiert: new Date().toISOString().split('T')[0]
    };

    localStorage.setItem('bbprotect_revierplaene', JSON.stringify(revierplaene));
    logAudit('bearbeitet', 'Revierplan', objekt);
    renderRevierplan();
}

function renderRevierplan() {
    const el = document.getElementById('revierplanContent');
    if (!el) return;

    const objekt = document.getElementById('rpObjekt').value;
    if (!objekt) {
        el.innerHTML = '<p style="color:#a0aec0">Bitte Objekt wählen.</p>';
        return;
    }

    const plan = revierplaene[objekt];
    if (!plan || !plan.text) {
        document.getElementById('rpText').value = '';
        el.innerHTML = '<p style="color:#a0aec0">Kein Revierplan für dieses Objekt vorhanden.</p>';
        return;
    }

    document.getElementById('rpText').value = plan.text;
    el.innerHTML = `<p style="font-size:0.75rem;color:#718096">Zuletzt aktualisiert: ${formatDatum(plan.aktualisiert)}</p><div class="rp-vorschau"><pre style="white-space:pre-wrap;font-size:0.8rem;font-family:inherit">${escapeHtml(plan.text)}</pre></div>`;
}

function updateRevierplanSelect() {
    const sel = document.getElementById('rpObjekt');
    if (!sel) return;
    const val = sel.value;
    sel.innerHTML = '<option value="">Objekt wählen...</option>';
    objekte.forEach(o => {
        sel.innerHTML += `<option value="${escapeHtml(o.name)}" ${o.name === val ? 'selected' : ''}>${escapeHtml(o.name)}</option>`;
    });
}

// =============================================
// MONATSABSCHLUSS-WORKFLOW
// =============================================
let monatsabschluesse = JSON.parse(localStorage.getItem('bbprotect_monatsabschluesse') || '{}');

function monatsabschluss() {
    const monat = document.getElementById('maMonatSelect').value;
    if (!monat) { alert('Bitte Monat wählen.'); return; }

    const monatsE = einsaetze.filter(e => e.datum.substring(0, 7) === monat && e.status !== 'storniert');
    const offene = monatsE.filter(e => !e.status || e.status === 'geplant');

    if (offene.length > 0) {
        if (!confirm(`${offene.length} Einsätze sind noch im Status "Geplant". Alle auf "Abgeschlossen" setzen?`)) return;
        offene.forEach(e => e.status = 'abgeschlossen');
        speichern();
        logAudit('status', 'Einsatz', `Monatsabschluss ${monat}: ${offene.length} Einsätze → Abgeschlossen`);
    }

    const totalStd = monatsE.reduce((s, e) => s + e.stunden, 0);
    const totalGesamt = monatsE.reduce((s, e) => s + e.gesamt, 0);

    monatsabschluesse[monat] = {
        datum: new Date().toISOString(),
        einsaetze: monatsE.length,
        stunden: totalStd,
        umsatz: totalGesamt,
        abgeschlossen: true
    };

    localStorage.setItem('bbprotect_monatsabschluesse', JSON.stringify(monatsabschluesse));
    logAudit('status', 'Monatsabschluss', `${monat}: ${monatsE.length} Einsätze, ${formatZahl(totalStd)} Std., ${formatEuro(totalGesamt)}`);
    renderMonatsabschluss();
    renderTabelle();
}

function renderMonatsabschluss() {
    const el = document.getElementById('monatsabschlussContent');
    if (!el) return;

    const monate = Object.keys(monatsabschluesse).sort().reverse();
    if (monate.length === 0) {
        el.innerHTML = '<p style="color:#a0aec0">Noch keine Monatsabschlüsse durchgeführt.</p>';
        return;
    }

    let html = '<div class="mab-liste">';
    monate.forEach(m => {
        const d = monatsabschluesse[m];
        const [j, mo] = m.split('-');
        html += `<div class="mab-item">
            <span class="mab-monat">${MONATSNAMEN[parseInt(mo) - 1]} ${j}</span>
            <span class="mab-info">${d.einsaetze} Einsätze | ${formatZahl(d.stunden)} Std. | ${formatEuro(d.umsatz)}</span>
            <span class="mab-status">Abgeschlossen</span>
        </div>`;
    });
    html += '</div>';
    el.innerHTML = html;
}

function updateMonatsabschlussSelect() {
    const sel = document.getElementById('maMonatSelect');
    if (!sel) return;
    const monate = new Set();
    einsaetze.forEach(e => monate.add(e.datum.substring(0, 7)));
    sel.innerHTML = '<option value="">Monat wählen...</option>';
    [...monate].sort().reverse().forEach(m => {
        const [j, mo] = m.split('-');
        const istAbgeschlossen = monatsabschluesse[m];
        sel.innerHTML += `<option value="${m}" ${istAbgeschlossen ? 'disabled' : ''}>${MONATSNAMEN[parseInt(mo) - 1]} ${j}${istAbgeschlossen ? ' (abgeschlossen)' : ''}</option>`;
    });
}

// =============================================
// QUICK-FILTER LEISTE
// =============================================
function quickFilter(typ) {
    const heute = new Date();
    const heuteStr = heute.toISOString().split('T')[0];

    // Quick-Filter-Buttons aktivieren/deaktivieren
    document.querySelectorAll('.qf-btn').forEach(b => b.classList.remove('qf-aktiv'));

    if (typ === 'heute') {
        filterMonat.value = '';
        const suchfeld = document.getElementById('suchfeld');
        if (suchfeld) suchfeld.value = '';
        // Datum-Filter: nur heute
        einsaetze._quickFilter = e => e.datum === heuteStr;
    } else if (typ === 'woche') {
        const montag = new Date(heute);
        const tag = montag.getDay();
        const diff = tag === 0 ? 6 : tag - 1;
        montag.setDate(montag.getDate() - diff);
        const montagStr = montag.toISOString().split('T')[0];
        const sonntag = new Date(montag);
        sonntag.setDate(sonntag.getDate() + 6);
        const sonntagStr = sonntag.toISOString().split('T')[0];
        einsaetze._quickFilter = e => e.datum >= montagStr && e.datum <= sonntagStr;
    } else if (typ === 'monat') {
        const monatStr = heuteStr.substring(0, 7);
        filterMonat.value = monatStr;
        einsaetze._quickFilter = null;
    } else {
        einsaetze._quickFilter = null;
    }

    const btn = document.querySelector(`.qf-btn[data-qf="${typ}"]`);
    if (btn) btn.classList.add('qf-aktiv');

    renderTabelle();
}

// =============================================
// EINSATZ-SCHNELLVORLAGEN (1-Klick-Erfassung)
// =============================================
let schnellvorlagen = JSON.parse(localStorage.getItem('bbprotect_schnellvorlagen') || '[]');

function schnellvorlageSpeichern() {
    const label = document.getElementById('svLabel').value.trim();
    const objekt = document.getElementById('svObjekt').value.trim();
    const zeitVon = document.getElementById('svZeitVon').value;
    const zeitBis = document.getElementById('svZeitBis').value;
    const stundensatz = parseFloat(document.getElementById('svStundensatz').value) || 0;

    if (!label || !objekt || !zeitVon || !zeitBis) { alert('Bitte Label, Objekt, Von und Bis ausfüllen.'); return; }

    schnellvorlagen.push({ id: Date.now(), label, objekt, zeitVon, zeitBis, stundensatz });
    localStorage.setItem('bbprotect_schnellvorlagen', JSON.stringify(schnellvorlagen));
    renderSchnellvorlagen();

    document.getElementById('svLabel').value = '';
    document.getElementById('svObjekt').value = '';
    document.getElementById('svZeitVon').value = '';
    document.getElementById('svZeitBis').value = '';
    document.getElementById('svStundensatz').value = '';
}

function renderSchnellvorlagen() {
    const el = document.getElementById('schnellvorlagenContent');
    if (!el) return;

    if (schnellvorlagen.length === 0) {
        el.innerHTML = '<p style="color:#a0aec0">Keine Schnellvorlagen. Erstelle eine, um Einsätze mit einem Klick zu erfassen.</p>';
        return;
    }

    let html = '<div class="sv-grid">';
    schnellvorlagen.forEach(sv => {
        html += `<div class="sv-card" onclick="schnellvorlageAnwenden(${sv.id})" title="${escapeHtml(sv.objekt)} ${sv.zeitVon}-${sv.zeitBis}">
            <div class="sv-label">${escapeHtml(sv.label)}</div>
            <div class="sv-detail">${escapeHtml(sv.objekt)}</div>
            <div class="sv-zeit">${sv.zeitVon} - ${sv.zeitBis}</div>
            <button class="btn-delete btn-small sv-del" onclick="event.stopPropagation();loescheSchnellvorlage(${sv.id})">X</button>
        </div>`;
    });
    html += '</div>';
    el.innerHTML = html;
}

function schnellvorlageAnwenden(id) {
    const sv = schnellvorlagen.find(s => s.id === id);
    if (!sv) return;

    const datum = document.getElementById('datum').value || new Date().toISOString().split('T')[0];
    const berechnung = berechneEinsatz(datum, sv.zeitVon, sv.zeitBis, sv.stundensatz);

    const einsatz = {
        id: Date.now(),
        objekt: sv.objekt,
        datum,
        zeitVon: sv.zeitVon,
        zeitBis: sv.zeitBis,
        stundensatz: sv.stundensatz,
        mitarbeiter: '',
        bemerkung: `Schnellvorlage: ${sv.label}`,
        status: 'geplant',
        ...berechnung
    };

    einsaetze.push(einsatz);
    speichern();
    logAudit('erstellt', 'Einsatz', `Schnellvorlage "${sv.label}" → ${sv.objekt} am ${formatDatum(datum)}`);
    renderTabelle();
    updateAlleFilter();
}

function loescheSchnellvorlage(id) {
    schnellvorlagen = schnellvorlagen.filter(s => s.id !== id);
    localStorage.setItem('bbprotect_schnellvorlagen', JSON.stringify(schnellvorlagen));
    renderSchnellvorlagen();
}

// =============================================
// MA-SKILL-TAGS
// =============================================
const SKILL_TAGS = ['Ersthelfer', 'Brandschutzhelfer', 'Evakuierungshelfer', 'Waffensachkunde', 'Hundeführer', 'Fahrerlaubnis B', 'Fahrerlaubnis BE', 'Fremdsprache EN', 'Fremdsprache TR', 'Fremdsprache AR', 'Deeskalation', 'Interventionskraft'];

function toggleMASkill(maName, skill) {
    const ma = mitarbeiterListe_.find(m => m.name === maName);
    if (!ma) return;
    if (!ma.skills) ma.skills = [];
    const idx = ma.skills.indexOf(skill);
    if (idx === -1) ma.skills.push(skill); else ma.skills.splice(idx, 1);
    localStorage.setItem('bbprotect_mitarbeiter', JSON.stringify(mitarbeiterListe_));
    renderMASkills();
}

function renderMASkills() {
    const el = document.getElementById('maSkillsContent');
    if (!el) return;

    if (mitarbeiterListe_.length === 0) {
        el.innerHTML = '<p style="color:#a0aec0">Keine Mitarbeiter vorhanden.</p>';
        return;
    }

    let html = '<div class="skill-grid">';
    html += '<div class="skill-header skill-ma">Mitarbeiter</div>';
    SKILL_TAGS.forEach(s => {
        html += `<div class="skill-header skill-tag-header" title="${s}">${s.substring(0, 4)}</div>`;
    });

    mitarbeiterListe_.forEach(m => {
        const skills = m.skills || [];
        html += `<div class="skill-ma">${escapeHtml(m.name)}</div>`;
        SKILL_TAGS.forEach(s => {
            const hat = skills.includes(s);
            html += `<div class="skill-zelle ${hat ? 'skill-ja' : 'skill-nein'}" onclick="toggleMASkill('${escapeHtml(m.name).replace(/'/g, "\\'")}','${s}')" title="${s}">${hat ? '\u2713' : ''}</div>`;
        });
    });
    html += '</div>';

    // Zusammenfassung
    html += '<div class="skill-summary">';
    SKILL_TAGS.forEach(s => {
        const count = mitarbeiterListe_.filter(m => (m.skills || []).includes(s)).length;
        if (count > 0) {
            html += `<span class="skill-badge">${s}: <strong>${count}</strong></span>`;
        }
    });
    html += '</div>';

    el.innerHTML = html;
}

// =============================================
// OBJEKT-BESICHTIGUNGS-NOTIZEN
// =============================================
let besichtigungen = JSON.parse(localStorage.getItem('bbprotect_besichtigungen') || '[]');

function besichtigungSpeichern() {
    const objekt = document.getElementById('besObjekt').value;
    const datum = document.getElementById('besDatum').value;
    const notiz = document.getElementById('besNotiz').value.trim();
    const ergebnis = document.getElementById('besErgebnis').value;

    if (!objekt || !datum || !notiz) { alert('Bitte Objekt, Datum und Notiz ausfüllen.'); return; }

    besichtigungen.push({
        id: Date.now(),
        objekt, datum, notiz, ergebnis
    });
    localStorage.setItem('bbprotect_besichtigungen', JSON.stringify(besichtigungen));
    logAudit('erstellt', 'Besichtigung', `${objekt} am ${formatDatum(datum)}`);
    renderBesichtigungen();

    document.getElementById('besNotiz').value = '';
}

function renderBesichtigungen() {
    const el = document.getElementById('besichtigungenContent');
    if (!el) return;

    const objekt = document.getElementById('besObjekt').value;
    const gefiltert = objekt ? besichtigungen.filter(b => b.objekt === objekt) : besichtigungen;

    if (gefiltert.length === 0) {
        el.innerHTML = '<p style="color:#a0aec0">Keine Besichtigungen protokolliert.</p>';
        return;
    }

    const ERG_LABELS = { ok: 'OK', maengel: 'Mängel', kritisch: 'Kritisch' };
    const ERG_FARBEN = { ok: '#48bb78', maengel: '#ed8936', kritisch: '#e53e3e' };

    let html = '<div class="bes-liste">';
    gefiltert.sort((a, b) => b.datum.localeCompare(a.datum)).slice(0, 20).forEach(b => {
        html += `<div class="bes-item">
            <div class="bes-header">
                <strong>${escapeHtml(b.objekt)}</strong>
                <span style="color:${ERG_FARBEN[b.ergebnis] || '#718096'};font-weight:600">${ERG_LABELS[b.ergebnis] || b.ergebnis}</span>
                <span class="bes-datum">${formatDatum(b.datum)}</span>
                <button class="btn-delete btn-small" onclick="loescheBesichtigung(${b.id})">X</button>
            </div>
            <div class="bes-notiz">${escapeHtml(b.notiz)}</div>
        </div>`;
    });
    html += '</div>';
    el.innerHTML = html;
}

function loescheBesichtigung(id) {
    if (!confirm('Besichtigung löschen?')) return;
    besichtigungen = besichtigungen.filter(b => b.id !== id);
    localStorage.setItem('bbprotect_besichtigungen', JSON.stringify(besichtigungen));
    renderBesichtigungen();
}

function updateBesObjektSelect() {
    const sel = document.getElementById('besObjekt');
    if (!sel) return;
    const val = sel.value;
    sel.innerHTML = '<option value="">Alle Objekte</option>';
    objekte.forEach(o => {
        sel.innerHTML += `<option value="${escapeHtml(o.name)}" ${o.name === val ? 'selected' : ''}>${escapeHtml(o.name)}</option>`;
    });
}

// =============================================
// WOCHEN-ZUSAMMENFASSUNG (Report)
// =============================================
function renderWochenReport() {
    const el = document.getElementById('wochenReportContent');
    if (!el) return;

    const heute = new Date();
    const montag = new Date(heute);
    const tag = montag.getDay();
    const diff = tag === 0 ? 6 : tag - 1;
    montag.setDate(montag.getDate() - diff);
    montag.setHours(0, 0, 0, 0);

    const sonntag = new Date(montag);
    sonntag.setDate(sonntag.getDate() + 6);

    const montagStr = montag.toISOString().split('T')[0];
    const sonntagStr = sonntag.toISOString().split('T')[0];

    const wocheE = einsaetze.filter(e => e.datum >= montagStr && e.datum <= sonntagStr && e.status !== 'storniert');
    const prevMontag = new Date(montag);
    prevMontag.setDate(prevMontag.getDate() - 7);
    const prevSonntagStr = new Date(prevMontag);
    prevSonntagStr.setDate(prevSonntagStr.getDate() + 6);
    const prevWoche = einsaetze.filter(e => e.datum >= prevMontag.toISOString().split('T')[0] && e.datum <= prevSonntagStr.toISOString().split('T')[0] && e.status !== 'storniert');

    const wStd = wocheE.reduce((s, e) => s + e.stunden, 0);
    const wUmsatz = wocheE.reduce((s, e) => s + e.gesamt, 0);
    const pStd = prevWoche.reduce((s, e) => s + e.stunden, 0);
    const pUmsatz = prevWoche.reduce((s, e) => s + e.gesamt, 0);

    const stdDiff = pStd > 0 ? ((wStd - pStd) / pStd * 100) : 0;
    const umsatzDiff = pUmsatz > 0 ? ((wUmsatz - pUmsatz) / pUmsatz * 100) : 0;

    const maSet = new Set(wocheE.map(e => e.mitarbeiter).filter(Boolean));
    const objSet = new Set(wocheE.map(e => e.objekt));

    const kw = getKalenderWoche(heute);

    let html = `<div class="wr-card">
        <div class="wr-title">Wochenbericht KW ${kw} (${formatDatum(montagStr)} - ${formatDatum(sonntagStr)})</div>
        <div class="wr-grid">
            <div class="wr-stat"><span class="wr-val">${wocheE.length}</span><span class="wr-label">Einsätze</span></div>
            <div class="wr-stat"><span class="wr-val">${formatZahl(wStd)}</span><span class="wr-label">Stunden</span>${pStd > 0 ? '<span class="wr-trend ' + (stdDiff >= 0 ? 'wr-up' : 'wr-down') + '">' + (stdDiff >= 0 ? '+' : '') + formatZahl(stdDiff) + '%</span>' : ''}</div>
            <div class="wr-stat"><span class="wr-val">${formatEuro(wUmsatz)}</span><span class="wr-label">Umsatz</span>${pUmsatz > 0 ? '<span class="wr-trend ' + (umsatzDiff >= 0 ? 'wr-up' : 'wr-down') + '">' + (umsatzDiff >= 0 ? '+' : '') + formatZahl(umsatzDiff) + '%</span>' : ''}</div>
            <div class="wr-stat"><span class="wr-val">${maSet.size}</span><span class="wr-label">MA im Einsatz</span></div>
            <div class="wr-stat"><span class="wr-val">${objSet.size}</span><span class="wr-label">Objekte</span></div>
        </div>`;

    // Vorfälle dieser Woche
    const wVorfaelle = vorfaelle.filter(v => v.datum >= montagStr && v.datum <= sonntagStr);
    if (wVorfaelle.length > 0) {
        html += `<div class="wr-section"><strong>Vorfälle:</strong> ${wVorfaelle.length} (${wVorfaelle.filter(v => v.schwere === 'kritisch' || v.schwere === 'hoch').length} schwerwiegend)</div>`;
    }

    // Abwesenheiten
    const wAbwesend = verfuegbarkeit.filter(v => {
        return v.von <= sonntagStr && v.bis >= montagStr;
    });
    if (wAbwesend.length > 0) {
        html += `<div class="wr-section"><strong>Abwesend:</strong> ${wAbwesend.map(v => escapeHtml(v.mitarbeiter) + ' (' + v.typ + ')').join(', ')}</div>`;
    }

    html += '</div>';

    // Druckfunktion
    html += `<button class="btn-secondary" onclick="druckeWochenReport()" style="margin-top:0.5rem">Report drucken</button>`;

    el.innerHTML = html;
}

function druckeWochenReport() {
    const content = document.getElementById('wochenReportContent');
    if (!content) return;
    const printArea = document.getElementById('printArea');
    printArea.innerHTML = '<h2>Wochenbericht - ' + (einstellungen.firmenname || 'B.B. Protect') + '</h2>' + content.innerHTML;
    window.print();
}

// =============================================
// SCHNELLZUWEISUNG IM DIENSTPLAN
// =============================================
function dienstplanSchnellzuweisung(datum) {
    const verfuegbareMA = mitarbeiterListe_.filter(m => {
        const abwesend = verfuegbarkeit.find(v => v.mitarbeiter === m.name && v.von <= datum && v.bis >= datum);
        return !abwesend;
    });

    if (verfuegbareMA.length === 0) {
        alert('Keine verfügbaren Mitarbeiter für diesen Tag.');
        return;
    }

    const unbelegte = einsaetze.filter(e => e.datum === datum && !e.mitarbeiter);
    if (unbelegte.length === 0) {
        alert('Keine offenen Einsätze ohne Mitarbeiter an diesem Tag.');
        return;
    }

    let zugewiesen = 0;
    unbelegte.forEach(e => {
        // Finde besten verfügbaren MA (mit wenigsten Stunden an diesem Tag)
        const scores = verfuegbareMA.map(m => {
            const tagesStd = einsaetze.filter(x => x.mitarbeiter === m.name && x.datum === datum).reduce((s, x) => s + x.stunden, 0);
            return { name: m.name, stunden: tagesStd };
        }).sort((a, b) => a.stunden - b.stunden);

        if (scores.length > 0 && scores[0].stunden < 10) {
            e.mitarbeiter = scores[0].name;
            zugewiesen++;
        }
    });

    if (zugewiesen > 0) {
        speichern();
        logAudit('bearbeitet', 'Einsatz', `Schnellzuweisung: ${zugewiesen} Einsätze am ${formatDatum(datum)} zugewiesen`);
        renderDienstplan();
        alert(`${zugewiesen} Einsatz(e) automatisch zugewiesen.`);
    } else {
        alert('Keine Zuweisung möglich (alle MA ausgelastet).');
    }
}

// =============================================
// EINSATZ-TIMELINE (visuelle Zeitleiste)
// =============================================
function renderEinsatzTimeline() {
    const el = document.getElementById('timelineContent');
    if (!el) return;

    const datum = document.getElementById('tlDatum') ? document.getElementById('tlDatum').value : new Date().toISOString().split('T')[0];
    if (!datum) { el.innerHTML = '<p style="color:#a0aec0">Bitte Datum wählen.</p>'; return; }

    const tagesE = einsaetze.filter(e => e.datum === datum && e.status !== 'storniert').sort((a, b) => a.zeitVon.localeCompare(b.zeitVon));

    if (tagesE.length === 0) {
        el.innerHTML = `<p style="color:#a0aec0">Keine Einsätze am ${formatDatum(datum)}.</p>`;
        return;
    }

    // Finde Zeitbereich
    let minStd = 24, maxStd = 0;
    tagesE.forEach(e => {
        const [vh] = e.zeitVon.split(':').map(Number);
        const [bh] = e.zeitBis.split(':').map(Number);
        minStd = Math.min(minStd, vh);
        maxStd = Math.max(maxStd, bh === 0 ? 24 : bh);
    });
    minStd = Math.max(0, minStd - 1);
    maxStd = Math.min(24, maxStd + 1);
    const range = maxStd - minStd;

    // Stunden-Header
    let html = '<div class="tl-container">';
    html += '<div class="tl-header">';
    for (let h = minStd; h <= maxStd; h++) {
        const left = ((h - minStd) / range) * 100;
        html += `<span class="tl-stunde" style="left:${left}%">${String(h).padStart(2, '0')}</span>`;
    }
    html += '</div>';

    // Einsatz-Balken
    tagesE.forEach(e => {
        const [vh, vm] = e.zeitVon.split(':').map(Number);
        const [bh, bm] = e.zeitBis.split(':').map(Number);
        let startMin = vh * 60 + vm;
        let endMin = bh * 60 + bm;
        if (endMin <= startMin) endMin += 24 * 60;

        const left = ((startMin / 60 - minStd) / range) * 100;
        const width = ((endMin - startMin) / 60 / range) * 100;

        html += `<div class="tl-row">
            <div class="tl-bar" style="left:${Math.max(0, left)}%;width:${Math.min(100 - left, width)}%;background:${getObjektFarbe(e.objekt)}">
                <span class="tl-bar-text">${escapeHtml(e.objekt)} ${e.mitarbeiter ? '(' + escapeHtml(e.mitarbeiter) + ')' : ''} ${e.zeitVon}-${e.zeitBis}</span>
            </div>
        </div>`;
    });

    html += '</div>';
    html += `<p style="font-size:0.7rem;color:#718096;margin-top:0.3rem">${tagesE.length} Einsätze | ${formatZahl(tagesE.reduce((s, e) => s + e.stunden, 0))} Stunden</p>`;

    el.innerHTML = html;
}

// =============================================
// KOSTEN-TRENDLINIE (6 Monate)
// =============================================
function renderKostenTrend() {
    const el = document.getElementById('kostenTrendContent');
    if (!el) return;

    const monate = {};
    einsaetze.filter(e => e.status !== 'storniert').forEach(e => {
        const m = e.datum.substring(0, 7);
        if (!monate[m]) monate[m] = { stunden: 0, grundlohn: 0, zuschlaege: 0, gesamt: 0, einsaetze: 0 };
        monate[m].stunden += e.stunden;
        monate[m].grundlohn += e.grundlohn;
        monate[m].zuschlaege += e.zuschlagBetrag;
        monate[m].gesamt += e.gesamt;
        monate[m].einsaetze++;
    });

    const sortedMonate = Object.keys(monate).sort().slice(-6);
    if (sortedMonate.length < 2) {
        el.innerHTML = '<p style="color:#a0aec0">Mindestens 2 Monate Daten für Trendanzeige nötig.</p>';
        return;
    }

    const maxGesamt = Math.max(...sortedMonate.map(m => monate[m].gesamt), 1);
    const maxStd = Math.max(...sortedMonate.map(m => monate[m].stunden), 1);

    let html = '<div class="kt-chart">';

    // Umsatz-Balken
    html += '<div class="kt-label">Umsatz</div>';
    html += '<div class="kt-bars">';
    sortedMonate.forEach(m => {
        const pct = (monate[m].gesamt / maxGesamt) * 100;
        const [j, mo] = m.split('-');
        html += `<div class="kt-bar-group">
            <div class="kt-bar kt-umsatz" style="height:${pct}%" title="${formatEuro(monate[m].gesamt)}"></div>
            <div class="kt-bar-label">${MONATSNAMEN[parseInt(mo) - 1].substring(0, 3)}</div>
            <div class="kt-bar-val">${formatEuro(monate[m].gesamt)}</div>
        </div>`;
    });
    html += '</div>';

    // Stunden-Balken
    html += '<div class="kt-label">Stunden</div>';
    html += '<div class="kt-bars">';
    sortedMonate.forEach(m => {
        const pct = (monate[m].stunden / maxStd) * 100;
        const [j, mo] = m.split('-');
        html += `<div class="kt-bar-group">
            <div class="kt-bar kt-stunden" style="height:${pct}%"></div>
            <div class="kt-bar-label">${MONATSNAMEN[parseInt(mo) - 1].substring(0, 3)}</div>
            <div class="kt-bar-val">${formatZahl(monate[m].stunden)}</div>
        </div>`;
    });
    html += '</div>';

    // Trend-Zusammenfassung
    const letzter = monate[sortedMonate[sortedMonate.length - 1]];
    const vorher = monate[sortedMonate[sortedMonate.length - 2]];
    const umsatzDiff = vorher.gesamt > 0 ? ((letzter.gesamt - vorher.gesamt) / vorher.gesamt * 100) : 0;
    const stdDiff = vorher.stunden > 0 ? ((letzter.stunden - vorher.stunden) / vorher.stunden * 100) : 0;

    html += `<div class="kt-summary">
        <span>Umsatz-Trend: <strong class="${umsatzDiff >= 0 ? 'wr-up' : 'wr-down'}">${umsatzDiff >= 0 ? '+' : ''}${formatZahl(umsatzDiff)}%</strong></span>
        <span>Stunden-Trend: <strong class="${stdDiff >= 0 ? 'wr-up' : 'wr-down'}">${stdDiff >= 0 ? '+' : ''}${formatZahl(stdDiff)}%</strong></span>
        <span>Ø Kosten/Std.: <strong>${formatEuro(letzter.stunden > 0 ? letzter.gesamt / letzter.stunden : 0)}</strong></span>
    </div>`;

    html += '</div>';
    el.innerHTML = html;
}

// =============================================
// OBJEKT-INFOKARTE (druckbar)
// =============================================
function druckeObjektInfokarte() {
    const sel = document.getElementById('ikObjekt');
    if (!sel || !sel.value) { alert('Bitte Objekt wählen.'); return; }

    const obj = objekte.find(o => o.name === sel.value);
    if (!obj) return;

    const kontakte = objektKontakte.filter(k => k.objekt === obj.name);
    const anweisungen = (objektAnweisungen[obj.name] || []).filter(a => a.aktiv);
    const plan = revierplaene[obj.name];

    const einstName = einstellungen.firmenname || 'B.B. Protect';

    let html = `<div style="font-family:sans-serif;max-width:600px;margin:auto">
        <h2 style="border-bottom:2px solid #333;padding-bottom:0.5rem">${escapeHtml(einstName)} - Objekt-Infokarte</h2>
        <h3>${escapeHtml(obj.name)}</h3>
        <table style="width:100%;border-collapse:collapse;font-size:0.85rem;margin-bottom:1rem">
            <tr><td style="padding:0.3rem;font-weight:600;width:40%">Adresse:</td><td style="padding:0.3rem">${escapeHtml(obj.adresse || '\u2014')}</td></tr>
            <tr><td style="padding:0.3rem;font-weight:600">Ansprechpartner:</td><td style="padding:0.3rem">${escapeHtml(obj.ansprechpartner || '\u2014')}</td></tr>
            <tr><td style="padding:0.3rem;font-weight:600">Stundensatz:</td><td style="padding:0.3rem">${obj.stundensatz ? formatEuro(obj.stundensatz) + '/Std.' : '\u2014'}</td></tr>
            ${obj.mindestQual ? `<tr><td style="padding:0.3rem;font-weight:600">Mind. Qualifikation:</td><td style="padding:0.3rem">${escapeHtml(QUAL_LABELS[obj.mindestQual] || obj.mindestQual)}</td></tr>` : ''}
            ${obj.minMA ? `<tr><td style="padding:0.3rem;font-weight:600">Min. MA/Schicht:</td><td style="padding:0.3rem">${obj.minMA}</td></tr>` : ''}
            ${obj.anforderungen ? `<tr><td style="padding:0.3rem;font-weight:600">Anforderungen:</td><td style="padding:0.3rem">${escapeHtml(obj.anforderungen)}</td></tr>` : ''}
        </table>`;

    if (kontakte.length > 0) {
        html += '<h4>Kontakte</h4><table style="width:100%;border-collapse:collapse;font-size:0.85rem;margin-bottom:1rem">';
        kontakte.forEach(k => {
            html += `<tr><td style="padding:0.2rem;font-weight:600">${escapeHtml(k.rolle || '\u2014')}</td><td style="padding:0.2rem">${escapeHtml(k.name)}</td><td style="padding:0.2rem">${escapeHtml(k.telefon || '\u2014')}</td></tr>`;
        });
        html += '</table>';
    }

    if (anweisungen.length > 0) {
        html += '<h4>Dienstanweisungen</h4><ul style="font-size:0.85rem">';
        anweisungen.forEach(a => { html += `<li>${escapeHtml(a.text)}</li>`; });
        html += '</ul>';
    }

    if (plan && plan.text) {
        html += `<h4>Revierplan</h4><pre style="white-space:pre-wrap;font-size:0.85rem;font-family:sans-serif;background:#f7f7f7;padding:0.5rem;border-radius:4px">${escapeHtml(plan.text)}</pre>`;
    }

    html += `<p style="margin-top:1rem;font-size:0.7rem;color:#999">Stand: ${formatDatum(new Date().toISOString().split('T')[0])}</p></div>`;

    document.getElementById('printArea').innerHTML = html;
    window.print();
}

function updateInfokarteSelect() {
    const sel = document.getElementById('ikObjekt');
    if (!sel) return;
    sel.innerHTML = '<option value="">Objekt wählen...</option>';
    objekte.forEach(o => {
        sel.innerHTML += `<option value="${escapeHtml(o.name)}">${escapeHtml(o.name)}</option>`;
    });
}

// =============================================
// SCHICHTTAUSCH-BOARD
// =============================================
let tauschAnfragen = JSON.parse(localStorage.getItem('bbprotect_tauschanfragen') || '[]');

function tauschAnfrageErstellen(einsatzId) {
    const e = einsaetze.find(x => x.id === einsatzId);
    if (!e || !e.mitarbeiter) { alert('Kein gültiger Einsatz mit Mitarbeiter.'); return; }

    if (tauschAnfragen.find(t => t.einsatzId === einsatzId && t.status === 'offen')) {
        alert('Für diesen Einsatz existiert bereits eine Tausch-Anfrage.');
        return;
    }

    tauschAnfragen.push({
        id: Date.now(),
        einsatzId,
        von: e.mitarbeiter,
        objekt: e.objekt,
        datum: e.datum,
        zeitVon: e.zeitVon,
        zeitBis: e.zeitBis,
        status: 'offen',
        erstellt: new Date().toISOString().split('T')[0]
    });

    localStorage.setItem('bbprotect_tauschanfragen', JSON.stringify(tauschAnfragen));
    logAudit('erstellt', 'Schichttausch', `${e.mitarbeiter} bietet ${e.objekt} am ${formatDatum(e.datum)}`);
    renderTauschBoard();
}

function tauschAnnehmen(tauschId, neuerMA) {
    const t = tauschAnfragen.find(x => x.id === tauschId);
    if (!t) return;

    const e = einsaetze.find(x => x.id === t.einsatzId);
    if (!e) return;

    const alterMA = e.mitarbeiter;
    e.mitarbeiter = neuerMA;
    t.status = 'angenommen';
    t.an = neuerMA;

    speichern();
    localStorage.setItem('bbprotect_tauschanfragen', JSON.stringify(tauschAnfragen));
    logAudit('bearbeitet', 'Schichttausch', `${alterMA} → ${neuerMA} für ${t.objekt} am ${formatDatum(t.datum)}`);
    renderTauschBoard();
    renderTabelle();
}

function renderTauschBoard() {
    const el = document.getElementById('tauschBoardContent');
    if (!el) return;

    const offene = tauschAnfragen.filter(t => t.status === 'offen');
    const abgeschlossene = tauschAnfragen.filter(t => t.status === 'angenommen').slice(-5);

    if (offene.length === 0 && abgeschlossene.length === 0) {
        el.innerHTML = '<p style="color:#a0aec0">Keine Tausch-Anfragen. Nutze "Tausch" in der Einsatztabelle.</p>';
        return;
    }

    let html = '';
    if (offene.length > 0) {
        html += '<div class="tb-section"><strong>Offene Anfragen:</strong></div>';
        offene.forEach(t => {
            const verfuegbar = mitarbeiterListe_.filter(m => {
                if (m.name === t.von) return false;
                const abw = verfuegbarkeit.find(v => v.mitarbeiter === m.name && v.von <= t.datum && v.bis >= t.datum);
                return !abw;
            });

            html += `<div class="tb-item">
                <div class="tb-info">
                    <strong>${escapeHtml(t.von)}</strong> bietet:
                    <span class="tb-einsatz">${escapeHtml(t.objekt)} | ${formatDatum(t.datum)} | ${t.zeitVon}-${t.zeitBis}</span>
                </div>
                <div class="tb-actions">
                    <select class="tb-select" id="tbMA_${t.id}">
                        <option value="">MA wählen...</option>
                        ${verfuegbar.map(m => `<option value="${escapeHtml(m.name)}">${escapeHtml(m.name)}</option>`).join('')}
                    </select>
                    <button class="btn-primary btn-small" onclick="var s=document.getElementById('tbMA_${t.id}');if(s.value)tauschAnnehmen(${t.id},s.value)">Zuweisen</button>
                </div>
            </div>`;
        });
    }

    if (abgeschlossene.length > 0) {
        html += '<div class="tb-section" style="margin-top:0.75rem"><strong>Letzte Tausche:</strong></div>';
        abgeschlossene.reverse().forEach(t => {
            html += `<div class="tb-item tb-done">
                <span>${escapeHtml(t.von)} → ${escapeHtml(t.an || '?')}</span>
                <span class="tb-einsatz">${escapeHtml(t.objekt)} | ${formatDatum(t.datum)}</span>
            </div>`;
        });
    }

    el.innerHTML = html;
}

// =============================================
// EINSATZ-KOMMENTARE
// =============================================
let einsatzKommentare = JSON.parse(localStorage.getItem('bbprotect_einsatzkommentare') || '{}');

function kommentarSpeichern(einsatzId) {
    const input = document.getElementById('ek_input_' + einsatzId);
    if (!input || !input.value.trim()) return;

    if (!einsatzKommentare[einsatzId]) einsatzKommentare[einsatzId] = [];
    einsatzKommentare[einsatzId].push({
        text: input.value.trim(),
        zeit: new Date().toISOString(),
        autor: 'System'
    });

    localStorage.setItem('bbprotect_einsatzkommentare', JSON.stringify(einsatzKommentare));
    input.value = '';
    renderKommentare(einsatzId);
    logAudit('erstellt', 'Kommentar', `Einsatz #${einsatzId}`);
}

function kommentarLoeschen(einsatzId, idx) {
    if (!einsatzKommentare[einsatzId]) return;
    einsatzKommentare[einsatzId].splice(idx, 1);
    if (einsatzKommentare[einsatzId].length === 0) delete einsatzKommentare[einsatzId];
    localStorage.setItem('bbprotect_einsatzkommentare', JSON.stringify(einsatzKommentare));
    renderKommentare(einsatzId);
}

function renderKommentare(einsatzId) {
    const el = document.getElementById('ek_list_' + einsatzId);
    if (!el) return;
    const komms = einsatzKommentare[einsatzId] || [];
    if (komms.length === 0) { el.innerHTML = ''; return; }
    el.innerHTML = komms.map((k, i) => `<div class="ek-item">
        <span class="ek-text">${escapeHtml(k.text)}</span>
        <span class="ek-meta">${k.zeit ? new Date(k.zeit).toLocaleDateString('de-DE') : ''}</span>
        <button class="btn-delete btn-small" onclick="kommentarLoeschen(${einsatzId},${i})" style="padding:0 0.3rem;font-size:0.6rem">&times;</button>
    </div>`).join('');
}

function toggleKommentare(einsatzId) {
    const row = document.getElementById('ek_row_' + einsatzId);
    if (!row) return;
    row.style.display = row.style.display === 'none' ? 'table-row' : 'none';
    if (row.style.display === 'table-row') renderKommentare(einsatzId);
}

// =============================================
// MA-VERFÜGBARKEITS-KALENDER (Monatsansicht)
// =============================================
function renderMAVerfuegbarkeitsKalender() {
    const el = document.getElementById('maVerfKalContent');
    if (!el) return;

    const monat = document.getElementById('mavkMonat') ? document.getElementById('mavkMonat').value : '';
    if (!monat) { el.innerHTML = '<p style="color:#a0aec0">Bitte Monat wählen.</p>'; return; }

    const [jahr, mon] = monat.split('-').map(Number);
    const tageImMonat = new Date(jahr, mon, 0).getDate();
    const maList = mitarbeiterListe_.slice().sort((a, b) => a.name.localeCompare(b.name));

    if (maList.length === 0) { el.innerHTML = '<p style="color:#a0aec0">Keine Mitarbeiter vorhanden.</p>'; return; }

    let html = '<div class="mavk-wrapper"><table class="mavk-tabelle"><thead><tr><th>MA</th>';
    for (let d = 1; d <= tageImMonat; d++) {
        const wt = new Date(jahr, mon - 1, d).getDay();
        html += `<th class="${wt === 0 || wt === 6 ? 'mavk-we' : ''}">${d}</th>`;
    }
    html += '</tr></thead><tbody>';

    maList.forEach(ma => {
        html += `<tr><td class="mavk-name">${escapeHtml(ma.name.split(' ').map(n => n[0]).join(''))}</td>`;
        for (let d = 1; d <= tageImMonat; d++) {
            const datum = `${jahr}-${String(mon).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const wt = new Date(jahr, mon - 1, d).getDay();

            // Prüfe Abwesenheiten
            const abw = verfuegbarkeit.find(v => v.mitarbeiter === ma.name && v.von <= datum && v.bis >= datum);
            // Prüfe ob Einsatz vorhanden
            const hatEinsatz = einsaetze.some(e => e.mitarbeiter === ma.name && e.datum === datum && e.status !== 'storniert');

            let cls = 'mavk-frei';
            let title = 'Verfügbar';
            if (abw) {
                if (abw.grund === 'urlaub') { cls = 'mavk-urlaub'; title = 'Urlaub'; }
                else if (abw.grund === 'krank') { cls = 'mavk-krank'; title = 'Krank'; }
                else { cls = 'mavk-abw'; title = abw.grund || 'Abwesend'; }
            } else if (hatEinsatz) {
                cls = 'mavk-einsatz'; title = 'Einsatz';
            }
            if (wt === 0 || wt === 6) cls += ' mavk-we';

            html += `<td class="${cls}" title="${escapeHtml(ma.name)}: ${title}"></td>`;
        }
        html += '</tr>';
    });

    html += '</tbody></table></div>';
    el.innerHTML = html;
}

// =============================================
// OBJEKT-UMSATZ-RANKING
// =============================================
function renderObjektUmsatzRanking() {
    const el = document.getElementById('objektRankingContent');
    if (!el) return;

    const ranking = {};
    einsaetze.filter(e => e.status !== 'storniert').forEach(e => {
        if (!ranking[e.objekt]) ranking[e.objekt] = { stunden: 0, umsatz: 0, einsaetze: 0 };
        ranking[e.objekt].stunden += e.stunden;
        ranking[e.objekt].umsatz += e.gesamt;
        ranking[e.objekt].einsaetze++;
    });

    const sorted = Object.entries(ranking).sort((a, b) => b[1].umsatz - a[1].umsatz);
    if (sorted.length === 0) {
        el.innerHTML = '<p style="color:#a0aec0">Keine Einsatzdaten vorhanden.</p>';
        return;
    }

    const maxUmsatz = sorted[0][1].umsatz || 1;

    let html = '<div class="or-list">';
    sorted.forEach(([name, data], i) => {
        const pct = (data.umsatz / maxUmsatz) * 100;
        const stundensatz = data.stunden > 0 ? data.umsatz / data.stunden : 0;
        html += `<div class="or-item">
            <div class="or-rank">#${i + 1}</div>
            <div class="or-details">
                <div class="or-name">${escapeHtml(name)}</div>
                <div class="or-bar-bg"><div class="or-bar-fill" style="width:${pct}%"></div></div>
                <div class="or-stats">
                    <span>${formatEuro(data.umsatz)} Umsatz</span>
                    <span>${formatZahl(data.stunden)} Std.</span>
                    <span>${data.einsaetze} Einsätze</span>
                    <span>Ø ${formatEuro(stundensatz)}/Std.</span>
                </div>
            </div>
        </div>`;
    });
    html += '</div>';
    el.innerHTML = html;
}

// =============================================
// SCHICHTÜBERGABE-PROTOKOLL
// =============================================
let schichtUebergaben = JSON.parse(localStorage.getItem('bbprotect_schichtuebergaben') || '[]');

function schichtUebergabeSpeichern() {
    const objekt = document.getElementById('suObjekt') ? document.getElementById('suObjekt').value : '';
    const datum = document.getElementById('suDatum') ? document.getElementById('suDatum').value : '';
    const vonMA = document.getElementById('suVonMA') ? document.getElementById('suVonMA').value.trim() : '';
    const anMA = document.getElementById('suAnMA') ? document.getElementById('suAnMA').value.trim() : '';
    const notiz = document.getElementById('suNotiz') ? document.getElementById('suNotiz').value.trim() : '';

    if (!objekt || !datum || !notiz) { alert('Bitte Objekt, Datum und Notiz ausfüllen.'); return; }

    schichtUebergaben.push({
        id: Date.now(),
        objekt,
        datum,
        vonMA,
        anMA,
        notiz,
        erstellt: new Date().toISOString()
    });

    localStorage.setItem('bbprotect_schichtuebergaben', JSON.stringify(schichtUebergaben));
    logAudit('erstellt', 'Schichtübergabe', `${objekt} am ${formatDatum(datum)}`);

    if (document.getElementById('suNotiz')) document.getElementById('suNotiz').value = '';
    renderSchichtUebergaben();
}

function renderSchichtUebergaben() {
    const el = document.getElementById('schichtUebergabenContent');
    if (!el) return;

    const objekt = document.getElementById('suFilterObjekt') ? document.getElementById('suFilterObjekt').value : '';
    let gefiltert = objekt ? schichtUebergaben.filter(s => s.objekt === objekt) : schichtUebergaben;
    gefiltert = gefiltert.sort((a, b) => b.datum.localeCompare(a.datum) || b.erstellt.localeCompare(a.erstellt)).slice(0, 20);

    if (gefiltert.length === 0) {
        el.innerHTML = '<p style="color:#a0aec0">Keine Übergabeprotokolle vorhanden.</p>';
        return;
    }

    let html = '';
    gefiltert.forEach(s => {
        html += `<div class="su-item">
            <div class="su-header">
                <strong>${escapeHtml(s.objekt)}</strong> | ${formatDatum(s.datum)}
                ${s.vonMA ? '<span class="su-ma">' + escapeHtml(s.vonMA) + ' → ' + escapeHtml(s.anMA || '?') + '</span>' : ''}
            </div>
            <div class="su-notiz">${escapeHtml(s.notiz)}</div>
        </div>`;
    });
    el.innerHTML = html;
}

function updateSchichtUebergabeSelects() {
    const suObjekt = document.getElementById('suObjekt');
    const suFilterObjekt = document.getElementById('suFilterObjekt');
    if (suObjekt) {
        suObjekt.innerHTML = '<option value="">Objekt wählen...</option>';
        objekte.forEach(o => { suObjekt.innerHTML += `<option value="${escapeHtml(o.name)}">${escapeHtml(o.name)}</option>`; });
    }
    if (suFilterObjekt) {
        suFilterObjekt.innerHTML = '<option value="">Alle Objekte</option>';
        objekte.forEach(o => { suFilterObjekt.innerHTML += `<option value="${escapeHtml(o.name)}">${escapeHtml(o.name)}</option>`; });
    }
}

// =============================================
// EINSATZ-EXPORT (CSV)
// =============================================
function exportiereEinsaetzeCSV() {
    const filterMonat = document.getElementById('csvExportMonat') ? document.getElementById('csvExportMonat').value : '';
    const filterObjekt = document.getElementById('csvExportObjekt') ? document.getElementById('csvExportObjekt').value : '';

    let gefiltert = einsaetze.filter(e => e.status !== 'storniert');
    if (filterMonat) gefiltert = gefiltert.filter(e => e.datum.substring(0, 7) === filterMonat);
    if (filterObjekt) gefiltert = gefiltert.filter(e => e.objekt === filterObjekt);

    if (gefiltert.length === 0) { alert('Keine Einsätze zum Exportieren.'); return; }

    gefiltert.sort((a, b) => a.datum.localeCompare(b.datum) || a.zeitVon.localeCompare(b.zeitVon));

    const header = 'Datum;Objekt;Mitarbeiter;Von;Bis;Stunden;Pause (Min);Stundensatz;Grundlohn;Zuschlag;Gesamt;Status';
    const rows = gefiltert.map(e => [
        formatDatum(e.datum),
        '"' + (e.objekt || '').replace(/"/g, '""') + '"',
        '"' + (e.mitarbeiter || '').replace(/"/g, '""') + '"',
        e.zeitVon,
        e.zeitBis,
        formatZahl(e.stunden).replace('.', ','),
        e.pauseMinuten || 0,
        formatZahl(e.stundensatz).replace('.', ','),
        formatZahl(e.grundlohn).replace('.', ','),
        formatZahl(e.zuschlagBetrag).replace('.', ','),
        formatZahl(e.gesamt).replace('.', ','),
        e.status || 'aktiv'
    ].join(';'));

    const csv = '\uFEFF' + header + '\n' + rows.join('\n');
    const datum = filterMonat || new Date().toISOString().split('T')[0];
    downloadFile(`BBProtect_Einsaetze_${datum}.csv`, csv, 'text/csv;charset=utf-8');

    logAudit('exportiert', 'CSV-Export', `${gefiltert.length} Einsätze exportiert`);
}

function updateCSVExportFilter() {
    const monatSel = document.getElementById('csvExportMonat');
    const objektSel = document.getElementById('csvExportObjekt');
    if (!monatSel || !objektSel) return;

    const monate = new Set();
    const objekte_ = new Set();
    einsaetze.forEach(e => {
        monate.add(e.datum.substring(0, 7));
        objekte_.add(e.objekt);
    });

    monatSel.innerHTML = '<option value="">Alle Monate</option>';
    Array.from(monate).sort().reverse().forEach(m => {
        const [j, mo] = m.split('-');
        monatSel.innerHTML += `<option value="${m}">${MONATSNAMEN[parseInt(mo) - 1]} ${j}</option>`;
    });

    objektSel.innerHTML = '<option value="">Alle Objekte</option>';
    Array.from(objekte_).sort().forEach(o => {
        objektSel.innerHTML += `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`;
    });
}

// =============================================
// EINSATZ-WIEDERKEHREND
// =============================================
function erstelleWiederkehrend() {
    const objekt = document.getElementById('wkObjekt') ? document.getElementById('wkObjekt').value : '';
    const ma = document.getElementById('wkMA') ? document.getElementById('wkMA').value : '';
    const zeitVon = document.getElementById('wkZeitVon') ? document.getElementById('wkZeitVon').value : '';
    const zeitBis = document.getElementById('wkZeitBis') ? document.getElementById('wkZeitBis').value : '';
    const satz = parseFloat(document.getElementById('wkSatz') ? document.getElementById('wkSatz').value : 0) || 0;
    const startDatum = document.getElementById('wkStart') ? document.getElementById('wkStart').value : '';
    const endDatum = document.getElementById('wkEnde') ? document.getElementById('wkEnde').value : '';
    const rhythmus = document.getElementById('wkRhythmus') ? document.getElementById('wkRhythmus').value : 'woche';
    const wochentage = [];

    document.querySelectorAll('.wk-wt:checked').forEach(cb => wochentage.push(parseInt(cb.value)));

    if (!objekt || !zeitVon || !zeitBis || !startDatum || !endDatum) {
        alert('Bitte alle Pflichtfelder ausfüllen (Objekt, Zeiten, Start, Ende).');
        return;
    }

    if (endDatum < startDatum) { alert('Enddatum muss nach Startdatum liegen.'); return; }

    const start = new Date(startDatum);
    const ende = new Date(endDatum);
    let erstellt = 0;
    const maxEinsaetze = 365;

    const current = new Date(start);
    while (current <= ende && erstellt < maxEinsaetze) {
        const datum = current.toISOString().split('T')[0];
        const wt = current.getDay();

        let einfuegen = false;
        if (rhythmus === 'taeglich') einfuegen = true;
        else if (rhythmus === 'woche' && wochentage.includes(wt)) einfuegen = true;
        else if (rhythmus === 'monat' && current.getDate() === start.getDate()) einfuegen = true;

        if (einfuegen) {
            // Prüfe ob identischer Einsatz existiert
            const duplikat = einsaetze.some(e => e.datum === datum && e.objekt === objekt && e.zeitVon === zeitVon && e.zeitBis === zeitBis && e.mitarbeiter === ma);
            if (!duplikat) {
                const einsatz = berechneEinsatz(datum, zeitVon, zeitBis, satz);
                einsatz.id = Date.now() + erstellt;
                einsatz.objekt = objekt;
                einsatz.mitarbeiter = ma;
                einsatz.status = 'aktiv';
                einsaetze.push(einsatz);
                erstellt++;
            }
        }
        current.setDate(current.getDate() + 1);
    }

    if (erstellt > 0) {
        speichern();
        renderTabelle();
        updateAlleFilter();
        updateHeaderStats();
        logAudit('erstellt', 'Wiederkehrend', `${erstellt} Einsätze für ${objekt} (${rhythmus})`);
        alert(`${erstellt} wiederkehrende Einsätze erstellt.`);
    } else {
        alert('Keine neuen Einsätze erstellt (evtl. alle bereits vorhanden).');
    }
}

// =============================================
// MA-STUNDENKONTO-DIAGRAMM (Soll vs Ist)
// =============================================
function renderStundenkontoChart() {
    const el = document.getElementById('stundenkontoChartContent');
    if (!el) return;

    const monat = document.getElementById('skChartMonat') ? document.getElementById('skChartMonat').value : '';
    if (!monat) { el.innerHTML = '<p style="color:#a0aec0">Bitte Monat wählen.</p>'; return; }

    const maList = mitarbeiterListe_.filter(m => m.sollStunden > 0).sort((a, b) => a.name.localeCompare(b.name));
    if (maList.length === 0) { el.innerHTML = '<p style="color:#a0aec0">Keine MA mit Soll-Stunden definiert.</p>'; return; }

    const maxSoll = Math.max(...maList.map(m => m.sollStunden), 1);

    let html = '<div class="skc-chart">';
    maList.forEach(m => {
        const istStd = einsaetze.filter(e => e.mitarbeiter === m.name && e.datum.substring(0, 7) === monat && e.status !== 'storniert')
            .reduce((s, e) => s + e.stunden, 0);
        const sollPct = (m.sollStunden / maxSoll) * 100;
        const istPct = (istStd / maxSoll) * 100;
        const diff = istStd - m.sollStunden;
        const diffCls = diff >= 0 ? 'skc-plus' : 'skc-minus';

        html += `<div class="skc-row">
            <div class="skc-name" title="${escapeHtml(m.name)}">${escapeHtml(m.name.split(' ').map(n => n.substring(0, 6)).join(' '))}</div>
            <div class="skc-bars">
                <div class="skc-bar skc-soll" style="width:${sollPct}%"></div>
                <div class="skc-bar skc-ist" style="width:${Math.min(istPct, 100)}%"></div>
            </div>
            <div class="skc-vals">
                <span>${formatZahl(istStd)}/${formatZahl(m.sollStunden)}</span>
                <span class="${diffCls}">${diff >= 0 ? '+' : ''}${formatZahl(diff)}</span>
            </div>
        </div>`;
    });

    html += '<div class="skc-legend"><span class="skc-leg-soll">■ Soll</span><span class="skc-leg-ist">■ Ist</span></div>';
    html += '</div>';
    el.innerHTML = html;
}

// =============================================
// OBJEKT-WETTER-NOTIZEN
// =============================================
let objektWetterNotizen = JSON.parse(localStorage.getItem('bbprotect_objektwetter') || '{}');

function wetterNotizSpeichern() {
    const objekt = document.getElementById('owObjekt') ? document.getElementById('owObjekt').value : '';
    const datum = document.getElementById('owDatum') ? document.getElementById('owDatum').value : '';
    const wetter = document.getElementById('owWetter') ? document.getElementById('owWetter').value : '';
    const notiz = document.getElementById('owNotiz') ? document.getElementById('owNotiz').value.trim() : '';

    if (!objekt || !datum) { alert('Bitte Objekt und Datum ausfüllen.'); return; }

    const key = `${objekt}|${datum}`;
    objektWetterNotizen[key] = { wetter, notiz, erstellt: new Date().toISOString() };
    localStorage.setItem('bbprotect_objektwetter', JSON.stringify(objektWetterNotizen));
    logAudit('erstellt', 'Wetter-Notiz', `${objekt} am ${formatDatum(datum)}: ${wetter}`);
    renderWetterNotizen();
}

function renderWetterNotizen() {
    const el = document.getElementById('wetterNotizenContent');
    if (!el) return;

    const objekt = document.getElementById('owFilterObjekt') ? document.getElementById('owFilterObjekt').value : '';
    const entries = Object.entries(objektWetterNotizen)
        .filter(([key]) => !objekt || key.startsWith(objekt + '|'))
        .sort((a, b) => b[0].split('|')[1].localeCompare(a[0].split('|')[1]))
        .slice(0, 20);

    if (entries.length === 0) { el.innerHTML = '<p style="color:#a0aec0">Keine Wetter-Notizen vorhanden.</p>'; return; }

    const wetterIcons = { sonnig: '☀️', bewoelkt: '⛅', regen: '🌧️', schnee: '❄️', sturm: '🌪️', nebel: '🌫️' };

    let html = '';
    entries.forEach(([key, val]) => {
        const [obj, dat] = key.split('|');
        html += `<div class="ow-item">
            <span class="ow-icon">${wetterIcons[val.wetter] || '🌡️'}</span>
            <span class="ow-obj">${escapeHtml(obj)}</span>
            <span class="ow-dat">${formatDatum(dat)}</span>
            ${val.notiz ? '<span class="ow-notiz">' + escapeHtml(val.notiz) + '</span>' : ''}
        </div>`;
    });
    el.innerHTML = html;
}

function updateWetterObjektSelects() {
    ['owObjekt', 'owFilterObjekt'].forEach(selId => {
        const sel = document.getElementById(selId);
        if (!sel) return;
        const current = sel.value;
        sel.innerHTML = selId === 'owFilterObjekt' ? '<option value="">Alle Objekte</option>' : '<option value="">Objekt wählen...</option>';
        objekte.forEach(o => { sel.innerHTML += `<option value="${escapeHtml(o.name)}">${escapeHtml(o.name)}</option>`; });
        if (current) sel.value = current;
    });
}

// =============================================
// FEIERTAGS-KALENDERANSICHT
// =============================================
function renderFeiertagsKalender() {
    const el = document.getElementById('feiertagsKalContent');
    if (!el) return;

    const jahr = parseInt(document.getElementById('fkJahr') ? document.getElementById('fkJahr').value : new Date().getFullYear());
    const feiertage = getFeiertage(jahr);

    let html = '<div class="fk-grid">';
    for (let m = 0; m < 12; m++) {
        html += `<div class="fk-monat"><div class="fk-monat-name">${MONATSNAMEN[m]}</div>`;
        const tage = new Date(jahr, m + 1, 0).getDate();
        html += '<div class="fk-tage">';
        // Wochentag-Header
        ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].forEach(w => {
            html += `<span class="fk-wt">${w}</span>`;
        });
        // Leere Felder bis zum ersten Tag
        const ersterTag = new Date(jahr, m, 1).getDay();
        const offset = ersterTag === 0 ? 6 : ersterTag - 1;
        for (let i = 0; i < offset; i++) html += '<span class="fk-leer"></span>';

        for (let d = 1; d <= tage; d++) {
            const datum = `${jahr}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const istFeiertag = feiertage[datum];
            const wt = new Date(jahr, m, d).getDay();
            const isWe = wt === 0 || wt === 6;
            let cls = 'fk-tag';
            if (istFeiertag) cls += ' fk-feiertag';
            else if (isWe) cls += ' fk-we';

            html += `<span class="${cls}" title="${istFeiertag || ''}">${d}</span>`;
        }
        html += '</div></div>';
    }
    html += '</div>';

    // Legende
    const ftList = Object.entries(feiertage).sort((a, b) => a[0].localeCompare(b[0]));
    html += '<div class="fk-legende">';
    ftList.forEach(([datum, name]) => {
        html += `<div class="fk-ft-item"><span class="fk-ft-datum">${formatDatum(datum)}</span><span class="fk-ft-name">${escapeHtml(name)}</span></div>`;
    });
    html += '</div>';

    el.innerHTML = html;
}

// =============================================
// DASHBOARD-SCHNELLZUGRIFF-KACHELN
// =============================================
function renderDashboardKacheln() {
    const el = document.getElementById('dashboardKacheln');
    if (!el) return;

    const heute = new Date().toISOString().split('T')[0];
    const heuteE = einsaetze.filter(e => e.datum === heute && e.status !== 'storniert');
    const offeneT = tauschAnfragen.filter(t => t.status === 'offen').length;
    const abwHeute = verfuegbarkeit.filter(v => v.von <= heute && v.bis >= heute).length;
    const unbesetzt = heuteE.filter(e => !e.mitarbeiter).length;

    el.innerHTML = `
        <div class="dk-grid">
            <div class="dk-kachel dk-blau" onclick="schnellHeuteAnzeigen()">
                <div class="dk-zahl">${heuteE.length}</div>
                <div class="dk-label">Einsätze heute</div>
            </div>
            <div class="dk-kachel ${unbesetzt > 0 ? 'dk-rot' : 'dk-gruen'}" onclick="quickFilter('heute')">
                <div class="dk-zahl">${unbesetzt}</div>
                <div class="dk-label">Unbesetzte Schichten</div>
            </div>
            <div class="dk-kachel dk-orange" onclick="document.querySelector('[data-tab=mitarbeiter]').click()">
                <div class="dk-zahl">${abwHeute}</div>
                <div class="dk-label">Abwesend heute</div>
            </div>
            <div class="dk-kachel ${offeneT > 0 ? 'dk-lila' : 'dk-grau'}" onclick="document.querySelector('[data-tab=mitarbeiter]').click()">
                <div class="dk-zahl">${offeneT}</div>
                <div class="dk-label">Offene Tausch-Anfragen</div>
            </div>
        </div>`;
}

// =============================================
// EINSATZ-PRIORITÄTEN
// =============================================
let einsatzPrioritaeten = JSON.parse(localStorage.getItem('bbprotect_prioritaeten') || '{}');

function setzePrioritaet(einsatzId, prio) {
    einsatzPrioritaeten[einsatzId] = prio;
    localStorage.setItem('bbprotect_prioritaeten', JSON.stringify(einsatzPrioritaeten));
    renderTabelle();
}

function getPrioritaetBadge(einsatzId) {
    const prio = einsatzPrioritaeten[einsatzId] || 'normal';
    if (prio === 'hoch') return '<span class="prio-badge prio-hoch" title="Hohe Priorität">!</span>';
    if (prio === 'kritisch') return '<span class="prio-badge prio-kritisch" title="Kritisch">!!</span>';
    return '';
}

// =============================================
// MA-NACHRICHTEN-BOARD
// =============================================
let maNachrichten = JSON.parse(localStorage.getItem('bbprotect_nachrichten') || '[]');

function nachrichtSpeichern() {
    const betreff = document.getElementById('nbBetreff') ? document.getElementById('nbBetreff').value.trim() : '';
    const text = document.getElementById('nbText') ? document.getElementById('nbText').value.trim() : '';
    const wichtig = document.getElementById('nbWichtig') ? document.getElementById('nbWichtig').checked : false;

    if (!betreff || !text) { alert('Bitte Betreff und Text ausfüllen.'); return; }

    maNachrichten.push({
        id: Date.now(),
        betreff,
        text,
        wichtig,
        datum: new Date().toISOString(),
        gelesen: false
    });

    localStorage.setItem('bbprotect_nachrichten', JSON.stringify(maNachrichten));
    logAudit('erstellt', 'Nachricht', betreff);

    if (document.getElementById('nbBetreff')) document.getElementById('nbBetreff').value = '';
    if (document.getElementById('nbText')) document.getElementById('nbText').value = '';
    if (document.getElementById('nbWichtig')) document.getElementById('nbWichtig').checked = false;
    renderNachrichtenBoard();
}

function nachrichtLoeschen(id) {
    maNachrichten = maNachrichten.filter(n => n.id !== id);
    localStorage.setItem('bbprotect_nachrichten', JSON.stringify(maNachrichten));
    renderNachrichtenBoard();
}

function renderNachrichtenBoard() {
    const el = document.getElementById('nachrichtenBoardContent');
    if (!el) return;

    if (maNachrichten.length === 0) {
        el.innerHTML = '<p style="color:#a0aec0">Keine Nachrichten vorhanden.</p>';
        return;
    }

    const sorted = maNachrichten.slice().sort((a, b) => {
        if (a.wichtig !== b.wichtig) return b.wichtig ? 1 : -1;
        return b.datum.localeCompare(a.datum);
    });

    let html = '';
    sorted.forEach(n => {
        const datum = new Date(n.datum);
        html += `<div class="nb-item ${n.wichtig ? 'nb-wichtig' : ''}">
            <div class="nb-header">
                ${n.wichtig ? '<span class="nb-badge">WICHTIG</span>' : ''}
                <strong>${escapeHtml(n.betreff)}</strong>
                <span class="nb-datum">${datum.toLocaleDateString('de-DE')} ${datum.toLocaleTimeString('de-DE', {hour:'2-digit',minute:'2-digit'})}</span>
                <button class="btn-delete btn-small" onclick="nachrichtLoeschen(${n.id})" style="padding:0 0.3rem">&times;</button>
            </div>
            <div class="nb-text">${escapeHtml(n.text)}</div>
        </div>`;
    });
    el.innerHTML = html;
}

// =============================================
// OBJEKT-CHECKLISTEN
// =============================================
let objektChecklisten = JSON.parse(localStorage.getItem('bbprotect_objektchecklisten') || '{}');

function checklistePunktHinzufuegen() {
    const objekt = document.getElementById('oclObjekt') ? document.getElementById('oclObjekt').value : '';
    const text = document.getElementById('oclText') ? document.getElementById('oclText').value.trim() : '';

    if (!objekt || !text) { alert('Bitte Objekt und Prüfpunkt ausfüllen.'); return; }

    if (!objektChecklisten[objekt]) objektChecklisten[objekt] = [];
    objektChecklisten[objekt].push({ text, erledigt: false, id: Date.now() });
    localStorage.setItem('bbprotect_objektchecklisten', JSON.stringify(objektChecklisten));

    if (document.getElementById('oclText')) document.getElementById('oclText').value = '';
    renderObjektCheckliste();
}

function checklisteToggle(objekt, id) {
    const liste = objektChecklisten[objekt];
    if (!liste) return;
    const item = liste.find(i => i.id === id);
    if (item) item.erledigt = !item.erledigt;
    localStorage.setItem('bbprotect_objektchecklisten', JSON.stringify(objektChecklisten));
    renderObjektCheckliste();
}

function checklistePunktLoeschen(objekt, id) {
    if (!objektChecklisten[objekt]) return;
    objektChecklisten[objekt] = objektChecklisten[objekt].filter(i => i.id !== id);
    if (objektChecklisten[objekt].length === 0) delete objektChecklisten[objekt];
    localStorage.setItem('bbprotect_objektchecklisten', JSON.stringify(objektChecklisten));
    renderObjektCheckliste();
}

function renderObjektCheckliste() {
    const el = document.getElementById('objektChecklisteContent');
    if (!el) return;

    const objekt = document.getElementById('oclObjekt') ? document.getElementById('oclObjekt').value : '';
    if (!objekt) { el.innerHTML = '<p style="color:#a0aec0">Bitte Objekt wählen.</p>'; return; }

    const liste = objektChecklisten[objekt] || [];
    if (liste.length === 0) {
        el.innerHTML = '<p style="color:#a0aec0">Keine Prüfpunkte. Füge welche über das Feld oben hinzu.</p>';
        return;
    }

    const erledigt = liste.filter(i => i.erledigt).length;
    let html = `<div class="ocl-progress"><span>${erledigt}/${liste.length} erledigt</span><div class="ocl-bar-bg"><div class="ocl-bar-fill" style="width:${(erledigt/liste.length)*100}%"></div></div></div>`;
    html += '<div class="ocl-list">';
    liste.forEach(item => {
        html += `<div class="ocl-item ${item.erledigt ? 'ocl-done' : ''}" onclick="checklisteToggle('${escapeHtml(objekt)}',${item.id})">
            <span class="ocl-check">${item.erledigt ? '☑' : '☐'}</span>
            <span class="ocl-text">${escapeHtml(item.text)}</span>
            <button class="btn-delete btn-small" onclick="event.stopPropagation();checklistePunktLoeschen('${escapeHtml(objekt)}',${item.id})" style="padding:0 0.3rem;font-size:0.6rem">&times;</button>
        </div>`;
    });
    html += '</div>';
    el.innerHTML = html;
}

function updateObjektChecklisteSelect() {
    const sel = document.getElementById('oclObjekt');
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = '<option value="">Objekt wählen...</option>';
    objekte.forEach(o => { sel.innerHTML += `<option value="${escapeHtml(o.name)}">${escapeHtml(o.name)}</option>`; });
    if (current) sel.value = current;
}

// =============================================
// SCHICHTPLAN-VORSCHAU (7-Tage-Raster)
// =============================================
function renderSchichtplanVorschau() {
    const el = document.getElementById('schichtplanVorschauContent');
    if (!el) return;

    const heute = new Date();
    const tage = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(heute);
        d.setDate(d.getDate() + i);
        tage.push(d.toISOString().split('T')[0]);
    }

    const WT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

    let html = '<div class="spv-grid">';
    tage.forEach(datum => {
        const d = new Date(datum);
        const wt = WT[d.getDay()];
        const isHeute = datum === heute.toISOString().split('T')[0];
        const tagesE = einsaetze.filter(e => e.datum === datum && e.status !== 'storniert').sort((a, b) => a.zeitVon.localeCompare(b.zeitVon));
        const feiertag = typeof getFeiertage === 'function' ? getFeiertage(d.getFullYear())[datum] : null;

        html += `<div class="spv-tag ${isHeute ? 'spv-heute' : ''}">
            <div class="spv-tag-header">
                <strong>${wt}</strong> ${d.getDate()}.${d.getMonth() + 1}.
                ${feiertag ? '<span class="spv-ft">' + escapeHtml(feiertag) + '</span>' : ''}
            </div>`;

        if (tagesE.length === 0) {
            html += '<div class="spv-leer">Keine Einsätze</div>';
        } else {
            tagesE.forEach(e => {
                const prio = einsatzPrioritaeten[e.id] || 'normal';
                html += `<div class="spv-einsatz ${prio !== 'normal' ? 'spv-prio-' + prio : ''}">
                    <span class="spv-zeit">${e.zeitVon}-${e.zeitBis}</span>
                    <span class="spv-obj">${escapeHtml(e.objekt.substring(0, 15))}</span>
                    ${e.mitarbeiter ? '<span class="spv-ma">' + escapeHtml(e.mitarbeiter.split(' ').map(n => n[0]).join('')) + '</span>' : '<span class="spv-unbesetzt">?</span>'}
                </div>`;
            });
        }
        html += '</div>';
    });
    html += '</div>';

    // Zusammenfassung
    const gesamtE = tage.reduce((s, d) => s + einsaetze.filter(e => e.datum === d && e.status !== 'storniert').length, 0);
    const unbesetzt = tage.reduce((s, d) => s + einsaetze.filter(e => e.datum === d && e.status !== 'storniert' && !e.mitarbeiter).length, 0);
    html += `<div class="spv-summary">${gesamtE} Einsätze in 7 Tagen | ${unbesetzt} unbesetzt</div>`;

    el.innerHTML = html;
}

// =============================================
// ERWEITERTE STATISTIK-DASHBOARD
// =============================================
function renderErweiterteStatistik() {
    const el = document.getElementById('erwStatistikContent');
    if (!el) return;

    const aktiv = einsaetze.filter(e => e.status !== 'storniert');
    if (aktiv.length === 0) { el.innerHTML = '<p style="color:#a0aec0">Keine Einsatzdaten vorhanden.</p>'; return; }

    // Top-MA nach Stunden
    const maStunden = {};
    aktiv.forEach(e => {
        if (e.mitarbeiter) {
            if (!maStunden[e.mitarbeiter]) maStunden[e.mitarbeiter] = { stunden: 0, einsaetze: 0 };
            maStunden[e.mitarbeiter].stunden += e.stunden;
            maStunden[e.mitarbeiter].einsaetze++;
        }
    });
    const topMA = Object.entries(maStunden).sort((a, b) => b[1].stunden - a[1].stunden).slice(0, 5);

    // Ø Schichtdauer
    const avgSchicht = aktiv.reduce((s, e) => s + e.stunden, 0) / aktiv.length;

    // Auslastungsquote (aktive MA mit Einsatz diese Woche / Gesamt-MA)
    const heute = new Date().toISOString().split('T')[0];
    const vor7 = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const aktiveMa = new Set(aktiv.filter(e => e.datum >= vor7 && e.datum <= heute && e.mitarbeiter).map(e => e.mitarbeiter));
    const auslastung = mitarbeiterListe_.length > 0 ? (aktiveMa.size / mitarbeiterListe_.length * 100) : 0;

    // Stornierungsrate
    const storniertCount = einsaetze.filter(e => e.status === 'storniert').length;
    const stornierungsRate = einsaetze.length > 0 ? (storniertCount / einsaetze.length * 100) : 0;

    // Nacht-/Wochenend-Anteil
    const nachtEinsaetze = aktiv.filter(e => {
        const h = parseInt(e.zeitVon.split(':')[0]);
        return h < 6 || h >= 22;
    }).length;
    const nachtAnteil = aktiv.length > 0 ? (nachtEinsaetze / aktiv.length * 100) : 0;

    let html = '<div class="es-grid">';

    // KPI-Karten
    html += `<div class="es-card">
        <div class="es-card-label">Ø Schichtdauer</div>
        <div class="es-card-value">${formatZahl(avgSchicht)} Std.</div>
    </div>`;
    html += `<div class="es-card">
        <div class="es-card-label">MA-Auslastung (7 Tage)</div>
        <div class="es-card-value">${formatZahl(auslastung)}%</div>
    </div>`;
    html += `<div class="es-card">
        <div class="es-card-label">Stornierungsrate</div>
        <div class="es-card-value">${formatZahl(stornierungsRate)}%</div>
    </div>`;
    html += `<div class="es-card">
        <div class="es-card-label">Nacht-/Frühschicht-Anteil</div>
        <div class="es-card-value">${formatZahl(nachtAnteil)}%</div>
    </div>`;

    html += '</div>';

    // Top-MA Rangliste
    if (topMA.length > 0) {
        html += '<div class="es-top"><strong>Top-5 Mitarbeiter (Stunden):</strong>';
        topMA.forEach(([name, data], i) => {
            html += `<div class="es-top-item">
                <span class="es-top-rank">${i + 1}.</span>
                <span class="es-top-name">${escapeHtml(name)}</span>
                <span class="es-top-val">${formatZahl(data.stunden)} Std. (${data.einsaetze} Einsätze)</span>
            </div>`;
        });
        html += '</div>';
    }

    el.innerHTML = html;
}

// =============================================
// MA-ZERTIFIKATS-TRACKER
// =============================================
let maZertifikate = JSON.parse(localStorage.getItem('bbprotect_zertifikate') || '[]');

function zertifikatSpeichern() {
    const ma = document.getElementById('ztMA') ? document.getElementById('ztMA').value.trim() : '';
    const bezeichnung = document.getElementById('ztBezeichnung') ? document.getElementById('ztBezeichnung').value.trim() : '';
    const ablauf = document.getElementById('ztAblauf') ? document.getElementById('ztAblauf').value : '';

    if (!ma || !bezeichnung || !ablauf) { alert('Bitte alle Felder ausfüllen.'); return; }

    maZertifikate.push({ id: Date.now(), ma, bezeichnung, ablauf, erstellt: new Date().toISOString() });
    localStorage.setItem('bbprotect_zertifikate', JSON.stringify(maZertifikate));
    logAudit('erstellt', 'Zertifikat', `${ma}: ${bezeichnung} (bis ${formatDatum(ablauf)})`);

    if (document.getElementById('ztBezeichnung')) document.getElementById('ztBezeichnung').value = '';
    if (document.getElementById('ztAblauf')) document.getElementById('ztAblauf').value = '';
    renderZertifikateTracker();
}

function zertifikatLoeschen(id) {
    maZertifikate = maZertifikate.filter(z => z.id !== id);
    localStorage.setItem('bbprotect_zertifikate', JSON.stringify(maZertifikate));
    renderZertifikateTracker();
}

function renderZertifikateTracker() {
    const el = document.getElementById('zertifikateContent');
    if (!el) return;

    if (maZertifikate.length === 0) {
        el.innerHTML = '<p style="color:#a0aec0">Keine Zertifikate erfasst.</p>';
        return;
    }

    const heute = new Date().toISOString().split('T')[0];
    const sorted = maZertifikate.slice().sort((a, b) => a.ablauf.localeCompare(b.ablauf));

    let html = '<div class="zt-list">';
    sorted.forEach(z => {
        const restTage = Math.ceil((new Date(z.ablauf) - new Date(heute)) / 86400000);
        let cls = 'zt-ok';
        if (restTage < 0) cls = 'zt-abgelaufen';
        else if (restTage <= 30) cls = 'zt-kritisch';
        else if (restTage <= 90) cls = 'zt-warnung';

        html += `<div class="zt-item ${cls}">
            <div class="zt-info">
                <strong>${escapeHtml(z.ma)}</strong>
                <span>${escapeHtml(z.bezeichnung)}</span>
            </div>
            <div class="zt-ablauf">
                ${formatDatum(z.ablauf)}
                <span class="zt-rest">${restTage < 0 ? 'abgelaufen (' + Math.abs(restTage) + ' Tage)' : restTage + ' Tage'}</span>
            </div>
            <button class="btn-delete btn-small" onclick="zertifikatLoeschen(${z.id})" style="padding:0 0.3rem">&times;</button>
        </div>`;
    });
    html += '</div>';
    el.innerHTML = html;
}

// =============================================
// OBJEKT-VERTRAGSLAUFZEIT-BALKEN
// =============================================
function renderVertragslaufzeitBalken() {
    const el = document.getElementById('vertragslaufzeitContent');
    if (!el) return;

    const heute = new Date();
    const heuteStr = heute.toISOString().split('T')[0];
    const objekteMitVertrag = objekte.filter(o => o.vertragStart && o.vertragEnde);

    if (objekteMitVertrag.length === 0) {
        el.innerHTML = '<p style="color:#a0aec0">Keine Objekte mit Vertragsdaten vorhanden.</p>';
        return;
    }

    let html = '<div class="vl-list">';
    objekteMitVertrag.sort((a, b) => a.vertragEnde.localeCompare(b.vertragEnde)).forEach(o => {
        const start = new Date(o.vertragStart);
        const ende = new Date(o.vertragEnde);
        const gesamtTage = Math.max(1, (ende - start) / 86400000);
        const vergangen = Math.max(0, (heute - start) / 86400000);
        const pct = Math.min(100, (vergangen / gesamtTage) * 100);
        const restTage = Math.ceil((ende - heute) / 86400000);

        let cls = 'vl-ok';
        if (restTage < 0) cls = 'vl-abgelaufen';
        else if (restTage <= 30) cls = 'vl-kritisch';
        else if (restTage <= 90) cls = 'vl-warnung';

        html += `<div class="vl-item">
            <div class="vl-name">${escapeHtml(o.name)}</div>
            <div class="vl-bar-bg">
                <div class="vl-bar-fill ${cls}" style="width:${pct}%"></div>
            </div>
            <div class="vl-info">
                <span>${formatDatum(o.vertragStart)} – ${formatDatum(o.vertragEnde)}</span>
                <span class="vl-rest ${cls}">${restTage < 0 ? 'Abgelaufen' : restTage + ' Tage'}</span>
            </div>
        </div>`;
    });
    html += '</div>';
    el.innerHTML = html;
}

// =============================================
// TAGES-PERSONALÜBERSICHT
// =============================================
function renderTagesPersonal() {
    const el = document.getElementById('tagesPersonalContent');
    if (!el) return;

    const datum = document.getElementById('tpDatum') ? document.getElementById('tpDatum').value : new Date().toISOString().split('T')[0];
    if (!datum) return;

    const tagesEinsaetze = einsaetze.filter(e => e.datum === datum && e.status !== 'storniert');
    const arbeitende = new Set(tagesEinsaetze.filter(e => e.mitarbeiter).map(e => e.mitarbeiter));

    const abwesend = [];
    const frei = [];

    mitarbeiterListe_.forEach(m => {
        const abw = verfuegbarkeit.find(v => v.mitarbeiter === m.name && v.von <= datum && v.bis >= datum);
        if (abw) {
            abwesend.push({ name: m.name, grund: abw.grund || 'Abwesend' });
        } else if (!arbeitende.has(m.name)) {
            frei.push(m.name);
        }
    });

    const unbesetzt = tagesEinsaetze.filter(e => !e.mitarbeiter).length;

    let html = `<div class="tp-summary">
        <span class="tp-stat tp-arbeitet"><strong>${arbeitende.size}</strong> im Einsatz</span>
        <span class="tp-stat tp-frei"><strong>${frei.length}</strong> verfügbar</span>
        <span class="tp-stat tp-abwesend"><strong>${abwesend.length}</strong> abwesend</span>
        ${unbesetzt > 0 ? '<span class="tp-stat tp-unbesetzt"><strong>' + unbesetzt + '</strong> unbesetzt</span>' : ''}
    </div>`;

    html += '<div class="tp-grid">';

    // Arbeitende
    if (arbeitende.size > 0) {
        html += '<div class="tp-col"><div class="tp-col-header tp-arbeitet-h">Im Einsatz</div>';
        Array.from(arbeitende).sort().forEach(name => {
            const einsatz = tagesEinsaetze.find(e => e.mitarbeiter === name);
            html += `<div class="tp-person">${escapeHtml(name)} <span class="tp-detail">${einsatz ? einsatz.zeitVon + '-' + einsatz.zeitBis : ''}</span></div>`;
        });
        html += '</div>';
    }

    // Verfügbar
    if (frei.length > 0) {
        html += '<div class="tp-col"><div class="tp-col-header tp-frei-h">Verfügbar</div>';
        frei.sort().forEach(name => {
            html += `<div class="tp-person">${escapeHtml(name)}</div>`;
        });
        html += '</div>';
    }

    // Abwesend
    if (abwesend.length > 0) {
        html += '<div class="tp-col"><div class="tp-col-header tp-abw-h">Abwesend</div>';
        abwesend.sort((a, b) => a.name.localeCompare(b.name)).forEach(a => {
            html += `<div class="tp-person">${escapeHtml(a.name)} <span class="tp-detail">${escapeHtml(a.grund)}</span></div>`;
        });
        html += '</div>';
    }

    html += '</div>';
    el.innerHTML = html;
}

// =============================================
// PAUSENBERECHNUNG-INFO
// =============================================
function renderPausenInfo() {
    const el = document.getElementById('pausenInfoContent');
    if (!el) return;

    const zeitVon = document.getElementById('zeitVon') ? document.getElementById('zeitVon').value : '';
    const zeitBis = document.getElementById('zeitBis') ? document.getElementById('zeitBis').value : '';

    if (!zeitVon || !zeitBis) { el.innerHTML = ''; return; }

    const [vh, vm] = zeitVon.split(':').map(Number);
    const [bh, bm] = zeitBis.split(':').map(Number);
    let minuten = (bh * 60 + bm) - (vh * 60 + vm);
    if (minuten <= 0) minuten += 24 * 60;
    const stunden = minuten / 60;

    if (stunden <= 6) {
        el.innerHTML = '<span class="pi-ok">Keine Pflichtpause (Schicht ≤ 6 Std.)</span>';
    } else if (stunden <= 9) {
        el.innerHTML = '<span class="pi-pause">Pflichtpause: <strong>30 Min.</strong> (§4 ArbZG, Schicht > 6 Std.)</span>';
    } else {
        el.innerHTML = '<span class="pi-pause">Pflichtpause: <strong>45 Min.</strong> (§4 ArbZG, Schicht > 9 Std.)</span>';
    }
}

// =============================================
// EINSATZ-FARB-TAGS
// =============================================
let einsatzFarbTags = JSON.parse(localStorage.getItem('bbprotect_farbtags') || '{}');
const FARB_TAG_OPTIONEN = [
    { id: 'vip', label: 'VIP', farbe: '#805ad5' },
    { id: 'sonder', label: 'Sonderbewachung', farbe: '#e53e3e' },
    { id: 'routine', label: 'Routinedienst', farbe: '#4299e1' },
    { id: 'event', label: 'Event/Veranstaltung', farbe: '#38a169' },
    { id: 'nacht', label: 'Nachtdienst', farbe: '#2d3748' },
    { id: 'probe', label: 'Probezeit/Einarbeitung', farbe: '#d69e2e' }
];

function setzeEinsatzTag(einsatzId, tagId) {
    if (!einsatzFarbTags[einsatzId]) einsatzFarbTags[einsatzId] = [];
    const idx = einsatzFarbTags[einsatzId].indexOf(tagId);
    if (idx >= 0) einsatzFarbTags[einsatzId].splice(idx, 1);
    else einsatzFarbTags[einsatzId].push(tagId);
    if (einsatzFarbTags[einsatzId].length === 0) delete einsatzFarbTags[einsatzId];
    localStorage.setItem('bbprotect_farbtags', JSON.stringify(einsatzFarbTags));
    renderTabelle();
}

function renderEinsatzTagBadges(einsatzId) {
    const tags = einsatzFarbTags[einsatzId] || [];
    if (tags.length === 0) return '';
    return tags.map(t => {
        const opt = FARB_TAG_OPTIONEN.find(o => o.id === t);
        if (!opt) return '';
        return `<span class="ft-badge" style="background:${opt.farbe}" title="${opt.label}">${opt.label.substring(0, 3)}</span>`;
    }).join('');
}

function renderTagSelector(einsatzId) {
    const current = einsatzFarbTags[einsatzId] || [];
    return FARB_TAG_OPTIONEN.map(o =>
        `<label class="ft-option" style="border-color:${o.farbe}"><input type="checkbox" onchange="setzeEinsatzTag(${einsatzId},'${o.id}')" ${current.includes(o.id) ? 'checked' : ''}> <span style="color:${o.farbe}">${o.label}</span></label>`
    ).join('');
}

// =============================================
// MA-JAHRESARBEITSZEITKONTO
// =============================================
function renderJahresarbeitszeitkonto() {
    const el = document.getElementById('jahresAZKContent');
    if (!el) return;

    const jahr = parseInt(document.getElementById('jazkJahr') ? document.getElementById('jazkJahr').value : new Date().getFullYear());
    const maList = mitarbeiterListe_.filter(m => m.sollStunden > 0).sort((a, b) => a.name.localeCompare(b.name));

    if (maList.length === 0) { el.innerHTML = '<p style="color:#a0aec0">Keine MA mit Soll-Stunden definiert.</p>'; return; }

    let html = '<table class="jazk-table"><thead><tr><th>MA</th>';
    for (let m = 0; m < 12; m++) {
        html += `<th>${MONATSNAMEN[m].substring(0, 3)}</th>`;
    }
    html += '<th>Gesamt Soll</th><th>Gesamt Ist</th><th>Saldo</th></tr></thead><tbody>';

    maList.forEach(ma => {
        html += `<tr><td class="jazk-name">${escapeHtml(ma.name.split(' ').map(n => n.substring(0, 8)).join(' '))}</td>`;
        let gesamtIst = 0;
        for (let m = 1; m <= 12; m++) {
            const monatStr = `${jahr}-${String(m).padStart(2, '0')}`;
            const ist = einsaetze.filter(e => e.mitarbeiter === ma.name && e.datum.substring(0, 7) === monatStr && e.status !== 'storniert')
                .reduce((s, e) => s + e.stunden, 0);
            gesamtIst += ist;
            const diff = ist - ma.sollStunden;
            const cls = ist === 0 ? '' : diff >= 0 ? 'jazk-plus' : 'jazk-minus';
            html += `<td class="${cls}" title="Soll: ${formatZahl(ma.sollStunden)} | Ist: ${formatZahl(ist)}">${ist > 0 ? formatZahl(ist) : ''}</td>`;
        }
        const gesamtSoll = ma.sollStunden * 12;
        const saldo = gesamtIst - gesamtSoll;
        html += `<td>${formatZahl(gesamtSoll)}</td>`;
        html += `<td>${formatZahl(gesamtIst)}</td>`;
        html += `<td class="${saldo >= 0 ? 'jazk-plus' : 'jazk-minus'}"><strong>${saldo >= 0 ? '+' : ''}${formatZahl(saldo)}</strong></td>`;
        html += '</tr>';
    });

    html += '</tbody></table>';
    el.innerHTML = html;
}

// =============================================
// OBJEKT-ZUGANGSHINWEISE
// =============================================
let objektZugangshinweise = JSON.parse(localStorage.getItem('bbprotect_zugangshinweise') || '{}');

function zugangshinweisSpeichern() {
    const objekt = document.getElementById('zhObjekt') ? document.getElementById('zhObjekt').value : '';
    const schluessel = document.getElementById('zhSchluessel') ? document.getElementById('zhSchluessel').value.trim() : '';
    const code = document.getElementById('zhCode') ? document.getElementById('zhCode').value.trim() : '';
    const parkplatz = document.getElementById('zhParkplatz') ? document.getElementById('zhParkplatz').value.trim() : '';
    const notiz = document.getElementById('zhNotiz') ? document.getElementById('zhNotiz').value.trim() : '';

    if (!objekt) { alert('Bitte Objekt wählen.'); return; }

    objektZugangshinweise[objekt] = { schluessel, code, parkplatz, notiz, aktualisiert: new Date().toISOString() };
    localStorage.setItem('bbprotect_zugangshinweise', JSON.stringify(objektZugangshinweise));
    logAudit('bearbeitet', 'Zugangshinweise', objekt);
    renderZugangshinweise();
}

function renderZugangshinweise() {
    const el = document.getElementById('zugangshinweiseContent');
    if (!el) return;

    const objekt = document.getElementById('zhObjekt') ? document.getElementById('zhObjekt').value : '';
    if (!objekt) { el.innerHTML = '<p style="color:#a0aec0">Bitte Objekt wählen.</p>'; return; }

    const zh = objektZugangshinweise[objekt];
    if (!zh) { el.innerHTML = '<p style="color:#a0aec0">Keine Zugangshinweise vorhanden.</p>'; return; }

    // Felder befüllen
    if (document.getElementById('zhSchluessel')) document.getElementById('zhSchluessel').value = zh.schluessel || '';
    if (document.getElementById('zhCode')) document.getElementById('zhCode').value = zh.code || '';
    if (document.getElementById('zhParkplatz')) document.getElementById('zhParkplatz').value = zh.parkplatz || '';
    if (document.getElementById('zhNotiz')) document.getElementById('zhNotiz').value = zh.notiz || '';

    el.innerHTML = `<div class="zh-info">
        ${zh.schluessel ? '<div class="zh-row"><span class="zh-label">Schlüssel:</span> ' + escapeHtml(zh.schluessel) + '</div>' : ''}
        ${zh.code ? '<div class="zh-row"><span class="zh-label">Code/PIN:</span> ' + escapeHtml(zh.code) + '</div>' : ''}
        ${zh.parkplatz ? '<div class="zh-row"><span class="zh-label">Parkplatz:</span> ' + escapeHtml(zh.parkplatz) + '</div>' : ''}
        ${zh.notiz ? '<div class="zh-row"><span class="zh-label">Hinweis:</span> ' + escapeHtml(zh.notiz) + '</div>' : ''}
        <div class="zh-aktualisiert">Stand: ${new Date(zh.aktualisiert).toLocaleDateString('de-DE')}</div>
    </div>`;
}

function updateZugangshinweiseSelect() {
    const sel = document.getElementById('zhObjekt');
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = '<option value="">Objekt wählen...</option>';
    objekte.forEach(o => { sel.innerHTML += `<option value="${escapeHtml(o.name)}">${escapeHtml(o.name)}</option>`; });
    if (current) sel.value = current;
}

// =============================================
// DIENSTPLAN-PDF-GENERIERUNG (Druck)
// =============================================
function druckeDienstplanWoche() {
    const startDatum = document.getElementById('dpStartDatum') ? document.getElementById('dpStartDatum').value : '';
    if (!startDatum) { alert('Bitte Startdatum wählen.'); return; }

    const start = new Date(startDatum);
    // Zum Montag korrigieren
    const wt = start.getDay();
    const diff = wt === 0 ? -6 : 1 - wt;
    start.setDate(start.getDate() + diff);

    const tage = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        tage.push(d.toISOString().split('T')[0]);
    }

    const WT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    const einstName = einstellungen.firmenname || 'B.B. Protect';

    let html = `<div style="font-family:sans-serif;max-width:900px;margin:auto">
        <h2 style="margin-bottom:0.3rem">${escapeHtml(einstName)} - Wochendienstplan</h2>
        <p style="font-size:0.8rem;color:#666">KW ${getKW(start)} | ${formatDatum(tage[0])} – ${formatDatum(tage[6])}</p>
        <table style="width:100%;border-collapse:collapse;font-size:0.75rem;margin-top:0.5rem">
            <thead><tr style="background:#edf2f7">
                <th style="padding:0.4rem;border:1px solid #ccc;text-align:left">Tag</th>
                <th style="padding:0.4rem;border:1px solid #ccc">Objekt</th>
                <th style="padding:0.4rem;border:1px solid #ccc">MA</th>
                <th style="padding:0.4rem;border:1px solid #ccc">Zeiten</th>
                <th style="padding:0.4rem;border:1px solid #ccc">Std.</th>
            </tr></thead><tbody>`;

    tage.forEach((datum, i) => {
        const tagesE = einsaetze.filter(e => e.datum === datum && e.status !== 'storniert').sort((a, b) => a.zeitVon.localeCompare(b.zeitVon));
        const feiertag = typeof getFeiertage === 'function' ? getFeiertage(start.getFullYear())[datum] : null;

        if (tagesE.length === 0) {
            html += `<tr><td style="padding:0.3rem;border:1px solid #ccc;font-weight:600">${WT[i]} ${new Date(datum).getDate()}.${new Date(datum).getMonth() + 1}. ${feiertag ? '(' + feiertag + ')' : ''}</td><td colspan="4" style="padding:0.3rem;border:1px solid #ccc;color:#aaa;text-align:center">—</td></tr>`;
        } else {
            tagesE.forEach((e, j) => {
                html += `<tr>${j === 0 ? '<td style="padding:0.3rem;border:1px solid #ccc;font-weight:600" rowspan="' + tagesE.length + '">' + WT[i] + ' ' + new Date(datum).getDate() + '.' + (new Date(datum).getMonth() + 1) + '.' + (feiertag ? ' <span style="color:red;font-size:0.6rem">(' + feiertag + ')</span>' : '') + '</td>' : ''}
                    <td style="padding:0.3rem;border:1px solid #ccc">${escapeHtml(e.objekt)}</td>
                    <td style="padding:0.3rem;border:1px solid #ccc">${escapeHtml(e.mitarbeiter || '—')}</td>
                    <td style="padding:0.3rem;border:1px solid #ccc;text-align:center">${e.zeitVon}–${e.zeitBis}</td>
                    <td style="padding:0.3rem;border:1px solid #ccc;text-align:right">${formatZahl(e.stunden)}</td>
                </tr>`;
            });
        }
    });

    const totalStd = tage.reduce((s, d) => s + einsaetze.filter(e => e.datum === d && e.status !== 'storniert').reduce((ss, e) => ss + e.stunden, 0), 0);
    html += `<tr style="background:#edf2f7;font-weight:700"><td colspan="4" style="padding:0.3rem;border:1px solid #ccc;text-align:right">Gesamt:</td><td style="padding:0.3rem;border:1px solid #ccc;text-align:right">${formatZahl(totalStd)}</td></tr>`;
    html += '</tbody></table>';
    html += `<p style="margin-top:1rem;font-size:0.65rem;color:#999">Erstellt: ${new Date().toLocaleDateString('de-DE')}</p></div>`;

    document.getElementById('printArea').innerHTML = html;
    window.print();
}

function getKW(d) {
    const date = new Date(d);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    const week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

// =============================================
// QUICK-STATS-LEISTE
// =============================================
function renderQuickStats() {
    const el = document.getElementById('quickStatsLeiste');
    if (!el) return;

    const heute = new Date().toISOString().split('T')[0];
    const heuteE = einsaetze.filter(e => e.datum === heute && e.status !== 'storniert');
    const heuteStd = heuteE.reduce((s, e) => s + e.stunden, 0);
    const heuteUmsatz = heuteE.reduce((s, e) => s + e.gesamt, 0);
    const aktiveMA = new Set(heuteE.filter(e => e.mitarbeiter).map(e => e.mitarbeiter)).size;
    const morgen = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const morgenE = einsaetze.filter(e => e.datum === morgen && e.status !== 'storniert').length;

    el.innerHTML = `<div class="qs-leiste">
        <span class="qs-item">Heute: <strong>${heuteE.length}</strong> Einsätze</span>
        <span class="qs-item"><strong>${formatZahl(heuteStd)}</strong> Std.</span>
        <span class="qs-item"><strong>${formatEuro(heuteUmsatz)}</strong></span>
        <span class="qs-item"><strong>${aktiveMA}</strong> MA aktiv</span>
        <span class="qs-item">Morgen: <strong>${morgenE}</strong></span>
    </div>`;
}

// =============================================
// EINSATZ-GPS/STANDORT
// =============================================
function renderStandortInfo(einsatzId) {
    const e = einsaetze.find(x => x.id === einsatzId);
    if (!e) return '';
    // Standort aus Objekt holen
    const obj = objekte.find(o => o.name === e.objekt);
    if (obj && obj.adresse) {
        return `<span class="gps-badge" title="Standort: ${escapeHtml(obj.adresse)}">📍</span>`;
    }
    return '';
}

// =============================================
// MA-ÜBERSTUNDEN-WARNUNG (§3 ArbZG)
// =============================================
function renderUeberstundenWarnung() {
    const el = document.getElementById('ueberstundenWarnungContent');
    if (!el) return;

    const heute = new Date();
    const vor7 = new Date(heute);
    vor7.setDate(vor7.getDate() - 6);

    const warnungen = [];
    mitarbeiterListe_.forEach(ma => {
        // Letzte 7 Tage
        let wochenStd = 0;
        for (let i = 0; i < 7; i++) {
            const d = new Date(vor7);
            d.setDate(d.getDate() + i);
            const datum = d.toISOString().split('T')[0];
            const tagesStd = einsaetze.filter(e => e.mitarbeiter === ma.name && e.datum === datum && e.status !== 'storniert')
                .reduce((s, e) => s + e.stunden, 0);

            // §3 ArbZG: max 10h/Tag
            if (tagesStd > 10) {
                warnungen.push({ ma: ma.name, typ: 'tag', datum, stunden: tagesStd, text: `${formatZahl(tagesStd)} Std. am ${formatDatum(datum)} (max. 10h §3 ArbZG)` });
            }
            wochenStd += tagesStd;
        }

        // §3 ArbZG: max 48h/Woche (im Schnitt)
        if (wochenStd > 48) {
            warnungen.push({ ma: ma.name, typ: 'woche', stunden: wochenStd, text: `${formatZahl(wochenStd)} Std./Woche (max. 48h §3 ArbZG)` });
        }
    });

    if (warnungen.length === 0) {
        el.innerHTML = '<p style="color:#48bb78;font-size:0.8rem">Keine Überstunden-Verstöße in den letzten 7 Tagen.</p>';
        return;
    }

    let html = `<div class="uw-banner">${warnungen.length} Warnung(en)</div>`;
    warnungen.forEach(w => {
        html += `<div class="uw-item uw-${w.typ}">
            <strong>${escapeHtml(w.ma)}</strong>: ${escapeHtml(w.text)}
        </div>`;
    });
    el.innerHTML = html;
}

// =============================================
// OBJEKT-BEWERTUNG (1-5 Sterne)
// =============================================
let objektBewertungen = JSON.parse(localStorage.getItem('bbprotect_objektbewertungen') || '{}');

function objektBewertenSpeichern() {
    const objekt = document.getElementById('obObjekt') ? document.getElementById('obObjekt').value : '';
    const sterne = parseInt(document.getElementById('obSterne') ? document.getElementById('obSterne').value : 0);
    const kommentar = document.getElementById('obKommentar') ? document.getElementById('obKommentar').value.trim() : '';

    if (!objekt || !sterne) { alert('Bitte Objekt und Bewertung auswählen.'); return; }

    if (!objektBewertungen[objekt]) objektBewertungen[objekt] = [];
    objektBewertungen[objekt].push({ sterne, kommentar, datum: new Date().toISOString() });
    localStorage.setItem('bbprotect_objektbewertungen', JSON.stringify(objektBewertungen));

    if (document.getElementById('obKommentar')) document.getElementById('obKommentar').value = '';
    renderObjektBewertungen();
}

function renderObjektBewertungen() {
    const el = document.getElementById('objektBewertungenContent');
    if (!el) return;

    const entries = Object.entries(objektBewertungen).filter(([, bew]) => bew.length > 0);
    if (entries.length === 0) { el.innerHTML = '<p style="color:#a0aec0">Keine Bewertungen vorhanden.</p>'; return; }

    let html = '<div class="ob-list">';
    entries.sort((a, b) => {
        const avgA = a[1].reduce((s, b2) => s + b2.sterne, 0) / a[1].length;
        const avgB = b[1].reduce((s, b2) => s + b2.sterne, 0) / b[1].length;
        return avgB - avgA;
    }).forEach(([objekt, bew]) => {
        const avg = bew.reduce((s, b2) => s + b2.sterne, 0) / bew.length;
        const stars = '★'.repeat(Math.round(avg)) + '☆'.repeat(5 - Math.round(avg));
        html += `<div class="ob-item">
            <div class="ob-name">${escapeHtml(objekt)}</div>
            <div class="ob-stars">${stars} <span class="ob-avg">${formatZahl(avg)}/5</span></div>
            <div class="ob-count">${bew.length} Bewertung(en)</div>
        </div>`;
    });
    html += '</div>';
    el.innerHTML = html;
}

function updateObjektBewertungSelect() {
    const sel = document.getElementById('obObjekt');
    if (!sel) return;
    sel.innerHTML = '<option value="">Objekt wählen...</option>';
    objekte.forEach(o => { sel.innerHTML += `<option value="${escapeHtml(o.name)}">${escapeHtml(o.name)}</option>`; });
}

// =============================================
// EINSATZ-DAUER-STATISTIK (Histogramm)
// =============================================
function renderDauerStatistik() {
    const el = document.getElementById('dauerStatistikContent');
    if (!el) return;

    const buckets = { '0-2': 0, '2-4': 0, '4-6': 0, '6-8': 0, '8-10': 0, '10-12': 0, '12+': 0 };

    einsaetze.forEach(e => {
        const std = e.stunden || 0;
        if (std <= 2) buckets['0-2']++;
        else if (std <= 4) buckets['2-4']++;
        else if (std <= 6) buckets['4-6']++;
        else if (std <= 8) buckets['6-8']++;
        else if (std <= 10) buckets['8-10']++;
        else if (std <= 12) buckets['10-12']++;
        else buckets['12+']++;
    });

    const maxVal = Math.max(...Object.values(buckets), 1);

    let html = '<div class="ds-chart">';
    Object.entries(buckets).forEach(([label, count]) => {
        const pct = (count / maxVal) * 100;
        html += `<div class="ds-bar-col">
            <span class="ds-count">${count}</span>
            <div class="ds-bar" style="height:${Math.max(pct, 2)}%"></div>
            <span class="ds-label">${label}h</span>
        </div>`;
    });
    html += '</div>';

    const totalEinsaetze = einsaetze.length;
    const totalStd = einsaetze.reduce((s, e) => s + (e.stunden || 0), 0);
    const avgDauer = totalEinsaetze > 0 ? (totalStd / totalEinsaetze).toFixed(1) : '0.0';

    html += `<div class="ds-info">Ø Dauer: <strong>${avgDauer} Std.</strong> | ${totalEinsaetze} Einsätze gesamt</div>`;
    el.innerHTML = html;
}

// =============================================
// MA-EINSATZ-HEATMAP (Wochentag x Stunde)
// =============================================
function renderMAEinsatzHeatmap() {
    const el = document.getElementById('maHeatmapContent');
    if (!el) return;

    const tage = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    const stundenBloecke = ['00-06', '06-12', '12-18', '18-24'];

    // Matrix: [wochentag][stundenblock] = Anzahl
    const matrix = Array.from({ length: 7 }, () => Array(4).fill(0));

    einsaetze.forEach(e => {
        if (!e.datum || !e.zeitVon) return;
        const d = new Date(e.datum);
        let wt = d.getDay() - 1;
        if (wt < 0) wt = 6; // Sonntag → 6
        const h = parseInt(e.zeitVon.split(':')[0]) || 0;
        const block = Math.min(Math.floor(h / 6), 3);
        matrix[wt][block]++;
    });

    const maxVal = Math.max(...matrix.flat(), 1);

    let html = '<table class="hm-table"><thead><tr><th></th>';
    stundenBloecke.forEach(sb => { html += `<th>${sb}</th>`; });
    html += '</tr></thead><tbody>';

    tage.forEach((tag, ti) => {
        html += `<tr><td class="hm-tag">${tag}</td>`;
        for (let si = 0; si < 4; si++) {
            const val = matrix[ti][si];
            const intensity = val / maxVal;
            const bg = intensity > 0 ? `rgba(66,153,225,${0.15 + intensity * 0.85})` : 'transparent';
            const color = intensity > 0.5 ? '#fff' : '#4a5568';
            html += `<td class="hm-cell" style="background:${bg};color:${color}">${val || ''}</td>`;
        }
        html += '</tr>';
    });
    html += '</tbody></table>';
    el.innerHTML = html;
}

// =============================================
// OBJEKT-NOTFALL-KONTAKTLISTE
// =============================================
let objektNotfallKontakte = JSON.parse(localStorage.getItem('bbprotect_objektnotfall') || '{}');

function objektNotfallSpeichern() {
    const objekt = document.getElementById('onfObjekt').value;
    const typ = document.getElementById('onfTyp').value;
    const name = document.getElementById('onfName').value.trim();
    const telefon = document.getElementById('onfTelefon').value.trim();

    if (!objekt || !name || !telefon) { alert('Bitte Objekt, Name und Telefon ausfüllen.'); return; }

    if (!objektNotfallKontakte[objekt]) objektNotfallKontakte[objekt] = [];
    objektNotfallKontakte[objekt].push({ typ, name, telefon, datum: new Date().toISOString() });
    localStorage.setItem('bbprotect_objektnotfall', JSON.stringify(objektNotfallKontakte));

    document.getElementById('onfName').value = '';
    document.getElementById('onfTelefon').value = '';
    renderObjektNotfallKontakte();
}

function loescheObjektNotfall(objekt, idx) {
    if (!confirm('Notfallkontakt löschen?')) return;
    objektNotfallKontakte[objekt].splice(idx, 1);
    if (objektNotfallKontakte[objekt].length === 0) delete objektNotfallKontakte[objekt];
    localStorage.setItem('bbprotect_objektnotfall', JSON.stringify(objektNotfallKontakte));
    renderObjektNotfallKontakte();
}

function renderObjektNotfallKontakte() {
    const el = document.getElementById('objektNotfallContent');
    if (!el) return;

    const objekt = document.getElementById('onfFilterObjekt') ? document.getElementById('onfFilterObjekt').value : '';
    const typIcons = { polizei: '🚔', feuerwehr: '🚒', rettung: '🚑', hausmeister: '🔧', verwaltung: '🏢', sonstige: '📞' };
    const typLabels = { polizei: 'Polizei', feuerwehr: 'Feuerwehr', rettung: 'Rettungsdienst', hausmeister: 'Hausmeister', verwaltung: 'Verwaltung', sonstige: 'Sonstige' };

    let kontakte = [];
    Object.entries(objektNotfallKontakte).forEach(([obj, liste]) => {
        if (objekt && obj !== objekt) return;
        liste.forEach((k, idx) => kontakte.push({ ...k, objekt: obj, idx }));
    });

    if (kontakte.length === 0) {
        el.innerHTML = '<span style="color:#a0aec0;font-size:0.8rem">Keine Notfallkontakte hinterlegt.</span>';
        return;
    }

    let html = '<div class="onf-list">';
    kontakte.forEach(k => {
        html += `<div class="onf-item">
            <span class="onf-icon">${typIcons[k.typ] || '📞'}</span>
            <div class="onf-info">
                <strong>${escapeHtml(k.name)}</strong>
                <span class="onf-typ">${typLabels[k.typ] || k.typ}</span>
                <span class="onf-obj">${escapeHtml(k.objekt)}</span>
            </div>
            <a href="tel:${escapeHtml(k.telefon)}" class="onf-tel">${escapeHtml(k.telefon)}</a>
            <button class="btn-delete btn-small" onclick="loescheObjektNotfall('${escapeHtml(k.objekt)}',${k.idx})">X</button>
        </div>`;
    });
    html += '</div>';
    el.innerHTML = html;
}

function updateObjektNotfallSelects() {
    ['onfObjekt', 'onfFilterObjekt'].forEach(id => {
        const sel = document.getElementById(id);
        if (!sel) return;
        const val = sel.value;
        const firstOpt = id === 'onfFilterObjekt' ? '<option value="">Alle Objekte</option>' : '<option value="">Objekt wählen...</option>';
        sel.innerHTML = firstOpt + objekte.map(o => `<option value="${escapeHtml(o.name)}">${escapeHtml(o.name)}</option>`).join('');
        sel.value = val;
    });
}

// =============================================
// SCHICHT-TAGESPROTOKOLL (druckbar)
// =============================================
function renderTagesprotokoll() {
    const el = document.getElementById('tagesprotokollContent');
    if (!el) return;

    const datum = document.getElementById('tprtDatum') ? document.getElementById('tprtDatum').value : '';
    if (!datum) { el.innerHTML = '<span style="color:#a0aec0;font-size:0.8rem">Datum wählen</span>'; return; }

    const tagesEinsaetze = einsaetze.filter(e => e.datum === datum);
    const tagesWachbuch = wachbuch.filter(w => w.datum === datum);
    const tagesVorfaelle = vorfaelle.filter(v => v.datum === datum);

    const feiertage = typeof getFeiertage === 'function' ? getFeiertage(parseInt(datum.substring(0, 4))) : {};
    const istFeiertag = feiertage[datum];
    const wochentag = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'][new Date(datum).getDay()];

    let html = '<div class="tprt-proto">';
    html += `<div class="tprt-header"><strong>Tagesprotokoll ${formatDatum(datum)}</strong> (${wochentag}${istFeiertag ? ' — ' + istFeiertag : ''})</div>`;

    html += '<div class="tprt-section"><strong>Einsätze (' + tagesEinsaetze.length + ')</strong>';
    if (tagesEinsaetze.length === 0) {
        html += '<p class="tprt-empty">Keine Einsätze</p>';
    } else {
        tagesEinsaetze.sort((a, b) => (a.zeitVon || '').localeCompare(b.zeitVon || '')).forEach(e => {
            html += `<div class="tprt-row">${e.zeitVon || '?'} - ${e.zeitBis || '?'} | ${escapeHtml(e.objekt)} | ${escapeHtml(e.mitarbeiter || '—')} | ${formatZahl(e.stunden)} Std.</div>`;
        });
    }
    html += '</div>';

    html += '<div class="tprt-section"><strong>Wachbuch (' + tagesWachbuch.length + ')</strong>';
    if (tagesWachbuch.length === 0) {
        html += '<p class="tprt-empty">Keine Einträge</p>';
    } else {
        tagesWachbuch.forEach(w => {
            html += `<div class="tprt-row">${w.zeit || '?'} | ${escapeHtml(w.objekt)} | ${escapeHtml(w.kategorie)} | ${escapeHtml(w.eintrag ? w.eintrag.substring(0, 80) : '—')}</div>`;
        });
    }
    html += '</div>';

    html += '<div class="tprt-section"><strong>Vorfälle (' + tagesVorfaelle.length + ')</strong>';
    if (tagesVorfaelle.length === 0) {
        html += '<p class="tprt-empty">Keine Vorfälle</p>';
    } else {
        tagesVorfaelle.forEach(v => {
            html += `<div class="tprt-row tprt-vorfall">${v.zeit || '?'} | ${escapeHtml(v.objekt)} | ${escapeHtml(v.typ)} (${v.schwere}) | ${escapeHtml(v.beschreibung ? v.beschreibung.substring(0, 60) : '—')}</div>`;
        });
    }
    html += '</div>';
    html += '</div>';

    el.innerHTML = html;
}

function druckeTagesprotokoll() {
    const datum = document.getElementById('tprtDatum') ? document.getElementById('tprtDatum').value : '';
    if (!datum) { alert('Bitte Datum wählen.'); return; }

    const content = document.getElementById('tagesprotokollContent');
    if (!content) return;

    const printArea = document.getElementById('printArea');
    printArea.innerHTML = `<h2>B.B. Protect — Tagesprotokoll ${formatDatum(datum)}</h2>` + content.innerHTML;
    printArea.style.display = 'block';
    document.body.classList.add('print-mode');
    window.print();
    document.body.classList.remove('print-mode');
    printArea.style.display = 'none';
}

// =============================================
// EINSATZ-WIEDERHOLUNGS-STATISTIK
// =============================================
function renderWiederholungsStatistik() {
    const el = document.getElementById('wiederholungsStatContent');
    if (!el) return;

    // Gruppiere nach Objekt+ZeitVon+ZeitBis
    const muster = {};
    einsaetze.forEach(e => {
        if (!e.objekt || !e.zeitVon || !e.zeitBis) return;
        const key = `${e.objekt}|${e.zeitVon}-${e.zeitBis}`;
        if (!muster[key]) muster[key] = { objekt: e.objekt, zeit: `${e.zeitVon}-${e.zeitBis}`, count: 0 };
        muster[key].count++;
    });

    const sorted = Object.values(muster).filter(m => m.count > 1).sort((a, b) => b.count - a.count);

    if (sorted.length === 0) {
        el.innerHTML = '<span style="color:#a0aec0;font-size:0.8rem">Keine wiederkehrenden Schichtmuster erkannt.</span>';
        return;
    }

    let html = '<div class="ws-list">';
    sorted.slice(0, 10).forEach((m, i) => {
        html += `<div class="ws-row">
            <span class="ws-rank">#${i + 1}</span>
            <span class="ws-obj">${escapeHtml(m.objekt)}</span>
            <span class="ws-zeit">${m.zeit}</span>
            <span class="ws-count">${m.count}x</span>
        </div>`;
    });
    html += '</div>';
    el.innerHTML = html;
}

// =============================================
// MA-ARBEITSTAGE-STREAK
// =============================================
function renderMAStreaks() {
    const el = document.getElementById('maStreaksContent');
    if (!el) return;

    const maDateMap = {};
    einsaetze.forEach(e => {
        if (!e.mitarbeiter || !e.datum || e.status === 'storniert') return;
        if (!maDateMap[e.mitarbeiter]) maDateMap[e.mitarbeiter] = new Set();
        maDateMap[e.mitarbeiter].add(e.datum);
    });

    const streaks = Object.entries(maDateMap).map(([ma, daten]) => {
        const sorted = [...daten].sort();
        let maxStreak = 1, currentStreak = 1, streakStart = sorted[0], maxStart = sorted[0];

        for (let i = 1; i < sorted.length; i++) {
            const prev = new Date(sorted[i - 1]);
            const curr = new Date(sorted[i]);
            const diff = (curr - prev) / 86400000;

            if (diff === 1) {
                currentStreak++;
                if (currentStreak > maxStreak) {
                    maxStreak = currentStreak;
                    maxStart = streakStart;
                }
            } else {
                currentStreak = 1;
                streakStart = sorted[i];
            }
        }

        return { ma, maxStreak, startDatum: maxStart, totalTage: sorted.length };
    }).sort((a, b) => b.maxStreak - a.maxStreak);

    if (streaks.length === 0) {
        el.innerHTML = '<span style="color:#a0aec0;font-size:0.8rem">Keine Daten vorhanden.</span>';
        return;
    }

    let html = '<div class="ms-list">';
    streaks.slice(0, 10).forEach(s => {
        const warnCls = s.maxStreak > 6 ? ' ms-warn' : s.maxStreak > 12 ? ' ms-critical' : '';
        html += `<div class="ms-row${warnCls}">
            <span class="ms-ma">${escapeHtml(s.ma)}</span>
            <span class="ms-streak">${s.maxStreak} Tage</span>
            <span class="ms-start">ab ${formatDatum(s.startDatum)}</span>
            <span class="ms-total">${s.totalTage} Arbeitstage ges.</span>
        </div>`;
    });
    html += '</div>';
    if (streaks.some(s => s.maxStreak > 6)) {
        html += '<div style="font-size:0.65rem;color:#e53e3e;margin-top:0.3rem">⚠️ Streaks > 6 Tage können auf fehlende Ruhetage hinweisen (§9 ArbZG)</div>';
    }
    el.innerHTML = html;
}

// =============================================
// OBJEKT-STATUSAMPEL
// =============================================
function renderObjektStatusampel() {
    const el = document.getElementById('objektAmpelContent');
    if (!el) return;

    if (objekte.length === 0) {
        el.innerHTML = '<span style="color:#a0aec0;font-size:0.8rem">Keine Objekte vorhanden.</span>';
        return;
    }

    const heute = new Date().toISOString().split('T')[0];
    const vor7 = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const vor30 = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

    const ampeln = objekte.map(o => {
        const objEinsaetze = einsaetze.filter(e => e.objekt === o.name && e.datum >= vor7 && e.status !== 'storniert');
        const objVorfaelle = vorfaelle.filter(v => v.objekt === o.name && v.datum >= vor30);
        const kritischeVorfaelle = objVorfaelle.filter(v => v.schwere === 'kritisch' || v.schwere === 'hoch');

        let status = 'gruen';
        let grund = 'OK';

        if (kritischeVorfaelle.length > 0) {
            status = 'rot';
            grund = `${kritischeVorfaelle.length} kritische Vorfälle (30 Tage)`;
        } else if (objEinsaetze.length === 0) {
            status = 'gelb';
            grund = 'Keine Einsätze in letzten 7 Tagen';
        } else if (objVorfaelle.length > 2) {
            status = 'gelb';
            grund = `${objVorfaelle.length} Vorfälle (30 Tage)`;
        }

        return { name: o.name, status, grund, einsaetze7: objEinsaetze.length, vorfaelle30: objVorfaelle.length };
    });

    ampeln.sort((a, b) => {
        const order = { rot: 0, gelb: 1, gruen: 2 };
        return (order[a.status] || 3) - (order[b.status] || 3);
    });

    const statusIcons = { gruen: '🟢', gelb: '🟡', rot: '🔴' };

    let html = '<div class="oa-list">';
    ampeln.forEach(a => {
        html += `<div class="oa-row oa-${a.status}">
            <span class="oa-icon">${statusIcons[a.status]}</span>
            <span class="oa-name">${escapeHtml(a.name)}</span>
            <span class="oa-grund">${escapeHtml(a.grund)}</span>
            <span class="oa-stats">${a.einsaetze7} Eins./7T | ${a.vorfaelle30} Vorf./30T</span>
        </div>`;
    });
    html += '</div>';
    el.innerHTML = html;
}

// =============================================
// EINSATZ-DUPLIKAT-FINDER
// =============================================
function renderDuplikatFinder() {
    const el = document.getElementById('duplikatFinderContent');
    if (!el) return;

    const duplikate = [];
    for (let i = 0; i < einsaetze.length; i++) {
        for (let j = i + 1; j < einsaetze.length; j++) {
            const a = einsaetze[i];
            const b = einsaetze[j];
            if (a.datum === b.datum && a.mitarbeiter === b.mitarbeiter && a.objekt === b.objekt && a.zeitVon === b.zeitVon && a.zeitBis === b.zeitBis) {
                duplikate.push({ a, b, idxA: i, idxB: j });
            }
        }
    }

    if (duplikate.length === 0) {
        el.innerHTML = '<span style="color:#38a169;font-size:0.8rem">✅ Keine Duplikate gefunden.</span>';
        return;
    }

    let html = `<div class="df-warn">⚠️ ${duplikate.length} potenzielle Duplikat(e) gefunden!</div>`;
    html += '<div class="df-list">';
    duplikate.slice(0, 10).forEach(d => {
        html += `<div class="df-row">
            <span class="df-date">${formatDatum(d.a.datum)}</span>
            <span class="df-info">${escapeHtml(d.a.mitarbeiter || '—')} @ ${escapeHtml(d.a.objekt)} ${d.a.zeitVon}-${d.a.zeitBis}</span>
        </div>`;
    });
    html += '</div>';
    el.innerHTML = html;
}

// =============================================
// SCHNELL-NOTIZ (Sticky)
// =============================================
function schnellNotizSpeichern() {
    const text = document.getElementById('schnellNotizText') ? document.getElementById('schnellNotizText').value.trim() : '';
    localStorage.setItem('bbprotect_schnellnotiz', text);
    renderSchnellNotiz();
}

function renderSchnellNotiz() {
    const el = document.getElementById('schnellNotizAnzeige');
    if (!el) return;
    const text = localStorage.getItem('bbprotect_schnellnotiz') || '';
    if (text) {
        el.innerHTML = `<div class="sn-sticky">📌 ${escapeHtml(text)} <button class="btn-delete btn-small" onclick="localStorage.removeItem('bbprotect_schnellnotiz');renderSchnellNotiz();" style="margin-left:0.5rem;font-size:0.6rem">X</button></div>`;
        el.style.display = 'block';
    } else {
        el.style.display = 'none';
        el.innerHTML = '';
    }
}

// =============================================
// EINSATZ-KOSTEN-SPLIT
// =============================================
function renderKostenSplit() {
    const el = document.getElementById('kostenSplitContent');
    if (!el) return;

    const monat = document.getElementById('ksSplitMonat') ? document.getElementById('ksSplitMonat').value : '';

    const filtered = monat ? einsaetze.filter(e => e.datum && e.datum.startsWith(monat) && e.status !== 'storniert') : einsaetze.filter(e => e.status !== 'storniert');

    if (filtered.length === 0) {
        el.innerHTML = '<span style="color:#a0aec0;font-size:0.8rem">Keine Einsätze im gewählten Zeitraum.</span>';
        return;
    }

    let grundlohn = 0, nachtZuschlag = 0, sonntagZuschlag = 0, feiertagZuschlag = 0;

    filtered.forEach(e => {
        const basis = (e.stunden || 0) * (e.stundensatz || 0);
        grundlohn += basis;
        nachtZuschlag += (e.zuschlagNacht || 0);
        sonntagZuschlag += (e.zuschlagSonntag || 0);
        feiertagZuschlag += (e.zuschlagFeiertag || 0);
    });

    const gesamt = grundlohn + nachtZuschlag + sonntagZuschlag + feiertagZuschlag;
    const maxVal = Math.max(grundlohn, nachtZuschlag, sonntagZuschlag, feiertagZuschlag, 1);

    const categories = [
        { label: 'Grundlohn', val: grundlohn, color: '#4299e1' },
        { label: 'Nachtzuschlag (25%)', val: nachtZuschlag, color: '#805ad5' },
        { label: 'Sonntagszuschlag (50%)', val: sonntagZuschlag, color: '#d69e2e' },
        { label: 'Feiertagszuschlag (100%)', val: feiertagZuschlag, color: '#e53e3e' }
    ];

    let html = '<div class="ks-bars">';
    categories.forEach(c => {
        const pct = (c.val / maxVal) * 100;
        const anteil = gesamt > 0 ? ((c.val / gesamt) * 100).toFixed(1) : '0.0';
        html += `<div class="ks-row">
            <span class="ks-label">${c.label}</span>
            <div class="ks-bar-bg"><div class="ks-bar-fill" style="width:${pct}%;background:${c.color}"></div></div>
            <span class="ks-val">${formatWaehrung(c.val)} (${anteil}%)</span>
        </div>`;
    });
    html += '</div>';
    html += `<div class="ks-total">Gesamt: <strong>${formatWaehrung(gesamt)}</strong> | ${filtered.length} Einsätze</div>`;
    el.innerHTML = html;
}

// =============================================
// MA-SCHICHT-PRÄFERENZEN
// =============================================
let maSchichtPraef = JSON.parse(localStorage.getItem('bbprotect_schichtpraef') || '{}');

function schichtPraefSpeichern() {
    const ma = document.getElementById('spMA') ? document.getElementById('spMA').value.trim() : '';
    const praef = document.getElementById('spPraeferenz') ? document.getElementById('spPraeferenz').value : '';
    const notiz = document.getElementById('spNotiz') ? document.getElementById('spNotiz').value.trim() : '';

    if (!ma) { alert('Bitte Mitarbeiter angeben.'); return; }

    maSchichtPraef[ma] = { praeferenz: praef, notiz, datum: new Date().toISOString() };
    localStorage.setItem('bbprotect_schichtpraef', JSON.stringify(maSchichtPraef));
    renderSchichtPraeferenzen();
}

function renderSchichtPraeferenzen() {
    const el = document.getElementById('schichtPraefContent');
    if (!el) return;

    const praefIcons = { frueh: '🌅 Frühschicht', spaet: '🌇 Spätschicht', nacht: '🌙 Nachtschicht', flexibel: '🔄 Flexibel', wochenende: '📅 Wochenende' };

    const entries = Object.entries(maSchichtPraef);
    if (entries.length === 0) {
        el.innerHTML = '<span style="color:#a0aec0;font-size:0.8rem">Keine Präferenzen hinterlegt.</span>';
        return;
    }

    let html = '<div class="sp-list">';
    entries.sort((a, b) => a[0].localeCompare(b[0])).forEach(([ma, p]) => {
        html += `<div class="sp-row">
            <span class="sp-ma">${escapeHtml(ma)}</span>
            <span class="sp-praef">${praefIcons[p.praeferenz] || p.praeferenz}</span>
            <span class="sp-notiz">${escapeHtml(p.notiz || '—')}</span>
            <button class="btn-delete btn-small" onclick="delete maSchichtPraef['${escapeHtml(ma)}'];localStorage.setItem('bbprotect_schichtpraef',JSON.stringify(maSchichtPraef));renderSchichtPraeferenzen();">X</button>
        </div>`;
    });
    html += '</div>';
    el.innerHTML = html;
}

// =============================================
// OBJEKT-DOKUMENTEN-ABLAGE
// =============================================
let objektDokumente = JSON.parse(localStorage.getItem('bbprotect_objektdokumente') || '{}');

function objektDokumentSpeichern() {
    const objekt = document.getElementById('odObjekt') ? document.getElementById('odObjekt').value : '';
    const bezeichnung = document.getElementById('odBezeichnung') ? document.getElementById('odBezeichnung').value.trim() : '';
    const typ = document.getElementById('odTyp') ? document.getElementById('odTyp').value : '';
    const notiz = document.getElementById('odNotiz') ? document.getElementById('odNotiz').value.trim() : '';

    if (!objekt || !bezeichnung) { alert('Bitte Objekt und Bezeichnung angeben.'); return; }

    if (!objektDokumente[objekt]) objektDokumente[objekt] = [];
    objektDokumente[objekt].push({ bezeichnung, typ, notiz, datum: new Date().toISOString() });
    localStorage.setItem('bbprotect_objektdokumente', JSON.stringify(objektDokumente));

    document.getElementById('odBezeichnung').value = '';
    document.getElementById('odNotiz').value = '';
    renderObjektDokumenteAblage();
}

function loescheObjektDokument(objekt, idx) {
    if (!confirm('Dokument-Referenz löschen?')) return;
    objektDokumente[objekt].splice(idx, 1);
    if (objektDokumente[objekt].length === 0) delete objektDokumente[objekt];
    localStorage.setItem('bbprotect_objektdokumente', JSON.stringify(objektDokumente));
    renderObjektDokumenteAblage();
}

function renderObjektDokumenteAblage() {
    const el = document.getElementById('objektDokAblageContent');
    if (!el) return;

    const objekt = document.getElementById('odFilterObjekt') ? document.getElementById('odFilterObjekt').value : '';
    const typIcons = { vertrag: '📄', grundriss: '🗺️', anweisung: '📋', genehmigung: '✅', sonstiges: '📎' };

    let alle = [];
    Object.entries(objektDokumente).forEach(([obj, liste]) => {
        if (objekt && obj !== objekt) return;
        liste.forEach((d, idx) => alle.push({ ...d, objekt: obj, idx }));
    });

    if (alle.length === 0) {
        el.innerHTML = '<span style="color:#a0aec0;font-size:0.8rem">Keine Dokument-Referenzen vorhanden.</span>';
        return;
    }

    let html = '<div class="od-list">';
    alle.forEach(d => {
        html += `<div class="od-item">
            <span class="od-icon">${typIcons[d.typ] || '📎'}</span>
            <div class="od-info">
                <strong>${escapeHtml(d.bezeichnung)}</strong>
                <span class="od-meta">${escapeHtml(d.objekt)} | ${d.typ} | ${formatDatum(d.datum.split('T')[0])}</span>
                ${d.notiz ? `<span class="od-notiz">${escapeHtml(d.notiz)}</span>` : ''}
            </div>
            <button class="btn-delete btn-small" onclick="loescheObjektDokument('${escapeHtml(d.objekt)}',${d.idx})">X</button>
        </div>`;
    });
    html += '</div>';
    el.innerHTML = html;
}

function updateObjektDokSelects() {
    ['odObjekt', 'odFilterObjekt'].forEach(id => {
        const sel = document.getElementById(id);
        if (!sel) return;
        const val = sel.value;
        const firstOpt = id === 'odFilterObjekt' ? '<option value="">Alle Objekte</option>' : '<option value="">Objekt wählen...</option>';
        sel.innerHTML = firstOpt + objekte.map(o => `<option value="${escapeHtml(o.name)}">${escapeHtml(o.name)}</option>`).join('');
        sel.value = val;
    });
}

// =============================================
// WACHBUCH-EXPORT-DRUCKEN
// =============================================
function druckeWachbuchZeitraum() {
    const von = document.getElementById('wbeDruckVon') ? document.getElementById('wbeDruckVon').value : '';
    const bis = document.getElementById('wbeDruckBis') ? document.getElementById('wbeDruckBis').value : '';

    if (!von || !bis) { alert('Bitte Von- und Bis-Datum angeben.'); return; }

    const filtered = wachbuch.filter(w => w.datum >= von && w.datum <= bis).sort((a, b) => (a.datum + a.zeit).localeCompare(b.datum + b.zeit));

    if (filtered.length === 0) { alert('Keine Wachbuch-Einträge im gewählten Zeitraum.'); return; }

    let html = `<h2>B.B. Protect — Wachbuch</h2><h3>${formatDatum(von)} bis ${formatDatum(bis)}</h3>`;
    html += '<table style="width:100%;border-collapse:collapse;font-size:11px;margin-top:10px">';
    html += '<tr style="background:#2d3748;color:#fff"><th style="padding:4px;border:1px solid #4a5568">Datum</th><th style="padding:4px;border:1px solid #4a5568">Zeit</th><th style="padding:4px;border:1px solid #4a5568">Objekt</th><th style="padding:4px;border:1px solid #4a5568">Kategorie</th><th style="padding:4px;border:1px solid #4a5568">MA</th><th style="padding:4px;border:1px solid #4a5568">Eintrag</th></tr>';

    filtered.forEach(w => {
        html += `<tr><td style="padding:3px;border:1px solid #e2e8f0">${formatDatum(w.datum)}</td><td style="padding:3px;border:1px solid #e2e8f0">${w.zeit || ''}</td><td style="padding:3px;border:1px solid #e2e8f0">${escapeHtml(w.objekt)}</td><td style="padding:3px;border:1px solid #e2e8f0">${escapeHtml(w.kategorie)}</td><td style="padding:3px;border:1px solid #e2e8f0">${escapeHtml(w.mitarbeiter || '')}</td><td style="padding:3px;border:1px solid #e2e8f0">${escapeHtml(w.eintrag || '')}</td></tr>`;
    });
    html += '</table>';
    html += `<p style="margin-top:10px;font-size:10px;color:#718096">${filtered.length} Einträge | Erstellt am ${new Date().toLocaleString('de-DE')}</p>`;

    const printArea = document.getElementById('printArea');
    printArea.innerHTML = html;
    printArea.style.display = 'block';
    document.body.classList.add('print-mode');
    window.print();
    document.body.classList.remove('print-mode');
    printArea.style.display = 'none';
}

// =============================================
// SYSTEM-INFO
// =============================================
function renderSystemInfo() {
    const el = document.getElementById('systemInfoContent');
    if (!el) return;

    let totalBytes = 0;
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('bbprotect_')) {
            totalBytes += new Blob([localStorage.getItem(key) || '']).size;
        }
    }

    const features = [
        'Einsatzerfassung', 'Schichtvorlagen', 'Kalender', 'Dienstplan', 'Jahresübersicht',
        'Abrechnung', 'Lohnvorschau', 'Dashboard & KPIs', 'Heatmap', 'Analytics',
        'Objekte & Verträge', 'Mitarbeiterverwaltung', 'Qualifikationsmatrix',
        'Vorfallsberichte', 'Wachbuch', 'Schichtübergabe', 'Audit-Log',
        'Backup/Restore', 'Dark Mode', 'Globale Suche', 'CSV Export',
        'Prioritäten', 'Farb-Tags', 'Kommentare', 'GPS-Standort',
        'Tausch-Board', 'Nachrichten-Board', 'Zertifikats-Tracker',
        'Auto-Erinnerungen', 'Objekt-Statusampel', 'Schnell-Notiz',
        'Kosten-Split', 'Schicht-Präferenzen', 'Objekt-Dokumente'
    ];

    let html = '<div class="si-grid">';
    html += `<div class="si-card"><div class="si-val">22</div><div class="si-lbl">Backup-Version</div></div>`;
    html += `<div class="si-card"><div class="si-val">${(totalBytes / 1024).toFixed(1)} KB</div><div class="si-lbl">Datenbank-Größe</div></div>`;
    html += `<div class="si-card"><div class="si-val">${features.length}</div><div class="si-lbl">Features</div></div>`;
    html += `<div class="si-card"><div class="si-val">${einsaetze.length}</div><div class="si-lbl">Einsätze</div></div>`;
    html += `<div class="si-card"><div class="si-val">${objekte.length}</div><div class="si-lbl">Objekte</div></div>`;
    html += `<div class="si-card"><div class="si-val">${mitarbeiterListe_.length}</div><div class="si-lbl">Mitarbeiter</div></div>`;
    html += '</div>';

    html += '<details style="margin-top:0.75rem"><summary style="cursor:pointer;font-size:0.8rem;font-weight:600;color:#4299e1">Alle Features anzeigen</summary>';
    html += '<div class="si-features">';
    features.forEach(f => { html += `<span class="si-feat">${f}</span>`; });
    html += '</div></details>';

    el.innerHTML = html;
}

// =============================================
// EINSATZ-STORNOQUOTE
// =============================================
function renderStornoquote() {
    const el = document.getElementById('stornoquoteContent');
    if (!el) return;

    const total = einsaetze.length;
    if (total === 0) {
        el.innerHTML = '<span style="color:#a0aec0;font-size:0.8rem">Keine Einsätze vorhanden</span>';
        return;
    }

    const storniert = einsaetze.filter(e => e.status === 'storniert').length;
    const quote = ((storniert / total) * 100).toFixed(1);

    // Letzten 3 Monate vs. davor
    const heute = new Date();
    const vor3Mon = new Date(heute.getFullYear(), heute.getMonth() - 3, 1).toISOString().split('T')[0];
    const vor6Mon = new Date(heute.getFullYear(), heute.getMonth() - 6, 1).toISOString().split('T')[0];

    const letzte3 = einsaetze.filter(e => e.datum >= vor3Mon);
    const davor3 = einsaetze.filter(e => e.datum >= vor6Mon && e.datum < vor3Mon);

    const quote3 = letzte3.length > 0 ? ((letzte3.filter(e => e.status === 'storniert').length / letzte3.length) * 100).toFixed(1) : '0.0';
    const quoteDavor = davor3.length > 0 ? ((davor3.filter(e => e.status === 'storniert').length / davor3.length) * 100).toFixed(1) : '0.0';

    const trend = parseFloat(quote3) - parseFloat(quoteDavor);
    const trendIcon = trend > 0 ? '📈' : trend < 0 ? '📉' : '➡️';
    const trendColor = trend > 0 ? '#e53e3e' : trend < 0 ? '#38a169' : '#718096';

    let html = '<div class="sq-grid">';
    html += `<div class="sq-card"><div class="sq-val">${quote}%</div><div class="sq-lbl">Gesamt-Stornoquote</div><div class="sq-sub">${storniert} von ${total} Einsätzen</div></div>`;
    html += `<div class="sq-card"><div class="sq-val">${quote3}%</div><div class="sq-lbl">Letzte 3 Monate</div><div class="sq-sub">${letzte3.filter(e => e.status === 'storniert').length} von ${letzte3.length}</div></div>`;
    html += `<div class="sq-card"><div class="sq-val" style="color:${trendColor}">${trendIcon} ${trend > 0 ? '+' : ''}${trend.toFixed(1)}%</div><div class="sq-lbl">Trend</div><div class="sq-sub">vs. vorherige 3 Monate</div></div>`;
    html += '</div>';
    el.innerHTML = html;
}

// =============================================
// MA-FAVORITOBJEKTE
// =============================================
function renderMAFavoritobjekte() {
    const el = document.getElementById('maFavoritContent');
    if (!el) return;

    // Pro MA: zähle Einsätze pro Objekt
    const maObjekte = {};
    einsaetze.forEach(e => {
        if (!e.mitarbeiter || !e.objekt) return;
        if (!maObjekte[e.mitarbeiter]) maObjekte[e.mitarbeiter] = {};
        maObjekte[e.mitarbeiter][e.objekt] = (maObjekte[e.mitarbeiter][e.objekt] || 0) + 1;
    });

    const ranking = Object.entries(maObjekte).map(([ma, objekte]) => {
        const sorted = Object.entries(objekte).sort((a, b) => b[1] - a[1]);
        const top = sorted[0];
        const totalEinsaetze = sorted.reduce((s, [, c]) => s + c, 0);
        return { ma, topObjekt: top[0], topCount: top[1], totalEinsaetze, anzahlObjekte: sorted.length };
    }).sort((a, b) => b.topCount - a.topCount);

    if (ranking.length === 0) {
        el.innerHTML = '<span style="color:#a0aec0;font-size:0.8rem">Keine MA-Einsatzdaten vorhanden.</span>';
        return;
    }

    let html = '<div class="mf-list">';
    ranking.slice(0, 15).forEach(r => {
        const pct = r.totalEinsaetze > 0 ? ((r.topCount / r.totalEinsaetze) * 100).toFixed(0) : 0;
        html += `<div class="mf-row">
            <span class="mf-ma">${escapeHtml(r.ma)}</span>
            <span class="mf-obj">⭐ ${escapeHtml(r.topObjekt)}</span>
            <span class="mf-count">${r.topCount}x (${pct}%)</span>
            <span class="mf-info">${r.anzahlObjekte} Obj. / ${r.totalEinsaetze} Eins.</span>
        </div>`;
    });
    html += '</div>';
    el.innerHTML = html;
}

// =============================================
// OBJEKT-EINSATZ-KALENDER
// =============================================
function renderObjektEinsatzKalender() {
    const el = document.getElementById('oekContent');
    if (!el) return;

    const objekt = document.getElementById('oekObjekt') ? document.getElementById('oekObjekt').value : '';
    const monatStr = document.getElementById('oekMonat') ? document.getElementById('oekMonat').value : '';

    if (!objekt || !monatStr) {
        el.innerHTML = '<span style="color:#a0aec0;font-size:0.8rem">Objekt und Monat wählen</span>';
        return;
    }

    const [jahr, monat] = monatStr.split('-').map(Number);
    const ersterTag = new Date(jahr, monat - 1, 1);
    const letzterTag = new Date(jahr, monat, 0);
    const tageImMonat = letzterTag.getDate();

    let startTag = ersterTag.getDay() - 1;
    if (startTag < 0) startTag = 6;

    const objektEinsaetze = einsaetze.filter(e => e.objekt === objekt);
    const einsatzTage = {};
    objektEinsaetze.forEach(e => {
        if (!e.datum) return;
        if (!einsatzTage[e.datum]) einsatzTage[e.datum] = [];
        einsatzTage[e.datum].push(e);
    });

    const tagLabels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    let html = '<table class="oek-cal"><thead><tr>';
    tagLabels.forEach(t => { html += `<th>${t}</th>`; });
    html += '</tr></thead><tbody><tr>';

    for (let i = 0; i < startTag; i++) html += '<td></td>';

    for (let d = 1; d <= tageImMonat; d++) {
        const datum = `${jahr}-${String(monat).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const tagesE = einsatzTage[datum] || [];
        const cls = tagesE.length > 0 ? 'oek-day oek-has' : 'oek-day';
        const title = tagesE.length > 0 ? tagesE.map(e => `${e.zeitVon}-${e.zeitBis} ${e.mitarbeiter || ''}`).join('\n') : '';
        html += `<td class="${cls}" title="${escapeHtml(title)}">${d}${tagesE.length > 0 ? '<span class="oek-count">' + tagesE.length + '</span>' : ''}</td>`;

        if ((startTag + d) % 7 === 0 && d < tageImMonat) html += '</tr><tr>';
    }

    const rest = (startTag + tageImMonat) % 7;
    if (rest > 0) for (let i = rest; i < 7; i++) html += '<td></td>';
    html += '</tr></tbody></table>';

    const totalMo = objektEinsaetze.filter(e => e.datum && e.datum.startsWith(monatStr)).length;
    const totalStd = objektEinsaetze.filter(e => e.datum && e.datum.startsWith(monatStr)).reduce((s, e) => s + (e.stunden || 0), 0);
    html += `<div class="oek-summary">${totalMo} Einsätze / ${formatZahl(totalStd)} Std. im ${MONATSNAMEN[monat - 1]} ${jahr}</div>`;

    el.innerHTML = html;
}

function updateObjektEinsatzKalSelects() {
    const sel = document.getElementById('oekObjekt');
    if (!sel) return;
    const val = sel.value;
    sel.innerHTML = '<option value="">Objekt wählen...</option>' + objekte.map(o => `<option value="${escapeHtml(o.name)}">${escapeHtml(o.name)}</option>`).join('');
    sel.value = val;
}

// =============================================
// WACHBUCH-SUCHFUNKTION
// =============================================
function wachbuchSuchen() {
    const el = document.getElementById('wbSucheErgebnis');
    if (!el) return;

    const suchtext = (document.getElementById('wbSuche') ? document.getElementById('wbSuche').value : '').toLowerCase().trim();
    if (suchtext.length < 2) {
        el.innerHTML = '<span style="color:#a0aec0;font-size:0.75rem">Mindestens 2 Zeichen eingeben</span>';
        return;
    }

    const treffer = wachbuch.filter(w => {
        return (w.eintrag || '').toLowerCase().includes(suchtext) ||
               (w.objekt || '').toLowerCase().includes(suchtext) ||
               (w.mitarbeiter || '').toLowerCase().includes(suchtext) ||
               (w.kategorie || '').toLowerCase().includes(suchtext);
    }).slice(0, 20);

    if (treffer.length === 0) {
        el.innerHTML = '<span style="color:#a0aec0;font-size:0.75rem">Keine Treffer</span>';
        return;
    }

    let html = `<div class="wbs-info">${treffer.length} Treffer${treffer.length === 20 ? ' (max. 20 angezeigt)' : ''}</div>`;
    html += '<div class="wbs-list">';
    treffer.forEach(w => {
        const text = (w.eintrag || '').substring(0, 100);
        const highlighted = text.replace(new RegExp('(' + suchtext.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '<mark>$1</mark>');
        html += `<div class="wbs-item">
            <span class="wbs-date">${formatDatum(w.datum)} ${w.zeit || ''}</span>
            <span class="wbs-obj">${escapeHtml(w.objekt)}</span>
            <span class="wbs-text">${highlighted}</span>
        </div>`;
    });
    html += '</div>';
    el.innerHTML = html;
}

// =============================================
// AUTO-ERINNERUNGEN (Ablaufende Dokumente/Zertifikate)
// =============================================
function renderAutoErinnerungen() {
    const el = document.getElementById('autoErinnerungenContent');
    if (!el) return;

    const heute = new Date().toISOString().split('T')[0];
    const in30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    const in60 = new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0];

    const warnungen = [];

    // Dokumente prüfen
    dokumente.forEach(d => {
        if (!d.gueltigBis) return;
        if (d.gueltigBis < heute) {
            warnungen.push({ typ: 'abgelaufen', icon: '🔴', bereich: 'Dokument', ma: d.mitarbeiter, detail: `${d.typ} abgelaufen seit ${formatDatum(d.gueltigBis)}`, datum: d.gueltigBis });
        } else if (d.gueltigBis <= in30) {
            warnungen.push({ typ: 'bald', icon: '🟡', bereich: 'Dokument', ma: d.mitarbeiter, detail: `${d.typ} läuft ab am ${formatDatum(d.gueltigBis)}`, datum: d.gueltigBis });
        } else if (d.gueltigBis <= in60) {
            warnungen.push({ typ: 'info', icon: '🟢', bereich: 'Dokument', ma: d.mitarbeiter, detail: `${d.typ} läuft ab am ${formatDatum(d.gueltigBis)}`, datum: d.gueltigBis });
        }
    });

    // Zertifikate prüfen
    maZertifikate.forEach(z => {
        if (!z.ablauf) return;
        if (z.ablauf < heute) {
            warnungen.push({ typ: 'abgelaufen', icon: '🔴', bereich: 'Zertifikat', ma: z.ma, detail: `${z.bezeichnung} abgelaufen seit ${formatDatum(z.ablauf)}`, datum: z.ablauf });
        } else if (z.ablauf <= in30) {
            warnungen.push({ typ: 'bald', icon: '🟡', bereich: 'Zertifikat', ma: z.ma, detail: `${z.bezeichnung} läuft ab am ${formatDatum(z.ablauf)}`, datum: z.ablauf });
        } else if (z.ablauf <= in60) {
            warnungen.push({ typ: 'info', icon: '🟢', bereich: 'Zertifikat', ma: z.ma, detail: `${z.bezeichnung} läuft ab am ${formatDatum(z.ablauf)}`, datum: z.ablauf });
        }
    });

    // MA-Qualifikation prüfen
    mitarbeiterListe_.forEach(m => {
        if (!m.qualAblauf) return;
        if (m.qualAblauf < heute) {
            warnungen.push({ typ: 'abgelaufen', icon: '🔴', bereich: 'Qualifikation', ma: m.name, detail: `Qualifikation abgelaufen seit ${formatDatum(m.qualAblauf)}`, datum: m.qualAblauf });
        } else if (m.qualAblauf <= in30) {
            warnungen.push({ typ: 'bald', icon: '🟡', bereich: 'Qualifikation', ma: m.name, detail: `Qualifikation läuft ab am ${formatDatum(m.qualAblauf)}`, datum: m.qualAblauf });
        }
    });

    warnungen.sort((a, b) => {
        const order = { abgelaufen: 0, bald: 1, info: 2 };
        return (order[a.typ] || 3) - (order[b.typ] || 3) || a.datum.localeCompare(b.datum);
    });

    if (warnungen.length === 0) {
        el.innerHTML = '<span style="color:#38a169;font-size:0.8rem">✅ Keine ablaufenden Dokumente oder Zertifikate.</span>';
        return;
    }

    let html = `<div class="ae-header">${warnungen.filter(w => w.typ === 'abgelaufen').length} abgelaufen | ${warnungen.filter(w => w.typ === 'bald').length} in 30 Tagen | ${warnungen.filter(w => w.typ === 'info').length} in 60 Tagen</div>`;
    html += '<div class="ae-list">';
    warnungen.forEach(w => {
        html += `<div class="ae-item ae-${w.typ}">
            <span class="ae-icon">${w.icon}</span>
            <span class="ae-bereich">${escapeHtml(w.bereich)}</span>
            <span class="ae-ma">${escapeHtml(w.ma)}</span>
            <span class="ae-detail">${escapeHtml(w.detail)}</span>
        </div>`;
    });
    html += '</div>';
    el.innerHTML = html;
}

// =============================================
// DATEN-CHANGELOG
// =============================================
let datenChangelog = JSON.parse(localStorage.getItem('bbprotect_changelog') || '[]');

function changelogEintrag(aktion, bereich, details) {
    datenChangelog.unshift({
        zeit: new Date().toISOString(),
        aktion,
        bereich,
        details: (details || '').substring(0, 100)
    });
    if (datenChangelog.length > 100) datenChangelog = datenChangelog.slice(0, 100);
    localStorage.setItem('bbprotect_changelog', JSON.stringify(datenChangelog));
}

function renderDatenChangelog() {
    const el = document.getElementById('datenChangelogContent');
    if (!el) return;

    if (datenChangelog.length === 0) {
        el.innerHTML = '<span style="color:#a0aec0;font-size:0.8rem">Noch keine Änderungen protokolliert.</span>';
        return;
    }

    const aktionIcons = { erstellt: '➕', geloescht: '🗑️', geaendert: '✏️', import: '📥', export: '📤' };
    const anzeigen = datenChangelog.slice(0, 20);

    let html = '<div class="cl-list">';
    anzeigen.forEach(c => {
        const zeit = new Date(c.zeit);
        const zeitStr = `${String(zeit.getDate()).padStart(2, '0')}.${String(zeit.getMonth() + 1).padStart(2, '0')}. ${String(zeit.getHours()).padStart(2, '0')}:${String(zeit.getMinutes()).padStart(2, '0')}`;
        html += `<div class="cl-entry">
            <span class="cl-icon">${aktionIcons[c.aktion] || '📝'}</span>
            <span class="cl-zeit">${zeitStr}</span>
            <span class="cl-bereich">${escapeHtml(c.bereich)}</span>
            <span class="cl-detail">${escapeHtml(c.details || '')}</span>
        </div>`;
    });
    html += '</div>';
    if (datenChangelog.length > 20) {
        html += `<div style="font-size:0.7rem;color:#a0aec0;text-align:center;margin-top:0.3rem">... und ${datenChangelog.length - 20} weitere Einträge</div>`;
    }
    el.innerHTML = html;
}

function changelogLeeren() {
    if (!confirm('Changelog wirklich leeren?')) return;
    datenChangelog = [];
    localStorage.setItem('bbprotect_changelog', JSON.stringify(datenChangelog));
    renderDatenChangelog();
}

// =============================================
// DASHBOARD-WETTER-WIDGET
// =============================================
function renderWetterWidget() {
    const el = document.getElementById('wetterWidgetContent');
    if (!el) return;

    const heute = new Date().toISOString().split('T')[0];
    const wetterIcons = { sonnig: '☀️', bewoelkt: '⛅', regen: '🌧️', schnee: '❄️', sturm: '🌪️', nebel: '🌫️' };

    const heuteNotizen = Object.entries(objektWetterNotizen)
        .filter(([key]) => key.endsWith('|' + heute))
        .map(([key, val]) => ({ objekt: key.split('|')[0], ...val }));

    if (heuteNotizen.length === 0) {
        el.innerHTML = '<span style="color:#a0aec0;font-size:0.75rem">Keine Wetter-Daten für heute</span>';
        return;
    }

    let html = '<div class="ww-items">';
    heuteNotizen.forEach(n => {
        html += `<span class="ww-item">${wetterIcons[n.wetter] || '🌡️'} ${escapeHtml(n.objekt.substring(0, 12))}</span>`;
    });
    html += '</div>';
    el.innerHTML = html;
}

// =============================================
// DATEN-STATISTIK-ERWEITERUNG (localStorage)
// =============================================
function renderSpeicherStatistik() {
    const el = document.getElementById('speicherStatistikContent');
    if (!el) return;

    const keys = [
        { key: 'bbprotect_einsaetze', label: 'Einsätze' },
        { key: 'bbprotect_objekte', label: 'Objekte' },
        { key: 'bbprotect_mitarbeiter', label: 'Mitarbeiter' },
        { key: 'bbprotect_vorlagen', label: 'Vorlagen' },
        { key: 'bbprotect_verfuegbarkeit', label: 'Verfügbarkeit' },
        { key: 'bbprotect_vorfaelle', label: 'Vorfälle' },
        { key: 'bbprotect_wachbuch', label: 'Wachbuch' },
        { key: 'bbprotect_auditlog', label: 'Audit-Log' },
        { key: 'bbprotect_nachrichten', label: 'Nachrichten' },
        { key: 'bbprotect_bewertungen', label: 'Bewertungen' },
        { key: 'bbprotect_tauschanfragen', label: 'Tausch-Anfragen' },
        { key: 'bbprotect_schichtuebergaben', label: 'Schichtübergaben' },
        { key: 'bbprotect_zertifikate', label: 'Zertifikate' },
        { key: 'bbprotect_einsatzkommentare', label: 'Kommentare' }
    ];

    let total = 0;
    const data = keys.map(k => {
        const val = localStorage.getItem(k.key) || '';
        const bytes = new Blob([val]).size;
        total += bytes;
        return { ...k, bytes };
    }).sort((a, b) => b.bytes - a.bytes);

    const maxBytes = Math.max(...data.map(d => d.bytes), 1);

    let html = '<div class="sps-list">';
    data.forEach(d => {
        const pct = (d.bytes / maxBytes) * 100;
        const kb = (d.bytes / 1024).toFixed(1);
        html += `<div class="sps-row">
            <span class="sps-label">${d.label}</span>
            <div class="sps-bar-bg"><div class="sps-bar-fill" style="width:${pct}%"></div></div>
            <span class="sps-val">${kb} KB</span>
        </div>`;
    });
    html += '</div>';
    html += `<div class="sps-total">Gesamt: <strong>${(total / 1024).toFixed(1)} KB</strong> von ~5 MB</div>`;
    el.innerHTML = html;
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
renderQuickStats();
renderSchnellNotiz();
pruefeBenachrichtigungen();
renderDokumente();
renderUrlaubskonto();
updateChecklisteObjekte();
renderArbeitszeitkonto();
renderUebergaben();
renderNotfallkontakte();
renderSchnellvorlagen();
ladeEinstellungen();
document.getElementById('vfDatum').valueAsDate = new Date();
document.getElementById('wbDatum').valueAsDate = new Date();
document.getElementById('ugDatum').valueAsDate = new Date();
document.getElementById('snDatum').valueAsDate = new Date();
document.getElementById('besDatum').valueAsDate = new Date();
document.getElementById('tlDatum').valueAsDate = new Date();
document.getElementById('suDatum').valueAsDate = new Date();
document.getElementById('mavkMonat').value = new Date().toISOString().substring(0, 7);
document.getElementById('owDatum').valueAsDate = new Date();
document.getElementById('skChartMonat').value = new Date().toISOString().substring(0, 7);
document.getElementById('fkJahr').value = new Date().getFullYear();
document.getElementById('tpDatum').valueAsDate = new Date();
document.getElementById('jazkJahr').value = new Date().getFullYear();
document.getElementById('dpStartDatum').valueAsDate = new Date();
document.getElementById('tprtDatum').valueAsDate = new Date();
document.getElementById('oekMonat').value = new Date().toISOString().substring(0, 7);
const jetztInit = new Date();
document.getElementById('wbZeit').value = `${String(jetztInit.getHours()).padStart(2, '0')}:${String(jetztInit.getMinutes()).padStart(2, '0')}`;
document.getElementById('ugZeit').value = `${String(jetztInit.getHours()).padStart(2, '0')}:${String(jetztInit.getMinutes()).padStart(2, '0')}`;
