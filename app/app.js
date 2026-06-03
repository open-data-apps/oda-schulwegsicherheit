const SCHULWEGSAFE_DEFAULTS = {
  title: "Schulwegsicherheit BW",
  center: [48.6616, 9.3501],
  zoom: 9,
  schoolRadiusMeters: 1000,
  routeBufferMeters: 50,
  maxSearchResults: 8,
  maxAddressResults: 5,
  currentYear: 2026,
  geocodingServiceUrl: "https://nominatim.openstreetmap.org/search",
  routingServiceBaseUrl: "https://router.project-osrm.org/route/v1",
};

const SCHULWEGSAFE_RUNTIME = {
  activeRuntime: null,
  assetPromises: {},
};

function app(configdata = {}, enclosingHtmlDivElement) {
  teardownRuntime();

  const runtime = createRuntime(configdata, enclosingHtmlDivElement);
  SCHULWEGSAFE_RUNTIME.activeRuntime = runtime;

  renderShell(runtime);
  bindUi(runtime);
  setStatus(runtime, "info", "Datenquellen werden geladen.");

  initializeRuntime(runtime).catch((error) => {
    handleRuntimeError(runtime, error, "Die App konnte nicht initialisiert werden.");
  });

  return null;
}

function addToHead() {}

function createRuntime(configdata, rootElement) {
  return {
    rootElement,
    config: normalizeConfig(configdata),
    map: null,
    selectedSchool: null,
    startPoint: null,
    startAddressLabel: "",
    routeMode: "foot",
    geocodeTimer: null,
    isLocating: false,
    search: {
      activeSchoolResultIndex: -1,
      visibleSchoolResults: [],
    },
    data: {
      schools: [],
      accidents: [],
      addressResults: [],
      nearbyAccidents: [],
      routeCandidates: [],
    },
    layers: {
      school: null,
      start: null,
      route: null,
      alternatives: [],
      accidents: [],
      heat: null,
    },
    ui: {},
    requestVersion: 0,
    cleanupCallbacks: [],
  };
}

function normalizeConfig(configdata = {}) {
  return {
    titel: String(configdata.titel || SCHULWEGSAFE_DEFAULTS.title).trim() || SCHULWEGSAFE_DEFAULTS.title,
    proxyAktiv: String(configdata.proxyAktiv || "nein").trim().toLowerCase(),
    schoolsDataUrl: String(configdata.schoolsDataUrl || "").trim(),
    accidentDataUrl: String(configdata.accidentDataUrl || "").trim(),
    routeServiceUrl: String(configdata.routeServiceUrl || "").trim(),
  };
}

function teardownRuntime() {
  const runtime = SCHULWEGSAFE_RUNTIME.activeRuntime;
  if (runtime && Array.isArray(runtime.cleanupCallbacks)) {
    runtime.cleanupCallbacks.forEach((cleanup) => cleanup());
    runtime.cleanupCallbacks = [];
  }
  if (runtime?.geocodeTimer) {
    clearTimeout(runtime.geocodeTimer);
  }
  if (runtime && runtime.map && typeof runtime.map.remove === "function") {
    runtime.map.remove();
  }
  SCHULWEGSAFE_RUNTIME.activeRuntime = null;
}

function renderShell(runtime) {
  const appTitle = runtime.config.titel || SCHULWEGSAFE_DEFAULTS.title;
  runtime.rootElement.innerHTML = `
    <section class="sws-app">
      <div class="sws-workbench">
        <div class="sws-commandbar">
          <div class="sws-brand">
            <span class="sws-brand-mark" aria-hidden="true">S</span>
            <div>
              <h2>${escapeHtml(appTitle)}</h2>
              <p>Baden-Wuerttemberg · Schulwege datenbasiert einschaetzen</p>
            </div>
          </div>

          <div class="sws-controls">
            <div class="sws-control sws-control-search">
              <label for="school-search-input">Schule suchen</label>
              <input id="school-search-input" class="form-control" type="search" placeholder="z.B. Oesterfeld Vaihingen oder Grundschule Stuttgart" autocomplete="off" aria-expanded="false" aria-controls="school-search-results" />
              <div id="school-search-results" class="sws-results is-hidden" role="listbox" aria-live="polite"></div>
            </div>

            <div class="sws-control sws-control-address">
              <label for="start-address-input">Startadresse</label>
              <input id="start-address-input" class="form-control" type="search" placeholder="Strasse, Ort oder Haltestelle" autocomplete="off" aria-expanded="false" aria-controls="start-address-results" />
              <div id="start-address-results" class="sws-results is-hidden" role="listbox" aria-live="polite"></div>
            </div>

            <div class="sws-control sws-control-mode">
              <label>Wegtyp</label>
              <div class="sws-mode-toggle" role="group" aria-label="Wegtyp waehlen">
                <button type="button" class="is-active" data-route-mode="foot">Fussweg</button>
                <button type="button" data-route-mode="bike">Rad</button>
                <button type="button" data-route-mode="car">Auto</button>
              </div>
            </div>

            <div class="sws-actions">
              <button type="button" class="btn btn-primary" id="apply-start-button">Route berechnen</button>
              <button type="button" class="btn btn-outline-secondary" id="geo-locate-button" data-default-label="Standort">Standort</button>
            </div>
          </div>

          <div class="sws-score-strip" id="score-summary">
            <div class="sws-score-copy">
              <span class="sws-score-label">Score</span>
              <span class="sws-score-caption">Schule und Startpunkt waehlen</span>
            </div>
            <strong>-</strong>
          </div>
        </div>

        <div id="runtime-status" class="alert alert-info sws-status" role="status">Initialisierung laeuft.</div>

        <div class="sws-map-shell">
          <div id="map-container" class="sws-map" aria-label="Kartenansicht"></div>
          <div class="sws-map-overlay" id="hazard-kpis">
            <span>Keine Daten geladen</span>
          </div>
        </div>

        <div class="sws-detail-grid">
          <section class="sws-panel">
            <h3>Auswahl</h3>
            <div id="school-details" class="sws-muted">Noch keine Schule ausgewaehlt.</div>
          </section>

          <section class="sws-panel">
            <h3>Routenbewertung</h3>
            <div id="route-mode-note" class="sws-muted">Noch keine Bewertung vorhanden.</div>
            <div id="route-score-help" class="sws-score-help">${escapeHtml(getScoreExplanation())}</div>
            <div id="route-alternatives" class="sws-route-list"></div>
          </section>

          <section class="sws-panel sws-panel-wide">
            <h3>Relevante Unfallpunkte</h3>
            <div id="hazard-list" class="sws-muted">Nach der Bewertung erscheinen hier die wichtigsten Punkte im Routenkorridor.</div>
          </section>
        </div>
      </div>
    </section>
  `;

  runtime.ui = {
    schoolSearchInput: runtime.rootElement.querySelector("#school-search-input"),
    schoolSearchResults: runtime.rootElement.querySelector("#school-search-results"),
    schoolDetails: runtime.rootElement.querySelector("#school-details"),
    status: runtime.rootElement.querySelector("#runtime-status"),
    mapContainer: runtime.rootElement.querySelector("#map-container"),
    hazardKpis: runtime.rootElement.querySelector("#hazard-kpis"),
    scoreSummary: runtime.rootElement.querySelector("#score-summary"),
    routeModeNote: runtime.rootElement.querySelector("#route-mode-note"),
    routeScoreHelp: runtime.rootElement.querySelector("#route-score-help"),
    routeAlternatives: runtime.rootElement.querySelector("#route-alternatives"),
    hazardList: runtime.rootElement.querySelector("#hazard-list"),
    startAddressInput: runtime.rootElement.querySelector("#start-address-input"),
    startAddressResults: runtime.rootElement.querySelector("#start-address-results"),
    applyStartButton: runtime.rootElement.querySelector("#apply-start-button"),
    geoLocateButton: runtime.rootElement.querySelector("#geo-locate-button"),
    routeModeButtons: runtime.rootElement.querySelectorAll("[data-route-mode]"),
  };
}

