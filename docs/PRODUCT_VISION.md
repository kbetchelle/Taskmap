# FLOW — Task Management Reimagined

## Product Vision

Flow is a task management application that moves with you, not against you. Inspired by the elegant simplicity of macOS Finder, Flow transforms hierarchical task organization into a visual, spatial experience that feels natural and effortless.

This isn't another cluttered productivity tool drowning in features. Flow is intentionally minimal, keyboard-first, and designed for people who value calm focus over frantic productivity theater. Every interaction is smooth, every animation is deliberate, and every feature serves the singular purpose of helping you move through your work with grace and clarity.

---

## Core Philosophy

### We Float

Flow embodies a philosophy of peaceful productivity. The interface doesn't shout at you with notifications, badges, or urgent red buttons. Instead, it provides:

- **Spatial clarity** — See your work landscape at a glance, organized the way your mind naturally thinks in projects and sub-projects
- **Temporal awareness** — Work appears when it's ready for you, not before. Future work stays hidden until it's time.
- **Effortless navigation** — Everything is accessible via keyboard shortcuts that become muscle memory within days
- **Smooth transitions** — Animations are slower, softer, creating a meditative quality to task management

---

## The Five-Column Advantage

Like Finder's column view, Flow displays your work as a horizontal cascade of nested lists. You always see where you are, where you've been, and what's inside each container. No clicking into dark folders and losing context. No cluttered tree views. Just elegant spatial organization that scales infinitely to the right.

---

## What Makes Flow Different

### 1. Directories Are First-Class Citizens

Most task managers treat projects as special types of tasks. Flow recognizes that structure matters as much as action. Directories can contain infinite subdirectories, allowing you to break down massive initiatives into manageable pieces without losing the big picture.

### 2. Time Reveals Work

Set a start date on a project or task, and it simply doesn't exist until that day arrives. Your "today" view only shows what's actually relevant right now. No overwhelming master lists. No decision fatigue about what to work on. Just what's active, what's ready, what matters today.

### 3. Keyboard-First, Always

Every single operation in Flow can be performed without touching a mouse. Not as an afterthought accessibility feature, but as the primary interaction model. Navigate with arrows. Create with Cmd+N. Edit with Cmd+Shift+E. Filter, search, move, delete — all from the keyboard. Flow makes you fast.

### 4. Gentle Completion

When you complete a task, it doesn't vanish immediately (creating anxiety about "did I really finish that?"). Instead, it strikes through, collapses to a single line, and settles at the bottom of its list. Six hours later, it quietly disappears. You can bring completed tasks back into view anytime, but by default, they fade away naturally, making space for what's next.

### 5. Color With Purpose

Flow offers three color modes you can toggle instantly:

- **Priority mode** — High and medium priority tasks glow with user-customizable colors
- **Category mode** — Five preset categories, each with its own color palette
- **No color mode** — Pure minimalism, just black text on white

You're never locked into one organizational system. The same data, viewed three different ways, depending on what helps you think clearly in the moment.

---

## Product Roadmap

### Phase 1: Core Architecture & Data Model

**Goal:** Build the unshakeable foundation

We establish the database schema in Supabase with PostgreSQL, creating tables for directories, tasks, attachments, user settings, and action history. The data model is a simple hierarchical tree: directories with parent_id and tasks in directories, with no external data sources or synced databases. This phase implements row-level security, real-time subscriptions, and automated cleanup functions. The result is a robust, scalable backend that handles nested hierarchies up to 15 levels deep, tracks every action for two hours (enabling undo), and automatically archives completed work.

**Key Deliverable:** A fully functional database with authentication, CRUD operations, and real-time sync working flawlessly.

---

### Phase 2: UI Foundation & Column System

**Goal:** Create the spatial canvas

We build the five-column layout engine that makes Flow feel like Finder. This phase implements horizontal scrolling, dynamic column rendering, fixed-width columns that adapt to screen size, and the smooth animations that make navigating feel like floating through your work. The footer breadcrumb system shows you exactly where you are in your directory tree at all times.

**Key Deliverable:** A navigable multi-column interface with smooth scrolling, proper visual hierarchy, and the foundational animation system.

---

### Phase 3: Navigation & Keyboard Controls

**Goal:** Make the keyboard sing

This is where Flow becomes powerful. We implement the complete keyboard shortcut system — arrow key navigation between columns and items, Enter to expand, Escape to collapse, Shift+arrows for multi-select. We build the centralized keyboard handler that captures every shortcut across the app, ensuring consistent behavior and no conflicts.

**Key Deliverable:** Full keyboard navigation working seamlessly, with hover states disabled and focus indicators crystal clear.

---

### Phase 4: Task & Directory Operations

**Goal:** Create, edit, destroy with elegance

The task creation popup slides in from the right, pushing other columns aside or appearing in empty space. Type Cmd+N anywhere, press T for task or D for directory, and you're creating. The metadata editor allows Shift+Enter to cycle through fields. Quick edit (Option+E) and full edit (Cmd+Shift+E) modes give you control. Deletion requires confirmation, multi-select works intuitively, and copy/paste handles both shallow and deep recursive copying.

**Key Deliverable:** Smooth creation and editing flows, with the three-character minimum validation, natural language date parsing (within 13 days), and all CRUD operations working perfectly.

