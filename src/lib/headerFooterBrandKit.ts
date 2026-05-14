import type { HeaderFooterConfig } from '@/lib/headerFooter'

type BrandLogoVariantKey = 'primary' | 'symbol' | 'horizontal' | 'light' | 'dark'
type BrandLogoVariants = Partial<Record<BrandLogoVariantKey, string>>

export interface HeaderFooterBrandSchool {
  name?: string | null
  logo_url?: string | null
  logo_variants?: unknown
  primary_color?: string | null
  secondary_color?: string | null
  default_body_font?: string | null
}

export interface BrandKitHeaderFooterOptions {
  school?: HeaderFooterBrandSchool | null
}

function getLogoVariants(school?: HeaderFooterBrandSchool | null): BrandLogoVariants {
  const rawVariants = school?.logo_variants
  const variants: BrandLogoVariants =
    rawVariants && typeof rawVariants === 'object' && !Array.isArray(rawVariants)
      ? rawVariants as BrandLogoVariants
      : {}

  if (school?.logo_url && !variants.primary) {
    return { ...variants, primary: school.logo_url }
  }
  return variants
}

export function getBrandKitHeaderLogoUrl(school?: HeaderFooterBrandSchool | null) {
  const variants = getLogoVariants(school)
  return variants.horizontal
    ?? variants.dark
    ?? variants.primary
    ?? variants.light
    ?? school?.logo_url
    ?? ''
}

export function createBrandKitHeaderFooterConfig({
  school,
}: BrandKitHeaderFooterOptions): Pick<Record<'header' | 'footer', HeaderFooterConfig>, 'header' | 'footer'> {
  const logoUrl = getBrandKitHeaderLogoUrl(school)
  const schoolName = school?.name?.trim() || 'LA Music School'
  const primaryColor = school?.primary_color || '#1E3A5F'
  const secondaryColor = school?.secondary_color || '#FF2D78'
  const bodyFont = school?.default_body_font || 'DM Sans'

  const header: HeaderFooterConfig = {
    enabled: true,
    height: 44,
    backgroundColor: 'transparent',
    borderBottom: `2px solid ${primaryColor}`,
    paddingX: 24,
    left: logoUrl
      ? {
        type: 'image',
        imageUrl: logoUrl,
        imageHeight: 26,
      }
      : {
        type: 'text',
        text: schoolName,
        fontSize: 10,
        fontWeight: 700,
        color: primaryColor,
        fontFamily: bodyFont,
        uppercase: true,
        letterSpacing: 1,
      },
    center: {
      type: 'placeholder',
      placeholder: '{titulo}',
      fontSize: 10,
      fontWeight: 700,
      color: primaryColor,
      fontFamily: bodyFont,
    },
    right: {
      type: 'placeholder',
      placeholder: '{pagina_de_total}',
      fontSize: 9,
      fontWeight: 700,
      color: secondaryColor,
      fontFamily: bodyFont,
    },
    showOnFirstPage: false,
    startFromPage: 1,
  }

  const footer: HeaderFooterConfig = {
    enabled: true,
    height: 36,
    backgroundColor: 'transparent',
    borderTop: `1px solid ${primaryColor}`,
    paddingX: 24,
    left: {
      type: 'placeholder',
      placeholder: '{escola}',
      fontSize: 9,
      fontWeight: 600,
      color: primaryColor,
      fontFamily: bodyFont,
    },
    center: {
      type: 'placeholder',
      placeholder: '{titulo}',
      fontSize: 8,
      fontWeight: 400,
      color: '#64748b',
      fontFamily: bodyFont,
    },
    right: {
      type: 'placeholder',
      placeholder: '{pagina_de_total}',
      fontSize: 9,
      fontWeight: 700,
      color: secondaryColor,
      fontFamily: bodyFont,
    },
    showOnFirstPage: false,
    startFromPage: 1,
  }

  return { header, footer }
}
