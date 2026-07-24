// help-content-de.js — the German help corpus for help.html (Phase 42.1, L10N-01).
//
// The German sibling of assets/help-content-en.js. Registers ONE global:
//   window.HELP_CONTENT_DE — ordered array of section objects, the full German
//     help corpus, structurally identical to HELP_CONTENT_EN (same section ids,
//     order, groups, topic ids, priorities, covers[], body node types, and every
//     {ui:key} token — byte-identical to EN). Only title + body text/steps are
//     translated into German (Sie form).
//
// help.js localeSections() (Plan 08) merges this per-section with EN by id, with
// EN fallback, so a German-UI reader sees the help body natively.
//
// window.HELP_DEEPLINKS is defined ONLY in help-content-en.js — this file must
// NOT redefine it. Loaded ONLY by help.html.
//
// ── Register (house style, Phase 42.1) ────────────────────────────────────
//   German help register: consistent formal address (Sie form). Terminology:
//   client = Klient, session = Sitzung, snippet = Baustein, Heart-Wall stays
//   Latin as shipped in assets/i18n-de.js — never the clinical patient/treatment
//   words (Patient / Behandlung), which tests/help-integrity-locale.test.js
//   forbids. The brand "Sessions Garden", "PDF", browser names, and
//   contact@sessionsgarden.app stay Latin; the renderer is dir-aware
//   (textContent, no innerHTML).
//
// ── Live-label interpolation (D-23) ───────────────────────────────────────
//   Every {ui:key} token is copied byte-identical from EN and is NOT translated.
//   help.js resolves each to its CURRENT live value in window.I18N.de, so a
//   German reader sees the actual German button/label names. The integrity test
//   fails on any unresolved token.
//
// No emojis in any text (D-10). No control characters other than the ordinary
// spaces/newlines EN uses; never NUL or bidi-control code points.

