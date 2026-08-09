import Image from 'next/image';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { ArrowRight, Check, ImageIcon, MessageCircle, Palette, QrCode, Smartphone, Sparkles } from 'lucide-react';

const demo='https://monadia-bucket.sfo3.cdn.digitaloceanspaces.com/WhatsApp%20Video%202026-07-24%20at%2015.56.05.mp4';
const demos=[['Restaurant','Menu interactif'],['Spa','Catalogue de services'],['Hôtel','Catalogue de chambres'],['Immobilier','Biens & demandes'],['Boutique','Catalogue produits'],['Restaurant','Commande WhatsApp']];

export default function Home(){return <>
  <header className="nav"><div className="container" style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
    <Link className="brand" href="/"><Image src="/qatalink-logo.png" width={34} height={34} alt="Qatalink"/><span>qatalink</span></Link>
    <nav className="navlinks"><a href="#features">Fonctionnalités</a><a href="#how">Comment ça marche</a><a href="#pricing">Tarifs</a><a href="#faq">FAQ</a></nav>
    <div className="actions"><ThemeToggle/><Link className="btn btn-ghost" href="/login">Connexion</Link><Link className="btn btn-primary" href="/create">Créer mon catalogue</Link></div>
  </div></header>
  <main>
    <section className="hero container">
      <div className="pill"><Sparkles size={14}/> Essai complet gratuit pendant 24 h</div>
      <h1>Le moyen le plus simple de créer un <span className="gradient-text">menu interactif</span></h1>
      <p>Importez une photo ou un texte, choisissez un modèle Restaurant, Hôtel, Spa, Immobilier ou Boutique, personnalisez chaque détail puis partagez votre QR permanent.</p>
      <div className="hero-cta"><Link href="/create" className="btn btn-primary">Créer gratuitement <ArrowRight size={17}/></Link><a href="#how" className="btn btn-ghost">Comment ça marche</a></div>
    </section>

    <section className="marquee" id="demo"><div className="track">{[...demos,...demos].map((d,i)=><div className="phone" key={i}><video src={demo} autoPlay muted loop playsInline/><div className="phone-label"><strong>{d[0]}</strong><span>{d[1]}</span></div></div>)}</div></section>

    <section className="section alt" id="features"><div className="container"><div className="section-head"><div className="eyebrow">Tout-en-un</div><h2>Votre catalogue devient un vrai outil commercial</h2><p>Qatalink transforme une carte papier, une image ou un texte en expérience mobile totalement modifiable, partageable et prête pour WhatsApp.</p></div><div className="grid-3">
      <div className="card"><div className="iconbox"><ImageIcon/></div><h3>Image → menu</h3><p>L’analyse visuelle structure automatiquement catégories, articles, descriptions et prix puis vous laisse tout corriger.</p></div>
      <div className="card"><div className="iconbox"><Palette/></div><h3>Personnalisation complète</h3><p>Fond, couleur du texte, couleur principale, polices des titres et du corps, arrondis, cartes, boutons, grille ou liste : vous gardez le contrôle.</p></div>
      <div className="card"><div className="iconbox"><MessageCircle/></div><h3>Commande WhatsApp</h3><p>Le client sélectionne plusieurs articles et Qatalink prépare automatiquement le récapitulatif à envoyer.</p></div>
      <div className="card"><div className="iconbox"><QrCode/></div><h3>QR permanent</h3><p>Changez prix, photos, catégories, textes ou thème sans réimprimer votre QR code. Le lien reste identique.</p></div>
      <div className="card"><div className="iconbox"><Smartphone/></div><h3>Presets métier</h3><p>Restaurant, Hôtel, Spa & Beauté, Immobilier et Boutique chargent automatiquement une structure et un style de départ adaptés.</p></div>
      <div className="card"><div className="iconbox"><Sparkles/></div><h3>Illustrations IA à crédits</h3><p>Une image coûte 5 crédits. Générez une image ou lancez toutes les illustrations manquantes en groupe.</p></div>
    </div></div></section>

    <section className="section how-section" id="how"><div className="container">
      <div className="section-head"><div className="eyebrow">Comment ça marche</div><h2>Une photo. Quelques réglages. Votre menu est prêt.</h2><p>Qatalink structure votre contenu, vous laisse tout vérifier puis transforme votre catalogue en une expérience mobile partageable par lien ou QR code.</p></div>
      <div className="how-showcase">
        <div className="how-video-card">
          <div className="how-video-top"><span className="live-dot"/>DÉMO QATALINK</div>
          <div className="how-video-wrap"><video src={demo} controls muted playsInline preload="metadata"/></div>
          <div className="how-video-caption"><strong>Voyez le parcours côté client</strong><span>Cette vidéo est provisoire. Elle pourra être remplacée sans modifier la mise en page.</span></div>
        </div>
        <div className="how-copy">
          <div className="how-mini-step"><span>01</span><div><b>Choisissez votre secteur</b><p>Restaurant, Hôtel, Spa, Immobilier, Boutique ou une base libre.</p></div></div>
          <div className="how-mini-step"><span>02</span><div><b>Importez ou partez de zéro</b><p>Photo, texte massif ou catalogue vide avec catégories préchargées.</p></div></div>
          <div className="how-mini-step"><span>03</span><div><b>Personnalisez tout</b><p>Nom de l’entreprise, couleurs, polices, catégories, prix, images et disposition.</p></div></div>
          <div className="how-mini-step"><span>04</span><div><b>Publiez</b><p>Le QR reste stable même lorsque le catalogue évolue.</p></div></div>
          <Link href="/create" className="btn btn-primary how-main-cta">Créer mon Qatalink <ArrowRight size={17}/></Link>
        </div>
      </div>
      <div className="steps how-steps"><div className="card"><div className="step-num">01 — IMPORTER</div><h3>Photo, texte ou vide</h3><p>Importez votre carte existante ou construisez votre catalogue manuellement.</p></div><div className="card"><div className="step-num">02 — PERSONNALISER</div><h3>Identité + design</h3><p>Nom de l’entreprise, logo, couleurs, typographies, prix, catégories et illustrations.</p></div><div className="card"><div className="step-num">03 — PUBLIER</div><h3>QR + WhatsApp</h3><p>Publiez votre catalogue et modifiez-le à volonté sans changer son QR permanent.</p></div></div>
    </div></section>

    <section className="section alt" id="pricing"><div className="container"><div className="section-head"><div className="eyebrow">Tarifs simples</div><h2>24 h pour tout tester. Puis choisissez votre formule.</h2><p>Une génération d’image coûte 5 crédits. Les offres annuelles incluent un mois offert.</p></div><div className="pricing">
      <Price name="Basic" price="3 500" annual="38 500" oldAnnual="42 000" features={['Catalogue/menu responsive','QR code permanent','Personnalisation du thème','Catégories et articles modifiables','50 crédits image inclus','Bouton WhatsApp général']} />
      <Price name="Interactif" price="5 000" annual="55 000" oldAnnual="60 000" featured features={['Tout Basic','Sélection de plusieurs articles','Panier détaillé','Redirection WhatsApp contextualisée','150 crédits image inclus']} />
      <Price name="Vitrine" price="7 500" annual="82 500" oldAnnual="90 000" features={['Tout Interactif','Page type Linktree','Réseaux sociaux','Lien Google Maps','250 crédits image inclus','Menu/catalogue en bouton principal']} />
    </div><p style={{textAlign:'center',marginTop:18,color:'var(--muted)'}}>Besoin de plus d’illustrations ? Pack de 100 crédits à 2 000 F CFA pour les abonnés.</p></div></section>

    <section className="section" id="faq"><div className="container"><div className="section-head"><div className="eyebrow">FAQ</div><h2>Les questions les plus fréquentes</h2></div><div className="faq"><details><summary>Dois-je refaire mon QR quand je modifie le menu ?</summary><p>Non. Le QR pointe vers votre lien Qatalink permanent. Vous pouvez modifier prix, photos, catégories, couleurs et produits sans changer ce lien.</p></details><details><summary>Puis-je créer mon menu à partir d’une photo ?</summary><p>Oui. Qatalink analyse l’image, structure le contenu puis vous laisse corriger chaque catégorie, article et prix avant publication.</p></details><details><summary>Est-ce réservé aux restaurants ?</summary><p>Non. Qatalink propose des configurations pré-enregistrées pour Restaurant, Hôtel, Spa & Beauté, Immobilier et Boutique, puis chaque réglage reste personnalisable.</p></details></div></div></section>
  </main>
  <footer className="footer"><div className="container" style={{display:'flex',justifyContent:'space-between',gap:20,flexWrap:'wrap'}}><div className="brand"><Image src="/qatalink-logo.png" width={32} height={32} alt="Qatalink"/>qatalink</div><div>© 2026 Qatalink. Menus & catalogues interactifs.</div></div></footer>
</>}

function Price({name,price,annual,oldAnnual,features,featured=false}:{name:string;price:string;annual:string;oldAnnual:string;features:string[];featured?:boolean}){return <div className={'price-card '+(featured?'featured':'')}>{featured&&<div className="popular">LE PLUS POPULAIRE</div>}<h3>{name}</h3><div className="price">{price} F <small>/ mois</small></div><div className="landing-annual"><span className="annual-card-badge">1 MOIS OFFERT</span><b>{annual} F / an</b><small><s>{oldAnnual} F</s></small></div><div className="features">{features.map((f,i)=><div className="feature" key={i}><Check size={16} color="#c7192f"/>{f}</div>)}</div><Link className={featured?'btn btn-primary':'btn btn-dark'} style={{width:'100%'}} href="/create">Choisir {name}</Link></div>}
