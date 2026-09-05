/** @type {import('next').NextConfig} */

/**
 * En-têtes de sécurité.
 *
 * Le site encaisse des paiements et détient des adresses de clients. Ces
 * en-têtes ne remplacent pas les contrôles côté serveur, déjà en place sur les
 * prix et sur l'accès à l'administration : ils ferment des voies d'attaque qui
 * ne passent pas par notre code, et qu'aucune vérification applicative ne peut
 * intercepter.
 */
const securityHeaders = [
  // Empêche d'afficher le site dans un cadre sur un autre domaine. Sans cela,
  // une page pirate peut le superposer, invisible, et faire cliquer le
  // visiteur sur « Payer » en lui faisant croire qu'il clique ailleurs.
  { key: 'X-Frame-Options', value: 'DENY' },

  // Interdit au navigateur de deviner le type d'un fichier. Une image
  // téléversée contenant du script serait sinon exécutable.
  { key: 'X-Content-Type-Options', value: 'nosniff' },

  // Ne transmet le chemin complet qu'à l'intérieur du site. Vers l'extérieur,
  // seul le domaine part : une adresse comme /checkout/success/CMD-2041 n'a
  // rien à faire dans les journaux d'un tiers.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },

  // Aucune page n'a besoin de la caméra ni du micro. La géolocalisation reste
  // permise : le tunnel de commande la propose pour situer la livraison.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=()' },

  // Impose HTTPS pour les visites suivantes, y compris si le visiteur tape
  // l'adresse sans le « s ».
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
]

const nextConfig = {
  reactStrictMode: true,
  // La version du serveur renseigne un attaquant sur les failles connues.
  poweredByHeader: false,
  images: {
    domains: ['qzwiypdanasiwqihajpv.supabase.co'],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

module.exports = nextConfig
