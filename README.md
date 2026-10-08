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
- **Routing**: Geeigneter eigener Dienst oder bewusst waehlbarer FOSSGIS-Fallback mit getrennten Fuss-, Rad- und Autoprofilen; der bisherige oeffentliche Standard ist nur fuer Autorouten freigegeben
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

Die ZIP-Datei wird im Browser mit JSZip gelesen. Standard laedt die App beide Quellen
direkt. Ueber den Konfigurationsschalter `proxyAktiv` (Default `nein`) koennen die Abrufe
alternativ ueber den ODAS-Proxy laufen: Seit dem Plattform-Update vom 2026-08-24 erlaubt
der Proxy mehrere konfigurierte Quelle-Origin gleichzeitig, also hier GitHub-Raw und
OpenGeodata.NRW.

---

## Kompatible Datensaetze

| Konfiguration | Beschreibung | Beispiel |
| ------------- | ------------ | -------- |
| `apiurls.schulen` | JSON-Datensatz mit Schulen in Baden-Wuerttemberg | `https://raw.githubusercontent.com/Datenschule/schulscraper-data/master/schools/baden-wuerttemberg.json` |
| `apiurls.unfallatlas` | Unfallatlas CSV-ZIP | `https://www.opengeodata.nrw.de/produkte/transport_verkehr/unfallatlas/Unfallorte2024_EPSG25832_CSV.zip` |
| `routeServiceUrl` | Eigener Routing-Service mit `mode` (POST) oder passend vorbereitetem OSRM-Endpunkt | leer: oeffentlicher Standard nur fuer Auto; Fuss/Rad bleiben gesperrt |
| `geocodingServiceUrl` | Nominatim-kompatible Such-URL fuer die Adressaufloesung | leer fuer den voreingestellten oeffentlichen Dienst |

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
| ODAS        | `make zip` / Veroeffentlichung      | vom ODAS erzeugter Endpunkt `config` | direkt                       |

`make zip` erzeugt das Liefer-ZIP mit `app/`, `assets/`, `app-package.json` und `CHANGELOG.md`. Das ZIP ist ein Bauartefakt und wird nicht mitversioniert, sondern bei Bedarf mit `make zip` erzeugt.

Entwicklung und Standalone verwenden dieselbe lokale Datei `odas-config/config.json`. Der Config-Loader in `app/app-base.js` laedt sie auf `localhost` direkt unter `odas-config/config.json`. Bei einem Standalone-FQDN fragt er stattdessen `/config` ab; Nginx liefert dort ueber `nginx.conf` dieselbe gemountete Datei aus.

## Standalone-Betrieb hinter Traefik

Fuer den Standalone-Betrieb wird ein bereits vorhandener Traefik-Reverse-Proxy vorausgesetzt. Die App selbst liefert HTTP intern auf Port `80`; Traefik uebernimmt FQDN, HTTPS-Zertifikat und Weiterleitung. Der App-Container veroeffentlicht dabei keinen Host-Port.

Vor dem Start:

1. In `docker-compose.standalone.yml` den Platzhalter-FQDN `app1.example.com` durch den echten Hostnamen ohne Protokoll oder Pfad ersetzen.
2. `odas-config/config.json` an Betreiber, Datenquellen und rechtliche Texte anpassen.
3. Pruefen, dass Traefik das externe Docker-Netzwerk `proxynet`, den EntryPoint `websecure` und den Zertifikatsresolver `letsencrypt` verwendet.

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

Fuer Startadressen wird die Nominatim-Suche von OpenStreetMap genutzt. Der voreingestellte Routingdienst `router.project-osrm.org` berechnet Autorouten. Ein anderer Profilname im OSRM-URL-Pfad aendert das vorbereitete Wegenetz nicht; Fuss- und Radwege bleiben bei diesem Dienst daher gesperrt und erhalten keinen Score.

### Bewusst waehlbarer Routing-Fallback

Bei gesperrtem Fuss-/Radrouting oder einem nicht nutzbaren konfigurierten Routingdienst bietet die App **FOSSGIS-Fallback auswaehlen** an. Es gibt keinen heimlichen Dienstwechsel.

