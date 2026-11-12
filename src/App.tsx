import {
  useEffect,
  useLayoutEffect,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
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

import { Button } from '@/components/ui/Button';
import { SCREENS, screenPath } from '@/screens/registry';
import { CARRY, isCarried } from '@/state/nav';
import { sceneFor } from '@/state/scenes';
import { resetDemo, store } from '@/state/store';

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
        // Remember that this entry carries state, so a reload restores the session instead of reseeding.
        isCarried(location.state) ? CARRY : null,
        '',
        name ? `#${name}` : window.location.pathname + window.location.search
      );
    } catch {
      // Some hosts refuse history writes; the screen still works, only the shareable hash doesn't update.
    }
    window.scrollTo(0, 0);
  }, [location.pathname, location.state]);
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
    <MemoryRouter
      initialEntries={[
        {
          pathname: hashToPath(window.location.hash),
          state: isCarried(window.history.state) ? CARRY : undefined,
        },
      ]}
    >
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

// A direct load (no carried state in the history entry) seeds the store from the frame's scene, then marks the
// entry as carried so Back and reload keep what you do from here. In-app moves (useGo) arrive carried and render
// the live store. Nothing renders until the store is ready, so a screen never draws a stale state first.
function Seeded({ id }: { id: string }) {
  const location = useLocation();
  const navigate = useNavigate();
  const carried = isCarried(location.state) && store.isReady();
  const [seeded, setSeeded] = useState<string | null>(null);
  const ready = carried || seeded === location.key;
  useLayoutEffect(() => {
    if (carried || seeded === location.key) return;
    store.dispatch({ type: 'seed', state: sceneFor(id) });
    setSeeded(location.key);
  }, [carried, seeded, id, location.key]);
  // Mark the entry as carried (after the router listens: a layout effect here would run before it does).
  useEffect(() => {
    if (seeded !== location.key || isCarried(location.state)) return;
    navigate(location.pathname + location.search + location.hash, {
      replace: true,
      state: { ...(location.state as object | null), ...CARRY },
    });
  }, [seeded, location, navigate]);
  return ready ? <Screen key={id} id={id} /> : null;
}

function ScreenRoute() {
  const { id = '' } = useParams();
  return <Seeded id={id} />;
}

function ScreenIndex() {
  const navigate = useNavigate();
  const chapters = [...new Set(SCREENS.map((s) => s.chapter))];
  return (
    <div className="min-h-full bg-white px-12 py-10 max-md:px-4 max-md:py-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[22px] font-semibold">Pathfinder screens</h1>
        {/* Not in Figma: forget the session (edits, run progress) and start again from Home. */}
        <Button
          size="sm"
          onClick={() => {
            resetDemo();
            navigate('/');
          }}
        >
          Reset demo
        </Button>
      </div>
      <p className="mt-1 text-[13px] text-muted">
        Every frame from the Figma wireframes, in flow order. Start at Home to click through the whole story.
        Each link opens its frame exactly as drawn; moving on from there carries what you do.
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
        <Route path="/" element={<Seeded id="1.1" />} />
        <Route path="/s/:id" element={<ScreenRoute />} />
        <Route path="/screens" element={<ScreenIndex />} />
      </Routes>
    </Router>
  );
}
