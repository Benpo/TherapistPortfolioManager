# Refund Handling SOP — Sessions Garden

**Last updated:** 2026-03-24
**Applies to:** Lemon Squeezy Store #324581 (Sessions Garden)

## When to Use This

A customer contacts contact@sessionsgarden.app requesting a refund for their Sessions Garden license (EUR 119 one-time purchase).

## Steps

### 1. Verify the Request

- Confirm the customer's email matches a Lemon Squeezy order
- Check how long ago they purchased (Lemon Squeezy dashboard > Orders)
- EU law (Widerrufsrecht): customers have 14 days for digital goods, BUT the right is waived if they accepted the terms and began using the product. Use your judgment.

### 2. Process the Refund in Lemon Squeezy

1. Go to https://app.lemonsqueezy.com/orders
2. Find the customer's order (search by email)
3. Click the order to open details
4. Click "Refund" button
5. Select full or partial refund
6. Confirm — Lemon Squeezy handles the payment reversal

### 3. Deactivate the License Key

1. Go to https://app.lemonsqueezy.com/licenses
2. Find the customer's license key (search by email or key)
3. Click the license to open details
4. Click "Deactivate All Instances" to remove all device activations
5. Optionally: disable the license key entirely so it cannot be re-activated

### 4. What Happens After Deactivation

- **Existing installs keep working.** The app is local — it cannot check the license server daily. The customer can continue using the app on devices where it's already activated.
- **New activations blocked.** The customer cannot activate on any new device or browser. If they clear their browser data, they lose access.
- **This is proportional.** At EUR 119 one-time purchase with low volume, building automated enforcement (webhooks, periodic revalidation) is not justified. This manual process works.

### 5. Respond to the Customer

Template:

> Hi [name],
>
> Your refund of EUR 119 has been processed. You should see it in your account within 5-10 business days depending on your payment provider.
>
> Your license key has been deactivated. If you'd like to use Sessions Garden again in the future, you're welcome to purchase a new license at any time.
>
> Best regards,
> Sessions Garden

## Edge Cases

| Situation | Action |
|-----------|--------|
| Customer purchased more than 14 days ago | Refund at your discretion — good customer service builds reputation |
| Customer says app doesn't work | Troubleshoot first (check browser compatibility, clear cache) before refunding |
| Customer wants to transfer license to new device | Not a refund — tell them to deactivate old device from within the app, then activate on new device |
| Customer lost access to old device | Deactivate their instances in LS dashboard (step 3), then they can re-activate |

## Future Consideration

If refund volume becomes significant (>5/month), consider building:
- Cloudflare Worker webhook to auto-deactivate on LS refund event
- Periodic license revalidation check (30-day ping)

For now, manual process is the right approach.
