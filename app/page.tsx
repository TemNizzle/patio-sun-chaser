import { CityHome } from "@/components/CityHome";
import { DEFAULT_CITY_ID } from "@/lib/cities";

export default function Home() {
  return <CityHome cityId={DEFAULT_CITY_ID} />;
}
