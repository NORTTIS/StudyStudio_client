import HomePage from "@/components/features/home/Home";
import { mockHomeData } from "@/mocks/home-data";

export default function Home() {
    // Using mock data for development
    return <HomePage data={mockHomeData} />;
}
