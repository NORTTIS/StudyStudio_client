import HomePage from "@/components/features/home/Home";
import { mockHomeData } from "@/mocks/home-data";

export default function Home() {
    return <HomePage data={mockHomeData} />;
}
