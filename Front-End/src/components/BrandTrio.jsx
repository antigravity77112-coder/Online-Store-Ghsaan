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
  const wordW = isSplash
    ? 'w-[11rem] sm:w-[13rem]'
    : 'w-[5.5rem] sm:w-[7.5rem] md:w-[9rem] lg:w-[10.5rem]';
  const wordH = isSplash ? 'h-12 sm:h-14' : 'h-6 sm:h-8 md:h-9 lg:h-11';
  const wordText = isSplash
    ? 'text-xl sm:text-2xl'
    : 'text-[0.65rem] sm:text-sm md:text-base lg:text-lg';
  const logoBox = isSplash
    ? 'w-16 h-16 sm:w-20 sm:h-20 rounded-xl'
    : 'w-6 h-6 sm:w-8 sm:h-8 md:w-9 md:h-9 lg:w-11 lg:h-11 rounded-md lg:rounded-xl';
  const trioGap = isSplash
    ? 'gap-1 sm:gap-1.5 md:gap-2'
    : 'gap-0.5 sm:gap-1.5 md:gap-2';

  const inner = (
    <div className={`flex items-center ${trioGap} ${className}`} dir="ltr">
      <span
        className={`inline-flex items-center justify-end ${wordW} ${wordH} whitespace-nowrap font-display font-bold leading-none ${wordText} ${wordClassName}`}
      >
        {brandShort}
      </span>

      <div
        className={`relative ${logoBox} bg-white flex items-center justify-center p-0 overflow-hidden shadow-md ring-1 ring-yellow-400/50 flex-shrink-0`}
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
          <div className="absolute top-0 right-0 w-2 h-2 bg-yellow-400 rounded-full border border-white animate-pulse hidden lg:block" />
        )}
      </div>

      <span
        className={`inline-flex items-center justify-start ${wordW} ${wordH} whitespace-nowrap font-display font-bold leading-none ${wordText} ${wordClassName}`}
      >
        {brandAr}
      </span>
    </div>
  );

  if (!asLink) {
    return (
      <div className="flex-shrink-0 flex items-center justify-center select-none px-1 group">
        {inner}
      </div>
    );
  }

  return (
    <Link
      to="/"
      onClick={onClick}
      className="flex-shrink-0 flex items-center justify-center cursor-pointer group select-none px-1"
    >
      {inner}
    </Link>
  );
}
