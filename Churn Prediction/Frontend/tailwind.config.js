/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#140D1D',
          50: '#F7F1F4',
          surface: '#1A1125',
          raised: '#241732',
          line: '#4A3557',
          glow: '#3A2046',
        },
        text: {
          DEFAULT: '#F8F4E9',
          muted: '#D9C7D3',
          faint: '#A38AA0',
        },
        brand: {
          DEFAULT: '#935073',
          dim: '#7A405E',
          soft: 'rgba(147,80,115,0.18)',
          pale: '#F6DBC0',
        },
        accent: {
          DEFAULT: '#F6DBC0',
          soft: '#F8F4E9',
          mist: '#EAD8C8',
        },
        lilac: {
          DEFAULT: '#502D55',
          soft: '#B990A9',
        },
        risk: {
          high: '#F28CA6',
          highSoft: 'rgba(242,140,166,0.12)',
          medium: '#F6DBC0',
          mediumSoft: 'rgba(246,219,192,0.12)',
          low: '#C7B3D8',
          lowSoft: 'rgba(199,179,216,0.12)',
        },
      },
      fontFamily: {
        display: ['"Fraunces"', 'Georgia', 'serif'],
        sans: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"IBM Plex Mono"', '"SFMono-Regular"', 'Menlo', 'monospace'],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '8px',
        lg: '10px',
        xl: '20px',
      },
      boxShadow: {
        none: 'none',
        glow: '0 20px 45px rgba(20, 13, 29, 0.45)',
      },
      letterSpacing: {
        tightish: '-0.01em',
      },
    },
  },
  plugins: [],
};