function bindUi(runtime) {
  updateRouteModeButtons(runtime);

  runtime.ui.schoolSearchInput.addEventListener("input", (event) => {
    runtime.search.activeSchoolResultIndex = -1;
    renderSearchResults(runtime, event.target.value);
  });

  runtime.ui.schoolSearchInput.addEventListener("focus", () => {
    if (runtime.ui.schoolSearchInput.value.trim().length >= 2) {
      renderSearchResults(runtime, runtime.ui.schoolSearchInput.value);
    }
  });

  runtime.ui.schoolSearchInput.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hideSearchResults(runtime);
      runtime.ui.schoolSearchInput.blur();
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveSchoolResultSelection(runtime, 1);
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveSchoolResultSelection(runtime, -1);
    }
    if (event.key === "Enter") {
      event.preventDefault();
      selectActiveSchoolResult(runtime);
    }
  });

  const closeSearchOnOutsideClick = (event) => {
    if (!runtime.rootElement.contains(event.target)) {
      hideSearchResults(runtime);
      hideStartAddressResults(runtime);
      return;
    }
    if (!runtime.ui.schoolSearchInput.contains(event.target) && !runtime.ui.schoolSearchResults.contains(event.target)) {
      hideSearchResults(runtime);
    }
    if (!runtime.ui.startAddressInput.contains(event.target) && !runtime.ui.startAddressResults.contains(event.target)) {
      hideStartAddressResults(runtime);
    }
  };
  document.addEventListener("click", closeSearchOnOutsideClick);
  runtime.cleanupCallbacks.push(() => document.removeEventListener("click", closeSearchOnOutsideClick));

  runtime.ui.startAddressInput.addEventListener("input", (event) => {
    runtime.startPoint = null;
    runtime.startAddressLabel = "";
    clearStartMarker(runtime);
    clearRouteVisuals(runtime);
    renderScoreSummary(runtime, null);
    queueAddressSearch(runtime, event.target.value);
  });

  runtime.ui.startAddressInput.addEventListener("focus", () => {
    if (runtime.data.addressResults.length) {
      renderStartAddressResults(runtime, runtime.data.addressResults);
    }
  });

  runtime.ui.startAddressInput.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hideStartAddressResults(runtime);
      runtime.ui.startAddressInput.blur();
    }
    if (event.key === "Enter") {
      event.preventDefault();
      resolveStartAddressAndRoute(runtime).catch((error) => {
        handleRuntimeError(runtime, error, "Die Startadresse konnte nicht ausgewertet werden.");
      });
    }
  });

  runtime.ui.routeModeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      runtime.routeMode = button.dataset.routeMode || "foot";
      updateRouteModeButtons(runtime);
      if (runtime.selectedSchool && runtime.startPoint) {
        evaluateRoute(runtime).catch((error) => {
          handleRuntimeError(runtime, error, "Die Route konnte nicht berechnet werden.");
        });
      }
    });
  });

  runtime.ui.applyStartButton.addEventListener("click", () => {
    hideSearchResults(runtime);
    hideStartAddressResults(runtime);
    resolveStartAddressAndRoute(runtime).catch((error) => {
      handleRuntimeError(runtime, error, "Die Startadresse konnte nicht ausgewertet werden.");
    });
  });

  runtime.ui.geoLocateButton.addEventListener("click", () => {
    handleGeolocationClick(runtime).catch((error) => {
      setGeolocationLoading(runtime, false);
      setStatus(runtime, "warning", getGeolocationErrorMessage(error));
    });
  });
}

async function handleGeolocationClick(runtime) {
  hideSearchResults(runtime);
  hideStartAddressResults(runtime);

  if (runtime.isLocating) {
    return;
  }
  if (!isGeolocationSupported()) {
    setStatus(runtime, "warning", getGeolocationUnavailableMessage());
    return;
  }
  if (!isGeolocationContextAllowed()) {
    setStatus(runtime, "warning", getGeolocationInsecureContextMessage());
    return;
  }

  setGeolocationLoading(runtime, true);
  setStatus(runtime, "info", "Standort wird gesucht. Bitte Browserfreigabe bestaetigen, falls eine Abfrage erscheint.", { loading: true });

  try {
    const permissionState = await getGeolocationPermissionState();
    if (permissionState === "denied") {
      throw { code: 1 };
    }

    let position;
    try {
      position = await getCurrentPositionOnce({
        enableHighAccuracy: false,
        timeout: 12000,
        maximumAge: 120000,
      });
    } catch (firstError) {
      if (firstError.code === 1) {
        throw firstError;
      }
      setStatus(runtime, "info", "Standort noch nicht gefunden. Es wird mit genauerer Ortung erneut versucht.", { loading: true });
      position = await getCurrentPositionOnce({
        enableHighAccuracy: true,
        timeout: 18000,
        maximumAge: 0,
      });
    }

    const latitude = Number(position?.coords?.latitude);
    const longitude = Number(position?.coords?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new Error("Keine gueltigen Standortkoordinaten erhalten.");
    }

    const accuracy = Number(position.coords.accuracy);
    const label = Number.isFinite(accuracy)
      ? `Aktueller Standort (ca. ${Math.round(accuracy)} m genau)`
      : "Aktueller Standort";
    updateStartPoint(runtime, {
      lat: latitude,
      lon: longitude,
      label,
    }, `${label} uebernommen.`);

    if (runtime.selectedSchool) {
      await evaluateRoute(runtime);
    }
  } catch (error) {
    setStatus(runtime, "warning", getGeolocationErrorMessage(error));
  } finally {
    setGeolocationLoading(runtime, false);
  }
}

async function initializeRuntime(runtime) {
  validateConfig(runtime.config);
  await ensureMapAssets();
  createMap(runtime);

  const [schools, accidents] = await Promise.all([
    loadSchools(runtime),
    loadAccidentAtlas(runtime),
  ]);

  runtime.data.schools = schools;
  runtime.data.accidents = accidents;

  hideSearchResults(runtime);
  renderHazardKpis(runtime, []);
  setStatus(runtime, "success", `${schools.length} eindeutige Schulen und ${accidents.length} schulwegrelevante Unfallpunkte geladen.`);
}

function validateConfig(config) {
  if (!config.schoolsDataUrl) {
    throw new Error("Konfiguration schoolsDataUrl fehlt.");
  }
  if (!config.accidentDataUrl) {
    throw new Error("Konfiguration accidentDataUrl fehlt.");
  }
}

function createMap(runtime) {
  const L = requireLeaflet();

  runtime.map = L.map(runtime.ui.mapContainer, {
    zoomControl: true,
    scrollWheelZoom: true,
  }).setView(SCHULWEGSAFE_DEFAULTS.center, SCHULWEGSAFE_DEFAULTS.zoom);

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap-Mitwirkende",
  }).addTo(runtime.map);

  runtime.map.on("click", (event) => {
    updateStartPoint(runtime, { lat: event.latlng.lat, lon: event.latlng.lng, label: "Startpunkt aus Karte" }, "Startpunkt in der Karte gesetzt.");
    if (runtime.selectedSchool) {
      evaluateRoute(runtime).catch((error) => {
        handleRuntimeError(runtime, error, "Die Route konnte nicht berechnet werden.");
      });
    }
  });
}

async function loadSchools(runtime) {
  const payload = await fetchJsonResource(runtime.config.schoolsDataUrl, runtime.config);
  const rawSchools = Array.isArray(payload) ? payload : payload.schools || payload.data || payload.results;

  if (!Array.isArray(rawSchools)) {
    throw new Error("Schuldaten muessen als Array oder als Objekt mit schools/data/results bereitgestellt werden.");
  }

  const schools = rawSchools
    .map(normalizeSchool)
    .filter((school) => school && school.id && school.name && Number.isFinite(school.lat) && Number.isFinite(school.lon))
    .map((school) => ({ ...school, id: String(school.id) }));

  return deduplicateSchools(schools)
    .map(enrichSchoolForSearch)
    .sort((left, right) => left.name.localeCompare(right.name, "de"));
}

function normalizeSchool(rawSchool = {}) {
  const source = rawSchool.fields && typeof rawSchool.fields === "object" ? { ...rawSchool, ...rawSchool.fields } : rawSchool;
  const lat = pickNumber(source, ["lat", "latitude", "y", "YGCSWGS84", "geo_lat", "position_lat"]);
  const lon = pickNumber(source, ["lon", "lng", "long", "longitude", "x", "XGCSWGS84", "geo_lon", "position_lon"]);
  const geo = source.geo || source.location || source.koordinaten || source.coordinates;

  let geoLat = lat;
  let geoLon = lon;
  if ((!Number.isFinite(geoLat) || !Number.isFinite(geoLon)) && Array.isArray(geo)) {
    if (geo.length >= 2) {
      geoLon = Number(geo[0]);
      geoLat = Number(geo[1]);
    }
  }

  const id = pickString(source, ["id", "_id", "slug", "schulnummer", "nummer", "uuid"]) || stableSchoolId(source);

  return {
    id,
    name: pickString(source, ["name", "school_name", "schulname", "bezeichnung", "titel"]),
    adresse: pickString(source, ["adresse", "address", "strasse", "street"]),
    plz: pickString(source, ["plz", "zip", "postcode", "postleitzahl"]),
    ort: pickString(source, ["ort", "city", "stadt", "gemeinde"]),
    schulform: pickString(source, ["schulform", "type", "school_type", "schulart", "art"]),
    lat: geoLat,
    lon: geoLon,
  };
}

