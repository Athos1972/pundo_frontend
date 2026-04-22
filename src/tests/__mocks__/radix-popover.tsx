import React from 'react'

export const Root = ({ children, onOpenChange }: { children: React.ReactNode; onOpenChange?: (open: boolean) => void }) => (
  <div onClick={() => onOpenChange?.(true)}>{children}</div>
)
export const Trigger = ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) =>
  asChild ? <>{children}</> : <div>{children}</div>
export const Portal = ({ children }: { children: React.ReactNode }) => <>{children}</>
export const Content = ({ children }: { children: React.ReactNode }) => <div role="dialog">{children}</div>
export const Close = ({ children }: { children: React.ReactNode }) => <button>{children}</button>
export const Arrow = () => null
