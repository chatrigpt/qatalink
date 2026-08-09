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
      <div className="pill"><Sparkles size={14}/> Depuis une photo ou un simple texte</div>
      <h1>Le moyen le plus simple de créer un <span className="gradient-text">menu interactif</span></h1>
      <p>Importez votre menu, personnalisez son style, publiez votre QR code et recevez les sélections de vos clients directement sur WhatsApp.</p>
      <div className="hero-cta"><Link href="/create" className="btn btn-primary">Créer gratuitement <ArrowRight size={17}/></Link><a href="#how" className="btn btn-ghost">Comment ça marche</a></div>
    </section>

    <section className="marquee" id="demo"><div className="track">{[...demos,...demos].map((d,i)=><div className="phone" key={i}><video src={demo} autoPlay muted loop playsInline/><div className="phone-label"><strong>{d[0]}</strong><span>{d[1]}</span></div></div>)}</div></section>

    <section className="section alt" id="features"><div className="container"><div className="section-head"><div className="eyebrow">Tout-en-un</div><h2>Votre catalogue devient un vrai outil commercial</h2><p>Qatalink transforme une carte papier ou un texte en expérience mobile modifiable, partageable et prête pour WhatsApp.</p></div><div className="grid-3">
      <div className="card"><div className="iconbox"><ImageIcon/></div><h3>Image → menu</h3><p>Photographiez une carte ou importez un visuel. L’OCR organise automatiquement catégories, articles, descriptions et prix.</p></div>
      <div className="card"><div className="iconbox"><Palette/></div><h3>Personnalisation</h3><p>Couleurs, typographies, thèmes, images, catégories et mise en page restent modifiables après génération.</p></div>
      <div className="card"><div className="iconbox"><MessageCircle/></div><h3>Commande WhatsApp</h3><p>Le client sélectionne plusieurs articles et Qatalink prépare automatiquement le récapitulatif à envoyer.</p></div>
      <div className="card"><div className="iconbox"><QrCode/></div><h3>QR permanent</h3><p>Changez vos prix et produits sans réimprimer votre QR code. Le lien reste identique.</p></div>
      <div className="card"><div className="iconbox"><Smartphone/></div><h3>Mobile-first</h3><p>Une expérience rapide et élégante sur téléphone, tablette et ordinateur.</p></div>
      <div className="card"><div className="iconbox"><Sparkles/></div><h3>Présets sectoriels</h3><p>Restaurant, hôtel, immobilier, spa, salon de beauté, boutique et plus encore.</p></div>
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
          <div className="how-mini-step"><span>01</span><div><b>Importez</b><p>Une photo de menu, un visuel ou simplement du texte.</p></div></div>
          <div className="how-mini-step"><span>02</span><div><b>Qatalink structure</b><p>Catégories, articles, prix et descriptions deviennent modifiables.</p></div></div>
          <div className="how-mini-step"><span>03</span><div><b>Personnalisez</b><p>Thème, couleurs, images, ordre des éléments et informations business.</p></div></div>
          <div className="how-mini-step"><span>04</span><div><b>Publiez</b><p>Votre lien et votre QR restent permanents, même si le menu change.</p></div></div>
          <Link href="/create" className="btn btn-primary how-main-cta">Créer mon Qatalink <ArrowRight size={17}/></Link>
        </div>
      </div>
      <div className="steps how-steps"><div className="card"><div className="step-num">01 — IMPORTER</div><h3>Photo ou texte</h3><p>Ajoutez une photo de votre menu, un PDF visuel ou collez simplement le contenu.</p></div><div className="card"><div className="step-num">02 — PERSONNALISER</div><h3>Vérifiez et adaptez</h3><p>Corrigez les prix, déplacez les catégories, changez le thème et générez les illustrations.</p></div><div className="card"><div className="step-num">03 — PUBLIER</div><h3>QR + WhatsApp</h3><p>Partagez votre lien, affichez votre QR et commencez à recevoir les sélections clients.</p></div></div>
    </div></section>

    <section className="section alt" id="pricing"><div className="container"><div className="section-head"><div className="eyebrow">Tarifs simples</div><h2>Commencez léger. Évoluez quand vous voulez.</h2></div><div className="pricing">
      <Price name="Basic" price="3 500" features={['Catalogue/menu responsive','QR code permanent','Design sélectionnable','Catégories et articles modifiables','Bouton WhatsApp général']} />
      <Price name="Interactif" price="5 000" featured features={['Tout Basic','Sélection de plusieurs articles','Panier détaillé','Redirection WhatsApp contextualisée','Options & catégories interactives']} />
      <Price name="Vitrine" price="7 500" features={['Tout Interactif','Page type Linktree','Réseaux sociaux','Lien Google Maps','Menu/catalogue en bouton principal']} />
    </div></div></section>

    <section className="section" id="faq"><div className="container"><div className="section-head"><div className="eyebrow">FAQ</div><h2>Les questions les plus fréquentes</h2></div><div className="faq"><details><summary>Dois-je refaire mon QR quand je modifie le menu ?</summary><p>Non. Le QR pointe vers votre lien Qatalink permanent. Vous pouvez modifier prix, photos et produits autant de fois que nécessaire.</p></details><details><summary>Puis-je créer mon menu à partir d’une photo ?</summary><p>Oui. Qatalink envoie l’image au moteur OCR, structure le contenu puis vous laisse corriger tout le résultat avant publication.</p></details><details><summary>Est-ce réservé aux restaurants ?</summary><p>Non. Les mêmes briques servent aux hôtels, spas, salons, boutiques, immobilier et autres activités avec catalogue ou services.</p></details></div></div></section>
  </main>
  <footer className="footer"><div className="container" style={{display:'flex',justifyContent:'space-between',gap:20,flexWrap:'wrap'}}><div className="brand"><Image src="/qatalink-logo.png" width={32} height={32} alt="Qatalink"/>qatalink</div><div>© 2026 Qatalink. Menus & catalogues interactifs.</div></div></footer>
</>}

function Price({name,price,features,featured=false}:{name:string;price:string;features:string[];featured?:boolean}){return <div className={'price-card '+(featured?'featured':'')}>{featured&&<div className="popular">LE PLUS POPULAIRE</div>}<h3>{name}</h3><div className="price">{price} F <small>/ mois</small></div><div className="features">{features.map((f,i)=><div className="feature" key={i}><Check size={16} color="#c7192f"/>{f}</div>)}</div><Link className={featured?'btn btn-primary':'btn btn-dark'} style={{width:'100%'}} href="/create">Choisir {name}</Link></div>}
