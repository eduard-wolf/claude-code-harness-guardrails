[English](README.md) | Deutsch

# claude-code-harness-guardrails

[![guards](https://github.com/eduard-wolf/claude-code-harness-guardrails/actions/workflows/guards.yml/badge.svg)](https://github.com/eduard-wolf/claude-code-harness-guardrails/actions/workflows/guards.yml)

<!-- section: what -->
## Was das ist

Wenn Claude-Code-Sessions lang und autonom laufen, veralten zwei Dinge am
schnellsten: die **Zahlen in den eigenen Dokumenten** und das **Vertrauen in
die eigenen Prüfungen**. Dieses Repository liefert die Gegenmittel für
beides, destilliert aus einem Produktions-Korpus von 85 Session-Briefings
und 49 Ergebnisberichten:

- einen **Katalog gemessener Werkzeugfallen** — als Skill installierbar,
  damit Sessions sie kennen, ohne sie auf die teure Art neu zu lernen;
- ein **Session-Brief-Muster** für langlaufende Agenten-Ketten (ein
  Session-Brief — hier kurz: Briefing — ist das Dokument, das einen
  autonomen Lauf startet und vom Lauf davor geschrieben wird) — die zehn
  Bauteile, die messbar getragen haben, und die, die sich als Ritual
  erwiesen;
- die **ehrliche Messung** dessen, was diese Methode leistet und was nicht.

Der Tenor des ganzen Katalogs, je eine Zeile:

```bash
git grep -E 'foo\s*\('        # still null Treffer auf macOS, trifft auf glibc
false; echo "EXIT=$?"         # liefert EXIT=1 - und meldet dem Harness Exit 0
```

Es ist kein Framework, kein schlüsselfertiger Harness und kein Versprechen,
dass alles besser wird. Es ist auch keine Permission-Firewall: Es richtet
sich gegen stilles Falschsein — Zahlen, die unbemerkt veralten, Prüfungen,
die lautlos nichts prüfen —, nicht gegen gefährliche Kommandos. Es ergänzt
Anthropics veröffentlichte Harness-Patterns; es ersetzt sie nicht.

<!-- section: quickstart -->
## Fünf Minuten

Den Fallen-Katalog als Skill installieren (Claude Code ≥ 2.0):

```
/plugin marketplace add eduard-wolf/claude-code-harness-guardrails
/plugin install tool-traps@claude-code-harness-guardrails
```

Oder von Hand kopieren — es ist eine einzelne Markdown-Datei:

```bash
git clone https://github.com/eduard-wolf/claude-code-harness-guardrails
cp -r claude-code-harness-guardrails/plugin/skills/tool-traps ~/.claude/skills/
```

(Die Marketplace-Kurzform klont standardmäßig per SSH; ohne hinterlegten
SSH-Schlüssel vorher `CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1` setzen.
Projektlokal statt global: in `.claude/skills/` des Projekts kopieren.)

Außerhalb von Claude Code — für jede Agenten-CLI:

```bash
npx skills add eduard-wolf/claude-code-harness-guardrails
```

Das schreibt den Katalog einmal nach `.agents/skills/tool-traps/` und
verlinkt ihn in die agentenspezifischen Verzeichnisse, die die CLI
unterstützt, Claude
Code darunter (verifiziert 2026-08-24, skills-CLI 1.5.23). Installiert
wird in das Verzeichnis, in dem das Kommando läuft — am selben Tag in
einem ohne `.git` und ohne `package.json` gemessen: auch dort landete es
in `./.agents/`; `-g` installiert stattdessen global. Die Fallen
11 bis 14<!-- trap-group: Claude Code harness = 11-14 -->
sind die Katalog-Gruppe „Claude Code harness“ und an diesen Harness
gebunden; alles andere darin ist werkzeugnah und agentenunabhängig.

Deterministische Prüfung, für den Plugin-Weg: `/plugin` listet `tool-traps`
als installiert. Danach die Spaßprobe, die für jeden Weg gilt: die Session
bitten, ein `git grep` mit `\s` zu schreiben — sie sollte ablehnen und zu
`[[:space:]]` greifen.

<!-- section: proof -->
## Was wir belegen können — und was nicht

Ich habe die Methode an ihrem eigenen Korpus vermessen, bevor ich sie
veröffentlicht habe. Belegt ist eines, schmal und nützlich: **eine mechanische
Prüfung fängt eine reale Fehlerklasse** — veraltete Zahlen in lebenden
Dokumenten. Sie fing vier davon in CI, nachdem eine Session sie gepusht
hatte, und vier weitere vor einem späteren Push.

Die Hauptmessung dagegen stützt **nicht** die Geschichte, die man an dieser
Stelle erwarten würde:

> Bei n = 2 Sessions nach der Harness-Optimierung ist kein Trend belegbar —
> Welch-t ≈ 1,9, p ≈ 0,12 — und eine Session von *vor* der Optimierung
> unterbot bereits beide Nachher-Werte.

Zwei ehrliche Grenzen dieser Zahl: Sie misst eine Harness-Optimierung
*innerhalb* des Quellprojekts — nicht den Fallen-Katalog und nicht das
Session-Brief-Muster, die auf anderen Messungen ruhen (den Ritual-Befunden, den
62 % der Pushes ohne CI-Lauf, dem Kontrollpaar Überlauf/geplanter
Schnitt). Und die
Statistik selbst ist eine Behauptung aus dem Quell-Korpus, deren
zugrunde liegende Serie nie dauerhaft festgehalten wurde — im
Zahlen-Kapitel als solche dokumentiert. In den Worten des Korpus selbst:

> „Das Netz ist dichter geworden, der Fisch nicht nachweislich größer.“
>
> „Der rote CI-Lauf belegt Kompensation, nicht Disziplin.“

Die vollständigen Zahlen, ihre Grundgesamtheiten und die Drift, die beim
Bau dieses Repositories im eigenen Auftrags-Briefing gefunden wurde:
**[docs/what-the-numbers-say.md](docs/what-the-numbers-say.md)** (englisch).

<!-- section: traps -->
## Der Fallen-Katalog

**15**<!-- count:traps --> Fallen in sechs<!-- count:trap-groups --> Gruppen —
jede real ausgelöst, jede mit Symptom, Mechanismus, Verifikationsdatum und
dem Guard dagegen. Keine erdachten Risiken. Drei Kostproben:

- `description: Use when: always` ist ein harter YAML-Parse-Fehler: Der
  Agent ist danach schlicht weg („Agent type not found“), der Skill wird
  zum Zombie — lebendig per Slash-Kommando, tot im Auto-Trigger. (Falle 11)<!-- trap-ref: 11 YAML -->
- Ein *mitten in der Session* angelegtes Agents-Verzeichnis bleibt bis zum
  nächsten Start unsichtbar — der Dateiwächter kennt nur Verzeichnisse, die
  es beim Session-Start gab. Die Datei liegt da, der Agent fehlt. (Falle 12)<!-- trap-ref: 12 agents -->
- Das Auto-Memory (`MEMORY.md`) wird bei 200 Zeilen / 25.000 Zeichen still
  abgeschnitten — gemessen, einschließlich des Umstands, dass der interne
  Name des Limits „Bytes“ sagt und Zeichen meint. (Falle 13)<!-- trap-ref: 13 memory -->

Sie zu kennen ist nicht dasselbe, wie vor ihnen sicher zu sein: Im
Quell-Korpus wurden zwei Fallen des Katalogs ausgelöst, *während die
Warnung wörtlich im eigenen Briefing der Session stand* — eine davon in
drei verschiedenen Sessions. Wissen überlebt den Kontakt mit dem
Autopiloten nicht; mechanische Prüfungen schon — deshalb endet hier jeder
Eintrag mit einem Guard, nicht mit einer Ermahnung.

Vollständiger Katalog (zugleich die Datei, die der Skill installiert):
**[plugin/skills/tool-traps/SKILL.md](plugin/skills/tool-traps/SKILL.md)**
(englisch).

<!-- section: briefs -->
## Das Session-Brief-Muster

Der Korpus ist auf zehn Bauteile konvergiert: Lebenszyklus-Kopf ·
Lies-zuerst-Liste mit vorab aufgelösten Konflikten · der eine Satz samt
Prüfstein · gemessener Ausgangszustand („miss die Zahlen deines Vorgängers
nach — weicht deine Messung ab, gilt deine, mit Beleg“) ·
Owner-Entscheidungen plus Entscheiden-statt-Anhalten-Default · Nicht-Ziele
mit Begründungen · Fallen-Katalog · **Kontext-Budget mit benannter Naht**
(„ein geplanter Schnitt ist eine saubere Lieferung; ein Auflaufen ist es
nicht“) · Gate mit exakten Zahlen und gegengeprobten Guards ·
Abschluss-Protokoll, das damit endet, dass die Session das nächste Briefing
selbst schreibt.

Der kontraintuitive Kern, im Korpus gemessen: **Das Briefing ist ein
Ketten-Output, kein Menschen-Input.** Vorgefertigte Skeleton-Templates sind
dort gescheitert — keines wurde je so gefahren, wie es geschrieben war;
jedes musste erst von Hand auf das Elf- bis Dreiundzwanzigfache ausgebaut
werden. Getragen haben Briefings, die die scheidende Session schreibt,
solange ihr Wissen frisch und gemessen ist. Das Template hier ist die
*Saat* für das erste Briefing, kein Formular für jede Session.

- Template: **[template/session-brief.md](template/session-brief.md)**
- Durchgearbeitetes Beispiel (ESLint-8→9-Migration):
  **[examples/eslint-9-flat-config.md](examples/eslint-9-flat-config.md)**
- Das Muster mit Belegen, Ausfallarten und dem Vergleich zu Anthropics
  Harness-Literatur: **[docs/method.md](docs/method.md)** (englisch)

<!-- section: self-application -->
## Dieses Repository bewacht sich selbst

Zwei Sprachfassungen sind zwei Register desselben Inhalts, und Register
driften — genau das ist das Kernthema dieses Repositories. Also wendet es
die eigene Methode auf sich selbst an, in CI, bei jedem Push:

- **[guards/check-readme-parity.mjs](guards/check-readme-parity.mjs)** —
  README.md und README.de.md müssen dieselben Abschnitte in derselben
  Reihenfolge führen (geprüft über unsichtbare Abschnitts-Anker, nicht über
  Prosa — Struktur-Drift wird mechanisch gefangen; ob eine Übersetzung
  *aktuell* bleibt, ist Handarbeit, und das hier zu sagen ist Teil der
  Methode).
- **[guards/check-counts.mjs](guards/check-counts.mjs)** — jede in dieser
  README für den Guard *markierte* Anzahl (wie die Fallen-Zahl oben) wird
  gegen das Artefakt selbst nachgemessen. Kein zweites Register: Der
  Katalog ist die einzige Quelle seiner eigenen Anzahl. Derselbe Guard
  misst jeden Fallen-Verweis dieser README nach — ein
  `(Falle 11)<!-- trap-ref: 11 YAML -->` muss weiterhin auf den Eintrag
  zeigen, den es nennt, und ein unmarkierter Verweis ist ebenfalls rot, so
  dass eine Umnummerierung die Prosa nicht still falsch stehen lassen kann.
  Dazu hält er eine unmarkierte Invariante: so viele `**Guard:**`-Zeilen im
  Katalog wie Einträge. Erst das macht „jeder Eintrag endet mit einem
  Guard“ zu einer Messung statt zu einem Versprechen. Die Korpus-Zahlen
  (85 Briefings, 262 Dateien, Zeilenzahlen) sind historische Messungen mit
  Datum und ohne Maschine — bewusst unmarkiert, weil keine Datei dieses
  Repositories sie nachmessen kann.
- **[guards/verify-traps.mjs](guards/verify-traps.mjs)** — die Daten am
  Fallen-Katalog hören auf, ein Versprechen zu sein. Bei jedem Push fährt der
  Runner jede Falle nach, hinter die dieser Guard eine Probe stellen kann:
  erst die Form, die die Falle auslöst, dann das Gegenmittel, das der Eintrag
  dagegen nennt — und verifiziert ist ein Eintrag erst, wenn die Falle
  zuschnappt *und* das Gegenmittel sie aufhält, denn eine Probe, die beides
  nicht auseinanderhalten kann, hat keines von beiden gemessen. Was
  ungeprüft bleibt, fällt nicht still weg. Fallen, die im Claude-Code-Harness
  leben, eine, die eine Test-Runner-Installation bräuchte, eine, die sich
  erst über eine Reihe von Pushes zeigt, solche, deren Mechanismus eine
  Logikklasse ist, die kein Host variieren kann, und alle, deren Shell oder
  Interpreter dieser Host nicht mitbringt: Jede wird mit Nummer und dem
  Grund benannt, warum sie nicht gefahren wurde, und der Guard wird nicht
  grün, solange ein Katalogeintrag weder
  geprüft noch erklärt ist. Seine Ausgabe ist diese Liste, deshalb führt
  diese README keine zweite Kopie davon. Reproduziert eine Falle einmal
  nicht mehr, wird der Guard absichtlich rot. Das ist der Katalog, der um
  Nachprüfung bittet, kein kaputter Build. Zwei Katalogeinträge sind von
  ihren eigenen Proben bereits widerlegt worden, [mit den
  Messwerten](docs/what-the-numbers-say.md) (englisch).

Alle drei<!-- count:guards --> Guards fahren zuerst ihre **Gegenprobe**
(`--self-test`): Jeder beweist, dass er rot werden *kann*, bevor sein Grün
zählt. Ein Guard ohne Gegenprobe ist eine Behauptung.

<!-- section: provenance -->
## Woher die Zahlen kommen

Jede Zahl in diesem Repository trägt Quelle und Grundgesamtheit — siehe
[docs/what-the-numbers-say.md](docs/what-the-numbers-say.md). Der
Quell-Korpus ist der Arbeits-Korpus von
[wolf-agents.com](https://wolf-agents.com), einem solo gebauten
Produktions-B2B-Security-SaaS (~190k Zeilen Anwendungs-TypeScript und
~174k Zeilen Tests, gemessen 2026-08-21 mit der Zählregel im
Zahlen-Kapitel; 262 Dateien in seiner Review-Kette). Der Korpus selbst
wird nicht veröffentlicht — er enthält Architektur- und Sicherheitsbefunde
eines laufenden Produkts. Veröffentlicht ist das Muster, nicht der Korpus.

Nichts hier behauptet, die Methode sei bewiesen. Belegt ist, dass eine
Prüfung eine reale Fehlerklasse fängt; der Rest ist ein Muster mit
angehefteten Messungen — damit du die Messung selbst nachfahren kannst.

<!-- section: about -->
## Autor, Lizenz, Status

Gebaut von **Eduard Wolf** (eduard@wolf-agents.com) — destilliert aus dem
Quell-Korpus von [wolf-agents.com](https://wolf-agents.com), solo
entwickelt und fast vollständig über gebriefte, autonome
Claude-Code-Sessions. Die Commits hier tragen eine Claude-Co-Autor-Zeile,
also soll die Arbeitsteilung dastehen statt anzuklingen: Die Sessions
schrieben den Code und die Briefings; der menschliche Anteil ist die
Methode, die Wahl dessen, was gemessen wird, das Urteil darüber, was trägt
und was Ritual ist — und jeder Push. MIT-Lizenz.

Der naheliegende Einwand schreibt sich von selbst: ein KI-geschriebener
Korpus als Beleg für eine Methode über KI-Sessions. Die Antwort hier heißt
Trennung, nicht Zusicherung. Der Push ist ein Fall davon — eine Session
bereitet ihn vor, ein Mensch entscheidet ihn. Eine Ebene tiefer, im
Quellprojekt, aus dem das hier destilliert ist, ist Prüfung genauso von
Erzeugung getrennt: Ein adversariales Review-Gate liest die Arbeit mit
frischem Kontext, und die *eigene* Durchschlupfquote dieses Gates (escape
rate) wird gemessen statt geschätzt. Diese Kennzahl und ihre benannten
Grenzen — sie trennt Selbstauskunft von Fremdbefund, sie löst die
Mehrdeutigkeit nicht auf —
stehen in [docs/what-the-numbers-say.md](docs/what-the-numbers-say.md)
(englisch), das Muster und der Vergleich zu Anthropics Harness-Literatur
in [docs/method.md](docs/method.md) (englisch).

Fallen-Verifikationen sind datiert (letzter voller Durchgang: 2026-08-21),
und die Teilmenge, die ein Linux-Runner reproduzieren kann, wird bei jedem
Push in CI nachgefahren — der Rest wird dort benannt statt angenommen.
Werkzeuge ändern sich; reproduziert eine Falle mit deiner Version nicht
mehr, ist das ein Befund — ein Issue mit Repro schlägt ein Issue mit
Meinung.
