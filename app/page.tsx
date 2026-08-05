import { getAllPatios } from "@/lib/patios";
import { getTorontoWeather } from "@/lib/weather";
import { HomeView } from "@/components/HomeView";

export default async function Home() {
  const [patios, weather] = await Promise.all([
    getAllPatios(),
    getTorontoWeather(),
  ]);
  return <HomeView patios={patios} weather={weather} />;
}
