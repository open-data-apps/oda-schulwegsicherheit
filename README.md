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
- **Routing**: Konfigurierter Dienst oder öffentlicher OSRM-Autodienst als Primärdienst; bei Fehler oder unbrauchbarer Route folgt automatisch genau ein FOSSGIS-Versuch, Fuß und Rad überspringen den öffentlichen Autodienst
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
OpenGeodata.NRW. Die öffentlichen Schul- und Unfalldatensätze werden weiterhin mit
konfigurierbarer Gültigkeit (`cacheTtlStunden`, Standard 24 Stunden) in IndexedDB
zwischengespeichert.

---

## Kompatible Datensätze

| Konfiguration | Beschreibung | Beispiel |
| ------------- | ------------ | -------- |
| `apiurls.schulen` | JSON-Datensatz mit Schulen in Baden-Württemberg | `https://raw.githubusercontent.com/Datenschule/schulscraper-data/master/schools/baden-wuerttemberg.json` |
| `apiurls.unfallatlas` | Unfallatlas CSV-ZIP | `https://www.opengeodata.nrw.de/produkte/transport_verkehr/unfallatlas/Unfallorte2024_EPSG25832_CSV.zip` |
| `routeServiceUrl` | Eigener Routing-Service mit `mode` (POST) oder passend vorbereitetem OSRM-Endpunkt | leer: öffentlicher OSRM-Dienst nur für Auto; Fuß/Rad überspringen ihn, FOSSGIS wird direkt genutzt |
| `geocodingServiceUrl` | Nominatim-kompatible Such-URL für die Adressauflösung | leer für den öffentlichen Standard; Vorschläge ab 4 Zeichen nach 450 ms Tipp-Pause |

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

