# Changelog

All notable changes to the **NIRALIX HRMS** platform are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.0] - 2026-11-16

### 🚀 Major Enterprise Release — "NIRALIX Cloud Architecture"

#### Added
- **Dynamic Organization Setup (`/onboarding`):**
  - Self-guided 3-step setup module allowing external companies to provision their own Super Admin and workspace.
  - Configurable **Employee ID Prefix** (e.g. `OA`, `NIR`, `TECH`).
  - Dynamic ID sequential engine: Super Admin receives `${Prefix}1101` and subsequent users automatically receive `${Prefix}1102`, `${Prefix}1103`, etc.
  - Review & Confirmation screen with comprehensive 11-module permission matrix.
- **Dual Authentication System (`/login`):**
  - **Passwordless Mobile OTP Login:** 6-digit individual box input with auto-focus, paste support, countdown timer, auto-expiry, and instant JWT issuance.
  - **Admin Password Login:** Secure authentication for administrators and managers via Employee ID or Email.
- **Personal Dossier & KYC Repository:**
  - Expanded employee profile with Aadhaar Card, PAN Card, Voter ID, Passport Number, Blood Group, Emergency Contact, and Parents Details.
  - Document vault attachment upload and verification tracking.
- **Official HR Letters Module (`/letters`):**
  - Master template generator for Super Admin.
  - Automated PDF rendering for **Offer Letter**, **Appointment Letter**, and **Experience Letter**.
  - One-click employee self-service PDF downloads.
- **Architecture & Deployment Documentation:**
  - Added [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) defining the immutable visual design system.
  - Added [API_ARCHITECTURE.md](./API_ARCHITECTURE.md) documenting all 17 REST modules, database schema, and security flows.
  - Added `.github/workflows/ci-cd.yml` providing full automated GitHub Actions CI/CD pipelines.

#### Changed
- **Rebranding to NIRALIX HRMS:**
  - Full application rebrand from previous working title to **NIRALIX HRMS**.
  - Modern interlocking **N** monogram brand emblem designed and implemented across all views.
  - Official contact details updated to `harigaran925@gmail.com` and address to `Nilgiris, Tamil Nadu, India`.
- **Design System Overhaul (Image 1 Standard):**
  - Transitioned the entire global canvas to **Cool Frosty Ice-Blue Sky (`#E7EEF6`)** layered with ambient radial glow orbs (`#C8D9E6` and `#D8E7F5`).
  - Replaced all warm beige/brownish cream surfaces (`#F5EFEB`).
  - Standardized frosted glass surfaces with high-blur (`backdrop-filter: blur(24px)`), reflective borders, and inner glow.
  - Updated all primary buttons to the Master Button Specification (`linear-gradient(135deg, #304358 0%, #557A8B 100%)`) with 1px border and soft shadow, matching the 'Clock In Now' master reference.
  - Permanently eliminated old warm beige/cream (`#F5EFEB`) across all modules, stylesheets, and pages.
- **Database Architecture:**
  - Migrated legacy data storage to robust, parameterized **PostgreSQL** with connection pooling.
  - Seeded 100 realistic enterprise employees for stress-testing and analytics visualization.

#### Removed
- **Permanently Removed Deprecated Modules:**
  - Removed "Id-card" category permanently per enterprise requirements.
  - Removed "Petrol" expense module from navigation, models, and endpoints.

#### Fixed
- Fixed runtime error: `ReferenceError: Award is not defined` in `Sidebar.tsx`.
- Fixed TypeScript build issue with `flexShrink` style attributes.
- Fixed responsive mobile navigation drawer layout and hamburger toggling.
- Fixed desktop alignment on `/home/adduser` ensuring full responsive grid stretching from right to left.

---

## [1.2.0] - 2026-10-15

### Added
- Real-time attendance punch-in / punch-out with geofencing notes.
- Automatic absent-marking background cron jobs running at 23:59 daily.
- Interactive organization chart hierarchy tree rendering.
- Monthly salary disbursement and automated PDF payslip generation.

---

## [1.0.0] - 2026-05-19

### Initial Release
- Initial prototype and core HRMS endpoints.
- Basic user creation and password login.
