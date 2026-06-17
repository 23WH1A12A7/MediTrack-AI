import "./globals.css";

export const metadata = {
  title: "SwasthyaTrack AI",
  description: "Industrial Track A healthcare monitoring assistant with medication, fitness, goals, and safe medical lookup.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
