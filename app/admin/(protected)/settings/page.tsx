'use client'

import { useState, useEffect, useRef } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/Button'
import { useAdminAuth } from '@/hooks/useAdminAuth'

export default function AdminSettings() {
  const { user } = useAdminAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [bannerUrl, setBannerUrl] = useState<string | null>(null)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [bannerError, setBannerError] = useState('')
  const [bannerSuccess, setBannerSuccess] = useState(false)

  const [email, setEmail] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [emailSuccess, setEmailSuccess] = useState(false)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  useEffect(() => {
    if (user?.email) setEmail(user.email)
  }, [user])

  useEffect(() => {
    const fetchBanner = async () => {
      const supabase = getSupabaseClient()
      const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'homepage_banner_url')
        .maybeSingle()

      setBannerUrl(data?.value || null)
    }
    fetchBanner()
  }, [])

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setBannerError('')
    setBannerSuccess(false)

    if (!file.type.startsWith('image/')) {
      setBannerError('Le fichier doit être une image')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setBannerError('L\'image dépasse 5 Mo')
      return
    }

    setUploadingBanner(true)
    try {
      const supabase = getSupabaseClient()
      const ext = file.name.split('.').pop()
      const path = `banners/${crypto.randomUUID()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(path, file)
      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('product-images').getPublicUrl(path)

      const { error: saveError } = await supabase
        .from('site_settings')
        .upsert({ key: 'homepage_banner_url', value: data.publicUrl, updated_at: new Date().toISOString() })
      if (saveError) throw saveError

      setBannerUrl(data.publicUrl)
      setBannerSuccess(true)
      setTimeout(() => setBannerSuccess(false), 2000)
    } catch (err: any) {
      setBannerError(err.message || 'Erreur lors de l\'envoi de la bannière')
    } finally {
      setUploadingBanner(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemoveBanner = async () => {
    setBannerError('')
    try {
      const supabase = getSupabaseClient()
      const { error: saveError } = await supabase
        .from('site_settings')
        .upsert({ key: 'homepage_banner_url', value: null, updated_at: new Date().toISOString() })
      if (saveError) throw saveError
      setBannerUrl(null)
    } catch (err: any) {
      setBannerError(err.message || 'Erreur lors de la suppression')
    }
  }

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailError('')
    setEmailSuccess(false)

    if (!email || email === user?.email) {
      setEmailError('Veuillez saisir un nouvel e-mail')
      return
    }

    setEmailLoading(true)
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.auth.updateUser({ email })
      if (error) throw error
      setEmailSuccess(true)
    } catch (err: any) {
      setEmailError(err.message || 'Erreur lors du changement d\'e-mail')
    } finally {
      setEmailLoading(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess(false)

    if (newPassword.length < 6) {
      setPasswordError('Le mot de passe doit contenir au moins 6 caractères')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas')
      return
    }

    setPasswordLoading(true)
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setPasswordSuccess(true)
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setPasswordError(err.message || 'Erreur lors du changement de mot de passe')
    } finally {
      setPasswordLoading(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="font-serif font-semibold text-3xl text-[#1A1A1A] mb-1">Réglages</h1>
        <p className="text-[#8A8579]">Personnalisation du site et sécurité du compte admin</p>
      </div>

      {/* Bannière homepage */}
      <div className="bg-white rounded-lg border border-[#E4DDCF] p-6">
        <h2 className="font-serif font-semibold text-xl text-[#1A1A1A] mb-1">Bannière de la page d&apos;accueil</h2>
        <p className="text-sm text-[#8A8579] mb-4">
          Cette image s&apos;affiche en grand format sur la page d&apos;accueil, au-dessus du catalogue. Format recommandé : image large (ratio proche de 3:1, ex. 1600×530 px), JPG ou PNG, 5 Mo max.
        </p>

        {bannerError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">{bannerError}</div>
        )}
        {bannerSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4 text-sm font-semibold">
            ✓ Bannière mise à jour
          </div>
        )}

        {bannerUrl ? (
          <div className="mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={bannerUrl} alt="Bannière actuelle" className="w-full rounded-lg border border-[#E4DDCF] object-cover aspect-[3/1]" />
          </div>
        ) : (
          <div className="mb-4 aspect-[3/1] rounded-lg border-2 border-dashed border-[#E4DDCF] flex items-center justify-center text-[#8A8579] text-sm">
            Aucune bannière définie
          </div>
        )}

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploadingBanner}>
            {uploadingBanner ? 'Envoi...' : bannerUrl ? 'Remplacer l\'image' : 'Ajouter une image'}
          </Button>
          {bannerUrl && (
            <Button type="button" variant="outline" onClick={handleRemoveBanner} disabled={uploadingBanner}>
              Retirer
            </Button>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
      </div>

      {/* Compte admin */}
      <div className="bg-white rounded-lg border border-[#E4DDCF] p-6">
        <h2 className="font-serif font-semibold text-xl text-[#1A1A1A] mb-1">Compte administrateur</h2>
        <p className="text-sm text-[#8A8579] mb-6">Modifier l&apos;e-mail ou le mot de passe utilisés pour vous connecter au tableau de bord.</p>

        <form onSubmit={handleEmailChange} className="space-y-3 mb-8 pb-8 border-b border-[#E4DDCF]">
          <label className="block text-sm font-semibold text-[#1A1A1A]">Adresse e-mail</label>
          {emailError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{emailError}</div>}
          {emailSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-sm">
              ✓ Un e-mail de confirmation a été envoyé à la nouvelle adresse
            </div>
          )}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 border border-[#E4DDCF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E85D25]"
          />
          <Button type="submit" variant="primary" disabled={emailLoading}>
            {emailLoading ? 'Envoi...' : 'Mettre à jour l\'e-mail'}
          </Button>
        </form>

        <form onSubmit={handlePasswordChange} className="space-y-3">
          <label className="block text-sm font-semibold text-[#1A1A1A]">Nouveau mot de passe</label>
          {passwordError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{passwordError}</div>}
          {passwordSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-sm font-semibold">
              ✓ Mot de passe mis à jour
            </div>
          )}
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Au moins 6 caractères"
            required
            className="w-full px-4 py-2 border border-[#E4DDCF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E85D25]"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirmer le nouveau mot de passe"
            required
            className="w-full px-4 py-2 border border-[#E4DDCF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E85D25]"
          />
          <Button type="submit" variant="primary" disabled={passwordLoading}>
            {passwordLoading ? 'Envoi...' : 'Mettre à jour le mot de passe'}
          </Button>
        </form>
      </div>
    </div>
  )
}
