# Technology & Maintainability Research: Therapist Portfolio App

**Date:** 2026-02-19
**Current state:** 5 HTML pages, vanilla JS, IndexedDB, custom i18n (EN/HE), no build tools, no backend, ~850 lines in largest file

---

## 1. Frontend Technology Choices

### Current State Assessment

The app is approximately 2,500 lines of JavaScript across 8 files, with a well-structured IIFE module pattern, custom i18n, and IndexedDB for persistence. The code is clean but already showing strain: `add-session.js` at 848 lines mixes UI, form logic, database operations, and inline client creation.

### Option A: Keep Vanilla JS (with improvements)

**Pros:**
- Zero migration cost, zero new dependencies
- No build tools to maintain
- You already understand it deeply

**Cons:**
- DOM manipulation becomes increasingly painful as the app grows
- No component model means copy-paste for shared UI
- State management is ad-hoc
- Testing DOM-heavy vanilla JS is harder than testing component frameworks

**Verdict:** Viable only if the app stays frozen at current scope.

### Option B: HTMX + Django Templates (Recommended)

**Why this is the best fit for your profile:**

HTMX is not a JavaScript framework. It is a 14KB library that extends HTML with attributes like `hx-get`, `hx-post`, `hx-swap`, and `hx-trigger`. The server returns HTML fragments, not JSON. This means:

- Your Python strength becomes the frontend skill
- Your existing HTML structure translates almost directly
- No build step, no npm, no bundler -- one `<script>` tag
- The mental model is "enhanced HTML" rather than "JavaScript application"

Example of what the client table would look like:

```html
<!-- HTMX: server renders the table, HTMX handles partial updates -->
<table class="table">
  <tbody id="clientTableBody"
         hx-get="/api/clients/"
         hx-trigger="load"
         hx-swap="innerHTML">
  </tbody>
</table>

<!-- Delete with a button, server returns updated table -->
<button hx-delete="/api/clients/{{ client.id }}/"
        hx-target="#clientTableBody"
        hx-swap="innerHTML"
        hx-confirm="{% trans 'confirm.deleteClient.body' %}">
  Delete
</button>
```

Your 848-line `add-session.js` would shrink dramatically because the server handles form validation, data persistence, and returns rendered HTML.

**For small interactive bits** (severity scale clicks, toggle groups), add Alpine.js (~17KB) for client-side reactivity without a round trip. The Django + HTMX + Alpine.js stack ("DHA stack") has strong momentum in 2025-2026.

### Option C: Vue.js

Good framework but means learning two things (Vue + a Python API) instead of deepening one (Django templates + HTMX). Requires build tools (Vite), npm.

### Option D: Svelte

Excellent developer experience but smaller ecosystem, fewer resources when stuck, still requires build tools and separate backend API.

### Frontend Recommendation

**HTMX + Alpine.js + Django Templates.** Plays directly to Python strength, eliminates JavaScript build pipeline, 90% of SPA functionality with 10% of complexity for CRUD applications.

---

## 2. Backend Technology Choices

### Is a Backend Necessary?

**Yes.** Once you distribute to multiple users, you need:
- **Authentication:** Who is this user?
- **Data isolation:** User A must not see User B's clients
- **Backup and recovery:** IndexedDB lives in one browser on one device
- **Updates:** Backend update applies instantly for all users

### Django (Recommended)

| Concern | Django | Flask | FastAPI |
|---------|--------|-------|---------|
| Auth system | Built-in (users, groups, permissions, sessions, password hashing) | Roll your own | Roll your own |
| Admin panel | Built-in (free CRUD UI) | None | None |
| ORM | Built-in (migrations, querysets, relations) | Add SQLAlchemy | Add SQLAlchemy |
| Form validation | Built-in (ModelForms, CSRF) | Add WTForms | Pydantic (API-focused) |
| i18n | Built-in (`{% trans %}`, `.po` files) | Add Flask-Babel | Manual |
| Template engine | Built-in | Add Jinja2 | Not its purpose |
| Security defaults | CSRF, XSS, SQL injection, clickjacking | Manual | Manual |
| HTMX integration | `django-htmx` package, first-class | Possible but manual | Mismatch |

Flask is lighter, but "lighter" means you build everything Django gives you for free. FastAPI is excellent for pure APIs, but this is a form-heavy CRUD app with server-rendered HTML -- Django's sweet spot.

**Django's admin panel alone is worth the choice**: manage user accounts, inspect data, and debug issues without building any admin UI.

**Learning value:** Django teaches URL routing, middleware, ORM, migrations, templates, authentication, CSRF, sessions -- concepts that transfer to any framework.

### Database: SQLite (with Litestream)

