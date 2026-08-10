import Image from 'next/image';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { ArrowRight, Check, ImageIcon, MessageCircle, Palette, QrCode, Smartphone, Sparkles } from 'lucide-react';

const demo='https://monadia-bucket.sfo3.cdn.digitaloceanspaces.com/WhatsApp%20Video%202026-07-24%20at%2015.56.05.mp4';
const demos=[['Restaurant','Menu interactif'],['Spa','Catalogue de services'],['Hôtel','Catalogue de chambres'],['Immobilier','Biens & demandes'],['Boutique','Catalogue produits'],['Restaurant','Commande WhatsApp']];
const faqItems=[
  ['Dois-je refaire mon QR quand je modifie mon menu ?','Non. Votre QR reste le même. Vous pouvez changer les prix, photos, descriptions, catégories, couleurs, promotions et le thème sans le réimprimer.'],
  ['Puis-je créer mon menu à partir d’une simple photo ?','Oui. Importez une photo, une capture ou un scan. Qatalink organise automatiquement les catégories, articles et prix, puis vous pouvez tout corriger avant ou après publication.'],
  ['Et si mon menu est déjà sous forme de texte ?','Vous pouvez coller votre contenu tel quel, même s’il mélange catégories, articles et prix. Qatalink le transforme en catalogue modifiable. Vous pouvez aussi partir de zéro.'],
  ['Que puis-je tester pendant les 24 heures gratuites ?','Pendant 24 h, vous pouvez tester la création, la personnalisation, le panier, les QR, les illustrations, les thèmes, les dispositions et la publication.'],
  ['Que se passe-t-il si je ne m’abonne pas après l’essai ?','Votre espace reste accessible. Vous pourrez reprendre votre travail en activant une formule.'],
  ['Les changements sont-ils visibles sur un lien déjà partagé ?','Oui. Une fois vos modifications enregistrées, le même lien et le même QR affichent la nouvelle version de votre catalogue.'],
  ['Puis-je personnaliser le design pour qu’il ressemble à ma marque ?','Oui. Couleurs, fond, image de fond, typographies, styles de texte, arrondis, dispositions et logo sont personnalisables. Vous pouvez aussi créer une palette harmonieuse à partir de votre logo ou d’une image.'],
  ['Puis-je mettre une image en fond de mon menu ?','Oui. Importez votre propre image ou créez-en une, puis ajustez le flou et l’assombrissement pour conserver une bonne lisibilité.'],
  ['Puis-je afficher des promotions limitées dans le temps ?','Oui. Chaque article peut avoir un prix promotionnel avec une date de début et de fin. Le prix normal revient automatiquement lorsque la promotion se termine.'],
  ['Comment fonctionnent les illustrations ?','Une illustration coûte 5 crédits. Basic inclut 50 crédits, Interactif 150 et Vitrine 250. Les abonnés peuvent ajouter des packs de crédits à tout moment.'],
  ['Est-ce réservé aux restaurants ?','Non. Qatalink convient notamment aux restaurants, hôtels, spas, salons de beauté, boutiques et agences immobilières. Chaque secteur dispose d’une base adaptée et entièrement modifiable.'],
  ['Le client doit-il installer une application ?','Non. Le catalogue s’ouvre directement depuis un lien ou un QR. L’ajout de Qatalink à l’écran d’accueil reste optionnel.'],
  ['Comment fonctionne la commande WhatsApp ?','Sur les formules interactives et pendant l’essai, le client sélectionne plusieurs articles, vérifie son panier, ajuste les quantités puis ouvre WhatsApp avec son récapitulatif prêt à envoyer.'],
  ['Puis-je vérifier le panier avant d’ouvrir WhatsApp ?','Oui. Le panier affiche les articles, quantités, prix unitaires, sous-totaux et total. Le client peut modifier ou supprimer des éléments avant de continuer.'],
  ['Mes photos restent-elles disponibles ?','Oui. Les photos importées et les illustrations créées restent attachées à votre catalogue.']
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
      <h1>Le moyen le plus <span className="hero-simple-word">simple</span> de créer un <span className="gradient-text">menu </span><span className="hero-interactive-word">interactif</span></h1>
      <p>Importez une photo ou un texte, choisissez votre secteur, personnalisez votre catalogue puis partagez votre QR permanent.</p>
      <div className="hero-cta"><Link href="/create" className="btn btn-primary">Créer gratuitement <ArrowRight size={17}/></Link><a href="#how" className="btn btn-ghost">Comment ça marche</a></div>
    </section>

    <section className="marquee" id="demo"><div className="track">{[...demos,...demos].map((d,i)=><div className="phone" key={i}><video src={demo} autoPlay muted loop playsInline/><div className="phone-label"><strong>{d[0]}</strong><span>{d[1]}</span></div></div>)}</div></section>

    <section className="section alt" id="features"><div className="container"><div className="section-head"><div className="eyebrow">Tout-en-un</div><h2>Votre catalogue devient un vrai outil commercial</h2><p>Transformez une carte, une image ou un texte en expérience mobile modifiable, partageable et prête pour WhatsApp.</p></div><div className="grid-3">
      <div className="card"><div className="iconbox"><ImageIcon/></div><h3>Image → menu</h3><p>Importez votre carte et retrouvez rapidement une structure organisée que vous pouvez corriger librement.</p></div>
      <div className="card"><div className="iconbox"><Palette/></div><h3>Personnalisation complète</h3><p>Fond uni, gradient ou image, couleurs, polices, styles typographiques, arrondis, cartes, boutons et dispositions : vous gardez le contrôle.</p></div>
      <div className="card"><div className="iconbox"><MessageCircle/></div><h3>Commande WhatsApp</h3><p>Le client sélectionne plusieurs articles, vérifie son panier et ouvre WhatsApp avec un récapitulatif clair.</p></div>
      <div className="card"><div className="iconbox"><QrCode/></div><h3>QR permanent</h3><p>Changez prix, photos, catégories, textes ou thème sans réimprimer votre QR code. Le lien reste identique.</p></div>
      <div className="card"><div className="iconbox"><Smartphone/></div><h3>Adapté à votre activité</h3><p>Restaurant, Hôtel, Spa & Beauté, Immobilier et Boutique disposent de bases de départ adaptées.</p></div>
      <div className="card"><div className="iconbox"><Sparkles/></div><h3>Illustrations à la demande</h3><p>Créez une illustration ou lancez toutes les illustrations manquantes en une seule action.</p></div>
    </div></div></section>

    <section className="section how-section" id="how"><div className="container">
      <div className="section-head"><div className="eyebrow">Comment ça marche</div><h2>Une photo. Quelques réglages. Votre menu est prêt.</h2><p>Qatalink organise votre contenu, vous laisse tout vérifier puis transforme votre catalogue en une expérience mobile partageable par lien ou QR code.</p></div>
      <div className="how-showcase">
        <div className="how-video-card"><div className="how-video-top"><span className="live-dot"/>DÉMO QATALINK</div><div className="how-video-wrap"><video src={demo} controls muted playsInline preload="metadata"/></div><div className="how-video-caption"><strong>Voyez le parcours côté client</strong><span>De la découverte du catalogue jusqu’à la sélection sur WhatsApp.</span></div></div>
        <div className="how-copy"><div className="how-mini-step"><span>01</span><div><b>Choisissez votre secteur</b><p>Restaurant, Hôtel, Spa, Immobilier, Boutique ou une base libre.</p></div></div><div className="how-mini-step"><span>02</span><div><b>Importez ou partez de zéro</b><p>Photo, texte ou catalogue vide avec une structure de départ.</p></div></div><div className="how-mini-step"><span>03</span><div><b>Personnalisez tout</b><p>Nom de l’entreprise, couleurs, polices, catégories, prix, images et disposition.</p></div></div><div className="how-mini-step"><span>04</span><div><b>Publiez</b><p>Le QR reste stable même lorsque le catalogue évolue.</p></div></div><Link href="/create" className="btn btn-primary how-main-cta">Créer mon Qatalink <ArrowRight size={17}/></Link></div>
      </div>
      <div className="steps how-steps"><div className="card"><div className="step-num">01 — IMPORTER</div><h3>Photo, texte ou vide</h3><p>Importez votre carte existante ou construisez votre catalogue manuellement.</p></div><div className="card"><div className="step-num">02 — PERSONNALISER</div><h3>Identité + design</h3><p>Nom de l’entreprise, logo, couleurs, typographies, prix, catégories et illustrations.</p></div><div className="card"><div className="step-num">03 — PUBLIER</div><h3>QR + WhatsApp</h3><p>Publiez votre catalogue et modifiez-le à volonté sans changer son QR permanent.</p></div></div>
    </div></section>

    <section className="section alt" id="pricing"><div className="container"><div className="section-head"><div className="eyebrow">Tarifs simples</div><h2>24 h pour tout tester. Puis choisissez votre formule.</h2><p>Une illustration coûte 5 crédits. Les offres annuelles incluent un mois offert.</p></div><div className="pricing">
      <Price name="Basic" price="3 500" annual="38 500" oldAnnual="42 000" features={['Catalogue/menu responsive','QR code permanent','Personnalisation du thème','Catégories et articles modifiables','50 crédits image inclus','Bouton WhatsApp général']} />
      <Price name="Interactif" price="5 000" annual="55 000" oldAnnual="60 000" features={['Tout Basic','Sélection de plusieurs articles','Panier détaillé','Commande WhatsApp contextualisée','150 crédits image inclus','Studio avancé']} />
      <Price name="Vitrine" price="7 500" annual="82 500" oldAnnual="90 000" featured features={['Tout Interactif','Page Vitrine personnalisée','Réseaux sociaux et liens externes','Lien Google Maps','250 crédits image inclus','Menu/catalogue en bouton principal']} />
    </div><p style={{textAlign:'center',marginTop:18,color:'var(--muted)'}}>Besoin de plus d’illustrations ? Pack de 100 crédits à 2 000 F CFA pour les abonnés.</p></div></section>

    <section className="section" id="faq"><div className="container"><div className="section-head"><div className="eyebrow">FAQ</div><h2>Avant de vous lancer, voici les réponses aux vrais freins</h2><p>Création, QR, essai, personnalisation, WhatsApp, promotions et illustrations : les points essentiels sont détaillés ici.</p></div><div className="faq faq-rich">{faqItems.map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div></div></section>
  </main>
  <footer className="footer"><div className="container" style={{display:'flex',justifyContent:'space-between',gap:20,flexWrap:'wrap'}}><div className="brand"><Image src="/qatalink-logo.png" width={32} height={32} alt="Qatalink"/>qatalink</div><div>© 2026 Qatalink. Menus & catalogues interactifs.</div></div></footer>
</>}

function Price({name,price,annual,oldAnnual,features,featured=false}:{name:string;price:string;annual:string;oldAnnual:string;features:string[];featured?:boolean}){return <div className={'price-card '+(featured?'featured':'')}>{featured&&<div className="popular">RECOMMANDÉ</div>}<h3>{name}</h3><div className="price">{price} F <small>/ mois</small></div><div className="landing-annual"><span className="annual-card-badge">1 MOIS OFFERT</span><b>{annual} F / an</b><small><s>{oldAnnual} F</s></small></div><div className="features">{features.map((f,i)=><div className="feature" key={i}><Check size={16} color="#c7192f"/>{f}</div>)}</div><Link className={featured?'btn btn-primary':'btn btn-dark'} style={{width:'100%'}} href="/create">Choisir {name}</Link></div>}
