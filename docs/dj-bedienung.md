# Edon DJ: Steckbrief

Klicke ein Deck an, um A oder B für die Tastatur auszuwählen. Der DJ-Helfer zeigt das fokussierte Deck. Dies ist Edons Belegung; andere DJ-Programme verwenden andere Hotkeys.

| Taste | Aktion |
| --- | --- |
| A / B | Deck A / B starten oder pausieren und fokussieren |
| Leertaste | Fokussiertes Deck starten oder pausieren |
| C / Shift+C | Zum Cue zurück und pausieren / aktuelle Position als Cue speichern |
| 2–5 / Shift+2–5 | Hot-Cue 1–4 anspringen / speichern; ein leerer Cue wird beim ersten Druck gespeichert |
| S | BPM- und Beat-Sync zum hörbaren Master-Deck an/aus |
| Q | Quantize an/aus |
| Z / V halten | Fokussiertes Deck vorübergehend 4 % langsamer / schneller |
| L | 4-Beat-Loop an/aus, Einstieg an aktueller Position |
| Minus / Plus (auch =) | Loop halbieren / verdoppeln (1–32 Beats) |
| Links / Rechts halten | Crossfader kontinuierlich nach A / B |
| Zusätzlich Hoch / Runter halten | Crossfader schneller / langsamer bewegen |
| Komma / Punkt | Einen Beat zurück / vor |
| Shift+Komma / Punkt | Einen Takt zurück / vor |
| P | Nächste geschätzte 8-Takt-Phrase |
| J / K (auch [ / ]) | Crossfader nach A / B |
| D | Auto-DJ an/aus |
| X | Übergang zum nächsten Queue-Song starten |
| H / ? | Hilfe öffnen/schließen |
| Escape | Regler-Auswahl aufheben |

Bei Text- und Zahlenfeldern sind die DJ-Hotkeys ausgesetzt. Links/Rechts sind auch bei fokussierten Reglern für den Crossfader reserviert, damit die andere Hand mit der Maus regeln kann. Ausgenommen sind Text-/Zahlenfelder, Auswahlmenüs und der Panel-Trenner. Loslassen, Fokusverlust oder Wechsel in ein Textfeld stoppt die Tastaturbewegung. Die Bewegung läuft unabhängig von der Tastatur-Wiederholrate: normal 5 s, schnell ca. 1,7 s, langsam ca. 16,7 s von A bis B.

## Zwei Hände mit einer Maus

Shift-Klick wählt Regler aus oder ab. Mittelklick wählt einen Regler hinzu; mit gehaltener mittlerer Maustaste lässt er sich ziehen. Danach bewegen sich beim Ziehen eines ausgewählten Reglers alle ausgewählten Regler relativ zu ihrem Wertebereich. Beispiel: Filter +10 % seines Bereichs bewegt Level ebenfalls +10 % seines Bereichs.

Halte **1**, um die Bewegung umzukehren: Der zuerst ausgewählte Regler bewegt sich in eine Richtung, alle weiteren in die Gegenrichtung. Ziehst du einen weiteren Regler, bleibt diese Zuordnung erhalten. Markierte Regler sind blau hinterlegt. Escape löst die Auswahl. Werte stoppen am jeweiligen Minimum/Maximum.

Beispiel: A Filter zuerst auswählen, A Level danach auswählen, 1 halten und Filter hochziehen: Höhenpass nimmt Bass heraus, während A leiser wird. Du kannst auch Crossfader und Filter koppeln.

## Beats, Cue und Loops

Kurze Linien zeigen Beats, stärkere Linien Takte, lange Linien 8-Takt-Phrasen. Die Anzeige zählt Takt/Beat/Phrase. Sie nimmt **4/4** an und verwendet BPM plus Beat-Offset; sie erkennt weder Taktart noch echte musikalische Abschnitte. Mit **Set downbeat** setzt du die aktuelle Position als ersten Taktschlag. Dies gilt für die aktuelle Deck-Kopie. Manuelle BPM-Korrektur steht unter More.

Cue ist eine Startmarke. Hot-Cues sind vier weitere Sprungmarken; Shift-Klick speichert eine Position. Kopfhörer-Vorhören/PFL ist noch nicht implementiert. Loops wiederholen 1, 2, 4, 8, 16 oder 32 Beats. Die Knöpfe ½ und ×2 ändern die Länge. Beim Start von Auto-DJ wird ein aktiver Loop gelöst, damit die Queue weiterlaufen kann.

## DJ-Helfer und Auto-DJ

Der Helfer zeigt Tempo-/Tonart-Kompatibilität, Pegel- und Loop-Hinweise. **Apply plan & start Auto DJ** setzt Master-BPM auf den aktuellen Song, aktiviert Sync bei ähnlichen Tempi, wählt eine Fade-Zeit und startet die Queue. **Order by compatibility** ordnet die Queue schrittweise nach dem jeweils vorhergehenden Song.