async function loadAccidentAtlas(runtime) {
  await ensureJsZip();
  const buffer = await fetchBinaryResource(runtime.config.accidentDataUrl, runtime.config);
  const zip = await JSZip.loadAsync(buffer);
  const csvFile = Object.values(zip.files).find((file) => !file.dir && /\.csv$/i.test(file.name));

  if (!csvFile) {
    throw new Error("Im Unfallatlas-ZIP wurde keine CSV-Datei gefunden.");
  }

  const csvText = await csvFile.async("string");
  return parseCsv(csvText)
    .map(normalizeAccident)
    .filter(isSchoolRouteRelevantAccident);
}

function normalizeAccident(row) {
  const lat = pickNumber(row, ["YGCSWGS84", "lat", "Lat", "LAT"]);
  const lon = pickNumber(row, ["XGCSWGS84", "lon", "Lon", "LON", "lng"]);
  const jahr = pickInteger(row, ["UJAHR", "jahr"]);
  const wochentag = pickInteger(row, ["UWOCHENTAG", "wochentag"]);
  const stunde = pickInteger(row, ["USTUNDE", "stunde"]);

  return {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [lon, lat],
    },
    properties: {
      jahr,
      wochentag,
      stunde,
      ist_rad: toBooleanFlag(row.IstRad ?? row.ist_rad),
      ist_fuss: toBooleanFlag(row.IstFuss ?? row.ist_fuss),
      ist_kind: toBooleanFlag(row.IstKind ?? row.ist_kind),
      gewicht_basis: 1,
      titel: buildAccidentTitle(row),
    },
  };
}

function isSchoolRouteRelevantAccident(accident) {
  const { properties } = accident;
  const [lon, lat] = accident.geometry.coordinates;
  const isWeekday = properties.wochentag >= 2 && properties.wochentag <= 6;
  const isSchoolTime = (properties.stunde >= 7 && properties.stunde <= 8) || (properties.stunde >= 15 && properties.stunde <= 17);
  return Number.isFinite(lat) && Number.isFinite(lon) && isWeekday && isSchoolTime && (properties.ist_fuss || properties.ist_rad);
}

function renderSearchResults(runtime, query) {
  const normalizedQuery = String(query || "").trim();
  if (normalizedQuery.length < 2) {
    hideSearchResults(runtime);
    return;
  }

  const schools = filterSchools(runtime.data.schools, query).slice(0, SCHULWEGSAFE_DEFAULTS.maxSearchResults);
  runtime.search.visibleSchoolResults = schools;
  if (runtime.search.activeSchoolResultIndex >= schools.length) {
    runtime.search.activeSchoolResultIndex = schools.length - 1;
  }
  runtime.ui.schoolSearchResults.classList.remove("is-hidden");
  runtime.ui.schoolSearchInput.setAttribute("aria-expanded", "true");

  if (!schools.length) {
    runtime.search.activeSchoolResultIndex = -1;
    runtime.ui.schoolSearchResults.innerHTML = `
      <div class="sws-result-empty">
        <strong>Keine passende Schule gefunden.</strong>
        <span>Versuche Name plus Ort, z.B. "Grundschule Stuttgart" oder "Vaihingen Oesterfeld".</span>
      </div>
    `;
    return;
  }

  runtime.ui.schoolSearchResults.innerHTML = schools
    .map((school, index) => `
      <button type="button" class="sws-result-button ${index === runtime.search.activeSchoolResultIndex ? "is-active" : ""}" data-school-id="${escapeHtml(school.id)}" data-result-index="${index}" id="school-result-${index}" role="option" aria-selected="${index === runtime.search.activeSchoolResultIndex ? "true" : "false"}">
        <strong>${escapeHtml(school.name)}</strong>
        <span>${escapeHtml([school.ort, school.schulform].filter(Boolean).join(" · "))}</span>
        <small>${escapeHtml([school.adresse, school.plz, school.ort].filter(Boolean).join(", "))}</small>
      </button>
    `)
    .join("");

  runtime.ui.schoolSearchResults.querySelectorAll("[data-school-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const school = runtime.data.schools.find((entry) => entry.id === button.dataset.schoolId);
      if (school) {
        selectSchoolFromSearch(runtime, school);
      }
    });
  });
}

function hideSearchResults(runtime) {
  if (!runtime?.ui?.schoolSearchResults) return;
  runtime.ui.schoolSearchResults.innerHTML = "";
  runtime.ui.schoolSearchResults.classList.add("is-hidden");
  runtime.ui.schoolSearchInput?.setAttribute("aria-expanded", "false");
  runtime.ui.schoolSearchInput?.removeAttribute("aria-activedescendant");
  runtime.search.visibleSchoolResults = [];
  runtime.search.activeSchoolResultIndex = -1;
}

function moveSchoolResultSelection(runtime, direction) {
  if (!runtime.search.visibleSchoolResults.length) {
    renderSearchResults(runtime, runtime.ui.schoolSearchInput.value);
  }
  const resultCount = runtime.search.visibleSchoolResults.length;
  if (!resultCount) {
    return;
  }

  runtime.search.activeSchoolResultIndex = (runtime.search.activeSchoolResultIndex + direction + resultCount) % resultCount;
  renderSearchResults(runtime, runtime.ui.schoolSearchInput.value);
  runtime.ui.schoolSearchInput.setAttribute("aria-activedescendant", `school-result-${runtime.search.activeSchoolResultIndex}`);
}

function selectActiveSchoolResult(runtime) {
  if (!runtime.search.visibleSchoolResults.length) {
    renderSearchResults(runtime, runtime.ui.schoolSearchInput.value);
  }
  const selectedSchool = runtime.search.visibleSchoolResults[runtime.search.activeSchoolResultIndex]
    || runtime.search.visibleSchoolResults[0];
  if (selectedSchool) {
    selectSchoolFromSearch(runtime, selectedSchool);
  }
}

function selectSchoolFromSearch(runtime, school) {
  runtime.ui.schoolSearchInput.value = [school.name, school.ort].filter(Boolean).join(", ");
  hideSearchResults(runtime);
  selectSchool(runtime, school).catch((error) => {
    handleRuntimeError(runtime, error, "Die Schule konnte nicht ausgewertet werden.");
  });
}

function queueAddressSearch(runtime, query) {
  if (runtime.geocodeTimer) {
    clearTimeout(runtime.geocodeTimer);
  }

  const normalizedQuery = String(query || "").trim();
  if (normalizedQuery.length < 4) {
    runtime.data.addressResults = [];
    hideStartAddressResults(runtime);
    return;
  }

  runtime.geocodeTimer = setTimeout(() => {
    searchStartAddress(runtime, normalizedQuery).catch((error) => {
      setStatus(runtime, "warning", `Adresssuche nicht erreichbar: ${error.message}`);
    });
  }, 450);
}

async function searchStartAddress(runtime, query) {
  const results = await fetchAddressCandidates(query, runtime.selectedSchool);
  runtime.data.addressResults = results;
  renderStartAddressResults(runtime, results);
  return results;
}

async function resolveStartAddressAndRoute(runtime) {
  if (!runtime.selectedSchool) {
    setStatus(runtime, "warning", "Bitte zuerst eine Schule auswaehlen.");
    return;
  }

  const query = runtime.ui.startAddressInput.value.trim();
  if (!runtime.startPoint || (query && query !== runtime.startAddressLabel)) {
    if (query.length < 4) {
      setStatus(runtime, "warning", "Bitte eine Startadresse eingeben oder den Standort-Button nutzen.");
      return;
    }
    const results = await searchStartAddress(runtime, query);
    if (!results.length) {
      setStatus(runtime, "warning", "Fuer diese Startadresse wurde kein Treffer gefunden.");
      return;
    }
    selectStartAddress(runtime, results[0], "Startadresse gefunden. Route wird berechnet.");
  }

  await evaluateRoute(runtime);
}

async function fetchAddressCandidates(query, selectedSchool) {
  const searchQuery = selectedSchool?.ort && !query.toLowerCase().includes(selectedSchool.ort.toLowerCase())
    ? `${query}, ${selectedSchool.ort}, Baden-Wuerttemberg`
    : `${query}, Baden-Wuerttemberg`;
  const url = new URL(SCHULWEGSAFE_DEFAULTS.geocodingServiceUrl);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", String(SCHULWEGSAFE_DEFAULTS.maxAddressResults));
  url.searchParams.set("countrycodes", "de");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("q", searchQuery);

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const payload = await response.json();
  if (!Array.isArray(payload)) {
    return [];
  }
  return payload
    .map(normalizeAddressCandidate)
    .filter((candidate) => Number.isFinite(candidate.lat) && Number.isFinite(candidate.lon));
}

function normalizeAddressCandidate(candidate = {}) {
  const address = candidate.address || {};
  const labelParts = [
    address.road || address.pedestrian || address.footway || address.cycleway || address.neighbourhood,
    address.house_number,
    address.suburb || address.village || address.town || address.city,
    address.postcode,
  ].filter(Boolean);
  return {
    label: labelParts.length ? labelParts.join(" ") : String(candidate.display_name || "Adresse"),
    detail: String(candidate.display_name || ""),
    lat: Number(candidate.lat),
    lon: Number(candidate.lon),
  };
}

