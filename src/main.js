import '@fontsource-variable/inter/wght.css';
import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/layout.css';
import '../styles/components.css';
import { initTheme } from './ui/theme.js';
import { start } from './app.js';

initTheme();
start();
// Precarga en segundo plano la vista más usada para que el primer clic sea instantáneo.
requestIdleCallback?.(() => import('./views/pipeline.js'));
