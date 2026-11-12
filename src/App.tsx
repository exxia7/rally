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
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';

import { frameOfPage, SCREENS, screenPath } from '@/screens/registry';
import { resumeTarget } from '@/state/nav';
import { sceneFor } from '@/state/scenes';
import { dispatch, store, useAppState } from '@/state/store';

// The hosted build (VITE_HOSTED=1, published as a claude.ai Artifact) can only carry a plain `#name` in its
// link, never a path, so it routes in memory and mirrors the current URL into the hash:
// `/w/ai-coach/run` ⇄ `#w_ai-coach_run`, `/settings` ⇄ `#settings`, `/` ⇄ no hash. Local dev keeps real URLs.
const HOSTED = import.meta.env.VITE_HOSTED === '1';
const pathToHash = (path: string) => path.replace(/^\/+/, '').replace(/\//g, '_');
const hashToPath = (hash: string) => `/${hash.replace(/^#/, '').replace(/_/g, '/')}`;

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
// several) plus a default component.
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
  return <Navigate to="/" replace />;
}

/** '/w/<workflow>/<page>': opens that workflow, then shows the page. Unknown workflows and pages go Home. */
function WorkflowPage() {
  const { wf = '', page = '' } = useParams();
  const app = useAppState();
  const id = frameOfPage(page);
  const exists = !!app.workflows[wf];
  const active = app.activeId === wf;
  useLayoutEffect(() => {
    if (exists && !active) dispatch({ type: 'wf/open', id: wf });
  }, [exists, active, wf]);
  if (!id || !exists) return <Navigate to="/" replace />;
  return active ? <Screen key={`${wf}:${id}`} id={id} /> : null;
}

/** '/w/<workflow>': where that workflow is now (the screen it was last on). */
function WorkflowResume() {
  const { wf = '' } = useParams();
  const app = useAppState();
  const w = app.workflows[wf];
  if (!w) return <Navigate to="/" replace />;
  return (
    <Navigate
      to={screenPath(resumeTarget(w, app.lastScreen?.[wf]), wf)}
      replace
    />
  );
}

/** Dev only, '/s/<frame>': the frame's sample state from the Figma story (not saved; the pixel tools use it). */
function SampleScreen() {
  const { id = '' } = useParams();
  const location = useLocation();
  const [seeded, setSeeded] = useState<string | null>(null);
  useLayoutEffect(() => {
    if (seeded === location.key) return;
    store.dispatch({ type: 'seed', state: sceneFor(id) });
    setSeeded(location.key);
  }, [seeded, id, location.key]);
  return seeded === location.key ? <Screen key={id} id={id} /> : null;
}

/** Dev only, '/screens': every Figma frame's sample state, for design checks. */
function ScreenIndex() {
  const chapters = [...new Set(SCREENS.map((s) => s.chapter))];
  return (
    <div className="min-h-full bg-white px-12 py-10 max-md:px-4 max-md:py-6">
      <h1 className="text-[22px] font-semibold">Pathfinder frames (dev)</h1>
      <p className="mt-1 text-[13px] text-muted">
        Each link opens a Figma frame with its sample state. Sample states aren't saved: reload any page to get
        your own data back.
      </p>
      {chapters.map((c) => (
        <section key={c} className="mt-6">
          <h2 className="text-[14px] font-semibold">{c}</h2>
          <ul className="mt-2 grid grid-cols-3 gap-x-6 gap-y-1 text-[13px] max-xl:grid-cols-2 max-md:grid-cols-1">
            {SCREENS.filter((s) => s.chapter === c).map((s) => (
              <li key={s.id}>
                <Link to={`/s/${s.id}`} className="text-accent">
                  {s.id} · {s.name}
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
        <Route path="/settings" element={<Screen id="1.2" />} />
        <Route path="/w/:wf" element={<WorkflowResume />} />
        <Route path="/w/:wf/:page" element={<WorkflowPage />} />
        {import.meta.env.DEV && (
          <>
            <Route path="/s/:id" element={<SampleScreen />} />
            <Route path="/screens" element={<ScreenIndex />} />
          </>
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
