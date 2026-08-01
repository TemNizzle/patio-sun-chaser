import { getAllPatios } from "@/lib/patios";
import { HomeView } from "@/components/HomeView";

export default async function Home() {
  const patios = await getAllPatios();
  return <HomeView patios={patios} />;
}
