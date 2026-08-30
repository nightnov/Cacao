'use client'

import Link from 'next/link'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  MessageSquare,
  Truck,
  Users,
  Settings,
  LucideIcon
} from 'lucide-react'

interface GuideSection {
  id: string
  label: string
  icon: LucideIcon
  href?: string
  badge?: string
  content: { title: string; body: string }[]
}

const sections: GuideSection[] = [
  {
    id: 'dashboard',
    label: 'Tableau de bord',
    icon: LayoutDashboard,
    href: '/admin',
    content: [
      {
        title: 'Les 4 cartes en haut',
        body: 'Clients, Commandes, Revenus du mois et Produits. Le badge vert ↑ ou rouge ↓ à côté du chiffre compare la valeur actuelle à celle du début du mois — c\'est une vraie mesure, pas une estimation.'
      },
      {
        title: 'Le graphique "Revenus mensuels"',
        body: 'Additionne le total des commandes (hors annulées/remboursées) mois par mois. Le menu déroulant en haut à droite permet de changer d\'année.'
      },
      {
        title: '"Recherches sans résultat" et "Produits les plus vus"',
        body: 'Deux encarts qui montrent ce que les clients cherchent sans le trouver (pistes pour de futurs produits à ajouter) et quels produits sont les plus consultés (pour savoir ce qui marche).'
      },
      {
        title: 'Dernières commandes et Actions rapides',
        body: 'Un aperçu des 5 dernières commandes, et des raccourcis vers les actions les plus fréquentes (ajouter un produit, gérer la livraison, etc.).'
      }
    ]
  },
  {
    id: 'products',
    label: 'Produits',
    icon: Package,
    href: '/admin/products',
    content: [
      {
        title: 'Ajouter ou modifier un produit',
        body: 'Bouton "Ajouter produit" en haut, ou icône crayon sur une ligne du tableau pour modifier. Le formulaire couvre photos, vidéo, nom, description, catégorie, prix, disponibilité, spécifications techniques, tags, fournisseur, variantes, statut et référencement (SEO).'
      },
      {
        title: 'Photos des produits',
        body: 'Utilisez des images carrées (ratio 1:1, idéalement 800×800 px) pour que le catalogue soit uniforme. La première photo ajoutée devient l\'image principale. 5 Mo max par photo.'
      },
      {
        title: 'Importer depuis Jumia ou une autre plateforme',
        body: 'Dans la section "Fournisseur" du formulaire : collez l\'URL du produit fournisseur, puis remplissez le reste à la main (nom, prix, images, description) en vous aidant de la page fournisseur ouverte à côté. Le coût fournisseur peut aussi être renseigné pour suivre votre marge. Pas d\'import automatique : ces plateformes ne fournissent pas d\'accès pour ça, donc tout se fait via ce formulaire guidé.'
      },
      {
        title: 'Variantes (couleur, taille...)',
        body: 'Cochez "Ce produit a des variantes", ajoutez une ou plusieurs options avec leurs valeurs (ex. "Couleur: Noir, Rouge"), puis cliquez "Générer les combinaisons" — un tableau apparaît pour définir prix, stock, SKU et image de chaque combinaison. Le prix et la disponibilité du produit sont alors calculés automatiquement à partir des variantes.'
      },
      {
        title: 'Statut brouillon / actif',
        body: 'Un produit en "Brouillon" reste invisible sur le site public — pratique pour préparer une fiche sans la publier tout de suite. Passez-le en "Actif" quand il est prêt.'
      },
      {
        title: 'Prix barré (promotion)',
        body: 'Le champ "Ancien prix" est optionnel. Si vous le remplissez avec un montant supérieur au prix actuel, le produit s\'affiche avec le prix actuel en vert et l\'ancien prix barré en gris partout sur le site.'
      },
      {
        title: 'Référencement (SEO)',
        body: 'Titre SEO et meta description optionnels, utilisés pour l\'affichage dans les résultats Google. Si laissés vides, le nom et la description du produit servent de repli.'
      },
      {
        title: 'Disponibilité',
        body: 'En stock / En commande / Rupture — s\'affiche comme badge coloré sur la fiche produit et dans le catalogue. Calculée automatiquement pour les produits à variantes.'
      },
      {
        title: 'Supprimer un produit',
        body: 'Icône poubelle sur la ligne du tableau. Une confirmation est demandée avant suppression définitive.'
      }
    ]
  },
  {
    id: 'orders',
    label: 'Commandes',
    icon: ShoppingCart,
    href: '/admin/orders',
    content: [
      {
        title: 'Filtrer par statut',
        body: 'Les boutons en haut (En attente, Confirmée, Préparation, Expédiée, Livrée, Annulée, Remboursée) filtrent la liste. "Toutes" réaffiche tout.'
      },
      {
        title: 'Voir le détail d\'une commande',
        body: 'Icône œil sur la ligne : ouvre les articles commandés, l\'adresse de livraison et permet de changer le statut de la commande (par exemple passer de "Confirmée" à "Expédiée").'
      },
      {
        title: 'Pagination',
        body: '10 commandes par page. Les numéros de page et les flèches en bas du tableau permettent de naviguer.'
      }
    ]
  },
  {
    id: 'messages',
    label: 'Messages',
    icon: MessageSquare,
    href: '/admin/messages',
    content: [
      {
        title: 'Répondre aux clients',
        body: 'Chaque client a un seul fil de discussion. La liste à gauche montre les conversations, cliquez sur une pour voir et répondre aux messages. Un badge orange indique les messages non lus.'
      },
      {
        title: 'Origine des messages',
        body: 'Les clients peuvent écrire depuis leur compte ou directement depuis une fiche produit ("Une question sur ce produit ?") — le nom du produit concerné apparaît alors dans le message.'
      }
    ]
  },
  {
    id: 'shipping',
    label: 'Frais de livraison',
    icon: Truck,
    href: '/admin/shipping',
    content: [
      {
        title: 'Gérer les villes et tarifs',
        body: 'Chaque ville a un tarif de livraison fixe en FCFA. "Ajouter tarif" pour une nouvelle ville, icônes crayon/poubelle pour modifier ou supprimer. Ces tarifs apparaissent automatiquement au moment du paiement, selon la ville choisie par le client.'
      }
    ]
  },
  {
    id: 'customers',
    label: 'Clients',
    icon: Users,
    href: '/admin/customers',
    content: [
      {
        title: 'Liste des clients',
        body: 'Affiche uniquement les clients ayant passé au moins une commande, avec leur nombre de commandes et le total dépensé. La barre de recherche filtre par nom ou email.'
      }
    ]
  },
  {
    id: 'settings',
    label: 'Réglages',
    icon: Settings,
    href: '/admin/settings',
    content: [
      {
        title: 'Bannière de la page d\'accueil',
        body: 'Image large affichée au-dessus du catalogue sur la page d\'accueil. Format recommandé : ratio 3:1 (ex. 1600×530 px). "Remplacer l\'image" pour la changer, "Retirer" pour la masquer.'
      },
      {
        title: 'Changer l\'e-mail ou le mot de passe admin',
        body: 'Deux formulaires séparés en bas de la page. Le changement d\'e-mail envoie un lien de confirmation à la nouvelle adresse.'
      }
    ]
  }
]