function renderStartAddressResults(runtime, results = []) {
  if (!results.length) {
    hideStartAddressResults(runtime);
    return;
  }
  runtime.ui.startAddressResults.classList.remove("is-hidden");
  runtime.ui.startAddressInput.setAttribute("aria-expanded", "true");
  runtime.ui.startAddressResults.innerHTML = results
    .map((candidate, index) => `
      <button type="button" class="sws-result-button" data-address-index="${index}">
        <strong>${escapeHtml(candidate.label)}</strong>
        <span>${escapeHtml(candidate.detail)}</span>
      </button>
    `)
    .join("");

  runtime.ui.startAddressResults.querySelectorAll("[data-address-index]").forEach((button) => {
    button.addEventListener("click", () => {
      const candidate = runtime.data.addressResults[Number(button.dataset.addressIndex)];
      if (candidate) {
        selectStartAddress(runtime, candidate, "Startadresse uebernommen.");
        evaluateRoute(runtime).catch((error) => {
          handleRuntimeError(runtime, error, "Die Route konnte nicht berechnet werden.");
        });
      }
    });
  });
}

function selectStartAddress(runtime, candidate, message) {
  updateStartPoint(runtime, {
    lat: candidate.lat,
    lon: candidate.lon,
    label: candidate.label,
  }, message);
  runtime.ui.startAddressInput.value = candidate.label;
  hideStartAddressResults(runtime);
}

function hideStartAddressResults(runtime) {
  if (!runtime?.ui?.startAddressResults) return;
  runtime.ui.startAddressResults.innerHTML = "";
  runtime.ui.startAddressResults.classList.add("is-hidden");
  runtime.ui.startAddressInput?.setAttribute("aria-expanded", "false");
}

function filterSchools(schools = [], query = "") {
  const queryProfile = buildSearchQueryProfile(query);
  if (!queryProfile.groups.length) {
    return [];
  }

  return schools
    .map((school) => ({
      school,
      rank: getSchoolSearchRank(school, queryProfile),
    }))
    .filter((entry) => entry.rank < 900)
    .sort((left, right) => left.rank - right.rank
      || String(left.school.ort || "").localeCompare(String(right.school.ort || ""), "de")
      || left.school.name.localeCompare(right.school.name, "de")
      || String(left.school.adresse || "").localeCompare(String(right.school.adresse || ""), "de"))
    .map((entry) => entry.school);
}

function getSchoolSearchRank(school, queryProfile) {
  const search = school.search || buildSchoolSearchIndex(school);
  let score = 0;
  let missedTerms = 0;

  queryProfile.groups.forEach((group) => {
    const termScore = getBestSchoolTermScore(search, group);
    if (termScore >= 80) {
      missedTerms += 1;
      score += 95;
    } else {
      score += termScore;
    }
  });

  if (queryProfile.groups.length === 1 && missedTerms > 0) {
    return 999;
  }
  if (queryProfile.groups.length > 1 && missedTerms > 1) {
    return 999;
  }

  score += getSchoolPhraseBoost(search, queryProfile);
  score += Math.min(18, Math.round(String(school.name || "").length / 8));
  return Math.max(0, score);
}

function getBestSchoolTermScore(search, termGroup) {
  return termGroup.reduce((bestScore, term) => Math.min(bestScore, getSingleSchoolTermScore(search, term)), 999);
}

function getSingleSchoolTermScore(search, term) {
  const fields = [
    { field: search.name, exact: 0, prefix: 4, contains: 12, fuzzy: 18 },
    { field: search.city, exact: 7, prefix: 10, contains: 18, fuzzy: 24 },
    { field: search.address, exact: 14, prefix: 18, contains: 26, fuzzy: 34 },
    { field: search.zip, exact: 12, prefix: 16, contains: 28, fuzzy: 60 },
    { field: search.type, exact: 16, prefix: 20, contains: 28, fuzzy: 36 },
  ];

  return fields.reduce((bestScore, config) => {
    const fieldScore = getFieldTermScore(config.field, term, config);
    return Math.min(bestScore, fieldScore);
  }, 999);
}

function getFieldTermScore(field, term, config) {
  if (!term || !field?.tokens?.length) {
    return 999;
  }
  if (field.tokens.includes(term)) {
    return config.exact;
  }
  if (field.tokens.some((token) => token.startsWith(term))) {
    return config.prefix;
  }
  if (field.text.includes(term) || field.compactText.includes(term)) {
    return config.contains;
  }
  if (term.length >= 4 && field.tokens.some((token) => isLikelySameSearchToken(term, token))) {
    return config.fuzzy;
  }
  return 999;
}

function getSchoolPhraseBoost(search, queryProfile) {
  const queries = [queryProfile.normalized, queryProfile.compact].filter(Boolean);
  let boost = 0;

  queries.forEach((query) => {
    if (query.length < 3) {
      return;
    }
    if (search.name.text.startsWith(query) || search.name.compactText.startsWith(query)) {
      boost -= 35;
    } else if (search.name.text.includes(query) || search.name.compactText.includes(query)) {
      boost -= 24;
    }
    if (search.city.text === query || search.city.compactText === query) {
      boost -= 12;
    }
    if (search.address.text.includes(query) || search.address.compactText.includes(query)) {
      boost -= 8;
    }
  });

  return boost;
}

function deduplicateSchools(schools = []) {
  const result = [];
  const seen = new Map();

  schools.forEach((school) => {
    const keys = getSchoolDuplicateKeys(school);
    const existing = keys.map((key) => seen.get(key)).find(Boolean);

    if (existing) {
      mergeSchoolRecord(existing, school);
      getSchoolDuplicateKeys(existing).forEach((key) => seen.set(key, existing));
      return;
    }

    result.push(school);
    keys.forEach((key) => seen.set(key, school));
  });

  return result;
}

function getSchoolDuplicateKeys(school) {
  const name = normalizeSearchText(school.name);
  const address = normalizeSearchText(school.adresse);
  const city = normalizeSearchText(school.ort);
  const zip = normalizeSearchText(school.plz);
  const roundedLat = Number.isFinite(school.lat) ? school.lat.toFixed(5) : "";
  const roundedLon = Number.isFinite(school.lon) ? school.lon.toFixed(5) : "";

  return [
    school.id ? `id:${school.id}` : "",
    name && address && city ? `address:${name}|${address}|${zip}|${city}` : "",
    name && roundedLat && roundedLon ? `coord:${name}|${roundedLat}|${roundedLon}` : "",
  ].filter(Boolean);
}

function mergeSchoolRecord(target, source) {
  ["name", "adresse", "plz", "ort"].forEach((key) => {
    if (!target[key] && source[key]) {
      target[key] = source[key];
    }
  });

  target.schulform = mergeLabelList(target.schulform, source.schulform);
  if (!Number.isFinite(target.lat) && Number.isFinite(source.lat)) {
    target.lat = source.lat;
  }
  if (!Number.isFinite(target.lon) && Number.isFinite(source.lon)) {
    target.lon = source.lon;
  }
}

function mergeLabelList(left, right) {
  const labels = [];
  [left, right].forEach((value) => {
    String(value || "")
      .split(/\s*[/,;]\s*/)
      .map((entry) => entry.trim())
      .filter(Boolean)
      .forEach((entry) => {
        if (!labels.some((label) => normalizeSearchText(label) === normalizeSearchText(entry))) {
          labels.push(entry);
        }
      });
  });
  return labels.join(" / ");
}

function enrichSchoolForSearch(school) {
  return {
    ...school,
    search: buildSchoolSearchIndex(school),
  };
}

function buildSchoolSearchIndex(school) {
  return {
    name: buildSearchField(school.name),
    city: buildSearchField(school.ort),
    address: buildSearchField(school.adresse),
    zip: buildSearchField(school.plz),
    type: buildSearchField(school.schulform),
  };
}

function buildSearchQueryProfile(query) {
  const normalized = normalizeSearchText(query);
  const compact = compactSearchText(query);
  const baseTerms = splitSearchTerms(normalized);
  const compactTerms = splitSearchTerms(compact);
  const groups = baseTerms.map((term, index) => uniqueValues([
    term,
    compactTerms[index],
    ...expandSchoolSearchTerm(term),
    ...expandSchoolSearchTerm(compactTerms[index]),
  ].filter(Boolean)));

  return {
    normalized,
    compact,
    groups: groups.filter((group) => group.length),
  };
}

function buildSearchField(value) {
  const normalized = normalizeSearchText(value);
  const compact = compactSearchText(value);
  return {
    text: normalized,
    compactText: compact,
    tokens: uniqueValues([
      ...splitSearchTerms(normalized),
      ...splitSearchTerms(compact),
    ]),
  };
}

function splitSearchTerms(value) {
  return String(value || "").split(/\s+/).map((term) => term.trim()).filter(Boolean);
}

