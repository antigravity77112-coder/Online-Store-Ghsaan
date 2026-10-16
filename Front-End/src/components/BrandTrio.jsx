import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSiteConfig } from '../context/SiteConfigContext';
import { useTheme } from '../context/ThemeContext';
import { DEFAULT_SITE_CONFIG } from '../config/siteConfigDefaults';
import {
  readCachedSiteLogo,
  resolveSiteLogoDeliveryUrl,
  preloadSiteLogoUrl,
  openSiteLogoGate,
} from '../utils/preloadSiteLogo';

/**
 * Website brand mark: Smart Shopper | logo | المتسوق الذكي (LTR).
 * Logo src is the site-config URL from the DB (with last-known cache for instant paint).
 * size: "header" | "footer" | "splash"
 */
export default function BrandTrio({
  size = 'header',
  asLink = true,
  className = '',
  wordClassName = '',
  onClick,
  /** Splash intro: wrap words/logo in motion with provided variants */
  introMotion = false,
  wordVariants,
  logoVariants,
  logoClassName = '',
  onLogoLoad,
}) {
  const { config, isLoading: configLoading } = useSiteConfig();
  const { isDark } = useTheme();
  const liveLogo = resolveSiteLogoDeliveryUrl(config.media, { dark: isDark });
  // Never wait on /config if we already know the logo from last visit / boot preload.
  const resolvedLogo = liveLogo || readCachedSiteLogo(isDark);
  const brandShort = config.brand?.siteShortName || DEFAULT_SITE_CONFIG.brand.siteShortName;
  const brandAr = config.brand?.siteNameAr || DEFAULT_SITE_CONFIG.brand.siteNameAr;

  const [logoPhase, setLogoPhase] = useState('loading'); // loading | ready | failed
  const logoImgRef = useRef(null);

  useEffect(() => {
    if (!resolvedLogo) {
      // Still waiting on first-ever config — keep shimmer, don't fail yet.
      if (configLoading) {
        setLogoPhase('loading');
        return;
      }
      setLogoPhase('failed');
      onLogoLoad?.();
      return;
    }
    setLogoPhase('loading');
    preloadSiteLogoUrl(resolvedLogo);
    // Intentionally omit onLogoLoad from deps — parent often passes an inline fn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedLogo, configLoading]);

  const notifyLoaded = () => {
    setLogoPhase('ready');
    openSiteLogoGate();
    onLogoLoad?.();
  };

  const handleLogoError = () => {
    setLogoPhase('failed');
    openSiteLogoGate();
    onLogoLoad?.();
  };

  // Cached / preloaded logos often skip onLoad — promote as soon as bytes exist.
  useEffect(() => {
    if (!resolvedLogo) return;
    const el = logoImgRef.current;
    if (el && el.complete && el.naturalWidth > 0) {
      notifyLoaded();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-check when src changes
  }, [resolvedLogo]);

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
    wordH = 'min-h-8 sm:min-h-9 md:min-h-10 py-0.5';
    wordText = 'text-[0.65rem] leading-[1.45] sm:text-sm md:text-base lg:text-lg';
    logoBox =
      'h-[calc(var(--mobile-header-height)-0.4rem)] w-[calc(var(--mobile-header-height)-0.4rem)] md:h-14 md:w-14 lg:h-[3.65rem] lg:w-[3.65rem]';
    trioGap = 'gap-1 sm:gap-1.5 md:gap-2';
  }

  const wordClass = `inline-flex items-center ${wordBox} ${wordH} min-w-0 overflow-visible ${
    isFooter ? wordExtra : 'whitespace-nowrap'
  } font-display font-bold ${wordText} ${wordClassName}`;

  const WordTag = introMotion && wordVariants ? motion.span : 'span';
  const LogoWrap = introMotion && logoVariants ? motion.div : 'div';
  const wordMotionProps = introMotion && wordVariants ? { variants: wordVariants } : {};
  const logoMotionProps = introMotion && logoVariants ? { variants: logoVariants } : {};

  const monogram = (brandShort?.trim()?.charAt(0) || 'S').toUpperCase();
  // Mount <img> as soon as we have any URL — do not wait for configLoading.
  const showImg = Boolean(resolvedLogo) && logoPhase !== 'failed';

  const inner = (
    <div
      className={`flex flex-nowrap items-center justify-center max-w-full min-w-0 ${trioGap} ${className}`}
      dir="ltr"
    >
      <WordTag
        className={`${wordClass} justify-end text-end ${isFooter ? '-me-3 sm:-me-4 md:-me-5' : ''}`}
        title={brandShort}
        {...wordMotionProps}
      >
        <span className={isFooter ? 'whitespace-nowrap' : 'truncate'}>{brandShort}</span>
      </WordTag>

      <LogoWrap
        className={`relative ${logoBox} flex items-center justify-center p-0 overflow-hidden flex-shrink-0 rounded-full ${logoClassName}`}
        {...logoMotionProps}
      >
        {logoPhase !== 'ready' && (
          <div
            className="absolute inset-0 z-[1] rounded-full overflow-hidden bg-stone-100 dark:bg-stone-800 border border-stone-200/80 dark:border-stone-700/70"
            aria-hidden="true"
          >
            {logoPhase === 'loading' ? (
              <div className="absolute inset-0 skeleton-shimmer" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-stone-100 to-stone-200 dark:from-stone-800 dark:to-stone-900">
                <span className="font-display font-extrabold text-stone-500 dark:text-stone-300 text-sm sm:text-base md:text-lg select-none">
                  {monogram}
                </span>
              </div>
            )}
          </div>
        )}
        {showImg && (
          <img
            ref={logoImgRef}
            key={resolvedLogo}
            src={resolvedLogo}
            alt=""
            width={isSplash ? 160 : isFooter ? 208 : 64}
            height={isSplash ? 160 : isFooter ? 208 : 64}
            loading="eager"
            fetchPriority="high"
            decoding={isSplash ? 'sync' : 'async'}
            onLoad={notifyLoaded}
            onError={handleLogoError}
            className={`relative z-[2] w-full h-full object-contain object-center transition-[opacity,transform] duration-300 ${
              logoPhase === 'ready' ? 'opacity-100' : 'opacity-0'
            } ${
              isFooter
                ? 'scale-100 group-hover:scale-[1.04]'
                : 'scale-[1.35] md:scale-[1.45] group-hover:scale-[1.5]'
            }`}
          />
        )}
      </LogoWrap>

      <WordTag
        className={`${wordClass} justify-start text-start ${isFooter ? '-ms-3 sm:-ms-4 md:-ms-5' : ''}`}
        title={brandAr}
        {...wordMotionProps}
      >
        <span className={isFooter ? 'whitespace-nowrap' : 'truncate'}>{brandAr}</span>
      </WordTag>
    </div>
  );

  const wrapClass = 'min-w-0 max-w-full flex items-center justify-center select-none px-0.5 sm:px-1 group';
  const ariaLabel = `${brandShort} — ${brandAr}`;

  if (!asLink) {
    return (
      <div className={wrapClass} role="img" aria-label={ariaLabel}>
        {inner}
      </div>
    );
  }

  return (
    <Link to="/" onClick={onClick} className={`${wrapClass} cursor-pointer`} aria-label={ariaLabel}>
      {inner}
    </Link>
  );
}
