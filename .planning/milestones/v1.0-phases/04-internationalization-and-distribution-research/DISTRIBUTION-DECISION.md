א# Distribution Decision: Sessions Garden

**Decided:** 2026-03-11
**Decided by:** Sapir (product owner) with research support
**Implements:** DIST-01 (Hosting), DIST-02 (Payment)
**Implementation phase:** Phase 5

## Hosting: Cloudflare Pages

**Decision:** Host Sessions Garden on Cloudflare Pages (free tier).

**Rationale:**
- Zero monthly cost (free tier: unlimited requests, 500 builds/month, unlimited bandwidth)
- Static site — no server, no backend, no runtime needed
- Automatic HTTPS
- Global CDN for fast loading worldwide
- Simple deployment: push to GitHub -> auto-deploys
- Custom domain support via CNAME

**Domain:**
- Primary: Custom domain (~10 EUR/year via Cloudflare Registrar)
- Fallback: *.pages.dev free subdomain during initial launch

**Implementation notes for Phase 5:**
- Connect GitHub repo to Cloudflare Pages
- Set build output directory (root — no build step needed)
- Configure custom domain when ready
- No environment variables needed (pure static site)

## Payment: Lemon Squeezy

**Decision:** Use Lemon Squeezy as Merchant of Record for payment processing.

**Rationale:**
- Merchant of Record model: Lemon Squeezy is the legal seller
- Handles EU VAT collection, calculation, reporting, and remittance automatically
- No monthly fees — only per-transaction: 5% + $0.50
- Built-in license key generation and delivery
- One-time purchase product setup (no recurring billing complexity)
- Receipts issued automatically to customers

**Business model:**
- One-time purchase (not subscription)
- Price TBD by Sapir
- Customer pays -> receives license key via email -> enters key in app to unlock

**Access control:**
- License key validated locally in the app (no server calls for daily use)
- Key format and validation logic to be implemented in Phase 5 (DIST-03)
- Lemon Squeezy generates keys automatically on purchase

**EU VAT compliance:**
- Lemon Squeezy as MoR handles all VAT obligations
- No VAT registration needed for Sapir personally
- Receipts with correct VAT amounts issued automatically

**Implementation notes for Phase 5:**
- Create Lemon Squeezy account
- Create product with one-time purchase pricing
- Enable license key generation for the product
- Get checkout link / embed for landing page
- Implement license key validation in app (DIST-03)

## Cost Summary

| Item | Cost | Frequency |
|------|------|-----------|
| Cloudflare Pages hosting | Free | - |
| Custom domain | ~10 EUR | Annual |
| Lemon Squeezy | 5% + $0.50 per sale | Per transaction |
| **Total fixed cost** | **~10 EUR/year** | |

## Key Priorities Met

1. **Simplicity for Sapir:** Push to GitHub = deployed. Lemon Squeezy handles payments/VAT/receipts.
2. **Reliability for customers:** Cloudflare CDN, automatic HTTPS, global availability.
3. **Minimal cost:** ~10 EUR/year fixed. No monthly fees.
