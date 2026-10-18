---
name: quiet-security
description: Design principles and tokens for the Quiet Security aesthetic in CipherChat. Dark-first charcoal surfaces, restrained emerald accents, precision typography, and zero-knowledge clarity.
---

# Quiet Security Design System & Doctrine

"Quiet Security" is an understated, privacy-first design language designed for serious portfolio and open-source applications. It rejects generic "AI SaaS dashboard" aesthetics (purple gradients, glowing neon borders, cartoon avatars, excessive rounded cards) in favor of high-craft, hardware-inspired digital precision reminiscent of Linear, Arc, and Signal.

## 1. Core Principles

1. **Restraint over Decoration**: No purple gradients, glowing card halos, or floating drop-shadows. Surfaces are grounded and calm.
2. **Charcoal Grounding**: Warm charcoal and carbon neutrals (`#0C0D0E`, `#131517`, `#1A1D20`) instead of saturated navy or blue-tinted dark modes.
3. **Restrained Emerald**: Color means something. Emerald (`#10B981`) is reserved exclusively for verified cryptographic state: authenticated devices, valid signatures, active end-to-end encryption, and online presence.
4. **Information Density with Breathing Room**: Compact, high-utility typography paired with generous structural padding. Labels are distinct and metadata is legible.
5. **State Completeness**: Every surface explicitly accounts for loading skeletons, reconnecting states, empty lists, offline indicators, and expired content.
6. **Interface Honesty**: Cryptographic assertions (ECDH P-256, AES-256-GCM) are backed by the actual runtime state—never claimed superficially.

## 2. Color Palette & Semantic Tokens

- **Background (Base)**: `#0B0C0E` / `hsl(220 14% 5%)` — deepest backdrop.
- **Surface 1 (Card/Sidebar)**: `#121417` / `hsl(220 13% 8%)` — primary navigation and containers.
- **Surface 2 (Elevated/Modals)**: `#181B1F` / `hsl(220 12% 11%)` — popovers, active items, and dialogs.
- **Surface 3 (Input/Hover)**: `#1F2328` / `hsl(220 12% 14%)` — input fields and subtle hover highlights.
- **Border**: `#262B30` / `rgba(255, 255, 255, 0.08)` — hairline crisp divisions.
- **Primary / Emerald Accent**: `#10B981` / `hsl(158 64% 45%)` — authentic security and verification.
- **Muted / Inactive**: `#717882` / `hsl(215 8% 48%)` — secondary labels and helper text.
- **Foreground / Primary Text**: `#F3F4F6` / `hsl(210 20% 96%)` — high-contrast readable copy.
- **Warning / Ephemeral**: `#F59E0B` — disappearing timers and view limits.
- **Destructive / Expired**: `#F43F5E` — revoked keys and expired messages.

## 3. Typography & Hierarchy

- **Font Family**: Modern system UI stack with tabular figures for timestamps and monospace for fingerprints.
- **Monospace**: `font-mono text-xs tracking-wider uppercase` for fingerprint hashes, public keys, and cryptographic tags.
- **Scale**:
  - Headers: `text-xl sm:text-2xl font-semibold tracking-tight`
  - Subheaders / Navigation: `text-sm font-medium`
  - Body: `text-sm leading-relaxed`
  - Badges & Timestamps: `text-[10px] sm:text-[11px] font-mono`

## 4. Interaction & Motion

- **Transitions**: Fast, subtle micro-interactions (`duration-150 ease-out`).
- **Focus States**: High-visibility focus rings (`focus-visible:ring-1 focus-visible:ring-emerald-500/70 focus-visible:outline-none`).
- **Reduced Motion**: Respects `@media (prefers-reduced-motion: reduce)`.
