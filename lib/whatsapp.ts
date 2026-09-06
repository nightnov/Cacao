/**
 * Messages WhatsApp prêts à envoyer, selon l'état réel de la commande.
 *
 * Le site n'envoie rien : il ouvre WhatsApp avec le texte déjà écrit, et c'est
 * vous qui appuyez sur envoyer. Meta interdit l'envoi automatique depuis un
 * compte ordinaire, et les outils qui le promettent font bannir le numéro.
 *
 * Le texte se déduit du statut plutôt que d'être choisi à la main. Un message
 * figé finit toujours par mentir : celui de la relance annonçait un impayé à
 * des clients qui avaient réglé, parce que personne ne regardait l'état de la
 * commande avant de l'envoyer.
 */

/** Un numéro ivoirien saisi « 07 00 00 00 00 » devient « 2250700000000 ». */
export function numeroWhatsapp(telephone: string | null | undefined): string | null {
  if (!telephone) return null
  const chiffres = telephone.replace(/\D/g, '')
  if (chiffres.length < 8) return null
  return chiffres.startsWith('225') ? chiffres : `225${chiffres}`
}

export interface MessagePret {
  cle: string
  libelle: string
  texte: string
}

/**
 * Les messages proposés pour une commande.
 *
 * Le code de livraison n'apparaît dans aucun d'eux, et ce n'est pas un oubli :
 * c'est le client qui le détient et le remet au livreur en échange du colis.
 * Le lui renvoyer par écrit au moment de la livraison viderait la preuve de
 * son sens.
 */
export function messagesPour({
  statut,
  numeroCommande,
  prenom,
}: {
  statut: string
  numeroCommande: string
  prenom?: string | null
}): MessagePret[] {
  const bonjour = prenom?.trim() ? `Bonjour ${prenom.trim()}` : 'Bonjour'
  const ref = `votre commande ${numeroCommande} sur CACAO`

  switch (statut) {
    case 'awaiting_quote':
      return [
        {
          cle: 'devis',
          libelle: 'Demander des précisions',
          texte:
            `${bonjour}, nous avons bien reçu ${ref}. Nous vérifions la disponibilité et nous ` +
            `revenons vers vous avec le montant exact.`,
        },
      ]

    case 'quoted':
      return [
        {
          cle: 'montant',
          libelle: 'Annoncer le montant',
          texte:
            `${bonjour}, le montant de ${ref} est confirmé. Vous le retrouvez dans « Mon compte », ` +
            `puis « Mes commandes », avec le bouton pour régler. Dites nous si cela vous convient.`,
        },
      ]

    case 'pending':
      return [
        {
          cle: 'relance',
          libelle: 'Relancer le paiement',
          texte:
            `${bonjour}, ${ref} est enregistrée mais le paiement n'a pas été finalisé. ` +
            `Souhaitez vous la terminer ?`,
        },
      ]

    case 'confirmed':
      return [
        {
          cle: 'confirmee',
          libelle: 'Confirmer la réception du paiement',
          texte:
            `${bonjour}, nous avons bien reçu le paiement de ${ref}. Nous la préparons et nous ` +
            `vous recontactons pour convenir de la livraison.`,
        },
      ]

    case 'preparing':
      return [
        {
          cle: 'preparation',
          libelle: 'Prévenir de la préparation',
          texte:
            `${bonjour}, ${ref} est en cours de préparation. Nous vous prévenons dès qu'elle part ` +
            `en livraison.`,
        },
      ]

    case 'shipped':
      return [
        {
          cle: 'enroute',
          libelle: 'Annoncer le colis en route',
          texte:
            `${bonjour}, ${ref} part en livraison. Gardez votre code de livraison : vous le donnez ` +
            `au livreur au moment où il vous remet le colis, jamais avant.`,
        },
        {
          cle: 'rendezvous',
          libelle: 'Convenir du rendez vous',
          texte:
            `${bonjour}, nous pouvons vous livrer ${ref} aujourd'hui. À quelle heure et à quelle ` +
            `adresse vous convient il ?`,
        },
      ]

    case 'delivered':
      return [
        {
          cle: 'merci',
          libelle: 'Remercier après livraison',
          texte:
            `${bonjour}, ${ref} vous a bien été remise. Merci de votre confiance. N'hésitez pas ` +
            `à nous écrire si quelque chose ne va pas.`,
        },
      ]

    case 'cancelled':
    case 'refunded':
      return [
        {
          cle: 'annulee',
          libelle: 'Informer de l annulation',
          texte: `${bonjour}, ${ref} a été annulée. Nous restons à votre disposition.`,
        },
      ]

    default:
      return [
        {
          cle: 'nouvelles',
          libelle: 'Donner des nouvelles',
          texte: `${bonjour}, nous vous écrivons au sujet de ${ref}.`,
        },
      ]
  }
}

/** Le lien qui ouvre WhatsApp avec le message déjà écrit. */
export function lienWhatsapp(numero: string, texte: string): string {
  return `https://wa.me/${numero}?text=${encodeURIComponent(texte)}`
}
