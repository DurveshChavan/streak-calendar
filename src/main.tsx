import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App'
import { store } from './lib/store'

createRoot(document.getElementById('root')!).render(<App />)
store.start()
