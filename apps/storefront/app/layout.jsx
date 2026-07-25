import "./globals.css";

export const metadata = {
  title: "Manto Sagrado | Camisas e artigos esportivos",
  description:
    "Loja de camisas e artigos esportivos com experiência premium, segura e feita para o Brasil.",
  applicationName: "Manto Sagrado",
  manifest: "/manifest.webmanifest",
  themeColor: "#090909",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Manto Sagrado",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
