import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from '@/App.tsx'
import { TooltipProvider } from '@/components/ui/tooltip'
import { builtinPack } from '@/features/workflow/packs/builtin'
import { createNodeRegistry } from '@/features/workflow/registry/create'
import { installNodeRegistry } from '@/features/workflow/registry/install'
import '@/index.css'

/**
 * Every node type the editor knows about enters through this list. The built-in
 * pack has no privilege here — a third-party pack is another entry, and the
 * registry validates all of them by the same rules.
 *
 *   installNodeRegistry(createNodeRegistry([builtinPack, slackPack]))
 */
installNodeRegistry(createNodeRegistry([builtinPack]))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TooltipProvider delayDuration={300}>
      <App />
    </TooltipProvider>
  </StrictMode>,
)