Die App verwendet [Leaflet.js](https://leafletjs.com/) und [Leaflet.heat](https://github.com/Leaflet/Leaflet.heat). Die Karte nutzt OpenStreetMap-Kacheln und benötigt keinen Karten-API-Key. Hinweise zur Kartengrundlage und zum Routing sowie der kompakte Link [OpenStreetMap-Kartenfehler melden](https://www.openstreetmap.org/fixthemap) stehen direkt unter der Karte.

Für Adressvorschläge wird die Nominatim-Suche genutzt. Eine Anfrage wird nach mindestens vier eingegebenen Zeichen und einer Tipp-Pause von 450 Millisekunden an den konfigurierten Geocoding-Dienst gesendet; bei leerem `geocodingServiceUrl` ist dies `nominatim.openstreetmap.org`. Suchtext und Ort der gewählten Schule werden übermittelt.

### Routing und automatischer FOSSGIS-Versuch

Ein gesetztes `routeServiceUrl` wird als primärer Routingdienst verwendet. Bleibt die Einstellung – wie im Standard – leer, nutzt die App `router.project-osrm.org` ausschließlich für Autorouten. Fuß- und Radwege überspringen diesen öffentlichen Autodienst; ein anderes Profilwort in der OSRM-URL ändert das zugrunde liegende Wegenetz nicht.

- Liefert ein geeigneter Primärdienst einen Fehler oder keine nutzbare Route, versucht die App automatisch genau einmal `routing.openstreetmap.de` (FOSSGIS).
- Bei leerem `routeServiceUrl` gehen Fuß- und Radwege direkt einmal an den geeigneten FOSSGIS-Dienst, statt den öffentlichen OSRM-Autodienst aufzurufen.
- Ein abgebrochener Routingaufruf löst keinen Ersatzversuch aus. Gibt auch der FOSSGIS-Versuch keine nutzbare Route zurück, zeigt die App keinen Score.
- Der automatische Versuch verändert `routeServiceUrl` oder die ODAS-Instanzkonfiguration nicht.

Sobald Schule und Startpunkt vorliegen, kann eine Route berechnet werden – nach Auswahl einer Adresse, Nutzung des Standort-Knopfs, einem Kartenklick oder beim Öffnen eines geteilten Links mit Koordinaten. Die öffentlichen FOSSGIS-Pfade `routed-foot`, `routed-bike` und `routed-car` verwenden getrennte Profile. Ein eigener Nicht-OSRM-Dienst erhält einen JSON-POST mit `from`, `to`, `schoolId` und `mode` (`foot`, `bike`, `car`). Ein eigener OSRM-Endpunkt muss selbst das zum Modus passende Wegenetz bereitstellen.

**Nutzungsbedingungen:** Für den öffentlichen [FOSSGIS-Routingdienst](https://routing.openstreetmap.de/about.html) gelten die [FOSSGIS-Nutzungsbedingungen](https://www.fossgis.de/arbeitsgruppen/osm-server/nutzungsbedingungen/), unter anderem eine Begrenzung auf höchstens eine Anfrage pro Sekunde, kein hohes Verkehrsaufkommen und keine gewerbliche Nutzung als wesentlicher Teil eines Angebots. Es gibt keine Verfügbarkeitsgarantie. Betreiber müssen die jeweils geltenden Bedingungen und die Eignung für ihren Einsatz selbst prüfen. Die App begrenzt Anfragen pro geöffneter Seite; das begrenzt nicht die Summe über alle Besucher und Browser-Tabs.

### Übertragung personenbezogener Angaben an Dritte

Adresssuche und Routenberechnung übertragen Angaben, die Rückschlüsse auf Wohnort und Schulweg zulassen:

| Funktion | Empfänger (Standard) | Übertragene Daten |
| --- | --- | --- |
| Adressvorschläge | `nominatim.openstreetmap.org` | Suchtext und Ort der gewählten Schule; ab vier Zeichen nach 450 ms Tipp-Pause |
| Autorouten bei leerem `routeServiceUrl` | `router.project-osrm.org` | Koordinaten von Startpunkt und Schule im URL-Pfad |
| FOSSGIS-Routing | `routing.openstreetmap.de` | Start- und Zielkoordinaten; Fuß-/Radwege bei leerem `routeServiceUrl` und einmaliger Ersatzversuch nach einem Fehler oder einer unbrauchbaren Route |
| Eigener Primärdienst | konfigurierte `routeServiceUrl` | Start- und Zielkoordinaten sowie Wegtyp (`foot`, `bike`, `car`) |

Sobald Schule und Startpunkt vorliegen, kann die Route durch eine Adressauswahl, den Standort-Knopf, einen Kartenklick oder einen geteilten Link mit Koordinaten ausgelöst werden. Bei Nutzung des Standort-Knopfs ist der Startpunkt die tatsächliche Position des Geräts. Die Browser- beziehungsweise Betriebssystemfreigabe für den Gerätestandort ist davon unabhängig: Sie steuert den Standortzugriff und ist keine gesonderte Freigabe der anschließenden Übertragung an einen Routingdienst.

Bei externen Anfragen werden technisch bedingt auch IP-Adresse und Browserkennung übertragen. Die App zeigt keine eigene Einwilligungsabfrage an und legt keinen app-spezifischen Einwilligungsstatus an. Die verantwortliche Stelle jeder konkreten Instanz muss die Rechtsgrundlage für diese Übermittlungen und ihre Informationspflichten selbst prüfen; diese technische Dokumentation nimmt keine rechtliche Bewertung vor.

Der Route-Score nutzt eine Skala von 0 bis 100. `0` bedeutet, dass im 50-m-Routenkorridor keine relevanten Unfallpunkte liegen; jeder Treffer erhöht den Wert, wobei Kinderbeteiligung, Fuß-/Radbezug und neuere Unfälle stärker gewichtet werden. Unter `2` gilt als geringes Risiko, `2` bis unter `6` als erhöhte Aufmerksamkeit und ab `6` als kritisches Risiko.

## Datenquellen und Attribution

- Schuldaten: JedeSchule / Datenschule, CC0
- Unfalldaten: Unfallatlas der Statistischen Ämter des Bundes und der Länder, bereitgestellt über OpenGeodata.NRW, Datenlizenz Deutschland Namensnennung 2.0
- Kartendaten: OpenStreetMap-Mitwirkende, ODbL
- Geocoding und Routing: OpenStreetMap/Nominatim und konfigurierbare Routingdienste; automatischer FOSSGIS-Ersatzdienst für Fuß-/Radwege und nach einem fehlgeschlagenen oder unbrauchbaren Primärversuch ([FOSSGIS](https://routing.openstreetmap.de/about.html))
- [OpenStreetMap-Kartenfehler melden](https://www.openstreetmap.org/fixthemap)

---

## Beim Aufruf kontaktierte Drittanbieter

Je nach Nutzung und Instanzkonfiguration werden folgende externe Server kontaktiert:

- `tile.openstreetmap.org` — OpenStreetMap-Kartenkacheln
- `nominatim.openstreetmap.org` — Geocoding-Vorschläge; Suchtext und Ort der gewählten Schule werden ab vier Zeichen nach 450 ms Tipp-Pause übertragen
- `router.project-osrm.org` — öffentlicher Routingdienst für Autorouten, wenn `routeServiceUrl` leer ist; Fuß- und Radwege überspringen diesen Autodienst
- `routing.openstreetmap.de` — FOSSGIS-Routing für Fuß-/Radwege bei leerem `routeServiceUrl` sowie als einmaliger automatischer Ersatzversuch; übertragen werden Start- und Zielkoordinaten; [Datenschutz](https://www.fossgis.de/datenschutzerklärung/) und [Nutzungsbedingungen](https://www.fossgis.de/arbeitsgruppen/osm-server/nutzungsbedingungen/)

Bei externen Anfragen werden technisch bedingt IP-Adresse und Browserkennung übermittelt. Ein eigener Geocoding- oder Routing-Endpunkt kann die jeweiligen öffentlichen Dienste ersetzen. Schul- und Unfalldaten werden abhängig von `proxyAktiv` direkt oder über den ODAS-Proxy geladen.

Diese Anbieter bleiben auch im Standalone-Betrieb extern; ein vollständig autarker Betrieb ohne Internetzugang ist derzeit nicht möglich. Alle Programmbibliotheken werden lokal aus `app/vendor/` ausgeliefert und nicht mehr extern geladen.

## Regressionstests

```bash
node --test tests/*.test.cjs
```

Die Menüanimation wird zusätzlich mit einem bereits installierten Playwright und Chrome geprüft (keine zusätzliche App-Abhängigkeit):

```bash
PLAYWRIGHT_MODULE=/pfad/zur/playwright-installation node --test tests/menu.browser.cjs
```

Der Browsertest prüft sichtbare Öffnungs-/Schließbewegung auf Desktop und Mobil, reduzierte Bewegung, Fokus, Escape, Hintergrundklick, Menünavigation und wiederholtes Öffnen.

Die Tests verwenden die tatsächliche App-Logik; nur Browser-Oberfläche und externe Netzantworten werden isoliert. Geprüft werden Modus-Sperre, automatische Routing-Fallbacks, Ratenbegrenzung, verworfene oder abgebrochene Routen, Adresssuche sowie Schulsuche und Cache-Aufbereitung.

Die Korrektur des Quellnamens `…sterfeldschule Grundschule Vaihingen` ist auf die bekannte ID `BW-129123` und genau diesen defekten Namen begrenzt. Referenz: [Landeshauptstadt Stuttgart – Österfeldschule](https://www.stuttgart.de/organigramm/adresse/oesterfeldschule), geprüft am 08.10.2026. Andere Namen/Auslassungszeichen werden nicht geraten oder pauschal ersetzt. Mehrteilige Suchanfragen müssen mit allen Begriffen zur Schule passen.

## Autor

(C) 2026, Ondics GmbH
