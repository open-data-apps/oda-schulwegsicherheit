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

## Fuer wen ist diese App?

Diese App richtet sich an Eltern, Schuelerinnen und Schueler sowie an Schulen und Kommunen in Baden-Wuerttemberg. Voraussetzung ist kein spezielles Datenwissen – wer den Schulweg eines Kindes kennt, kann die App direkt nutzen.

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

`liveServer.settings.root` sollte fuer ODAS-Apps normalerweise `/` bleiben, damit `app/` und `odas-config/` gleichzeitig erreichbar sind. `getConfigUrl()` in `app/app-base.js` erkennt `localhost`/`127.0.0.1` automatisch und laedt dann `odas-config/config.json` direkt; dafuer ist keine manuelle Anpassung mehr noetig, auch nicht vor ZIP-Erstellung und ODAS-Live-Auslieferung.

---

## Einsatzumgebungen

| Umgebung    | Start oder Auslieferung             | Konfiguration                        | Datenabruf                   |
| ----------- | ----------------------------------- | ------------------------------------ | ----------------------------- |
| Entwicklung | `make up` / `http://localhost:8090` | `odas-config/config.json`            | direkt                       |
| Standalone  | `STANDALONE=true make up`           | `odas-config/config.json`            | direkt                       |
| ODAS        | `make zip` / Veroeffentlichung      | vom ODAS erzeugter Endpunkt `config` | direkt oder mit `proxyAktiv` |

Entwicklung und Standalone verwenden dieselbe lokale Datei `odas-config/config.json`. Der Config-Loader in `app/app-base.js` laedt sie auf `localhost` direkt unter `odas-config/config.json`. Bei einem Standalone-FQDN fragt er stattdessen `/config` ab; Nginx liefert dort ueber `nginx.conf` dieselbe gemountete Datei aus.

## Standalone-Betrieb hinter Traefik

Fuer den Standalone-Betrieb wird ein bereits vorhandener Traefik-Reverse-Proxy vorausgesetzt. Die App selbst liefert HTTP intern auf Port `80`; Traefik uebernimmt FQDN, HTTPS-Zertifikat und Weiterleitung. Der App-Container veroeffentlicht dabei keinen Host-Port.

Vor dem Start:

1. In `docker-compose.standalone.yml` den Platzhalter-FQDN `app1.example.com` durch den echten Hostnamen ohne Protokoll oder Pfad ersetzen.
2. `odas-config/config.json` an Betreiber, Datenquellen und rechtliche Texte anpassen.
3. Sicherstellen, dass `proxyAktiv` auf `nein` steht (kein ODAS-Proxy im Standalone-Betrieb verfuegbar).
4. Pruefen, dass Traefik das externe Docker-Netzwerk `proxynet`, den EntryPoint `websecure` und den Zertifikatsresolver `letsencrypt` verwendet.

Starten:

```bash
STANDALONE=true make up
```

Weitere Befehle:

```bash
STANDALONE=true make logs
STANDALONE=true make config
STANDALONE=true make ps
STANDALONE=true make down
```

Ohne `STANDALONE=true` verwenden dieselben Make-Ziele ausschliesslich `docker-compose.yml` fuer die Entwicklung.

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

Der Route-Score nutzt eine Skala von 0 bis 100. `0` bedeutet, dass im 50-m-Routenkorridor keine relevanten Unfallpunkte liegen; jeder Treffer erhoeht den Wert, wobei Kinderbeteiligung, Fuss-/Radbezug und neuere Unfaelle staerker gewichtet werden. Unter `2` gilt als geringes Risiko, `2` bis unter `6` als erhöhte Aufmerksamkeit und ab `6` als kritisches Risiko.

---

## Datenquellen und Attribution

- Schuldaten: JedeSchule / Datenschule, CC0
- Unfalldaten: Unfallatlas der Statistischen Aemter des Bundes und der Laender, bereitgestellt ueber OpenGeodata.NRW, Datenlizenz Deutschland Namensnennung 2.0
- Kartendaten: OpenStreetMap-Mitwirkende, ODbL
- Geocoding und Routing: OpenStreetMap/Nominatim und OSRM-kompatible Routingdienste

---

## Autor

(C) 2026, Ondics GmbH
