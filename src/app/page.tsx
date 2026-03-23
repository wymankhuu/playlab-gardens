import { getCollections } from '@/lib/notion';
import HomePageClient from './HomePageClient';

export default async function HomePage() {
  const collections = await getCollections();

  return <HomePageClient collections={collections} />;
}
