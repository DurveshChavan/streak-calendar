import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'app.streakcalendar',
  appName: 'Streak Calendar',
  webDir: 'dist',
  backgroundColor: '#B7D8F5',
  // system-bar and keyboard insets are handled in MainActivity (edge to edge on every Android version)
  android: { allowMixedContent: false, adjustMarginsForEdgeToEdge: 'disable' },
}
export default config
