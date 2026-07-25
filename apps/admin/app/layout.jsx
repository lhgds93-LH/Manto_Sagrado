import "./globals.css";

export const metadata = {
  title: "Painel | Manto Sagrado",
  description: "Gestão de pedidos, produtos e rastreamento do Manto Sagrado.",
};

export default function AdminLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