For 10-20 users, PostgreSQL is overkill. SQLite is:
- **Zero-configuration:** No database server to install or maintain
- **Included with Python:** Django supports it natively
- **Fast enough:** Handles millions of rows. Your app will have a few thousand.
- **Backed up with Litestream:** Continuously streams changes to S3-compatible storage (Cloudflare R2). Cost: effectively $0.

**When to upgrade to PostgreSQL:** 50+ concurrent write operations/second (extremely unlikely). Django makes this a one-line settings change.

---

## 3. Maintainability Considerations

### Stack Minimizes Maintenance Surface

| Component | Maintenance Burden | Why Low |
|-----------|-------------------|---------|
| Django | Low | LTS releases every 2 years, security patches backported |
| HTMX | Very Low | Single JS file, no npm, backward-compatible |
| Alpine.js | Very Low | Single JS file, stable API since v3 |
| SQLite | Zero | Ships with Python |
| Litestream | Very Low | Single binary sidecar |

**Contrast with Vue/React + FastAPI:** npm dependencies (hundreds of transitive packages), Vite/webpack config, TypeScript types, separate API contract, CORS, two deployment targets.

### Dependency Management

```
# requirements.txt -- entire backend dependency list
django>=5.1,<5.2
django-htmx>=1.21
gunicorn>=23.0
```

~4 direct dependencies. Compare to a typical React project with 30-80 direct dependencies and 500+ transitive ones.

**Security updates:** Run `pip-audit` in CI to check for known vulnerabilities.

### Testing Strategy

Focus testing where bugs hurt most:

1. **Model tests (high priority):** Pure Python, fast, catch data integrity issues
2. **View tests (medium priority):** Django test client simulates HTTP requests, tests auth and data isolation
3. **No frontend unit tests initially:** HTMX means testing views tests the "frontend" too
4. **One end-to-end smoke test:** Playwright for the critical path (login, add client, add session, reporting)

```python
# Example: tests auth AND data isolation AND the rendered HTML
class ClientViewTest(TestCase):
    def test_client_list_requires_login(self):
        response = self.client.get("/clients/")
        self.assertEqual(response.status_code, 302)  # Redirect to login

    def test_client_list_shows_only_own_clients(self):
        self.client.force_login(self.therapist_a)
        response = self.client.get("/clients/")
        self.assertContains(response, "Alice")
        self.assertNotContains(response, "Bob")  # Bob belongs to therapist_b
```

### Monitoring and Error Tracking

**Sentry free tier** (5,000 errors/month) -- install with 3 lines:
```python
import sentry_sdk
sentry_sdk.init(dsn="...", traces_sample_rate=0.1)
```

Alternative: **GlitchTip** (open-source, self-hostable, Sentry-compatible).

---

## 4. Scalability (Realistic)

### What 10-20 Users Actually Means

- ~100 sessions/week, ~5,200 sessions/year
- ~200 clients total across all therapists
- Peak concurrent users: 2-3
- Total database size: under 10MB (excluding photos)

Comfortably handled by a single $5-7/month server.

### Simplest Infrastructure

| Platform | Monthly Cost | Notes |
|----------|-------------|-------|
| Railway.app (Recommended) | $5-10/mo | Connect GitHub, deploy on push, managed env vars |
| Render.com | $7/mo | Free tier for static sites, native PostgreSQL |
| Fly.io | ~$3.15/mo | SQLite-friendly (persistent volumes), more CLI-driven |

**Total monthly cost:** $5-10 hosting + $0 database + $0 backups (R2 free tier) + $0 error tracking (Sentry free tier) = **$5-10/month**

### Growth to 50-100 Users

Same single-server architecture handles this without changes. SQLite supports this read-heavy workload. If you reach 100+ concurrent writers, migrate to PostgreSQL with a one-line Django settings change.

---

## 5. Distribution and Updates

### Server-Rendered = No Client Distribution

**Strongest argument for Django + HTMX:** There is no client-side app to distribute. Users visit a URL and always get the latest version. No app store, no "please update" notifications, no version fragmentation.

### CI/CD for a Solo Developer

```yaml
# .github/workflows/deploy.yml
name: Test and Deploy
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - run: pip install -r requirements.txt
      - run: python manage.py test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - # Railway/Render/Fly deploy step
```

**No Docker, no Kubernetes, no Terraform.** Those are for teams managing hundreds of services.

---

## 6. Security Essentials

### Authentication: Django Built-In (Recommended)

**Do not use Auth0 or Clerk for 10-20 users:**

| Factor | Django built-in auth | Auth0/Clerk |
|--------|---------------------|-------------|
| Cost | $0 | $0 (free tier) but lock-in |
| Control | Full | Vendor dependency |
| Hebrew i18n | Django handles it | Limited |
| Offline resilience | Your server | If Auth0 is down, users locked out |
| Password reset | Built-in views | Hosted pages |

Auth0/Clerk make sense at thousands of users with social login needs.

### Encryption

