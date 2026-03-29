import { UI_THEME_STORAGE_KEY } from '@/lib/theme/ui-theme'

const script = `(function(){try{var k=${JSON.stringify(UI_THEME_STORAGE_KEY)};var s=localStorage.getItem(k);var d=s==='dark';document.documentElement.classList.toggle('dark',d)}catch(e){}})();`

export function ThemeInitScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />
}
