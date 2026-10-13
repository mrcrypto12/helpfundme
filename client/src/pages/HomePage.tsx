import { Link } from 'react-router-dom';
import { HiOutlineArrowRight, HiOutlineBars3, HiOutlineXMark } from 'react-icons/hi2';
import { useAuth } from '../contexts/AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import './HomePage.css';

const HomePage = () => {
  const { user } = useAuth();
  const browseUrl = user ? '/dashboard' : '/login';
  const createUrl = user ? '/posts/create' : '/register';

  const scrollTo = (section: string) => {
    document.querySelector('.landing-menu')?.removeAttribute('open');
    document.getElementById(section)?.scrollIntoView({ behavior: 'smooth' });
  };

  return <div className="landing-page" itemScope itemType="https://schema.org/WebSite">
    <header className="landing-header"><div className="landing-container landing-header-inner">
      <Link className="landing-brand" to="/" itemProp="url" aria-label="HelpFundMe home"><img src="/logos.png" alt="" /><span itemProp="name">HelpFundMe</span></Link>
      <nav className="landing-nav" aria-label="Main navigation"><button type="button" onClick={() => scrollTo('purpose')}>Our purpose</button><button type="button" onClick={() => scrollTo('giving')}>Why give</button><button type="button" onClick={() => scrollTo('get-involved')}>Get involved</button></nav>
      <div className="landing-header-actions"><ThemeToggle className="landing-theme-toggle" /><Link to={user ? '/dashboard' : '/login'}>{user ? 'Dashboard' : 'Sign in'}</Link><Link className="landing-pill" to={createUrl}>Start a campaign <HiOutlineArrowRight /></Link></div>
      <ThemeToggle className="landing-theme-toggle landing-theme-mobile" />
      <details className="landing-menu"><summary aria-label="Toggle navigation"><HiOutlineBars3 className="landing-menu-open-icon" aria-hidden="true" /><HiOutlineXMark className="landing-menu-close-icon" aria-hidden="true" /><span>Menu</span></summary><nav aria-label="Mobile navigation"><span className="landing-menu-caption">Explore HelpFundMe</span><button type="button" onClick={() => scrollTo('purpose')}>Our purpose <HiOutlineArrowRight aria-hidden="true" /></button><button type="button" onClick={() => scrollTo('giving')}>Why give <HiOutlineArrowRight aria-hidden="true" /></button><button type="button" onClick={() => scrollTo('get-involved')}>Get involved <HiOutlineArrowRight aria-hidden="true" /></button><div className="landing-menu-actions"><Link to={user ? '/dashboard' : '/login'}>{user ? 'Go to dashboard' : 'Sign in'}</Link><Link to={createUrl}>Start a campaign <HiOutlineArrowRight aria-hidden="true" /></Link></div></nav></details>
    </div></header>

    <main>
      <section className="landing-hero landing-container" aria-labelledby="landing-title">
        <div className="landing-hero-copy"><span className="landing-kicker">Proverbs 19:17<p>"Whoever is kind to the poor lends to the Lord, and he will reward them for what they have done."</p></span><h1 id="landing-title">Hope Starts With You.<br />Every Contribution Counts.</h1><p>HelpFundMe connects people across Ghana to raise support for medical care, education, emergencies, and community needs.</p></div>
        <img className="landing-hero-photo" src="/fund-raiser.jpg" alt="" />
      </section>

      <section className="landing-assurance landing-container" aria-label="How HelpFundMe works"><div><span>Sky is the limit.</span></div><Link to={browseUrl}>Explore approved campaigns <HiOutlineArrowRight aria-hidden="true" /></Link></section>

      <section className="landing-section landing-container" id="purpose" aria-labelledby="purpose-title"><div className="landing-section-heading landing-split-heading"><h2 id="purpose-title">What brings us<br />together?</h2></div><div className="landing-purpose-grid"><article><img src="/landing-friends.jpg" alt="" /><div><h3>Show up for someone</h3><p>Help a friend, relative, or neighbour when an unexpected need changes their plans.</p></div></article><article><img src="/landing-community.png" alt="" /><div><h3>Give to a cause</h3><p>Make a meaningful difference by supporting causes that matter. Your generosity helps provide essential medical care, expand educational opportunities, respond to emergencies, and fund impactful projects that build stronger, healthier and more resilient communities.</p></div></article></div></section>

      <section className="landing-review" id="giving"><div className="landing-container landing-review-inner"><div><span>DEUTERONOMY 15:11.</span><h2>Be the reason someone gets another chance at life.</h2><p>One act of kindness can open the door to a new beginning.</p><Link to={createUrl}>Start your story <HiOutlineArrowRight aria-hidden="true" /></Link></div><img src="/landing-hero.jpg" alt="" /></div></section>

      <section className="landing-final" id="get-involved"><div className="landing-container"><span>Ephesians 4:32. "Be kind to one another...</span><h2>Someone’s story could change<br />because you showed up.</h2><div><Link to={browseUrl}>Explore campaigns <HiOutlineArrowRight aria-hidden="true" /></Link><Link to={createUrl}>Start a campaign</Link></div></div></section>
    </main>
    <footer className="landing-footer"><div className="landing-container landing-footer-grid"><div><Link className="landing-brand" to="/"><img src="/logos.png" alt="" /><span>HelpFundMe</span></Link><p>A Crowdfund Platform<br />by Forgetech Limited.</p></div><nav aria-label="Footer navigation"><strong>Explore</strong><Link to={browseUrl}>Campaigns</Link><button type="button" onClick={() => scrollTo('purpose')}>Our purpose</button><button type="button" onClick={() => scrollTo('giving')}>Why give</button></nav><nav aria-label="Account links"><strong>Get involved</strong><Link to={createUrl}>Start a campaign</Link><Link to={browseUrl}>Support a cause</Link><Link to={user ? '/dashboard' : '/login'}>Log in</Link></nav></div><div className="landing-container landing-footer-bottom">© {new Date().getFullYear()} HelpFundMe · Forgetech Limited</div></footer>
  </div>;
};

export default HomePage;
