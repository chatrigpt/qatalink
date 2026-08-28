# Qatalink Pro — application native Capacitor

## Objectif

Qatalink Pro embarque le site professionnel Qatalink dans une application Android/iOS Capacitor. Le code métier, Supabase, le point de vente, les commandes et les tickets restent communs avec qatalink.com, tandis que les fonctions sensibles au navigateur passent par des API natives.

Fonctions natives intégrées dans ce socle :

- GPS natif via `@capacitor/geolocation` pour les pages livreur et les autres écrans qui utilisent `navigator.geolocation` ;
- ouverture des liens `qatalink://...` et des liens universels Qatalink dans l'application ;
- impression thermique ESC/POS 58 mm directement depuis le point de vente via Bluetooth ;
- réutilisation du formateur de ticket 32 colonnes déjà présent dans `lib/escpos-printer.ts`.

## Initialisation locale

```bash
npm install
npm run cap:add:android
npm run cap:add:ios
npm run cap:sync
```

Puis :

```bash
npm run cap:open:android
npm run cap:open:ios
```

Le shell natif ouvre `https://qatalink.com/dashboard`. Les routes telles que `/livreur/<token>` restent les mêmes et le bridge natif remplace automatiquement la géolocalisation Web par celle du téléphone.

## Permissions GPS

### iOS

Ajouter/valider dans `ios/App/App/Info.plist` :

- `NSLocationWhenInUseUsageDescription` : « Qatalink utilise votre position pour transmettre le trajet de livraison au client. »
- `NSLocationAlwaysAndWhenInUseUsageDescription` uniquement si le suivi en arrière-plan est activé plus tard.

Le socle actuel fait du suivi natif fiable lorsque l'application est active. Le suivi permanent écran verrouillé/arrière-plan doit être ajouté comme étape distincte avec les modes Background Location et la politique App Store correspondante.

### Android

Capacitor Geolocation gère les permissions de localisation. Vérifier `ACCESS_COARSE_LOCATION` et `ACCESS_FINE_LOCATION` après `cap sync`.

## Imprimantes thermiques 58 mm

Le POS Qatalink possède déjà des boutons « Connecter imprimante » et d'impression. Dans un navigateur mobile, l'ancien fallback partage une image du ticket. Dans Qatalink Pro, le bridge expose un port série synthétique relié au plugin Bluetooth natif ; le même code ESC/POS est envoyé directement à l'imprimante.

Le format actuel est optimisé pour les imprimantes 58 mm / 32 caractères par ligne.

### Android

Les imprimantes ESC/POS Bluetooth Classic très répandues sont prises en charge par le plugin. Android 12+ nécessite `BLUETOOTH_SCAN` et `BLUETOOTH_CONNECT`. Si un constructeur exige un code d'appairage (souvent 0000 ou 1234), l'appairage doit être réalisé au niveau Android avant la connexion Qatalink.

### iPhone / iPad

iOS n'expose pas le Bluetooth Classic SPP générique comme Android. Qatalink Pro doit donc utiliser une imprimante compatible BLE/CoreBluetooth ou MFi/SDK constructeur. Les modèles BLE visibles par le plugin peuvent être utilisés ; un modèle 58 mm uniquement Bluetooth Classic peut fonctionner sur Android tout en restant invisible sur iPhone.

## Deep links livreur

Le bridge comprend :

- `qatalink://livreur/<token>` → `/livreur/<token>` ;
- `https://qatalink.com/livreur/<token>` lorsque les Universal Links/App Links sont associés à l'application.

La publication finale doit ajouter les fichiers d'association Apple/Android et les entitlements/domaines correspondants afin que les liens HTTPS ouvrent automatiquement Qatalink Pro lorsqu'elle est installée.

## Sécurité

Aucune clé Supabase service-role n'est embarquée. L'application affiche le frontend public/authentifié existant et appelle les API Qatalink HTTPS. Les tokens livreur restent ceux du backend existant.
