// help-content-cs.js — the Czech help corpus for help.html (Phase 42.1, L10N-01).
//
// The Czech sibling of assets/help-content-en.js. Registers ONE global:
//   window.HELP_CONTENT_CS — ordered array of section objects, the full Czech
//     help corpus, structurally identical to HELP_CONTENT_EN (same section ids,
//     order, groups, topic ids, priorities, covers[], body node types, and every
//     {ui:key} token — byte-identical to EN). Only title + body text/steps are
//     translated into Czech (formal register / vykání).
//
// help.js localeSections() (Plan 08) merges this per-section with EN by id, with
// EN fallback, so a Czech-UI reader sees the help body natively.
//
// window.HELP_DEEPLINKS is defined ONLY in help-content-en.js — this file must
// NOT redefine it. Loaded ONLY by help.html.
//
// ── Register (house style, Phase 42.1) ────────────────────────────────────
//   Czech help register: consistent formal address (vykání). Terminology:
//   client = klient, session = sezení, snippet = úryvek, Heart-Wall stays Latin
//   as shipped in assets/i18n-cs.js — never the clinical patient/treatment words
//   (pacient / léčba / léčení), which tests/help-integrity-locale.test.js forbids.
//   The brand "Sessions Garden", "PDF", browser names, and
//   contact@sessionsgarden.app stay Latin; the renderer is dir-aware
//   (textContent, no innerHTML).
//
// ── Live-label interpolation (D-23) ───────────────────────────────────────
//   Every {ui:key} token is copied byte-identical from EN and is NOT translated.
//   help.js resolves each to its CURRENT live value in window.I18N.cs, so a
//   Czech reader sees the actual Czech button/label names. The integrity test
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
      title: "Přizpůsobte si Sessions Garden",
      group: "session-loop",
      featured: true,
      topics: [
        {
          id: "topic-sections-on-off",
          title: "Zapínání a vypínání sekcí",
          priority: 1,
          body: [
            { type: "p", text: "Každý terapeut pracuje trochu jinak. Sessions Garden je vytvořen tak, aby se přizpůsobil vašemu způsobu práce — ne naopak. Začněte tím, že formulář sezení upravíte tak, aby zobrazoval jen to, co skutečně používáte." },
            { type: "steps", items: [
              "Otevřete Nastavení a přejděte na {ui:settings.tab.fields}.",
              "Zapněte nebo vypněte jednotlivé sekce sezení, aby formulář sezení zobrazoval jen ty části, se kterými skutečně pracujete.",
              "Stiskněte {ui:settings.action.save}, abyste své změny uložili."
            ] },
            { type: "note", text: "Tím se změní to, co vidíte všude, kde zaznamenáváte sezení — nic se nikdy nesmaže, takže můžete sekci kdykoli znovu zapnout." }
          ]
        },
        {
          id: "topic-renaming",
          title: "Přejmenování sekcí",
          priority: 2,
          body: [
            { type: "p", text: "V {ui:settings.tab.fields} můžete většinu sekcí sezení přejmenovat přesně na slova, která používáte se svými klienty, aby formulář mluvil vaším jazykem. Několik pevných sekcí si své názvy ponechává, přesto je však můžete vypnout." }
          ]
        },
        {
          id: "topic-snippet-library",
          title: "Vaše knihovna úryvků",
          priority: 2,
          body: [
            { type: "p", text: "Úryvky promění text, který píšete znovu a znovu — významy emocí, vysvětlení technik, vaši obvyklou závěrečnou poznámku — v krátká spouštěcí slova, která se při psaní rozvinou. Sessions Garden přichází s vestavěnou knihovnou úryvků emocí a vy si ji můžete přetvořit ve svou vlastní v {ui:settings.tab.snippets} v Nastavení." },
            { type: "note", text: "Úplný návod — vytváření úryvků a jejich rozvíjení uprostřed sezení — najdete v části Psaní poznámek ze sezení." }
          ]
        },
        {
          id: "topic-date-format",
          title: "Váš formát data",
          priority: 2,
          body: [
            { type: "p", text: "Nastavte svůj {ui:settings.dateFormat.label} jednou, v Nastavení v části {ui:settings.tab.personalize}, a Sessions Garden jej použije všude — včetně vašich exportů." },
            { type: "note", text: "Ponechte jej na {ui:settings.dateFormat.auto}, aby se řídil jazykem aplikace, nebo zvolte přesně ten styl, který jste zvyklí číst." }
          ]
        },
        {
          id: "topic-session-formats",
          title: "Vlastní formáty sezení",
          priority: 2,
          body: [
            { type: "p", text: "Kromě vestavěných formátů {ui:session.type.clinic}, {ui:session.type.online}, {ui:session.type.remote}, {ui:session.type.proxy} a {ui:session.type.other} můžete přidat vlastní v {ui:settings.sessionTypes.heading} v {ui:settings.tab.personalize} — aby sezení bylo vždy označeno tak, jak o něm přemýšlíte." }
          ]
        }
      ]
    },

    // ═══ THE SESSION LOOP ══════════════════════════════════════════════════
    {
      id: "adding-a-client",
      title: "Přidání klienta",
      group: "session-loop",
      featured: false,
      topics: [
        {
          id: "topic-first-client",
          title: "Váš první klient",
          priority: 1,
          body: [
            { type: "p", text: "Klient je osoba, dítě nebo zvíře, se kterým pracujete. Přidání zabere jen chvíli." },
            { type: "steps", items: [
              "Zvolte {ui:nav.addClient} z hlavní nabídky.",
              "Zadejte {ui:client.form.firstName} — to je jediný údaj, který ke startu skutečně potřebujete.",
              "Zvolte {ui:client.form.type} a poté přidejte cokoli dalšího, co pomůže, například datum narození nebo poznámky.",
              "Stiskněte {ui:client.form.save}, nebo {ui:client.form.saveAndSession}, abyste přešli rovnou do svého prvního sezení."
            ] },
            { type: "note", text: "Spěcháte? Při zahájení sezení můžete zvolit {ui:session.form.client.new} a vytvořit klienta, aniž byste opustili stránku." }
          ]
        },
        {
          id: "topic-client-types",
          title: "Typy klientů",
          priority: 2,
          body: [
            { type: "p", text: "Při přidávání někoho zvolte {ui:client.form.type} — {ui:client.form.type.adult}, {ui:client.form.type.child}, {ui:client.form.type.animal}, nebo {ui:client.form.type.other}." }
          ]
        },
        {
          id: "topic-client-photo",
          title: "Fotky klientů",
          priority: 3,
          body: [
            { type: "p", text: "Přidejte {ui:client.form.photo}, která pomůže udržet energetické spojení při práci na dálku. Po nahrání ji můžete oříznout a přemístit, aby seděla přesně tak, jak má." }
          ]
        }
      ]
    },
    {
      id: "starting-a-session",
      title: "Zahájení sezení",
      group: "session-loop",
      featured: false,
      topics: [
        {
          id: "topic-new-session",
          title: "Dva způsoby, jak začít",
          priority: 1,
          body: [
            { type: "p", text: "Existují dva klidné způsoby, jak otevřít nové sezení — použijte ten, který se hodí k okamžiku." },
            { type: "steps", items: [
              "Ve svém přehledu stiskněte + ({ui:overview.table.newSession}) v řádku klienta.",
              "Nebo zvolte {ui:nav.addSession} a klienta vyberte tam.",
              "Nastavte {ui:session.form.date} a jste připraveni začít zaznamenávat."
            ] }
          ]
        },
        {
          id: "topic-past-sessions",
          title: "Minulá sezení klienta",
          priority: 2,
          body: [
            { type: "p", text: "Otevřete {ui:nav.sessions}, abyste viděli vše, co jste zaznamenali, nebo zvolte {ui:overview.table.viewSessions} u klienta, abyste viděli, co se dělo minule." },
            { type: "p", text: "Když otevřete uložené sezení, vaše poznámky se zobrazí jako formátovaný text — tučné písmo, kurzíva, odrážkové i číslované seznamy a nadpisy vypadají tak, jak jste je napsali, takže se v sezení snadno zorientujete na první pohled." }
          ]
        }
      ]
    },
    {
      id: "capturing-emotions",
      title: "Psaní poznámek ze sezení",
      group: "session-loop",
      featured: false,
      topics: [
        {
          id: "topic-quick-paste",
          title: "Rychlé zapsání poznámek",
          priority: 1,
          body: [
            { type: "p", text: "Během sezení si chcete věci zapsat, aniž byste přerušili své soustředění." },
            { type: "p", text: "Otevřete sezení, rozbalte sekci, do které chcete psát — {ui:session.accordion.emotions}, poznámky ze sezení nebo kteroukoli jinou — a napište nebo vložte, co přichází, jakýmikoli slovy, která používáte. Úprava a formátování počkají, dokud nebudete hotovi." }
          ]
        },
        {
          id: "topic-formatting",
          title: "Formátování poznámek ze sezení",
          priority: 1,
          body: [
            { type: "p", text: "Panel formátování je usazen nad každým poznámkovým polem, do kterého právě píšete — stejné nástroje v každé poznámkové oblasti formuláře sezení i v editoru exportu." },
            { type: "steps", items: [
              "Vyberte několik slov a stiskněte tlačítko tučného písma.",
              "Stiskněte tlačítko seznamu a začněte seznam — při psaní pokračuje sám.",
              "Přepněte panel na Náhled, abyste viděli formátovaný výsledek; stiskněte Upravit a pište dál."
            ] },
            { type: "p", text: "Panel, tlačítko po tlačítku — co které dělá, s klávesovou zkratkou tam, kde existuje:" },
            { type: "list", items: [
              "Tučné písmo a kurzíva — zvýrazní vybraná slova; Ctrl/Cmd+B, Ctrl/Cmd+I.",
              "Odrážkový a číslovaný seznam — promění aktuální řádek v položku seznamu.",
              "Styl textu — tři velikosti nadpisů nebo běžný text; zaškrtnutí označuje aktuální styl.",
              "Odsadit a zmenšit odsazení — vnořují položky seznamu nebo posouvají řádky dovnitř a ven; Tab a Shift+Tab uvnitř seznamu. Nadpisy zůstávají zarovnané k okraji, takže na řádku nadpisu obě tlačítka odpočívají.",
              "Zpět a znovu — jedna změna po druhé; Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z. Každé tlačítko pohasne, když už nezbývá žádný krok.",
              "Upravit / Náhled — přepínač na konci panelu; Ctrl/Cmd+E přepíná mezi oběma."
            ] },
            { type: "p", text: "Seznamy také rostou při psaní: pomlčka nebo číslo seznam začne, Enter v něm pokračuje a Enter na prázdné položce jej ukončí." },
            { type: "note", text: "Náhled vymění pole za orámovaný pohled s označením NÁHLED — přesně to, co uložení, export a kopírování vytvoří, včetně odsazení. Tlačítka formátování během náhledu odpočívají; Upravit nebo Ctrl/Cmd+E vás vrátí ke psaní. Vše, co naformátujete, se uloží se sezením a čte se zpět jako formátovaný text." }
          ]
        },
        {
          id: "topic-snippets",
          title: "Úryvky — pište méně",
          priority: 1,
          body: [
            { type: "p", text: "Úryvky jsou krátká spouštěcí slova, která se rozvinou do textu, jenž píšete často — význam emoce, vysvětlení techniky, závěrečná poznámka, kterou přidáváte k většině sezení. Text uložíte jednou; poté jej jediné slovo přivolá zpět, takže uprostřed sezení píšete méně a zůstáváte přítomni se svým klientem." },
            { type: "p", text: "Sessions Garden přichází s vestavěnou knihovnou úryvků emocí, připravenou k použití. Přidání vlastních zabere minutu:" },
            { type: "steps", items: [
              "Otevřete Nastavení a přejděte na {ui:settings.tab.snippets}.",
              "Zvolte {ui:snippets.action.add} — nebo vyberte v knihovně jakýkoli úryvek a upravte jej, včetně těch vestavěných.",
              "Dejte mu {ui:snippets.editor.trigger.label} — jedno krátké slovo, které si zapamatujete, například zaver. Spouštěč nesmí obsahovat mezery, spojte tedy dvě slova pomlčkou, například fyzicke-trauma.",
              "Napište celý text, do kterého se má spouštěč rozvinout, a poté stiskněte {ui:common.save}."
            ] },
            { type: "p", text: "Použití úryvku je stejně jednoduché. Při psaní v sezení napište svou spouštěcí předponu (středník, pokud jste ji nezměnili), poté spouštěcí slovo a poté mezeru. Napište ;zrada a mezeru, a rozvine se to do plného významu zrady — přesně tam, kde je váš kurzor." },
            { type: "p", text: "Nemůžete si vzpomenout na přesné slovo? Napište předponu a první písmeno nebo dvě, a u vašeho kurzoru se objeví malý seznam odpovídajících úryvků — procházejte jím pomocí šipek a stiskněte Enter pro vložení, nebo Escape pro zavření. Funguje i napsání názvu štítku za předponou, které vypíše úryvky, jež jste pod tímto štítkem seskupili. Vyberete-li návrh tímto způsobem uvnitř odrážkového nebo číslovaného seznamu, zůstanete na stejném řádku — přijetí tedy nikdy nezačne nechtěnou novou položku." },
            { type: "p", text: "Kde vyniká: pokud většinu sezení zakončujete podobnou poznámkou — co bylo uvolněno, čeho si v nadcházejících dnech všímat — uložte ji jednou pod spouštěč jako zaver, a každé sezení může skončit jedním krátkým slovem místo odstavce znovu psaného z paměti." },
            { type: "note", text: "Úryvky se rozvinou v každé poznámkové oblasti formuláře sezení — emoce, postřehy, komentáře a ostatní — a také v editoru exportu, takže je mohou využít i vaše shrnutí pro klienty." },
            { type: "note", text: "Udělejte si je zcela vlastní v {ui:settings.tab.snippets}: změňte tam {ui:snippets.prefix.label} a dejte kterémukoli úryvku jeho text ve více než jednom jazyce aplikace pomocí {ui:snippets.editor.translations.toggle}." }
          ]
        }
      ]
    },
    {
      id: "heart-wall",
      title: "Heart-Wall",
      group: "session-loop",
      featured: false,
      topics: [
        {
          id: "topic-heartwall-workflow",
          title: "Postup u Heart-Wall",
          priority: 1,
          body: [
            { type: "p", text: "Když je sezení prací na Heart-Wall, Sessions Garden vám pomůže ji označit a sledovat napříč návštěvami." },
            { type: "steps", items: [
              "V sezení zapněte {ui:session.form.heartShield}.",
              "Zaznamenejte, co najdete, do {ui:session.form.heartShieldEmotions}.",
              "Uložte sezení jako obvykle — nyní je součástí příběhu klientovy Heart-Wall."
            ] }
          ]
        },
        {
          id: "topic-heartwall-removal",
          title: "Sledování odstranění",
          priority: 2,
          body: [
            { type: "p", text: "Když Heart-Wall padne, nastavte {ui:session.form.shieldRemoved} na {ui:session.form.shieldRemoved.yes}." },
            { type: "note", text: "Stav každého klienta — {ui:overview.heartShield.active} nebo {ui:overview.heartShield.removed} — se určuje z jeho sezení a zobrazuje se ve vašem přehledu, takže jej nikdy nemusíte sledovat ručně." }
          ]
        }
      ]
    },
    {
      id: "severity",
      title: "Sledování závažnosti",
      group: "session-loop",
      featured: false,
      topics: [
        {
          id: "topic-before-after",
          title: "Hodnocení před a po",
          priority: 1,
          body: [
            { type: "p", text: "Hodnocení každého problému před prací a po ní ukazuje změnu v čase, v klientových vlastních číslech." },
            { type: "steps", items: [
              "Pojmenujte problém v {ui:session.form.issueName}.",
              "Na začátku nastavte {ui:session.form.beforeSeverity} na stupnici 0 až 10.",
              "Na konci sezení nastavte {ui:session.form.afterSeverity} pro tentýž problém."
            ] }
          ]
        },
        {
          id: "topic-multiple-issues",
          title: "Více problémů",
          priority: 2,
          body: [
            { type: "p", text: "Pracujete v sezení na více než jedné věci? Zvolte {ui:session.form.addIssue} pro sledování dalšího problému — až tři na sezení, každý s vlastním hodnocením před a po." }
          ]
        },
        {
          id: "topic-reversal",
          title: "Porozumění obrácení",
          priority: 2,
          body: [
            { type: "p", text: "Někdy vyjde hodnocení po výše než hodnocení před. To je obrácení — nikoli selhání, ale informace. Často to znamená, že se vynořilo něco hlubšího, a stojí za to si to poznamenat pro příště." }
          ]
        }
      ]
    },
    {
      id: "review-export",
      title: "Kontrola a export",
      group: "session-loop",
      featured: false,
      topics: [
        {
          id: "topic-single-export",
          title: "Export jednoho sezení",
          priority: 1,
          body: [
            { type: "p", text: "Když je sezení dokončeno, můžete svému klientovi odeslat krásně formátovanou kopii nebo ji uložit do svých vlastních záznamů." },
            { type: "steps", items: [
              "Otevřete uložené sezení a zvolte {ui:session.export}.",
              "Zvolte, které části sezení zahrnout. Hodnocení emocí před a po jsou předvybraná — odškrtněte je, pokud chcete hodnocení závažnosti z tohoto exportu vynechat.",
              "Zkontrolujte — a lehce upravte — co bude sdíleno.",
              "Zvolte {ui:export.download.pdf} pro uhlazený dokument, nebo {ui:export.download.text} pro uložení poznámek jako prostý textový soubor."
            ] },
            { type: "list", items: [
              "Panel formátování zůstává připnutý nad editorem — nikdy neodroluje pryč.",
              "Maximalizovat editor mu dá celé okno; dalším stisknutím jej vrátíte. Na telefonu vyplní obrazovku.",
              "Úpravy zde tvarují pouze tento export — nic se neukládá zpět do sezení.",
              "Náhled zobrazí hotový dokument na místě editoru — zkontrolujte jej, než zvolíte formát.",
              "Zpět a Pokračovat vaše úpravy zachovají. Dokument se znovu sestaví, jen když změníte výběr sekcí — a aplikace se nejdřív zeptá.",
              "Tučné písmo, kurzíva, seznamy, nadpisy a odsazení se přenesou do PDF; hebrejština zůstává správně zprava doleva."
            ] },
            { type: "note", text: "U sezení s Heart-Wall export vyjádří výsledek slovy — Heart-Wall odstraněna, nebo Heart-Wall přítomna, v tomto sezení neodstraněna — nikdy holé ano či ne." }
          ]
        },
        {
          id: "topic-export-formats",
          title: "Výběr formátu",
          priority: 2,
          body: [
            { type: "p", text: "PDF je nejlepší pro odeslání hotového, dobře vypadajícího dokumentu vašemu klientovi. Prostý text je nejlepší, když chcete poznámky uchovat ve svých vlastních záznamech nebo je přenést do jiné aplikace." },
            { type: "p", text: "PDF zachová formátování vašich poznámek — tučné písmo, seznamy, nadpisy a odsazení — jako formátovaný text, zatímco prostý textový soubor uchová poznámky přesně tak, jak jste je napsali." },
            { type: "p", text: "Nejste si jisti, co se pro tuto chvíli hodí? V kroku úprav přepněte editor na Náhled — orámovaný pohled ukáže hotový dokument přesně tak, jak se bude číst — a rozhodněte se před exportem." }
          ]
        }
      ]
    },
    {
      id: "overview",
      title: "Váš přehled",
      group: "session-loop",
      featured: false,
      topics: [
        {
          id: "topic-dashboard",
          title: "Čtení vašeho přehledu",
          priority: 2,
          body: [
            { type: "p", text: "Váš přehled shromažďuje celou vaši praxi na jednom klidném místě: {ui:overview.stats.clients}, {ui:overview.stats.sessions} a {ui:overview.stats.month} jsou nahoře, s každým klientem vypsaným níže." }
          ]
        },
        {
          id: "topic-filters",
          title: "Vyhledávání a filtrování",
          priority: 2,
          body: [
            { type: "p", text: "Najděte kohokoli rychle. Vyhledávejte podle jména v horní části seznamu a poté jej zužte pomocí {ui:overview.filter.type}, {ui:filter.sessionFormat} nebo {ui:overview.filter.heartShield}." },
            { type: "note", text: "Přeuspořádejte seznam pomocí {ui:overview.filter.sort} a zvolte {ui:overview.filter.clear} pro nový začátek." }
          ]
        },
        {
          id: "topic-next-session",
          title: "Datum příštího sezení",
          priority: 2,
          body: [
            { type: "p", text: "Nastavte {ui:session.form.nextSessionDate} u sezení a objeví se ve vašem přehledu pod {ui:overview.table.nextSession} — označené jako {ui:overview.table.nextSession.overdue}, jakmile datum uplyne, takže nikdo nezapadne." }
          ]
        }
      ]
    },

    // ═══ THE TECHNICAL BITS ════════════════════════════════════════════════
    {
      id: "backups",
      title: "Zálohy a vaše data",
      group: "technical",
      featured: false,
      topics: [
        {
          id: "topic-data-local",
          title: "Data nikdy neopustí váš prohlížeč",
          priority: 1,
          body: [
            { type: "p", text: "Vše, co zaznamenáte v Sessions Garden, žije pouze na tomto zařízení, uvnitř tohoto prohlížeče. Nic se nikdy neodesílá na server — toto soukromí je celým smyslem aplikace." },
            { type: "p", text: "Znamená to také, že jste jedinou zálohou. Pokud se data tohoto prohlížeče někdy vymažou, sezení zmizí s nimi, proto je důležité udržovat vlastní zálohu." }
          ]
        },
        {
          id: "topic-backup-restore",
          title: "Zálohování a obnovení",
          priority: 1,
          body: [
            { type: "p", text: "Záloha je jediný soubor, který obsahuje všechny vaše klienty a sezení. Její vytvoření zabere méně než minutu." },
            { type: "steps", items: [
              "Otevřete {ui:overview.backupRestore}.",
              "V sekci {ui:backup.export.heading} zvolte {ui:backup.action.export} pro uložení souboru zálohy — můžete jej chránit heslem.",
              "Uchovejte tento soubor na bezpečném místě, například na externím disku nebo ve svém vlastním cloudovém úložišti.",
              "Chcete-li získat svá data zpět, otevřete stejný panel, stiskněte {ui:backup.action.import} a vyberte svůj soubor zálohy."
            ] },
            { type: "note", text: "Ikona cloudu v záhlaví ukazuje, jak nedávno jste naposledy zálohovali — jemné pobídnutí, když je opět čas." }
          ]
        },
        {
          id: "topic-working-offline",
          title: "Práce offline",
          priority: 2,
          body: [
            { type: "p", text: "Jakmile je Sessions Garden otevřen ve vašem prohlížeči, funguje dál zcela bez internetu — zaznamenávání sezení, export, vše kromě aktivace licence (a deaktivace, když měníte počítač)." }
          ]
        },
        {
          id: "topic-updates",
          title: "Získávání aktualizací",
          priority: 3,
          body: [
            { type: "note", text: "Když je připravena nová verze, Sessions Garden se sám tiše aktualizuje, až jej příště otevřete online. Není třeba nic instalovat ručně." }
          ]
        }
      ]
    },
    {
      id: "installing",
      title: "Instalace aplikace",
      group: "technical",
      featured: false,
      topics: [
        {
          id: "topic-install-chrome",
          title: "Chrome a Edge",
          priority: 1,
          body: [
            { type: "glyph", name: "install-chrome" },
            { type: "p", text: "Na počítači vám Chrome a Edge umožní nainstalovat Sessions Garden jako vlastní aplikaci několika kliknutími." },
            { type: "steps", items: [
              "Otevřete Sessions Garden v Chrome nebo Edge na svém počítači.",
              "Podívejte se na konec adresního řádku po malé instalační ikoně — monitor se šipkou dolů.",
              "Klikněte na ni a poté zvolte Instalovat.",
              "Aplikace se otevře ve vlastním okně a získá zástupce na ploše — od nynějška ji otevírejte jako jakýkoli jiný program."
            ] }
          ]
        },
        {
          id: "topic-install-safari",
          title: "Safari na Macu",
          priority: 1,
          body: [
            { type: "glyph", name: "install-safari" },
            { type: "p", text: "Na Macu může Safari přidat Sessions Garden přímo do vašeho Docku." },
            { type: "steps", items: [
              "Otevřete Sessions Garden v Safari na svém Macu.",
              "V řádku nabídek otevřete nabídku Soubor (nebo nabídku Sdílet) a zvolte Přidat do Docku.",
              "Potvrďte název a klikněte na Přidat.",
              "Sessions Garden nyní žije ve vašem Docku — klikněte na něj a otevřete aplikaci ve vlastním okně."
            ] }
          ]
        },
        {
          id: "topic-install-mobile-note",
          title: "Poznámka o telefonech",
          priority: 2,
          body: [
            { type: "p", text: "Sessions Garden je vytvořen pro váš počítač, kde vykonáváte svou práci se sezeními." },
            { type: "note", text: "Můžete jej otevřít v prohlížeči telefonu, ale vaši klienti a sezení žijí na každém zařízení odděleně — mezi vaším počítačem a telefonem není žádná synchronizace. Svou skutečnou práci uchovávejte na počítači, kde jste aplikaci nainstalovali." }
          ]
        }
      ]
    },
    {
      id: "license",
      title: "Licence a zařízení",
      group: "technical",
      featured: false,
      topics: [
        {
          id: "topic-activation",
          title: "Aktivace vaší licence",
          priority: 1,
          body: [
            { type: "p", text: "Licenční klíč odemyká plnou aplikaci. Zadáte jej jednou." },
            { type: "steps", items: [
              "Otevřete {ui:nav.license}.",
              "Vložte licenční klíč ze svého e-mailu o nákupu.",
              "Aktivujte — to je jediný okamžik, kdy Sessions Garden potřebuje internet.",
              "Po aktivaci celá aplikace od té chvíle funguje offline."
            ] }
          ]
        },
        {
          id: "topic-trial",
          title: "Nejprve vyzkoušení",
          priority: 1,
          body: [
            { type: "p", text: "Chcete nejprve prozkoumat? Živé demo na uvítací stránce vám umožní vyzkoušet Sessions Garden s ukázkovými daty — pokaždé se resetuje a nic, co tam zadáte, se neuloží. Plná aplikace se otevře, jakmile aktivujete licenční klíč; od té chvíle je vše, co zaznamenáte, bezpečně uchováno na vašem počítači." }
          ]
        },
        {
          id: "topic-two-devices",
          title: "Přechod na nový počítač",
          priority: 2,
          body: [
            { type: "p", text: "Vaše licence pokrývá dvě aktivace — dva prohlížeče nebo počítače." },
            { type: "note", text: "Přecházíte na nový počítač? Nejprve deaktivujte na starém a poté aktivujte na novém, abyste zůstali v rámci limitu dvou aktivací. Nezapomeňte svá data přenést pomocí souboru zálohy." }
          ]
        }
      ]
    },
    {
      id: "troubleshooting",
      title: "Řešení potíží",
      group: "technical",
      featured: false,
      topics: [
        {
          id: "topic-missing-clients",
          title: "„Nevidím své klienty“",
          priority: 1,
          body: [
            { type: "p", text: "Vaši klienti a sezení jsou uloženi uvnitř tohoto prohlížeče na tomto počítači. Pokud se zdá, že zmizeli, jsou téměř vždy skryti, nikoli ztraceni." },
            { type: "steps", items: [
              "Zkontrolujte, zda jste ve stejném prohlížeči a profilu, který obvykle používáte — data se mezi prohlížeči nepřesouvají.",
              "Ujistěte se, že jste nevymazali data stránky ani historii pro tuto stránku.",
              "Pokud jste změnili počítač, obnovte svou nejnovější zálohu z {ui:overview.backupRestore}."
            ] }
          ]
        },
        {
          id: "topic-report-problem",
          title: "Nahlášení problému",
          priority: 2,
          body: [
            { type: "p", text: "Pokud něco nefunguje správně, můžete nám poslat diagnostickou zprávu — ale nic se nikdy neodesílá automaticky." },
            { type: "steps", items: [
              "Otevřete Nastavení a najděte {ui:settings.report.label}.",
              "Zvolte {ui:report.action.copy} pro zkopírování diagnostické zprávy.",
              "Vložte ji do e-mailu na contact@sessionsgarden.app a řekněte nám, co se stalo."
            ] },
            { type: "note", text: "Stále nevíte, jak dál? Napište nám na contact@sessionsgarden.app — každou zprávu čte skutečný člověk." }
          ]
        }
      ]
    }
  ];

  window.HELP_CONTENT_CS = SECTIONS;
})();
