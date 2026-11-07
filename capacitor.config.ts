import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'app.streakcalendar',
  appName: 'Streak Calendar',
  webDir: 'dist',
  backgroundColor: '#B7D8F5',
  // keep the web content clear of the status/nav bars on every Android version (edge-to-edge is enforced on 15)
  android: { allowMixedContent: false, adjustMarginsForEdgeToEdge: 'force' },
}
export default config
