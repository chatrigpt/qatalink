import Image from 'next/image';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { PaymentTrustBadge } from '@/components/payment-trust-badge';
import { ArrowRight, Check, ImageIcon, MessageCircle, Palette, QrCode, Smartphone, Sparkles } from 'lucide-react';

const howDemo='https://monadia-bucket.sfo3.cdn.digitaloceanspaces.com/qatalink-comment-%C3%A7a-marche.mp4';
const demos=[
  {name:'Restaurant',label:'Menu interactif',src:'https://monadia-bucket.sfo3.cdn.digitaloceanspaces.com/qatalink-restaurant.mp4'},
  {name:'Spa & Beauté',label:'Catalogue de services',src:'https://monadia-bucket.sfo3.cdn.digitaloceanspaces.com/qatalink-spa.mp4'},
  {name:'Hôtel',label:'Catalogue de chambres',src:'https://monadia-bucket.sfo3.cdn.digitaloceanspaces.com/qatalink-hotel.mp4'},
  {name:'Immobilier',label:'Biens & demandes',src:'https://monadia-bucket.sfo3.cdn.digitaloceanspaces.com/qatalink-immobilier.mp4'},
  {name:'Boutique',label:'Catalogue produits',src:'https://monadia-bucket.sfo3.cdn.digitaloceanspaces.com/qatalink-boutique.mp4'}
];
const faqItems=[
  ['Dois-je refaire mon QR quand je modifie mon menu ?','Non. Votre QR reste le même. Vous pouvez changer les prix, photos, descriptions, catégories, couleurs, promotions et le thème sans le réimprimer.'],
  ['Puis-je créer mon menu à partir d’une simple photo ?','Oui. Importez une photo, une capture ou un scan. Qatalink organise automatiquement les catégories, articles et prix, puis vous pouvez tout corriger avant ou après publication.'],
  ['Et si mon menu est déjà sous forme de texte ?','Vous pouvez coller votre contenu tel quel, même s’il mélange catégories, articles et prix. Qatalink le transforme en catalogue modifiable. Vous pouvez aussi partir de zéro.'],
  ['Quand commencent les 7 jours gratuits ?','Le compteur démarre uniquement lorsque votre premier catalogue est réellement créé. L’inscription et la préparation avant ce premier résultat ne consomment pas votre essai.'],
  ['Que puis-je tester pendant les 7 jours gratuits ?','Pendant 7 jours, vous pouvez tester la création, la personnalisation, le panier, les QR, les illustrations, les thèmes, les dispositions, la publication, les commandes et les fonctions Business disponibles pendant l’essai.'],
  ['Comment payer mon abonnement Qatalink ?','Les abonnements mensuels, annuels et les recharges de crédits peuvent être réglés par Mobile Money ou par carte bancaire. Le paiement est accessible depuis l’Afrique comme depuis le reste du monde via la page de paiement sécurisée.'],
  ['Que se passe-t-il si je ne m’abonne pas après l’essai ?','Votre espace et votre travail restent conservés. L’édition est verrouillée à la fin de l’essai, tandis que votre lien public bénéficie encore de 48 h de grâce avant d’être suspendu.'],
  ['Les changements sont-ils visibles sur un lien déjà partagé ?','Oui. Une fois vos modifications enregistrées, le même lien et le même QR affichent la nouvelle version de votre catalogue.'],
  ['Puis-je personnaliser le design pour qu’il ressemble à ma marque ?','Oui. Couleurs, fond, image de fond, typographies, styles de texte, arrondis, dispositions et logo sont personnalisables. Vous pouvez aussi créer une palette harmonieuse à partir de votre logo ou d’une image.'],
  ['Puis-je mettre une image en fond de mon menu ?','Oui. Importez votre propre image ou créez-en une, puis ajustez le flou et l’assombrissement pour conserver une bonne lisibilité.'],
  ['Puis-je afficher des promotions limitées dans le temps ?','Oui. Chaque article peut avoir un prix promotionnel avec une date de début et de fin. Le prix normal revient automatiquement lorsque la promotion se termine.'],
  ['Comment fonctionnent les illustrations ?','Une illustration coûte 5 crédits. Starter inclut 50 crédits, Pro 150 et Business 250. Les abonnés peuvent ajouter des packs de crédits à tout moment.'],
  ['Est-ce réservé aux restaurants ?','Non. Qatalink convient notamment aux restaurants, hôtels, spas, salons de beauté, boutiques et agences immobilières. Chaque secteur dispose d’une base adaptée et entièrement modifiable.'],
  ['Le client doit-il installer une application ?','Non. Le catalogue s’ouvre directement depuis un lien ou un QR. L’ajout de Qatalink à l’écran d’accueil reste optionnel.'],
  ['Comment fonctionne la commande WhatsApp ?','Tous les catalogues sont interactifs. Avec Starter, le panier est envoyé directement sur WhatsApp. Avec Pro et Business, la commande peut être enregistrée dans l’espace privé Qatalink puis WhatsApp peut être proposé en complément ou désactivé par catalogue.'],
  ['À quoi sert la page centrale Business ?','Business peut regrouper jusqu’à 15 menus ou catalogues sur une seule page centrale de type Linktree. Le client ouvre d’abord cette page, choisit le menu ou catalogue qui l’intéresse, puis peut aussi retrouver les liens sociaux, WhatsApp, la localisation ou d’autres liens configurés.'],
  ['Puis-je vérifier le panier avant d’ouvrir WhatsApp ?','Oui. Le panier affiche les articles, quantités, prix unitaires, sous-totaux et total. Le client peut modifier ou supprimer des éléments avant de continuer.'],
  ['Mes photos restent-elles disponibles ?','Oui. Les photos importées et les illustrations créées restent attachées à votre catalogue.']
];

