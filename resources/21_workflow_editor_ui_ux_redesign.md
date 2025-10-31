# Workflow Editor UI/UX Redesign: Implementation Plan

**Created:** January 2025  
**Status:** Planning Phase  
**Priority:** High  
**Estimated Complexity:** High (Multi-phase implementation)

---

## Executive Summary

This document outlines a comprehensive redesign of the workflow creation/editing page to improve user experience through a modern, visual workflow builder interface. The redesign introduces a tabbed interface, visual node-based workflow representation (similar to n8n, Zapier, and other workflow tools), and improved data point management.

---

## 1. Current State Analysis

### 1.1 Current Architecture

**Main Component:** `extension/src/ui/PlaygroundApp.tsx`
- Single-page editor with inline sections
- Basic information form (name, description)
- Collapsible DataPointsPanel component
- TriggerConfigSection component
- StepsEditor component (list-based step management)
- Preview panel (optional, toggleable)

**Key Components:**
- `StepsEditor.tsx` - List-based step editing
- `TaskInputUI.tsx` - Renders input fields for tasks/handlers
- `DataPointsPanel.tsx` - Currently collapsible section, not a sidebar
- `UniversalInput.tsx` - Generic input component with token autocomplete
- `TriggerConfigSection.tsx` - Trigger configuration UI

**Base Classes:**
- `BaseTask` - No icon property currently
- `BaseHandler` - No icon property currently
- 7 Task templates (Translation, Language Detection, Custom Prompt, etc.)
- 8 Handler templates (Show Modal, Insert Text, Replace Text, etc.)

### 1.2 Current Pain Points

1. **Single Long Page:** All workflow configuration on one scrolling page, difficult to navigate
2. **No Visual Workflow Representation:** Steps shown as a list, hard to understand flow
3. **Data Points Management:** Currently inline, not easily accessible during step configuration
4. **No Icon System:** Tasks/handlers/triggers have no visual differentiation
5. **Complex Navigation:** Users must scroll through all sections to find what they need
6. **No Visual Flow Indicators:** Cannot see how steps connect or flow

---

## 2. Proposed Design

