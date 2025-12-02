# Theme Color System Reference

## Color Variable Mapping

The theme system uses CSS variables that map to specific UI elements. Here's what each color variable controls:

### Core Color Variables

| Variable | Purpose | Used For |
|----------|---------|----------|
| `--color-bg` | **Main Background** | The primary background color of the entire app/screen |
| `--color-bg-alt` | **Secondary Background** | Alternative background for panels, cards, and secondary surfaces |
| `--color-surface` | **Surface/Card Background** | Background for cards, input fields, and elevated surfaces |
| `--color-accent` | **Primary Accent** | Main buttons, primary actions, titles, and key interactive elements |
| `--color-accent-soft` | **Secondary Accent** | Borders, secondary buttons, hover states, and subtle highlights |
| `--color-highlight` | **Highlight/Emphasis** | Selection, emphasis, glow effects, and special highlights |
| `--color-text` | **Primary Text** | Main body text, headings, and primary content |
| `--color-text-muted` | **Muted Text** | Secondary text, descriptions, and less important content |

### Legacy Variable Mapping (for compatibility)

The system also maps to legacy variables used by `genres.css`:

| Legacy Variable | Maps To | Used By |
|----------------|---------|---------|
| `--bg` | `--color-bg` | `.scene` background |
| `--fg` | `--color-text` | `.scene` text color |
| `--accent` | `--color-accent` | Titles, buttons, links |
| `--link` | `--color-accent-soft` | Links and secondary accents |
| `--btn-fg` | `--color-bg` (day) or `--color-highlight` (night) | Button text color |

## Current Usage in Components

### App.jsx
- **Toggle buttons** (🌙/☀️, ⚙️): `--color-accent-soft` background, `--color-accent` border
- **Genre selection buttons**: 
  - Selected: `--color-accent-soft` background, `--color-accent` border
  - Unselected: `--color-bg-alt` background
- **Primary buttons**: `--color-accent` background, `--color-bg` text
- **Text**: `--color-text` for primary, `--color-text-muted` for secondary

### Settings.jsx
- **Modal background**: Uses Tailwind classes (could use `--color-bg`)
- **Labels**: `--color-text`
- **Toggle container**: `--color-bg-alt` background, `--color-accent-soft` border
- **Theme buttons**: `--color-accent-soft` when selected, `--color-bg-alt` when not
- **Done button**: `--color-accent` background, `--color-bg` text

### genres.css (.scene)
- **Background**: `--bg` (which maps to `--color-bg`)
- **Text**: `--fg` (which maps to `--color-text`)
- **Titles**: `--accent` (which maps to `--color-accent`)
- **Buttons**: `--accent` background, `--btn-fg` text

## Example: Adventure Theme

### Day Mode
```css
--color-bg: #EAD8B1        /* Light beige - main background */
--color-bg-alt: #F2B880   /* Light orange - cards/panels */
--color-surface: #8B5E3C   /* Brown - input fields */
--color-accent: #A63A24    /* Dark red - buttons, titles */
--color-accent-soft: #D38F50 /* Orange - borders, hover */
--color-highlight: #F2B880  /* Light orange - highlights */
```

### Night Mode
```css
--color-bg: #2C1B10        /* Dark brown - main background */
--color-bg-alt: #5A3825   /* Medium brown - cards/panels */
--color-surface: #5A3825   /* Medium brown - input fields */
--color-accent: #C96A2B    /* Orange - buttons, titles */
--color-accent-soft: #8C3B1C /* Dark red - borders, hover */
--color-highlight: #F0D197  /* Light beige - highlights */
```

## Recommendations for Better Usage

1. **Background hierarchy**: Use `--color-bg` → `--color-bg-alt` → `--color-surface` for depth
2. **Interactive elements**: Use `--color-accent` for primary actions, `--color-accent-soft` for secondary
3. **Text contrast**: Always use `--color-text` for readability (automatically adjusts for day/night)
4. **Borders**: Use `--color-accent-soft` for subtle borders, `--color-accent` for emphasis

