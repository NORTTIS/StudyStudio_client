import { redirect } from "next/navigation";

export default function Page() {
    // Redirect to master page since AI tab is now under /master/[studioId]/ai
    redirect("/master");
}