(function () {
  "use strict";

  var SECTIONS = [

    // ═══ FEATURED: personalization (led early, D-04) ═══════════════════════
    {
      id: "make-it-yours",
      title: "Sessions Garden zu Ihrem eigenen machen",
      group: "session-loop",
      featured: true,
      topics: [
        {
          id: "topic-sections-on-off",
          title: "Abschnitte ein- und ausschalten",
          priority: 1,
          body: [
            { type: "p", text: "Jede Praktizierende arbeitet ein wenig anders. Sessions Garden ist so gebaut, dass es sich Ihrer Arbeitsweise anpasst — nicht umgekehrt. Beginnen Sie damit, das Sitzungsformular so zu gestalten, dass es nur das zeigt, was Sie tatsächlich verwenden." },
            { type: "steps", items: [
              "Öffnen Sie die Einstellungen und gehen Sie zu {ui:settings.tab.fields}.",
              "Schalten Sie einzelne Sitzungsabschnitte ein oder aus, sodass das Sitzungsformular nur die Teile zeigt, mit denen Sie wirklich arbeiten.",
              "Drücken Sie {ui:settings.action.save}, um Ihre Änderungen zu behalten."
            ] },
            { type: "note", text: "Das ändert, was Sie überall dort sehen, wo Sie eine Sitzung festhalten — nichts wird jemals gelöscht. Ein ausgeschalteter Abschnitt behält seinen Platz in der Liste, sodass er beim Wiedereinschalten genau dort zurückkehrt, wo er war." }
          ]
        },
        {
          id: "topic-reordering",
          title: "Abschnitte neu anordnen",
          priority: 1,
          body: [
            { type: "p", text: "Bringen Sie die Sitzungsabschnitte in die Reihenfolge, in der Sie wirklich arbeiten. Dieselbe Reihenfolge fließt in das Sitzungsformular und in Ihre Exporte." },
            { type: "steps", items: [
              "Öffnen Sie die Einstellungen und gehen Sie zu {ui:settings.tab.fields}.",
              "Ziehen Sie einen Abschnitt am Griff oder verschieben Sie ihn mit den Pfeilen nach oben und unten.",
              "Verwandte Abschnitte liegen in einer Gruppe, die Sie umbenennen können — ziehen Sie die Gruppe, um sie als Ganzes zu verschieben.",
              "Drücken Sie {ui:settings.action.save}, um die neue Reihenfolge zu behalten."
            ] },
            { type: "note", text: "{ui:settings.reset.order.label} stellt die Standardreihenfolge wieder her und {ui:settings.reset.names.label} die Standardnamen — Ihre Sitzungen werden dabei nie berührt." }
          ]
        },
        {
          id: "topic-renaming",
          title: "Abschnitte umbenennen",
          priority: 2,
          body: [
            { type: "p", text: "In {ui:settings.tab.fields} können Sie die meisten Sitzungsabschnitte in genau die Worte umbenennen, die Sie mit Ihren Klienten verwenden, sodass das Formular Ihre Sprache spricht. Auch die Gruppen, die verwandte Abschnitte zusammenfassen, lassen sich umbenennen. Einige feste Abschnitte behalten ihre Namen, doch Sie können sie trotzdem ausschalten." },
            { type: "note", text: "Anders überlegt? {ui:settings.reset.names.label} setzt jeden Abschnitts- und Gruppennamen auf die Standardwerte zurück." }
          ]
        },
        {
          id: "topic-snippet-library",
          title: "Ihre Baustein-Bibliothek",
          priority: 2,
          body: [
            { type: "p", text: "Bausteine verwandeln Texte, die Sie immer wieder schreiben — Bedeutungen von Emotionen, Erklärungen von Techniken, Ihre übliche Abschlussnotiz — in kurze Auslöserwörter, die sich beim Tippen entfalten. Sessions Garden kommt mit einer eingebauten Bibliothek von Emotions-Bausteinen, und Sie können sie unter {ui:settings.tab.snippets} in den Einstellungen zu Ihrer eigenen umformen." },
            { type: "note", text: "Die vollständige Anleitung — Bausteine erstellen und sie mitten in der Sitzung entfalten — finden Sie unter Sitzungsnotizen schreiben." }
          ]
        },
        {
          id: "topic-date-format",
          title: "Ihr Datumsformat",
          priority: 2,
          body: [
            { type: "p", text: "Legen Sie Ihr {ui:settings.dateFormat.label} einmal fest, in den Einstellungen unter {ui:settings.tab.personalize}, und Sessions Garden verwendet es überall — auch in Ihren Exporten." },
            { type: "note", text: "Lassen Sie es auf {ui:settings.dateFormat.auto}, um Ihrer App-Sprache zu folgen, oder wählen Sie genau den Stil, den Sie zu lesen gewohnt sind." }
          ]
        },
        {
          id: "topic-session-formats",
          title: "Eigene Sitzungsformate",
          priority: 2,
          body: [
            { type: "p", text: "Über die eingebauten Formate {ui:session.type.clinic}, {ui:session.type.online}, {ui:session.type.remote}, {ui:session.type.proxy} und {ui:session.type.other} hinaus können Sie unter {ui:settings.sessionTypes.heading} in {ui:settings.tab.personalize} Ihre eigenen hinzufügen — sodass eine Sitzung immer so benannt ist, wie Sie über sie denken." }
          ]
        }
      ]
    },

    // ═══ THE SESSION LOOP ══════════════════════════════════════════════════
    {
      id: "adding-a-client",
      title: "Einen Klienten hinzufügen",
      group: "session-loop",
      featured: false,
      topics: [
        {
          id: "topic-first-client",
          title: "Ihr erster Klient",
          priority: 1,
          body: [
            { type: "p", text: "Ein Klient ist die Person, das Kind oder das Tier, mit dem Sie arbeiten. Einen hinzuzufügen dauert nur einen Moment." },
            { type: "steps", items: [
              "Wählen Sie {ui:nav.addClient} aus dem Hauptmenü.",
              "Geben Sie den {ui:client.form.firstName} ein — das ist das einzige Detail, das Sie wirklich brauchen, um zu beginnen.",
              "Wählen Sie einen {ui:client.form.type}, und fügen Sie dann alles Weitere hinzu, was hilft, etwa ein Geburtsdatum oder Notizen.",
              "Drücken Sie {ui:client.form.save} oder {ui:client.form.saveAndSession}, um direkt in Ihre erste Sitzung zu springen."
            ] },
            { type: "note", text: "In Eile? Während Sie eine Sitzung beginnen, können Sie {ui:session.form.client.new} wählen, um den Klienten anzulegen, ohne die Seite zu verlassen." }
          ]
        },
        {
          id: "topic-client-types",
          title: "Kliententypen",
          priority: 2,
          body: [
            { type: "p", text: "Wählen Sie einen {ui:client.form.type}, wenn Sie jemanden hinzufügen — {ui:client.form.type.adult}, {ui:client.form.type.child}, {ui:client.form.type.animal} oder {ui:client.form.type.other}." }
          ]
        },
        {
          id: "topic-client-photo",
          title: "Klientenfotos",
          priority: 3,
          body: [
            { type: "p", text: "Fügen Sie ein {ui:client.form.photo} hinzu, um die energetische Verbindung in der Fernarbeit zu halten. Nach dem Hochladen können Sie es zuschneiden und neu positionieren, sodass es genau richtig sitzt." }
          ]
        }
      ]
    },
    {
      id: "starting-a-session",
      title: "Eine Sitzung beginnen",
      group: "session-loop",
      featured: false,
      topics: [
        {
          id: "topic-new-session",
          title: "Zwei Wege zu beginnen",
          priority: 1,
          body: [
            { type: "p", text: "Es gibt zwei ruhige Wege, eine neue Sitzung zu öffnen — nutzen Sie den, der zum Moment passt." },
            { type: "steps", items: [
              "Drücken Sie in Ihrer Übersicht + ({ui:overview.table.newSession}) in der Zeile des Klienten.",
              "Oder wählen Sie {ui:nav.addSession} und wählen Sie dort den Klienten.",
              "Legen Sie das {ui:session.form.date} fest, und Sie sind bereit, mit dem Festhalten zu beginnen."
            ] }
          ]
        },
        {
          id: "topic-past-sessions",
          title: "Die vergangenen Sitzungen eines Klienten",
          priority: 2,
          body: [
            { type: "p", text: "Öffnen Sie {ui:nav.sessions}, um alles zu sehen, was Sie festgehalten haben, oder wählen Sie {ui:overview.table.viewSessions} bei einem Klienten, um zu sehen, was beim letzten Mal geschah." },
            { type: "p", text: "Wenn Sie eine gespeicherte Sitzung öffnen, erscheinen Ihre Notizen als formatierter Text — fett, kursiv, Aufzählungen, nummerierte Listen und Überschriften zeigen sich so, wie Sie sie getippt haben, sodass sich eine Sitzung auf einen Blick zurücklesen lässt." }
          ]
        }
      ]
    },
    {
      id: "capturing-emotions",
      title: "Sitzungsnotizen schreiben",
      group: "session-loop",
      featured: false,
      topics: [
        {
          id: "topic-quick-paste",
          title: "Notizen schnell festhalten",
          priority: 1,
          body: [
            { type: "p", text: "Während einer Sitzung möchten Sie die Dinge festhalten, ohne Ihren Fluss zu unterbrechen." },
            { type: "p", text: "Öffnen Sie die Sitzung, klappen Sie den Abschnitt auf, in dem Sie schreiben möchten — {ui:session.accordion.emotions}, Sitzungsnotizen oder jeden anderen — und tippen oder fügen Sie ein, was auftaucht, in welchen Worten auch immer. Ordnen und Formatieren können warten, bis Sie fertig sind." }
          ]
        },
        {
          id: "topic-formatting",
          title: "Sitzungsnotizen formatieren",
          priority: 1,
          body: [
            { type: "p", text: "Eine Formatierungsleiste sitzt über jedem Notizfeld, in dem Sie gerade schreiben — dieselben Werkzeuge in jedem Notizbereich des Sitzungsformulars und im Export-Editor." },
            { type: "steps", items: [
              "Markieren Sie ein paar Worte und drücken Sie die Fett-Schaltfläche.",
              "Drücken Sie eine Listen-Schaltfläche, um eine Liste zu beginnen — sie setzt sich beim Tippen von selbst fort.",
              "Stellen Sie die Leiste auf Vorschau, um das formatierte Ergebnis zu sehen; drücken Sie Bearbeiten, um weiterzuschreiben."
            ] },
            { type: "p", text: "Die Leiste, Schaltfläche für Schaltfläche — was jede tut, mit ihrem Tastaturkürzel, wo es eines gibt:" },
            { type: "list", items: [
              "Fett und kursiv — heben die markierten Worte hervor; Strg/Cmd+B, Strg/Cmd+I.",
              "Aufzählung und nummerierte Liste — machen aus der aktuellen Zeile einen Listenpunkt.",
              "Textstil — drei Überschriftgrößen oder normaler Text; ein Häkchen markiert den aktuellen Stil.",
              "Einrücken und Ausrücken — verschachteln Listenpunkte oder rücken Zeilen hinein und heraus; Tab und Umschalt+Tab innerhalb einer Liste. Überschriften bleiben bündig am Rand, auf Überschriftzeilen ruhen also beide.",
              "Rückgängig und Wiederholen — eine Änderung nach der anderen; Strg/Cmd+Z, Strg/Cmd+Umschalt+Z. Jede Schaltfläche wird blass, wenn kein Schritt mehr übrig ist.",
              "Bearbeiten / Vorschau — der Schalter am Ende der Leiste; Strg/Cmd+E wechselt zwischen den beiden."
            ] },
            { type: "p", text: "Listen wachsen auch beim Tippen: ein Bindestrich oder eine Zahl beginnt eine, Enter setzt sie fort, und Enter auf einem leeren Punkt beendet sie." },
            { type: "note", text: "Die Vorschau tauscht das Feld gegen eine gerahmte Ansicht mit der Markierung VORSCHAU — genau das, was Speichern, Exportieren und Kopieren erzeugen werden, Einzüge eingeschlossen. Die Formatierungs-Schaltflächen ruhen während der Vorschau; Bearbeiten oder Strg/Cmd+E bringt Sie zurück zum Schreiben. Alles, was Sie formatieren, wird mit der Sitzung gespeichert und liest sich später als formatierter Text." }
          ]
        },
        {
          id: "topic-snippets",
          title: "Bausteine — weniger tippen",
          priority: 1,
          body: [
            { type: "p", text: "Bausteine sind kurze Auslöserwörter, die sich in Text entfalten, den Sie oft schreiben — die Bedeutung einer Emotion, die Erklärung einer Technik, die Abschlussnotiz, die Sie den meisten Sitzungen hinzufügen. Sie speichern den Text einmal; danach bringt ein einziges Wort ihn zurück, sodass Sie mitten in der Sitzung weniger tippen und bei Ihrem Klienten präsent bleiben." },
            { type: "p", text: "Sessions Garden kommt mit einer eingebauten Bibliothek von Emotions-Bausteinen, bereit zur Nutzung. Eigene hinzuzufügen dauert eine Minute:" },
            { type: "steps", items: [
              "Öffnen Sie die Einstellungen und gehen Sie zu {ui:settings.tab.snippets}.",
              "Wählen Sie {ui:snippets.action.add} — oder wählen Sie einen beliebigen Baustein in der Bibliothek, um ihn zu bearbeiten, auch die eingebauten.",
              "Geben Sie ihm einen {ui:snippets.editor.trigger.label} — ein kurzes Wort, das Sie sich merken, wie schluss. Ein Auslöser darf keine Leerzeichen enthalten, verbinden Sie also zwei Wörter mit einem Bindestrich, wie koerper-trauma.",
              "Schreiben Sie den vollständigen Text, in den sich der Auslöser entfalten soll, und drücken Sie dann {ui:common.save}."
            ] },
            { type: "p", text: "Einen Baustein zu verwenden ist genauso einfach. Während Sie in einer Sitzung schreiben, tippen Sie Ihr Auslöser-Präfix (ein Semikolon, sofern Sie es nicht geändert haben), dann das Auslöserwort, dann ein Leerzeichen. Tippen Sie ;verrat und ein Leerzeichen, und es entfaltet sich in die volle Bedeutung von Verrat — genau dort, wo Ihr Cursor steht." },
            { type: "p", text: "Sie können sich das genaue Wort nicht merken? Tippen Sie das Präfix und den ersten Buchstaben oder zwei, und eine kleine Liste passender Bausteine erscheint an Ihrem Cursor — bewegen Sie sich mit den Pfeiltasten hindurch und drücken Sie Enter zum Einfügen oder Escape zum Schließen. Auch das Tippen eines Tag-Namens nach dem Präfix funktioniert und listet die Bausteine auf, die Sie unter diesem Tag gruppiert haben. Wählen Sie auf diese Weise einen Vorschlag innerhalb einer Aufzählung oder nummerierten Liste, bleiben Sie auf derselben Zeile — das Übernehmen beginnt also nie einen versehentlichen neuen Listenpunkt." },
            { type: "p", text: "Wo es glänzt: Wenn Sie die meisten Sitzungen mit einer ähnlichen Notiz schließen — was gelöst wurde, worauf in den kommenden Tagen zu achten ist — speichern Sie sie einmal unter einem Auslöser wie schluss, und jede Sitzung kann mit einem kurzen Wort enden statt mit einem aus dem Gedächtnis neu getippten Absatz." },
            { type: "note", text: "Bausteine entfalten sich in jedem Notizbereich des Sitzungsformulars — Emotionen, Einsichten, Kommentare und dem Rest — und auch im Export-Editor, sodass Ihre Klienten-Zusammenfassungen sie ebenfalls nutzen können." },
            { type: "note", text: "Machen Sie sie ganz zu Ihren eigenen unter {ui:settings.tab.snippets}: ändern Sie dort das {ui:snippets.prefix.label} und geben Sie jedem Baustein seinen Text in mehr als einer App-Sprache mit {ui:snippets.editor.translations.toggle}." }
          ]
        }
      ]
    },
    {
      id: "heart-wall",
      title: "Die Heart-Wall",
      group: "session-loop",
      featured: false,
      topics: [
        {
          id: "topic-heartwall-workflow",
          title: "Der Heart-Wall-Ablauf",
          priority: 1,
          body: [
            { type: "p", text: "Wenn eine Sitzung Heart-Wall-Arbeit ist, hilft Ihnen Sessions Garden, sie zu markieren und über Besuche hinweg zu verfolgen." },
            { type: "steps", items: [
              "Schalten Sie in der Sitzung {ui:session.form.heartShield} ein.",
              "Halten Sie fest, was Sie finden, in {ui:session.form.heartShieldEmotions}.",
              "Speichern Sie die Sitzung wie gewohnt — sie ist nun Teil der Heart-Wall-Geschichte des Klienten."
            ] }
          ]
        },
        {
          id: "topic-heartwall-removal",
          title: "Das Entfernen verfolgen",
          priority: 2,
          body: [
            { type: "p", text: "Wenn eine Heart-Wall fällt, setzen Sie {ui:session.form.shieldRemoved} auf {ui:session.form.shieldRemoved.yes}." },
            { type: "note", text: "Der Status jedes Klienten — {ui:overview.heartShield.active} oder {ui:overview.heartShield.removed} — wird aus seinen Sitzungen ermittelt und in Ihrer Übersicht angezeigt, sodass Sie ihn nie von Hand verfolgen müssen." }
          ]
        }
      ]
    },
    {
      id: "severity",
      title: "Schweregrad verfolgen",
      group: "session-loop",
      featured: false,
      topics: [
        {
          id: "topic-before-after",
          title: "Bewertungen davor und danach",
          priority: 1,
          body: [
            { type: "p", text: "Jedes Anliegen vor und nach der Arbeit zu bewerten zeigt die Veränderung über die Zeit, in den eigenen Zahlen des Klienten. Bewertungen sind freiwillig — ein Anliegen bleibt unbewertet, bis Sie eine Zahl setzen." },
            { type: "steps", items: [
              "Geben Sie dem Anliegen einen Namen in {ui:session.form.issueName}.",
              "Setzen Sie {ui:session.form.severityAtStart} zu Beginn auf einer Skala von 0 bis 10.",
              "Setzen Sie am Ende der Sitzung {ui:session.form.afterSeverity} für dasselbe Anliegen."
            ] },
            { type: "note", text: "Tippen Sie eine Bewertung erneut an, um sie wieder auf unbewertet zu setzen — wird die Anfangsbewertung gelöscht, entfällt damit auch die Endbewertung dieses Anliegens. Ein unbewertetes Anliegen bleibt aus Ihren Exporten heraus und erscheint nur mit seinem Namen in Ihrem Sitzungsverlauf." }
          ]
        },
        {
          id: "topic-turn-off",
          title: "Schweregrad-Bewertungen ausschalten",
          priority: 1,
          body: [
            { type: "p", text: "Bewerten Sie den Schweregrad nicht? Ein Schalter blendet ihn überall aus. In den Einstellungen, unter {ui:settings.tab.fields}, ist die Zeile {ui:settings.row.afterSeverity.label} ein einziger Schalter für alle Schweregrad-Bewertungen." },
            { type: "list", items: [
              "Ein — jedes Anliegen erhält zu Beginn eine Bewertung, und der Abschnitt mit den Bewertungen am Sitzungsende erscheint.",
              "Aus — beide verschwinden; die Anliegen selbst bleiben, Sie halten nur keine Zahlen fest."
            ] },
            { type: "note", text: "Ziehen Sie diese Zeile, um zu wählen, wo die Bewertungen am Sitzungsende im Formular sitzen — dieselbe Position bestimmt, wo sie in Ihren Exporten erscheinen." }
          ]
        },
        {
          id: "topic-multiple-issues",
          title: "Mehrere Anliegen",
          priority: 2,
          body: [
            { type: "p", text: "Arbeiten Sie in einer Sitzung an mehr als einer Sache? Wählen Sie {ui:session.form.addIssue}, um ein weiteres Anliegen zu verfolgen — bis zu drei pro Sitzung. Jedes kann eigene Bewertungen davor und danach tragen, und jedes Anliegen, das Sie unbewertet lassen, erscheint einfach mit seinem Namen in Ihrem Sitzungsverlauf und in der Klientenübersicht." }
          ]
        },
        {
          id: "topic-reversal",
          title: "Umkehrung verstehen",
          priority: 2,
          body: [
            { type: "p", text: "Manchmal fällt eine Bewertung danach höher aus als die Bewertung davor. Das ist Umkehrung — kein Scheitern, sondern eine Information. Oft bedeutet es, dass etwas Tieferes aufgetaucht ist, und es lohnt sich, es für das nächste Mal festzuhalten." }
          ]
        }
      ]
    },
    {
      id: "review-export",
      title: "Überprüfen und exportieren",
      group: "session-loop",
      featured: false,
      topics: [
        {
          id: "topic-single-export",
          title: "Eine Sitzung exportieren",
          priority: 1,
          body: [
            { type: "p", text: "Wenn eine Sitzung abgeschlossen ist, können Sie eine wunderschön formatierte Kopie an Ihren Klienten senden oder sie in Ihren eigenen Unterlagen ablegen." },
            { type: "steps", items: [
              "Öffnen Sie die gespeicherte Sitzung und wählen Sie {ui:session.export}.",
              "Wählen Sie, welche Teile der Sitzung enthalten sein sollen — unter {ui:export.section.topics} können Sie auch wählen, ob die Schweregrad-Bewertungen mitkommen.",
              "Überprüfen — und bearbeiten Sie leicht — was geteilt wird.",
              "Wählen Sie {ui:export.download.pdf} für ein poliertes Dokument oder {ui:export.download.text}, um die Notizen als einfache Textdatei zu speichern."
            ] },
            { type: "list", items: [
              "Ihre Abschnitte erscheinen in der Reihenfolge, die Sie in den Einstellungen festgelegt haben.",
              "Die Formatierungsleiste bleibt über dem Editor angeheftet — sie scrollt nie weg.",
              "Editor maximieren gibt dem Editor das ganze Fenster; erneutes Drücken stellt ihn wieder her. Auf einem Telefon füllt er den Bildschirm.",
              "Änderungen hier formen nur diesen Export — nichts wird in die Sitzung zurückgespeichert.",
              "Die Vorschau zeigt das fertige Dokument anstelle des Editors — prüfen Sie es, bevor Sie ein Format wählen.",
              "Zurück und Weiter behalten Ihre Änderungen. Das Dokument wird nur neu aufgebaut, wenn Sie die Abschnittsauswahl ändern — und die App fragt vorher.",
              "Fett, kursiv, Listen, Überschriften und Einzüge wandern mit ins PDF; Hebräisch bleibt korrekt von rechts nach links."
            ] },
            { type: "note", text: "Bei Heart-Wall-Sitzungen benennt der Export das Ergebnis in Worten — Heart-Wall entfernt, oder Heart-Wall vorhanden, in dieser Sitzung nicht entfernt — nie ein bloßes Ja oder Nein." }
          ]
        },
        {
          id: "topic-export-formats",
          title: "Ein Format wählen",
          priority: 2,
          body: [
            { type: "p", text: "PDF eignet sich am besten, um ein fertiges, gut aussehendes Dokument an Ihren Klienten zu senden. Einfacher Text eignet sich am besten, wenn Sie die Notizen in Ihren eigenen Unterlagen behalten oder in eine andere App bringen möchten." },
            { type: "p", text: "Das PDF bewahrt Ihre Notiz-Formatierung — fett, Listen, Überschriften und Einzüge — als formatierten Text, während die Textdatei Ihre Notizen genau so behält, wie Sie sie getippt haben." },
            { type: "p", text: "So oder so kommen die Abschnitte in der Reihenfolge heraus, die Sie in den Einstellungen festgelegt haben, und die Schweregrad-Bewertungen sitzen dort, wo dieser Abschnitt in Ihrer Reihenfolge fällt. Wenn Sie beim Bearbeiten eine Abschnittsüberschrift löschen, rückt der Schweregrad-Block entsprechend nach oben." },
            { type: "p", text: "Nicht sicher, was zum Moment passt? Stellen Sie den Editor im Bearbeitungsschritt auf Vorschau — die gerahmte Ansicht zeigt das fertige Dokument genau so, wie es sich lesen wird — und entscheiden Sie, bevor Sie exportieren." }
          ]
        }
      ]
    },
    {
      id: "overview",
      title: "Ihre Übersicht",
      group: "session-loop",
      featured: false,
      topics: [
        {
          id: "topic-dashboard",
          title: "Ihre Übersicht lesen",
          priority: 2,
          body: [
            { type: "p", text: "Ihre Übersicht versammelt Ihre gesamte Praxis an einem ruhigen Ort: {ui:overview.stats.clients}, {ui:overview.stats.sessions} und {ui:overview.stats.month} stehen oben, mit jedem Klienten darunter aufgelistet." }
          ]
        },
        {
          id: "topic-filters",
          title: "Suchen und filtern",
          priority: 2,
          body: [
            { type: "p", text: "Finden Sie jeden schnell. Suchen Sie oben in der Liste nach dem Namen, und grenzen Sie sie dann mit {ui:overview.filter.type}, {ui:filter.sessionFormat} oder {ui:overview.filter.heartShield} ein." },
            { type: "note", text: "Ordnen Sie die Liste mit {ui:overview.filter.sort} neu, und wählen Sie {ui:overview.filter.clear}, um neu zu beginnen." }
          ]
        },
        {
          id: "topic-next-session",
          title: "Das Datum der nächsten Sitzung",
          priority: 2,
          body: [
            { type: "p", text: "Setzen Sie {ui:session.form.nextSessionDate} in einer Sitzung, und es erscheint in Ihrer Übersicht unter {ui:overview.table.nextSession} — als {ui:overview.table.nextSession.overdue} markiert, sobald das Datum verstrichen ist, sodass niemand durch die Maschen fällt." }
          ]
        }
      ]
    },

    // ═══ THE TECHNICAL BITS ════════════════════════════════════════════════
    {
      id: "backups",
      title: "Backups und Ihre Daten",
      group: "technical",
      featured: false,
      topics: [
        {
          id: "topic-data-local",
          title: "Daten verlassen nie Ihren Browser",
          priority: 1,
          body: [
            { type: "p", text: "Alles, was Sie in Sessions Garden festhalten, lebt nur auf diesem Gerät, in diesem Browser. Nichts wird jemals an einen Server gesendet — diese Privatsphäre ist der ganze Sinn der App." },
            { type: "p", text: "Es bedeutet auch, dass Sie das einzige Backup sind. Wenn die Daten dieses Browsers jemals gelöscht werden, gehen die Sitzungen mit ihnen, daher ist es wichtig, ein eigenes Backup zu behalten." }
          ]
        },
        {
          id: "topic-backup-restore",
          title: "Sichern und wiederherstellen",
          priority: 1,
          body: [
            { type: "p", text: "Ein Backup ist eine einzige Datei, die alle Ihre Klienten und Sitzungen enthält. Eines zu erstellen dauert unter einer Minute." },
            { type: "steps", items: [
              "Öffnen Sie {ui:overview.backupRestore}.",
              "Wählen Sie im Bereich {ui:backup.export.heading} die Option {ui:backup.action.export}, um eine Backup-Datei zu speichern — Sie können sie mit einer Passphrase schützen.",
              "Bewahren Sie diese Datei an einem sicheren Ort auf, etwa auf einer externen Festplatte oder Ihrem eigenen Cloud-Speicher.",
              "Um Ihre Daten zurückzuholen, öffnen Sie dasselbe Panel, drücken Sie {ui:backup.action.import} und wählen Sie Ihre Backup-Datei."
            ] },
            { type: "note", text: "Eine Wiederherstellung holt Ihre Abschnittsreihenfolge und Gruppennamen zusammen mit Ihren Klienten und Sitzungen zurück." },
            { type: "note", text: "Das Wolkensymbol in der Kopfzeile zeigt, wie kürzlich Sie zuletzt gesichert haben — ein sanfter Anstoß, wenn es wieder Zeit ist." }
          ]
        },
        {
          id: "topic-working-offline",
          title: "Offline arbeiten",
          priority: 2,
          body: [
            { type: "p", text: "Sobald Sessions Garden in Ihrem Browser geöffnet ist, funktioniert es ganz ohne Internet weiter — Sitzungen festhalten, exportieren, alles außer der Lizenzaktivierung (und -deaktivierung, wenn Sie den Computer wechseln)." }
          ]
        },
        {
          id: "topic-updates",
          title: "Updates erhalten",
          priority: 3,
          body: [
            { type: "note", text: "Wenn eine neue Version bereit ist, aktualisiert sich Sessions Garden still beim nächsten Mal, wenn Sie es online öffnen. Es gibt nichts von Hand zu installieren." }
          ]
        }
      ]
    },
    {
      id: "installing",
      title: "Die App installieren",
      group: "technical",
      featured: false,
      topics: [
        {
          id: "topic-install-chrome",
          title: "Chrome und Edge",
          priority: 1,
          body: [
            { type: "glyph", name: "install-chrome" },
            { type: "p", text: "Auf einem Computer lassen Chrome und Edge Sie Sessions Garden mit wenigen Klicks als eigene App installieren." },
            { type: "steps", items: [
              "Öffnen Sie Sessions Garden in Chrome oder Edge auf Ihrem Computer.",
              "Schauen Sie am Ende der Adressleiste nach dem kleinen Installationssymbol — ein Monitor mit einem Pfeil nach unten.",
              "Klicken Sie darauf und wählen Sie dann Installieren.",
              "Die App öffnet sich in einem eigenen Fenster und erhält eine Desktop-Verknüpfung — öffnen Sie sie von nun an wie jedes andere Programm."
            ] }
          ]
        },
        {
          id: "topic-install-safari",
          title: "Safari auf einem Mac",
          priority: 1,
          body: [
            { type: "glyph", name: "install-safari" },
            { type: "p", text: "Auf einem Mac kann Safari Sessions Garden direkt zu Ihrem Dock hinzufügen." },
            { type: "steps", items: [
              "Öffnen Sie Sessions Garden in Safari auf Ihrem Mac.",
              "Öffnen Sie in der Menüleiste das Menü Ablage (oder das Menü Teilen) und wählen Sie Zum Dock hinzufügen.",
              "Bestätigen Sie den Namen und klicken Sie auf Hinzufügen.",
              "Sessions Garden lebt nun in Ihrem Dock — klicken Sie darauf, um die App in einem eigenen Fenster zu öffnen."
            ] }
          ]
        },
        {
          id: "topic-install-mobile-note",
          title: "Ein Hinweis zu Telefonen",
          priority: 2,
          body: [
            { type: "p", text: "Sessions Garden ist für Ihren Computer gebaut, wo Sie Ihre Sitzungsarbeit tun." },
            { type: "note", text: "Sie können es in einem Telefon-Browser öffnen, doch Ihre Klienten und Sitzungen leben auf jedem Gerät getrennt — es gibt keine Synchronisierung zwischen Ihrem Computer und Ihrem Telefon. Behalten Sie Ihre echte Arbeit auf dem Computer, auf dem Sie die App installiert haben." }
          ]
        }
      ]
    },
    {
      id: "license",
      title: "Lizenz und Geräte",
      group: "technical",
      featured: false,
      topics: [
        {
          id: "topic-activation",
          title: "Ihre Lizenz aktivieren",
          priority: 1,
          body: [
            { type: "p", text: "Ein Lizenzschlüssel schaltet die volle App frei. Sie geben ihn einmal ein." },
            { type: "steps", items: [
              "Öffnen Sie {ui:nav.license}.",
              "Fügen Sie den Lizenzschlüssel aus Ihrer Kauf-E-Mail ein.",
              "Aktivieren — das ist der eine Moment, in dem Sessions Garden das Internet braucht.",
              "Einmal aktiviert, funktioniert die ganze App von da an offline."
            ] }
          ]
        },
        {
          id: "topic-trial",
          title: "Zuerst ausprobieren",
          priority: 1,
          body: [
            { type: "p", text: "Möchten Sie erst erkunden? Die Live-Demo auf der Willkommensseite lässt Sie Sessions Garden mit Beispieldaten ausprobieren — sie setzt sich jedes Mal zurück, und nichts, was Sie dort eingeben, wird gespeichert. Die volle App öffnet sich, sobald Sie einen Lizenzschlüssel aktivieren; von diesem Moment an wird alles, was Sie festhalten, sicher auf Ihrem Computer aufbewahrt." }
          ]
        },
        {
          id: "topic-two-devices",
          title: "Auf einen neuen Computer umziehen",
          priority: 2,
          body: [
            { type: "p", text: "Ihre Lizenz deckt zwei Aktivierungen ab — zwei Browser oder Computer." },
            { type: "note", text: "Umzug auf einen neuen Computer? Deaktivieren Sie zuerst auf dem alten und aktivieren Sie dann auf dem neuen, sodass Sie innerhalb der Grenze von zwei Aktivierungen bleiben. Denken Sie daran, Ihre Daten mit einer Backup-Datei mitzunehmen." }
          ]
        }
      ]
    },
    {
      id: "troubleshooting",
      title: "Fehlerbehebung",
      group: "technical",
      featured: false,
      topics: [
        {
          id: "topic-missing-clients",
          title: "„Ich sehe meine Klienten nicht“",
          priority: 1,
          body: [
            { type: "p", text: "Ihre Klienten und Sitzungen sind in diesem Browser auf diesem Computer gespeichert. Wenn sie zu verschwinden scheinen, sind sie fast immer verborgen, nicht verloren." },
            { type: "steps", items: [
              "Prüfen Sie, ob Sie im selben Browser und Profil sind, das Sie normalerweise verwenden — Daten wandern nicht zwischen Browsern.",
              "Stellen Sie sicher, dass Sie die Website-Daten oder den Verlauf für diese Seite nicht gelöscht haben.",
              "Wenn Sie den Computer gewechselt haben, stellen Sie Ihr neuestes Backup aus {ui:overview.backupRestore} wieder her."
            ] }
          ]
        },
        {
          id: "topic-report-problem",
          title: "Ein Problem melden",
          priority: 2,
          body: [
            { type: "p", text: "Wenn etwas nicht richtig funktioniert, können Sie uns einen Diagnosebericht senden — aber nichts wird jemals automatisch gesendet." },
            { type: "steps", items: [
              "Öffnen Sie die Einstellungen und finden Sie {ui:settings.report.label}.",
              "Wählen Sie {ui:report.action.copy}, um einen Diagnosebericht zu kopieren.",
              "Fügen Sie ihn in eine E-Mail an contact@sessionsgarden.app ein und erzählen Sie uns, was geschehen ist."
            ] },
            { type: "note", text: "Immer noch fest? Schreiben Sie uns an contact@sessionsgarden.app — ein echter Mensch liest jede Nachricht." }
          ]
        }
      ]
    }
  ];

  window.HELP_CONTENT_DE = SECTIONS;
})();
