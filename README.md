This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Troubleshooting

### Error: controller[kState].transformAlgorithm is not a function

**Repro langkah cepat**
- Jalankan `npm run dev`
- Buka `/admin/login`
- Buka halaman publik seperti `/kontak`
- Perhatikan terminal menampilkan error di atas setelah request berjalan

**Root cause**
- Node.js v24 menjalankan Web Streams yang tidak kompatibel dengan Proxy Next.js 16 saat melakukan refresh session cookie.

**Fix permanen**
- Gunakan Node.js LTS v22 (atau v20) saat menjalankan dev/staging/production.
- Pastikan versi Node mengikuti `package.json` `engines`.

## Staging Verification

- Gunakan Node.js v22 LTS pada server staging
- Jalankan `npm run build` lalu `npm run start`
- Buka `/admin/login` dan `/kontak` untuk memastikan tidak ada error di server logs
- Akses `/api/test-db` untuk memastikan koneksi dan runtime terlapor dengan benar

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