function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " und ")
    .replace(/\bstr\./g, " strasse ")
    .replace(/\bst\./g, " sankt ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactSearchText(value) {
  return normalizeSearchText(value)
    .replace(/ae/g, "a")
    .replace(/oe/g, "o")
    .replace(/ue/g, "u")
    .replace(/\bstrasse\b/g, "str")
    .replace(/\s+/g, " ")
    .trim();
}

function expandSchoolSearchTerm(term) {
  const expansions = {
    gs: ["grundschule", "grund"],
    grund: ["grundschule"],
    gym: ["gymnasium"],
    gymn: ["gymnasium"],
    rs: ["realschule"],
    real: ["realschule"],
    gms: ["gemeinschaftsschule"],
    gemein: ["gemeinschaftsschule"],
    fos: ["fachoberschule"],
    bs: ["berufsschule"],
    beruf: ["berufsschule"],
    sonder: ["sonderpaedagogisch"],
  };
  return expansions[term] || [];
}

function isLikelySameSearchToken(term, token) {
  if (!term || !token) {
    return false;
  }
  if (token.startsWith(term) || term.startsWith(token)) {
    return true;
  }
  if (!haveCompatibleFuzzyPrefix(term, token)) {
    return false;
  }
  const maxDistance = Math.max(1, Math.min(2, Math.floor(Math.max(term.length, token.length) / 5)));
  if (Math.abs(term.length - token.length) > maxDistance) {
    return false;
  }
  return levenshteinDistance(term, token, maxDistance) <= maxDistance;
}

function haveCompatibleFuzzyPrefix(term, token) {
  const left = String(term || "").slice(0, 2);
  const right = String(token || "").slice(0, 2);
  if (left.length < 2 || right.length < 2) {
    return left === right;
  }
  return left === right;
}

function levenshteinDistance(left, right, maxDistance = 3) {
  const leftLength = left.length;
  const rightLength = right.length;
  if (Math.abs(leftLength - rightLength) > maxDistance) {
    return maxDistance + 1;
  }

  let previous = Array.from({ length: rightLength + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= leftLength; leftIndex += 1) {
    const current = [leftIndex];
    let rowMinimum = current[0];

    for (let rightIndex = 1; rightIndex <= rightLength; rightIndex += 1) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      const value = Math.min(
        previous[rightIndex] + 1,
        current[rightIndex - 1] + 1,
        previous[rightIndex - 1] + substitutionCost,
      );
      current[rightIndex] = value;
      rowMinimum = Math.min(rowMinimum, value);
    }

    if (rowMinimum > maxDistance) {
      return maxDistance + 1;
    }
    previous = current;
  }

  return previous[rightLength];
}

function uniqueValues(values) {
  return Array.from(new Set(values.filter((value) => value !== undefined && value !== null && String(value).trim()).map(String)));
}

async function selectSchool(runtime, school) {
  runtime.selectedSchool = school;
  runtime.requestVersion += 1;
  const currentRequest = runtime.requestVersion;

  renderSchoolDetails(runtime, school);
  syncSchoolMarker(runtime);
  clearRouteVisuals(runtime);
  clearAccidentLayers(runtime);
  renderScoreSummary(runtime, null);
  setStatus(runtime, "info", `Unfallpunkte im Umkreis von ${school.name} werden gefiltert.`);

  const nearbyAccidents = runtime.data.accidents.filter((accident) => {
    const [lon, lat] = accident.geometry.coordinates;
    return distanceBetweenPoints(school.lat, school.lon, lat, lon) <= SCHULWEGSAFE_DEFAULTS.schoolRadiusMeters;
  });

  if (currentRequest !== runtime.requestVersion) {
    return;
  }

  runtime.data.nearbyAccidents = nearbyAccidents;
  renderAccidentsOnMap(runtime, nearbyAccidents);
  renderHazardKpis(runtime, nearbyAccidents);

  if (runtime.map) {
    runtime.map.setView([school.lat, school.lon], 15);
  }

  setStatus(runtime, "success", `${nearbyAccidents.length} schulwegrelevante Unfallpunkte im 1-km-Umkreis.`);

  if (runtime.startPoint) {
    await evaluateRoute(runtime);
  }
}

function renderSchoolDetails(runtime, school) {
  runtime.ui.schoolDetails.innerHTML = `
    <dl class="sws-definition-list">
      <dt>Schule</dt>
      <dd>${escapeHtml(school.name)}</dd>
      <dt>Adresse</dt>
      <dd>${escapeHtml([school.adresse, school.plz, school.ort].filter(Boolean).join(", ") || "Nicht hinterlegt")}</dd>
      <dt>Schulform</dt>
      <dd>${escapeHtml(school.schulform || "Nicht hinterlegt")}</dd>
    </dl>
  `;
}

function renderAccidentsOnMap(runtime, accidents) {
  const L = requireLeaflet();
  clearAccidentLayers(runtime);

  accidents.forEach((accident) => {
    const latLng = [accident.geometry.coordinates[1], accident.geometry.coordinates[0]];
    const weight = getHazardWeight(accident.properties, SCHULWEGSAFE_DEFAULTS.currentYear);
    const marker = L.circleMarker(latLng, {
      radius: Math.max(4, Math.min(10, 3 + weight)),
      color: "#9f1239",
      weight: 1,
      fillColor: "#ef4444",
      fillOpacity: 0.45,
    }).addTo(runtime.map);

    marker.bindPopup(renderAccidentPopup(accident, weight));
    runtime.layers.accidents.push(marker);
  });

  if (globalThis.L && typeof globalThis.L.heatLayer === "function" && accidents.length) {
    runtime.layers.heat = globalThis.L.heatLayer(
      accidents.map((accident) => [
        accident.geometry.coordinates[1],
        accident.geometry.coordinates[0],
        getHazardWeight(accident.properties, SCHULWEGSAFE_DEFAULTS.currentYear) / 3,
      ]),
      { radius: 22, blur: 18, maxZoom: 17 },
    ).addTo(runtime.map);
  }
}

function renderAccidentPopup(accident, weight) {
  return `
    <div class="sws-popup">
      <strong>${escapeHtml(accident.properties.titel || "Unfallpunkt")}</strong>
      <div>Score-Gewicht: ${weight.toFixed(1)}</div>
      <div>Jahr: ${escapeHtml(String(accident.properties.jahr || ""))}</div>
      <div>Stunde: ${escapeHtml(String(accident.properties.stunde || ""))}</div>
    </div>
  `;
}

function clearAccidentLayers(runtime) {
  runtime.layers.accidents.forEach((layer) => layer.remove());
  runtime.layers.accidents = [];

  if (runtime.layers.heat && runtime.map) {
    runtime.map.removeLayer(runtime.layers.heat);
    runtime.layers.heat = null;
  }
}

function renderHazardKpis(runtime, accidents) {
  const childCount = accidents.filter((accident) => accident.properties.ist_kind).length;
  const walkCount = accidents.filter((accident) => accident.properties.ist_fuss).length;
  const bikeCount = accidents.filter((accident) => accident.properties.ist_rad).length;

  runtime.ui.hazardKpis.innerHTML = `
    <span>${accidents.length} Punkte im Umfeld</span>
    <span>${walkCount} Fuss</span>
    <span>${bikeCount} Rad</span>
    <span>${childCount} Kinder</span>
  `;
}

