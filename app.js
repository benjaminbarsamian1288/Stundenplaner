/**
 * B.B. Protect - Stundenplaner für Sicherheitseinsätze
 * Berechnung von Arbeitszeit, Stundensatz und Zuschlägen (Nacht/Sonntag/Feiertag)
 */

let einsaetze = JSON.parse(localStorage.getItem('bbprotect_einsaetze') || '[]');

// --- DOM Referenzen ---
const form = document.getElementById('einsatzForm');
const autoZuschlagCheckbox = document.getElementById('autoZuschlag');
const manualZuschlagDiv = document.getElementById('manualZuschlag');
const einsatzBody = document.getElementById('einsatzBody');
const emptyMessage = document.getElementById('emptyMessage');
const filterMonat = document.getElementById('filterMonat');
const previewSection = document.getElementById('previewSection');
const previewContent = document.getElementById('previewContent');

// --- Zuschlag-Sätze (Standard für Sicherheitsgewerbe) ---
const ZUSCHLAG_NACHT = 25;    // 25% Nachtzuschlag (20:00 - 06:00)
const ZUSCHLAG_SONNTAG = 50;  // 50% Sonntagszuschlag
const ZUSCHLAG_FEIERTAG = 100; // 100% Feiertagszuschlag

// --- Events ---
autoZuschlagCheckbox.addEventListener('change', function () {
    manualZuschlagDiv.style.display = this.checked ? 'none' : 'block';
});

form.addEventListener('submit', function (e) {
    e.preventDefault();
    const einsatz = erfasseFormular();
    if (!einsatz) return;

    einsaetze.push(einsatz);
    speichern();
    renderTabelle();
    updateMonatsfilter();
    form.reset();
    autoZuschlagCheckbox.checked = true;
    manualZuschlagDiv.style.display = 'none';
    previewSection.style.display = 'none';
    document.getElementById('datum').valueAsDate = new Date();
});

// Live-Vorschau bei Eingabeänderungen
['datum', 'zeitVon', 'zeitBis', 'stundensatz'].forEach(id => {
    document.getElementById(id).addEventListener('change', updatePreview);
    document.getElementById(id).addEventListener('input', updatePreview);
});

filterMonat.addEventListener('change', renderTabelle);

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

// --- Stunden- und Zuschlagsberechnung ---
function berechneEinsatz(datum, zeitVon, zeitBis, stundensatz) {
    const stunden = berechneStunden(zeitVon, zeitBis);
    const wochentag = new Date(datum).getDay(); // 0 = Sonntag
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

    // Nachtanteile berechnen (20:00 - 06:00)
    const nachtStunden = berechneNachtStunden(zeitVon, zeitBis);
    const tagStunden = stunden - nachtStunden;

    // Zuschläge
    let zuschlagBetrag = 0;
    const zuschlagDetails = [];

    // Nachtzuschlag
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

    // Sonntagszuschlag (auf alle Stunden)
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

    // Feiertagszuschlag (auf alle Stunden, ersetzt Sonntagszuschlag nicht - kumuliert)
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

    // Wenn Ende vor Start -> Nachtschicht über Mitternacht
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

    // Nachtzeit: 20:00 (1200min) - 06:00 (360min nächster Tag = 1800min)
    let nachtMinuten = 0;

    // Nachtblock 1: 20:00 - 24:00 (1200 - 1440)
    const nacht1Start = 20 * 60;
    const nacht1End = 24 * 60;
    nachtMinuten += ueberschneidung(startMin, endMin, nacht1Start, nacht1End);

    // Nachtblock 2: 00:00 - 06:00 (1440 - 1800 für Schichten über Mitternacht, oder 0 - 360)
    const nacht2Start = 0;
    const nacht2End = 6 * 60;
    nachtMinuten += ueberschneidung(startMin, endMin, nacht2Start, nacht2End);

    // Bei Schichten über Mitternacht: auch 24:00-30:00 (= 00:00-06:00 nächster Tag)
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

// --- Vorschau ---
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
    return `<div class="detail-item"><strong>${label}</strong><span>${value}</span></div>`;
}

// --- Tabelle rendern ---
function renderTabelle() {
    const filter = filterMonat.value;
    const gefiltert = filter
        ? einsaetze.filter(e => e.datum.substring(0, 7) === filter)
        : einsaetze;

    // Sortieren nach Datum
    gefiltert.sort((a, b) => a.datum.localeCompare(b.datum) || a.zeitVon.localeCompare(b.zeitVon));

    einsatzBody.innerHTML = '';

    if (gefiltert.length === 0) {
        emptyMessage.style.display = 'block';
        document.querySelector('.table-wrapper').style.display = 'none';
    } else {
        emptyMessage.style.display = 'none';
        document.querySelector('.table-wrapper').style.display = 'block';
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
            zuschlagBadges += `<span class="zuschlag-badge ${cls}">${z.typ} ${z.prozent}% = ${formatEuro(z.betrag)}</span> `;
        });

        if (e.zuschlagDetails.length === 0) {
            zuschlagBadges = '<span style="color:#a0aec0">—</span>';
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
            <td><button class="btn-delete" onclick="loescheEinsatz(${e.id})">Löschen</button></td>
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

// --- Monatsfilter aktualisieren ---
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
}

// --- Einsatz löschen ---
function loescheEinsatz(id) {
    einsaetze = einsaetze.filter(e => e.id !== id);
    speichern();
    renderTabelle();
    updateMonatsfilter();
}

// --- CSV Export ---
function exportCSV() {
    const filter = filterMonat.value;
    const gefiltert = filter
        ? einsaetze.filter(e => e.datum.substring(0, 7) === filter)
        : einsaetze;

    if (gefiltert.length === 0) {
        alert('Keine Einsätze zum Exportieren vorhanden.');
        return;
    }

    const header = 'Datum;Objekt;Mitarbeiter;Von;Bis;Stunden;Stundensatz;Zuschläge;Gesamt;Bemerkung';
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
            zuschlagText + ' (' + formatZahl(e.zuschlagBetrag) + '€)',
            formatZahl(e.gesamt) + '€',
            e.bemerkung || ''
        ].map(v => `"${v}"`).join(';');
    });

    const csv = '\uFEFF' + header + '\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    const filterLabel = filter || 'Alle';
    a.download = `BBProtect_Einsaetze_${filterLabel}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// --- Hilfsfunktionen ---
function formatDatum(d) {
    const [j, m, t] = d.split('-');
    return `${t}.${m}.${j}`;
}

function formatEuro(betrag) {
    return betrag.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
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

// --- Initialisierung ---
document.getElementById('datum').valueAsDate = new Date();
renderTabelle();
updateMonatsfilter();
