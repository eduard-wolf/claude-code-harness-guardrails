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
- ein **Session-Brief-Muster** für langlaufende Agenten-Ketten — die zehn
  Bauteile, die messbar getragen haben, und die, die sich als Ritual
  erwiesen;
- die **ehrliche Messung** dessen, was diese Methode leistet und was nicht.

Es ist kein Framework, kein schlüsselfertiger Harness und kein Versprechen,
dass alles besser wird. Es ergänzt Anthropics veröffentlichte
Harness-Patterns; es ersetzt sie nicht.

<!-- section: proof -->
## Was wir belegen können — und was nicht

Wir haben die eigene Methode vermessen, bevor wir sie veröffentlichen. Das
Kopfergebnis stützt **nicht** die Geschichte, die man an dieser Stelle
erwarten würde:

> Bei n = 2 Sessions nach der Harness-Optimierung ist kein Trend belegbar —
> Welch-t ≈ 1,9, p ≈ 0,12 — und eine Session von *vor* der Optimierung lag
> bereits unter beiden Nach-Werten.

Was die Messungen *belegen*, ist schmaler und nützlicher: **eine
mechanische Prüfung fängt eine reale Fehlerklasse** — veraltete Zahlen in
lebenden Dokumenten. Sie fing vier davon in CI, nachdem eine Session sie
gepusht hatte, und vier weitere vor einem späteren Push. In den Worten des
Korpus selbst:

> „Das Netz ist dichter geworden, der Fisch nicht nachweislich größer."
>
> „Der rote CI-Lauf belegt Kompensation, nicht Disziplin."

Die vollständigen Zahlen, ihre Grundgesamtheiten und die Drift, die wir beim
Bau dieses Repositories in unserem eigenen Auftrags-Briefing fanden:
**[docs/what-the-numbers-say.md](docs/what-the-numbers-say.md)** (englisch).

<!-- section: quickstart -->
## Fünf Minuten

Den Fallen-Katalog als Skill installieren (Claude Code ≥ 2.x):

```
/plugin marketplace add eduard-wolf/claude-code-harness-guardrails
/plugin install tool-traps@claude-code-harness-guardrails
```

Oder von Hand kopieren — es ist eine einzelne Markdown-Datei:

```bash
git clone https://github.com/eduard-wolf/claude-code-harness-guardrails
cp -r claude-code-harness-guardrails/plugin/skills/tool-traps ~/.claude/skills/
```

(Projektlokal statt global: in `.claude/skills/` des Projekts kopieren.)
Danach eine Session starten und sie bitten, ein `git grep` mit `\s` zu
schreiben — sie sollte ablehnen und zu `[[:space:]]` greifen.

<!-- section: traps -->
## Der Fallen-Katalog

**14**<!-- count:traps --> Fallen in sechs Gruppen — jede real getreten,
jede mit Symptom, Mechanismus, Verifikationsdatum und dem Guard dagegen.
Keine erdachten Risiken. Drei Kostproben:

- `git grep -E 'foo\s*\('` findet **still nichts** — POSIX-ERE kennt kein
  `\s`. Eine darauf gebaute Prüfung bleibt für immer grün. (Falle 5)
- `npm run build > log 2>&1; echo "EXIT=$?"` druckt den richtigen Code —
  und meldet Harness und CI den Exit 0 des `echo`. (Falle 2)
- Das Auto-Memory (`MEMORY.md`) wird bei 200 Zeilen / 25.000 Zeichen still
  abgeschnitten — gemessen, einschließlich des Umstands, dass der interne
  Name des Limits „Bytes" sagt und Zeichen meint. (Falle 13)

Vollständiger Katalog (zugleich die Datei, die der Skill installiert):
**[plugin/skills/tool-traps/SKILL.md](plugin/skills/tool-traps/SKILL.md)**
(englisch).

<!-- section: briefs -->
## Das Session-Brief-Muster

Der Korpus ist auf zehn Bauteile konvergiert: Lebenszyklus-Kopf ·
Lies-zuerst-Liste mit vorab aufgelösten Konflikten · der eine Satz samt
Prüfstein · gemessener Ausgangszustand („miss die Zahlen deines Vorgängers
nach — weicht deine Messung ab, gilt deine, mit Beleg") ·
Owner-Entscheidungen plus Entscheiden-statt-Anhalten-Default · NICHT-Auftrag
mit Begründungen · Fallen-Katalog · **Kontext-Budget mit benannter Naht**
(„ein geplanter Schnitt ist eine saubere Lieferung; ein Auflaufen ist es
nicht") · Gate mit exakten Zahlen und gegengeprobten Guards ·
Abschluss-Protokoll, das damit endet, dass die Session das nächste Briefing
selbst schreibt.

Der kontraintuitive Kern, im Korpus gemessen: **Das Briefing ist ein
Ketten-Output, kein Menschen-Input.** Vorgefertigte Skeleton-Templates sind
dort gescheitert; getragen haben Briefings, die die scheidende Session
schreibt, solange ihr Wissen frisch und gemessen ist. Das Template hier ist
die *Saat* für das erste Briefing, kein Formular für jede Session.

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
  Prosa).
- **[guards/check-counts.mjs](guards/check-counts.mjs)** — jede in dieser
  README genannte Anzahl (wie die Fallen-Zahl oben) wird gegen das Artefakt
  selbst nachgemessen. Kein zweites Register: Der Katalog ist die einzige
  Quelle seiner eigenen Anzahl.

Beide Guards fahren zuerst ihre **Gegenprobe** (`--self-test`): Jeder
beweist, dass er rot werden *kann*, bevor sein Grün zählt. Ein Guard ohne
Gegenprobe ist eine Behauptung.

<!-- section: provenance -->
## Woher die Zahlen kommen

Jede Zahl in diesem Repository trägt Quelle und Grundgesamtheit — siehe
[docs/what-the-numbers-say.md](docs/what-the-numbers-say.md). Der
Quell-Korpus (ein solo gebautes Produktions-B2B-SaaS: ~159k Zeilen
Anwendungs-TypeScript, ~126k Zeilen Tests; 262 Dateien in seiner
Review-Kette) wird nicht veröffentlicht — er enthält Architektur und
Sicherheitsbefunde eines laufenden Produkts. Veröffentlicht ist das Muster,
nicht der Bestand.

Nichts hier behauptet, die Methode sei bewiesen. Belegt ist, dass eine
Prüfung eine reale Fehlerklasse fängt; der Rest ist ein Muster mit
angehefteten Messungen — damit die Messung nachfahrbar ist.

<!-- section: about -->
## Autor, Lizenz, Status

Gebaut von **Eduard Wolf** (eduard@wolf-agents.com) — destilliert aus dem
Arbeits-Korpus eines Produktionsprojekts, das fast vollständig über
gebriefte, autonome Claude-Code-Sessions entwickelt wurde. MIT-Lizenz.

Fallen-Verifikationen sind datiert (letzter voller Durchgang: 2026-08-21).
Werkzeuge ändern sich; reproduziert eine Falle auf deiner Version nicht
mehr, ist das ein Befund — ein Issue mit Repro schlägt ein Issue mit
Meinung.