function updateRouteModeButtons(runtime) {
  runtime.ui.routeModeButtons.forEach((button) => {
    const isActive = button.dataset.routeMode === runtime.routeMode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function updateStartPoint(runtime, startPoint, message) {
  runtime.startPoint = {
    lat: Number(startPoint.lat),
    lon: Number(startPoint.lon),
  };
  runtime.startAddressLabel = String(startPoint.label || "Startpunkt").trim();

  if (runtime.ui.startAddressInput && runtime.startAddressLabel) {
    runtime.ui.startAddressInput.value = runtime.startAddressLabel;
  }
  syncStartMarker(runtime);
  setStatus(runtime, "success", message);
}

function syncSchoolMarker(runtime) {
  const L = requireLeaflet();
  if (!runtime.map || !runtime.selectedSchool) {
    return;
  }
  if (runtime.layers.school) {
    runtime.layers.school.remove();
  }
  runtime.layers.school = L.marker([runtime.selectedSchool.lat, runtime.selectedSchool.lon], {
    title: runtime.selectedSchool.name,
  }).addTo(runtime.map);
}

function syncStartMarker(runtime) {
  const L = requireLeaflet();
  if (!runtime.map) {
    return;
  }
  if (runtime.layers.start) {
    runtime.layers.start.remove();
  }
  runtime.layers.start = L.circleMarker([runtime.startPoint.lat, runtime.startPoint.lon], {
    radius: 7,
    color: "#1d4ed8",
    fillColor: "#38bdf8",
    fillOpacity: 0.9,
    weight: 2,
  }).addTo(runtime.map);
}

function clearStartMarker(runtime) {
  if (runtime.layers.start) {
    runtime.layers.start.remove();
    runtime.layers.start = null;
  }
}

async function evaluateRoute(runtime) {
  if (!runtime.selectedSchool || !runtime.startPoint) {
    return;
  }

  clearRouteVisuals(runtime);
  setStatus(runtime, "info", `${getRouteModeLabel(runtime.routeMode)} wird berechnet.`);

  let routes = [];
  try {
    const routePayload = await fetchRouteService(runtime.config.routeServiceUrl, runtime.startPoint, runtime.selectedSchool, runtime.routeMode);
    routes = normalizeRouteCandidates(routePayload);
  } catch (error) {
    renderScoreSummary(runtime, null);
    setStatus(runtime, "warning", `Der Routingdienst konnte keine ${getRouteModeLabel(runtime.routeMode)} berechnen: ${error.message}`);
    return;
  }

  if (!routes.length) {
    renderScoreSummary(runtime, null);
    setStatus(runtime, "warning", `Der Routingdienst hat keine ${getRouteModeLabel(runtime.routeMode)} geliefert.`);
    return;
  }

  const scoredRoutes = routes.map((route) => ({
    ...route,
    scoreResult: calculateRouteHazardScore(route.coordinates, runtime.data.nearbyAccidents, {
      currentYear: SCHULWEGSAFE_DEFAULTS.currentYear,
      hazardBufferMeters: SCHULWEGSAFE_DEFAULTS.routeBufferMeters,
    }),
  })).sort((left, right) => left.scoreResult.score - right.scoreResult.score);

  runtime.data.routeCandidates = scoredRoutes;
  renderRouteVisuals(runtime, scoredRoutes);
  renderScoreSummary(runtime, { selected: scoredRoutes[0], alternatives: scoredRoutes, modeLabel: `${getRouteModeLabel(runtime.routeMode)} mit Routing` });
  setStatus(runtime, "success", `${getRouteModeLabel(runtime.routeMode)} bewertet.`);
}

function normalizeRouteCandidates(payload) {
  if (!payload) {
    return [];
  }
  if (payload.type === "FeatureCollection" && Array.isArray(payload.features)) {
    return payload.features.map((feature, index) => normalizeRouteFeature(feature, index)).filter(Boolean);
  }
  if (Array.isArray(payload.routes)) {
    return payload.routes
      .map((route, index) => {
        if (route.type === "Feature") {
          return normalizeRouteFeature(route, index);
        }
        if (route.geojson?.type === "Feature") {
          return normalizeRouteFeature(route.geojson, index);
        }
        if (route.geometry?.coordinates) {
          const distance = Number(route.distance || route.summary?.distance || 0);
          const duration = Number(route.duration || route.summary?.duration || 0);
          return {
            id: route.id || `route-${index + 1}`,
            label: route.label || `${index === 0 ? "Empfohlene Route" : `Alternative ${index + 1}`}`,
            coordinates: route.geometry.coordinates,
            distance,
            duration,
            source: route.source || "routing",
          };
        }
        return null;
      })
      .filter(Boolean);
  }
  return [];
}

function normalizeRouteFeature(feature, index) {
  const coordinates = feature?.geometry?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return null;
  }
  return {
    id: feature?.properties?.id || `route-${index + 1}`,
    label: feature?.properties?.label || `Alternative ${index + 1}`,
    coordinates,
    distance: Number(feature?.properties?.summary?.distance || feature?.properties?.distance || 0),
    duration: Number(feature?.properties?.summary?.duration || feature?.properties?.duration || 0),
    source: "service",
  };
}

function renderRouteVisuals(runtime, scoredRoutes) {
  const L = requireLeaflet();
  clearRouteVisuals(runtime);

  scoredRoutes.slice(1).forEach((route) => {
    const layer = L.polyline(route.coordinates.map((coordinate) => [coordinate[1], coordinate[0]]), {
      color: "#64748b",
      weight: 4,
      opacity: 0.45,
      dashArray: "8 8",
    }).addTo(runtime.map);
    runtime.layers.alternatives.push(layer);
  });

  const bestRoute = scoredRoutes[0];
  runtime.layers.route = L.polyline(bestRoute.coordinates.map((coordinate) => [coordinate[1], coordinate[0]]), {
    color: "#2563eb",
    weight: 6,
    opacity: 0.9,
  }).addTo(runtime.map);

  const bounds = bestRoute.coordinates.map((coordinate) => [coordinate[1], coordinate[0]]);
  if (runtime.startPoint) {
    bounds.push([runtime.startPoint.lat, runtime.startPoint.lon]);
  }
  if (runtime.selectedSchool) {
    bounds.push([runtime.selectedSchool.lat, runtime.selectedSchool.lon]);
  }
  if (bounds.length >= 2) {
    runtime.map.fitBounds(bounds, { padding: [40, 40] });
  }
}

function clearRouteVisuals(runtime) {
  if (runtime.layers.route) {
    runtime.layers.route.remove();
    runtime.layers.route = null;
  }
  runtime.layers.alternatives.forEach((layer) => layer.remove());
  runtime.layers.alternatives = [];
}

function renderScoreSummary(runtime, payload) {
  if (!payload || !payload.selected) {
    runtime.ui.scoreSummary.innerHTML = `
      <div class="sws-score-copy">
        <span class="sws-score-label">Score</span>
        <span class="sws-score-caption">Schule und Startpunkt waehlen</span>
      </div>
      <strong>-</strong>
    `;
    runtime.ui.routeModeNote.textContent = "Noch keine Bewertung vorhanden.";
    renderScoreGuide(runtime, null);
    runtime.ui.routeAlternatives.innerHTML = "";
    runtime.ui.hazardList.textContent = "Nach der Bewertung erscheinen hier die wichtigsten Punkte im Routenkorridor.";
    return;
  }

  const bestRoute = payload.selected;
  const scoreLabel = getCompactScoreLabel(payload.modeLabel);
  runtime.ui.scoreSummary.innerHTML = `
    <div class="sws-score-copy">
      <span class="sws-score-label">${escapeHtml(scoreLabel)}</span>
      <span class="sws-score-caption">${capitalize(bestRoute.scoreResult.level)} · ${bestRoute.scoreResult.hits.length} Punkte</span>
    </div>
    <strong>${bestRoute.scoreResult.score.toFixed(1)}</strong>
  `;
  runtime.ui.routeModeNote.textContent = `${payload.modeLabel}: ${bestRoute.label}, ${formatDistance(bestRoute.distance)}${bestRoute.duration ? `, ca. ${formatDuration(bestRoute.duration)}` : ""}.`;
  renderScoreGuide(runtime, bestRoute.scoreResult);
  runtime.ui.routeAlternatives.innerHTML = payload.alternatives
    .map((route, index) => `
      <div class="sws-route-item ${index === 0 ? "is-best" : ""}">
        <strong>${escapeHtml(route.label)}</strong>
        <span>${formatDistance(route.distance)} · Score ${route.scoreResult.score.toFixed(1)} · ${capitalize(route.scoreResult.level)}</span>
      </div>
    `)
    .join("");
  renderHazardList(runtime, bestRoute.scoreResult.hits);
}

function getCompactScoreLabel(modeLabel = "") {
  if (modeLabel.includes("Fussweg")) return "Fussweg";
  if (modeLabel.includes("Radroute")) return "Radroute";
  if (modeLabel.includes("Autoroute")) return "Autoroute";
  if (modeLabel.includes("Routing")) return "Routenbewertung";
  return modeLabel || "Score";
}

function getScoreExplanation(score) {
  if (Number.isFinite(Number(score))) {
    return `Score ${Number(score).toFixed(1)} von 100. Skala: 0 bedeutet keine relevanten Unfallpunkte im 50-m-Routenkorridor. Jeder Treffer erhoeht den Wert; Kinderbeteiligung, Fuss-/Radbezug und neuere Unfaelle wiegen staerker. Unter 2 = niedrig, 2 bis unter 6 = mittel, ab 6 = hoch.`;
  }
  return "Skala 0-100: 0 bedeutet keine relevanten Unfallpunkte im 50-m-Routenkorridor. Jeder Treffer erhoeht den Wert; Kinderbeteiligung, Fuss-/Radbezug und neuere Unfaelle wiegen staerker. Unter 2 = niedrig, 2 bis unter 6 = mittel, ab 6 = hoch.";
}

function renderScoreGuide(runtime, scoreResult) {
  if (!runtime.ui?.routeScoreHelp) {
    return;
  }
  const hasScore = Number.isFinite(Number(scoreResult?.score));
  const score = hasScore ? Number(scoreResult.score) : 0;
  const level = hasScore ? scoreResult.level : "";
  const meterWidth = Math.max(0, Math.min(100, score));
  const levelClass = level ? ` is-${escapeHtml(level)}` : "";
  const label = hasScore
    ? `Aktueller Wert ${score.toFixed(1)} von 100`
    : "Noch kein aktueller Wert";

  runtime.ui.routeScoreHelp.innerHTML = `
    <div class="sws-score-guide">
      <div class="sws-score-guide-head">
        <strong>So wird die Route bewertet</strong>
        <span>${escapeHtml(label)}</span>
      </div>
      <div class="sws-score-meter${levelClass}" aria-label="${escapeHtml(label)}">
        <span style="width: ${meterWidth}%"></span>
      </div>
      <div class="sws-score-scale" aria-label="Score-Skala">
        <span><strong>Niedrig</strong><small>0 bis &lt; 2</small></span>
        <span><strong>Mittel</strong><small>2 bis &lt; 6</small></span>
        <span><strong>Hoch</strong><small>ab 6</small></span>
      </div>
      <div class="sws-score-factors" aria-label="Bewertungsfaktoren">
        <span>50-m-Routenkorridor</span>
        <span>Kinderbeteiligung staerker</span>
        <span>Fuss/Rad staerker</span>
        <span>Neuere Unfaelle staerker</span>
      </div>
    </div>
  `;
}

function formatDistance(distanceMeters) {
  const meters = Number(distanceMeters || 0);
  if (!Number.isFinite(meters) || meters <= 0) {
    return "Distanz unbekannt";
  }
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

function formatDuration(durationSeconds) {
  const seconds = Number(durationSeconds || 0);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "?";
  }
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours} h ${remainingMinutes} min` : `${hours} h`;
}

function renderHazardList(runtime, hits) {
  const topHits = hits.slice(0, 8);
  if (!topHits.length) {
    runtime.ui.hazardList.textContent = "Im 50-m-Routenkorridor liegen keine relevanten Unfallpunkte.";
    return;
  }
  runtime.ui.hazardList.innerHTML = `
    <div class="table-responsive">
      <table class="table table-sm align-middle mb-0">
        <thead>
          <tr>
            <th>Unfallpunkt</th>
            <th>Gewicht</th>
            <th>Abstand</th>
            <th>Merkmale</th>
          </tr>
        </thead>
        <tbody>
          ${topHits.map((hit) => `
            <tr>
              <td>${escapeHtml(hit.properties.titel || "Unfallpunkt")}</td>
              <td>${hit.weight.toFixed(1)}</td>
              <td>${hit.distanceMeters.toFixed(0)} m</td>
              <td>${escapeHtml(describeAccident(hit.properties))}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function calculateRouteHazardScore(routeCoordinates, accidents, options = {}) {
  const bufferMeters = Number(options.hazardBufferMeters || SCHULWEGSAFE_DEFAULTS.routeBufferMeters);
  const currentYear = Number(options.currentYear || SCHULWEGSAFE_DEFAULTS.currentYear);
  const hits = [];

  accidents.forEach((accident) => {
    const [lon, lat] = accident.geometry.coordinates;
    const distanceMeters = distanceToRouteMeters([lon, lat], routeCoordinates);
    if (distanceMeters > bufferMeters) {
      return;
    }
    const weight = roundToSingleDecimal(getHazardWeight(accident.properties, currentYear));
    hits.push({ ...accident, distanceMeters: roundToSingleDecimal(distanceMeters), weight });
  });

  const score = roundToSingleDecimal(Math.min(100, hits.reduce((sum, hit) => sum + hit.weight, 0)));
  return {
    score,
    hits: hits.sort((left, right) => right.weight - left.weight),
    level: classifyHazardScore(score),
  };
}

function getHazardWeight(properties = {}, currentYear = SCHULWEGSAFE_DEFAULTS.currentYear) {
  let weight = Number(properties.gewicht_basis || 1);
  if (properties.ist_kind) {
    weight *= 2;
  }
  if (properties.ist_fuss) {
    weight *= 1.5;
  }
  if (properties.ist_rad) {
    weight *= 1.3;
  }
  const incidentYear = Number(properties.jahr || currentYear);
  const ageYears = Math.max(0, currentYear - incidentYear);
  weight *= Math.max(0.5, 1 - ageYears * 0.1);
  return weight;
}

function classifyHazardScore(score) {
  if (score < 2) {
    return "niedrig";
  }
  if (score < 6) {
    return "mittel";
  }
  return "hoch";
}

async function fetchJsonResource(url, config) {
  const rawText = await fetchOdasCompatibleText(url, config);
  return JSON.parse(rawText);
}

async function fetchBinaryResource(url, config) {
  if (isProxyEnabled(config)) {
    const text = await fetchViaOdasProxy(url);
    return base64ToArrayBuffer(text);
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP-Fehler beim Laden von ${url}: ${response.status}`);
  }
  return response.arrayBuffer();
}

async function fetchOdasCompatibleText(targetUrl, config) {
  if (isProxyEnabled(config)) {
    return fetchViaOdasProxy(targetUrl);
  }
  const response = await fetch(targetUrl);
  if (!response.ok) {
    throw new Error(`HTTP-Fehler beim Laden von ${targetUrl}: ${response.status}`);
  }
  return response.text();
}

function isProxyEnabled(config = {}) {
  return String(config.proxyAktiv || "").trim().toLowerCase() === "ja";
}

function extractPathFromUrl(url) {
  try {
    const parsedUrl = new URL(url, window.location.href);
    return parsedUrl.pathname + parsedUrl.search;
  } catch (error) {
    return url;
  }
}

function getOdasProxyEndpoint(targetUrl) {
  const pathName = window.location.pathname.replace(/\/+$/, "");
  return `${pathName}/odp-data?path=${encodeURIComponent(extractPathFromUrl(targetUrl))}`;
}

async function fetchViaOdasProxy(targetUrl) {
  const response = await fetch(getOdasProxyEndpoint(targetUrl), { method: "POST" });
  if (!response.ok) {
    throw new Error(`Proxy-Fehler: HTTP ${response.status}`);
  }
  const proxyPayload = await response.json();
  if (!proxyPayload || typeof proxyPayload.content !== "string") {
    throw new Error("Proxy-Antwort enthaelt keinen content-String.");
  }
  return proxyPayload.content;
}

async function fetchRouteService(routeServiceUrl, startPoint, school, routeMode) {
  const serviceUrl = String(routeServiceUrl || "").trim();
  if (!serviceUrl || isOsrmRouteService(serviceUrl)) {
    return fetchOsrmRoutes(serviceUrl || SCHULWEGSAFE_DEFAULTS.routingServiceBaseUrl, startPoint, school, routeMode);
  }

  const response = await fetch(routeServiceUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      from: [startPoint.lat, startPoint.lon],
      to: [school.lat, school.lon],
      schoolId: school.id,
      mode: routeMode,
    }),
  });
  if (!response.ok) {
    throw new Error(`Routing-Service Fehler: HTTP ${response.status}`);
  }
  return response.json();
}

