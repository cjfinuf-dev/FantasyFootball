# Front-End Web Development Best Practices Guide

**Compiled: April 2026 | For Code Review Reference**

---

## Table of Contents

1. [HTML Semantics & Structure (MDN)](#1-html-semantics--structure)
2. [CSS & JavaScript Accessibility (MDN)](#2-css--javascript-accessibility)
3. [Core Web Vitals & Performance (web.dev)](#3-core-web-vitals--performance)
4. [Modern CSS (web.dev + industry)](#4-modern-css-best-practices)
5. [WCAG 2.2 Accessibility (W3C WAI)](#5-wcag-22-accessibility-requirements)
6. [React Best Practices (react.dev)](#6-react-best-practices)

---

## 1. HTML Semantics & Structure

**Source:** [MDN - HTML: A good basis for accessibility](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Accessibility/HTML)

### Rules

- **Use the right element for the right job.** Native HTML elements provide built-in keyboard accessibility, roles, and states that `<div>` and `<span>` do not.
- **Use semantic sectioning elements:** `<header>`, `<nav>`, `<main>`, `<article>`, `<aside>`, `<footer>` -- screen readers use these as navigation landmarks.
- **Use heading hierarchy correctly.** `<h1>` through `<h6>` in logical order; never skip levels for styling purposes.
- **Use `<button>` for actions, `<a>` for navigation.** Never use `<div onclick>` or `<a href="#" onclick>` as button substitutes.
- **Every `<img>` must have an `alt` attribute.** Descriptive for informational images; `alt=""` for purely decorative images. Omitting `alt` causes screen readers to read the filename.
- **Every form input must have an associated `<label>`.** Use `<label for="id">` paired with `<input id="id">`. Placeholder text is not a label substitute.
- **Table headers use `<th scope="col|row">`.** Include `<caption>` for table descriptions. Never use `<td>` for all cells.
- **Link text must be meaningful out of context.** "Find out more about whales" -- not "click here."
- **Warn users about non-standard link behavior** (opens in new window, downloads a file, links to non-HTML content).
- **Include a skip-to-content link** near the opening `<body>` to bypass repetitive navigation.
- **Source order must match logical reading order.** Screen readers and keyboard users follow source order, not visual order.

### Anti-Patterns

- Using `<div>` or `<span>` styled to look like headings, buttons, or links
- Styling text with `<br>` tags instead of proper block elements
- Using positive `tabindex` values (disrupts natural tab order)
- Omitting `alt` attributes on images
- Using ARIA roles when a native HTML element exists (`<div role="button">` instead of `<button>`)
- Generic link text: "click here," "read more," "learn more"

---

## 2. CSS & JavaScript Accessibility

**Source:** [MDN - CSS and JavaScript accessibility best practices](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Accessibility/CSS_and_JavaScript)

### CSS Rules

- **Never remove `:focus` outlines or the pointer cursor.** These are essential for keyboard and assistive technology users.
- **Always style `:hover`, `:focus`, and `:active` states** with visible changes.
- **Color contrast:** Text must have at least 4.5:1 contrast ratio against its background (WCAG AA). Large text (18pt+ or 14pt+ bold): 3:1 minimum.
- **Never rely on color alone** to convey information. Use additional indicators (icons, text, patterns).
- **Links must be visually distinguishable** from surrounding text by more than just color (underline recommended). Link-to-surrounding-text contrast: 3:1 minimum.
- **Use relative units** (`rem`, `em`, `%`) for font sizes, not `px`, so text scales with user preferences.
- **Line height:** At least 1.5 for body text.
- **Design flexibly** so users can override styles, increase font sizes, or use custom CSS without breaking layout.

### Hiding Content

- `display: none` and `visibility: hidden` hide content from **both** visual users and screen readers.
- To visually hide content but keep it accessible to screen readers, use:
  ```css
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  ```

### JavaScript Rules

- **Pair mouse events with keyboard equivalents.** `mouseover`/`mouseout` must have corresponding `focus`/`blur` handlers.
- **The `click` event fires on both mouse click and Enter/Return key** -- it is device-independent.
- **Use `role="alert"` and `aria-relevant="all"`** on containers for dynamic content that updates without a page reload.
- **Form validation:** Validate on submit, not on every keystroke. Provide clickable links to problematic fields in the error summary.
- **Progressive enhancement:** Core functionality should work without JavaScript. Use JS to enhance, not to build fundamental page structure.

### Anti-Patterns

- Removing default `:focus` styles without providing alternatives
- Mouse-only event handlers without keyboard equivalents
- Generating all HTML/CSS with JavaScript
- Using `display: none` to "hide" error messages (use positioning instead)
- Over-relying on JavaScript for core content delivery

---

## 3. Core Web Vitals & Performance

**Sources:**
- [web.dev - The most effective ways to improve Core Web Vitals](https://web.dev/articles/top-cwv)
- [web.dev - Web Vitals](https://web.dev/articles/vitals)
- [web.dev - CSS for Web Vitals](https://web.dev/articles/css-web-vitals)

### Thresholds (must meet all three)

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| **LCP** (Largest Contentful Paint) | <= 2.5s | <= 4.0s | > 4.0s |
| **INP** (Interaction to Next Paint) | <= 200ms | <= 500ms | > 500ms |
| **CLS** (Cumulative Layout Shift) | <= 0.1 | <= 0.25 | > 0.25 |

### LCP Optimization (Loading Performance)

- **Ensure the LCP resource is discoverable in the HTML source.** Do not rely on JavaScript or CSS to load the hero image.
- **Do not use `data-src` or JS-based lazy loading for above-the-fold images.** Use native `loading="lazy"` only on below-the-fold images.
- **Prefer server-side rendering (SSR) over client-side rendering (CSR)** so LCP content is present in the initial HTML.
- **Use `<link rel="preload">` for critical LCP resources** (hero images, web fonts).
- **Optimize images:** Use modern formats (WebP, AVIF), appropriate sizing, and `srcset`/`sizes` attributes.
- **Reduce server response time (TTFB):** Use CDNs, caching, and efficient server-side code.
- **Eliminate render-blocking resources:** Defer non-critical CSS and JavaScript.

### INP Optimization (Interactivity)

- **Break up long tasks** (>50ms) into smaller chunks using `requestIdleCallback`, `setTimeout`, or `scheduler.yield()`.
- **Use code splitting and lazy loading** for non-critical JavaScript.
- **Remove unused event listeners.**
- **Prevent unnecessary re-renders** in frameworks (React, Vue).
- **Minimize main-thread JavaScript work** -- offload to Web Workers when possible.
- **Avoid layout thrashing** -- batch DOM reads and writes.

### CLS Optimization (Visual Stability)

- **Always set explicit `width` and `height` (or `aspect-ratio`) on images and videos.**
- **Reserve space for ads, embeds, and iframes** with fixed dimensions.
- **Load web fonts efficiently:** Use `font-display: swap` or `font-display: optional`; preload critical fonts.
- **Never inject content above existing visible content** after initial load.
- **Avoid CSS animations that trigger layout.** Use `transform`, `opacity`, and `filter` instead of `top`, `left`, `width`, `height`.
- **Use the `content-visibility` CSS property** for off-screen content to improve rendering performance.

### Anti-Patterns

- Client-side rendering of above-the-fold content
- JavaScript-dependent image loading (e.g., `data-src` patterns)
- Unoptimized images (no `srcset`, wrong format, oversized)
- Layout-triggering CSS animations (`top`, `left`, `margin`)
- Injecting DOM elements above the fold after page load
- Large, unminified JavaScript bundles blocking the main thread

---

## 4. Modern CSS Best Practices

**Sources:**
- [web.dev - Learn CSS: Layout](https://web.dev/learn/css/layout/)
- [web.dev - Learn CSS: Flexbox](https://web.dev/learn/css/flexbox/)
- [web.dev - Learn CSS: Grid](https://web.dev/learn/css/grid)

### CSS Custom Properties (Variables)

- **Define design tokens as custom properties** on `:root` for colors, spacing, typography, and shadows.
  ```css
  :root {
    --color-primary: #1a73e8;
    --spacing-md: 1rem;
    --font-body: 'Inter', system-ui, sans-serif;
    --radius-md: 0.5rem;
  }
  ```
- **Scope overrides to components** by redefining variables on specific selectors.
- **Use custom properties for theming** (dark mode, brand variants) by swapping variable values.
- **Prefer custom properties over preprocessor variables** for runtime flexibility.

### Layout: Flexbox vs. Grid

- **Use Flexbox for one-dimensional layouts** -- a single row or column of items where items may have varying sizes.
- **Use Grid for two-dimensional layouts** -- rows AND columns simultaneously.
- **Grid for page-level (macro) layouts;** Flexbox for component-level (micro) layouts -- but either can work at either scale.
- **Use `gap` (not margins) for spacing** between flex/grid items.
- **Use `minmax()` and `auto-fit`/`auto-fill`** in Grid for intrinsic responsive layouts without media queries.
  ```css
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1rem;
  }
  ```

### Container Queries

- **Use container queries for truly modular, reusable components** that adapt to their container's size, not the viewport.
  ```css
  .card-container {
    container-type: inline-size;
  }
  @container (min-width: 400px) {
    .card { flex-direction: row; }
  }
  ```
- **Prefer container queries over media queries** when building design-system components.

### Cascade Layers (`@layer`)

- **Use `@layer` to control specificity order** in large codebases and design systems.
  ```css
  @layer reset, base, components, utilities;
  ```
- **Place third-party/reset styles in low-priority layers** so your component styles always win without `!important`.

### The `:has()` Selector

- **Use `:has()` for parent-aware styling** -- style a parent based on its children's state.
  ```css
  .form-group:has(:invalid) { border-color: red; }
  .grid:has(> :nth-child(5)) { grid-template-columns: repeat(3, 1fr); }
  ```

### CSS Nesting

- **Use native CSS nesting** (now baseline in all major browsers) to group related styles.
  ```css
  .card {
    padding: 1rem;
    & .title { font-size: 1.25rem; }
    &:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
  }
  ```

### Anti-Patterns

- Using `!important` to override specificity (use layers or more specific selectors)
- Using `float` for layout (use Flexbox or Grid)
- Hardcoded pixel values for responsive layouts (use relative units, `clamp()`, `minmax()`)
- Overly complex media query breakpoints (prefer intrinsic sizing with `auto-fit`/`minmax()`)
- Inline styles for anything other than truly dynamic values

---

## 5. WCAG 2.2 Accessibility Requirements

**Sources:**
- [W3C WAI - WCAG 2 Overview](https://www.w3.org/WAI/standards-guidelines/wcag/)
- [W3C WAI - What's New in WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)
- [W3C WAI - WCAG 2.2 at a Glance](https://www.w3.org/WAI/standards-guidelines/wcag/glance/)
- [W3C - WCAG 2.2 Specification](https://www.w3.org/TR/WCAG22/)

### Four Principles (POUR)

All criteria fall under these four principles:

1. **Perceivable** -- Information must be presentable in ways users can perceive.
2. **Operable** -- UI components and navigation must be operable.
3. **Understandable** -- Information and UI operation must be understandable.
4. **Robust** -- Content must be robust enough for diverse user agents and assistive technologies.

### WCAG AA Requirements Summary (50 criteria at A + AA)

#### Perceivable

- **1.1.1 Non-text Content (A):** All non-text content has a text alternative.
- **1.2.1-1.2.5 Time-based Media (A/AA):** Captions for audio, audio descriptions for video, alternatives for multimedia.
- **1.3.1 Info and Relationships (A):** Structure and relationships conveyed visually are available programmatically.
- **1.3.2 Meaningful Sequence (A):** Reading order is correct in the DOM.
- **1.3.3 Sensory Characteristics (A):** Instructions don't rely solely on shape, color, size, location, or sound.
- **1.4.1 Use of Color (A):** Color is not the only means of conveying information.
- **1.4.3 Contrast Minimum (AA):** 4.5:1 for normal text; 3:1 for large text.
- **1.4.4 Resize Text (AA):** Text can be resized up to 200% without loss of content.
- **1.4.5 Images of Text (AA):** Use actual text, not images of text.
- **1.4.10 Reflow (AA):** Content reflows at 320px width (no horizontal scroll).
- **1.4.11 Non-text Contrast (AA):** UI components and graphical objects have 3:1 contrast.
- **1.4.12 Text Spacing (AA):** Content adapts to increased line height, letter/word spacing.
- **1.4.13 Content on Hover or Focus (AA):** Hoverable/focusable additional content is dismissible, hoverable, and persistent.

#### Operable

- **2.1.1 Keyboard (A):** All functionality is available via keyboard.
- **2.1.2 No Keyboard Trap (A):** Users can navigate away from any component using keyboard.
- **2.4.1 Bypass Blocks (A):** Mechanism to skip repeated content (skip links).
- **2.4.2 Page Titled (A):** Pages have descriptive titles.
- **2.4.3 Focus Order (A):** Focus order preserves meaning and operability.
- **2.4.4 Link Purpose in Context (A):** Link purpose can be determined from link text (or context).
- **2.4.6 Headings and Labels (AA):** Headings and labels describe topic or purpose.
- **2.4.7 Focus Visible (AA):** Keyboard focus indicator is visible.
- **2.4.11 Focus Not Obscured - Minimum (AA) [NEW in 2.2]:** When an element receives focus, it is not entirely hidden by other content.
- **2.5.7 Dragging Movements (AA) [NEW in 2.2]:** Any dragging action has a single-pointer alternative (click/tap).
- **2.5.8 Target Size - Minimum (AA) [NEW in 2.2]:** Interactive targets are at least 24x24 CSS pixels, or have sufficient spacing.

#### Understandable

- **3.1.1 Language of Page (A):** Default language is programmatically set (`lang` attribute).
- **3.1.2 Language of Parts (AA):** Language changes within content are identified.
- **3.2.1 On Focus (A):** Focus does not trigger unexpected context changes.
- **3.2.2 On Input (A):** Changing a setting does not cause unexpected context changes.
- **3.2.6 Consistent Help (A) [NEW in 2.2]:** Help mechanisms appear in the same relative location across pages.
- **3.3.1 Error Identification (A):** Errors are identified and described in text.
- **3.3.2 Labels or Instructions (A):** Labels or instructions are provided for user input.
- **3.3.3 Error Suggestion (AA):** Error messages suggest corrections when possible.
- **3.3.7 Redundant Entry (A) [NEW in 2.2]:** Information previously entered is auto-populated or available for selection.
- **3.3.8 Accessible Authentication - Minimum (AA) [NEW in 2.2]:** No cognitive function test (e.g., remembering a password, solving a puzzle) is required for authentication, unless an alternative method is available.

#### Robust

- **4.1.2 Name, Role, Value (A):** All UI components have accessible names, roles, and states.
- **4.1.3 Status Messages (AA):** Status messages are programmatically determinable without receiving focus (use ARIA live regions).

### New in WCAG 2.2 (AA-Level Summary)

| Criterion | Level | Requirement |
|-----------|-------|-------------|
| 2.4.11 Focus Not Obscured | AA | Focused element not entirely hidden by other content |
| 2.5.7 Dragging Movements | AA | Single-pointer alternative for all drag actions |
| 2.5.8 Target Size (Minimum) | AA | Targets at least 24x24px or sufficiently spaced |
| 3.2.6 Consistent Help | A | Help in same relative location across pages |
| 3.3.7 Redundant Entry | A | Don't ask users to re-enter previously provided info |
| 3.3.8 Accessible Authentication | AA | No cognitive function test for login |

### Removed in WCAG 2.2

- **4.1.1 Parsing** was removed (browsers now handle parsing robustly).

---

## 6. React Best Practices

**Sources:**
- [react.dev - React v19](https://react.dev/blog/2024/12/05/react-19)
- [react.dev - React 19.2](https://react.dev/blog/2025/10/01/react-19-2)
- [react.dev - Rules of React](https://react.dev/reference/rules)
- [react.dev - Built-in React Hooks](https://react.dev/reference/react/hooks)

### Core Rules of React

1. **Components must be pure (idempotent).** Same inputs (props, state, context) must produce the same output. Never read or write external mutable values during render.
2. **Props and state are immutable.** Never mutate them directly. Create new objects/arrays.
3. **Values passed to hooks are immutable.** Once passed, do not modify them.
4. **Side effects must run outside of render.** Use event handlers or `useEffect`, never inline during render.
5. **Never call component functions directly.** Use JSX: `<MyComponent />`, not `MyComponent()`.
6. **Never pass hooks around as regular values.** Call hooks only inside components or custom hooks.

### Rules of Hooks

- Call hooks **at the top level only** -- never inside loops, conditions, or nested functions.
- Call hooks **only from React function components or custom hooks** -- never from regular JS functions.
- Enforce with `eslint-plugin-react-hooks`.

### React 19 New Patterns

#### Actions and Form Handling

- **Use `useActionState`** for form submissions with built-in loading/error tracking. Replaces old `useFormState`.
  ```jsx
  const [state, submitAction, isPending] = useActionState(async (prev, formData) => {
    const result = await saveData(formData);
    return result;
  }, initialState);
  ```

- **Use `useOptimistic`** for instant UI feedback while server processes the request. Automatically reverts on failure.
  ```jsx
  const [optimisticItems, addOptimistic] = useOptimistic(items, (state, newItem) => [...state, newItem]);
  ```

- **Pass functions directly as `<form action>`** -- React handles pending states, errors, and submissions automatically.

#### React Compiler (Automatic Memoization)

- **The React Compiler eliminates most manual `useMemo` and `useCallback` calls.** It optimizes re-renders at build time.
- **If using the compiler:** Remove unnecessary `useMemo`/`useCallback` wrappers -- the compiler handles this.
- **If not using the compiler:** Continue to memoize expensive computations with `useMemo` and stable callbacks with `useCallback` where they prevent unnecessary child re-renders.
- **Use `React.memo()`** to skip re-rendering a component when its props haven't changed (still valid with or without compiler).

#### `useEffectEvent` (React 19.2+)

- **Use `useEffectEvent`** for functions that are conceptually "events" fired from an Effect but should not be Effect dependencies.
- **Do not wrap everything in `useEffectEvent`** just to silence the linter -- this can introduce bugs.

### State Management Hierarchy

Apply in this order (simplest first):

1. **Local state (`useState`)** -- default for component-specific state.
2. **Colocate state** -- keep state as close as possible to where it is consumed.
3. **Lift state up** -- move state to the nearest common ancestor when siblings need it.
4. **Component composition** -- use `children` and render props to avoid prop drilling through intermediary components.
5. **Context (`useContext`)** -- for data needed by many components at different nesting levels (theme, auth, locale).
6. **External state libraries** -- only when Context is insufficient (high-frequency updates, complex derived state). Consider Zustand, Jotai, or React Query.

### Performance Optimization

- **Avoid creating new objects/arrays/functions in JSX props** when they cause unnecessary child re-renders.
- **Use `key` prop correctly** in lists. Never use array index as key if list items can be reordered, added, or removed.
- **Lazy-load routes and heavy components** with `React.lazy()` and `Suspense`.
- **Use `startTransition`** to mark non-urgent state updates so they don't block user input.
- **Use React DevTools Profiler** and Performance Tracks to identify unnecessary re-renders.
- **Keep component trees shallow** -- deeply nested component trees are harder to optimize.

### Component Composition Patterns

- **Prefer composition over configuration.** Pass components as children rather than passing many props.
  ```jsx
  // Prefer this:
  <Card>
    <CardHeader>Title</CardHeader>
    <CardBody>Content</CardBody>
  </Card>

  // Over this:
  <Card title="Title" body="Content" headerIcon={...} />
  ```
- **Extract custom hooks** to colocate related state and logic, making components cleaner.
- **Use compound components** (parent + children sharing implicit state) for complex UI patterns (tabs, accordions, dropdowns).

### Anti-Patterns

- Mutating props or state directly
- Calling hooks conditionally or inside loops
- Using `useEffect` for things that should be event handlers
- Prop drilling through 4+ levels without considering composition or Context
- Over-using Context for high-frequency updates (causes re-renders in all consumers)
- Using array index as `key` for dynamic lists
- Wrapping everything in `React.memo` without measuring (adds overhead if props change frequently)
- Using `useEffect` to sync state that could be derived/computed during render
- Calling component functions directly instead of rendering via JSX

---

## Quick Reference: Code Review Checklist

### HTML
- [ ] Semantic elements used (`<button>`, `<nav>`, `<main>`, headings, lists)
- [ ] All images have appropriate `alt` text
- [ ] All form inputs have associated `<label>` elements
- [ ] Link text is descriptive and meaningful out of context
- [ ] Skip-to-content link present
- [ ] Page has a descriptive `<title>` and `lang` attribute

### CSS
- [ ] Focus styles are visible (never removed without replacement)
- [ ] Color contrast meets 4.5:1 (normal text) / 3:1 (large text)
- [ ] Color is not the only means of conveying information
- [ ] Layout uses Flexbox/Grid (not floats)
- [ ] Custom properties used for design tokens
- [ ] Relative units used for font sizes
- [ ] No `!important` overrides (use cascade layers)
- [ ] Animations use `transform`/`opacity` only (not layout-triggering properties)

### Performance
- [ ] LCP resource discoverable in HTML (no JS-dependent loading)
- [ ] Images have explicit `width`/`height` or `aspect-ratio`
- [ ] Images use modern formats and `srcset`/`sizes`
- [ ] No layout-triggering animations
- [ ] Critical CSS inlined; non-critical deferred
- [ ] JavaScript code-split and lazy-loaded where appropriate
- [ ] No long tasks (>50ms) blocking main thread

### Accessibility (WCAG 2.2 AA)
- [ ] All functionality keyboard accessible
- [ ] No keyboard traps
- [ ] Focus order is logical
- [ ] Focused elements not obscured by sticky headers/modals
- [ ] Interactive targets >= 24x24px
- [ ] Drag actions have single-pointer alternatives
- [ ] Dynamic content uses ARIA live regions
- [ ] Authentication has no cognitive function test requirement
- [ ] Help mechanisms in consistent locations

### React
- [ ] Components are pure (no side effects during render)
- [ ] Hooks called at top level only
- [ ] State colocated near where it is consumed
- [ ] `key` props are stable and unique (not array indices for dynamic lists)
- [ ] Expensive computations memoized (or using React Compiler)
- [ ] `useEffect` not used for derived state or event handling
- [ ] Forms use `useActionState` / `useOptimistic` where appropriate
- [ ] Heavy components lazy-loaded with `Suspense`

---

## Sources

### MDN Web Docs (Mozilla)
- [HTML: A good basis for accessibility](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Accessibility/HTML)
- [CSS and JavaScript accessibility best practices](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Accessibility/CSS_and_JavaScript)
- [Accessibility on the web](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Accessibility)
- [WAI-ARIA basics](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Accessibility/WAI-ARIA_basics)

### web.dev (Google)
- [The most effective ways to improve Core Web Vitals](https://web.dev/articles/top-cwv)
- [Web Vitals](https://web.dev/articles/vitals)
- [CSS for Web Vitals](https://web.dev/articles/css-web-vitals)
- [Learn CSS: Layout](https://web.dev/learn/css/layout/)
- [Learn CSS: Flexbox](https://web.dev/learn/css/flexbox/)
- [Learn CSS: Grid](https://web.dev/learn/css/grid)
- [Ten modern layouts in one line of CSS](https://web.dev/one-line-layouts/)

### W3C WAI
- [WCAG 2 Overview](https://www.w3.org/WAI/standards-guidelines/wcag/)
- [What's New in WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)
- [WCAG 2 at a Glance](https://www.w3.org/WAI/standards-guidelines/wcag/glance/)
- [WCAG 2.2 Specification](https://www.w3.org/TR/WCAG22/)
- [How to Meet WCAG (Quick Reference)](https://www.w3.org/WAI/WCAG22/quickref/)

### React (react.dev)
- [React v19](https://react.dev/blog/2024/12/05/react-19)
- [React 19.2](https://react.dev/blog/2025/10/01/react-19-2)
- [Rules of React](https://react.dev/reference/rules)
- [Built-in React Hooks](https://react.dev/reference/react/hooks)
- [React memo](https://react.dev/reference/react/memo)
