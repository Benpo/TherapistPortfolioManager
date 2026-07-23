// changelog-content-de.js — German locale sibling of changelog-content-en.js
// (Phase 42.1, L10N-01; D-07). Full native German history of every release.
//
// Registers ONE global:
//   window.CHANGELOG_CONTENT_DE — reverse-chronological array of release entries,
//     structurally identical to CHANGELOG_CONTENT_EN. changelog.js localeEntries()
//     and whats-new.js entries() merge per-entry on `version`, falling back to EN
//     where a locale entry is missing. Both surfaces (changelog page + What's-New
//     popup) then read natively in German.
//
// Parity contract (enforced by tests/changelog-integrity-locale.test.js):
//   version / anchor / origin flag / category-key set + order are byte-identical
//   to EN — ONLY the lede / highlights / category strings + the month word are
//   translated (Sie form). The v1.0 entry stays origin-only. Terminology follows
//   the shipped i18n-de.js vocab: Heart-Wall (kept as in the app), Klient, Sitzung,
//   Sitzungsart. Brand and format tokens (Sessions Garden, PDF, Safari) stay Latin.
//   No emojis, no control/bidi-control chars, no clinical Patient/Behandlung terms.

(function () {
  "use strict";

  window.CHANGELOG_CONTENT_DE = [

    // v1.5 — Ein Sitzungsformular, das zu Ihrer Arbeitsweise passt
    {
      version: "1.5.0",
      anchor: "v1-5",
      date: "Juli 2026",
      lede: "Gestalten Sie das Sitzungsformular nach Ihrer eigenen Arbeitsweise — ordnen Sie jeden Abschnitt per Ziehen oder mit Pfeilen neu, gruppieren und benennen Sie ihn um, und entscheiden Sie, wann Schweregrad-Bewertungen gelten.",
      highlights: [
        "Ordnen Sie die Sitzungsabschnitte — durch Ziehen oder mit den Pfeilen nach oben und unten — in die Reihenfolge, in der Sie wirklich arbeiten, und Ihre Exporte folgen derselben Reihenfolge.",
        "Ein Schalter schaltet die Schweregrad-Bewertungen für die ganze App ein oder aus, und wenn sie an sind, ist jede Bewertung freiwillig.",
        "Lassen Sie eine Bewertung aus, und sie bleibt aus Ihren Exporten heraus und liest sich sauber in Ihrem Sitzungsverlauf.",
      ],
      categories: {
        new: [
          "Sitzungsformular neu anordnen: Ziehen Sie einen Abschnitt am Griff oder verschieben Sie ihn mit den Pfeilen nach oben und unten. Verwandte Abschnitte liegen in Gruppen, die Sie umbenennen können, und ein ausgeschalteter Abschnitt behält seinen Platz, sodass er genau dort zurückkehrt, wo er war.",
          "Ein einziger Schweregrad-Schalter schaltet alle Bewertungen davor und danach in der ganzen App ein oder aus.",
        ],
        improved: [
          "Schweregrad-Bewertungen sind jetzt freiwillig — tippen Sie eine Bewertung erneut an, um sie wieder auf unbewertet zu setzen. Ein unbewertetes Anliegen behält seinen Namen; es trägt einfach keine Zahlen.",
          "Die Reihenfolge, die Sie für Ihre Abschnitte festlegen, spiegelt sich in jedem Export wider.",
          "Sitzungsthemen sind jetzt eine eigene Wahl im Export, mit den Bewertungen davor und danach als gekoppelte Unteroption darunter — angeboten, solange die Schweregrad-Bewertungen der App eingeschaltet sind.",
          "Ein unbewertetes Anliegen bleibt aus Ihren Exporten heraus und erscheint nur mit seinem Namen in Ihrem Sitzungsverlauf und in der Klientenübersicht.",
        ],
      },
    },

    // v1.4 — Richer Sessions: formatting your notes, and notes that keep their shape
    {
      version: "1.4.0",
      anchor: "v1-4",
      date: "Juli 2026",
      lede: "Ihre Sitzungsnotizen zu formatieren ist jetzt mühelos — eine Formatierungsleiste über jedem Notizfeld und im Export-Editor bringt Fett, Listen und Überschriften, mit einer eingebauten Vorschau, die genau zeigt, wie sie sich lesen werden.",
      highlights: [
        "Eine Formatierungsleiste über jedem Notizfeld und im Export-Editor — fett, kursiv, Listen, Überschriften und Tastaturkürzel.",
        "Sehen Sie jede Notiz — oder das Export-Dokument — als gerahmte Vorschau des fertigen Ergebnisses.",
        "Ihre Formatierung behält ihre Form — in gespeicherten Sitzungen und in PDF-Exporten.",
      ],
      categories: {
        new: [
          "Eine Formatierungsleiste über jedem Notizfeld und im Export-Editor — fett, kursiv, Aufzählungen und nummerierte Listen, ein Textstil-Menü für Überschriften, Einrücken und Ausrücken, Rückgängig und Wiederholen.",
          "Eine eingebaute Vorschau: der Schalter Bearbeiten / Vorschau tauscht den Schreibbereich gegen eine gerahmte Ansicht des fertigen Ergebnisses — Strg/Cmd+E wechselt zwischen den beiden.",
          "Beim Lesen einer gespeicherten Sitzung erscheinen Ihre Notizen als formatierter Text.",
        ],
        improved: [
          "Formatierung fließt beim Tippen — ein Bindestrich oder eine Zahl beginnt eine Liste, die sich von selbst fortsetzt, und Tab verschachtelt Listenpunkte.",
          "Ein großzügigerer Export-Editor, mit einer Maximieren-Option.",
          "Wählen Sie, ob ein Export die Emotions-Bewertungen davor und danach enthält.",
          "Klarere Heart-Wall-Formulierungen in Exporten.",
          "PDF-Exporte bewahren Ihre Formatierung.",
        ],
        fixed: [
          "Ein Backup ein zweites Mal zu importieren fragt jetzt immer nach Bestätigung — zuvor konnte ein wiederholter Import ohne Wirkung bleiben.",
        ],
      },
    },

    // v1.3 — In-App Help, Onboarding & Changelog
    {
      version: "1.3.0",
      anchor: "v1-3",
      date: "Juli 2026",
      lede: "In dieser Version geht es ganz darum, sich in Sessions Garden zu Hause zu fühlen — mit sanfter Begleitung genau dort, wo Sie sie brauchen.",
      highlights: [
        "Eine Hilfe-Schaltfläche auf jeder Seite öffnet ein durchsuchbares Hilfe-Center.",
        "Eine geführte Tour begleitet Sie beim ersten Öffnen durch die App.",
        "Die Versionshinweise wohnen jetzt in der App, sodass Sie immer sehen, was neu ist.",
      ],
      categories: {
        new: [
          "Ein durchsuchbares Hilfe-Center, das Sie von jeder Seite aus öffnen können.",
          "Ein herzlicher Willkommensbildschirm beim ersten Öffnen der App.",
          "Eine geführte Tour durch den wichtigsten Arbeitsablauf, wann immer Sie eine Auffrischung möchten.",
          "Dieses App-interne Änderungsprotokoll, damit Sie jede Aktualisierung leicht verfolgen können.",
        ],
        improved: [
          "Ein klarerer Hinweis, wie Sie Sessions Garden auf Ihrem Computer installieren.",
        ],
      },
    },

    // v1.2 — Personalize, session formats & faster finding
    {
      version: "1.2.0",
      anchor: "v1-2",
      date: "Juli 2026",
      lede: "Machen Sie Sessions Garden zu Ihrem eigenen — mit Ihrem Datumsformat, Ihren Sitzungsarten und schnelleren Wegen, jede Sitzung zu finden.",
      highlights: [
        "Ein neuer Reiter Personalisierung lässt Sie wählen, wie Daten in der ganzen App erscheinen.",
        "Benennen Sie die integrierten Sitzungsarten um oder fügen Sie eigene hinzu.",
        "Filtern und sortieren Sie Ihre Sitzungen, um schneller zu finden, was Sie brauchen.",
      ],
      categories: {
        new: [
          "Ein Reiter Personalisierung in den Einstellungen zur Wahl Ihres Datumsformats.",
          "Eigene Sitzungsarten, die Sie umbenennen oder ergänzen können.",
          "Ein Filter nach Sitzungsart auf den Seiten Übersicht und Sitzungen.",
          "Ein Heart-Wall-Filter, der nur die Sitzungen zeigt, in denen an einer Heart-Wall gearbeitet wurde.",
          "Klicken Sie in der Übersicht auf eine Spaltenüberschrift, um danach zu sortieren.",
        ],
        improved: [
          "Daten sehen jetzt überall gleich aus, auch in Ihren PDF-Exporten.",
          "Zuverlässigere Installation in Safari.",
          "Heart-Wall wird in der ganzen App einheitlich benannt.",
        ],
        fixed: [
          "Die App erholt sich jetzt bei bestimmten Datenbankfehlern von selbst.",
          "Die Rechtsseiten wurden aufgefrischt.",
        ],
      },
    },

    // v1.1 — export, snippets & encrypted backups
    {
      version: "1.1.0",
      anchor: "v1-1",
      date: "Juni 2026",
      lede: "Entwickelt, um Sie beim Exportieren, Wiederverwenden und Schützen Ihrer Arbeit zu unterstützen.",
      highlights: [
        "Exportieren Sie ein ansprechendes PDF der Sitzungshistorie eines Klienten.",
        "Speichern Sie wiederverwendbare Textbausteine, um Sitzungsnotizen schneller zu schreiben.",
        "Verschlüsselte Backups bewahren Ihre Daten sicher auf Ihrem eigenen Gerät.",
      ],
      categories: {
        new: [
          "Ein Klienten-PDF-Export der vollständigen Sitzungshistorie eines Klienten.",
          "Wiederverwendbare Textbausteine für die Notizen, die Sie immer wieder schreiben.",
          "Verschlüsselte, mit einer Passphrase geschützte Backups Ihrer Daten.",
        ],
        improved: [
          "Sanfte Erinnerungen, Ihre Arbeit zu sichern.",
        ],
      },
    },

    // v1.0 — origin marker only
    {
      version: "1.0.0",
      anchor: "v1-0",
      date: "Mai 2026",
      lede: "Wo alles begann — der erste Samen von Sessions Garden.",
      origin: true,
    },

  ];
})();
