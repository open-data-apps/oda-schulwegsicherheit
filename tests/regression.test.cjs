const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sourcePath = process.env.REGRESSION_APP === 'oda-schulwegsicherheit' && process.env.REGRESSION_APPJS
  ? process.env.REGRESSION_APPJS : path.join(__dirname, '../app/app.js');
const source = fs.readFileSync(sourcePath, 'utf8');
const fallback = 'https://routing.openstreetmap.de';
const routePayload = {
  code: 'Ok',
  routes: [{ distance: 944.7, duration: 673.8, geometry: { type: 'LineString', coordinates: [[9.1131764, 48.7264626], [9.110575, 48.732765]] } }],
};
const start = { lat: 48.7264626, lon: 9.1131764 };
const school = { id: 'BW-129123', name: 'Oesterfeldschule', lat: 48.732765, lon: 9.110575 };

function element() {
  const listeners = new Map();
  return {
    value: '', innerHTML: '', textContent: '', className: '', hidden: false, dataset: {},
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener(type, callback) { listeners.set(type, callback); },
    removeEventListener() {}, setAttribute() {}, removeAttribute() {}, contains() { return false; },
    querySelectorAll() { return []; },
    emit(type, event = {}) { return listeners.get(type)?.({ target: this, ...event }); },
  };
}

function setup(fetchImpl = async () => ({ ok: true, json: async () => routePayload })) {
  const storage = new Map();
  const calls = [];
  const layer = () => ({ addTo() { return this; }, remove() {} });
  const api = vm.createContext({
    URL, URLSearchParams, AbortController, DOMException, console, setTimeout, clearTimeout,
    document: { addEventListener() {}, removeEventListener() {} },
    navigator: {},
    window: { location: { pathname: '/app/', search: '', hash: '#startseite' }, history: { replaceState() {} } },
    localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    L: { polyline: layer, circleMarker: layer, marker: layer },
    fetch: async (...args) => { calls.push({ args, at: Date.now() }); return fetchImpl(...args); },
  });
  vm.runInContext(source, api, { filename: 'app.js' });
  vm.runInContext('this.registerRuntime = r => SCHULWEGSAFE_RUNTIME.activeRuntimes.set(r.rootElement, r);', api);
  const runtime = api.createRuntime({ routeServiceUrl: 'https://routes.example.test/route' }, element());
  for (const key of ['schoolSearchInput', 'schoolSearchResults', 'schoolDetails', 'status', 'mapContainer', 'hazardKpis', 'dataFreshness', 'scoreSummary', 'routeModeNote', 'routeScoreHelp', 'routeAlternatives', 'hazardList', 'routeRecommendations', 'startAddressInput', 'startAddressResults', 'applyStartButton', 'geoLocateButton', 'copyShareLinkButton']) runtime.ui[key] = element();
  runtime.ui.routeModeButtons = ['foot', 'bike', 'car'].map(mode => Object.assign(element(), { dataset: { routeMode: mode } }));
  runtime.map = { fitBounds() {}, setView() {}, remove() {} };
  runtime.selectedSchool = school;
  runtime.startPoint = { ...start };
  api.registerRuntime(runtime);
  return { api, runtime, calls, storage };
}

const instancePath = '/view/audit-test/schulwegsafe/cmssptza70017o52nta351axt';
for (const [entry, basePath] of [
  ['/app/', '/app'], ['/app', '/app'], ['/app/index.html', '/app'],
  [instancePath + '/', instancePath], [instancePath, instancePath],
  [instancePath + '/index.html?x=1#startseite', instancePath],
]) {
  for (const target of [
    'https://raw.githubusercontent.com/Datenschule/schulscraper-data/master/schools/baden-wuerttemberg.json?value=a+b%2F&city=Österfeld',
    'https://www.opengeodata.nrw.de/produkte/transport_verkehr/unfallatlas/Unfallorte2024_EPSG25832_CSV.zip?x=1&y=2',
  ]) {
    test(`Proxy erhält Basis und absolute Ziel-URL bei ${entry} für ${new URL(target).hostname}`, async () => {
      const { api, calls } = setup(async () => ({ ok: true, json: async () => ({ content: 'Quelldaten' }) }));
      api.window.location = new URL(entry, 'http://odas.example.test');
      assert.equal(await api.fetchOdasCompatibleText(target, { proxyAktiv: 'ja' }), 'Quelldaten');
      assert.equal(calls.length, 1);
      const [endpoint, options] = calls[0].args;
      const url = new URL(endpoint, api.window.location.href);
      assert.equal(url.pathname, basePath + '/odp-data');
      assert.equal(url.searchParams.get('path'), target);
      assert.equal(options.method, 'POST');
    });
  }
}

