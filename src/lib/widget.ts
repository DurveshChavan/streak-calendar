import { registerPlugin, Capacitor } from '@capacitor/core'
import type { Doc } from './store.ts'
import { widgetPayload } from './widgetPayload.ts'

interface WidgetBridge { update(o: { json: string }): Promise<void>; setTheme(o: { dark: boolean }): Promise<void> }
const Bridge = Capacitor.isNativePlatform() ? registerPlugin<WidgetBridge>('WidgetBridge') : null
let last = ''

export function pushWidget(doc: Doc) {
  if (!Bridge) return
  const json = widgetPayload(doc)
  if (json === last) return
  last = json
  Bridge.update({ json }).catch(() => { })
}

export function setSystemBars(dark: boolean) {
  Bridge?.setTheme({ dark }).catch(() => { })
}