export default function AdminGuide() {
  return (
    <div className="max-w-4xl">
      <h1 className="font-serif font-semibold text-4xl text-ink mb-2">Guide du dashboard</h1>
      <p className="text-ink-dim mb-10">Comment utiliser chaque partie de l&apos;administration Cacao.</p>

      {/* Table of contents */}
      <div className="bg-bg-panel rounded-2xl border border-border p-6 mb-10">
        <p className="text-xs font-semibold text-ink-dimmer uppercase mb-3">Sommaire</p>
        <div className="flex flex-wrap gap-2">
          {sections.map(s => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="px-3 py-1.5 bg-bg-raised hover:bg-gold/10 hover:text-gold rounded-full text-sm text-ink-dim transition-colors"
            >
              {s.label}
            </a>
          ))}
        </div>
      </div>

      <div className="space-y-8">
        {sections.map(section => {
          const Icon = section.icon
          return (
            <div key={section.id} id={section.id} className="bg-bg-panel rounded-2xl border border-border p-6 scroll-mt-8">
              <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
                    <Icon size={18} className="text-gold" />
                  </div>
                  <h2 className="font-serif font-semibold text-xl text-ink">{section.label}</h2>
                </div>
                {section.badge ? (
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-gold/10 text-gold">
                    {section.badge}
                  </span>
                ) : section.href ? (
                  <Link href={section.href} className="text-sm text-gold font-semibold hover:underline">
                    Ouvrir →
                  </Link>
                ) : null}
              </div>

              <div className="space-y-4">
                {section.content.map(item => (
                  <div key={item.title} className="pb-4 border-b border-border last:border-b-0 last:pb-0">
                    <p className="font-semibold text-sm text-ink mb-1">{item.title}</p>
                    <p className="text-sm text-ink-dim leading-relaxed">{item.body}</p>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