test('die Oberfläche zeigt deutsche Umlaute in Beschriftungen und Eingabehilfen', () => {
  const { api, runtime } = setup();
  runtime.rootElement.querySelector = () => element();
  api.renderShell(runtime);
  const html = runtime.rootElement.innerHTML;
  assert.match(html, /Baden-Württemberg · Schulwege datenbasiert einschätzen/);
  assert.match(html, /placeholder="z\.B\. Österfeld Vaihingen/);
  assert.match(html, /placeholder="Straße, Ort oder Haltestelle"/);
  assert.match(html, /data-route-mode="foot">Fußweg</);
  assert.match(html, /Schule und Startpunkt wählen/);
});

test('Erklärungen verwenden weiterhin Umlaute', () => {
  const { api } = setup();
  assert.match(api.getScoreExplanation(1.2), /Fuß-\/Radbezug und neuere Unfälle wiegen stärker/);
  assert.match(api.getGeolocationInsecureContextMessage(), /über HTTPS/);
});

for (const format of ['legacy', 'current']) {
  test(`alte Unfalltitel aus dem ${format}-Cache werden ohne Änderung fremder Namen angezeigt`, () => {
    const { api } = setup();
    const accidents = ['Unfallpunkt Fussverkehr', 'Kinderbeteiligung Fussverkehr', 'Goethe-Kreuzung Fussverkehr']
      .map(titel => ({ properties: { titel } }));
    const cached = format === 'legacy' ? accidents : { accidents, totalCount: 20, discardedCount: 17 };
    const result = api.normalizeAccidentAtlasCacheEntry(cached);
    assert.deepEqual(Array.from(result.accidents, accident => accident.properties.titel), [
      'Unfallpunkt Fußverkehr', 'Kinderbeteiligung Fußverkehr', 'Goethe-Kreuzung Fussverkehr',
    ]);
    assert.equal(result.totalCount, format === 'legacy' ? null : 20);
    assert.equal(result.discardedCount, format === 'legacy' ? null : 17);
  });
}

test('eine berechnete Fußroute hat auch im kompakten Score die korrekte Beschriftung', async () => {
  const { api, runtime } = setup();
  await api.evaluateRoute(runtime);
  assert.match(runtime.ui.scoreSummary.innerHTML, /Fußweg/);
  assert.doesNotMatch(runtime.ui.scoreSummary.innerHTML, /Fussweg|Routenbewertung/);
  assert.match(runtime.ui.routeModeNote.textContent, /^Fußweg mit Routing:/);
});


test('die Karte hat kompakte Quellenlinks statt Fallback- und Einwilligungsdialog', () => {
  const { api, runtime, calls } = setup();
  runtime.rootElement.querySelector = () => element();
  api.renderShell(runtime);
  assert.doesNotMatch(runtime.rootElement.innerHTML, /data-routing-fallback|data-consent-action|id="consent-panel|id="routing-notice/);
  assert.match(runtime.rootElement.innerHTML, /https:\/\/routing\.openstreetmap\.de\/about\.html/);
  assert.match(runtime.rootElement.innerHTML, /https:\/\/www\.openstreetmap\.org\/fixthemap/);
  assert.equal(calls.length, 0);
});

for (const [mode, variant] of [['foot', 'foot'], ['bike', 'bike']]) {
  test(`ungeeigneter Auto-Standard wird für ${mode} übersprungen und automatisch ersetzt`, async () => {
    const { api, runtime, calls, storage } = setup();
    runtime.config.routeServiceUrl = '';
    storage.set('oda-schulwegsicherheit:consent:v2:old', 'denied');
    const result = await api.fetchRouteService('', start, school, mode, runtime.config);
    assert.equal(result.code, 'Ok');
    assert.equal(calls.length, 1);
    assert.ok(calls[0].args[0].startsWith(`${fallback}/routed-${variant}/route/v1/${mode}/`));
    assert.equal(runtime.config.routeServiceUrl, '');
    assert.equal(storage.size, 1, 'keine neue Einwilligung speichern');
  });
}

test('Auto nutzt zuerst den bisherigen Standard, ohne zusätzliche Einwilligung', async () => {
  const { api, runtime, calls } = setup();
  runtime.config.routeServiceUrl = '';
  const result = await api.fetchRouteService('', start, school, 'car', runtime.config);
  assert.equal(result.code, 'Ok');
  assert.equal(calls.length, 1);
  assert.match(calls[0].args[0], /^https:\/\/router\.project-osrm\.org\/route\/v1\/driving\//);
});

test('erfolgreicher eigener Dienst bleibt primär und behält sein POST-Protokoll', async () => {
  const { api, runtime, calls } = setup();
  await api.evaluateRoute(runtime);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].args[0], 'https://routes.example.test/route');
  assert.equal(calls[0].args[1].method, 'POST');
  assert.deepEqual(JSON.parse(calls[0].args[1].body), {
    from: [48.7264626, 9.1131764], to: [48.732765, 9.110575], schoolId: 'BW-129123', mode: 'foot',
  });
  assert.equal(runtime.data.routeCandidates.length, 1);
});