---

### Phase 5: Views & Filtering

**Goal:** Show me what I need, when I need it

The main database view shows only active items (where start_date ≤ today). Cmd+A+L switches to the upcoming view showing everything regardless of dates. The search bar (Cmd+Shift+S) filters by tags, task names, priorities, and date ranges simultaneously. Color mode toggles (Cmd+Option+N/C/P) switch between no color, category colors, and priority colors instantly.

**Key Deliverable:** Three distinct views, powerful multi-filter search, and color mode switching that transforms the interface instantly.

---

### Phase 6: Metadata & Advanced Features

**Goal:** Add depth without complexity

File attachments via drag-and-drop or Cmd+Shift+F, stored in Supabase Storage with signed URLs (path format `userId/taskId/timestamp-filename`, max 50MB per file). Tags, categories (one of five presets), background colors (from preset palette), priority levels (LOW/MED/HIGH), start dates, and due dates. Overdue items get a red exclamation point. The expanded task view shows everything about a task in a clean metadata panel that opens to the right.

**Key Deliverable:** Rich task metadata system with file attachments, visual overdue indicators, and the expanded task view fully functional.

---

### Phase 7: Settings & Customization

**Goal:** Make it yours

The settings panel (Cmd+,) slides in like the task creation popup, displaying options in a single column. Customize priority colors, category colors, background color palette, week start day (Sunday or Monday), default view on launch. Import/export settings for sharing across devices. First-launch onboarding offers a quick setup or sensible defaults.

**Key Deliverable:** Complete settings system with onboarding, save confirmation required, and settings sync via Supabase.

---

### Phase 8: Polish & Performance

**Goal:** Make it feel magical

This phase is all about feel. We fine-tune animation timing to be slower and smoother — creating that peaceful, floating quality. We implement the undo stack (Cmd+Z for two hours of actions). We add the command palette (Cmd+K) for quick action search. We create the keyboard shortcut cheat sheet (Cmd+/) with searchable, categorized shortcuts. We optimize rendering for lists with 500+ items, implement virtual scrolling, and add the soft warnings when directories get too deep or too full.

**Key Deliverable:** A polished, performant application that feels as good as it looks, with every animation timed for calm confidence.

---

## Technical Excellence

### Why This Stack

- **React + TypeScript** — Type safety prevents bugs, functional components keep code clean
- **Supabase + PostgreSQL** — Real-time sync, robust relational data, built-in auth, infinite scalability
- **Tailwind CSS** — Utility-first styling allows rapid iteration while maintaining visual consistency
- **Zustand or Context** — Lightweight state management that doesn't get in the way

### Performance Targets

- Render 1000+ tasks per column without lag (virtual scrolling)
- Column navigation responds in < 50ms
- Smooth 60fps animations throughout
- Initial load under 2 seconds on broadband
- Real-time updates appear within 500ms

### Data Integrity

- Automatic backups via Supabase
- Two-hour undo window for all actions
- Row-level security prevents data leaks
- Optimistic updates with rollback on failure
- Graceful offline mode (future enhancement)

---

## Success Metrics

Flow succeeds when users feel:

- **Calm** — The interface never creates anxiety
- **Fast** — Keyboard shortcuts become second nature
- **Clear** — Spatial organization makes finding work effortless
- **In control** — Time-based visibility keeps overwhelm at bay
- **Peaceful** — Using the app is meditative, not stressful

**Quantitative metrics:**

- Time from thought to task created: < 5 seconds
- Keyboard shortcut adoption: > 80% of operations within one week
- User retention: Daily active usage after 30 days
- Task completion rate: Measurably higher than previous tools
- User-reported stress levels: Lower when using Flow vs alternatives

---

## Why Flow Will Win

- Most task managers assume more features equals more value. **Flow assumes the opposite.** Every feature must justify its existence by reducing friction, not adding options.
- Most task managers treat tasks as the atomic unit. **Flow recognizes that structure (directories) is equally important as action (tasks),** and makes both first-class.
- Most task managers are mouse-first with keyboard shortcuts bolted on. **Flow is keyboard-first** with mouse support as a convenience.
- Most task managers show you everything all the time. **Flow shows you what matters now,** hiding future work until it's ready for attention.
- Most productivity tools create anxiety through urgency. **Flow creates calm through clarity.**

---

## The Final Vision

Imagine opening your task manager and feeling peace instead of dread. Imagine seeing exactly what needs your attention today — not tomorrow's problems, not someday-maybe dreams — just today's work, organized spatially in a way that mirrors how you think.

Imagine pressing Cmd+N, typing "T" for task, entering a title, and pressing Enter — task created and filed exactly where you are in your project tree. No modals, no menus, no friction.

Imagine completing a task and watching it gently strike through, collapse, and settle to the bottom of its list, where it will fade away in six hours unless you need to reference it. No guilt, no clutter, just completion.

Imagine navigating your entire work landscape with just arrow keys, expanding directories with Enter, jumping between views with Cmd+A+L, filtering with Cmd+Shift+S — all without your hands leaving the keyboard.

**This is Flow. Task management that moves with you.**

*Simple. Spatial. Peaceful. Fast.*
