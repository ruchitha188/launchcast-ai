/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Option B Semantic tokens
        workspace: '#10151D',
        sidebar: '#0C1118',
        surface: {
          DEFAULT: '#171F2A',
          secondary: '#1D2734',
          elevated: '#232E3D',
        },
        border: {
          DEFAULT: '#2A3544',
          subtle: '#2A3544',
          focus: '#4DAEAB',
        },
        content: {
          primary: '#E7EDF5',
          secondary: '#9AA9BC',
          muted: '#75859A',
        },
        teal: {
          DEFAULT: '#4DAEAB',
          hover: '#65C4BF',
          subtle: 'rgba(77, 174, 171, 0.12)',
        },
        // Option B Navy scale (preserves all existing bg-navy-XXX classes)
        navy: {
          950: '#10151D', // Main workspace
          900: '#0C1118', // Sidebar
          850: '#171F2A', // Primary surfaces
          800: '#1D2734', // Secondary surfaces
          750: '#232E3D', // Elevated surfaces
          700: '#2A3544', // Borders & dividers
          600: '#3A485B',
          500: '#52647C',
        },
        // Option B Cyan/Teal scale (preserves all existing cyan-XXX classes)
        cyan: {
          950: '#112224',
          900: '#142C30',
          800: '#1B3D42',
          700: '#26555C',
          600: '#387881',
          500: '#4DAEAB', // Primary Accent
          400: '#4DAEAB',
          300: '#65C4BF', // Hover Accent
          200: '#8EE0DC',
          100: '#C7F3F1',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      }
    },
  },
  plugins: [],
}