### 2.1 High-Level Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Editor Header (Save, Cancel, Preview)                      │
├──────────┬──────────────────────────────────────────────────┤
│          │  Tab Navigation: [Config | Steps | Visual]       │
│          ├──────────────────────────────────────────────────┤
│ Sidebar  │                                                   │
│ (Data    │  Active Tab Content                               │
│ Points)  │  - Config Tab: Name, Description, Trigger        │
│          │  - Steps Tab: Current list-based editor          │
│          │  - Visual Tab: Node-based workflow canvas        │
│          │                                                   │
└──────────┴──────────────────────────────────────────────────┘
```

### 2.2 Component Breakdown

#### **2.2.1 Left Sidebar (Data Points Panel)**

**Location:** `extension/src/ui/components/DataPointsSidebar.tsx` (New)

**Features:**
- Collapsible sidebar (show/hide button)
- Sticky positioning when visible
- Same content as current DataPointsPanel but redesigned for sidebar
- Categories: Context Providers, Knowledge Base, Current Data Points
- Search functionality
- Drag-and-drop support (future enhancement)

**Props:**
```typescript
interface DataPointsSidebarProps {
  isVisible: boolean
  dataPoints: DataPoint[]
  providerMetas: ProviderMeta[]
  kbEntries: KBEntry[]
  onToggle: () => void
  onGatherContextData: (providerId: string) => void
  onRemoveDataPoint: (dataPointId: string) => void
  onAddKBToDataPoints: (entry: KBEntry) => void
}
```

#### **2.2.2 Tab Navigation Component**

**Location:** `extension/src/ui/components/WorkflowEditorTabs.tsx` (New)

**Features:**
- Three tabs: Config, Steps, Visual
- Active tab indicator
- Tab content switching
- Preserves state when switching tabs

**Props:**
```typescript
interface WorkflowEditorTabsProps {
  activeTab: 'config' | 'steps' | 'visual'
  onTabChange: (tab: 'config' | 'steps' | 'visual') => void
  formData: WorkflowFormData
  onFormDataChange: (updates: Partial<WorkflowFormData>) => void
  // ... other props for each tab
}
```

#### **2.2.3 Config Tab**

**Location:** `extension/src/ui/components/ConfigTab.tsx` (New)

**Content:**
- Workflow name input
- Description textarea
- Trigger configuration (reuse TriggerConfigSection)
- Website filtering (if applicable)
- Workflow metadata (created/updated dates)

**Reuses:**
- `TriggerConfigSection.tsx` component
- Existing form styles

#### **2.2.4 Steps Tab**

**Location:** Reuse existing `StepsEditor.tsx` (minimal changes)

**Content:**
- Current list-based step editing
- No changes to functionality
- Slight styling adjustments for tab context

#### **2.2.5 Visual Tab (New - Complex Component)**

**Location:** `extension/src/ui/components/VisualWorkflowCanvas.tsx` (New)

**Features:**
- Canvas area for node rendering
- Visual nodes for:
  - Trigger (always shown first)
  - Tasks (user-added)
  - Handlers (user-added)
- Connectors/arrows between nodes
- Node selection and editing
- Modal for node configuration

**Sub-components:**
- `WorkflowNode.tsx` - Individual node component
- `WorkflowConnector.tsx` - Arrow/connector between nodes
- `NodeConfigurationModal.tsx` - Modal for editing node inputs

**Visual Design:**
- **Trigger Node:** 
  - Border color: Blue (#3B82F6)
  - Icon: Zap or PlayCircle
  - Always at top, cannot be deleted
- **Task Nodes:**
  - Border color: Green (#10B981)
  - Icon: Based on task type (from BaseTask)
  - Clickable to edit
- **Handler Nodes:**
  - Border color: Purple (#8B5CF6)
  - Icon: Based on handler type (from BaseHandler)
  - Clickable to edit

**Node States:**
1. **Visual State (Default):** Shows icon, name, and brief info
2. **Selected State:** Highlighted border, shows more details
3. **Edit State:** Opens modal with full input fields

**Node Layout:**
- Vertical flow (top to bottom)
- Trigger → Tasks → Handlers
- Connectors show flow direction
- Auto-layout algorithm (simple vertical stacking for v1)

#### **2.2.6 Node Configuration Modal**

**Location:** `extension/src/ui/components/NodeConfigurationModal.tsx` (New)

**Features:**
- Opens when clicking a node in Visual tab
- Reuses existing input components:
  - `TaskInputUI.tsx` for task nodes
  - Handler input UI (to be created or extracted)
- No save button - auto-saves on change
- Closes on outside click or ESC key
- Same input field structure as Steps tab

**Props:**
```typescript
interface NodeConfigurationModalProps {
  node: WorkflowNodeData // Contains step info
  taskTemplate?: TaskTemplate
  handlerTemplate?: HandlerTemplate
  dataPoints: DataPoint[]
  onUpdate: (updates: Partial<WorkflowStep>) => void
  onClose: () => void
}
```

---

## 3. Icon System Implementation

### 3.1 Base Class Updates

#### **3.1.1 BaseTask Icon Support**

**File:** `extension/src/core/BaseTask.ts`

**Changes:**
```typescript
export abstract class BaseTask {
  // ... existing properties
  
  // New property - default icon, can be overridden
  readonly icon?: React.ComponentType<{ size?: number; className?: string }>
  
  // Default icon getter
  getIcon(): React.ComponentType<{ size?: number; className?: string }> {
    return this.icon || DefaultTaskIcon
  }
}
```

#### **3.1.2 BaseHandler Icon Support**

**File:** `extension/src/core/BaseHandler.ts`

**Changes:**
```typescript
export abstract class BaseHandler {
  // ... existing properties
  
  // New property - default icon, can be overridden
  readonly icon?: React.ComponentType<{ size?: number; className?: string }>
  
