# Qatalink Freemium & Mobile — août 2026

## Plans
- Free: 20 articles/catalogue, 5 scans QR/jour, 10 commandes WhatsApp/jour.
- Starter: 4 900 F CFA/mois, 85 articles, scans et commandes WhatsApp illimités.
- Pro: 14 900 F CFA/mois, 250 articles, opérations Qatalink et équipe.
- Business: 29 900 F CFA/mois, articles illimités et outils avancés.

## Mobile
La PWA et l'application Capacitor démarrent sur `/mobile`. Un compte peut utiliser plusieurs espaces (Client, Pro, Équipe, Livreur) et conserve un accès principal modifiable depuis Abonnement.

## Impression
- Capacitor Android/iOS: pont natif ESC/POS selon compatibilité matérielle.
- PWA Android Chromium: Web Bluetooth BLE pour profils ESC/POS courants.
- iOS PWA: GPS web disponible, mais Web Bluetooth générique non disponible; utiliser Capacitor pour l'impression Bluetooth fiable.
