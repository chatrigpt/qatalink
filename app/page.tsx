import Image from 'next/image';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { ArrowRight, Check, ImageIcon, MessageCircle, Palette, QrCode, Smartphone, Sparkles } from 'lucide-react';

const demo='https://monadia-bucket.sfo3.cdn.digitaloceanspaces.com/WhatsApp%20Video%202026-07-24%20at%2015.56.05.mp4';
const demos=[['Restaurant','Menu interactif'],['Spa','Catalogue de services'],['Hôtel','Catalogue de chambres'],['Immobilier','Biens & demandes'],['Boutique','Catalogue produits'],['Restaurant','Commande WhatsApp']];
const faqItems=[
  ['Dois-je refaire mon QR quand je modifie mon menu ?','Non. Le QR pointe vers une adresse Qatalink permanente. Vous pouvez changer les prix, photos, descriptions, catégories, couleurs, promotions et même le thème sans réimprimer le QR.'],
  ['Puis-je vraiment créer mon menu à partir d’une simple photo ?','Oui. Vous pouvez importer une photo, une capture ou un scan. Qatalink structure automatiquement catégories, articles et prix, puis vous gardez la main pour corriger chaque élément avant et après publication.'],
  ['Et si mon menu est déjà sous forme de texte ?','Vous pouvez coller un texte massif avec catégories, articles et prix mélangés. Qatalink le transforme en structure modifiable. Vous pouvez aussi partir totalement de zéro.'],
  ['Que puis-je tester pendant les 24 heures gratuites ?','L’essai donne accès aux fonctionnalités de création et au mode interactif pendant 24 h : personnalisation, panier, QR, images, thèmes, layouts et publication. La date d’expiration est enregistrée côté serveur, pas seulement dans votre navigateur.'],
  ['Que se passe-t-il si je ne m’abonne pas après l’essai ?','Votre espace reste accessible, mais le catalogue public peut devenir indisponible lorsque l’essai expire. Vos données ne sont pas effacées : vous pouvez reprendre votre travail après activation d’une formule.'],
  ['Les changements sont-ils visibles immédiatement sur le lien déjà partagé ?','Oui. Quand vous enregistrez un article, une promotion, un thème ou un fond puis publiez, le même lien public utilise les nouvelles données. Il n’y a pas besoin de recréer le catalogue ou le QR.'],
  ['Puis-je personnaliser le design pour qu’il ressemble vraiment à ma marque ?','Oui. Vous pouvez choisir les couleurs du fond et du texte, utiliser un gradient, changer les polices, la casse, le gras, l’italique, le soulignement, les arrondis, les layouts et le cadre du logo. Vous pouvez aussi créer une palette harmonieuse à partir de votre logo ou d’une autre image.'],
  ['Puis-je mettre une vraie image en fond de mon menu ?','Oui. Qatalink permet d’importer une image de fond ou d’en générer une. Vous pouvez régler l’assombrissement et le flou afin de conserver une bonne lisibilité du texte.'],
  ['Puis-je afficher des promotions limitées dans le temps ?','Oui. Chaque article peut avoir un prix promotionnel avec une date de début et une date de fin. Pendant la période active, le prix normal est barré et le prix promo est utilisé automatiquement ; à la fin, le prix normal reprend.'],
  ['Comment fonctionne la génération d’images ?','Une génération coûte 5 crédits. Basic inclut 50 crédits, Interactif 150 et Vitrine 250. Les abonnés peuvent acheter un pack supplémentaire de 100 crédits pour 2 000 F CFA. Les images générées sont sauvegardées dans le stockage Qatalink afin de ne pas dépendre d’un lien temporaire du fournisseur.'],
  ['Est-ce réservé aux restaurants ?','Non. Qatalink propose des presets pour Restaurant, Hôtel, Spa & Beauté, Immobilier et Boutique. Chaque preset prépare des catégories, un layout et une base graphique adaptée, puis tout reste modifiable.'],
  ['Le client doit-il installer une application ?','Non. Le catalogue fonctionne directement dans le navigateur. L’installation Qatalink en PWA ou l’ajout à l’écran d’accueil est optionnel et sert seulement à accéder plus vite à l’application.'],
  ['Comment fonctionne la commande WhatsApp ?','Sur les formules interactives et pendant l’essai, le client ajoute plusieurs articles, vérifie son panier et peut retirer ou modifier les quantités. Qatalink prépare ensuite un message WhatsApp avec les quantités, le prix unitaire et le total.'],
  ['Qatalink sait-il si la commande WhatsApp a réellement été envoyée ?','Qatalink peut mesurer le clic qui ouvre WhatsApp et le panier qui l’a déclenché. En revanche, avec un simple lien WhatsApp, le site ne peut pas confirmer que l’utilisateur a ensuite appuyé sur « Envoyer » dans WhatsApp.'],
  ['Mes photos disparaîtront-elles après quelques jours ?','Les photos importées et les illustrations générées sont enregistrées dans le stockage associé à votre Qatalink. Le lien public utilise ces fichiers persistants plutôt que les liens temporaires des fournisseurs de génération.']
];

