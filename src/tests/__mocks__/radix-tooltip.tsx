import React from 'react'

export const Provider = ({ children }: { children: React.ReactNode }) => <>{children}</>
export const Root = ({ children }: { children: React.ReactNode }) => <>{children}</>
export const Trigger = ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) =>
  asChild ? <>{children}</> : <div>{children}</div>
export const Portal = ({ children }: { children: React.ReactNode }) => <>{children}</>
export const Content = ({ children }: { children: React.ReactNode }) => <div role="tooltip">{children}</div>
export const Arrow = () => null