1. Den Hinweis und die [FOSSGIS-Nutzungsbedingungen](https://www.fossgis.de/arbeitsgruppen/osm-server/nutzungsbedingungen/) pruefen und den Fallback ausdruecklich auswaehlen.
2. Der Uebertragung an `routing.openstreetmap.de` zustimmen. Eine Zustimmung zum bisherigen Dienst gilt nicht fuer diesen Endpunkt.
3. Die Route erneut berechnen. Fuss, Rad und Auto nutzen getrennte Serverpfade `routed-foot`, `routed-bike` und `routed-car`.

Die Auswahl gilt nur fuer die aktuelle App-Ansicht und aendert weder Paket noch Live-Konfiguration. Wer einen geteilten Link aufruft, muss seinen Routingdienst ebenfalls bewusst waehlen. Bei Ausfall oder fehlender Route zeigt die App keinen ersatzweise erfundenen Score.

**Betriebsgrenzen:** Der oeffentliche FOSSGIS-Dienst ist kein unbeschraenkter Produktionsdienst. Er erlaubt maximal eine Anfrage pro Sekunde, kein hohes Verkehrsaufkommen und keine gewerbliche Nutzung als wesentlichen Teil eines Onlineangebots; es gibt keine Verfuegbarkeitsgarantie. Die App serialisiert Anfragen mit mindestens einer Sekunde Abstand **pro geoeffneter Seite**, auch ueber mehrere Instanzen innerhalb desselben Dokuments. Das begrenzt nicht die Summe aller Besucher/Tabs. Der Betreiber muss daher die Eignung/Freigabe fuer seinen Einsatz sicherstellen; fuer groesseren produktiven Betrieb ist ein eigener oder entsprechend freigegebener Dienst erforderlich. Bei bewusst gesetzter `routeServiceUrl: "https://routing.openstreetmap.de"` gelten dieselben Profil-, Einwilligungs- und Ratenregeln.

Eigene Nicht-OSRM-Dienste erhalten unveraendert einen JSON-POST mit `from`, `to`, `schoolId` und `mode` (`foot`, `bike`, `car`). Ein eigener OSRM-Endpunkt muss tatsaechlich das zum Modus passende Wegenetz bereitstellen; allein `/foot` oder `/bike` im Pfad ist kein Nachweis.

### Uebertragung personenbezogener Angaben an Dritte

Beide Funktionen uebertragen Angaben, die Rueckschluesse auf Wohnort und Schulweg zulassen:

| Funktion | Empfaenger (Voreinstellung) | Uebertragene Daten |
| --- | --- | --- |
| Adresssuche | `nominatim.openstreetmap.org` | Eingegebene Adresse und Ort der gewaehlten Schule |
| Autorouten (Standard) | `router.project-osrm.org` | Koordinaten von Startpunkt und Schule, **im Pfad der aufgerufenen Adresse** — sie erscheinen dadurch in den Zugriffsprotokollen des Dienstes |
| Ausdruecklich gewaehlter Fallback | `routing.openstreetmap.de` (FOSSGIS) | Start-/Zielkoordinaten im URL-Pfad, IP-Adresse und Browserkennung; Routenanfragen werden beim Anbieter protokolliert |

Wird der Standort-Knopf genutzt, ist der Startpunkt die tatsaechliche Position des Geraets.
`router.project-osrm.org` ist eine oeffentliche Demonstrationsinstanz des OSRM-Projekts und
nicht fuer den Produktivbetrieb vorgesehen.

**Die App fragt vor der ersten Uebertragung.** Ohne Zustimmung findet keine dieser
Uebertragungen statt; Adresssuche und Routenberechnung bleiben deaktiviert. Kartenansicht,
Schulsuche und Unfallpunkte funktionieren auch ohne. Die Entscheidung wird lokal im Browser
gespeichert (localStorage, an das Endpunktpaar gebunden) und ist jederzeit widerrufbar. Ein Widerruf oder eine Aenderung der Startadresse verwirft laufende Routen; verspaetete Adressantworten duerfen keine veraltete Route nachladen.

**Fuer Betreiber:** Ueber `geocodingServiceUrl` und `routeServiceUrl` lassen sich eigene
Instanzen hinterlegen; die App nennt dann diese im Hinweis und in der Datenschutzangabe.
Wer die mitgelieferte `datenschutz`-Angabe uebernimmt, ohne eigene Dienste zu setzen,
uebernimmt damit auch die Nennung der beiden oeffentlichen Dienste — das ist beabsichtigt
und muss zur tatsaechlichen Konfiguration passen.

Der Route-Score nutzt eine Skala von 0 bis 100. `0` bedeutet, dass im 50-m-Routenkorridor keine relevanten Unfallpunkte liegen; jeder Treffer erhoeht den Wert, wobei Kinderbeteiligung, Fuss-/Radbezug und neuere Unfaelle staerker gewichtet werden. Unter `2` gilt als geringes Risiko, `2` bis unter `6` als erhöhte Aufmerksamkeit und ab `6` als kritisches Risiko.

---

## Datenquellen und Attribution

- Schuldaten: JedeSchule / Datenschule, CC0
- Unfalldaten: Unfallatlas der Statistischen Aemter des Bundes und der Laender, bereitgestellt ueber OpenGeodata.NRW, Datenlizenz Deutschland Namensnennung 2.0
- Kartendaten: OpenStreetMap-Mitwirkende, ODbL
- Geocoding und Routing: OpenStreetMap/Nominatim und OSRM-kompatible Routingdienste; optional [FOSSGIS](https://routing.openstreetmap.de/about.html)
- [OpenStreetMap-Kartenfehler melden](https://www.openstreetmap.org/fixthemap)

---

## Beim Aufruf kontaktierte Drittanbieter

Beim Aufruf dieser App werden folgende externe Server kontaktiert:

- `tile.openstreetmap.org` — Kartenkacheln (OpenStreetMap)
- `nominatim.openstreetmap.org` — Adress-Suche (Geocoding); übertragen: Suchbegriffe, IP-Adresse, User-Agent; Abruf nur nach Einwilligung
- `router.project-osrm.org` — Autoroutenberechnung (OSRM); übertragen: Start- und Zielkoordinaten, IP-Adresse, User-Agent; Abruf nur nach Einwilligung
- `routing.openstreetmap.de` — bewusst waehlbarer FOSSGIS-Fallback fuer Fuss-, Rad- und Autorouten; dieselben technischen Angaben, Abruf nur nach dienstbezogener Einwilligung; [Datenschutz](https://www.fossgis.de/datenschutzerklärung/)

Diese Anbieter bleiben auch im Standalone-Betrieb extern; ein vollständig autarker Betrieb ohne Internetzugang ist derzeit nicht möglich. Alle Programmbibliotheken werden lokal aus `app/vendor/` ausgeliefert und nicht mehr extern geladen.

## Regressionstests

```bash
node --test tests/*.test.cjs
```

Die Tests verwenden die tatsaechliche App-Logik; nur Browser-Oberflaeche und externe Netzantworten werden isoliert. Geprueft werden Modus-Sperre, korrekte Fallback-Pfade, Einwilligung, Ratenbegrenzung, verworfene/abgebrochene Routen und Adressantworten sowie Schulsuche und Cache-Aufbereitung.

Die Korrektur des Quellnamens `…sterfeldschule Grundschule Vaihingen` ist auf die bekannte ID `BW-129123` und genau diesen defekten Namen begrenzt. Referenz: [Landeshauptstadt Stuttgart – Oesterfeldschule](https://www.stuttgart.de/organigramm/adresse/oesterfeldschule), geprueft am 08.10.2026. Andere Namen/Auslassungszeichen werden nicht geraten oder pauschal ersetzt. Mehrteilige Suchanfragen muessen mit allen Begriffen zur Schule passen.

## Autor

(C) 2026, Ondics GmbH
