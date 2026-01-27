export const metadata = {
  title: 'LOTOTET',
  description: 'LOTOTET Application',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