function isOsrmRouteService(routeServiceUrl) {
  return /\/route\/v1\/?$/i.test(routeServiceUrl) || /router\.project-osrm\.org/i.test(routeServiceUrl);
}

async function fetchOsrmRoutes(routeServiceBaseUrl, startPoint, school, routeMode) {
  const profile = getOsrmProfile(routeMode);
  const baseUrl = routeServiceBaseUrl.replace(/\/+$/, "");
  const coordinates = `${startPoint.lon},${startPoint.lat};${school.lon},${school.lat}`;
  const url = new URL(`${baseUrl}/${profile}/${coordinates}`);
  url.searchParams.set("overview", "full");
  url.searchParams.set("geometries", "geojson");
  url.searchParams.set("alternatives", "true");
  url.searchParams.set("steps", "false");

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const payload = await response.json();
  if (payload.code && payload.code !== "Ok") {
    throw new Error(payload.message || payload.code);
  }
  return payload;
}

function getOsrmProfile(routeMode) {
  if (routeMode === "bike") return "bike";
  if (routeMode === "car") return "driving";
  return "foot";
}

function getRouteModeLabel(routeMode) {
  if (routeMode === "bike") return "Radroute";
  if (routeMode === "car") return "Autoroute";
  return "Fussweg";
}

async function ensureMapAssets() {
  await loadStylesheetOnce("leaflet-css", "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css");
  await loadScriptOnce("leaflet-js", "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js");
  await Promise.all([
    loadScriptOnce("leaflet-heat-js", "https://unpkg.com/leaflet.heat/dist/leaflet-heat.js").catch(() => null),
    ensureJsZip(),
  ]);
}

async function ensureJsZip() {
  if (globalThis.JSZip) {
    return;
  }
  await loadScriptOnce("jszip-js", "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js");
}

async function loadStylesheetOnce(id, href) {
  if (document.getElementById(id)) {
    return;
  }
  await new Promise((resolve, reject) => {
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = href;
    link.onload = resolve;
    link.onerror = () => reject(new Error(`Stylesheet ${href} konnte nicht geladen werden.`));
    document.head.appendChild(link);
  });
}

