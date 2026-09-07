require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function restore() {
  await prisma.systemSetting.upsert({
    where: { id: 'global' },
    update: {
      aboutUsText: 'متجر قصة هو المتجر الإلكتروني الأول في اليمن المتخصص ببيع العطور الأصلية فقط بأسعار أقل من الموقع الرسمي مع ضمان الأصالة وتوصيل سريع لجميع المحافظات',
      contactEmail: 'info@gisaah.com',
      contactPhone: '+967 778562222',
      facebookUrl: '',
      twitterUrl: '',
      whatsappUrl: '',
      instagramUrl: '',
      shippingOfferText: 'شحن مجاني للطلبات فوق 200 ر س ',
      seoTitle: 'قِصّة للعطور | عطور أصلية وفاخرة في اليمن',
      seoDescription: 'متجر قصة - أروع العطور الفاخرة التي تلبي كافة الأذواق وتضفي لمسة من الأناقة على إطلالتك.',
      enableDarkModeToggle: true
    },
    create: {
      id: 'global',
      aboutUsText: 'متجر قصة هو المتجر الإلكتروني الأول في اليمن المتخصص ببيع العطور الأصلية فقط بأسعار أقل من الموقع الرسمي مع ضمان الأصالة وتوصيل سريع لجميع المحافظات',
      contactEmail: 'info@gisaah.com',
      contactPhone: '+967 778562222',
      facebookUrl: '',
      twitterUrl: '',
      whatsappUrl: '',
      instagramUrl: '',
      shippingOfferText: 'شحن مجاني للطلبات فوق 200 ر س ',
      seoTitle: 'قِصّة للعطور | عطور أصلية وفاخرة في اليمن',
      seoDescription: 'متجر قصة - أروع العطور الفاخرة التي تلبي كافة الأذواق وتضفي لمسة من الأناقة على إطلالتك.',
      enableDarkModeToggle: true
    }
  });
  console.log('Restored');
}
restore().finally(() => prisma.$disconnect());
