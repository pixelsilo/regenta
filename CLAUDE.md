# Regenta

Pixel Silo client folder. Jobs here come from the Adapt dashboard and follow the `adapt-job` skill.

## Client

- Dashboard: `regenta`, https://dashboard.pixelsilo.net/studio/w/regenta
- Live: https://www.regenta.co.uk
- Staging: https://regenta-uk.webflow.io
- Webflow: site `68362e432005a0afe1416a06` ("Regenta UK"), through the `webflow-regenta` connection. That connection also reaches Regenta International and Regenta Residential; only work on those if the job says so.
- Related: `D:\code\regenta-private` holds the Cloudflare workers (form relay, event expiry) for this client

## Code

Custom JS lives in this repo (github.com/pixelsilo/regenta). Follow the `webflow-custom-code` skill for how it's built and released.

## Writing

Anything drafted for Luke to send (client messages, questions, approval messages) follows the `writing-guide` skill, not `pixel-silo-brand`.

## How we work

Notes from Luke's corrections, added as we go. Read before starting a job.

- Nav variants (buyer vs professional) live inside the one Navbar component as separate link sets, shown or hidden with component properties. Don't build a second nav component or toggle links with JS. (#57, 25 Nov 2026)
- Keep the FAQ ↔ calculator cross-links. Dan asked to remove them, but Elle agreed on the call to keep them.
- Two contact pages: a buyer one (phone only, no form) and the professional Contact Us with its form.
- New page designs (e.g. the Professional services landing page) get mocked up locally for Luke first, then built in Webflow and pushed to staging.