function loadScriptOnce(id, src) {
  if (SCHULWEGSAFE_RUNTIME.assetPromises[id]) {
    return SCHULWEGSAFE_RUNTIME.assetPromises[id];
  }
  SCHULWEGSAFE_RUNTIME.assetPromises[id] = new Promise((resolve, reject) => {
    if (document.getElementById(id)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Skript ${src} konnte nicht geladen werden.`));
    document.head.appendChild(script);
  });
  return SCHULWEGSAFE_RUNTIME.assetPromises[id];
}

function requireLeaflet() {
  if (!globalThis.L) {
    throw new Error("Leaflet ist noch nicht geladen.");
  }
  return globalThis.L;
}

function parseCsv(csvText) {
  const rows = [];
  let current = "";
  let row = [];
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const next = csvText[index + 1];

    if (char === '"' && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ";" && !inQuotes) {
      row.push(current);
      current = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
    } else {
      current += char;
    }
  }

  if (current || row.length) {
    row.push(current);
    rows.push(row);
  }

  const header = rows.shift() || [];
  return rows
    .filter((cells) => cells.some((cell) => cell.trim()))
    .map((cells) => header.reduce((record, key, index) => {
      record[key.trim()] = (cells[index] || "").trim();
      return record;
    }, {}));
}

function pickString(source, keys) {
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null && String(source[key]).trim()) {
      return String(source[key]).trim();
    }
  }
  return "";
}

function pickNumber(source, keys) {
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null && source[key] !== "") {
      const value = Number(String(source[key]).replace(",", "."));
      if (Number.isFinite(value)) {
        return value;
      }
    }
  }
  return Number.NaN;
}

function pickInteger(source, keys) {
  const value = pickNumber(source, keys);
  return Number.isFinite(value) ? Math.trunc(value) : 0;
}

function stableSchoolId(source) {
  return [source.name, source.schulname, source.adresse, source.ort, source.city]
    .filter(Boolean)
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildAccidentTitle(row) {
  const kind = toBooleanFlag(row.IstKind) ? "Kinderbeteiligung" : "Unfallpunkt";
  const mode = toBooleanFlag(row.IstFuss) ? "Fussverkehr" : toBooleanFlag(row.IstRad) ? "Radverkehr" : "Verkehr";
  return `${kind} ${mode}`;
}

function describeAccident(properties) {
  const parts = [];
  if (properties.ist_kind) {
    parts.push("Kinder");
  }
  if (properties.ist_fuss) {
    parts.push("Fuss");
  }
  if (properties.ist_rad) {
    parts.push("Rad");
  }
  if (properties.stunde) {
    parts.push(`${properties.stunde} Uhr`);
  }
  return parts.join(", ") || "Schulwegzeit";
}

function getGeolocationUnavailableMessage() {
  return "Standortbestimmung ist in dieser Umgebung nicht verfuegbar. Viele Desktop-Browser erlauben Standort nur auf HTTPS-Seiten oder localhost. Bitte pruefe die Browserfreigabe oder nutze alternativ Startadresse oder Kartenklick.";
}

function isGeolocationSupported() {
  return Boolean(globalThis.navigator?.geolocation);
}

function isGeolocationContextAllowed() {
  const hostname = String(globalThis.location?.hostname || "").toLowerCase();
  return Boolean(globalThis.isSecureContext || hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1");
}

function getGeolocationInsecureContextMessage() {
  return "Standortbestimmung ist nur in sicheren Browser-Kontexten moeglich. Bitte die App ueber HTTPS oder lokal ueber localhost oeffnen. Alternativ funktionieren Startadresse oder Kartenklick.";
}

async function getGeolocationPermissionState() {
  if (!globalThis.navigator?.permissions?.query) {
    return "unknown";
  }
  try {
    const permission = await globalThis.navigator.permissions.query({ name: "geolocation" });
    return permission?.state || "unknown";
  } catch (error) {
    return "unknown";
  }
}

function getCurrentPositionOnce(options) {
  return new Promise((resolve, reject) => {
    globalThis.navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

function setGeolocationLoading(runtime, isLoading) {
  runtime.isLocating = Boolean(isLoading);
  if (!runtime.ui?.geoLocateButton) {
    return;
  }
  runtime.ui.geoLocateButton.disabled = Boolean(isLoading);
  runtime.ui.geoLocateButton.setAttribute("aria-busy", isLoading ? "true" : "false");
  runtime.ui.geoLocateButton.innerHTML = isLoading
    ? `<span class="sws-inline-spinner" aria-hidden="true"></span><span>Standort...</span>`
    : escapeHtml(runtime.ui.geoLocateButton.dataset.defaultLabel || "Standort");
}

function getGeolocationErrorMessage(error = {}) {
  const mobileHint = isLikelyMobileDevice()
    ? " Auf dem Smartphone muessen zusaetzlich die Standortdienste im System aktiviert sein."
    : " Auf dem Desktop hilft oft die Standortfreigabe im Browser oder Betriebssystem.";

  if (error.code === 1) {
    return `Der Standortzugriff wurde abgelehnt. Bitte erlaube den Standort im Browser.${mobileHint} Alternativ kannst du eine Startadresse eingeben oder den Startpunkt in die Karte klicken.`;
  }
  if (error.code === 2) {
    return `Der Standort konnte technisch nicht ermittelt werden.${mobileHint} Versuche es erneut oder nutze Startadresse bzw. Kartenklick.`;
  }
  if (error.code === 3) {
    return `Die Standortbestimmung hat zu lange gedauert.${mobileHint} Auf schwachem GPS/WLAN kann das passieren; Startadresse oder Kartenklick funktionieren weiterhin.`;
  }
  return `Der Standort konnte nicht gelesen werden.${mobileHint} Bitte pruefe Berechtigungen oder nutze Startadresse bzw. Kartenklick.`;
}

function isLikelyMobileDevice() {
  return /android|iphone|ipad|ipod|mobile/i.test(String(globalThis.navigator?.userAgent || ""));
}

function setStatus(runtime, tone, message, options = {}) {
  const className = tone === "success"
    ? "alert-success"
    : tone === "warning"
      ? "alert-warning"
      : tone === "danger"
        ? "alert-danger"
        : "alert-info";
  runtime.ui.status.className = `alert ${className} sws-status${options.loading ? " is-loading" : ""}`;
  runtime.ui.status.textContent = message;
}

function handleRuntimeError(runtime, error, userMessage) {
  console.error(error);
  const proxyHint = isProxyEnabled(runtime.config)
    ? ""
    : " Falls externe Quellen durch CORS blockiert werden, in ODAS den Proxy aktivieren.";
  setStatus(runtime, "danger", `${userMessage}${proxyHint}`);
}

function toBooleanFlag(value) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value === 1;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "ja" || normalized === "yes";
  }
  return false;
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function capitalize(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
}

function roundToSingleDecimal(value) {
  return Math.round(Number(value) * 10) / 10;
}

function distanceBetweenPoints(lat1, lon1, lat2, lon2) {
  const radius = 6371000;
  const dLat = degreesToRadians(lat2 - lat1);
  const dLon = degreesToRadians(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
    + Math.cos(degreesToRadians(lat1)) * Math.cos(degreesToRadians(lat2))
    * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * radius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function distanceToRouteMeters(point, routeCoordinates) {
  if (!Array.isArray(routeCoordinates) || routeCoordinates.length < 2) {
    return Number.POSITIVE_INFINITY;
  }
  let minimumDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < routeCoordinates.length - 1; index += 1) {
    minimumDistance = Math.min(
      minimumDistance,
      pointToSegmentDistanceMeters(point, routeCoordinates[index], routeCoordinates[index + 1]),
    );
  }
  return minimumDistance;
}

function pointToSegmentDistanceMeters(point, segmentStart, segmentEnd) {
  const originLatitude = degreesToRadians(point[1]);
  const metersPerDegreeLat = 111320;
  const metersPerDegreeLon = 111320 * Math.cos(originLatitude);
  const px = point[0] * metersPerDegreeLon;
  const py = point[1] * metersPerDegreeLat;
  const sx = segmentStart[0] * metersPerDegreeLon;
  const sy = segmentStart[1] * metersPerDegreeLat;
  const ex = segmentEnd[0] * metersPerDegreeLon;
  const ey = segmentEnd[1] * metersPerDegreeLat;
  const dx = ex - sx;
  const dy = ey - sy;
  const segmentLengthSquared = dx * dx + dy * dy;

  if (!segmentLengthSquared) {
    return Math.hypot(px - sx, py - sy);
  }

  const projection = Math.max(0, Math.min(1, ((px - sx) * dx + (py - sy) * dy) / segmentLengthSquared));
  return Math.hypot(px - (sx + projection * dx), py - (sy + projection * dy));
}

function degreesToRadians(value) {
  return (value * Math.PI) / 180;
}
