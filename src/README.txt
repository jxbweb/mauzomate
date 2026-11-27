MAUZOMATE FIRST IMPROVEMENT PASS

Files included:
- App.jsx
- App.css
- Auth.jsx
- supabase.js

What changed in this pass:
1. Corrected the Supabase maybeSingle() method casing in backup export.
2. Corrected the employee membership lookup so it retrieves permissions and ignores inactive memberships.
3. Made backup export safer: requires a signed-in business owner and a valid business profile; branches are scoped to that business.
4. Removed unused duplicate daily-sales calculations.
5. Removed the unnecessary nested Monthly Revenue Trend card wrapper.
6. Added scoped light/dark mode text contrast and responsive layout finishing rules.
7. Cleaned Auth.jsx, removed its unused resetMode state, and improved form autocomplete/accessibility.
8. Kept supabase.js using the existing Vite environment variable names.

IMPORTANT:
- These files were checked for JavaScript/JSX syntax using the TypeScript transpiler and CSS brace balance.
- This is not a full application build or live Supabase integration test because the complete project folder, package.json, database schema, and runtime credentials were not supplied.
- Keep a backup of your current src files before replacing anything.
- Do not upload .env files or service-role keys.
- Do not deploy until you have tested login, password reset, owner/employee access, sales, inventory, purchase orders, reports, backup, and restore in your local project.
