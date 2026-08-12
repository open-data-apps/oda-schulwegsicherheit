# Changelog

## 1.29.0 - 2026-08-12
- FIX: Einwilligungs-Lesezugriff (`hasConsent`) in try/catch gekapselt, fail-closed — bei blockiertem Browserspeicher bricht die App-Initialisierung nicht mehr ab und es gehen keine Daten an Drittdienste (F-50)

## 1.28.0 - 2026-08-11
- FIX: XSS- und URL-Vertrag geschlossen (F-35): `safeHttpUrl` für die konfigurierten Schulen-/Unfall-Daten-URLs auf der Beschreibungsseite; ungültige Schemata rendern nur noch einen Button ohne Link
- FIX: Einwilligung endpoint-gebunden (F-37): Zustimmung gilt nur für das konfigurierte Geocoding-/Routing-Endpunktpaar (localStorage-Key mit Endpunkt-Identität, Consent-Version v2); Modul-Zustand und Übernahme-Mechanik entfernt, Abrufpfade prüfen `hasConsent()` mit den konfigurierten URLs

## 1.27.0 - 2026-08-10
- FIX: Laufzeitzustand pro App-Instanz isolieren (F-34)

## 1.26.0 - 2026-08-08
- CHG: Bootstrap-Ziele instanzeindeutig (F-32): Score-Modal (`#score-info-modal`), KPI-Kontext- (`#sws-kpi-kontext-<n>`) und Methodik-Ziele (`#sws-methodik-body`) um eine Instanzkennung ergänzt; die Kennung wird je Laufzeit in `createRuntime` geführt (`runtime.uid`)

## 1.25.0 - 2026-08-06
- FIX: Datenschutzangabe beschreibt den tatsaechlichen Stand nach dem Vendoring (Welle G)

## 1.24.0 - 2026-08-06
- FIX: Drittanbietersektion nennt keine Beim-Aufruf-Behauptung mehr (Welle G)

## 1.23.0 - 2026-08-06
- FIX: Drittanbieterliste "Beim Aufruf kontaktierte Drittanbieter" an das Vendoring angepasst — jetzt lokal ausgelieferte Bibliotheken (Leaflet.heat sowie JSZip) sind aus der Liste entfernt, weiterhin extern geladene Dienste (Kartenkacheln) bleiben genannt

## 1.22.0 - 2026-08-06
- FIX: Leaflet.heat und JSZip vendored in `app/vendor/` statt von CDN geladen (Vendoring Teil 3) — Standalone-Betrieb laedt die Zusatzbibliotheken nicht mehr extern

## 1.21.0 - 2026-08-06
- FIX: Leaflet.heat auf 0.2.0 exakt gepinnt (vorher ohne Versionsangabe — bei jedem Aufruf eine andere Version, Voraussetzung fuer Vendoring)

## 1.20.0 - 2026-08-04
- FIX: Datenschutzhinweis "Beim Aufruf kontaktierte Drittanbieter" an das Vendoring angepasst — jetzt lokal ausgelieferte Bibliotheken (Bootstrap/Leaflet/Chart.js) sind aus der Liste entfernt, weiterhin extern geladene Dienste (Kartenkacheln, Zusatzbibliotheken) bleiben genannt

## 1.19.0 - 2026-08-04
- FIX: Bootstrap, Leaflet vendored in `app/vendor/` statt von CDN geladen (F-07 Teil 2) — Standalone-Betrieb laedt diese Bibliotheken nicht mehr extern

## 1.18.0 - 2026-08-04
- FIX: `brandingCSS`/`brandingCSSFile` faelschlich als `"erforderlich": "ja"` deklariert (Kopierfehler seit Erstcommit); jetzt konsistent zum restlichen Portfolio auf `"nein"` gesetzt
- CHG: `loadPage`-Monkey-Patch fuer die Seite "beschreibung" durch den offiziellen Template-Hook `renderPageOverride(page)` (oda-generic 1.6.0) ersetzt (F-27b) — funktional unveraendert, aber ohne Abweichung von `app/app-base.js`

## 1.17.0 - 2026-08-04
- FIX: Drittanbieter (CDN, Kartendienste) in `datenschutz`-Default und README dokumentiert (F-07 Teil 1)
- FIX: Bootstrap CSS/JS auf einheitlich 5.3.8 gezogen (vorher gemischt 5.3.0/5.3.1 bzw. 5.3.0/5.3.0) (F-31)

