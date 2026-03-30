import './global.css';
import Providers from './providers';

export const metadata = {
  title: 'Welcome to seller-ui',
  description: 'This is the seller-ui application.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
