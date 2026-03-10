# WhatsApp Admin Style Guide

## 1. Core Principles
- **Brand Alignment**: Strict adherence to Kokohin's brand colors (Red `#E30613`, Black `#1D1D1B`).
- **Efficiency**: Max 2 clicks to access any core feature.
- **Clarity**: High contrast, legible typography (Montserrat), and generous whitespace.
- **Feedback**: Immediate visual feedback for all interactions (hover, active, loading).

## 2. Color Palette

### Primary Colors
- **Primary Red**: `#E30613` (Used for CTAs, Unread Badges, Active States, Outbound Accents)
- **Primary Black**: `#1D1D1B` (Primary Text, Headings)

### Neutral Colors
- **Background**: `#f4f5f7` (App Background, Loading Screens)
- **Surface**: `#ffffff` (Cards, Chat Window, Sidebar)
- **Border**: `#e5e7eb` (Dividers, Inputs)
- **Text Secondary**: `#6b7280` (Timestamps, Subtitles)

### Semantic Colors
- **Success**: `#10b981` (Status: Working)
- **Error**: `#ef4444` (Status: Disconnected, Failed)
- **Warning**: `#f59e0b` (Status: Syncing)

## 3. Typography
- **Font Family**: `font-sans` (Montserrat)
- **Headings**: `font-bold` or `font-light` depending on context (e.g., "Kokohin WhatsApp Center" is Light).
- **Body**: `text-sm` or `text-base` for readability.
- **Metadata**: `text-xs` or `text-[10px]` for timestamps.

## 4. Components

### Sidebar (Contact List)
- **Width**: 400px fixed.
- **Item Height**: 72px fixed.
- **Active State**: `bg-red-50/50` with Red text accent.
- **Hover State**: `bg-gray-50`.
- **Avatar**: Circular, 49x49px.

### Chat Window
- **Background**: `#f8f9fb` (Clean, no distracting patterns).
- **Header**: 59px height, White background, shadow-sm.
- **Input Area**: White background, top border, rounded input field.

### Message Bubbles
- **Outbound (Agent)**: 
  - Background: `bg-red-50` (`#FEF2F2`)
  - Text: `#1D1D1B`
  - Border: `border-red-100`
  - Status Ticks: `#E30613` (Read/Delivered)
- **Inbound (Customer)**: 
  - Background: `bg-white`
  - Text: `#1D1D1B`
  - Border: `border-gray-100`

## 5. Layout Structure
- **Full Screen**: `h-screen w-screen` (Independent Window).
- **Two Column**: Sidebar (Left) + Main Content (Right).
- **Responsive**: Sidebar becomes drawer on mobile (though primarily desktop-focused for admin).

## 6. Interaction States
- **Loading**: Spinner color `#E30613`.
- **Buttons**:
  - Primary: `bg-[#E30613] text-white hover:bg-[#c0000f]`
  - Secondary/Icon: `text-gray-500 hover:bg-gray-100 hover:text-[#E30613]`

## 7. Accessibility
- Ensure sufficient contrast for red text on light backgrounds.
- Use `aria-label` for icon-only buttons.
- Support keyboard navigation for chat list and input.
