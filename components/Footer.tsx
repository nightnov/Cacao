'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Facebook, Instagram, Youtube } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import { CATEGORIES } from '@/lib/categories'

interface SocialLinks {
  facebook?: string
  instagram?: string
  tiktok?: string
  youtube?: string
}

export function Footer() {
  const [social, setSocial] = useState<SocialLinks>({})

  useEffect(() => {
    const fetchSocial = async () => {
      try {
        const supabase = getSupabaseClient()
        const { data } = await supabase
          .from('site_settings')
          .select('key, value')
          .in('key', ['social_facebook', 'social_instagram', 'social_tiktok', 'social_youtube'])

        const map = Object.fromEntries((data || []).map(row => [row.key, row.value]))
        setSocial({
          facebook: map.social_facebook || undefined,
          instagram: map.social_instagram || undefined,
          tiktok: map.social_tiktok || undefined,
          youtube: map.social_youtube || undefined
        })
      } catch (err) {
        console.error('Erreur chargement réseaux sociaux:', err)
      }
    }
    fetchSocial()
  }, [])

  return (
    <footer className="bg-white border-t border-[#E4DDCF] mt-20">
      {/* Main footer content */}
      <div className="max-w-7xl mx-auto px-10 py-12 grid grid-cols-1 md:grid-cols-4 gap-12 mb-8">
        {/* Branding */}
        <div>
          <Link href="/" className="font-serif font-bold text-2xl text-[#1A1A1A] hover:opacity-80">
            Cacao
          </Link>
          <p className="text-sm text-[#56534C] mt-4 leading-relaxed">
            Ordinateurs de qualité à prix justes, livrés partout en Côte d&apos;Ivoire.
          </p>
          {(social.facebook || social.instagram || social.tiktok || social.youtube) && (
            <div className="flex items-center gap-3 mt-5">
              {social.facebook && (
                <a href={social.facebook} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-[#FBF6EE] flex items-center justify-center text-[#1A1A1A] hover:text-[#FF6600] transition-colors">
                  <Facebook size={15} />
                </a>
              )}
              {social.instagram && (
                <a href={social.instagram} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-[#FBF6EE] flex items-center justify-center text-[#1A1A1A] hover:text-[#FF6600] transition-colors">
                  <Instagram size={15} />
                </a>
              )}
              {social.tiktok && (
                <a href={social.tiktok} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-[#FBF6EE] flex items-center justify-center text-[#1A1A1A] hover:text-[#FF6600] transition-colors">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12.5 2h3.2c.2 1.6 1.1 3 2.4 3.9 1 .7 2.1 1 3.4 1.1v3.3c-1.7 0-3.3-.5-4.7-1.4v7.2c0 3.5-2.9 6.4-6.4 6.4S3.9 19.6 3.9 16.1c0-3.4 2.7-6.2 6.1-6.4v3.3c-1.6.2-2.8 1.6-2.8 3.1 0 1.7 1.4 3.1 3.1 3.1s3.1-1.4 3.1-3.1V2z"/></svg>
                </a>
              )}
              {social.youtube && (
                <a href={social.youtube} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-[#FBF6EE] flex items-center justify-center text-[#1A1A1A] hover:text-[#FF6600] transition-colors">
                  <Youtube size={15} />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Produits */}
        <div>
          <h3 className="font-semibold text-[#1A1A1A] mb-5">Produits</h3>
          <ul className="space-y-3">
            {CATEGORIES.map(cat => (
              <li key={cat.value}>
                <Link href={`/products?category=${cat.value}`} className="text-sm text-[#56534C] hover:text-[#FF6600] transition-colors">
                  {cat.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Support */}
        <div>
          <h3 className="font-semibold text-[#1A1A1A] mb-5">Support</h3>
          <ul className="space-y-3">
            <li>
              <Link href="/faq" className="text-sm text-[#56534C] hover:text-[#FF6600] transition-colors">
                FAQ
              </Link>
            </li>
            <li>
              <Link href="/contact" className="text-sm text-[#56534C] hover:text-[#FF6600] transition-colors">
                Contact
              </Link>
            </li>
            <li>
              <Link href="/about" className="text-sm text-[#56534C] hover:text-[#FF6600] transition-colors">
                À propos
              </Link>
            </li>
          </ul>
        </div>

        {/* Légal */}
        <div>
          <h3 className="font-semibold text-[#1A1A1A] mb-5">Légal</h3>
          <ul className="space-y-3">
            <li>
              <Link href="/legal/terms" className="text-sm text-[#56534C] hover:text-[#FF6600] transition-colors">
                Conditions d&apos;utilisation
              </Link>
            </li>
            <li>
              <Link href="/legal/privacy" className="text-sm text-[#56534C] hover:text-[#FF6600] transition-colors">
                Politique de confidentialité
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom footer */}
      <div className="border-t border-[#E4DDCF] px-10 py-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-[#8A8579]">
          <p>© 2026 Cacao. Tous droits réservés.</p>
          <p>Abidjan, Côte d&apos;Ivoire · Wave · Orange Money · MTN Money · Moov Money · Carte bancaire</p>
        </div>
      </div>
    </footer>
  )
}