  // Default icon getter
  getIcon(): React.ComponentType<{ size?: number; className?: string }> {
    return this.icon || DefaultHandlerIcon
  }
}
```

### 3.2 Icon Mapping

**Default Icons (from lucide-react):**

**Tasks:**
- TranslationTask: `Languages` icon
- LanguageDetectionTask: `Search` or `Globe` icon
- CustomPromptTask: `MessageSquare` or `Sparkles` icon
- SummarizerTask: `FileText` icon
- ProofreaderTask: `CheckCircle` icon
- WriterTask: `PenTool` icon
- RewriterTask: `RefreshCw` icon

**Handlers:**
- ShowModalHandler: `Maximize2` or `Monitor` icon
- InsertTextHandler: `Type` or `Edit` icon
- ReplaceSelectedTextHandler: `Replace` or `RefreshCw` icon
- DownloadFileHandler: `Download` icon
- ModifyCSSHandler: `Palette` or `Layers` icon
- ParseTableToCSVHandler: `Table` or `FileSpreadsheet` icon
- SaveCaptureHandler: `Camera` or `Save` icon
- SaveToKBHandler: `Database` or `Bookmark` icon

**Triggers:**
- Manual: `PlayCircle` icon
- onPageLoad: `Globe` icon
- onSelection: `MousePointer` icon
- onFocus: `Focus` icon
- schedule: `Clock` icon

### 3.3 Icon Component

**Location:** `extension/src/ui/components/WorkflowIcon.tsx` (New)

**Purpose:** Centralized icon rendering with consistent sizing and styling

```typescript
interface WorkflowIconProps {
  type: 'trigger' | 'task' | 'handler'
  subtype?: string // taskId or handlerId for specific icons
  size?: number
  className?: string
}

