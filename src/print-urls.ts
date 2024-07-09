import qrcode from 'qrcode-terminal'
import runningAt from 'running-at'

import type { HmrContext, Plugin } from 'vite'

export function printUrlsPlugin(): Plugin {
  let hmrContext: HmrContext
  return {
    name: 'vite-plugin-print-urls',
    enforce: 'pre',
    handleHotUpdate(ctx) {
      hmrContext = ctx
    },
    configureServer({ watcher, httpServer, printUrls, config }) {
      function printUrlsAndQrCode() {
        const addr = `https://${runningAt().ip}:${(httpServer?.address() as any)?.port}`
        qrcode.generate(addr, { small: true })
        try { printUrls() } catch {}
      }

      httpServer?.on('listening', () => setTimeout(printUrlsAndQrCode, 50))

      watcher.on('all', (_, file) => {
        printUrlsAndQrCode()

        const queue = config.plugins.map(plugin => (plugin.handleHotUpdate && hmrContext
          ? (plugin.handleHotUpdate as any)(hmrContext)
          : Promise.resolve()))

        Promise.all(queue).then((fullModules) => {
          const filteredModules = fullModules.filter((item) => item && item.length)

          if (filteredModules.length || hmrContext?.modules.length) {
            // hmr update
            printUrlsAndQrCode()
          }

          if (!hmrContext?.modules.length) {
            if (file.endsWith('.html')) {
              // page reload
              printUrlsAndQrCode()
            }
          }
        })
      })
    }
  }
}
