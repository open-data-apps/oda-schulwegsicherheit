# Schulwegsicherheit BW

Die App **Schulwegsicherheit BW** bietet eine interaktive, map-zentrierte Einschaetzung moeglicher Schulwege in Baden-Wuerttemberg.

Die App ist fuer die Verwendung im [Open Data App Store](https://open-data-app-store.de/) gemacht und entspricht der [Open Data App](https://open-data-apps.github.io/open-data-app-docs/open-data-app-spezifikation/).

Mehr zu Open Data Apps unter https://github.com/open-data-apps

---

## Funktionen

Die App ist eine Single Page Application (Webapp) mit:

- Logo-Anzeige
- Menue
- Seiten fuer Impressum, Datenschutz, Beschreibung, Kontakt, Hauptinhalt
- Inhaltsbereich
- Fusszeile

Die Konfiguration wird vom ODAS geladen. Die App zeigt folgende Inhalte:

- **Schulsuche**: Fehlertolerante Suche nach Schule, Ort, Adresse oder Schulform mit Dublettenbereinigung, besserer Trefferreihenfolge und Tastaturauswahl
- **Kartenansicht**: Interaktive Leaflet-Karte mit OpenStreetMap-Kacheln
- **Unfallatlas-Auswertung**: Laden des externen Unfallatlas-CSV-ZIP-Downloads
- **Filterung**: Schulwegrelevante Unfaelle mit Fuss- oder Radbezug an Werktagen zu Schulwegzeiten
- **Heatmap und Einzelpunkte**: Darstellung der Unfallpunkte im Umfeld einer ausgewaehlten Schule
- **Startadresse**: Suche einer Startadresse per Nominatim, Kartenklick oder Standortfunktion
- **Routing**: Berechnung realer Fuss-, Rad- oder Autorouten ueber einen OSRM-kompatiblen Routingdienst
- **Bewertung**: Score entlang des berechneten Routenkorridors mit Distanz, Dauer und Unfallpunkt-Treffern
- **Score-Erklaerung**: Uebersichtlicher Score-Guide mit Skala, Schwellenwerten und Bewertungsfaktoren direkt in der Routenbewertung
- **Standort-Hinweise**: Ladeanzeige, robuster zweiter Ortungsversuch und verstaendliche Meldungen bei Browserfreigabe, Desktop-Einschraenkungen oder mobilen Standortdiensten

---

## Datenformat

Die App verarbeitet zwei externe Datenquellen:

- **Schuldaten JSON**: Array oder Objekt mit `schools`, `data` oder `results`; unterstuetzt werden u.a. Felder fuer Name, Adresse, Ort, Schulform und Koordinaten.
- **Unfallatlas CSV-ZIP**: ZIP-Datei mit einer CSV-Datei. Ausgewertet werden die Kernfelder `UJAHR`, `UWOCHENTAG`, `USTUNDE`, `IstRad`, `IstFuss`, `IstKind`, `XGCSWGS84` und `YGCSWGS84`.

Die ZIP-Datei wird im Browser mit JSZip gelesen. Bei CORS-Problemen kann der ODAS-Proxy ueber `proxyAktiv` eingeschaltet werden.

---

## Kompatible Datensaetze

| Konfiguration | Beschreibung | Beispiel |
| ------------- | ------------ | -------- |
| `schoolsDataUrl` | JSON-Datensatz mit Schulen in Baden-Wuerttemberg | `https://raw.githubusercontent.com/Datenschule/schulscraper-data/master/schools/baden-wuerttemberg.json` |
| `accidentDataUrl` | Unfallatlas CSV-ZIP | `https://www.opengeodata.nrw.de/produkte/transport_verkehr/unfallatlas/Unfallorte2024_EPSG25832_CSV.zip` |
| `routeServiceUrl` | Optionaler OSRM-kompatibler oder geschuetzter Routing-Service | leer fuer den voreingestellten OSRM-Routingdienst |

---

### Systemvoraussetzungen

- Docker / Docker Compose
- Make
- Alternativ: VS Code Live Server fuer lokale Frontend-Tests

Die Entwicklung wurde unter Windows getestet.

### Starten

```bash
make build up
```

Die App wird gestartet und steht auf Port 8089 zur Verfuegung: http://localhost:8089

Weil die App mit localhost gestartet wird, kann die Konfiguration lokal geladen werden.

### Lokale Entwicklung mit VS Code Live Server

Alternativ kann die App mit VS Code Live Server aus der Projektwurzel gestartet werden. Oeffne dann `http://127.0.0.1:<live-server-port>/app/`; Live Server nutzt standardmaessig Port `5500`, projektlokal kann aber z.B. `5501` gesetzt sein.

Empfohlene ODAS-Einstellungen:

```json
{
  "liveServer.settings.host": "127.0.0.1",
  "liveServer.settings.root": "/",
  "liveServer.settings.file": "app/index.html"
}
```

`liveServer.settings.root` sollte fuer ODAS-Apps normalerweise `/` bleiben, damit `app/` und `odas-config/` gleichzeitig erreichbar sind. Falls `app/app-base.js` fuer lokale Tests den auskommentierten `getConfigUrl()`-Localhost-Block nutzt, muss dieser vor ZIP-Erstellung und ODAS-Live-Auslieferung wieder auskommentiert werden.

### Aufbau der App

Der Inhaltsbereich wird in `app/app.js` erstellt. App-spezifisches Styling liegt in `app/app.css`.

### Wichtige Dateien

| Datei | Beschreibung |
| ----- | ------------ |
| `app/app.js` | Hauptlogik: Datenladen, Aufbereitung, Karte, Filter, Bewertung |
| `app/app.css` | App-spezifisches Layout und Styling |
| `app-package.json` | App-Metadaten und Instanz-Konfiguration fuer ODAS |
| `assets/schema.json` | Schema der ausgewerteten Unfallatlas-Kernfelder |
| `assets/odas-app-icon.svg` | App-Icon |
| `odas-config/config.json` | Lokale Konfiguration fuer die Entwicklung |

---

## Kartenfunktion

Die App verwendet [Leaflet.js](https://leafletjs.com/) und [Leaflet.heat](https://github.com/Leaflet/Leaflet.heat). Die Karte nutzt OpenStreetMap-Kacheln und benoetigt keinen Karten-API-Key.

Fuer Startadressen wird die Nominatim-Suche von OpenStreetMap genutzt. Fuer Routen wird standardmaessig ein OSRM-kompatibler Routingdienst verwendet; ueber `routeServiceUrl` kann im ODAS-Betrieb ein geschuetzter eigener Routingdienst gesetzt werden.

Der Route-Score nutzt eine Skala von 0 bis 100. `0` bedeutet, dass im 50-m-Routenkorridor keine relevanten Unfallpunkte liegen; jeder Treffer erhoeht den Wert, wobei Kinderbeteiligung, Fuss-/Radbezug und neuere Unfaelle staerker gewichtet werden. Unter `2` gilt als niedrig, `2` bis unter `6` als mittel und ab `6` als hoch.

---

## Datenquellen und Attribution

- Schuldaten: JedeSchule / Datenschule, CC0
- Unfalldaten: Unfallatlas der Statistischen Aemter des Bundes und der Laender, bereitgestellt ueber OpenGeodata.NRW, Datenlizenz Deutschland Namensnennung 2.0
- Kartendaten: OpenStreetMap-Mitwirkende, ODbL
- Geocoding und Routing: OpenStreetMap/Nominatim und OSRM-kompatible Routingdienste

---

## Autor

(C) 2026, Ondics GmbH