## 1.16.0 - 2026-07-31
- FIX: Markdown-Reste in `beschreibung` durch HTML ersetzt (F-23), einschliesslich der
  lokalen Konfiguration; die F-26-Aussagen zur Uebertragung an externe Dienste bleiben
  inhaltlich unveraendert

## 1.15.0 - 2026-07-31
- CHG: assets/schema.json auf ein flaches Frictionless Table Schema gebracht (F-20)

## 1.14.0 - 2026-07-30

- **FIX:** Die Datenschutzangabe war unzutreffend. Sie sagte, die Position werde „nur fuer die laufende Bewertung im Frontend verarbeitet" — tatsaechlich gehen die eingegebene Adresse an den Geocoding-Dienst und die Koordinaten von Startpunkt und Schule an den Routing-Dienst. Der Text benennt jetzt beide Dienste, die uebertragenen Daten und den Zweck
- **ENH:** Vor der ersten Uebertragung an einen der beiden Dienste wird um Zustimmung gebeten. Ohne sie findet keine Uebertragung statt; Adresssuche und Routenberechnung bleiben deaktiviert, Kartenansicht, Schulsuche und Unfallpunkte funktionieren weiter. Die Entscheidung wird lokal gespeichert und ist jederzeit widerrufbar
- **FIX:** Die Adresssuche uebertrug bereits waehrend des Tippens an den Geocoding-Dienst, ohne dass ein Knopf gedrueckt werden musste. Sie wird jetzt erst nach erteilter Zustimmung ausgeloest
- **ENH:** Neuer Konfigurationsschluessel `geocodingServiceUrl`. Der Geocoding-Endpunkt war bisher fest im Code verdrahtet; Betreiber koennen jetzt wie beim Routing eine eigene Instanz hinterlegen. Der Hinweis und die Datenschutzangabe nennen den tatsaechlich konfigurierten Dienst
- **FIX:** `proxyAktiv` ist als `dropdown` mit den Werten `nein` und `ja` deklariert statt als freier `string`. Bisher schaltete ein Tippfehler still auf den Direktmodus
- **DOC:** README und App-Beschreibung benennen die Uebertragung an Dritte, die betroffenen Funktionen und die Konfigurationsschluessel fuer eigene Instanzen

## 1.13.0 - 2026-07-30

- **FIX:** Laufzeitfehler nach dem Laden der Konfiguration werden jetzt sichtbar gemeldet; die Base besitzt einen Fehlerpfad und maskiert die Meldung
- **FIX:** `getConfigUrl()` schneidet bei einer URL ohne abschliessenden Schraegstrich nicht mehr das letzte Verzeichnis ab
- **FIX:** Klick auf einen Hash-Link, der bereits die aktive Seite bezeichnet, rendert die Seite neu. Das uebernimmt jetzt `setupSamePageLinks()` der Base; der app-eigene Burger-Menue-Handler entfaellt
- **FIX:** Beim Wechsel auf die Beschreibungsseite wird die Karte der Startseite jetzt abgeraeumt. Der app-eigene `loadPage`-Override umging bisher den Aufraeumpfad der Base
- **ENH:** `app/app-base.js` ist wieder byte-identisch zum Template `oda-generic` 1.4.0. Das Freigeben von Karte, Geocoding-Timer und Cleanup-Callbacks laeuft ueber den neuen Hook `onPageLeave(page)` in `app/app.js`
- **ENH:** Die Asset-Pfad-Fallbacks in der Base entfallen. Die Pfade werden jetzt je Konfigurationsdatei passend angegeben: `app-package.json` fuehrt die Produktionsform `assets/...` (so liefert der ODAS-Live-Betrieb die App aus), `odas-config/config.json` die Testform `../assets/...` (Live-Server und Standalone). Der Fallback probierte bisher beide Formen durch

## 1.12.0 - 2026-07-24

- **FIX:** Laufzeit-Fehlermeldung wird vor der Anzeige HTML-maskiert (`escapeHtmlForBase`); ein Fehlertext kann kein Markup mehr in die Seite einschleusen (XSS)
- **FIX:** Startseiten-Renderer wird nun `await`et; bei asynchronen Apps erscheint kein kurzzeitiges `[object Promise]` in `#main-content`

