import { createRoot } from 'react-dom/client'
import '@fontsource/roboto/300.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'
import './styles.css'
import App from './App'
import { store } from './lib/store'
import { initKeyboard } from './lib/keyboard'

createRoot(document.getElementById('root')!).render(<App />)
store.start()
initKeyboard()