Auto-DJ lädt das nächste Stück auf das freie Deck, schätzt einen leiseren Einstieg aus den Wellenform-Peaks, beginnt den Übergang möglichst an einer 8-Takt-Grenze im letzten Songabschnitt und gleicht gemessene RMS-Pegel mit begrenztem Deck-Level an. Im Sync-Modus richtet er den Start am nächsten Beat aus. Nach A → B wird der nächste Song auf A vorbereitet.

Übergangsarten:

- **Blend:** gleichleistungsbasierte Überblendung.
- **Bass:** ausgehenden Bass absenken, eingehenden Bass anheben.
- **Filter:** den ausgehenden Song während der Überblendung mit einem Hochpass ausdünnen.
- **Echo:** rhythmische Wiederholungen während der Überblendung beimischen; dies ist kein nachlaufender Echo-Out nach dem Stoppen.
- **Smart:** bei großen Tempo-/Tonartunterschieden kurzer Echo-Übergang, bei zwei energiereichen Songs Basswechsel, sonst Blend.

Manuelles Play/Pause, Seek und Regleränderungen beenden Auto-DJ und stellen automatisierte Effektwerte wieder auf die manuellen Werte. Die Restlaufzeit begrenzt die Überblendung bei kurzen Songs.

## Klangregler

**Level:** Lautstärke des Decks. **Low/Mid/High:** Bass, Mitten, Höhen. **Filter:** positiv Hochpass (Bass weg), negativ Tiefpass (Höhen weg). **Resonance:** Betonung an der Filtergrenze. **Echo:** verzögerte Wiederholungen, Timing ¼, ½, 1 oder 2 Beats unter More (maximal 1,8 Sekunden). **Reverb:** Raumhall. **Pan:** Links-/Rechtsverteilung.

Die BPM-/Tonartanalyse und Übergangsvorschläge sind Näherungen. Es gibt keine Gesangs-/Drop-Erkennung. Sync verändert derzeit Geschwindigkeit **und Tonhöhe**; ein Verfahren zur Tempoänderung ohne Tonhöhenänderung ist noch nicht vorhanden. RMS-Abgleich ist keine LUFS-Normalisierung oder Clipping-Garantie. Die Originaldateien bleiben unverändert. Die Library ist browserlokal; nutze Backups.

## Vereinfachter Audio-Arbeitsbereich

Der Fade Planner wurde entfernt. Alte gespeicherte Pläne beeinflussen die Wiedergabe nicht mehr. Beat-Tools, Hot Cues und Timing-Einstellungen stehen bei Bedarf in aufklappbaren Bereichen. Library und Preset-Daten bleiben erhalten.

## Aktiver Master, Beat Sync, Quantize und Nudge

**Sync** übernimmt die ursprünglichen BPM des hörbaren Decks. Das andere Deck passt seine Abspielgeschwindigkeit daran an. **Beat sync** richtet zusätzlich die laufenden Beats am Master aus; beim Start des zweiten Decks wartet Edon auf den nächsten Master-Beat. Während einer Überblendung bleibt das bisherige Master-Tempo bestehen; am Endpunkt übernimmt das neue Deck seine eigenen BPM. Auto-DJ wechselt den Master nach abgeschlossenem Übergang. Der manuelle BPM-Eingang ist während Sync gesperrt.

**Quantize** setzt Seek, Cue-/Hot-Cue-Marken und Loop-Einstiege auf das geschätzte Beat-Grid. Es erkennt keine Taktart und korrigiert keine falsche BPM-Analyse. Das Grid lässt sich weiterhin mit Set downbeat und BPM korrigieren.

**Tempo Nudge** beschleunigt oder bremst nur das fokussierte Deck um 4 %. Halte Z/V oder die −/+ Knöpfe neben der tatsächlichen Deck-Tempoanzeige. Nach Loslassen gilt wieder das ursprüngliche oder synchronisierte Tempo; BPM-Metadaten ändern sich nicht. Sync und Nudge verändern weiterhin auch die Tonhöhe.

## Große Drop-Flächen

Ein Song aus der Library lässt sich auf die gesamte Fläche eines Decks ziehen, auch auf dessen Regler. Auf den übrigen Editorflächen, einschließlich Queue-Überschrift und DJ-Helfer, wird er zur Queue hinzugefügt. Audiodateien werden auf einem Deck importiert und der erste Song dort geladen; auf sonstigen Flächen importiert und eingereiht. Die Library-Fläche importiert Dateien ohne sie einzureihen. Playlist-Drops und Queue-Umsortierung behalten ihre eigene Bedeutung.