export default function Home(){return <>
  <header className="nav landing-nav"><div className="container landing-nav-inner" style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
    <Link className="brand landing-brand" href="/"><Image src="/qatalink-logo.png" width={34} height={34} alt="Qatalink"/><span>qatalink</span></Link>
    <nav className="navlinks"><a href="#features">Fonctionnalités</a><a href="#how">Comment ça marche</a><a href="#pricing">Tarifs</a><a href="#faq">FAQ</a></nav>
    <div className="actions landing-nav-actions"><ThemeToggle/><Link className="btn btn-ghost" href="/login">Connexion</Link><Link className="btn btn-primary landing-create-btn" href="/create"><span className="landing-create-full">Créer mon catalogue</span><span className="landing-create-short">Créer</span></Link></div>
  </div></header>
  <main>
    <section className="hero container hero-conversion">
      <div className="hero-conversion-copy">
        <div className="pill"><Sparkles size={14}/> 7 jours gratuits · aucune carte requise</div>
        <h1>Transformez votre <span className="hero-simple-word">catalogue</span> en <span className="hero-interactive-word">expérience interactive</span></h1>
        <p>Importez une photo ou un texte. Qatalink organise vos offres, crée un lien et un QR permanent, puis vous laisse modifier prix, photos, services et catégories sans rien réimprimer.</p>
        <div className="hero-cta"><Link href="/create" className="btn btn-primary">Créer mon catalogue gratuitement <ArrowRight size={17}/></Link><a href="#how" className="btn btn-ghost">Voir comment ça marche</a></div>
        <div className="hero-reassurance"><span><Check size={13}/>L’essai commence au premier catalogue</span><span><Check size={13}/>QR permanent</span><span><Check size={13}/>Tous les catalogues sont interactifs</span></div>
      </div>
      <HeroActivationDemo/>
    </section>

    <section className="marquee" id="demo"><div className="track">{[...demos,...demos].map((d,i)=><div className="phone" key={`${d.name}-${i}`}><video src={d.src} autoPlay muted loop playsInline preload="metadata" disablePictureInPicture aria-label={`Démonstration ${d.name}`}/><div className="phone-label"><strong>{d.name}</strong><span>{d.label}</span></div></div>)}</div></section>

    <section className="section alt" id="features"><div className="container"><div className="section-head"><div className="eyebrow">Tout-en-un</div><h2>Votre catalogue devient un vrai outil commercial</h2><p>Transformez une carte, une image ou un texte en expérience mobile modifiable, partageable et prête pour la commande.</p></div><div className="grid-3">
      <div className="card"><div className="iconbox"><ImageIcon/></div><h3>Image → catalogue</h3><p>Importez votre carte ou votre ancien catalogue et retrouvez rapidement une structure organisée que vous pouvez corriger librement.</p></div>
      <div className="card"><div className="iconbox"><Palette/></div><h3>Personnalisation complète</h3><p>Fond uni, gradient ou image, couleurs, polices, styles typographiques, arrondis, cartes, boutons et dispositions : vous gardez le contrôle.</p></div>
      <div className="card"><div className="iconbox"><MessageCircle/></div><h3>Commandes interactives</h3><p>Le client sélectionne plusieurs articles et quantités. Selon votre formule, la commande part vers WhatsApp ou est centralisée dans Qatalink.</p></div>
      <div className="card"><div className="iconbox"><QrCode/></div><h3>QR permanent</h3><p>Changez prix, photos, catégories, textes ou thème sans réimprimer votre QR code. Le lien reste identique.</p></div>
      <div className="card"><div className="iconbox"><Smartphone/></div><h3>Adapté à votre activité</h3><p>Restaurant, Hôtel, Spa & Beauté, Immobilier et Boutique disposent de bases de départ adaptées.</p></div>
      <div className="card"><div className="iconbox"><Sparkles/></div><h3>Illustrations à la demande</h3><p>Créez une illustration ou lancez toutes les illustrations manquantes en une seule action.</p></div>
    </div></div></section>

    <section className="section how-section" id="how"><div className="container">
      <div className="section-head"><div className="eyebrow">Comment ça marche</div><h2>Une photo. Quelques réglages. Votre catalogue est prêt.</h2><p>Qatalink organise votre contenu, vous laisse tout vérifier puis transforme votre offre en une expérience mobile partageable par lien ou QR code.</p></div>
      <div className="how-showcase">
        <div className="how-video-card"><div className="how-video-top"><span className="live-dot"/>DÉMO QATALINK</div><div className="how-video-wrap"><video src={howDemo} controls muted playsInline preload="metadata"/></div><div className="how-video-caption"><strong>Voyez le parcours côté client</strong><span>La vidéo démarre sans son. Utilisez le contrôle du lecteur pour l’activer.</span></div></div>
        <div className="how-copy"><div className="how-mini-step"><span>01</span><div><b>Choisissez votre secteur</b><p>Restaurant, Hôtel, Spa, Immobilier, Boutique ou une base libre.</p></div></div><div className="how-mini-step"><span>02</span><div><b>Importez ou partez de zéro</b><p>Photo, texte ou catalogue vide avec une structure de départ.</p></div></div><div className="how-mini-step"><span>03</span><div><b>Vérifiez votre premier rendu</b><p>Qatalink organise le contenu d’abord. Vos 7 jours commencent seulement lorsque ce premier catalogue existe.</p></div></div><div className="how-mini-step"><span>04</span><div><b>Publiez et partagez</b><p>Le QR reste stable même lorsque votre catalogue évolue.</p></div></div><Link href="/create" className="btn btn-primary how-main-cta">Créer mon Qatalink <ArrowRight size={17}/></Link></div>
      </div>
      <div className="steps how-steps"><div className="card"><div className="step-num">01 — IMPORTER</div><h3>Photo, texte ou vide</h3><p>Importez votre carte existante ou construisez votre catalogue manuellement.</p></div><div className="card"><div className="step-num">02 — VÉRIFIER</div><h3>Votre premier rendu</h3><p>Le catalogue apparaît rapidement. Corrigez seulement ce qui compte avant de le montrer.</p></div><div className="card"><div className="step-num">03 — PUBLIER</div><h3>QR + commande</h3><p>Publiez votre catalogue et modifiez-le à volonté sans changer son QR permanent.</p></div></div>
    </div></section>

    <section className="section alt" id="pricing"><div className="container"><div className="section-head"><div className="eyebrow">Tarifs simples</div><h2>Trois formules selon la façon dont vous voulez gérer vos commandes.</h2><p>Tous les catalogues sont interactifs. Starter envoie la commande sur WhatsApp ; Pro la centralise dans Qatalink ; Business ajoute la page centrale multi-catalogues et le stock automatique. À l’année, vous payez 11 mois au lieu de 12.</p></div><PaymentTrustBadge/><div className="pricing">
      <Price name="Starter" price="9 900" annual="108 900" oldAnnual="118 800" saving="9 900" features={['1 catalogue/menu interactif','Sélection + quantités + panier','Commande envoyée directement sur WhatsApp','QR permanent','Prix, photos et catégories modifiables','50 crédits image inclus']} />
      <Price name="Pro" price="24 900" annual="273 900" oldAnnual="298 800" saving="24 900" featured features={['Jusqu’à 5 catalogues/menus','Commandes enregistrées dans Qatalink','WhatsApp activable ou désactivable par catalogue','Accès équipe et permissions','Fusion de commandes + addition unique','Tickets 58 mm + impression ESC/POS compatible','150 crédits image inclus']} />
      <Price name="Business" price="49 900" annual="548 900" oldAnnual="598 800" saving="49 900" features={['Jusqu’à 15 catalogues/menus','Tout Pro','Page centrale type Linktree pour regrouper tous les menus/catalogues','Liens sociaux, WhatsApp, carte et liens externes','Gestion de stock','Liaisons plats/boissons → stock','Déduction automatique à la commande terminée','Alertes stock bas + historique','250 crédits image inclus']} />
    </div><p style={{textAlign:'center',marginTop:18,color:'var(--muted)'}}>Besoin de plus d’illustrations ? Pack de 100 crédits à 2 000 F CFA pour les abonnés, payable par Mobile Money ou carte bancaire.</p></div></section>

    <section className="section" id="faq"><div className="container"><div className="section-head"><div className="eyebrow">FAQ</div><h2>Avant de vous lancer, voici les réponses aux vrais freins</h2><p>Création, QR, essai, personnalisation, commandes, WhatsApp, page centrale, promotions et illustrations : les points essentiels sont détaillés ici.</p></div><div className="faq faq-rich">{faqItems.map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div></div></section>
  </main>
  <footer className="footer"><div className="container" style={{display:'flex',justifyContent:'space-between',gap:20,flexWrap:'wrap'}}><div className="brand"><Image src="/qatalink-logo.png" width={32} height={32} alt="Qatalink"/>qatalink</div><div className="site-legal-links"><Link href="/cgu">CGU</Link><Link href="/confidentialite">Confidentialité</Link><span>Édité par Digital ADN</span></div><div>© 2026 Qatalink. Menus & catalogues interactifs.</div></div></footer>
</>}

function HeroActivationDemo(){return <div className="activation-live-demo" aria-label="Démonstration visuelle de transformation d’un catalogue">
  <div className="activation-demo-source"><strong>VOTRE CONTENU</strong><div className="activation-source-line"/><div className="activation-source-line short"/><div className="activation-source-line"/><div className="activation-source-line short"/><div className="activation-source-price"><span>Offre signature</span><b>10 000 F</b></div></div>
  <div className="activation-demo-arrow">→</div>
  <div className="activation-demo-phone"><div className="activation-demo-phone-head"><small>CATALOGUE INTERACTIF</small><b>Votre entreprise</b></div><div className="activation-demo-tabs"><span>Nouveautés</span><span>Populaires</span><span>Offres</span></div><div className="activation-demo-item"><span className="activation-demo-thumb"/><div><b>Offre Signature</b><small>Disponible maintenant</small></div><strong>10 000 F</strong></div><div className="activation-demo-item"><span className="activation-demo-thumb"/><div><b>Pack Premium</b><small>Présentation claire</small></div><strong>15 000 F</strong></div><div className="activation-demo-item"><span className="activation-demo-thumb"/><div><b>Nouveauté</b><small>Modifiable à tout moment</small></div><strong>8 500 F</strong></div><div className="activation-demo-cta">CONTINUER SUR WHATSAPP</div></div>
  <div className="activation-demo-qr"><QrCode size={54}/><b>LE MÊME QR</b><small>même après vos modifications</small></div>
</div>}

function Price({name,price,annual,oldAnnual,saving,features,featured=false}:{name:string;price:string;annual:string;oldAnnual:string;saving:string;features:string[];featured?:boolean}){return <div className={'price-card '+(featured?'featured':'')}>{featured&&<div className="popular">RECOMMANDÉ</div>}<h3>{name}</h3><div className="price">{price} F <small>/ mois</small></div><div className="landing-annual"><span className="annual-card-badge">1 MOIS OFFERT</span><b>{annual} F / an</b><small><s>{oldAnnual} F</s> · économie de <strong>{saving} F</strong></small></div><div className="price-payment-method"><Smartphone size={14}/>Mobile Money ou carte bancaire</div><div className="features">{features.map((f,i)=><div className="feature" key={i}><Check size={16} color="#c7192f"/>{f}</div>)}</div><Link className={featured?'btn btn-primary':'btn btn-dark'} style={{width:'100%'}} href="/create">Choisir {name}</Link></div>}