export default function Home(){return <>
  <header className="nav"><div className="container" style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
    <Link className="brand" href="/"><Image src="/qatalink-logo.png" width={34} height={34} alt="Qatalink"/><span>qatalink</span></Link>
    <nav className="navlinks"><a href="#features">Fonctionnalités</a><a href="#how">Comment ça marche</a><a href="#pricing">Tarifs</a><a href="#faq">FAQ</a></nav>
    <div className="actions"><ThemeToggle/><Link className="btn btn-ghost" href="/login">Connexion</Link><Link className="btn btn-primary" href="/create">Créer mon catalogue</Link></div>
  </div></header>
  <main>
    <section className="hero container">
      <div className="pill"><Sparkles size={14}/> Essai complet gratuit pendant 24 h</div>
      <h1>Le moyen le plus simple de créer un <span className="gradient-text">menu </span><span className="hero-interactive-word">interactif</span></h1>
      <p>Importez une photo ou un texte, choisissez un modèle Restaurant, Hôtel, Spa, Immobilier ou Boutique, personnalisez chaque détail puis partagez votre QR permanent.</p>
      <div className="hero-cta"><Link href="/create" className="btn btn-primary">Créer gratuitement <ArrowRight size={17}/></Link><a href="#how" className="btn btn-ghost">Comment ça marche</a></div>
    </section>

    <section className="marquee" id="demo"><div className="track">{[...demos,...demos].map((d,i)=><div className="phone" key={i}><video src={demo} autoPlay muted loop playsInline/><div className="phone-label"><strong>{d[0]}</strong><span>{d[1]}</span></div></div>)}</div></section>

    <section className="section alt" id="features"><div className="container"><div className="section-head"><div className="eyebrow">Tout-en-un</div><h2>Votre catalogue devient un vrai outil commercial</h2><p>Qatalink transforme une carte papier, une image ou un texte en expérience mobile totalement modifiable, partageable et prête pour WhatsApp.</p></div><div className="grid-3">
      <div className="card"><div className="iconbox"><ImageIcon/></div><h3>Image → menu</h3><p>L’analyse visuelle structure automatiquement catégories, articles, descriptions et prix puis vous laisse tout corriger.</p></div>
      <div className="card"><div className="iconbox"><Palette/></div><h3>Personnalisation complète</h3><p>Fond uni, gradient ou image, couleurs du texte, polices, styles typographiques, arrondis, cartes, boutons et layouts : vous gardez le contrôle.</p></div>
      <div className="card"><div className="iconbox"><MessageCircle/></div><h3>Commande WhatsApp</h3><p>Le client sélectionne plusieurs articles, vérifie son panier et Qatalink prépare automatiquement le récapitulatif à envoyer.</p></div>
      <div className="card"><div className="iconbox"><QrCode/></div><h3>QR permanent</h3><p>Changez prix, photos, catégories, textes ou thème sans réimprimer votre QR code. Le lien reste identique.</p></div>
      <div className="card"><div className="iconbox"><Smartphone/></div><h3>Presets métier</h3><p>Restaurant, Hôtel, Spa & Beauté, Immobilier et Boutique chargent automatiquement une structure et un style de départ adaptés.</p></div>
      <div className="card"><div className="iconbox"><Sparkles/></div><h3>Illustrations IA à crédits</h3><p>Une image coûte 5 crédits. Générez une image ou lancez toutes les illustrations manquantes en groupe.</p></div>
    </div></div></section>

    <section className="section how-section" id="how"><div className="container">
      <div className="section-head"><div className="eyebrow">Comment ça marche</div><h2>Une photo. Quelques réglages. Votre menu est prêt.</h2><p>Qatalink structure votre contenu, vous laisse tout vérifier puis transforme votre catalogue en une expérience mobile partageable par lien ou QR code.</p></div>
      <div className="how-showcase">
        <div className="how-video-card"><div className="how-video-top"><span className="live-dot"/>DÉMO QATALINK</div><div className="how-video-wrap"><video src={demo} controls muted playsInline preload="metadata"/></div><div className="how-video-caption"><strong>Voyez le parcours côté client</strong><span>Cette vidéo est provisoire. Elle pourra être remplacée sans modifier la mise en page.</span></div></div>
        <div className="how-copy"><div className="how-mini-step"><span>01</span><div><b>Choisissez votre secteur</b><p>Restaurant, Hôtel, Spa, Immobilier, Boutique ou une base libre.</p></div></div><div className="how-mini-step"><span>02</span><div><b>Importez ou partez de zéro</b><p>Photo, texte massif ou catalogue vide avec catégories préchargées.</p></div></div><div className="how-mini-step"><span>03</span><div><b>Personnalisez tout</b><p>Nom de l’entreprise, couleurs, polices, catégories, prix, images et disposition.</p></div></div><div className="how-mini-step"><span>04</span><div><b>Publiez</b><p>Le QR reste stable même lorsque le catalogue évolue.</p></div></div><Link href="/create" className="btn btn-primary how-main-cta">Créer mon Qatalink <ArrowRight size={17}/></Link></div>
      </div>
      <div className="steps how-steps"><div className="card"><div className="step-num">01 — IMPORTER</div><h3>Photo, texte ou vide</h3><p>Importez votre carte existante ou construisez votre catalogue manuellement.</p></div><div className="card"><div className="step-num">02 — PERSONNALISER</div><h3>Identité + design</h3><p>Nom de l’entreprise, logo, couleurs, typographies, prix, catégories et illustrations.</p></div><div className="card"><div className="step-num">03 — PUBLIER</div><h3>QR + WhatsApp</h3><p>Publiez votre catalogue et modifiez-le à volonté sans changer son QR permanent.</p></div></div>
    </div></section>

    <section className="section alt" id="pricing"><div className="container"><div className="section-head"><div className="eyebrow">Tarifs simples</div><h2>24 h pour tout tester. Puis choisissez votre formule.</h2><p>Une génération d’image coûte 5 crédits. Les offres annuelles incluent un mois offert.</p></div><div className="pricing">
      <Price name="Basic" price="3 500" annual="38 500" oldAnnual="42 000" features={['Catalogue/menu responsive','QR code permanent','Personnalisation du thème','Catégories et articles modifiables','50 crédits image inclus','Bouton WhatsApp général']} />
      <Price name="Interactif" price="5 000" annual="55 000" oldAnnual="60 000" featured features={['Tout Basic','Sélection de plusieurs articles','Panier détaillé','Redirection WhatsApp contextualisée','150 crédits image inclus']} />
      <Price name="Vitrine" price="7 500" annual="82 500" oldAnnual="90 000" features={['Tout Interactif','Page type Linktree','Réseaux sociaux','Lien Google Maps','250 crédits image inclus','Menu/catalogue en bouton principal']} />
    </div><p style={{textAlign:'center',marginTop:18,color:'var(--muted)'}}>Besoin de plus d’illustrations ? Pack de 100 crédits à 2 000 F CFA pour les abonnés.</p></div></section>

    <section className="section" id="faq"><div className="container"><div className="section-head"><div className="eyebrow">FAQ</div><h2>Avant de vous lancer, voici les réponses aux vrais freins</h2><p>Création, QR, essai, personnalisation, WhatsApp, promotions et images : les points qui reviennent le plus souvent sont détaillés ici.</p></div><div className="faq faq-rich">{faqItems.map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div></div></section>
  </main>
  <footer className="footer"><div className="container" style={{display:'flex',justifyContent:'space-between',gap:20,flexWrap:'wrap'}}><div className="brand"><Image src="/qatalink-logo.png" width={32} height={32} alt="Qatalink"/>qatalink</div><div>© 2026 Qatalink. Menus & catalogues interactifs.</div></div></footer>
</>}

function Price({name,price,annual,oldAnnual,features,featured=false}:{name:string;price:string;annual:string;oldAnnual:string;features:string[];featured?:boolean}){return <div className={'price-card '+(featured?'featured':'')}>{featured&&<div className="popular">LE PLUS POPULAIRE</div>}<h3>{name}</h3><div className="price">{price} F <small>/ mois</small></div><div className="landing-annual"><span className="annual-card-badge">1 MOIS OFFERT</span><b>{annual} F / an</b><small><s>{oldAnnual} F</s></small></div><div className="features">{features.map((f,i)=><div className="feature" key={i}><Check size={16} color="#c7192f"/>{f}</div>)}</div><Link className={featured?'btn btn-primary':'btn btn-dark'} style={{width:'100%'}} href="/create">Choisir {name}</Link></div>}