export const WorkflowIcon: React.FC<WorkflowIconProps> = ({
  type,
  subtype,
  size = 20,
  className
}) => {
  // Icon resolution logic
  // Falls back to default icons if specific not found
}
```

---

## 4. Implementation Plan

### Phase 1: Foundation & Structure (Week 1)

#### **Task 1.1: Create Tab Navigation System**
- [ ] Create `WorkflowEditorTabs.tsx` component
- [ ] Implement tab switching logic
- [ ] Add tab styling (CSS)
- [ ] Update `PlaygroundApp.tsx` to use tabs
- [ ] Test tab state preservation

**Files to Create:**
- `extension/src/ui/components/WorkflowEditorTabs.tsx`
- CSS updates to `extension/src/ui/playground.css`

**Files to Modify:**
- `extension/src/ui/PlaygroundApp.tsx`

#### **Task 1.2: Create Config Tab**
- [ ] Create `ConfigTab.tsx` component
- [ ] Extract basic info form to ConfigTab
- [ ] Reuse `TriggerConfigSection` in ConfigTab
- [ ] Add website config to ConfigTab
- [ ] Test form data updates

**Files to Create:**
- `extension/src/ui/components/ConfigTab.tsx`

**Files to Modify:**
- `extension/src/ui/PlaygroundApp.tsx`
- `extension/src/ui/components/TriggerConfigSection.tsx` (if needed)

#### **Task 1.3: Adapt Steps Tab**
- [ ] Wrap existing `StepsEditor` in tab container
- [ ] Ensure StepsEditor works in tab context
- [ ] Style adjustments for tab layout
- [ ] Test step editing functionality

**Files to Modify:**
- `extension/src/ui/components/StepsEditor.tsx` (minimal)
- `extension/src/ui/PlaygroundApp.tsx`

### Phase 2: Sidebar & Data Points (Week 1-2)

#### **Task 2.1: Create Data Points Sidebar**
- [ ] Create `DataPointsSidebar.tsx` component
- [ ] Extract logic from `DataPointsPanel.tsx`
- [ ] Implement show/hide toggle
- [ ] Add sidebar positioning (fixed/sticky)
- [ ] Style sidebar with proper width and spacing
- [ ] Test sidebar with main content adjustment

**Files to Create:**
- `extension/src/ui/components/DataPointsSidebar.tsx`

**Files to Modify:**
- `extension/src/ui/PlaygroundApp.tsx`
- `extension/src/ui/playground.css`
- Consider deprecating or keeping `DataPointsPanel.tsx` for other uses

#### **Task 2.2: Update Layout for Sidebar**
- [ ] Modify `PlaygroundApp.tsx` layout to accommodate sidebar
- [ ] Add responsive width adjustments
- [ ] Ensure all tabs work with sidebar visible/hidden
- [ ] Test on different screen sizes

**Files to Modify:**
- `extension/src/ui/PlaygroundApp.tsx`
- `extension/src/ui/playground.css`

### Phase 3: Icon System (Week 2)

#### **Task 3.1: Add Icon Support to Base Classes**
- [ ] Add `icon` property to `BaseTask`
- [ ] Add `icon` property to `BaseHandler`
- [ ] Add `getIcon()` methods with defaults
- [ ] Create default icon components
- [ ] Update TypeScript types if needed

**Files to Modify:**
- `extension/src/core/BaseTask.ts`
- `extension/src/core/BaseHandler.ts`
- `extension/src/common/types.ts` (if needed)

#### **Task 3.2: Add Icons to All Tasks**
- [ ] Update TranslationTask with Languages icon
- [ ] Update LanguageDetectionTask with Globe icon
- [ ] Update CustomPromptTask with MessageSquare icon
- [ ] Update SummarizerTask with FileText icon
- [ ] Update ProofreaderTask with CheckCircle icon
- [ ] Update WriterTask with PenTool icon
- [ ] Update RewriterTask with RefreshCw icon

**Files to Modify:**
- All files in `extension/src/tasks/templates/`

#### **Task 3.3: Add Icons to All Handlers**
- [ ] Update ShowModalHandler with Maximize2 icon
- [ ] Update InsertTextHandler with Type icon
- [ ] Update ReplaceSelectedTextHandler with RefreshCw icon
- [ ] Update DownloadFileHandler with Download icon
- [ ] Update ModifyCSSHandler with Palette icon
- [ ] Update ParseTableToCSVHandler with Table icon
- [ ] Update SaveCaptureHandler with Camera icon
- [ ] Update SaveToKBHandler with Database icon

**Files to Modify:**
- All files in `extension/src/handlers/templates/`

#### **Task 3.4: Create WorkflowIcon Component**
- [ ] Create `WorkflowIcon.tsx` component
- [ ] Implement icon resolution logic
- [ ] Handle trigger icons (based on trigger type)
- [ ] Add fallback to default icons
- [ ] Test icon rendering

**Files to Create:**
- `extension/src/ui/components/WorkflowIcon.tsx`

### Phase 4: Visual Workflow Canvas (Week 3-4)

#### **Task 4.1: Create Visual Canvas Container**
- [ ] Create `VisualWorkflowCanvas.tsx` component
- [ ] Set up canvas area with proper sizing
- [ ] Implement basic node rendering (placeholder)
- [ ] Add canvas scrolling and zoom (basic)
- [ ] Style canvas background

**Files to Create:**
- `extension/src/ui/components/VisualWorkflowCanvas.tsx`
- CSS for canvas

#### **Task 4.2: Create Workflow Node Component**
- [ ] Create `WorkflowNode.tsx` component
- [ ] Implement node visual design:
  - Border colors (blue/green/purple)
  - Icon rendering
  - Name and type display
  - Status indicators (if applicable)
- [ ] Add click handler for selection
- [ ] Add hover states
- [ ] Handle node positioning

**Files to Create:**
- `extension/src/ui/components/WorkflowNode.tsx`

#### **Task 4.3: Create Connector Component**
- [ ] Create `WorkflowConnector.tsx` component
- [ ] Implement arrow/line rendering between nodes
- [ ] Calculate connector paths (vertical flow initially)
- [ ] Style connectors with appropriate colors
- [ ] Handle dynamic positioning as nodes move

**Files to Create:**
- `extension/src/ui/components/WorkflowConnector.tsx`

#### **Task 4.4: Implement Node Layout Algorithm**
- [ ] Create layout utility functions
- [ ] Implement vertical stacking algorithm
- [ ] Position trigger at top
- [ ] Position tasks and handlers in sequence
- [ ] Calculate connector start/end points
- [ ] Handle node spacing and margins

**Files to Create:**
- `extension/src/ui/components/WorkflowLayout.ts` (utility)

#### **Task 4.5: Integrate Canvas with Workflow Data**
- [ ] Map workflow steps to nodes
- [ ] Map trigger to trigger node
- [ ] Render nodes based on current workflow
- [ ] Update canvas when workflow changes
- [ ] Handle empty workflow state

**Files to Modify:**
- `extension/src/ui/components/VisualWorkflowCanvas.tsx`
- `extension/src/ui/PlaygroundApp.tsx`

#### **Task 4.6: Add Node Actions (Add/Delete)**
- [ ] Add "Add Task" button/action in canvas
- [ ] Add "Add Handler" button/action in canvas
- [ ] Implement node deletion (right-click or delete button)
- [ ] Update workflow steps when nodes added/removed
- [ ] Show confirmation for deletions

**Files to Modify:**
- `extension/src/ui/components/VisualWorkflowCanvas.tsx`
- `extension/src/ui/components/WorkflowNode.tsx`

### Phase 5: Node Configuration Modal (Week 4)

#### **Task 5.1: Create Modal Component**
- [ ] Create `NodeConfigurationModal.tsx` component
- [ ] Implement modal overlay and container
- [ ] Add close on outside click handler
- [ ] Add ESC key handler
- [ ] Style modal with proper sizing
- [ ] Add modal header with node name/type

**Files to Create:**
- `extension/src/ui/components/NodeConfigurationModal.tsx`

#### **Task 5.2: Integrate Task Input UI**
- [ ] Reuse `TaskInputUI.tsx` in modal
- [ ] Pass correct props (taskTemplate, dataPoints, etc.)
- [ ] Handle input changes and update workflow
- [ ] Test all task types in modal
- [ ] Handle condition input in modal

**Files to Modify:**
- `extension/src/ui/components/NodeConfigurationModal.tsx`
- Ensure `TaskInputUI.tsx` works in modal context

#### **Task 5.3: Create Handler Input UI Component**
- [ ] Create `HandlerInputUI.tsx` component (similar to TaskInputUI)
- [ ] Extract handler input rendering logic
- [ ] Reuse `UniversalInput` for handler fields
- [ ] Integrate in modal for handler nodes
- [ ] Test all handler types

**Files to Create:**
- `extension/src/ui/components/HandlerInputUI.tsx`

**Files to Modify:**
- `extension/src/ui/components/NodeConfigurationModal.tsx`

#### **Task 5.4: Handle Modal State Management**
- [ ] Track selected node in canvas
- [ ] Open modal when node clicked
- [ ] Close modal when outside clicked or ESC pressed
- [ ] Update workflow step when modal inputs change
- [ ] Preserve modal state during workflow updates

**Files to Modify:**
- `extension/src/ui/components/VisualWorkflowCanvas.tsx`
- `extension/src/ui/components/NodeConfigurationModal.tsx`

### Phase 6: Polish & Testing (Week 5)

#### **Task 6.1: Visual Polish**
- [ ] Refine node styling and colors
- [ ] Improve connector rendering
- [ ] Add animations for node interactions
- [ ] Add loading states
- [ ] Improve empty states
- [ ] Add tooltips and hints

#### **Task 6.2: Responsive Design**
- [ ] Test sidebar on different screen sizes
- [ ] Ensure canvas works on smaller screens
- [ ] Make modal responsive
- [ ] Test tab navigation on mobile (if applicable)

#### **Task 6.3: Integration Testing**
- [ ] Test workflow creation in Visual tab
- [ ] Test workflow editing in Visual tab
- [ ] Test switching between tabs
- [ ] Test data point integration
- [ ] Test all task types
- [ ] Test all handler types
- [ ] Test conditional steps
- [ ] Test workflow execution

#### **Task 6.4: Code Cleanup**
- [ ] Remove unused code
- [ ] Add TypeScript type definitions
- [ ] Add JSDoc comments
- [ ] Ensure consistent code style
- [ ] Review and optimize performance

---

## 5. Architecture Considerations

### 5.1 State Management

**Current Approach:**
- `PlaygroundApp.tsx` manages all form state
- Props passed down to child components

**Proposed Approach:**
- Keep centralized state in `PlaygroundApp.tsx`
- Use local state in child components for UI-only state (e.g., modal open/closed)
- Ensure single source of truth for workflow data

### 5.2 Component Reusability

**Key Principles:**
1. **Reuse Existing Input Components:**
   - `UniversalInput.tsx` - Already handles token notation
   - `TaskInputUI.tsx` - Reuse for task node editing
   - Create `HandlerInputUI.tsx` - Similar pattern for handlers

2. **Shared UI Patterns:**
   - Modal styling consistent with existing modals
   - Form styling consistent with existing forms
   - Button and icon styling consistent

3. **Minimal Duplication:**
   - Visual tab uses same input components as Steps tab
   - Only difference is presentation (modal vs inline)

### 5.3 Performance Considerations

1. **Canvas Rendering:**
   - Use React.memo for WorkflowNode to prevent unnecessary re-renders
   - Virtualize if node count becomes large (future optimization)
   - Debounce node position updates

2. **Modal Performance:**
   - Only render modal when open
   - Lazy load input components if needed

3. **State Updates:**
   - Batch updates when possible
   - Avoid deep object cloning unnecessarily

### 5.4 Data Flow

```
PlaygroundApp (State)
  ├── WorkflowEditorTabs
  │   ├── ConfigTab
  │   ├── StepsTab (StepsEditor)
  │   └── VisualTab (VisualWorkflowCanvas)
  │       ├── WorkflowNode (multiple)
  │       ├── WorkflowConnector (multiple)
  │       └── NodeConfigurationModal
  │           ├── TaskInputUI (for tasks)
  │           └── HandlerInputUI (for handlers)
  └── DataPointsSidebar
