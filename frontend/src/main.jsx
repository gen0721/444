import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Inject Google Fonts
const link = document.createElement('link')
link.href = 'https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap'
link.rel = 'stylesheet'
document.head.appendChild(link)

ReactDOM.createRoot(document.getElementById('root')).render(<App/>)
