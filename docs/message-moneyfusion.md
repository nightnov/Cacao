# Message à envoyer au support MoneyFusion

À copier tel quel. Remplacez seulement ce qui est entre crochets.

---

**Objet : Vérification de l'authenticité des notifications de paiement (webhook)**

Bonjour,

Je suis [votre nom], responsable de la boutique en ligne CACAO
(https://cacao-ivory.vercel.app), intégrée à MoneyFusion depuis [mois/année].
Mon identifiant marchand est [votre identifiant].

L'intégration fonctionne : les paiements aboutissent et je reçois bien les
notifications sur mon URL de retour. J'ai cependant une question sur la
sécurité de cette étape, et je n'ai pas trouvé la réponse dans la
documentation.

Aujourd'hui, quand mon site reçoit une notification m'annonçant qu'une
commande est payée, il n'a aucun moyen de prouver que ce message vient
réellement de vous. Il se fie à l'adresse d'où le message arrive. Or une
adresse peut être imitée. Concrètement, si quelqu'un découvrait l'adresse de
ma page de notification, il pourrait lui envoyer un faux message et faire
passer une commande en « payée » sans qu'aucun argent n'ait été versé.

Deux solutions existent habituellement chez les prestataires de paiement, et
l'une ou l'autre me suffirait :

1. **Une signature sur la notification.** Vous calculez une empreinte du
   message avec une clé secrète partagée, et vous la joignez dans un en-tête.
   Je refais le calcul de mon côté : si les deux empreintes diffèrent, je
   rejette le message. Si vous proposez cela, merci de m'indiquer le nom de
   l'en-tête, l'algorithme utilisé, et où récupérer ma clé secrète.

2. **Une adresse d'API pour revérifier une transaction.** Dès que je reçois
   une notification, j'appelle cette adresse avec l'identifiant de la
   transaction, et c'est votre réponse à vous qui fait foi, pas le message
   reçu. Si vous proposez cela, merci de m'indiquer l'URL exacte, la méthode
   (GET ou POST), le mode d'authentification, et un exemple de réponse.

Si aucune des deux n'est disponible aujourd'hui, dites-le moi franchement :
je préfère connaître la limite et adapter mes contrôles côté boutique plutôt
que de croire à une protection qui n'existe pas.

Merci d'avance pour votre retour.

Cordialement,
[votre nom]
[votre téléphone]
[votre email]

---

## Quoi faire de la réponse

- **Ils donnent une signature** → transmettez-moi le nom de l'en-tête,
  l'algorithme et l'endroit où trouver la clé. Je branche la vérification et
  la clé va dans les variables Vercel, jamais dans le code.
- **Ils donnent une URL de vérification** → transmettez-la moi avec le mode
  d'authentification. Je fais en sorte que la notification ne serve plus que
  de sonnette : c'est notre appel à eux qui décidera du passage en payé.
- **Ils n'ont ni l'un ni l'autre** → on se rabat sur des contrôles de notre
  côté : montant attendu, commande non déjà payée, notification récente.
  Moins solide, mais mieux que rien, et il faut le savoir.