**In transit:** Django + Gunicorn on Railway/Render/Fly gets TLS automatically. Set `SECURE_SSL_REDIRECT = True`.

**At rest:** Two layers:
1. **Server-level:** Railway/Render/Fly encrypt disks by default
2. **Field-level:** `django-encrypted-model-fields` for sensitive fields

```python
from encrypted_model_fields.fields import EncryptedTextField

class Session(models.Model):
    client = models.ForeignKey(Client, on_delete=models.CASCADE)
    date = models.DateField()
    notes = EncryptedTextField(blank=True)  # Encrypted at rest
    trapped_emotions = EncryptedTextField(blank=True)
    customer_summary = EncryptedTextField(blank=True)
```

### Backup Strategy

1. **Litestream** continuously replicates SQLite to Cloudflare R2
2. **Daily snapshot** via cron: `python manage.py dumpdata > backup.json`
3. **Test restores quarterly** -- untested backup is not a backup

### Minimum Viable Security Checklist

- HTTPS (TLS) via hosting provider
- Django CSRF protection (default)
- Django XSS auto-escaping (default)
- Django SQL injection protection (ORM)
- Password hashing (PBKDF2 default, or Argon2)
- Secure session cookies
- Encrypted sensitive fields
- `SECURE_SSL_REDIRECT`, `SECURE_HSTS_SECONDS`, `SESSION_COOKIE_SECURE`
- Rate limiting on login (`django-axes` or `django-ratelimit`)
- `pip-audit` in CI
- Litestream backups to encrypted cloud storage

---

## Recommended Tech Stack Summary

```
                    +-------------------+
                    |     Browser       |
                    |  (HTMX + Alpine)  |
                    +--------+----------+
                             |
                         HTTPS (TLS)
                             |
                    +--------v----------+
                    |     Django 5.1    |
                    |  - Templates      |
                    |  - Auth           |
                    |  - ORM            |
                    |  - i18n           |
                    |  - django-htmx    |
                    +--------+----------+
                             |
                    +--------v----------+
                    |     SQLite        |
                    |  + Litestream     |
                    |    -> R2/S3       |
                    +-------------------+

  Hosting: Railway.app ($5-10/month)
  CI/CD:   GitHub Actions (free)
  Errors:  Sentry free tier
```

### Migration Path from Current App

**Phase 1 -- Backend foundation (1-2 weeks)**
- Django project with models matching IndexedDB schema
- Django auth (registration, login, password reset)
- Data import script for current JSON export format
- Deploy to Railway

**Phase 2 -- Page-by-page migration (2-4 weeks)**
- Convert one page at a time, start with simplest (reporting)
- Each page becomes Django template + view + HTMX attributes
- Existing CSS carries over directly
- i18n dictionary converts to Django `.po` files

**Phase 3 -- Security hardening (1 week)**
- Field-level encryption for sensitive data
- Litestream backups
- Django security settings
- `django-axes` for login rate limiting

**Phase 4 -- Polish and distribute (1 week)**
- Sentry setup
- GitHub Actions CI/CD
- Create user accounts for therapists
- Send them a URL -- done

### Why This Stack

1. **Single language:** Python everywhere
2. **Minimal dependencies:** ~4 pip packages, 2 CDN scripts
3. **No build step:** No webpack, no Vite, no npm
4. **Free admin panel:** Django admin for user/data management
5. **Battle-tested security:** Django's defaults are among the best
6. **Educational depth:** Teaches foundational web concepts
7. **Community momentum:** Django + HTMX is thriving in 2025-2026

---

## Sources

- [Django vs Flask vs FastAPI (JetBrains)](https://blog.jetbrains.com/pycharm/2025/02/django-flask-fastapi/)
- [FastAPI vs Django REST vs Flask 2025](https://ingeniousmindslab.com/blogs/fastapi-django-flask-comparison-2025/)
- [HTMX Worth Learning 2025 (WeAreDevelopers)](https://www.wearedevelopers.com/en/magazine/537/is-htmx-worth-learning-in-2025-537)
- [Django + HTMX SaaS Boilerplate](https://medium.com/@georgedev/a-django-htmx-boilerplate-for-saas-built-for-myself-shared-for-free-9b857fc59daf)
- [2026 Django SaaS Starter Kit](https://medium.com/django-journal/2026-django-saas-starter-kit-async-views-htmx-frontend-stripe-and-multi-tenancy-included-aad3d507b456)
- [Litestream](https://litestream.io/)
- [Railway vs Render (Northflank)](https://northflank.com/blog/railway-vs-render)
- [Sentry Alternatives (Uptrace)](https://uptrace.dev/comparisons/sentry-alternatives)
- [Israel Amendment 13 Privacy Law (IAPP)](https://iapp.org/news/a/israel-marks-a-new-era-in-privacy-law-amendment-13-ushers-in-sweeping-reform)
