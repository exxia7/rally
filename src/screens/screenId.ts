import { createContext, useContext } from 'react';
import { useParams } from 'react-router-dom';

/**
 * Which Figma frame a screen module is showing. Several modules render more than one frame (4.1 and 4.1b, 2.3–2.4d,
 * 2.2 and 2.2-attach…) and need to know which. Under '/w/<workflow>/<page>' the frame comes from the page name, not
 * a route param, so App's <Screen> provides it here; the dev-only '/s/<frame>' routes still work through the `id`
 * param as a fallback.
 */
export const ScreenIdContext = createContext<string | undefined>(undefined);

export function useScreenId(): string | undefined {
  const fromRoute = useParams().id;
  return useContext(ScreenIdContext) ?? fromRoute;
}
