# Changelog

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
