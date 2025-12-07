# THEME COLORS — Updated Architecture (Dec 2025)

This document explains the active theme system after refactoring.  
It reflects the current architecture using:

- `theme-tokens.css`
- `ThemeContext.jsx`
- dynamic attributes: `data-mode` (day/night) and `data-theme` (genre)
- component-level styles in React

All legacy styling (animated genre backgrounds, `genres.css`, old `--bg` / `--fg` vars, `GenreDemo.jsx`) has been removed.

---

## 1. How the Theme System Works

The root `<html>` element receives two attributes:

```html
<html data-mode="day" data-theme="fantasy">
data-mode controls day/night palette.
data-theme controls the current genre color scheme.

Every theme/mode pair has its tokens defined in theme-tokens.css.

2. Core CSS Variables (Tokens)

These tokens exist across all themes:

Variable	Purpose
--color-bg	Main background
--color-bg-alt	Card/input background
--color-text	Primary text
--color-text-muted	De-emphasized text
--color-accent	Buttons, highlights
--color-accent-soft	Soft borders, subtle backgrounds
--color-shadow	Shadow tone
Note

--color-border exists but is not used by components; most borders derive from --color-accent-soft.

3. How Components Use Tokens

Containers
background-color: var(--color-bg)
border-color: var(--color-accent-soft)
color: var(--color-text)
Buttons
background-color: var(--color-accent)
color: var(--color-bg)

Inputs
background-color: var(--color-bg-alt)
color: var(--color-text)
border-color: var(--color-accent-soft)

Titles / Headers
color: var(--color-text)

4. Day/Night Mode

Each theme defines both day and night tokens:

:root[data-mode="day"][data-theme="fantasy"] { … }
:root[data-mode="night"][data-theme="fantasy"] { … }


Switching mode simply flips the attribute.
No component-level logic handles day/night.

5. Genre Themes

Each genre ("fantasy", "scifi", "mystery", "adventure", "horror") has two definitions:
Example — Fantasy:

Day
:root[data-mode="day"][data-theme="fantasy"] {
  --color-bg: #f4efe6;
  --color-bg-alt: #fff8ef;
  --color-text: #2c1e13;
  --color-accent: #b8864b;
  --color-accent-soft: #e1c8a3;
}

Night
:root[data-mode="night"][data-theme="fantasy"] {
  --color-bg: #1b140d;
  --color-bg-alt: #261d14;
  --color-text: #e7dccf;
  --color-accent: #d9b86a;
  --color-accent-soft: #6f5634;
}

6. Genre Metadata Source

Genre objects come from src/config/genres.js:

{
  id: "fantasy",
  name: "🧙‍♂️ Fantasy",
  icon: "🧙‍♂️",
  theme: "fantasy",
  description: "Magical quests and enchanted knowledge"
}


theme must match the CSS data-theme value.

7. Removed Elements

The following no longer exist:

genres.css
.genre-* classes (genre-scifi, etc.)
animated backgrounds
old CSS variables (--bg, --fg, etc.)
typography overrides by genre
GenreDemo.jsx
The theme system now relies purely on token-based theming.

8. Source of Truth

Colors:
src/styles/theme-tokens.css

Active theme + mode:
src/contexts/ThemeContext.jsx

These two files fully define all visual styles.
