import { Container } from "@/components/common";
import GroupCalendar from "@/components/features/group/calendar/GroupCalendar";

export default function Page() {
    return (
        <Container className="bg-transparent">
            <GroupCalendar />
        </Container>
    );
}
