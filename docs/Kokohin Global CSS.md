/* globals.css - Root Stylesheet for Kokohin Next.js App */

@tailwind base;
@tailwind components;
@tailwind utilities;

/* --- FONT IMPORT: MONTSERRAT --- */
/* Wajib menggunakan Montserrat sesuai Brand Guidelines Kokohin */
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');

@layer base {
  :root {
    /* Brand Colors (Tailwind akan ambil ini jika di-set di tailwind.config.ts) */
    --color-primary: #E30613;
    --color-dark: #1D1D1B;
    --color-light: #F8F8F8;
  }

  /* Set default font & text color */
  html {
    font-family: 'Montserrat', sans-serif;
    color: var(--color-dark);
    scroll-behavior: smooth;
  }

  body {
    background-color: var(--color-light);
    @apply antialiased; /* Bikin font lebih tajam di MacOS/iOS */
  }
}

@layer utilities {
  /* Utility untuk menyembunyikan scrollbar tapi tetap bisa di-scroll (Clean UI) */
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .no-scrollbar {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
  }

  /* Custom utility untuk shadow button primary Kokohin */
  .shadow-brand {
    box-shadow: 0 4px 14px 0 rgba(227, 6, 19, 0.39);
  }
  .shadow-brand:hover {
    box-shadow: 0 6px 20px rgba(227, 6, 19, 0.23);
  }
}

/* Fix for input number arrows (Menghilangkan panah atas-bawah di input tipe angka) */
input[type=number]::-webkit-inner-spin-button, 
input[type=number]::-webkit-outer-spin-button { 
  -webkit-appearance: none; 
  margin: 0; 
}
input[type=number] {
  -moz-appearance: textfield; /* Firefox */
}