## 21.07.2026 (Version 1.11.0)

- ENH: Standalone-Betrieb hinter Traefik ergaenzt (`STANDALONE=true make up`, `docker-compose.standalone.yml`, neuer `/config`-Endpunkt in `nginx.conf`), analog zur Schwester-App Unfallatlas.
- FIX: `Dockerfile` kopierte die App-Dateien auf die Wurzel des Nginx-Webroots statt nach `html/app`, wie es `nginx.conf` erwartet; funktionierte bisher nur zufaellig durch den Compose-Volume-Mount. Docker-Service in `docker-compose.yml` von `web` zu `oda-app` umbenannt.
- ENH: Regelbasierte Empfehlungen bei erhoehtem oder kritischem Risiko ("Empfehlungen"-Panel) auf Basis der bewerteten Unfallpunkte im Routenkorridor ergaenzt.
- ENH: Schul- und Unfalldaten werden im Browser (IndexedDB) zwischengespeichert; konfigurierbare Gueltigkeit ueber `cacheTtlStunden` (Standard 24 Stunden), Hinweis auf Zwischenspeicher-Nutzung im Datenfrische-Label.
- ENH: Vollstaendiger Share-Link (Schule, Startadresse, Wegtyp als URL-Parameter) inklusive "Link kopieren"-Button; ein geteilter Link laedt die identische Bewertung automatisch.
- ENH: Routenlinie wird abschnittsweise nach lokaler Unfallgewichtung eingefaerbt (Segment-Risiko), zusaetzlich zum bestehenden Gesamt-Score.
- FIX: Laufende Initialisierung, Routenberechnung und Standortsuche pruefen nach jedem Netzwerk-Abruf, ob die Seite zwischenzeitlich verlassen wurde, und brechen sonst sauber ab (verhindert Leaflet-Fehler auf einer bereits entfernten Karte, analog zu einem Fix in der Schwester-App Unfallatlas).
- ENH: Empfehlungen erscheinen jetzt direkt unter der Score-Anzeige in der Bedienleiste statt am Ende der Detailkacheln; generische Formulierungen ("Blick auf die Liste lohnt sich") wurden durch konkrete Orts-/Merkmalsangaben ersetzt.
- FIX: "Link kopieren"-Button in "Route teilen" umbenannt, damit die Share-Funktion erkennbar ist.
- FIX: Breite Kacheln (Relevante Unfallpunkte, Methodikbox, Weitere Infos) spannten auf Desktop-Breiten faelschlich nicht die volle Breite; "Routenbewertung" wirkte dadurch zusammengequetscht. Grid-Layout korrigiert und Spaltenverhaeltnis zugunsten von "Routenbewertung" angepasst.
- FIX: Der Score-Meter-Balken hatte seine Farbzonen fest auf eine 100er-Skala programmiert, obwohl "kritisches Risiko" schon ab 6 beginnt - dadurch wirkte der Balken fast durchgehend rot. Anzeige auf einen realistischen Referenzwert umgestellt; der Score-Rohwert und die technische Obergrenze (100) sind unveraendert.
- ENH: Empfehlungen bei kritischem Risiko enthalten jetzt konkrete Handlungsvorschlaege statt reiner Beschreibung (z.B. "Elternlotsen einsetzen", "auf Fussweg wechseln", "Abschnitt meiden") sowie einen Transparenz-Hinweis zu den automatisch verglichenen Routenvarianten (inkl. Hinweis auf andere Wegtypen und lokale Ansprechpartner, wenn keine Variante deutlich sicherer ist).

## 30.06.2026 (Version 1.10.0)

- ENH: KPI-Kontext (Schale 4 / TODO 1) fuer die Gefahren-Kennzahlen im Karten-Overlay ergaenzt – optionale Erklaertexte je Wert ueber ein ausklappbares ⓘ-Element (`kpiKontext1`–`kpiKontext4`, leer = kein Kontext).
- FIX: `datenquelleHinweis` und `datenStand` wurden in `normalizeConfig` nicht durchgereicht, wodurch die Methodikbox (Version 1.9.0) nie angezeigt wurde; Keys werden jetzt korrekt uebernommen.

