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
  let wordExtra = '';

  if (isSplash) {
    wordBox = 'w-auto max-w-[38vw] sm:max-w-[11rem] md:max-w-[13rem] min-w-0';
    wordH = 'h-10 sm:h-12 md:h-14';
    wordText = 'text-base sm:text-xl md:text-2xl';
    logoBox = 'w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20';
    trioGap = 'gap-1 sm:gap-1.5 md:gap-2';
  } else if (isFooter) {
    wordBox = 'w-auto max-w-none min-w-0 shrink';
    wordH = 'min-h-10 sm:min-h-12 md:min-h-14';
    wordText = 'text-lg sm:text-xl md:text-2xl lg:text-3xl tracking-wide';
    logoBox = 'w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 lg:w-52 lg:h-52';
    trioGap = 'gap-0';
    wordExtra = 'whitespace-nowrap';
  } else {
    // Max logo inside fixed header height — do not grow the header bar.
    wordBox = 'w-auto max-w-[6.5rem] sm:max-w-[8rem] md:max-w-[9.5rem] lg:max-w-[11rem] min-w-0';
    wordH = 'h-8 sm:h-9 md:h-10';
    wordText = 'text-[0.65rem] leading-tight sm:text-sm md:text-base lg:text-lg';
    logoBox =
      'h-[calc(var(--mobile-header-height)-0.4rem)] w-[calc(var(--mobile-header-height)-0.4rem)] md:h-14 md:w-14 lg:h-[3.65rem] lg:w-[3.65rem]';
    trioGap = 'gap-1 sm:gap-1.5 md:gap-2';
  }

  const wordClass = `inline-flex items-center ${wordBox} ${wordH} min-w-0 overflow-hidden ${
    isFooter ? wordExtra : 'whitespace-nowrap'
  } font-display font-bold ${wordText} ${wordClassName}`;

  const inner = (
    <div
      className={`flex flex-nowrap items-center justify-center max-w-full min-w-0 ${trioGap} ${className}`}
      dir="ltr"
    >
      <span
        className={`${wordClass} justify-end text-end ${isFooter ? '-me-3 sm:-me-4 md:-me-5' : ''}`}
        title={brandShort}
      >
        <span className={isFooter ? 'whitespace-nowrap' : 'truncate'}>{brandShort}</span>
      </span>

      <div
        className={`relative ${logoBox} bg-transparent flex items-center justify-center p-0 overflow-visible flex-shrink-0`}
      >
        <img
          src={logo}
          alt={`شعار ${brandShort}`}
          width={isSplash ? 80 : isFooter ? 208 : 64}
          height={isSplash ? 80 : isFooter ? 208 : 64}
          fetchPriority="high"
          className={`w-full h-full object-contain object-center transition-transform duration-300 ${
            isFooter
              ? 'scale-100 group-hover:scale-[1.04]'
              : 'scale-[1.35] md:scale-[1.45] group-hover:scale-[1.5]'
          }`}
        />
      </div>

      <span
        className={`${wordClass} justify-start text-start ${isFooter ? '-ms-3 sm:-ms-4 md:-ms-5' : ''}`}
        title={brandAr}
      >
        <span className={isFooter ? 'whitespace-nowrap' : 'truncate'}>{brandAr}</span>
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
