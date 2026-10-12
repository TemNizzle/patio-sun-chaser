import { getPatiosForCity } from "@/lib/patios";
import { getWeather } from "@/lib/weather";
import { getCity, type CityId } from "@/lib/cities";
import { HomeView } from "@/components/HomeView";

/** Server component shared by every city's home route. */
export async function CityHome({ cityId }: { cityId: CityId }) {
  const city = getCity(cityId);
  const [patios, weather] = await Promise.all([
    getPatiosForCity(cityId),
    getWeather(city),
  ]);
  return <HomeView city={city} patios={patios} weather={weather} />;
}
