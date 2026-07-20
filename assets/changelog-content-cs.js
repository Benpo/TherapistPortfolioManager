// changelog-content-cs.js — Czech locale sibling of changelog-content-en.js
// (Phase 42.1, L10N-01; D-07). Full native Czech history of every release.
//
// Registers ONE global:
//   window.CHANGELOG_CONTENT_CS — reverse-chronological array of release entries,
//     structurally identical to CHANGELOG_CONTENT_EN. changelog.js localeEntries()
//     and whats-new.js entries() merge per-entry on `version`, falling back to EN
//     where a locale entry is missing. Both surfaces (changelog page + What's-New
//     popup) then read natively in Czech.
//
// Parity contract (enforced by tests/changelog-integrity-locale.test.js):
//   version / anchor / origin flag / category-key set + order are byte-identical
//   to EN — ONLY the lede / highlights / category strings + the month word are
//   translated (formal register). The v1.0 entry stays origin-only. Terminology
//   follows the shipped i18n-cs.js vocab: Heart-Wall (kept as in the app), klient,
//   sezení, typ sezení. Brand and format tokens (Sessions Garden, PDF, Safari) stay
//   Latin. No emojis, no control/bidi-control chars, no clinical pacient/léčba/léčení
//   terms.

(function () {
  "use strict";

  window.CHANGELOG_CONTENT_CS = [

    // v1.4 — Richer Sessions: formatting your notes, and notes that keep their shape
    {
      version: "1.4.0",
      anchor: "v1-4",
      date: "červenec 2026",
      lede: "Formátování poznámek ze sezení je teď snadné — panel nad každým poznámkovým polem a v editoru exportu přidá tučné písmo, seznamy a nadpisy, s vestavěným náhledem, který přesně ukáže, jak se budou číst.",
      highlights: [
        "Panel formátování nad každým poznámkovým polem a v editoru exportu — tučné písmo, kurzíva, seznamy, nadpisy a klávesové zkratky.",
        "Zobrazte si náhled kterékoli poznámky — nebo exportovaného dokumentu — jako orámovaný pohled na hotový výsledek.",
        "Vaše formátování si drží tvar — v uložených sezeních i v exportech do PDF.",
      ],
      categories: {
        new: [
          "Panel formátování nad každým poznámkovým polem a v editoru exportu — tučné písmo, kurzíva, odrážkové a číslované seznamy, nabídka stylu textu pro nadpisy, odsazení a jeho zmenšení, zpět a znovu.",
          "Vestavěný náhled: přepínač Upravit / Náhled vymění psací plochu za orámovaný pohled na hotový výsledek — Ctrl/Cmd+E přepíná mezi oběma.",
          "Čtení uloženého sezení zobrazí vaše poznámky jako formátovaný text.",
        ],
        improved: [
          "Formátování plyne při psaní — pomlčka nebo číslo začne seznam, který pokračuje sám, a Tab vnořuje položky.",
          "Prostornější editor exportu, s možností maximalizace.",
          "Zvolte, zda export zahrne hodnocení emocí před a po.",
          "Jasnější formulace Heart-Wall v exportech.",
          "Exporty do PDF zachovají vaše formátování.",
        ],
      },
    },

    // v1.3 — In-App Help, Onboarding & Changelog
    {
      version: "1.3.0",
      anchor: "v1-3",
      date: "červenec 2026",
      lede: "Tato verze je celá o tom, abyste se v Sessions Garden cítili jako doma — s jemným provázením přesně tam, kde ho potřebujete.",
      highlights: [
        "Tlačítko nápovědy na každé stránce otevře prohledávatelné centrum nápovědy.",
        "Průvodce vás provede aplikací, když ji poprvé otevřete.",
        "Poznámky k verzi nyní žijí přímo v aplikaci, takže vždy vidíte, co je nového.",
      ],
      categories: {
        new: [
          "Prohledávatelné centrum nápovědy, které otevřete z kterékoli stránky.",
          "Vřelá uvítací obrazovka při prvním otevření aplikace.",
          "Průvodce hlavním pracovním postupem, kdykoli si budete chtít osvěžit paměť.",
          "Tento seznam změn přímo v aplikaci, aby se dala každá aktualizace snadno sledovat.",
        ],
        improved: [
          "Jasnější nápověda, jak nainstalovat Sessions Garden do počítače.",
        ],
      },
    },

    // v1.2 — Personalize, session formats & faster finding
    {
      version: "1.2.0",
      anchor: "v1-2",
      date: "červenec 2026",
      lede: "Přizpůsobte si Sessions Garden — se svým formátem data, svými typy sezení a rychlejšími způsoby, jak najít kterékoli sezení.",
      highlights: [
        "Nová záložka Přizpůsobení vám umožní zvolit, jak se v celé aplikaci zobrazují data.",
        "Přejmenujte vestavěné typy sezení nebo přidejte vlastní.",
        "Filtrujte a řaďte svá sezení, abyste rychleji našli, co potřebujete.",
      ],
      categories: {
        new: [
          "Záložka Přizpůsobení v Nastavení pro volbu formátu data.",
          "Vlastní typy sezení, které můžete přejmenovat nebo doplnit.",
          "Filtr podle typu sezení na stránkách Přehled a Sezení.",
          "Filtr Heart-Wall, který zobrazí jen sezení, ve kterých se na Heart-Wall pracovalo.",
          "Klikněte na záhlaví libovolného sloupce v Přehledu a seřaďte podle něj.",
        ],
        improved: [
          "Data nyní vypadají všude stejně, včetně vašich exportů do PDF.",
          "Spolehlivější instalace v Safari.",
          "Heart-Wall je v celé aplikaci pojmenována jednotně.",
        ],
        fixed: [
          "Aplikace se nyní sama zotaví z některých chyb databáze.",
          "Právní stránky byly osvěženy.",
        ],
      },
    },

    // v1.1 — export, snippets & encrypted backups
    {
      version: "1.1.0",
      anchor: "v1-1",
      date: "červen 2026",
      lede: "Vytvořeno, aby vám pomohlo exportovat, znovu využívat a chránit vaši práci.",
      highlights: [
        "Exportujte úhledné PDF s historií sezení kteréhokoli klienta.",
        "Ukládejte znovupoužitelné úryvky pro rychlejší psaní poznámek k sezení.",
        "Šifrované zálohy udrží vaše data v bezpečí na vašem vlastním zařízení.",
      ],
      categories: {
        new: [
          "Export PDF pro klienta s úplnou historií sezení daného klienta.",
          "Znovupoužitelné textové úryvky pro poznámky, které píšete znovu a znovu.",
          "Šifrované zálohy vašich dat chráněné heslem.",
        ],
        improved: [
          "Jemné připomínky, abyste si zálohovali svou práci.",
        ],
      },
    },

    // v1.0 — origin marker only
    {
      version: "1.0.0",
      anchor: "v1-0",
      date: "květen 2026",
      lede: "Kde to všechno začalo — první semínko Sessions Garden.",
      origin: true,
    },

  ];
})();
