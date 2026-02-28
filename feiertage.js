/**
 * Feiertage für Brandenburg (B.B.)
 * Berechnung der gesetzlichen Feiertage inkl. beweglicher Feiertage (Ostern etc.)
 */

function berechneOstersonntag(jahr) {
    // Gaußsche Osterformel
    const a = jahr % 19;
    const b = Math.floor(jahr / 100);
    const c = jahr % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const monat = Math.floor((h + l - 7 * m + 114) / 31);
    const tag = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(jahr, monat - 1, tag);
}

function getFeiertage(jahr) {
    const ostern = berechneOstersonntag(jahr);

    function osterOffset(tage) {
        const d = new Date(ostern);
        d.setDate(d.getDate() + tage);
        return d;
    }

    function formatDate(d) {
        return d.toISOString().split('T')[0];
    }

    const feiertage = {
        [formatDate(new Date(jahr, 0, 1))]: 'Neujahr',
        [formatDate(new Date(jahr, 2, 8))]: 'Internationaler Frauentag',
        [formatDate(osterOffset(-2))]: 'Karfreitag',
        [formatDate(osterOffset(0))]: 'Ostersonntag',
        [formatDate(osterOffset(1))]: 'Ostermontag',
        [formatDate(new Date(jahr, 4, 1))]: 'Tag der Arbeit',
        [formatDate(osterOffset(39))]: 'Christi Himmelfahrt',
        [formatDate(osterOffset(49))]: 'Pfingstsonntag',
        [formatDate(osterOffset(50))]: 'Pfingstmontag',
        [formatDate(new Date(jahr, 9, 3))]: 'Tag der Deutschen Einheit',
        [formatDate(new Date(jahr, 9, 31))]: 'Reformationstag',
        [formatDate(new Date(jahr, 11, 25))]: 'Erster Weihnachtstag',
        [formatDate(new Date(jahr, 11, 26))]: 'Zweiter Weihnachtstag',
    };

    return feiertage;
}

function istFeiertag(datumStr) {
    const jahr = new Date(datumStr).getFullYear();
    const feiertage = getFeiertage(jahr);
    return feiertage[datumStr] || null;
}
