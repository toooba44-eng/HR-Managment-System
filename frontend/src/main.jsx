import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import './index.css'

// The static GitHub Pages demo uses hash routing so deep links work without
// server-side rewrites; the real (backend-served) app uses clean URLs.
const DEMO = import.meta.env.VITE_DEMO === 'true'
const Router = DEMO ? HashRouter : BrowserRouter

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Router>
        <App />
        <Toaster
          position="top-left"
          toastOptions={{
            duration: 4000,
            style: {
              fontFamily: 'Tajawal, sans-serif',
              direction: 'rtl',
            },
          }}
        />
      </Router>
    </QueryClientProvider>
  </React.StrictMode>,
)
