# Changelog

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
