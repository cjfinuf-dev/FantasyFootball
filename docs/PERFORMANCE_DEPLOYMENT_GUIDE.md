# Web Performance Optimization & Deployment Best Practices Guide

> Compiled April 2026 from authoritative sources including Google Web.dev, Vite documentation, MDN, Chrome DevRel, and current industry guidance.

---

## Table of Contents

1. [Core Web Vitals & Performance Metrics](#1-core-web-vitals--performance-metrics)
2. [Vite Build Optimization](#2-vite-build-optimization)
3. [Browser Caching Strategies](#3-browser-caching-strategies)
4. [Image Optimization](#4-image-optimization)
5. [Bundle Size Optimization](#5-bundle-size-optimization)
6. [SEO for Single Page Applications](#6-seo-for-single-page-applications)
7. [Error Monitoring & Logging](#7-error-monitoring--logging)
8. [Git/Deployment Hygiene](#8-gitdeployment-hygiene)
9. [Deployment Checklist](#9-deployment-checklist)

---

## 1. Core Web Vitals & Performance Metrics

As of 2026, Google uses three Core Web Vitals as ranking signals. FID was officially replaced by INP in March 2024.

### Metric Thresholds (75th percentile of all page loads)

| Metric | What It Measures | Good | Needs Improvement | Poor |
|--------|-----------------|------|-------------------|------|
| **LCP** (Largest Contentful Paint) | Loading speed -- when the largest visible element renders | < 2.5s | 2.5s -- 4.0s | > 4.0s |
| **INP** (Interaction to Next Paint) | Responsiveness -- delay between user interaction and visual response | < 200ms | 200ms -- 500ms | > 500ms |
| **CLS** (Cumulative Layout Shift) | Visual stability -- how much elements shift during load | < 0.1 | 0.1 -- 0.25 | > 0.25 |

### Key Facts

- Google evaluates the **75th percentile** of all page loads; 75% of visits must meet "good" for the site to pass.
- As of the 2025 Web Almanac, only **48% of mobile pages** and **56% of desktop pages** pass all three Core Web Vitals.
- These metrics are measured via Chrome User Experience Report (CrUX) field data, not just lab tests.

### Optimization Targets by Metric

**LCP optimization:**
- Eliminate render-blocking resources (CSS, JS in `<head>`)
- Preload the LCP element (hero image, heading font)
- Use `fetchpriority="high"` on the LCP image
- Inline critical CSS; defer non-critical CSS
- Optimize server response time (TTFB < 800ms)

**INP optimization:**
- Break up long tasks (> 50ms) using `requestIdleCallback` or `scheduler.yield()`
- Minimize main-thread JavaScript during interactions
- Use `startTransition` in React 18+ for non-urgent state updates
- Debounce rapid-fire event handlers

**CLS optimization:**
- Always set explicit `width` and `height` on images and videos
- Reserve space for dynamic content (ads, embeds, lazy-loaded elements)
- Avoid inserting content above existing content
- Use `font-display: swap` or `optional` with size-adjust for web fonts

### Measurement Tools

- **Google PageSpeed Insights** -- lab + field data (https://pagespeed.web.dev)
- **Chrome DevTools Lighthouse** -- lab data
- **Chrome UX Report (CrUX)** -- real-user field data
- **web-vitals** npm library -- instrument in your app

**Sources:**
- [Web.dev -- Defining Core Web Vitals Thresholds](https://web.dev/articles/defining-core-web-vitals-thresholds)
- [Google Search Central -- Core Web Vitals](https://developers.google.com/search/docs/appearance/core-web-vitals)
- [DebugBear -- Core Web Vitals Metrics and Thresholds](https://www.debugbear.com/docs/core-web-vitals-metrics)
- [NitroPack -- Most Important Core Web Vitals Metrics 2026](https://nitropack.io/blog/most-important-core-web-vitals-metrics/)
- [CoreWebVitals.io -- LCP, INP & CLS Explained 2026](https://www.corewebvitals.io/core-web-vitals)

---

## 2. Vite Build Optimization

### Production Build Defaults

Vite uses **Rollup** for production builds with automatic tree shaking, code splitting at dynamic import boundaries, and minification via esbuild (or Terser if configured).

### Key `vite.config.ts` Build Options

| Option | Default | Purpose |
|--------|---------|---------|
| `build.target` | `'modules'` | Browser compatibility target for output |
| `build.minify` | `'esbuild'` | Minification engine (`'esbuild'` or `'terser'`) |
| `build.cssCodeSplit` | `true` | Split CSS into per-chunk files |
| `build.sourcemap` | `false` | Generate source maps (use `'hidden'` for production + Sentry) |
| `build.chunkSizeWarningLimit` | `500` (kB) | Warning threshold for chunk size |
| `build.rollupOptions` | `{}` | Pass-through to Rollup (manualChunks, plugins, etc.) |

### Code Splitting Strategies

1. **Route-based splitting** -- Use `React.lazy()` with dynamic imports for each route/page component. This is the highest-impact, lowest-effort optimization.
2. **Component-based splitting** -- Dynamically import heavy components (charts, editors, modals) that are not needed on initial load.
3. **Manual chunks** -- Use `build.rollupOptions.output.manualChunks` to group vendor libraries into stable, cacheable chunks:
   - Separate React core (`react`, `react-dom`, `react-router-dom`) into a `vendor-react` chunk
   - Separate large utility libraries (date-fns, lodash-es) into a `vendor-utils` chunk
   - Separate charting/visualization libraries into a `vendor-charts` chunk

### Tree Shaking Best Practices

- **Use ES module imports**: `import { debounce } from 'lodash-es'` (NOT `import _ from 'lodash'`)
- **Prefer ESM-native libraries**: lodash-es over lodash, date-fns over moment.js
- **Mark packages as side-effect-free** in `package.json` with `"sideEffects": false`
- **Avoid barrel files** that re-export everything -- they prevent effective tree shaking
- **Named imports only**: `import { Button } from '@mui/material'` (NOT `import * as MUI`)

### CSS Optimization

- Vite auto-splits CSS per async chunk when `cssCodeSplit: true` (default)
- Use CSS modules or Tailwind to minimize unused CSS
- Consider `postcss-purgecss` for aggressive unused CSS removal

### Environment Modes

Vite loads `.env` files in this priority order (highest wins):
1. `.env.[mode].local` -- mode-specific, local overrides (git-ignored)
2. `.env.[mode]` -- mode-specific
3. `.env.local` -- all modes, local overrides (git-ignored)
4. `.env` -- all modes

**Critical security rule:** Only variables prefixed with `VITE_` are exposed to client-side code. Never put secrets (API keys, database credentials) in `VITE_*` variables.

**Sources:**
- [Vite -- Build Options](https://vite.dev/config/build-options)
- [Vite -- Env Variables and Modes](https://vite.dev/guide/env-and-mode)
- [Vite -- Building for Production](https://vite.dev/guide/build)
- [CodeParrot -- Advanced Guide to Vite with React 2025](https://codeparrot.ai/blogs/advanced-guide-to-using-vite-with-react-in-2025)
- [Markaicode -- Vite 6.0 Build Optimization](https://markaicode.com/vite-6-build-optimization-guide/)
- [NDLab -- Build Optimization with Vite](https://ndlab.blog/posts/part7-5-vite-build-optimization)
- [Medium/@sandhyadornal11 -- React Bundle from 11MB to 1MB Using Vite](https://medium.com/@sandhyadornal11/cut-the-fat-how-i-reduced-my-react-bundle-from-11-mb-to-1-mb-using-vite-4de5aa9990ca)

---

## 3. Browser Caching Strategies

### Cache-Control Header Patterns

| Asset Type | Recommended Header | Rationale |
|-----------|-------------------|-----------|
| **HTML files** | `Cache-Control: no-cache` | Always revalidate; ensures users get latest app version |
| **Fingerprinted JS/CSS** (e.g., `app.9f2d1a.js`) | `Cache-Control: public, max-age=31536000, immutable` | Hash in filename = new URL on change; cache forever |
| **Non-fingerprinted static assets** | `Cache-Control: public, max-age=3600, must-revalidate` | Short cache with revalidation |
| **API responses** | `Cache-Control: no-store` or short `max-age` | Dynamic data should not be stale |
| **Fonts** | `Cache-Control: public, max-age=31536000, immutable` | Fonts rarely change; fingerprint or version them |

### Asset Fingerprinting

Vite automatically adds content hashes to JS and CSS filenames in production builds (e.g., `index-3a4b5c.js`). This enables aggressive long-term caching because any code change produces a new filename.

**Key rule:** Never cache `index.html` aggressively -- it is the entry point that references all fingerprinted assets. Use `no-cache` so browsers always check for updates.

### Service Worker Caching Strategies (Workbox)

| Strategy | Pattern | Best For |
|----------|---------|----------|
| **Cache First** | Check cache, fall back to network | Fingerprinted/immutable assets (JS, CSS, images, fonts) |
| **Network First** | Check network, fall back to cache | HTML pages, API data that should be fresh |
| **Stale While Revalidate** | Serve from cache immediately, update cache from network in background | Semi-dynamic content (user avatars, non-critical API data) |
| **Network Only** | Always go to network | Auth endpoints, real-time data |
| **Cache Only** | Only serve from cache | Pre-cached shell assets in offline-first apps |

### Practical Tips

- Use `vite-plugin-pwa` (Workbox-based) for service worker generation in Vite projects
- Precache the app shell (HTML, critical CSS/JS) for offline capability
- Runtime-cache API calls with Stale While Revalidate or Network First
- Set `navigationPreload: true` for faster network-first HTML serving

**Sources:**
- [MDN -- Cache-Control Header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control)
- [Chrome DevRel -- Workbox Caching Strategies](https://developer.chrome.com/docs/workbox/caching-strategies-overview)
- [ImageKit -- Guide to HTTP Caching for Static Assets](https://imagekit.io/blog/ultimate-guide-to-http-caching-for-static-assets/)
- [RapidLoad -- Browser Caching HTTP Headers Guide](https://rapidload.ai/browser-caching-http-headers-guide/)

---

## 4. Image Optimization

### Format Selection (2026 Recommendation)

| Format | Compression vs JPEG | Browser Support | Best For |
|--------|-------------------|----------------|----------|
| **AVIF** | 50-70% smaller | 93%+ (all modern browsers) | Maximum compression; hero images, photos |
| **WebP** | 25-35% smaller | 97%+ | Broad compatibility; general use |
| **JPEG** | Baseline | Universal | Legacy fallback |
| **PNG** | Larger (lossless) | Universal | Transparency, icons, screenshots |
| **SVG** | N/A (vector) | Universal | Icons, logos, illustrations |

### Implementation Pattern -- Progressive Enhancement

```html
<picture>
  <source srcset="image.avif" type="image/avif">
  <source srcset="image.webp" type="image/webp">
  <img src="image.jpg" alt="Description" width="800" height="600" loading="lazy">
</picture>
```

### Responsive Images with `srcset`

Serve different sizes based on viewport:
```html
<img
  srcset="image-400.webp 400w, image-800.webp 800w, image-1200.webp 1200w"
  sizes="(max-width: 600px) 400px, (max-width: 1000px) 800px, 1200px"
  src="image-800.webp"
  alt="Description"
  width="800" height="600"
>
```

### Lazy Loading Rules

- **DO** use `loading="lazy"` on all below-the-fold images (native, no JS needed)
- **DO NOT** lazy-load the LCP/hero image -- this directly harms your LCP score
- **DO** add `fetchpriority="high"` to the LCP image
- **DO** add `decoding="async"` to non-critical images

### Size & Quality Guidelines

- Hero images: 100-200 KB max (WebP/AVIF)
- Thumbnails: 10-30 KB
- Quality setting: 75-85% for WebP, 60-70% for AVIF (visually equivalent)
- Always set explicit `width` and `height` attributes to prevent CLS

### Build-Time Optimization for Vite

- Use `vite-plugin-image-optimizer` or `vite-imagetools` for automatic format conversion and resizing at build time
- Consider a CDN with on-the-fly image transformation (Cloudflare Images, Imgix, Cloudinary)

**Sources:**
- [MohtaWeb -- Optimize Web Images: WebP & AVIF (2026)](https://www.mohtaweb.com/2026/03/optimize-web-images-webp-avif.html)
- [FrontendTools -- Image Optimization 2025](https://www.frontendtools.tech/blog/modern-image-optimization-techniques-2025)
- [Request Metrics -- How to Optimize Website Images 2026](https://requestmetrics.com/web-performance/high-performance-images/)
- [NitroPack -- Image Optimization for the Web 2026](https://nitropack.io/blog/image-optimization-for-the-web-the-essential-guide/)
- [The CSS Agency -- Best Web Image Format 2026](https://www.thecssagency.com/blog/best-web-image-format)

---

## 5. Bundle Size Optimization

### Analysis Tools

| Tool | How to Use | What It Shows |
|------|-----------|---------------|
| **rollup-plugin-visualizer** | Add to `vite.config.ts` plugins; run `vite build` | Interactive treemap of every module in the bundle |
| **vite-bundle-analyzer** | `npx vite-bundle-analyzer` | Alternative visualizer with Vite-native integration |
| **source-map-explorer** | Point at built `.js` files | Module-level breakdown from source maps |
| **bundlephobia.com** | Search any npm package | Shows install size, download size, and tree-shake support |

### Reduction Techniques (Ordered by Impact)

1. **Route-based code splitting** -- `React.lazy()` + `Suspense` for every route. This alone can reduce initial bundle by 40-60%.
2. **Replace heavy libraries** with lighter alternatives:
   - `moment.js` (330 KB) -> `date-fns` (tree-shakeable, ~5-10 KB per function) or `dayjs` (2 KB)
   - `lodash` (70 KB) -> `lodash-es` (tree-shakeable) or native JS methods
   - `chart.js` -> only import required chart types
   - `@mui/icons-material` -> import individual icons, not the barrel
3. **Dynamic imports for heavy components** -- modals, rich text editors, PDF viewers, charts
4. **Manual chunks in Vite config** -- separate vendor code for stable caching:
   ```js
   build: {
     rollupOptions: {
       output: {
         manualChunks: {
           'vendor-react': ['react', 'react-dom', 'react-router-dom'],
           'vendor-ui': ['@mui/material', '@emotion/react', '@emotion/styled'],
         }
       }
     }
   }
   ```
5. **Remove dead code and unused dependencies** -- audit with `depcheck` or `knip`
6. **Externalize large dependencies** served via CDN if appropriate

### Target Bundle Sizes (Rules of Thumb)

| Chunk | Target | Warning |
|-------|--------|---------|
| Initial JS (all chunks loaded on first page) | < 200 KB gzipped | > 300 KB gzipped |
| Any single chunk | < 250 KB raw | > 500 KB raw (Vite default warning) |
| Total JS (all routes) | < 1 MB gzipped | > 2 MB gzipped |
| CSS | < 50 KB gzipped | > 100 KB gzipped |

**Sources:**
- [Medium/@shaxadd -- Optimizing React Vite Application Bundle Size](https://shaxadd.medium.com/optimizing-your-react-vite-application-a-guide-to-reducing-bundle-size-6b7e93891c96)
- [DEV Community -- Reduce JavaScript Bundle Size 2025](https://dev.to/frontendtoolstech/how-to-reduce-javascript-bundle-size-in-2025-2n77)
- [GitHub -- rollup-plugin-visualizer](https://github.com/btd/rollup-plugin-visualizer)
- [Soledad Penades -- Manual Chunks with Vite for Dependency Caching](https://soledadpenades.com/posts/2025/use-manual-chunks-with-vite-to-facilitate-dependency-caching/)
- [rayhannr.dev -- Analyze and Optimize Vite Bundle Size](https://rayhannr.dev/blog/vite-bundle-visualizer)
- [Mykola Aleksandrov -- Taming Large Chunks in Vite + React](https://www.mykolaaleksandrov.dev/posts/2025/11/taming-large-chunks-vite-react/)

---

## 6. SEO for Single Page Applications

### Critical SPA SEO Requirements

1. **Dynamic `<title>` and `<meta>` tags per route** -- Use `react-helmet-async` or similar to update head tags on every navigation. Without this, every "page" shares the same title in search results.
2. **Clean URLs via HTML5 History API** -- No hash-based routing (`/#/about`). Use `react-router-dom` with `BrowserRouter`.
3. **Server-Side Rendering (SSR) or Pre-rendering** -- Google can render JS, but SSR/pre-rendering is more reliable and faster for indexing. Consider:
   - **SSR**: Next.js, Remix, or Vite SSR mode
   - **Pre-rendering**: `vite-plugin-ssr`, `prerender-spa-plugin`, or static site generation
4. **Proper `<link rel="canonical">` tags** on every page
5. **XML Sitemap** listing all routes
6. **robots.txt** allowing crawler access

### Meta Tag Checklist (Per Page)

| Tag | Guidelines |
|-----|-----------|
| `<title>` | Under 60 characters; include primary keyword; unique per page |
| `<meta name="description">` | 150-160 characters (120 for mobile); include target keywords (bolded in SERPs) |
| `<meta name="viewport">` | `width=device-width, initial-scale=1` (required for mobile) |
| `<link rel="canonical">` | Absolute URL of the canonical version of this page |
| Open Graph (`og:title`, `og:description`, `og:image`) | For social sharing previews |
| Twitter Card (`twitter:card`, `twitter:title`, `twitter:image`) | For Twitter/X previews |

### Structured Data (JSON-LD)

Add schema.org structured data to pages using JSON-LD `<script>` tags. Key types:
- **Organization** -- company info, logo, social profiles
- **WebSite** -- site name, search action
- **BreadcrumbList** -- navigation breadcrumbs
- **Article/BlogPosting** -- for content pages
- **Product** -- for e-commerce
- **FAQ** -- for FAQ pages (can produce rich results)

Validate with [Google Rich Results Test](https://search.google.com/test/rich-results).

### Semantic HTML

Use proper semantic elements within React components:
- `<header>`, `<nav>`, `<main>`, `<article>`, `<section>`, `<aside>`, `<footer>`
- Proper heading hierarchy: one `<h1>` per page, then `<h2>`, `<h3>` etc.
- `<button>` for actions, `<a>` for navigation (not `<div onClick>`)

### 2026 AI Search Consideration

AI-powered search tools (Google AI Overviews, ChatGPT search, Perplexity) use meta tags and structured data to summarize and attribute content. Optimized metadata increases the chance of being cited in AI-generated answers.

**Sources:**
- [WeWeb -- SEO Single Page Application: 2026 Ultimate Guide](https://www.weweb.io/blog/seo-single-page-application-ultimate-guide)
- [ClickRank -- HTML Tags for SEO: 2026 Technical Guide](https://www.clickrank.ai/html-tags-for-seo/)
- [Svitla -- SEO & AI Search Best Practices 2026](https://svitla.com/blog/seo-best-practices/)
- [Mewa Studio -- SEO & Core Web Vitals 2026](https://www.mewastudio.com/en/blog/seo-core-web-vitals-2026)
- [QodeQuay -- React SEO Tips 2025](https://www.qodequay.com/react-seo-guide-boost-google-rankings)
- [CopeBusiness -- SEO Strategies for SPAs](https://www.copebusiness.com/technical-seo/spa-seo-strategies/)

---

## 7. Error Monitoring & Logging

### Recommended Stack: Sentry (Industry Standard for Frontend)

**Setup priorities:**
1. Install `@sentry/react` and initialize **before** any other imports in your entry file
2. Store the DSN in environment variables (not hardcoded)
3. Upload source maps to Sentry during CI/CD build (use `@sentry/vite-plugin`)
4. Use `build.sourcemap: 'hidden'` in Vite config (generates maps for upload but does not expose them in production)

### Error Boundary Strategy

| Level | Purpose |
|-------|---------|
| **Root-level boundary** | Catch unhandled errors; show fallback UI; report to Sentry |
| **Feature-level boundaries** | Isolate failures to specific sections (e.g., a chart crash does not take down the whole page) |
| **Route-level boundaries** | Catch errors within individual routes |

React 19 provides `onCaughtError` and `onUncaughtError` hooks at the root level for centralized error processing.

### Context & Debugging Best Practices

- **User context**: `Sentry.setUser({ id, email })` -- associate errors with users
- **Tags**: `Sentry.setTag('feature', 'checkout')` -- filter errors by feature area
- **Breadcrumbs**: Automatic trail of events leading up to an error (clicks, navigations, API calls)
- **Session Replay**: Record browser sessions for video-like reproduction of errors
- **Performance tracing**: Distributed tracing from frontend to backend

### What NOT to Log

- Filter out routine HTTP status codes (400, 401, 404) in high-traffic apps -- they create noise
- Never log passwords, PII, or tokens to error tracking services
- Configure `beforeSend` to scrub sensitive data

### Source Map Upload in CI/CD

- Use `@sentry/vite-plugin` in your Vite config to auto-upload source maps during build
- Associate releases with Git commits for "Suspect Commits" feature
- Delete source maps from the deploy artifact after upload to Sentry

### Alternatives to Sentry

- **LogRocket** -- session replay + error tracking
- **Datadog RUM** -- real user monitoring with APM integration
- **Bugsnag** -- error monitoring with release tracking
- **Self-hosted**: GlitchTip (open-source Sentry-compatible)

**Sources:**
- [Sentry -- Error and Performance Monitoring for React](https://sentry.io/for/react/)
- [Sentry Docs -- React Guide](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Sentry Blog -- Guide to Error & Exception Handling in React](https://blog.sentry.io/guide-to-error-and-exception-handling-in-react/)
- [Medium/@lynn-kwong -- Sentry for Real-Time Error Tracking in React (2025)](https://lynn-kwong.medium.com/using-sentry-for-real-time-error-tracking-and-performance-monitoring-in-react-b1b960380c63)
- [InfoWorld -- Error Tracking with JavaScript, React, and Sentry](https://www.infoworld.com/article/2336557/error-tracking-with-javascript-react-and-sentry.html)
- [Bring Developer -- Sentry Usage in React Application](https://developer.bring.com/blog/sentry-usage-in-react-application/)

---

## 8. Git/Deployment Hygiene

### `.gitignore` Essentials for Vite/React Projects

```
# Dependencies
node_modules/

# Build output
dist/
build/

# Environment files with secrets
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Debug logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Source maps (if not needed in repo)
*.map

# Test coverage
coverage/

# Bundle analysis output
stats.html
```

### Environment Variable Management

| File | Committed to Git? | Purpose |
|------|-------------------|---------|
| `.env` | Yes (if no secrets) | Shared defaults for all environments |
| `.env.local` | **No** | Local developer overrides |
| `.env.development` | Yes (if no secrets) | Dev-specific public config |
| `.env.production` | Yes (if no secrets) | Production public config |
| `.env.production.local` | **No** | Production secrets (local only) |
| `.env.example` | **Yes** | Template with variable names and placeholder values |

**Rules:**
- Prefix client-exposed variables with `VITE_` in Vite projects
- NEVER put API keys, database URLs, or auth secrets in `VITE_*` variables (they are embedded in the client bundle)
- Use a secrets manager (GitHub Secrets, Vault, AWS SSM, Doppler) for production secrets
- Always commit a `.env.example` file so new developers know which variables to configure
- Add `*.local` to `.gitignore`

### CI/CD Basics

**Build pipeline essentials:**
1. **Install dependencies**: `npm ci` (not `npm install` -- deterministic, uses lockfile)
2. **Lint**: `eslint .` -- catch issues before build
3. **Type check**: `tsc --noEmit` -- catch type errors
4. **Test**: `npm test` -- run test suite
5. **Build**: `vite build` -- production build
6. **Upload source maps** to Sentry (then delete from dist)
7. **Deploy** built artifacts to hosting provider

**Secret injection in CI:**
- GitHub Actions: Settings > Secrets and Variables > Actions
- Reference with `${{ secrets.MY_SECRET }}` in workflow files
- Never echo/print secrets in CI logs

### Incident Response for Leaked Secrets

If a secret is accidentally committed:
1. **Immediately rotate/revoke** the exposed credential
2. Assume it has been compromised (bots scan GitHub in real time)
3. Use `git filter-repo` or BFG Repo-Cleaner to scrub the secret from history
4. Force-push the cleaned history
5. Notify the team

**Sources:**
- [GitGuardian -- Secure Your Secrets with .env](https://blog.gitguardian.com/secure-your-secrets-with-env/)
- [GitIgnore.pro -- .gitignore Best Practices 2025](https://gitignore.pro/guides/gitignore-best-practices)
- [Vite Docs -- Env Variables and Modes](https://vite.dev/guide/env-and-mode)
- [DEV Community -- .Env, .gitignore, and Protecting API Keys](https://dev.to/eprenzlin/env-gitignore-and-protecting-api-keys-2b9l)
- [GitHub Community -- Securing Sensitive Environment Variables](https://github.com/orgs/community/discussions/183126)
- [Mykola Aleksandrov -- Vite Docker React Environment Variables](https://www.mykolaaleksandrov.dev/posts/2025/10/vite-docker-react-environment-variables/)

---

## 9. Deployment Checklist

Use this checklist during code review or before deploying to production.

### Performance

- [ ] LCP target < 2.5s verified in Lighthouse
- [ ] INP target < 200ms verified
- [ ] CLS target < 0.1 verified
- [ ] Hero/LCP image is NOT lazy-loaded; has `fetchpriority="high"`
- [ ] All below-the-fold images use `loading="lazy"`
- [ ] All images have explicit `width` and `height` attributes
- [ ] Images served in WebP/AVIF with fallbacks
- [ ] No render-blocking resources in `<head>`
- [ ] Critical CSS inlined or preloaded

### Build & Bundle

- [ ] `vite build` completes without errors or warnings
- [ ] No chunks exceed 500 KB (raw) -- investigate with rollup-plugin-visualizer
- [ ] Initial JS bundle < 200 KB gzipped
- [ ] Route-based code splitting implemented (React.lazy + Suspense)
- [ ] ES module imports used for tree-shakeable libraries
- [ ] No barrel file imports pulling in unused code
- [ ] Source maps generated but not deployed publicly (use `sourcemap: 'hidden'`)
- [ ] Bundle visualizer reviewed for unexpected large dependencies

### Caching

- [ ] HTML served with `Cache-Control: no-cache`
- [ ] Fingerprinted assets (JS, CSS) served with `Cache-Control: public, max-age=31536000, immutable`
- [ ] Fonts and stable images served with long-term cache headers
- [ ] Service worker configured (if applicable) with appropriate strategies

### SEO

- [ ] Unique `<title>` (< 60 chars) and `<meta description>` (< 160 chars) per route
- [ ] `<link rel="canonical">` present on all pages
- [ ] Open Graph and Twitter Card meta tags present
- [ ] Semantic HTML used (header, nav, main, article, footer)
- [ ] Proper heading hierarchy (one h1 per page)
- [ ] Structured data (JSON-LD) validates in Google Rich Results Test
- [ ] XML sitemap generated and submitted
- [ ] `robots.txt` configured correctly

### Error Monitoring

- [ ] Sentry (or equivalent) initialized with correct DSN
- [ ] Error boundaries at root and feature levels
- [ ] Source maps uploaded to Sentry during build
- [ ] User context attached to error reports
- [ ] PII scrubbing configured in `beforeSend`
- [ ] Alerts configured for error rate spikes

### Environment & Security

- [ ] `.env` files with secrets are in `.gitignore`
- [ ] `.env.example` committed with placeholder values
- [ ] No `VITE_*` variables contain actual secrets
- [ ] Production secrets injected via CI/CD secrets manager
- [ ] `npm ci` used in CI (not `npm install`)
- [ ] `node_modules/` and `dist/` are in `.gitignore`
- [ ] No hardcoded API keys, tokens, or passwords in source code
- [ ] Dependencies audited (`npm audit`)

### Pre-Deploy Verification

- [ ] Linting passes (`eslint .`)
- [ ] Type checking passes (`tsc --noEmit`)
- [ ] Tests pass
- [ ] Build succeeds
- [ ] Preview build locally (`vite preview`) to verify production behavior
- [ ] HTTPS configured on hosting
- [ ] Compression enabled (gzip/brotli) on server/CDN

---

*This guide reflects best practices as of April 2026. Web standards and tool recommendations evolve; re-validate annually.*
