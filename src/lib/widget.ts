// Pushes what the Android home-screen widget needs to native storage. No-op on the web.
import { registerPlugin, Capacitor } from '@capacitor/core'
import type { Doc } from './store'
import { widgetPayload } from './widgetPayload'

interface WidgetBridge { update(o: { json: string }): Promise<void>; setTheme(o: { dark: boolean }): Promise<void> }
const Bridge = Capacitor.isNativePlatform() ? registerPlugin<WidgetBridge>('WidgetBridge') : null
let last = ''

export function pushWidget(doc: Doc) {
  if (!Bridge) return
  const json = widgetPayload(doc)
  if (json === last) return
  last = json
  Bridge.update({ json }).catch(() => { /* no widget placed / plugin unavailable */ })
}

/** Status/navigation bar colours follow the app theme (Android only). */
export function setSystemBars(dark: boolean) {
  Bridge?.setTheme({ dark }).catch(() => { /* older native shell */ })
}