for (const [name, response] of [
  ['HTTP-Ausfall', () => ({ ok: false, status: 503 })],
  ['Netzwerkfehler', () => { throw new TypeError('Offline'); }],
  ['ungültiges JSON', () => ({ ok: true, json: async () => { throw new SyntaxError('invalid json'); } })],
  ['fehlende Route', () => ({ ok: true, json: async () => ({ code: 'Ok', routes: [] }) })],
  ['ungültige Geometrie', () => ({ ok: true, json: async () => ({ routes: [{ geometry: { coordinates: [[9, 48]] } }] }) })],
]) {
  test(`${name} im Primärdienst löst genau einen Fallback aus`, async () => {
    const { api, runtime, calls } = setup(url => url.startsWith(fallback)
      ? { ok: true, json: async () => routePayload } : response());
    await api.evaluateRoute(runtime);
    assert.equal(calls.length, 2);
    assert.equal(calls[0].args[0], 'https://routes.example.test/route');
    assert.match(calls[1].args[0], /^https:\/\/routing\.openstreetmap\.de\/routed-foot\//);
    assert.equal(runtime.data.routeCandidates.length, 1);
    assert.match(runtime.ui.status.textContent, /bewertet\./);
    assert.equal(runtime.config.routeServiceUrl, 'https://routes.example.test/route');
  });
}

test('fehlgeschlagener Auto-Standard nutzt das FOSSGIS-Autoprofil', async () => {
  const { api, runtime, calls } = setup(url => url.startsWith(fallback)
    ? { ok: true, json: async () => routePayload } : { ok: false, status: 503 });
  runtime.config.routeServiceUrl = '';
  await api.fetchRouteService('', start, school, 'car', runtime.config);
  assert.equal(calls.length, 2);
  assert.match(calls[1].args[0], /routed-car\/route\/v1\/driving\//);
});

test('ein eigener Dienst mit bisher unterstützter Koordinatenstruktur benötigt keinen Ersatzdienst', async () => {
  const payload = { routes: [{ distance: 944.7, duration: 673.8, geometry: {
    coordinates: [[9.1131764, 48.7264626], [9.110575, 48.732765]],
  } }] };
  const { api, runtime, calls } = setup(async () => ({ ok: true, json: async () => payload }));
  await api.evaluateRoute(runtime);
  assert.equal(calls.length, 1);
  assert.equal(runtime.data.routeCandidates.length, 1);
});

test('wenn beide Dienste scheitern, erscheint weder Route noch Score', async () => {
  const { api, runtime, calls } = setup(async () => ({ ok: false, status: 503 }));
  await api.evaluateRoute(runtime);
  assert.equal(calls.length, 2);
  assert.equal(runtime.data.routeCandidates.length, 0);
  assert.doesNotMatch(runtime.ui.scoreSummary.innerHTML, /Geringes Risiko|Unfallpunkte/);
  assert.match(runtime.ui.status.textContent, /konnte keine/);
});

test('direkt konfiguriertes FOSSGIS wird bei Fehler nicht erneut angefragt', async () => {
  const { api, runtime, calls } = setup(async () => ({ ok: false, status: 503 }));
  runtime.config.routeServiceUrl = fallback;
  await assert.rejects(api.fetchRouteService(fallback, start, school, 'foot', runtime.config), /503/);
  assert.equal(calls.length, 1);
});

test('eine bereits abgebrochene Anfrage sendet nichts', async () => {
  const { api, runtime, calls } = setup();
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(api.fetchRouteService(runtime.config.routeServiceUrl, start, school, 'foot', runtime.config, controller.signal), { name: 'AbortError' });
  assert.equal(calls.length, 0);
});

test('Abbruch oder überholte Primärantwort startet keinen Fallback', async () => {
  let deliver;
  const { api, runtime, calls } = setup(() => new Promise(resolve => { deliver = resolve; }));
  const controller = new AbortController();
  const pending = api.fetchRouteService(runtime.config.routeServiceUrl, start, school, 'foot', runtime.config, controller.signal);
  controller.abort();
  deliver({ ok: false, status: 503 });
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(calls.length, 1);
});

test('AbortError des Primärdienstes löst keinen Fallback aus', async () => {
  const { api, runtime, calls } = setup(async () => { throw new DOMException('cancelled', 'AbortError'); });
  await assert.rejects(api.fetchRouteService(runtime.config.routeServiceUrl, start, school, 'foot', runtime.config), { name: 'AbortError' });
  assert.equal(calls.length, 1);
});

for (const [mode, suffix] of [['foot', 'routed-foot/route/v1/foot/'], ['bike', 'routed-bike/route/v1/bike/'], ['car', 'routed-car/route/v1/driving/']]) {
  test(`Fallback verwendet für ${mode} den passenden vorbereiteten Routingdienst`, async () => {
    const { api, runtime, calls } = setup();
    const result = await api.fetchRouteService(fallback, start, school, mode, runtime.config);
    assert.equal(result.code, 'Ok');
    assert.ok(calls[0].args[0].startsWith(`${fallback}/${suffix}`));
    assert.notEqual(calls[0].args[1]?.method, 'POST');
  });
}

test('Fallback-Anfragen bleiben auch bei parallelen Aufrufen mindestens eine Sekunde auseinander', async () => {
  const { api, runtime, calls } = setup();
  await Promise.all(['foot', 'bike'].map(mode => api.fetchRouteService(fallback, start, school, mode, runtime.config)));
  assert.equal(calls.length, 2);
  assert.ok(calls[1].at - calls[0].at >= 1000, `Abstand: ${calls[1].at - calls[0].at} ms`);
});

test('eine abgebrochene wartende Fallback-Anfrage wird nicht versendet', async () => {
  const { api, runtime, calls } = setup();
  await api.fetchRouteService(fallback, start, school, 'foot', runtime.config);
  const controller = new AbortController();
  const pending = api.fetchRouteService(fallback, start, school, 'bike', runtime.config, controller.signal);
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(calls.length, 1);
});

test('die Adresssuche funktioniert ohne Einwilligung und nutzt die eingegebene Adresse', async () => {
  const { api, runtime, calls, storage } = setup(async () => ({ ok: true, json: async () => [
    { lat: '48.7264626', lon: '9.1131764', display_name: 'Bahnhof Vaihingen', address: { road: 'Vollmoellerstraße', city: 'Stuttgart' } },
  ] }));
  const results = await api.fetchAddressCandidates('Bahnhof Vaihingen', school, runtime.config);
  assert.equal(results.length, 1);
  assert.equal(new URL(calls[0].args[0]).hostname, 'nominatim.openstreetmap.org');
  assert.match(new URL(calls[0].args[0]).searchParams.get('q'), /Bahnhof Vaihingen/);
  assert.equal(storage.size, 0);
});

test('unter vier Zeichen beginnt keine Adresssuche', () => {
  const { api, runtime, calls } = setup();
  const timers = [];
  api.setTimeout = callback => { timers.push(callback); };
  api.queueAddressSearch(runtime, 'abc');
  assert.equal(timers.length, 0);
  assert.equal(calls.length, 0);
});

test('verspaetete Routen setzen nach geaenderter Startadresse weder Score noch Strecke', async () => {
  let deliver;
  const { api, runtime } = setup(() => new Promise(resolve => { deliver = resolve; }));
  api.bindUi(runtime);
  const pending = api.evaluateRoute(runtime);
  runtime.ui.startAddressInput.value = '';
  runtime.ui.startAddressInput.emit('input');
  deliver({ ok: true, json: async () => routePayload });
  await pending;
  assert.equal(runtime.startPoint, null);
  assert.equal(runtime.data.routeCandidates.length, 0);
  assert.doesNotMatch(runtime.ui.scoreSummary.innerHTML, /Geringes Risiko/);
  assert.doesNotMatch(runtime.ui.status.textContent, /bewertet\./);
});

test('Adressaenderung bricht einen laufenden Routingabruf ab', async () => {
  let requestSignal;
  const { api, runtime } = setup((_url, options) => {
    requestSignal = options.signal;
    return new Promise(() => {});
  });
  api.bindUi(runtime);
  api.evaluateRoute(runtime);
  runtime.ui.startAddressInput.emit('input');
  assert.ok(requestSignal, 'Fetch muss das Abbruchsignal erhalten');
  assert.equal(requestSignal.aborted, true);
});

test('verspaetetes Geocoding darf nach Leeren der Adresse keine neue Route beginnen', async () => {
  let deliver;
  const { api, runtime, calls } = setup(() => new Promise(resolve => { deliver = resolve; }));
  api.bindUi(runtime);
  runtime.startPoint = null;
  runtime.ui.startAddressInput.value = 'Bahnhof Stuttgart-Vaihingen';
  const pending = api.resolveStartAddressAndRoute(runtime);
  runtime.ui.startAddressInput.value = '';
  runtime.ui.startAddressInput.emit('input');
  deliver({ ok: true, json: async () => [{ lat: '48.7264626', lon: '9.1131764', display_name: 'Bahnhof Stuttgart-Vaihingen', address: { road: 'Vollmoellerstrasse', city: 'Stuttgart' } }] });
  // Die Netzattrappe liefert Folgeabrufe sofort, damit auch der fehlerhafte Pfad beendet wird.
  api.fetch = async () => { calls.push({ args: ['unexpected route'] }); return { ok: true, json: async () => routePayload }; };
  await pending;
  assert.equal(runtime.startPoint, null);
  assert.equal(runtime.data.routeCandidates.length, 0);
  assert.equal(calls.length, 1);
});

test('Enter waehrend des Such-Debounce berechnet trotz langsamer Geocodierung eine Route', async () => {
  const responses = [];
  const timers = [];
  const { api, runtime, calls } = setup(url => url.includes('nominatim')
    ? new Promise(resolve => responses.push(resolve))
    : Promise.resolve({ ok: true, json: async () => routePayload }));
  api.setTimeout = callback => { const timer = { callback, cancelled: false }; timers.push(timer); return timer; };
  api.clearTimeout = timer => { if (timer) timer.cancelled = true; };
  api.bindUi(runtime);
  runtime.ui.startAddressInput.value = 'Bahnhof Stuttgart-Vaihingen';
  runtime.ui.startAddressInput.emit('input');
  const pending = api.resolveStartAddressAndRoute(runtime);
  // Der Enter-Abruf ist noch offen, wenn der urspruengliche Vorschlags-Timer faellig wird.
  for (const timer of [...timers]) if (!timer.cancelled) timer.callback();
  responses[0]({ ok: true, json: async () => [{ lat: '48.7264626', lon: '9.1131764', display_name: 'Bahnhof Stuttgart-Vaihingen', address: { road: 'Vollmoellerstrasse', city: 'Stuttgart' } }] });
  await pending;
  assert.equal(runtime.data.routeCandidates.length, 1);
  assert.equal(calls.filter(call => call.args[0].includes('nominatim')).length, 1);
});

test('Fehler einer veralteten Adresssuche ueberschreiben nicht den aktuellen Status', async () => {
  let rejectSearch;
  const timers = [];
  const { api, runtime } = setup(() => new Promise((_resolve, reject) => { rejectSearch = reject; }));
  api.setTimeout = callback => { timers.push(callback); return timers.length; };
  api.clearTimeout = () => {};
  api.bindUi(runtime);
  runtime.ui.startAddressInput.value = 'Alte Adresse Stuttgart';
  runtime.ui.startAddressInput.emit('input');
  timers[0]();
  runtime.ui.startAddressInput.value = '';
  runtime.ui.startAddressInput.emit('input');
  const currentStatus = runtime.ui.status.textContent;
  rejectSearch(new Error('Antwort der alten Suche'));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(runtime.ui.status.textContent, currentStatus);
});

const rawSchool = { id: 'BW-129123', name: '…sterfeldschule Grundschule Vaihingen', address: 'Katzenbachstraße 27, 70563 Stuttgart', lat: 48.732765, lon: 9.110575 };

test('der belegte defekte Schulname wird gezielt korrigiert, andere Auslassungszeichen bleiben erhalten', () => {
  const { api } = setup();
  assert.equal(api.normalizeSchool(rawSchool).name, 'Österfeldschule Grundschule Vaihingen');
  assert.equal(api.normalizeSchool({ ...rawSchool, id: 'andere-schule' }).name, rawSchool.name);
  assert.equal(api.normalizeSchool({ ...rawSchool, name: 'Offiziell neuer Name' }).name, 'Offiziell neuer Name');
});

test('bei Schule plus Ort muessen beide Suchwoerter passen', () => {
  const { api } = setup();
  const schools = [rawSchool,
    { id: 'hegel', name: 'Hegel-Gymnasium Vaihingen', address: 'Krehlstraße 65, 70563 Stuttgart' },
    { id: 'pforzheim', name: 'Osterfeld-Grundschule', address: 'Neßlerstraße 10, 75172 Pforzheim' },
  ].map(record => api.enrichSchoolForSearch(api.normalizeSchool(record)));
  const results = api.filterSchools(schools, 'Oesterfeld Vaihingen');
  assert.deepEqual(Array.from(results, record => record.id), ['BW-129123']);
  assert.deepEqual(Array.from(api.filterSchools(schools, 'Osterfeld Vaihingen'), record => record.id), ['BW-129123']);
  assert.deepEqual(Array.from(api.filterSchools(schools, 'Österfeld Vaihingen'), record => record.id), ['BW-129123']);
  assert.equal(api.normalizeSchool({ id: 'goethe', name: 'Goethe-Schule' }).name, 'Goethe-Schule');
});

test('ein alter Schuldaten-Cache behaelt nicht den defekten Namen und Suchindex', async () => {
  const { api, runtime } = setup();
  api.readCacheEntry = async () => ({ fetchedAt: Date.now(), data: [{ ...rawSchool, adresse: rawSchool.address, search: { name: 'sterfeldschule' } }] });
  const results = await api.loadSchools(runtime);
  assert.equal(results[0].name, 'Österfeldschule Grundschule Vaihingen');
  assert.equal(api.filterSchools(results, 'Oesterfeld Vaihingen')[0]?.id, 'BW-129123');
});
