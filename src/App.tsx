import { useEffect, type ComponentType, type ReactNode } from 'react';
import {
  BrowserRouter,
  Link,
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';

import { SCREENS, screenPath } from '@/screens/registry';

// The hosted build (VITE_HOSTED=1, published as a claude.ai Artifact) can only carry a plain `#name` in its
// link, never a path, so it routes in memory and mirrors the current screen into the hash:
// `/s/3.2-tasks` ⇄ `#s-3_2-tasks`, `/screens` ⇄ `#screens`, `/` ⇄ no hash. Local dev keeps real URLs.
const HOSTED = import.meta.env.VITE_HOSTED === '1';
const pathToHash = (path: string) =>
  path === '/screens'
    ? 'screens'
    : path.startsWith('/s/')
      ? `s-${path.slice(3).replace(/\./g, '_')}`
      : '';
const hashToPath = (hash: string) => {
  const name = hash.replace(/^#/, '');
  if (name === 'screens') return '/screens';
  if (name.startsWith('s-')) return `/s/${name.slice(2).replace(/_/g, '.')}`;
  return '/';
};

function HashSync() {
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const name = pathToHash(location.pathname);
    try {
      window.history.replaceState(
        null,
        '',
        name ? `#${name}` : window.location.pathname + window.location.search
      );
    } catch {
      // Some hosts refuse history writes; the screen still works, only the shareable hash doesn't update.
    }
    window.scrollTo(0, 0);
  }, [location.pathname]);
  useEffect(() => {
    const onHash = () => navigate(hashToPath(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [navigate]);
  return null;
}

function Router({ children }: { children: ReactNode }) {
  if (!HOSTED) return <BrowserRouter>{children}</BrowserRouter>;
  return (
    <MemoryRouter initialEntries={[hashToPath(window.location.hash)]}>
      <HashSync />
      {children}
    </MemoryRouter>
  );
}

// Each screen module lives at src/screens/<chapter>/<Name>.tsx and exports `screenId` (one frame id or
// several) plus a default component. Unbuilt ids fall back to a placeholder so every route resolves.
const modules = import.meta.glob<{
  default: ComponentType;
  screenId?: string | string[];
}>('./screens/**/*.tsx', { eager: true });
const byId = new Map<string, ComponentType>();
for (const mod of Object.values(modules)) {
  const ids =
    mod.screenId === undefined
      ? []
      : Array.isArray(mod.screenId)
        ? mod.screenId
        : [mod.screenId];
  for (const id of ids) byId.set(id, mod.default);
}

function Screen({ id }: { id: string }) {
  const Component = byId.get(id);
  if (Component) return <Component />;
  const meta = SCREENS.find((s) => s.id === id);
  return (
    <div className="flex h-dvh w-full flex-wrap items-center justify-center bg-app px-4 text-center text-[14px] text-muted">
      {meta ? `${meta.id} ${meta.name}: not built yet` : `No screen "${id}"`}
      <Link to="/screens" className="ml-2 text-accent">
        All screens
      </Link>
    </div>
  );
}

function ScreenRoute() {
  const { id = '' } = useParams();
  return <Screen key={id} id={id} />;
}

function ScreenIndex() {
  const chapters = [...new Set(SCREENS.map((s) => s.chapter))];
  return (
    <div className="min-h-full bg-white px-12 py-10 max-md:px-4 max-md:py-6">
      <h1 className="text-[22px] font-semibold">Pathfinder screens</h1>
      <p className="mt-1 text-[13px] text-muted">
        Every frame from the Figma wireframes, in flow order. Start at Home to click through the whole story.
      </p>
      {chapters.map((c) => (
        <section key={c} className="mt-6">
          <h2 className="text-[14px] font-semibold">{c}</h2>
          <ul className="mt-2 grid grid-cols-3 gap-x-6 gap-y-1 text-[13px] max-xl:grid-cols-2 max-md:grid-cols-1">
            {SCREENS.filter((s) => s.chapter === c).map((s) => (
              <li key={s.id}>
                <Link
                  to={screenPath(s.id)}
                  className={byId.has(s.id) ? 'text-accent' : 'text-muted'}
                >
                  {s.id} · {s.name}
                  {s.hidden ? ' (hidden in Figma)' : ''}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Screen id="1.1" />} />
        <Route path="/s/:id" element={<ScreenRoute />} />
        <Route path="/screens" element={<ScreenIndex />} />
      </Routes>
    </Router>
  );
}