```

---

## 6. Risk Assessment

### 6.1 Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Canvas Performance** | Medium | Medium | Start with simple vertical layout, optimize later |
| **State Synchronization** | High | Medium | Careful state management, thorough testing |
| **Component Complexity** | Medium | High | Break into small, focused components |
| **Browser Compatibility** | Low | Low | Use standard React/CSS, test in Chrome |
| **Memory Leaks (Modals)** | Medium | Low | Proper cleanup, React best practices |

### 6.2 UX Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Learning Curve** | Medium | Medium | Keep Steps tab available, add tooltips |
| **Mobile Usability** | Medium | High | Desktop-first, mobile later |
| **Modal Overload** | Low | Low | Clear visual hierarchy, easy to close |

### 6.3 Migration Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Existing Workflows** | Low | Low | No data migration needed, visual only |
| **User Confusion** | Medium | Medium | Provide both Views, make Visual optional initially |

---

## 7. Design Inspirations

### 7.1 Similar Tools Analysis

**n8n:**
- Node-based workflow canvas
- Click node to edit in sidebar
- Color-coded node types
- Clean connector lines

**Zapier:**
- Step-by-step visual flow
- Clear node icons
- Simple vertical layout

**Make (Integromat):**
- Advanced canvas with zoom/pan
- Rich node visualization
- Drag-and-drop connections

**For This Project:**
- Start simple: Vertical flow like Zapier
- Color coding: Triggers (blue), Tasks (green), Handlers (purple)
- Modal editing: Similar to n8n's sidebar editing
- Icon-based nodes: Clear visual identification

### 7.2 Visual Design Principles

1. **Clarity:** Each node type should be instantly recognizable
2. **Consistency:** Icons, colors, and styling should be consistent
3. **Feedback:** Clear hover, click, and selection states
4. **Accessibility:** Proper contrast, keyboard navigation
5. **Performance:** Smooth interactions, no lag

---

## 8. File Structure

### 8.1 New Files to Create

```
extension/src/ui/components/
├── WorkflowEditorTabs.tsx           # Tab navigation component
├── ConfigTab.tsx                     # Configuration tab content
├── DataPointsSidebar.tsx            # Sidebar for data points
├── VisualWorkflowCanvas.tsx         # Visual workflow canvas
├── WorkflowNode.tsx                  # Individual node component
├── WorkflowConnector.tsx             # Connector/arrow component
├── NodeConfigurationModal.tsx        # Modal for node editing
├── HandlerInputUI.tsx                # Handler input fields component
├── WorkflowIcon.tsx                  # Icon resolution component
└── WorkflowLayout.ts                 # Layout utility functions
```

### 8.2 Files to Modify

```
extension/src/
├── core/
│   ├── BaseTask.ts                   # Add icon support
│   └── BaseHandler.ts                # Add icon support
├── tasks/templates/
│   └── [All task files]              # Add icon properties
├── handlers/templates/
│   └── [All handler files]           # Add icon properties
└── ui/
    ├── PlaygroundApp.tsx             # Major refactor for tabs/sidebar
    ├── components/
    │   └── StepsEditor.tsx           # Minor styling adjustments
    └── playground.css                # Extensive CSS additions
