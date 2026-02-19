'use client'

import Link from 'next/link'
import { useState } from 'react'
import { HardHat, Menu, X } from 'lucide-react'

const COLORS = {
  primary: '#E30613',
  dark: '#1D1D1B',
  light: '#F8F8F8'
}

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '#pricelist', label: 'Katalog Paket' },
]

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-100" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 flex items-center justify-center rounded-sm" style={{ backgroundColor: COLORS.primary }}>
                <HardHat color="white" size={24} />
              </div>
              <span className="font-bold text-2xl tracking-tight" style={{ color: COLORS.dark }}>Kokohin</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-8 items-center font-semibold text-sm tracking-wide">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-[#E30613] transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="#kalkulator"
              className="text-white px-5 py-2.5 rounded-md shadow-sm"
              style={{ backgroundColor: COLORS.primary }}
            >
              Simulasi Harga
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 py-4">
            <div className="flex flex-col space-y-4 px-4">
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="font-semibold py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="#kalkulator"
                className="text-white px-5 py-2.5 rounded-md shadow-sm text-center font-semibold"
                style={{ backgroundColor: COLORS.primary }}
                onClick={() => setIsMenuOpen(false)}
              >
                Simulasi Harga
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
