# Schulwegsicherheit BW

Die App **Schulwegsicherheit BW** bietet eine interaktive, map-zentrierte Einschätzung möglicher Schulwege in Baden-Württemberg.

Die App ist für die Verwendung im [Open Data App Store](https://open-data-app-store.de/) gemacht und entspricht der [Open Data App](https://open-data-apps.github.io/open-data-app-docs/open-data-app-spezifikation/).

Mehr zu Open Data Apps unter https://github.com/open-data-apps

---

## Funktionen

Die App ist eine Single Page Application (Webapp) mit:

- Logo-Anzeige
- Menü
- Seiten für Impressum, Datenschutz, Beschreibung, Kontakt, Hauptinhalt
- Inhaltsbereich
- Fußzeile

Die Konfiguration wird vom ODAS geladen. Die App zeigt folgende Inhalte:

- **Schulsuche**: Fehlertolerante Suche nach Schule, Ort, Adresse oder Schulform mit Dublettenbereinigung, besserer Trefferreihenfolge und Tastaturauswahl
- **Kartenansicht**: Interaktive Leaflet-Karte mit OpenStreetMap-Kacheln
- **Unfallatlas-Auswertung**: Laden des externen Unfallatlas-CSV-ZIP-Downloads
- **Filterung**: Schulwegrelevante Unfälle mit Fuß- oder Radbezug an Werktagen zu Schulwegzeiten
- **Heatmap und Einzelpunkte**: Darstellung der Unfallpunkte im Umfeld einer ausgewählten Schule
- **Startadresse**: Suche einer Startadresse per Nominatim, Kartenklick oder Standortfunktion
- **Routing**: Geeigneter eigener Dienst oder bewusst wählbarer FOSSGIS-Fallback mit getrennten Fuß-, Rad- und Autoprofilen; der bisherige öffentliche Standard ist nur für Autorouten freigegeben
- **Bewertung**: Score entlang des berechneten Routenkorridors mit Distanz, Dauer und Unfallpunkt-Treffern
- **Score-Erklärung**: Übersichtlicher Score-Guide mit Skala, Schwellenwerten und Bewertungsfaktoren direkt in der Routenbewertung
- **Standort-Hinweise**: Ladeanzeige, robuster zweiter Ortungsversuch und verständliche Meldungen bei Browserfreigabe, Desktop-Einschränkungen oder mobilen Standortdiensten

---

## Für wen ist diese App?

Diese App richtet sich an Eltern, Schülerinnen und Schüler sowie an Schulen und Kommunen in Baden-Württemberg. Voraussetzung ist kein spezielles Datenwissen – wer den Schulweg eines Kindes kennt, kann die App direkt nutzen.

---

## Datenformat

Die App verarbeitet zwei externe Datenquellen:

- **Schuldaten JSON**: Array oder Objekt mit `schools`, `data` oder `results`; unterstützt werden u.a. Felder für Name, Adresse, Ort, Schulform und Koordinaten.
- **Unfallatlas CSV-ZIP**: ZIP-Datei mit einer CSV-Datei. Ausgewertet werden die Kernfelder `UJAHR`, `UWOCHENTAG`, `USTUNDE`, `IstRad`, `IstFuss`, `IstKind`, `XGCSWGS84` und `YGCSWGS84`.

Die ZIP-Datei wird im Browser mit JSZip gelesen. Standard lädt die App beide Quellen
direkt. Über den Konfigurationsschalter `proxyAktiv` (Default `nein`) können die Abrufe
alternativ über den ODAS-Proxy laufen: Seit dem Plattform-Update vom 2026-08-24 erlaubt
der Proxy mehrere konfigurierte Quelle-Origin gleichzeitig, also hier GitHub-Raw und
OpenGeodata.NRW.

---

## Kompatible Datensätze

| Konfiguration | Beschreibung | Beispiel |
| ------------- | ------------ | -------- |
| `apiurls.schulen` | JSON-Datensatz mit Schulen in Baden-Württemberg | `https://raw.githubusercontent.com/Datenschule/schulscraper-data/master/schools/baden-wuerttemberg.json` |
| `apiurls.unfallatlas` | Unfallatlas CSV-ZIP | `https://www.opengeodata.nrw.de/produkte/transport_verkehr/unfallatlas/Unfallorte2024_EPSG25832_CSV.zip` |
| `routeServiceUrl` | Eigener Routing-Service mit `mode` (POST) oder passend vorbereitetem OSRM-Endpunkt | leer: öffentlicher Standard nur für Auto; Fuß/Rad bleiben gesperrt |
| `geocodingServiceUrl` | Nominatim-kompatible Such-URL für die Adressauflösung | leer für den voreingestellten öffentlichen Dienst |

---

### Systemvoraussetzungen

- Docker / Docker Compose
- Make
- Alternativ: VS Code Live Server für lokale Frontend-Tests

Die Entwicklung wurde unter Windows getestet.

### Starten

```bash
make build up
```

Die App wird gestartet und steht auf Port 8089 zur Verfügung: http://localhost:8089

Weil die App mit localhost gestartet wird, kann die Konfiguration lokal geladen werden.

### Lokale Entwicklung mit VS Code Live Server

Alternativ kann die App mit VS Code Live Server aus der Projektwurzel gestartet werden. Öffne dann `http://127.0.0.1:<live-server-port>/app/`; Live Server nutzt standardmäßig Port `5500`, projektlokal kann aber z.B. `5501` gesetzt sein.

Empfohlene ODAS-Einstellungen:

```json
{
  "liveServer.settings.host": "127.0.0.1",
  "liveServer.settings.root": "/",
  "liveServer.settings.file": "app/index.html"
}
```

`liveServer.settings.root` sollte für ODAS-Apps normalerweise `/` bleiben, damit `app/` und `odas-config/` gleichzeitig erreichbar sind. `getConfigUrl()` in `app/app-base.js` erkennt `localhost`/`127.0.0.1` automatisch und lädt dann `odas-config/config.json` direkt; dafür ist keine manuelle Anpassung mehr nötig, auch nicht vor ZIP-Erstellung und ODAS-Live-Auslieferung.

---

## Einsatzumgebungen

| Umgebung    | Start oder Auslieferung             | Konfiguration                        | Datenabruf                   |
| ----------- | ----------------------------------- | ------------------------------------ | ----------------------------- |
| Entwicklung | `make up` / `http://localhost:8090` | `odas-config/config.json`            | direkt                       |
| Standalone  | `STANDALONE=true make up`           | `odas-config/config.json`            | direkt                       |
| ODAS        | `make zip` / Veröffentlichung      | vom ODAS erzeugter Endpunkt `config` | direkt                       |

`make zip` erzeugt das Liefer-ZIP mit `app/`, `assets/`, `app-package.json` und `CHANGELOG.md`. Das ZIP ist ein Bauartefakt und wird nicht mitversioniert, sondern bei Bedarf mit `make zip` erzeugt.

Entwicklung und Standalone verwenden dieselbe lokale Datei `odas-config/config.json`. Der Config-Loader in `app/app-base.js` lädt sie auf `localhost` direkt unter `odas-config/config.json`. Bei einem Standalone-FQDN fragt er stattdessen `/config` ab; Nginx liefert dort über `nginx.conf` dieselbe gemountete Datei aus.

## Standalone-Betrieb hinter Traefik

Für den Standalone-Betrieb wird ein bereits vorhandener Traefik-Reverse-Proxy vorausgesetzt. Die App selbst liefert HTTP intern auf Port `80`; Traefik übernimmt FQDN, HTTPS-Zertifikat und Weiterleitung. Der App-Container veröffentlicht dabei keinen Host-Port.

Vor dem Start:

1. In `docker-compose.standalone.yml` den Platzhalter-FQDN `app1.example.com` durch den echten Hostnamen ohne Protokoll oder Pfad ersetzen.
2. `odas-config/config.json` an Betreiber, Datenquellen und rechtliche Texte anpassen.
3. Prüfen, dass Traefik das externe Docker-Netzwerk `proxynet`, den EntryPoint `websecure` und den Zertifikatsresolver `letsencrypt` verwendet.

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

Ohne `STANDALONE=true` verwenden dieselben Make-Ziele ausschließlich `docker-compose.yml` für die Entwicklung.

### Aufbau der App

Der Inhaltsbereich wird in `app/app.js` erstellt. App-spezifisches Styling liegt in `app/app.css`.

### Wichtige Dateien

| Datei | Beschreibung |
| ----- | ------------ |
| `app/app.js` | Hauptlogik: Datenladen, Aufbereitung, Karte, Filter, Bewertung |
| `app/app.css` | App-spezifisches Layout und Styling |
| `app-package.json` | App-Metadaten und Instanz-Konfiguration für ODAS |
| `assets/schema.json` | Schema der ausgewerteten Unfallatlas-Kernfelder |
| `assets/odas-app-icon.svg` | App-Icon |
| `odas-config/config.json` | Lokale Konfiguration für die Entwicklung |

---

## Kartenfunktion

Die App verwendet [Leaflet.js](https://leafletjs.com/) und [Leaflet.heat](https://github.com/Leaflet/Leaflet.heat). Die Karte nutzt OpenStreetMap-Kacheln und benötigt keinen Karten-API-Key.

Für Startadressen wird die Nominatim-Suche von OpenStreetMap genutzt. Der voreingestellte Routingdienst `router.project-osrm.org` berechnet Autorouten. Ein anderer Profilname im OSRM-URL-Pfad ändert das vorbereitete Wegenetz nicht; Fuß- und Radwege bleiben bei diesem Dienst daher gesperrt und erhalten keinen Score.

### Bewusst wählbarer Routing-Fallback

Bei gesperrtem Fuß-/Radrouting oder einem nicht nutzbaren konfigurierten Routingdienst bietet die App **FOSSGIS-Fallback auswählen** an. Es gibt keinen heimlichen Dienstwechsel.

1. Den Hinweis und die [FOSSGIS-Nutzungsbedingungen](https://www.fossgis.de/arbeitsgruppen/osm-server/nutzungsbedingungen/) prüfen und den Fallback ausdrücklich auswählen.
2. Der Übertragung an `routing.openstreetmap.de` zustimmen. Eine Zustimmung zum bisherigen Dienst gilt nicht für diesen Endpunkt.
3. Die Route erneut berechnen. Fuß, Rad und Auto nutzen getrennte Serverpfade `routed-foot`, `routed-bike` und `routed-car`.

Die Auswahl gilt nur für die aktuelle App-Ansicht und ändert weder Paket noch Live-Konfiguration. Wer einen geteilten Link aufruft, muss seinen Routingdienst ebenfalls bewusst wählen. Bei Ausfall oder fehlender Route zeigt die App keinen ersatzweise erfundenen Score.

**Betriebsgrenzen:** Der öffentliche FOSSGIS-Dienst ist kein unbeschränkter Produktionsdienst. Er erlaubt maximal eine Anfrage pro Sekunde, kein hohes Verkehrsaufkommen und keine gewerbliche Nutzung als wesentlichen Teil eines Onlineangebots; es gibt keine Verfügbarkeitsgarantie. Die App serialisiert Anfragen mit mindestens einer Sekunde Abstand **pro geöffneter Seite**, auch über mehrere Instanzen innerhalb desselben Dokuments. Das begrenzt nicht die Summe aller Besucher/Tabs. Der Betreiber muss daher die Eignung/Freigabe für seinen Einsatz sicherstellen; für größeren produktiven Betrieb ist ein eigener oder entsprechend freigegebener Dienst erforderlich. Bei bewusst gesetzter `routeServiceUrl: "https://routing.openstreetmap.de"` gelten dieselben Profil-, Einwilligungs- und Ratenregeln.

Eigene Nicht-OSRM-Dienste erhalten unverändert einen JSON-POST mit `from`, `to`, `schoolId` und `mode` (`foot`, `bike`, `car`). Ein eigener OSRM-Endpunkt muss tatsächlich das zum Modus passende Wegenetz bereitstellen; allein `/foot` oder `/bike` im Pfad ist kein Nachweis.

### Übertragung personenbezogener Angaben an Dritte

Beide Funktionen übertragen Angaben, die Rückschlüsse auf Wohnort und Schulweg zulassen:

| Funktion | Empfänger (Voreinstellung) | Übertragene Daten |
| --- | --- | --- |
| Adresssuche | `nominatim.openstreetmap.org` | Eingegebene Adresse und Ort der gewählten Schule |
| Autorouten (Standard) | `router.project-osrm.org` | Koordinaten von Startpunkt und Schule, **im Pfad der aufgerufenen Adresse** — sie erscheinen dadurch in den Zugriffsprotokollen des Dienstes |
| Ausdrücklich gewählter Fallback | `routing.openstreetmap.de` (FOSSGIS) | Start-/Zielkoordinaten im URL-Pfad, IP-Adresse und Browserkennung; Routenanfragen werden beim Anbieter protokolliert |

Wird der Standort-Knopf genutzt, ist der Startpunkt die tatsächliche Position des Geräts.
`router.project-osrm.org` ist eine öffentliche Demonstrationsinstanz des OSRM-Projekts und
nicht für den Produktivbetrieb vorgesehen.

**Die App fragt vor der ersten Übertragung.** Ohne Zustimmung findet keine dieser
Übertragungen statt; Adresssuche und Routenberechnung bleiben deaktiviert. Kartenansicht,
Schulsuche und Unfallpunkte funktionieren auch ohne. Die Entscheidung wird lokal im Browser
gespeichert (localStorage, an das Endpunktpaar gebunden) und ist jederzeit widerrufbar. Ein Widerruf oder eine Änderung der Startadresse verwirft laufende Routen; verspätete Adressantworten dürfen keine veraltete Route nachladen.

**Für Betreiber:** Über `geocodingServiceUrl` und `routeServiceUrl` lassen sich eigene
Instanzen hinterlegen; die App nennt dann diese im Hinweis und in der Datenschutzangabe.
Wer die mitgelieferte `datenschutz`-Angabe übernimmt, ohne eigene Dienste zu setzen,
übernimmt damit auch die Nennung der beiden öffentlichen Dienste — das ist beabsichtigt
und muss zur tatsächlichen Konfiguration passen.

Der Route-Score nutzt eine Skala von 0 bis 100. `0` bedeutet, dass im 50-m-Routenkorridor keine relevanten Unfallpunkte liegen; jeder Treffer erhöht den Wert, wobei Kinderbeteiligung, Fuß-/Radbezug und neuere Unfälle stärker gewichtet werden. Unter `2` gilt als geringes Risiko, `2` bis unter `6` als erhöhte Aufmerksamkeit und ab `6` als kritisches Risiko.

---

## Datenquellen und Attribution

- Schuldaten: JedeSchule / Datenschule, CC0
- Unfalldaten: Unfallatlas der Statistischen Ämter des Bundes und der Länder, bereitgestellt über OpenGeodata.NRW, Datenlizenz Deutschland Namensnennung 2.0
- Kartendaten: OpenStreetMap-Mitwirkende, ODbL
- Geocoding und Routing: OpenStreetMap/Nominatim und OSRM-kompatible Routingdienste; optional [FOSSGIS](https://routing.openstreetmap.de/about.html)
- [OpenStreetMap-Kartenfehler melden](https://www.openstreetmap.org/fixthemap)

---

## Beim Aufruf kontaktierte Drittanbieter

Beim Aufruf dieser App werden folgende externe Server kontaktiert:

- `tile.openstreetmap.org` — Kartenkacheln (OpenStreetMap)
- `nominatim.openstreetmap.org` — Adress-Suche (Geocoding); übertragen: Suchbegriffe, IP-Adresse, User-Agent; Abruf nur nach Einwilligung
- `router.project-osrm.org` — Autoroutenberechnung (OSRM); übertragen: Start- und Zielkoordinaten, IP-Adresse, User-Agent; Abruf nur nach Einwilligung
- `routing.openstreetmap.de` — bewusst wählbarer FOSSGIS-Fallback für Fuß-, Rad- und Autorouten; dieselben technischen Angaben, Abruf nur nach dienstbezogener Einwilligung; [Datenschutz](https://www.fossgis.de/datenschutzerklärung/)

Diese Anbieter bleiben auch im Standalone-Betrieb extern; ein vollständig autarker Betrieb ohne Internetzugang ist derzeit nicht möglich. Alle Programmbibliotheken werden lokal aus `app/vendor/` ausgeliefert und nicht mehr extern geladen.

## Regressionstests

```bash
node --test tests/*.test.cjs
```

Die Tests verwenden die tatsächliche App-Logik; nur Browser-Oberfläche und externe Netzantworten werden isoliert. Geprüft werden Modus-Sperre, korrekte Fallback-Pfade, Einwilligung, Ratenbegrenzung, verworfene/abgebrochene Routen und Adressantworten sowie Schulsuche und Cache-Aufbereitung.

Die Korrektur des Quellnamens `…sterfeldschule Grundschule Vaihingen` ist auf die bekannte ID `BW-129123` und genau diesen defekten Namen begrenzt. Referenz: [Landeshauptstadt Stuttgart – Österfeldschule](https://www.stuttgart.de/organigramm/adresse/oesterfeldschule), geprüft am 08.10.2026. Andere Namen/Auslassungszeichen werden nicht geraten oder pauschal ersetzt. Mehrteilige Suchanfragen müssen mit allen Begriffen zur Schule passen.

## Autor

(C) 2026, Ondics GmbH
