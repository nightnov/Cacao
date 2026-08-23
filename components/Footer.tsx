'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Facebook, Instagram, Youtube, Star, Mail, MapPin, ShieldCheck } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import { CATEGORIES } from '@/lib/categories'

interface SocialLinks {
  facebook?: string
  instagram?: string
  tiktok?: string
  youtube?: string
}

const PAIEMENTS = ['Wave', 'Orange Money', 'MTN Money', 'Moov Money', 'Carte bancaire']

export function Footer() {
  const [social, setSocial] = useState<SocialLinks>({})
  const [rating, setRating] = useState<{ avg: number; count: number } | null>(null)

  useEffect(() => {
    const supabase = getSupabaseClient()

    const fetchSocial = async () => {
      try {
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

    // Note boutique : moyenne pondérée des avis réellement laissés.
    // Rien ne s'affiche tant qu'aucun avis n'existe.
    const fetchRating = async () => {
      try {
        const { data } = await supabase.from('product_ratings').select('avg_rating, review_count')
        const rows = data || []
        const count = rows.reduce((s: number, r: any) => s + (r.review_count || 0), 0)
        if (count > 0) {
          const weighted = rows.reduce((s: number, r: any) => s + (r.avg_rating || 0) * (r.review_count || 0), 0)
          setRating({ avg: weighted / count, count })
        }
      } catch {
        // silencieux : bloc purement complémentaire
      }
    }

    fetchSocial()
    fetchRating()
  }, [])

  const hasSocial = social.facebook || social.instagram || social.tiktok || social.youtube
  const socialLink = 'w-9 h-9 rounded-lg bg-[#2A2D31] border border-[#3E4247] flex items-center justify-center text-[#B3B8BE] hover:text-[#FDC700] hover:border-[#FDC700] transition-colors'
  const colLink = 'text-[13px] text-[#8E959D] hover:text-[#FDC700] transition-colors'

  return (
    <footer className="bg-[#1C2021] border-t border-[#35383C] mt-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-11 grid grid-cols-2 lg:grid-cols-[1.4fr,1fr,1fr,1fr] gap-8 lg:gap-10">
        {/* Marque */}
        <div className="col-span-2 lg:col-span-1">
          <Link href="/" className="font-display font-bold text-xl tracking-[3px] text-[#EEF2F7] hover:text-[#FDC700] transition-colors">
            CACAO
          </Link>
          <p className="text-[13px] text-[#8E959D] mt-3.5 leading-[1.65] max-w-xs">
            Ordinateurs portables, bureau, gaming et accessoires. Livraison suivie partout en Côte d&apos;Ivoire.
          </p>

          {rating && (
            <div className="flex items-center gap-2 mt-4">
              <Star size={15} className="fill-[#FDC700] text-[#FDC700]" />
              <span className="font-display text-[15px] text-[#EEF2F7] tabular-nums">
                {rating.avg.toFixed(1).replace('.', ',')}/5
              </span>
              <span className="text-[12px] text-[#8E959D]">
                ({rating.count} avis client{rating.count > 1 ? 's' : ''})
              </span>
            </div>
          )}

          {hasSocial && (
            <div className="flex items-center gap-2.5 mt-5">
              {social.facebook && (
                <a href={social.facebook} target="_blank" rel="noopener noreferrer" className={socialLink} aria-label="Facebook">
                  <Facebook size={16} />
                </a>
              )}
              {social.instagram && (
                <a href={social.instagram} target="_blank" rel="noopener noreferrer" className={socialLink} aria-label="Instagram">
                  <Instagram size={16} />
                </a>
              )}
              {social.tiktok && (
                <a href={social.tiktok} target="_blank" rel="noopener noreferrer" className={socialLink} aria-label="TikTok">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12.5 2h3.2c.2 1.6 1.1 3 2.4 3.9 1 .7 2.1 1 3.4 1.1v3.3c-1.7 0-3.3-.5-4.7-1.4v7.2c0 3.5-2.9 6.4-6.4 6.4S3.9 19.6 3.9 16.1c0-3.4 2.7-6.2 6.1-6.4v3.3c-1.6.2-2.8 1.6-2.8 3.1 0 1.7 1.4 3.1 3.1 3.1s3.1-1.4 3.1-3.1V2z" />
                  </svg>
                </a>
              )}
              {social.youtube && (
                <a href={social.youtube} target="_blank" rel="noopener noreferrer" className={socialLink} aria-label="YouTube">
                  <Youtube size={16} />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Rayons */}
        <div>
          <h3 className="font-display text-[13px] tracking-[1.4px] text-[#EEF2F7] mb-4">RAYONS</h3>
          <ul className="space-y-2.5">
            {CATEGORIES.map(cat => (
              <li key={cat.value}>
                <Link href={`/products?category=${cat.value}`} className={colLink}>{cat.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Aide */}
        <div>
          <h3 className="font-display text-[13px] tracking-[1.4px] text-[#EEF2F7] mb-4">AIDE</h3>
          <ul className="space-y-2.5">
            <li><Link href="/faq" className={colLink}>Questions fréquentes</Link></li>
            <li><Link href="/contact" className={colLink}>Nous contacter</Link></li>
            <li><Link href="/about" className={colLink}>À propos de CACAO</Link></li>
            <li><Link href="/account" className={colLink}>Suivre ma commande</Link></li>
            <li><Link href="/account/favorites" className={colLink}>Mes favoris</Link></li>
          </ul>
        </div>

        {/* Informations */}
        <div>
          <h3 className="font-display text-[13px] tracking-[1.4px] text-[#EEF2F7] mb-4">INFORMATIONS</h3>
          <ul className="space-y-2.5">
            <li><Link href="/legal/terms" className={colLink}>Conditions générales</Link></li>
            <li><Link href="/legal/privacy" className={colLink}>Confidentialité</Link></li>
            <li className="flex items-start gap-2 text-[13px] text-[#8E959D] pt-1">
              <MapPin size={14} className="text-[#FDC700] flex-shrink-0 mt-0.5" />
              Abidjan, Côte d&apos;Ivoire
            </li>
            <li className="flex items-start gap-2 text-[13px] text-[#8E959D]">
              <Mail size={14} className="text-[#FDC700] flex-shrink-0 mt-0.5" />
              <Link href="/contact" className="hover:text-[#FDC700] transition-colors">Écrire à l&apos;équipe</Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Moyens de paiement réellement acceptés */}
      <div className="border-t border-[#35383C]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-5 flex flex-wrap items-center gap-x-3 gap-y-2.5">
          <span className="flex items-center gap-2 text-[11.5px] font-bold text-[#EEF2F7] mr-1">
            <ShieldCheck size={15} className="text-[#FDC700]" /> PAIEMENT SÉCURISÉ
          </span>
          {PAIEMENTS.map(p => (
            <span key={p} className="text-[11.5px] text-[#B3B8BE] bg-[#2A2D31] border border-[#3E4247] rounded-md px-2.5 py-1">
              {p}
            </span>
          ))}
        </div>
      </div>

      <div className="border-t border-[#35383C]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-5 flex flex-col sm:flex-row justify-between items-center gap-3 text-[11.5px] text-[#6F767E]">
          <p>© 2026 CACAO. Tous droits réservés.</p>
          <p>Transactions traitées par MoneyFusion</p>
        </div>
      </div>
    </footer>
  )
}
