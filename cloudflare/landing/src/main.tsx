import { hydrateRoot } from 'react-dom/client';
import App from './App';
import type { PageData } from './types';
import 'lenis/dist/lenis.css';
import './styles.css';

// The page is already rendered (build.mjs, same components); this makes it move.
const data = JSON.parse(document.getElementById('page-data')!.textContent || '{}') as PageData;
document.documentElement.classList.add('js');
hydrateRoot(document.getElementById('root')!, <App d={data} />);
