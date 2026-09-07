import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Eye, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { useFavorites } from '../context/FavoritesContext';

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: "easeOut" } },
};

const ProductCard = ({ id, image, title, price, city, condition, product }) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const { isFavorite, toggleFavorite } = useFavorites();
  const liked = isFavorite(id);

  const conditionText = condition === 'New' ? 'جديد' : 'مستعمل';

  // Promotion fields
  const isPromoted = product?.isPromoted;
  const discountPrice = product?.discountPrice;
  const promotionLabel = product?.promotionLabel;
  const hasDiscount = discountPrice !== undefined && discountPrice !== null && discountPrice !== '';
  const hasPromoRibbon = isPromoted || !!promotionLabel;

  const handleToggleFavorite = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (product) {
      toggleFavorite(product);
    }
  };

  return (
    <motion.div variants={cardVariants}>
      <Link
        to={`/product/${product?.slug || id}`}
        className={`group bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5 flex flex-col cursor-pointer border block h-full ${
          isPromoted
            ? 'border-gold-300 dark:border-gold-600 ring-2 ring-gold-400/30 dark:ring-gold-500/20 shadow-md shadow-gold-500/10'
            : 'border-gray-100/80 dark:border-slate-700'
        }`}
      >
        {/* منطقة الصورة */}
        <div className="relative aspect-square overflow-hidden bg-slate-100 dark:bg-slate-900">
          {!imgLoaded && (
            <div className="absolute inset-0 skeleton-shimmer" />
          )}
          <img
            src={image}
            alt={title}
            width="400"
            height="400"
            loading="lazy"
            className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImgLoaded(true)}
          />
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="bg-white/90 backdrop-blur-sm p-3 rounded-full shadow-lg transform scale-75 group-hover:scale-100 transition-transform duration-300">
              <Eye className="w-5 h-5 text-slate-700" />
            </div>
          </div>

          <div className="absolute top-3 right-3 left-3 flex justify-between items-start">
            {/* Promotion Ribbon or Condition Badge */}
            {hasPromoRibbon ? (
              <span className="px-2.5 py-1 text-xs font-bold rounded-lg shadow-lg bg-gradient-to-r from-gold-600/90 via-purple-600/90 to-pink-500/90 backdrop-blur-md text-white border border-white/20">
                {promotionLabel || '⭐ مميز'}
              </span>
            ) : (
              <span className={`px-2.5 py-1 text-xs font-bold rounded-lg backdrop-blur-md shadow-sm ${
                condition === 'New' 
                  ? 'bg-gold-500/90 text-white' 
                  : 'bg-white/90 text-slate-700'
              }`}>
                {conditionText}
              </span>
            )}
            <button
              className={`p-1.5 rounded-full backdrop-blur-md transition-all duration-200 shadow-sm ${
                liked ? 'bg-rose-500 text-white scale-110' : 'bg-white/80 text-slate-400 hover:text-rose-500 hover:bg-white'
              }`}
              onClick={handleToggleFavorite}
              aria-label="إضافة للمفضلة"
            >
              <Heart className="w-4 h-4" fill={liked ? 'currentColor' : 'none'} />
            </button>
          </div>

          {/* Discount percentage badge */}
          {hasDiscount && (
            <div className="absolute bottom-3 left-3">
              <span className="px-2 py-1 text-[10px] font-bold text-white bg-red-500 rounded-lg shadow-sm">
                -{Math.round(((Number(price) - Number(discountPrice)) / Number(price)) * 100)}%
              </span>
            </div>
          )}
        </div>
        
        {/* محتوى البطاقة */}
        <div className="p-4 flex flex-col flex-grow text-right">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-[15px] mb-1.5 line-clamp-2 leading-snug group-hover:text-gold-700 dark:group-hover:text-gold-400 transition-colors">
            {title}
          </h3>
          
          {city && (
            <div className="flex items-center text-slate-400 text-xs mb-3">
              <MapPin size={12} className="ml-1 flex-shrink-0" />
              <span>{city}</span>
            </div>
          )}
          
          <div className="mt-auto pt-3 border-t border-gray-100/80 dark:border-slate-700">
            {hasDiscount ? (
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-emerald-600 dark:text-emerald-400 tracking-tight">
                  {Number(discountPrice).toLocaleString('en-US')}
                </span>
                <span className="text-sm text-slate-400 line-through">
                  {price}
                </span>
              </div>
            ) : (
              <span className="font-extrabold text-lg text-gold-600 dark:text-gold-400 tracking-tight">{price}</span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ProductCard;
