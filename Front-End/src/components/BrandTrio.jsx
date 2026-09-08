import React from 'react';
import { Link } from 'react-router-dom';
import { useSiteConfig } from '../context/SiteConfigContext';
import { useTheme } from '../context/ThemeContext';
import { DEFAULT_SITE_CONFIG, resolveMediaUrl, resolveSiteLogo } from '../config/siteConfigDefaults';

/**
 * Website brand mark: Smart Shopper | logo | المتسوق الذكي (LTR).
 * size: "header" | "footer" | "splash"
 */
export default function BrandTrio({
  size = 'header',
  asLink = true,
  className = '',
  wordClassName = '',
  onClick,
}) {
  const { config } = useSiteConfig();
  const { isDark } = useTheme();
  const logo = resolveMediaUrl(resolveSiteLogo(config.media, { dark: isDark })) || '/Logo_light_192.png';
  const brandShort = config.brand?.siteShortName || DEFAULT_SITE_CONFIG.brand.siteShortName;
  const brandAr = config.brand?.siteNameAr || DEFAULT_SITE_CONFIG.brand.siteNameAr;

  const isSplash = size === 'splash';
  const isFooter = size === 'footer';

  let wordBox;
  let wordH;
  let wordText;
  let logoBox;
  let trioGap;
  let logoRing;
  let wordExtra = '';

  if (isSplash) {
    wordBox = 'w-auto max-w-[38vw] sm:max-w-[11rem] md:max-w-[13rem] min-w-0';
    wordH = 'h-10 sm:h-12 md:h-14';
    wordText = 'text-base sm:text-xl md:text-2xl';
    logoBox = 'w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-xl';
    trioGap = 'gap-1 sm:gap-1.5 md:gap-2';
    logoRing = 'ring-1 ring-gold-500/40 shadow-md';
  } else if (isFooter) {
    wordBox = 'w-auto max-w-[10rem] sm:max-w-[12rem] md:max-w-[14rem] min-w-0';
    wordH = 'min-h-10 sm:min-h-12';
    wordText = 'text-xl sm:text-2xl tracking-wide';
    logoBox = 'w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl';
    trioGap = 'gap-3 sm:gap-4 md:gap-5';
    logoRing = 'ring-2 ring-gold-500/50 shadow-lg shadow-gold-500/10';
    wordExtra = 'whitespace-normal';
  } else {
    wordBox = 'w-auto max-w-[7.25rem] sm:max-w-[8.5rem] md:max-w-[10rem] lg:max-w-[11.5rem] min-w-0';
    wordH = 'h-7 sm:h-8 md:h-9 lg:h-11';
    wordText = 'text-[0.68rem] leading-tight sm:text-sm md:text-base lg:text-lg';
    logoBox = 'w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 lg:w-11 lg:h-11 rounded-md lg:rounded-xl';
    trioGap = 'gap-1 sm:gap-1.5 md:gap-2';
    logoRing = 'ring-1 ring-gold-500/40 shadow-md';
  }

  const wordClass = `inline-flex items-center ${wordBox} ${wordH} min-w-0 overflow-hidden ${
    isFooter ? wordExtra : 'whitespace-nowrap'
  } font-display font-bold ${wordText} ${wordClassName}`;

  const inner = (
    <div className={`flex items-center justify-center max-w-full min-w-0 ${trioGap} ${className}`} dir="ltr">
      <span className={`${wordClass} justify-end text-end`} title={brandShort}>
        <span className={isFooter ? '' : 'truncate'}>{brandShort}</span>
      </span>

      <div
        className={`relative ${logoBox} bg-transparent flex items-center justify-center p-0 overflow-hidden ${logoRing} flex-shrink-0`}
      >
        <img
          src={logo}
          alt={`شعار ${brandShort}`}
          width={isSplash ? 80 : isFooter ? 64 : 56}
          height={isSplash ? 80 : isFooter ? 64 : 56}
          fetchPriority="high"
          className="w-full h-full object-contain object-center scale-[1.05] transition-transform group-hover:scale-[1.1] duration-300"
        />
        {!isSplash && !isFooter && (
          <div className="absolute top-0 right-0 w-2 h-2 bg-gold-500 rounded-full border border-white animate-pulse hidden lg:block" />
        )}
      </div>

      <span className={`${wordClass} justify-start text-start`} title={brandAr}>
        <span className={isFooter ? '' : 'truncate'}>{brandAr}</span>
      </span>
    </div>
  );

  const wrapClass = 'min-w-0 max-w-full flex items-center justify-center select-none px-0.5 sm:px-1 group';

  if (!asLink) {
    return <div className={wrapClass}>{inner}</div>;
  }

  return (
    <Link to="/" onClick={onClick} className={`${wrapClass} cursor-pointer`}>
      {inner}
    </Link>
  );
}
