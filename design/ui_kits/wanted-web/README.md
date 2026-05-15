# Wanted — Web UI Kit

A high-fidelity recreation of the Wanted (원티드) desktop web product. Includes the top navigation, jobs feed/grid, job detail, and a profile dropdown — wired up as a click-thru prototype.

Run `index.html` in a browser. Click through the nav and job cards to explore the prototype.

## Files

- `index.html` — Mount point + clickable shell
- `tokens.css` — Imports the system tokens
- `App.jsx` — Top-level router + state
- `TopNav.jsx` — The product navigation bar
- `Hero.jsx` — Homepage hero + category bar
- `JobGrid.jsx` + `JobCard.jsx` — The feed
- `JobDetail.jsx` — Single posting view
- `Sidebar.jsx` — Right-hand filters on listings
- `ProfileMenu.jsx` — Dropdown when "logged in"
- `icons.jsx` — Lucide icon imports

## Caveats

- Korean copy is illustrative — based on patterns seen in the Figma file. Replace with real strings for production.
- Icons are Lucide (closest stroke-weight match). The real product uses a custom set.
- No real auth; clicking sign-in flips a local state.
- This is a visual recreation. No real API calls.
