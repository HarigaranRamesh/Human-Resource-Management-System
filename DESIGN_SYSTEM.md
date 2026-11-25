# NIRALIX HRMS — Official Design System & UI Architecture
> **Core Principle: Clean, Non-Over-Designed Executive SaaS Architecture**  
> *Inspired by the clean, minimalist, high-contrast Ajio / Executive Enterprise aesthetic. High readability, data density without visual clutter, crisp 1px borders, and standard component alignment across all UIs.*

---

## 1. Visual Philosophy & Core Tenets

1. **Clean Solid Surfaces over Hazy Glass**:  
   Cards and content containers use pure crisp white (`#ffffff`) surfaces with 1px slate borders (`#e2e8f0`). No blurry translucent glass overlays, no floating radial-gradient background orbs, and no heavy drop-shadows.
2. **Deep Slate & Navy Authority**:  
   Deep Navy (`#2F4156` / `#2c4152`) powers headers, primary buttons, and authority accents. Headings use `#1e293b`, body text uses `#334155` / `#475569`, and helper labels use `#64748b`.
3. **Clean Canvas Background**:  
   The entire application canvas uses a calm, neutral soft slate background (`#f8fafc`).
4. **Crisp 1px Structural Borders**:  
   Elements rely on clean, subtle borders (`1px solid #e2e8f0` and `#f1f5f9`) rather than heavy multi-layer box shadows.
5. **Clear Semantic Badges**:  
   Status values use soft pastel fills with saturated high-contrast text and a 6px status dot.

---

## 2. Color Palette & Design Tokens

### 2.1 Primary & Neutral Tokens
| Token Name | Hex Code | Usage across the Application |
| :--- | :--- | :--- |
| `primary` | `#2F4156` / `#2c4152` | Primary buttons, active navigation, brand elements |
| `primary-hover` | `#1e293b` | Primary button hover states |
| `slate-teal` | `#567C8D` | Subtitles, secondary icons, field labels |
| `canvas-bg` | `#f8fafc` | Global application canvas background |
| `card-bg` | `#ffffff` | Solid cards, topbar, sidebar, table containers |
| `border-default` | `#e2e8f0` | 1px control and card borders |
| `border-light` | `#f1f5f9` | Table row dividers and inner separators |

### 2.2 Semantic Status Palette
| Status | Background | Text Color | Dot / Indicator | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Active / Approved / Present** | `#ecfdf5` | `#047857` | `#10b981` | Active employees, approved leaves, present status |
| **Pending / In Review / Warning** | `#fffbeb` | `#b45309` | `#f59e0b` | Pending approvals, probational records |
| **On Leave / Info / In Transit** | `#eff6ff` | `#1d4ed8` | `#3b82f6` | On leave records, training, progress |
| **Terminated / Absent / Danger** | `#fef2f2` | `#b91c1c` | `#ef4444` | Inactive/terminated accounts, absent records |

---

## 3. Standard UI Page Layout & Alignment

Every UI page across the web application (Employee Directory, Leave Approvals, Reports, Assets, Shifts, Salary, Settings) follows this exact alignment:

```tsx
<div className="page-container">
  {/* 1. Standard Page Header */}
  <PageHeader
    title="Page Title"
    subtitle="Contextual subtitle explaining the purpose of this screen"
    actions={
      <Button variant="primary" icon={<AddIcon size={16} />} onClick={...}>
        Action Button
      </Button>
    }
  />

  {/* 2. Optional Toolbar / Search Card */}
  <Card className="search-card" style={{ marginBottom: '1.25rem' }}>
    <form className="search-form" onSubmit={handleSearch}>
      <div className="search-input-wrap">
        <SearchIcon size={16} className="search-icon" />
        <input className="search-input" placeholder="Search..." ... />
      </div>
      <Button type="submit" variant="primary">Search</Button>
      {search && <Button type="button" variant="secondary" onClick={handleClear}>Clear</Button>}
    </form>
  </Card>

  {/* 3. Main Data Card with Responsive Table */}
  <Card>
    <div className="table-responsive">
      <table className="data-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Identifier</th>
            <th>Department</th>
            <th>Role</th>
            <th>Status</th>
            <th style={{ textAlign: 'center' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {/* Rows */}
        </tbody>
      </table>
    </div>

    {/* 4. Numbered / Standard Pagination Bar */}
    {totalPages > 1 && (
      <div className="pagination">
        <Button variant="secondary" size="sm" onClick={...}>‹ Prev</Button>
        <span className="page-info">Page {page} of {totalPages}</span>
        <Button variant="secondary" size="sm" onClick={...}>Next ›</Button>
      </div>
    )}
  </Card>

  {/* 5. Confirmation Dialogs */}
  <ConfirmDialog ... />
</div>
```

---

## 4. Component Rules

- **Buttons**:
  - `variant="primary"`: Solid Navy (`#2F4156`), white text, crisp 6px radius (`var(--radius-sm)`).
  - `variant="secondary"`: Solid white (`#ffffff`), 1px border (`#e2e8f0`), text `#334155`.
- **Tables**:
  - Headers (`th`): Uppercase tracked text (`letterSpacing: 0.05em`), `#64748b`, background `#f8fafc`, 1px bottom border `#e2e8f0`.
  - Rows (`td`): Crisp 1px bottom border `#f1f5f9`, smooth hover background `#f8fafc`.
- **Cards**:
  - Background `#ffffff`, border `1px solid #e2e8f0`, radius `10px` (`var(--radius)`), subtle `0 1px 3px rgba(0,0,0,0.04)` shadow.
- **Form Inputs**:
  - Background `#ffffff`, 1px border `#e2e8f0`, radius `6px`, focus outline ring `rgba(47, 65, 86, 0.08)`.
