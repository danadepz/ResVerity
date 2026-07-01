import "./globals.css";

export const metadata = {
  title: "ResVerity - HEI Research Output Governance Portal",
  description: "Secure, structured repository and co-author verification for higher education research.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
