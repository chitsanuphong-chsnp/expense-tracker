# Mobile UI refresh

The mobile dashboard now follows the supplied reference: compact budget bar, blue-purple primary card with a full-width record action, four pastel tiles, a slip status strip, compact chart and a floating four-tab navigation bar. The existing Noto fonts and motion/reduced-motion controls remain in use. The wallet artwork uses the generated 192px asset (about 45KB); no new dependencies were added.

At widths below 1000px, the content is capped at 520px. Desktop retains its sidebar and dashboard layout. Mobile tabs are Home, Transactions, Reports and Settings; recording and slips are available from dashboard actions, and adding a record is also available in Transactions.

Transactions default to a collapsed filter section on mobile. Opening it exposes all existing filters. A collapsed section shows when type/account/category filters are active. Record rows have their own white surface, and report periods use a segmented control. Page navigation resets the shared scroll position.

## Verified

- Expo app TypeScript and production web export passed after the final scroll fix.
- Browser layouts at 320×740, 390×844 and 1440×1000; no horizontal document overflow on mobile.
- Cash record 37.50 → today's expense 37.50, net -37.50, cash expense 37.50; deleting the test row restores all three to zero and the original monthly total. The test row was removed.
- Cash account filtering, expand/collapse, weekly report selection, slip entry and navigation work.
- Switching from a scrolled record form to another route starts at the top.
- No new browser console errors or warnings observed during verification.

Physical iPhone/Android testing through Expo Go remains to be done. These browser checks do not establish device behavior.

Sources: `apps/app/src/mobile-dashboard.tsx`, `apps/app/src/ui.tsx`, `apps/app/src/views.tsx`.
