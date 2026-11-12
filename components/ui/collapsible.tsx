"use client"

import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible"

function Collapsible({ ...props }: CollapsiblePrimitive.Root.Props) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />
}

function CollapsibleTrigger({ ...props }: CollapsiblePrimitive.Trigger.Props) {
  return (
    <CollapsiblePrimitive.Trigger data-slot="collapsible-trigger" {...props} />
  )
}

function CollapsibleContent({ ...props }: CollapsiblePrimitive.Panel.Props) {
  return (
    <CollapsiblePrimitive.Panel data-slot="collapsible-content" className=
      "overflow-hidden transition-[height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] h-[var(--collapsible-panel-height)] data-[starting-style]:h-0 data-[ending-style]:h-0" 
      {...props} />
  )
}

export { Collapsible, CollapsibleContent, CollapsibleTrigger }
