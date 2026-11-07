// Pushes the data the Android home-screen widget needs (habit 1 only) to native storage. No-op on the web.
import { registerPlugin, Capacitor } from '@capacitor/core'
import type { Doc } from './store'

interface WidgetBridge { update(o: { json: string }): Promise<void> }
const Bridge = Capacitor.isNativePlatform() ? registerPlugin<WidgetBridge>('WidgetBridge') : null
let last = ''

export function pushWidget(doc: Doc) {
  if (!Bridge) return
  const h = doc.habits[0] // the widget always shows the first habit
  const json = JSON.stringify({ name: h.name, marks: h.marks, theme: doc.theme })
  if (json === last) return
  last = json
  Bridge.update({ json }).catch(() => { /* widget not placed / plugin unavailable */ })
}
