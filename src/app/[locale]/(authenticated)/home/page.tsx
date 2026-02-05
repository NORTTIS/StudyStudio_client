import HomePage from "@/components/features/home/Home";
import type { HomeData } from "@/components/features/home/types";
import { mockHomeData } from "@/mocks/home-data";

async function getHomeData(): Promise<HomeData> {
  return mockHomeData;
}

export default async function Home() {
  const data = await getHomeData();

  return <HomePage data={data} />;
}
