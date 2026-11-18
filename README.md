# React + TypeScript + Vite

## Deploying to Render

This project includes a Render Blueprint in `render.yaml`. In Render, choose
**New > Blueprint**, connect this repository, and confirm the `taskflow-react`
web service. Render will install dependencies, build the Vite app, and start
the production server.

The production server serves the built app and proxies `/api` requests to the
TaskFlow backend on the same origin. It preserves browser cookies and the
original `Origin` header; it does not add authentication tokens or bypass
backend origin checks. The Vite proxy in `vite.config.ts` is development-only.

Before using authentication on Render, ask the TaskFlow backend administrator
to trust the exact Render site origin (or your configured custom domain). The
backend's allowed-origin setting is managed by the backend and is not exposed
as a client-side Vite variable. The Render deployment cannot make session
authentication work until that origin is trusted.

To run the production server locally after building:

```sh
npm run build
npm run start
```

The server listens on `PORT` (default `10000`) and exposes `/healthz` for
Render's health check.

Do not put passwords, database credentials, or personal access tokens in
`render.yaml` or `VITE_` environment variables.

---

The sections below describe the original Vite starter template.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
