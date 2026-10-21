import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
  type MouseEvent,
} from 'react'

export interface RouterContextType {
  pathname: string
  params: Record<string, string>
  state: any
  navigate: (to: string, options?: { replace?: boolean; state?: any }) => void
}

const RouterContext = createContext<RouterContextType | null>(null)

export function BrowserRouter({ children }: { children: ReactNode }) {
  const [pathname, setPathname] = useState(() => window.location.pathname || '/')
  const [navState, setNavState] = useState<any>(null)

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      setPathname(window.location.pathname || '/')
      setNavState(e.state)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigate = (to: string, options?: { replace?: boolean; state?: any }) => {
    if (options?.state !== undefined) {
      setNavState(options.state)
    }
    if (options?.replace) {
      window.history.replaceState(options?.state, '', to)
    } else {
      window.history.pushState(options?.state, '', to)
    }
    setPathname(to.split('?')[0])
  }

  return (
    <RouterContext.Provider value={{ pathname, params: {}, state: navState, navigate }}>
      {children}
    </RouterContext.Provider>
  )
}

export function useNavigate() {
  const ctx = useContext(RouterContext)
  if (!ctx) throw new Error('useNavigate debe usarse dentro de BrowserRouter')
  return ctx.navigate
}

export function useLocation() {
  const ctx = useContext(RouterContext)
  if (!ctx) throw new Error('useLocation debe usarse dentro de BrowserRouter')
  return {
    pathname: ctx.pathname,
    state: ctx.state,
    search: window.location.search,
    hash: window.location.hash,
    key: 'default',
  }
}

export function useParams<T extends Record<string, string | undefined>>(): T {
  const ctx = useContext(RouterContext)
  return (ctx?.params || {}) as T
}

export interface RouteProps {
  path: string
  element: ReactNode
}

export interface RoutesProps {
  children: ReactNode
}

function matchPath(
  pattern: string,
  pathname: string
): { matches: boolean; params: Record<string, string> } {
  if (pattern === '*') return { matches: true, params: {} }

  const patternParts = pattern.split('/').filter(Boolean)
  const pathParts = pathname.split('/').filter(Boolean)

  if (patternParts.length !== pathParts.length) {
    return { matches: false, params: {} }
  }

  const params: Record<string, string> = {}

  for (let i = 0; i < patternParts.length; i++) {
    const p = patternParts[i]
    const val = pathParts[i]
    if (p.startsWith(':')) {
      params[p.slice(1)] = val
    } else if (p !== val) {
      return { matches: false, params: {} }
    }
  }

  return { matches: true, params }
}

export function Routes({ children }: RoutesProps) {
  const ctx = useContext(RouterContext)
  if (!ctx) throw new Error('Routes debe usarse dentro de BrowserRouter')

  const childArray = Array.isArray(children) ? children : [children]

  for (const child of childArray) {
    if (!child || typeof child !== 'object' || !('props' in child)) continue
    const { path, element } = (child as any).props as RouteProps
    const { matches, params } = matchPath(path, ctx.pathname)

    if (matches) {
      return (
        <RouterContext.Provider value={{ ...ctx, params }}>
          {element}
        </RouterContext.Provider>
      )
    }
  }

  return null
}

export function Route(_props: RouteProps) {
  return null
}

export function Navigate({ to, replace, state }: { to: string; replace?: boolean; state?: any }) {
  const navigate = useNavigate()
  useEffect(() => {
    navigate(to, { replace, state })
  }, [navigate, to, replace, state])
  return null
}

export interface LinkProps {
  to: string
  children: ReactNode
  className?: string
  replace?: boolean
  state?: any
}

export function Link({ to, children, className, replace, state }: LinkProps) {
  const navigate = useNavigate()
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    navigate(to, { replace, state })
  }
  return (
    <a href={to} onClick={handleClick} className={className}>
      {children}
    </a>
  )
}