## 16.06.2026 (Version 1.9.0)

- ENH: Methodikbox (ausklappbar) mit Datenquelle-Hinweis und Datenstand ergaenzt (`datenquelleHinweis`, `datenStand`).
- FIX: Datenquellen-Links auf der Beschreibungsseite als anklickbare Links dargestellt.

## 16.06.2026 (Version 1.8.0)

- ENH: Schale-4-Verstaendlichkeit ergaenzt – „Fuer wen ist diese App?"-Block in Beschreibung und README.
- ENH: Konfigurierbarer Abschnitt „Weitere Informationen" mit weiterfuehrenden Links (neues Feld `weiterfuehrendeLinks`, leer = ausgeblendet).
- ENH: Automatisches Datenfrische-Label, das den juengsten Unfalljahrgang (`UJAHR`) der geladenen Unfalldaten anzeigt.

## 05.06.2026 (Version 1.7.1)

- FIX: Filterung fuer ODAS-Proxy-Nutzung hinzugefuegt. Nur relative/interne Abrufe laufen ueber den Proxy, da dieser externe Domains (GitHub/OpenGeodata.NRW) nicht proxieren kann (behebt App-Fehler bei aktivem Proxy).
- FIX: Feldtyp `proxyAktiv` in `app-package.json` von `dropdown` auf `string` umgestellt (behebt Inkompatibilitaet mit manchen ODAS-Versionen).

## 05.06.2026 (Version 1.7.0)

- ENH: Hash-basiertes Routing fuer die Seitennavigation implementiert (ermoeglicht Browser vor/zurueck Navigation und Deep Linking/Bookmarks)
- ENH: Aufraeumprozess (teardownRuntime) bei Seitenwechseln integriert, um aktive Karteninstanzen und Timer sauber zu beenden

## 03.06.2026 (Version 1.6.0)

- ENH: Standortbestimmung mit Ladezustand, deaktiviertem Button und zweitem Ortungsversuch stabilisiert
- ENH: Routenbewertung als uebersichtlicher Score-Guide mit Skala, Schwellen und Faktoren dargestellt
- ENH: Standortmeldungen fuer unsichere Browser-Kontexte und Berechtigungsstatus nachgeschaerft

## 03.06.2026 (Version 1.5.0)

- ENH: Sichtbarer ODAS-Instanztitel auf Schulwegsicherheit BW umgestellt
- FIX: Fuzzy-Suche fuer Moerike/Maerike-Faelle praezisiert
- ENH: Score-Skala in der Routenbewertung erklaert
- ENH: Standortfehlermeldungen mit Desktop-/Mobile-Hinweisen erweitert

## 03.06.2026 (Version 1.4.0)

- ENH: Schulsuche mit Suchindex, Tippfehler-Toleranz, Umlaut-/OE-Normalisierung und besserer Ort-/Adress-Sortierung verbessert
- ENH: Doppelte Schuleintraege aus externen Schuldaten werden beim Laden zusammengefuehrt
- ENH: Ergebnisliste ist kompakter, unterscheidet gleiche Schulnamen ueber Ort/Adresse klarer und unterstuetzt Pfeiltasten plus Enter

## 03.06.2026 (Version 1.3.0)

- ENH: Schulsuche mit besserer Treffer-Sortierung, Adresskontext und geschlossenem Ergebniszustand verbessert
- ENH: Startkoordinaten durch Startadress-Suche, Kartenklick und Standortfunktion ersetzt
- ENH: Fuss-, Rad- und Autorouting ueber OSRM-kompatible Routen statt direkter Luftlinie integriert
- FIX: Routingbewertung nutzt nun echte Routengeometrien; bei fehlender Route wird kein direkter Fallback mehr angezeigt

## 03.06.2026 (Version 1.2.0)

- ENH: Layout auf kompakte Bedienleiste und grosse Kartenflaeche umgestellt
- ENH: Externe Schuldaten und Unfallatlas-CSV-ZIP als Laufzeitquellen integriert
- ENH: Unfallatlas-ZIP-Verarbeitung mit JSZip und schulwegrelevanter Filterung ergaenzt
- ENH: README, Makefile, app-package, Schema und lokale ODAS-Konfiguration bereinigt
- FIX: Lokale Beispieldaten und Testreste aus der App-Auslieferung entfernt
