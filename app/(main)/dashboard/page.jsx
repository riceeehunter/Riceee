import { getCollections } from "@/actions/collection";
import { getJournalEntries } from "@/actions/journal";
import MoodAnalytics from "./_components/mood-analytics";
import Collections from "./_components/collections";

const Dashboard = async () => {
  const collections = await getCollections();
  const entriesData = await getJournalEntries();

  // Group entries by collection
  const entriesByCollection = entriesData?.data?.entries?.reduce(
    (acc, entry) => {
      const collectionId = entry.collectionId || "unorganized";
      if (!acc[collectionId]) {
        acc[collectionId] = [];
      }
      acc[collectionId].push(entry);
      return acc;
    },
    {}
  );

  return (
    <div className="relative pt-2 pb-40 space-y-8">
      {/* Ambient background glow */}
      <div className="animate-blob absolute -top-24 -right-32 w-96 h-96 rounded-full bg-gradient-to-br from-[#ffae88]/15 to-[#ffd9e2]/10 blur-3xl pointer-events-none -z-10" />
      <div className="animate-blob absolute top-[40%] -left-32 w-96 h-96 rounded-full bg-gradient-to-tr from-[#ffd9e2]/15 to-[#fed07f]/10 blur-3xl pointer-events-none -z-10" style={{ animationDelay: "3s" }} />

      {/* Analytics Section */}
      <section className="space-y-4">
        <MoodAnalytics />
      </section>

      <Collections
        collections={collections}
        entriesByCollection={entriesByCollection}
      />
    </div>
  );
};

export default Dashboard;
