# Design System Reference

This document outlines the common components and classNames used across the PromptFlow application to ensure design consistency.

## Common Button Classes

### Base Button: `promptflow-btn`
- **Default styling:**
  - Padding: `8px 16px`
  - Border-radius: `6px` (var(--radius-md))
  - Min-height: `36px`
  - Font-size: `14px`
  - Font-weight: `500`
  - Gap: `6px` (for icons)

### Button Variants:
- `promptflow-btn-primary` - Primary action button
- `promptflow-btn-secondary` - Secondary action button (with border)
- `promptflow-btn-ghost` - Ghost button (transparent background)
- `promptflow-btn-loading` - Loading state wrapper

**Used in:**
- Quickbar.tsx
- WorkflowPlayground.tsx
- PlaygroundApp.tsx

### Alternative Button Classes (Playground):
- `btn` - Base button class
- `btn-primary`, `btn-secondary` - Variants
- `btn-icon` - Icon-only button
- `view-btn` - View toggle button

**Used in:**
- PlaygroundApp.tsx
- VisualWorkflowCanvas.tsx
- StepsEditor.tsx
- KnowledgeBasePanel.tsx
- DataPointsPanel.tsx

### Special Cases:
- `promptflow-hero-btn` - Special large button for popup hero section (acceptable special case)

## Icon Classes

### `promptflow-icon`
- Default size: `16px x 16px`
- Flex-shrink: `0`

**Note:** Logo icons and special cases can use larger sizes, but standard UI icons should use 16px.

## Modal Components

### Modal Structure:
- `modal-overlay` - Backdrop overlay
- `modal-content` - Main modal container
  - Variants: `modal-small`, `modal-medium`, `modal-large`
- `modal-header` - Header section
- `modal-title` - Title text
- `modal-close-btn` - Close button
- `modal-body` - Content area

### Modal Styling:
- Border-radius: `var(--radius-xl)`
- Padding: `var(--space-6)` (header and body)
- Box-shadow: Large shadow with multiple layers

**Used in:**
- Modal.tsx (common component)
- NodeConfigurationModal.tsx

## Form Components

### Input Classes:
- `promptflow-input-group` - Input wrapper with icon support
- `promptflow-input` - Text input field
- `promptflow-input-icon` - Icon inside input

### Form Classes:
- `promptflow-form-group` - Form field wrapper

## Other Common Classes

### Status & Feedback:
- `promptflow-error` - Error message display
- `promptflow-preview` - Preview container
- `promptflow-action` - Action item container

### Spacing & Layout:
- Use CSS variables: `var(--space-1)` through `var(--space-8)`
- Use radius variables: `var(--radius-sm)`, `var(--radius-md)`, `var(--radius-lg)`, `var(--radius-xl)`, `var(--radius-2xl)`
- Use color variables: `var(--color-*)` for all colors

## Design Principles

1. **Consistency First:** When possible, use existing button/component classes rather than creating new ones
2. **CSS Variables:** Always use theme variables for colors, spacing, and sizing
3. **Special Cases:** Special UI elements (like hero buttons) can have custom classes, but should still respect the design system's spacing and color variables
4. **Icon Sizing:** Standard UI icons = 16px, Logo/Special icons can be larger
5. **Border Radius:** 
   - Small elements: `var(--radius-md)` (6px)
   - Cards/Containers: `var(--radius-lg)` or `var(--radius-xl)` (12-16px)
   - Large special elements: `var(--radius-2xl)` (20px+)

## When Improving Components

1. **Check for existing classes first** - Don't recreate button styles if `promptflow-btn` exists
2. **Enhance, don't replace** - Improve existing classes while maintaining compatibility
3. **Document exceptions** - Special cases should be clearly marked as intentional
4. **Maintain variable usage** - Always use CSS variables, never hardcoded values
5. **Test across components** - Ensure changes to common classes don't break other components