```

---

## 9. Testing Strategy

### 9.1 Unit Tests

- Icon resolution logic
- Layout algorithm
- Node data mapping
- Modal state management

### 9.2 Integration Tests

- Tab switching preserves state
- Modal updates reflect in workflow
- Visual canvas reflects workflow changes
- Sidebar integration with all tabs

### 9.3 User Testing

- Workflow creation in Visual tab
- Workflow editing in Visual tab
- Comparison with Steps tab
- Data point usage in visual mode

---

## 10. Future Enhancements (Post-MVP)

### 10.1 Advanced Canvas Features

- Drag-and-drop node positioning
- Zoom and pan controls
- Multiple branches/conditionals visualization
- Node grouping
- Canvas mini-map

### 10.2 Enhanced Node Features

- Node validation indicators
- Node status (running, success, error)
- Node tooltips with descriptions
- Keyboard shortcuts for node operations

### 10.3 Workflow Visualization

- Execution flow highlighting
- Step-by-step execution preview
- Error path visualization
- Performance metrics per node

---

## 11. Success Criteria

### 11.1 Functional Requirements

- ✅ Users can create workflows using Visual tab
- ✅ Users can edit existing workflows in Visual tab
- ✅ All task types are editable in modal
- ✅ All handler types are editable in modal
- ✅ Data points are accessible in sidebar
- ✅ Workflow execution works from Visual tab
- ✅ Switching between tabs preserves workflow state

### 11.2 Non-Functional Requirements

- ✅ Visual tab loads in < 1 second
- ✅ Modal opens/closes smoothly
- ✅ Node interactions are responsive
- ✅ No memory leaks from modal usage
- ✅ Code is maintainable and well-documented

### 11.3 User Experience

- ✅ Visual workflow is intuitive
- ✅ Node types are easily distinguishable
- ✅ Editing nodes is straightforward
- ✅ Sidebar improves workflow creation experience
- ✅ Tabs improve navigation

---

## 12. Implementation Timeline

**Estimated Duration:** 5 weeks

- **Week 1:** Foundation (Tabs, Config Tab, Steps Tab, Sidebar)
- **Week 2:** Icon System (Base classes, all tasks/handlers, WorkflowIcon component)
- **Week 3:** Visual Canvas (Canvas, Nodes, Connectors, Layout)
- **Week 4:** Node Modal (Modal component, Task/Handler integration, State management)
- **Week 5:** Polish & Testing (Styling, responsive, integration testing, cleanup)

**Deliverables:**
- Fully functional tabbed interface
- Working visual workflow canvas
- Icon system for all tasks/handlers
- Sidebar data points management
- Comprehensive testing

---

## 13. Conclusion

This redesign will significantly improve the workflow creation experience by:

1. **Better Organization:** Tabs separate concerns (Config, Steps, Visual)
2. **Visual Understanding:** Node-based canvas shows workflow flow
3. **Improved Accessibility:** Sidebar makes data points always available
4. **Modern UI:** Aligns with industry-standard workflow tools
5. **Maintainability:** Reusable components, clean architecture

The phased approach allows for iterative development and testing, reducing risk and ensuring quality at each stage.

**Next Steps:**
1. Review and approve this plan
2. Set up development environment
3. Begin Phase 1 implementation
4. Regular check-ins and adjustments as needed

---

**Document Version:** 1.0  
**Last Updated:** January 2025  
**Status:** Ready for Review

