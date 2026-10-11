import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiProxy = {
    '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
    }
}

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        port: 3000,
        host: true,
        proxy: apiProxy
    },
    preview: {
        port: 3000,
        host: true,
        proxy: apiProxy
    }
})
