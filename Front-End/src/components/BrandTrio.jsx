import React from 'react';
import { Link } from 'react-router-dom';
import { useSiteConfig } from '../context/SiteConfigContext';
import { useTheme } from '../context/ThemeContext';
import { DEFAULT_SITE_CONFIG, resolveMediaUrl, resolveSiteLogo } from '../config/siteConfigDefaults';

/**
 * Website brand mark: Smart Shopper | logo | المتسوق الذكي (LTR).
 * size: "header" | "splash"
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
  const wordBox = isSplash
    ? 'w-auto max-w-[38vw] sm:max-w-[11rem] md:max-w-[13rem] min-w-0'
    : 'w-auto max-w-[4.85rem] sm:max-w-[6.75rem] md:max-w-[9rem] lg:max-w-[10.5rem] min-w-0';
  const wordH = isSplash ? 'h-10 sm:h-12 md:h-14' : 'h-6 sm:h-8 md:h-9 lg:h-11';
  const wordText = isSplash
    ? 'text-base sm:text-xl md:text-2xl'
    : 'text-[0.58rem] leading-tight sm:text-sm md:text-base lg:text-lg';
  const logoBox = isSplash
    ? 'w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-xl'
    : 'w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 lg:w-11 lg:h-11 rounded-md lg:rounded-xl';
  const trioGap = isSplash
    ? 'gap-1 sm:gap-1.5 md:gap-2'
    : 'gap-0.5 sm:gap-1.5 md:gap-2';

  const wordClass = `inline-flex items-center ${wordBox} ${wordH} min-w-0 overflow-hidden whitespace-nowrap font-display font-bold ${wordText} ${wordClassName}`;

  const inner = (
    <div className={`flex items-center justify-center max-w-full min-w-0 ${trioGap} ${className}`} dir="ltr">
      <span className={`${wordClass} justify-end text-end`} title={brandShort}>
        <span className="truncate">{brandShort}</span>
      </span>

      <div
        className={`relative ${logoBox} bg-white flex items-center justify-center p-0 overflow-hidden shadow-md ring-1 ring-gold-500/40 flex-shrink-0`}
      >
        <img
          src={logo}
          alt={`شعار ${brandShort}`}
          width={isSplash ? 80 : 56}
          height={isSplash ? 80 : 56}
          fetchPriority="high"
          className="w-full h-full object-cover object-center scale-[1.16] transition-transform group-hover:scale-[1.22] duration-300"
        />
        {!isSplash && (
          <div className="absolute top-0 right-0 w-2 h-2 bg-gold-500 rounded-full border border-white animate-pulse hidden lg:block" />
        )}
      </div>

      <span className={`${wordClass} justify-start text-start`} title={brandAr}>
        <span className="truncate">{brandAr}</span>
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
