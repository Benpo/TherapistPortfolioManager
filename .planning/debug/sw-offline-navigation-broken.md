---
status: resolved
trigger: "sw-offline-navigation-broken — app doesn't work offline after SW was neutered to fix CF Pages redirect loop"
created: 2026-03-25T00:00:00Z
updated: 2026-03-25T00:10:00Z
---

## Current Focus

hypothesis: SW v30 skips ALL navigation requests (line 124-126), so no HTML page can load from cache when offline. HTML was also removed from PRECACHE_URLS, so there is nothing cached to serve even if we did intercept navigations.
test: Implement fetch+put pattern for HTML precaching (avoids redirect response storage) and add network-first + cache-fallback for navigate mode requests.
expecting: All 19 HTML pages load offline; static assets continue cache-first; Gate 0 in index.html is preserved.
next_action: Human verification — load app online, confirm SW v31 installs, go offline, test navigation

## Symptoms

expected: All 19 HTML pages load when offline; navigation between pages works
actual: Only cached static assets (CSS, JS, fonts, images) load. HTML page navigation silently fails — SW returns nothing for navigate requests.
errors: No explicit errors — navigations silently fail because SW returns undefined (no event.respondWith call for navigate mode)
reproduction: 1) Load app online, SW installs. 2) Go offline (DevTools). 3) Navigate to any page — fails.
started: Broken since 2026-03-24/25 commits d2469e9, 9883857, d6915cb, eabcd39 that neutered SW to fix CF Pages redirect loop.

## Eliminated

- hypothesis: CF Pages redirect causes browser to reject cached HTML responses when served via SW
  evidence: Root cause confirmed by user — cache.add() stores a redirected:true response; browsers reject these. Fix is fetch(url,{redirect:'follow'}) + cache.put(url, clonedFinalResponse) to store the final 200.
  timestamp: 2026-03-25T00:00:00Z

## Evidence

- timestamp: 2026-03-25T00:00:00Z
  checked: sw.js lines 119-126
  found: fetch handler returns early (no event.respondWith) for ALL navigate requests — browser gets no response from SW, falls through to network. Offline = fail.
  implication: Navigation requests bypass SW entirely; no cache fallback possible.

- timestamp: 2026-03-25T00:00:00Z
  checked: sw.js PRECACHE_URLS (lines 23-59)
  found: No HTML files listed. Comment on line 19-22 explains intentional removal.
  implication: Even if navigate requests were handled, there is nothing in cache to serve.

- timestamp: 2026-03-25T00:00:00Z
  checked: index.html lines 4-8
  found: Gate 0 inline script checks localStorage('portfolioLicenseActivated'), redirects to landing.html if absent. Must be preserved. SW should not intercept landing.html.
  implication: landing.html must stay out of PRECACHE_URLS and SW must not cache it.

- timestamp: 2026-03-25T00:00:00Z
  checked: HTML files in root via glob
  found: 19 HTML files excluding landing.html: index, license, reporting, sessions, add-session, add-client, demo, disclaimer, disclaimer-en, disclaimer-he, disclaimer-cs, datenschutz, datenschutz-en, datenschutz-he, datenschutz-cs, impressum, impressum-en, impressum-he, impressum-cs
  implication: These 19 files need fetch+put precaching. CF Pages serves them at extensionless URLs (no .html), so precache URLs must omit the .html extension to match what the browser navigates to.

## Resolution

root_cause: SW v30 was deliberately changed (commit 9883857) to skip ALL navigate requests and remove HTML from precache, to avoid CF Pages redirect bug. This eliminated offline HTML support entirely. The underlying CF Pages issue is that cache.add('/index.html') stores a 301-redirected response; browsers refuse to serve redirected responses for navigations. The correct fix is fetch(url,{redirect:'follow'})+cache.put() to store the final 200 response.
fix: Bumped to v31. Added PRECACHE_HTML array (19 extensionless CF Pages paths, excluding /landing). In install, HTML uses fetch+put pattern via precacheHtml() helper. In fetch handler, navigate requests now get network-first + cache fallback (exact pathname, then '/' as last resort). /landing and /landing.html navigations are explicitly excluded (return early). Static assets unchanged (cache-first).
verification: confirmed fixed 2026-03-25
files_changed: [sw.js]
commits: [049a2ab (v31 - precache HTML + navigate handler), f8a2444 (v32 - normalize .html paths in cache lookups)]
