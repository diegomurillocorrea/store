/**
 * Reglas de alcance de marca: leen variables definidas en OrgBrandRoot (BD / UI).
 * Lienzo del panel: --background, --surface, --surface-muted alineados con SidebarLayout.
 */
const ORG_BRAND_SCOPE_CSS = `
.org-brand-scope {
  --org-brand-primary: var(--org-p-l);
  --org-brand-accent: var(--org-a-l);
  --org-brand-muted: var(--org-m-l);
  --background: var(--org-shell-bg-l);
  --surface: var(--org-shell-surface-l);
  --surface-muted: var(--org-shell-bg-l);
  --border: color-mix(in srgb, var(--foreground) 11%, var(--org-shell-surface-l));
}
html.dark .org-brand-scope {
  --org-brand-primary: var(--org-p-d);
  --org-brand-accent: var(--org-a-d);
  --org-brand-muted: var(--org-m-d);
  --background: var(--org-shell-bg-d);
  --surface: var(--org-shell-surface-d);
  --surface-muted: var(--org-shell-bg-d);
  --border: color-mix(in srgb, var(--foreground) 18%, var(--org-shell-bg-d));
}
.org-brand-scope nav [data-slot="section"] > span.relative > span.absolute.inset-y-2 {
  background-color: var(--org-brand-accent) !important;
}
.org-brand-scope nav [data-slot="section"] a[data-current="true"] svg[data-slot="icon"] {
  fill: var(--org-brand-accent);
}
.org-brand-scope .org-brand-muted-text {
  color: var(--org-brand-muted);
}
.org-brand-scope [data-slot="section"] > h3 {
  color: var(--org-brand-muted) !important;
}
`

export function OrgBrandScopeStyles() {
  return <style dangerouslySetInnerHTML={{ __html: ORG_BRAND_SCOPE_CSS }} />
}
