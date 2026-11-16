import { renderToString } from 'react-dom/server';
import App from './App';
import type { PageData } from './types';

// Used only by build.mjs at build time: the full page markup for one language.
export function render(d: PageData): string {
  return renderToString(<App d={d} />);
}
