import logo from '../assets/oday-logo.png';
import logoLight from '../assets/oday-logo-light.png';
import mark from '../assets/oday-mark.png';
import markLight from '../assets/oday-mark-light.png';
import { BRAND_FIRM } from '../brand';

const SRC = {
  lockup: { dark: logo, light: logoLight },
  mark: { dark: mark, light: markLight },
};

export const ODAY_LOGO = logo;
export const ODAY_LOGO_LIGHT = logoLight;
export const ODAY_MARK = mark;
export const ODAY_MARK_LIGHT = markLight;

export function BrandLogo({
  variant = 'lockup',
  onDark = false,
  decorative = false,
  alt = BRAND_FIRM,
  className = '',
  style,
}) {
  const src = SRC[variant][onDark ? 'light' : 'dark'];

  return (
    <img
      src={src}
      alt={decorative ? '' : alt}
      aria-hidden={decorative ? true : undefined}
      draggable={false}
      className={className}
      style={style}
    />
  );
}
